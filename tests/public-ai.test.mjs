import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicAiHandler,publicAiEnabled,PUBLIC_ORIGIN} from '../lib/server/public-ai.mjs';
import {NvidiaError} from '../lib/server/nvidia.mjs';
import {createPublicLimiter} from '../lib/server/public-limits.mjs';
import {inputSchema} from '../lib/generation.mjs';
import {blankItem} from '../lib/core.mjs';
import {restoreProject} from '../lib/restore.mjs';
const env={PUBLIC_AI_ENABLED:'true',PUBLIC_AI_VERIFIED:'true',VERCEL:'1',VERCEL_ENV:'production',PUBLIC_NVIDIA_API_KEY:'test-only',PUBLIC_AI_REDIS_URL:'https://test.upstash.io',PUBLIC_AI_REDIS_TOKEN:'fake-token',PUBLIC_AI_LIMIT_SALT:'s'.repeat(32)};
const input={actual:'주변의 색을 탐색하고 10색상환을 완성함.',example:'주변의 색을 탐색하고 10색상환을 완성함.',level:'잘함',existing:[]};
const req=(body=input,headers={})=>new Request(PUBLIC_ORIGIN+'/api/generate',{method:'POST',headers:{host:'pyeoneo-studio.vercel.app',origin:PUBLIC_ORIGIN,'x-vercel-forwarded-for':'192.0.2.1','content-type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
const lease=()=>({check:async()=>true,release:async()=>{}});
const limiterFactory=()=>({acquire:async()=>lease()});
const providerFactory=()=>({complete:async(_,data,o)=>o.stage==='generation'?{candidates:[{text:input.actual,evidence:[input.actual]}]}:{reviews:data.candidates.map((_,index)=>({index,pass:true,issues:[]}))}});
test('legacy true/false/absent inputs are accepted but never sent to provider; v1/v2 restore only needs candidate approval',()=>{
 for(const confirmed of [true,false,undefined]){
  assert.deepEqual(inputSchema.parse({...input,confirmed}),input);
  for(const version of [1,2]){const item={...blankItem(),element:'색 탐색',...input,confirmed,approved:[{text:input.actual,level:'잘함'}]};const restored=restoreProject({version,items:[item],examples:[]});assert.equal(restored.items[0].confirmed,undefined);assert.equal(restored.items[0].approved.length,0);assert.equal(restored.items[0].candidates[0].text,input.actual);}
 }
 assert.throws(()=>inputSchema.parse({...input,unexpected:true}));
});
test('public configuration missing/disabled never calls provider or limiter; local flag cannot enable public',async()=>{
 for(const key of Object.keys(env)){
  const e={...env};delete e[key];assert.equal(publicAiEnabled(e),false);
  const h=createPublicAiHandler({env:e,providerFactory:()=>assert.fail(),limiterFactory:()=>assert.fail()});assert.equal((await h(req())).status,503);
 }
 assert.equal(publicAiEnabled({...env,PUBLIC_AI_ENABLED:'false'}),false);
 assert.equal(publicAiEnabled({...env,PUBLIC_AI_VERIFIED:'false'}),false);
 assert.equal(publicAiEnabled(env),true);
});
test('origin, host, address, content-type, bytes, schema reject before quota/provider',async()=>{
 const h=createPublicAiHandler({env,limiterFactory:()=>assert.fail()});
 for(const headers of [{origin:'https://evil.test'},{host:'evil.test'},{'x-vercel-forwarded-for':'bad'},{origin:''}])assert.equal((await h(req(input,headers))).status,403);
 for(const body of [{},{...input,actual:''},{...input,level:'other'},'{'])assert.equal((await h(req(body))).status,400);
 assert.equal((await h(req(input,{'content-type':'application/json-invalid'}))).status,400);
 assert.equal((await h(req('x'.repeat(32001)))).status,413);
});
test('enabled public request generates and independently reviews, at most twice; no confirmation exposed',async()=>{
 const calls=[];const p=providerFactory();
 const h=createPublicAiHandler({env,limiterFactory,providerFactory:options=>{assert.equal(options.maxCalls,2);return {complete:async(s,d,o)=>{calls.push({d,o});return p.complete(s,d,o)}};}});
 const r=await h(req({...input,confirmed:false}));assert.equal(r.status,200);const data=await r.json();assert.equal(data.candidates.length,1);assert.equal(data.candidates[0].semanticPass,true);assert.deepEqual(calls.map(c=>c.o.stage),['generation','review']);assert.equal(calls[0].d.confirmed,undefined);
});
test('shared limiter rejects concurrent requests across handler recreation; service failure stops calls',async()=>{
 let held=false,releaseGeneration;const wait=new Promise(r=>releaseGeneration=r);
 const shared=()=>({acquire:async()=>{if(held)return null;held=true;return {check:async()=>true,release:async()=>{held=false}}}});
 const h=()=>createPublicAiHandler({env,limiterFactory:shared,providerFactory:()=>({complete:async()=>wait})});
 const first=h()(req());await new Promise(r=>setImmediate(r));assert.equal((await h()(req())).status,429);releaseGeneration({candidates:[]});assert.equal((await first).status,200);
 for(const acquire of [async()=>{throw Error('secret')},async()=>({check:async()=>{throw Error('secret')},release:async()=>{}})]){
  const failed=await createPublicAiHandler({env,providerFactory:()=>({complete:()=>assert.fail()}),limiterFactory:()=>({acquire})})(req());assert.equal(failed.status,503);assert.ok(!(await failed.text()).includes('secret'));
 }
});
test('provider failure, incomplete review, timeout never returns partial candidates or retries',async()=>{
 for(const failure of ['provider','review','timeout']){
  let calls=0,released=0;
  const h=createPublicAiHandler({env,limiterFactory:()=>({acquire:async()=>({...lease(),release:async()=>released++})}),providerFactory:()=>({complete:async(s,d,o)=>{
   calls++;if(failure==='provider')throw Error('secret');if(failure==='timeout')throw new NvidiaError('TIMEOUT');if(o.stage==='review')return {reviews:[]};return providerFactory().complete(s,d,o);
  }})});
  const r=await h(req());assert.equal(r.status,failure==='timeout'?504:502);const data=await r.json();assert.equal(data.candidates,undefined);assert.ok(!JSON.stringify(data).includes('secret'));assert.equal(calls,failure==='review'?2:1);assert.equal(released,1);
 }
});
test('limiter failure between generation and review prevents the second call',async()=>{
 let checks=0,calls=0;
 const h=createPublicAiHandler({env,limiterFactory:()=>({acquire:async()=>({check:async()=>++checks===1,release:async()=>{}})}),providerFactory:()=>({complete:async(...args)=>{calls++;return providerFactory().complete(...args)}})});
 assert.equal((await h(req())).status,503);assert.equal(calls,1);
});
test('Redis REST sends only HMAC identity and lease, bounded response and failure closed',async()=>{
 const commands=[];const limiter=createPublicLimiter(env,async(url,opts)=>{assert.equal(url,env.PUBLIC_AI_REDIS_URL);assert.equal(opts.redirect,'error');commands.push(JSON.parse(opts.body));return Response.json({result:1});});
 const l=await limiter.acquire('192.0.2.1');assert(await l.check());await l.release();assert.equal(commands.length,3);assert.equal(commands[0][4].length,64);assert.ok(!JSON.stringify(commands).includes('192.0.2.1'));assert.ok(!JSON.stringify(commands).includes(input.actual));
 for(const response of [()=>Response.json({error:'no'}),()=>new Response('x'.repeat(17000)),()=>new Response('',{status:500})])await assert.rejects(createPublicLimiter(env,async()=>response()).acquire('192.0.2.1'));
});
test('overall timeout aborts provider and prevents review, releasing the shared lease',async()=>{
 let calls=0,released=0;
 const h=createPublicAiHandler({env,timeoutMs:10,limiterFactory:()=>({acquire:async()=>({...lease(),release:async()=>released++})}),providerFactory:({signal})=>({complete:async()=>{calls++;return new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason),{once:true});});}})});
 const keepAlive=setTimeout(()=>{},100);
 try{assert.equal((await h(req())).status,504);assert.equal(calls,1);assert.equal(released,1);}finally{clearTimeout(keepAlive);}
});
