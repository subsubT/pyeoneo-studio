import test from 'node:test';
import assert from 'node:assert/strict';
import {createNvidiaProvider,NVIDIA_MODEL} from '../lib/server/nvidia.mjs';
import {localAiEnabled,allowedLocalRequest,createLocalAiHandler} from '../lib/server/local-ai.mjs';

const fakeKey='test-credential-do-not-print';
const validResponse=()=>Response.json({choices:[{finish_reason:'stop',message:{content:'{"ok":true}'}}],usage:{prompt_tokens:10,completion_tokens:5,total_tokens:15}});
test('provider pins host/model; only auth header contains credential; usage is numeric',async()=>{
 let capture;
 const p=createNvidiaProvider({apiKey:fakeKey,maxCalls:1,fetchImpl:async(url,opts)=>{capture={url,opts};return validResponse();}});
 assert.deepEqual(await p.complete('JSON only',{actual:'가상 활동'}),{ok:true});
 assert.equal(capture.url,'https://integrate.api.nvidia.com/v1/chat/completions');
 assert.equal(JSON.parse(capture.opts.body).model,NVIDIA_MODEL);assert.ok(!capture.opts.body.includes(fakeKey));
 assert.equal(capture.opts.headers.Authorization,'Bearer '+fakeKey);assert.equal(capture.opts.redirect,'error');
 assert.equal(p.metrics[0].total_tokens,15);await assert.rejects(p.complete('JSON',{}),{code:'LOCAL_CALL_LIMIT'});
});
test('provider never returns upstream error content/credentials',async()=>{
 const p=createNvidiaProvider({apiKey:fakeKey,fetchImpl:async()=>new Response(fakeKey,{status:401})});
 await assert.rejects(p.complete('JSON',{}),e=>e.code==='HTTP_ERROR'&&!e.message.includes(fakeKey));
 const echo=createNvidiaProvider({apiKey:fakeKey,fetchImpl:async()=>Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({echo:fakeKey})}}]})});
 await assert.rejects(echo.complete('JSON',{}),{code:'UNSAFE_RESPONSE'});
});
test('truncation, invalid JSON, oversized response and network errors fail closed',async()=>{
 for(const [response,code] of [
  [()=>Response.json({choices:[{finish_reason:'length',message:{content:'{}'}}]}),'INCOMPLETE_RESPONSE'],
  [()=>Response.json({choices:[{finish_reason:'stop',message:{content:'not-json'}}]}),'INVALID_CONTENT_JSON'],
  [()=>new Response('x'.repeat(270000)),'RESPONSE_TOO_LARGE'],
 ])await assert.rejects(createNvidiaProvider({apiKey:fakeKey,fetchImpl:async()=>response()}).complete('JSON',{}),{code});
 await assert.rejects(createNvidiaProvider({apiKey:fakeKey,fetchImpl:async()=>{throw new Error('sensitive diagnostic');}}).complete('JSON',{}),e=>e.code==='NETWORK'&&!e.message.includes('sensitive'));
});
const env={LOCAL_AI_ENABLED:'true',NODE_ENV:'development',NVIDIA_API_KEY:fakeKey};
const req=(body='{}',origin='http://127.0.0.1:3005',host='127.0.0.1:3005')=>new Request('http://127.0.0.1:3005/api/generate',{method:'POST',headers:{host,origin,'Content-Type':'application/json'},body});
test('public, production and non-opted-in environments always disable AI',async()=>{
 assert.equal(localAiEnabled(env),true);
 for(const e of [{...env,VERCEL:'1'},{...env,VERCEL:''},{...env,NODE_ENV:'production'},{...env,LOCAL_AI_ENABLED:'false'},{}]){
  assert.equal(localAiEnabled(e),false);let called=false;
  const r=await createLocalAiHandler({env:e,providerFactory:()=>{called=true;}})(req());assert.equal(r.status,503);assert.equal(called,false);
 }
 assert.equal(allowedLocalRequest(req()),true);assert.equal(allowedLocalRequest(req('{}','https://attacker.example')),false);
 assert.equal(allowedLocalRequest(req('{}','http://127.0.0.1:3005','attacker.example')),false);
 const normalized=new Request('http://localhost:3005/api/generate',{headers:{host:'127.0.0.1:3005',origin:'http://127.0.0.1:3005'}});
 assert.equal(allowedLocalRequest(normalized),true);
 const otherPort=new Request('http://localhost:3005/api/generate',{headers:{host:'127.0.0.1:3006',origin:'http://127.0.0.1:3006'}});
 assert.equal(allowedLocalRequest(otherPort),false);
});
test('oversized/invalid requests blocked before provider; global local quota bounded',async()=>{
 let called=0;const handler=createLocalAiHandler({env,providerFactory:()=>{called++;return {complete:async()=>({candidates:[]})};}});
 assert.equal((await handler(req('x'.repeat(33000)))).status,413);
 assert.equal((await handler(req('{}'))).status,400);assert.equal(called,0);
 const body=JSON.stringify({actual:'주변의 색을 탐색하고 10색상환을 완성함.',example:'색을 탐색하고 색상환을 완성함.',level:'잘함',confirmed:true,existing:[]});
 for(let n=0;n<12;n++)assert.equal((await handler(req(body))).status,200);
 assert.equal((await handler(req(body))).status,429);assert.equal(called,12);
});

test('local concurrent calls rejected and upstream failure unlocks safely',async()=>{
 let resolve;
 const waiting=new Promise(r=>{resolve=r});
 const handler=createLocalAiHandler({env,providerFactory:()=>({complete:async()=>waiting})});
 const body=JSON.stringify({actual:'주변의 색을 탐색하고 색상환을 완성함.',example:'가상의 활동에 참여함.',level:'보통',confirmed:true,existing:[]});
 const first=handler(req(body));
 // Wait for the handler to finish reading its bounded request stream.
 await new Promise(r=>setImmediate(r));
 assert.equal((await handler(req(body))).status,429);
 resolve({candidates:[]});assert.equal((await first).status,200);
 let attempts=0;
 const failing=createLocalAiHandler({env,providerFactory:()=>({complete:async()=>{attempts++;throw Error(fakeKey)}})});
 const a=await failing(req(body));assert.equal(a.status,502);assert.ok(!(await a.text()).includes(fakeKey));
 assert.equal((await failing(req(body))).status,502);assert.equal(attempts,2);
});

test('production route stays disabled with a real-looking config and never calls transport',async()=>{
 const previous={...process.env};
 try {
  process.env.LOCAL_AI_ENABLED='true';process.env.NVIDIA_API_KEY=fakeKey;process.env.NODE_ENV='production';
  const route=await import('../app/api/generate/route.js');
  const response=await route.GET();assert.equal((await response.json()).enabled,false);
  assert.equal((await route.POST(req())).status,503);
 } finally {
  for(const key of ['LOCAL_AI_ENABLED','NVIDIA_API_KEY','NODE_ENV']){
   if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];
  }
 }
});
