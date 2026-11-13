import test from 'node:test';
import assert from 'node:assert/strict';
import {activityIssues,EMPTY_ACTIVITY_MESSAGE} from '../lib/activity.mjs';
import {inputSchema,generateBatch} from '../lib/generation.mjs';
import {createLocalAiHandler} from '../lib/server/local-ai.mjs';
import {createPublicAiHandler,PUBLIC_ORIGIN} from '../lib/server/public-ai.mjs';
import {geminiOutputSchema} from '../lib/server/gemini.mjs';
import {blankItem} from '../lib/core.mjs';
import {serializeProject,restoreProject} from '../lib/restore.mjs';
import {approvalIssues} from '../lib/batch.mjs';
const levels=[{id:'a',name:'높은 단계',description:'스스로 정확하게 발표함.',count:1},{id:'b',name:'도움 단계',description:'',count:1},{id:'zero',name:'제외',description:'',count:0}];
const base={actual:'읽기',levels,existing:[]};
const publicEnv={PUBLIC_AI_ENABLED:'true',PUBLIC_AI_VERIFIED:'true',VERCEL:'1',VERCEL_ENV:'production',PYEONEO_GEMINI_API_KEY:'test',PUBLIC_AI_REDIS_URL:'https://test.upstash.io',PYEONEO_AI_REDIS_TOKEN:'test',PUBLIC_AI_LIMIT_SALT:'s'.repeat(32)};
const localEnv={LOCAL_AI_ENABLED:'true',NODE_ENV:'development',NVIDIA_API_KEY:'test'};
function request(body,publicMode){const origin=publicMode?PUBLIC_ORIGIN:'http://127.0.0.1:3006';return new Request(origin+'/api/generate',{method:'POST',headers:{origin,host:new URL(origin).host,'content-type':'application/json','x-vercel-forwarded-for':'192.0.2.1'},body:JSON.stringify(body)});}
function handler(publicMode,providerFactory,limiterFactory){return publicMode?createPublicAiHandler({env:publicEnv,providerFactory,limiterFactory}):createLocalAiHandler({env:localEnv,providerFactory});}
test('front and server agree on trim-only actual readiness, optional example and existing bounds',()=>{
 for(const actual of ['', ' ', '\t', '\n', ' \t\n ']){assert.deepEqual(activityIssues({actual}),[EMPTY_ACTIVITY_MESSAGE]);assert(!inputSchema.safeParse({...base,actual}).success);}
 for(const actual of ['가','읽기','독서 활동','가'.repeat(7),'  읽기\n'])for(const example of [undefined,'',' \t\n ','예']){assert.deepEqual(activityIssues({actual,example}),[]);const data=inputSchema.parse({...base,actual,example});assert.equal(data.actual,actual.trim());assert.equal(data.example,example?.trim()||'');}
 for(const patch of [{actual:3},{actual:null},{actual:'가'.repeat(4001)},{example:null},{example:'가'.repeat(2001)}]){assert(activityIssues({...base,...patch}).length);assert(!inputSchema.safeParse({...base,...patch}).success);}
});
test('public and local direct blank requests use exact guidance before quota/provider; retry can then succeed',async()=>{
 for(const publicMode of [false,true]){
  let calls=0,leases=0;const h=handler(publicMode,()=>({complete:async(_,d,o)=>{calls++;return o.stage==='generation'?{candidates:d.levels.flatMap(l=>Array.from({length:l.count},()=>({text:'읽기 활동을 함.',levelId:l.id,evidence:[d.actual]})))}:{reviews:d.candidates.map((_,index)=>({index,pass:true,issues:[]}))};}}),()=>({acquire:async()=>{leases++;return {check:async()=>true,release:async()=>{}};},reserveProvider:async()=>({allowed:true})}));
  for(const actual of ['', ' ', '\t', '\n', ' \t\n ']){const r=await h(request({...base,actual},publicMode));assert.equal(r.status,400);assert.deepEqual(await r.json(),{error:EMPTY_ACTIVITY_MESSAGE,code:'EMPTY_ACTUAL'});}
  assert.equal(calls,0);assert.equal(leases,0);
  const r=await h(request(base,publicMode));assert.equal(r.status,200);assert.equal((await r.json()).candidates.length,2);assert.equal(calls,2);assert.equal(leases,publicMode?1:0);
 }
});
test('short/broad conflicting batch still adds every independently reviewed flagged candidate with requested distribution',async()=>{
 for(const actual of ['읽기','독서 활동']){const calls=[];const result=await generateBatch({complete:async(_,d,o)=>{calls.push(o.stage);assert.equal(d.example,'');return o.stage==='generation'?{candidates:[{text:'읽기 활동을 함.',levelId:'a',evidence:[actual]},{text:'독서 활동에 참여함.',levelId:'b',evidence:[actual]}]}:{reviews:d.candidates.map((_,index)=>({index,pass:false,issues:['단계와 사실의 양립 확인 필요']}))};}}, {...base,actual});assert.deepEqual(calls,['generation','review']);assert.deepEqual(result.candidates.map(c=>c.levelId),['a','b']);assert(result.candidates.every(c=>!c.semanticPass&&c.errors.length));}
});
test('generation schema requires exact nonempty count and no refusal reasons',()=>{
 const c={text:'읽기 활동을 함.',levelId:'a',evidence:['읽기']},schema=geminiOutputSchema('generation',2);
 assert(schema.safeParse({candidates:[c,c],reasons:[]}).success);
 for(const candidates of [[],[c],[c,c,c]])assert(!schema.safeParse({candidates,reasons:[]}).success);
 assert(!schema.safeParse({candidates:[c,c],reasons:['사실 부족']}).success);
});
test('without reference, v1/v2 save/restore retains editable candidates, flags and reapproval requirement',()=>{
 for(const version of [1,2])for(const example of ['',undefined]){
  const item={...blankItem(),subject:'국어',element:'독서',actual:'읽기',example,levels:levels.map(({count,...l})=>l),candidates:[{text:'읽기 활동을 함.',level:'높은 단계',levelId:'a',errors:['검토 지적']}],approved:[{text:'책을 읽음.',level:'도움 단계',levelId:'b'}]};
  const raw={version,items:[item],examples:[],sources:[],planConfirmed:true};
  const restored=restoreProject(JSON.parse(serializeProject(raw))).items[0];assert.equal(restored.example,'');assert.equal(restored.approved.length,0);assert.equal(restored.candidates.length,2);assert(approvalIssues(restored).length);
  const edited={...restored,candidates:restored.candidates.map(c=>({...c,errors:[],edited:true}))};assert.deepEqual(activityIssues(edited),[]);assert.deepEqual(approvalIssues(edited),[]);
 }
});
