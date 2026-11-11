// One-time server/CLI preflight. Never imported by an API or browser component.
// Vercel may run this before its normal build, with Production secrets still disabled publicly.
import assert from 'node:assert/strict';
import {randomUUID,createHmac} from 'node:crypto';
import {writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createPublicLimiter} from '../lib/server/public-limits.mjs';
import {createNvidiaProvider,NVIDIA_MODEL,NvidiaError} from '../lib/server/nvidia.mjs';
import {PUBLIC_TIMEOUT_MS} from '../lib/server/public-ai.mjs';
import {generateBatch,reviewCandidates} from '../lib/generation.mjs';
import {cases,negativeCandidates} from './checkpoint5-cases.mjs';

const stageOptions=new Set(['--redis-only','--models-only']);
function emit(report){console.log(JSON.stringify({publicAiPreflight:report}));}
async function redisCommand(env,command){
 const response=await fetch(env.PUBLIC_AI_REDIS_URL,{method:'POST',redirect:'error',signal:AbortSignal.timeout(3000),headers:{Authorization:`Bearer ${env.PUBLIC_AI_REDIS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(command)});
 if(!response.ok||!response.body)throw Error('REDIS_TRANSPORT');
 const reader=response.body.getReader();let bytes=0,body='';
 try{while(true){const p=await reader.read();if(p.done)break;bytes+=p.value.length;if(bytes>16384)throw Error('REDIS_RESPONSE_LIMIT');body+=Buffer.from(p.value).toString('utf8');}}finally{await reader.cancel().catch(()=>{});}
 const data=JSON.parse(body);if(data.error)throw Error('REDIS_COMMAND');return data.result;
}
async function cleanup(env,namespace){
 // Only keys from this invocation's unpredictable namespace can be deleted.
 const script="local keys=redis.call('KEYS',KEYS[1]..':*'); for _,key in ipairs(keys) do redis.call('DEL',key) end; return #keys";
 return redisCommand(env,['EVAL',script,'1',namespace]);
}
export async function runRedisPreflight(env,namespace){
 const command=(...c)=>redisCommand(env,c),limiter=()=>createPublicLimiter(env,fetch,{namespace});
 const checks=[];
 const empty=()=>cleanup(env,namespace);
 const uid=address=>createHmac('sha256',env.PUBLIC_AI_LIMIT_SALT).update(address).digest('hex');
 assert.equal(await command('PING'),'PONG');
 const attempts=await Promise.all(Array.from({length:20},(_,n)=>limiter().acquire(`preflight-concurrent-${n}`)));
 assert.equal(attempts.filter(Boolean).length,2);await Promise.all(attempts.filter(Boolean).map(l=>l.release()));checks.push('atomic-global-concurrency-2');await empty();
 const a=await limiter().acquire('preflight-user');assert(a);assert.equal(await limiter().acquire('preflight-user'),null);assert(await a.check());await a.release();checks.push('user-concurrency-1-and-release');
 const b=await limiter().acquire('preflight-user');assert(b);await b.release();
 // Inspect the authoritative window before checking its counter, so a minute rollover is explicit.
 let clock=await command('TIME');const minute=Math.floor(Number(clock[0])/60),day=Math.floor(Number(clock[0])/86400);
 await command('SET',`${namespace}:m:${minute}:${uid('preflight-user')}`,'2','EX','120');assert.equal(await limiter().acquire('preflight-user'),null);checks.push('per-minute-2');await empty();
 await command('SET',`${namespace}:d:${day}:${uid('preflight-daily')}`,'12','EX','172800');assert.equal(await limiter().acquire('preflight-daily'),null);
 await command('SET',`${namespace}:d:${day}`,'100','EX','172800');assert.equal(await limiter().acquire('preflight-other'),null);checks.push('user-day-12-global-day-100');await empty();
 const held=await limiter().acquire('preflight-persist');assert(held);
 assert.equal(await limiter().acquire('preflight-persist'),null);checks.push('recreated-client-preserves-lease');
 await command('SET',`${namespace}:disabled`,'1');assert.equal(await held.check(),false);assert.equal(await limiter().acquire('preflight-stop'),null);checks.push('shared-stop-before-next-provider-call');await command('DEL',`${namespace}:disabled`);
 // Shorten only this isolated test lease, while keeping the real acquisition's 300-second TTL check.
 const userKey=`${namespace}:user:${uid('preflight-persist')}`;
 const ttl=await command('TTL',userKey);assert(ttl>0&&ttl<=300);
 await command('PEXPIRE',userKey,'1');const tokens=await command('ZRANGE',`${namespace}:active`,'0','-1');clock=await command('TIME');
 for(const token of tokens)await command('ZADD',`${namespace}:active`,String(Number(clock[0])-1),token);
 await new Promise(r=>setTimeout(r,25));assert.equal(await held.check(),false);const recovered=await limiter().acquire('preflight-persist');assert(recovered);await recovered.release();checks.push('lease-ttl-and-expiry-recovery');
 const unavailable=createPublicLimiter(env,async()=>{throw Error('SIMULATED_NETWORK')},{namespace});await assert.rejects(unavailable.acquire('preflight-unavailable'));checks.push('transport-failure-closed-simulated');
 return {stage:'redis',ok:true,actualService:true,namespaceIsolated:true,checks};
}
export async function runModelPreflight(env,namespace){
 const reports=[];
 for(const c of cases.filter(c=>['colors','words','numbers'].includes(c.id))){
  const {id,...facts}=c,input={...facts,existing:[]},started=performance.now(),signal=AbortSignal.timeout(PUBLIC_TIMEOUT_MS);
  const lease=await createPublicLimiter(env,fetch,{namespace}).acquire(`preflight-case-${id}`);assert(lease);
  const transport=createNvidiaProvider({apiKey:env.PUBLIC_NVIDIA_API_KEY,maxCalls:2,timeoutMs:180000,signal});
  try{
   const guarded={complete:async(...args)=>{signal.throwIfAborted();assert(await lease.check());return transport.complete(...args)}};
   const result=await generateBatch(guarded,input),metrics=transport.metrics,totalMs=Math.round(performance.now()-started);
   const accepted=result.candidates.filter(c=>c.semanticPass&&c.errors.length===0).length;
   const report={stage:'model',case:id,model:NVIDIA_MODEL,candidates:result.candidates.length,accepted,flagged:result.candidates.length-accepted,totalMs,calls:metrics.length,metrics,costUsd:null,manualApproval:false};
   emit(report);reports.push(report);
   assert.equal(result.candidates.length,12);assert(accepted>0);assert.deepEqual(metrics.map(m=>m.stage),['generation','review']);assert(totalMs<PUBLIC_TIMEOUT_MS);
  }finally{await lease.release();}
 }
 // Separate review-only request: one call, with five invented/omitted-activity controls and a valid control.
 const {id,...facts}=cases[0],signal=AbortSignal.timeout(PUBLIC_TIMEOUT_MS),transport=createNvidiaProvider({apiKey:env.PUBLIC_NVIDIA_API_KEY,maxCalls:1,timeoutMs:180000,signal});
 const lease=await createPublicLimiter(env,fetch,{namespace}).acquire('preflight-negative-controls');assert(lease);
 try{
  assert(await lease.check());const reviews=await reviewCandidates(transport,{...facts,existing:[]},negativeCandidates);
  const rejected=reviews.filter(r=>r.index<5&&!r.pass).length,control=reviews.some(r=>r.index===5&&r.pass&&r.issues.length===0);
  emit({stage:'negative-controls',rejected,expected:5,positiveControlPassed:control,calls:transport.metrics.length,metrics:transport.metrics});assert.equal(rejected,5);assert(control);
 }finally{await lease.release();}
 return reports;
}
export async function main(args=process.argv.slice(2),env=process.env){
 const allowed=[...stageOptions];if(args.some(a=>!allowed.includes(a))||args.length>1)throw Error('INVALID_ARGUMENTS');
 for(const key of ['PUBLIC_AI_REDIS_URL','PUBLIC_AI_REDIS_TOKEN','PUBLIC_AI_LIMIT_SALT',...(args.includes('--redis-only')?[]:['PUBLIC_NVIDIA_API_KEY'])])if(!env[key])throw Error('MISSING_SERVER_SETTING');
 if(env.PUBLIC_AI_ENABLED==='true'||env.PUBLIC_AI_VERIFIED==='true')throw Error('PREFLIGHT_REQUIRES_DISABLED_FLAGS');
 if(!/^https:\/\/[a-zA-Z0-9-]+\.upstash\.io\/?$/.test(env.PUBLIC_AI_REDIS_URL))throw Error('INVALID_REDIS_URL');
 const namespace=`{pyeoneo-ai-preflight-${randomUUID()}}`,summary={startedAt:new Date().toISOString(),model:NVIDIA_MODEL,redis:null,models:null,ok:false};
 try{
  if(!args.includes('--models-only')){summary.redis=await runRedisPreflight(env,namespace);emit(summary.redis);await cleanup(env,namespace);}
  if(!args.includes('--redis-only'))summary.models=await runModelPreflight(env,namespace);
  summary.ok=true;return summary;
 }finally{await cleanup(env,namespace);await mkdir('tmp/public-ai-preflight',{recursive:true});await writeFile('tmp/public-ai-preflight/summary.json',JSON.stringify(summary,null,2));}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const report=await main();emit({stage:'complete',ok:report.ok});}
 catch(e){emit({stage:'failed',ok:false,code:e instanceof NvidiaError?e.code:e instanceof assert.AssertionError?'CHECK_FAILED':['MISSING_SERVER_SETTING','PREFLIGHT_REQUIRES_DISABLED_FLAGS','INVALID_ARGUMENTS','INVALID_REDIS_URL'].includes(e.message)?e.message:'PREFLIGHT_FAILED'});process.exitCode=1;}
}
