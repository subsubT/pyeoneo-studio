import test from 'node:test';
import assert from 'node:assert/strict';
import {createNvidiaProvider,NVIDIA_MODEL,NvidiaError} from '../lib/server/nvidia.mjs';
import {localAiEnabled,allowedLocalRequest,createLocalAiHandler} from '../lib/server/local-ai.mjs';

const fakeKey='test-credential-do-not-print';
const validResponse=()=>Response.json({choices:[{finish_reason:'stop',message:{content:'{"ok":true}'}}],usage:{prompt_tokens:10,completion_tokens:5,total_tokens:15}});
function sse(events){const bytes=new TextEncoder().encode(events);return new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=7)c.enqueue(bytes.slice(i,i+7));c.close();}}),{headers:{'Content-Type':'text/event-stream'}});}
const event=(data)=>`data: ${JSON.stringify(data)}\r\n\r\n`;
test('fragmented UTF-8 SSE reassembles JSON, records usage, and rejects missing completion',async()=>{
 const chunks=event({choices:[{delta:{content:'{"text":"한글"}'},finish_reason:null}]})+event({choices:[{delta:{},finish_reason:'stop'}]})+event({choices:[],usage:{prompt_tokens:20,completion_tokens:8,total_tokens:28}});
 const p=createNvidiaProvider({apiKey:fakeKey,fetchImpl:async()=>sse(chunks+'data: [DONE]\n\n')});
 assert.deepEqual(await p.complete('JSON',{}, {stage:'review',maxTokens:2400}),{text:'한글'});
 assert.equal(p.metrics[0].total_tokens,28);assert.equal(p.metrics[0].stage,'review');assert.equal(p.metrics[0].ok,true);assert.ok(p.metrics[0].firstContentMs>=0);
 for(const data of [chunks,chunks.replace('"stop"','"length"')+'data: [DONE]\n\n']){
  const fail=createNvidiaProvider({apiKey:fakeKey,fetchImpl:async()=>sse(data)});
  await assert.rejects(fail.complete('JSON',{}),{code:'INCOMPLETE_RESPONSE'});assert.equal(fail.metrics[0].ok,false);
 }
});
test('body timeout and request cancellation are recorded and never yield partial candidates',async()=>{
 const p=createNvidiaProvider({apiKey:fakeKey,timeoutMs:15,fetchImpl:async(_,opts)=>new Response(new ReadableStream({start(c){opts.signal.addEventListener('abort',()=>c.error(opts.signal.reason),{once:true});}}),{headers:{'content-type':'text/event-stream'}})});
 const keepAlive=setTimeout(()=>{},100);
 try{await assert.rejects(p.complete('JSON',{}),{code:'TIMEOUT'});}finally{clearTimeout(keepAlive);}
 assert.equal(p.metrics[0].code,'TIMEOUT');assert.equal(p.metrics[0].ok,false);
 const controller=new AbortController();controller.abort();
 const aborted=createNvidiaProvider({apiKey:fakeKey,signal:controller.signal,fetchImpl:async(_,o)=>{o.signal.throwIfAborted();}});
 await assert.rejects(aborted.complete('JSON',{}),{code:'CANCELLED'});
});
test('SSE framing has its own bound while generated content remains limited to 256 KiB',async()=>{
 const tooBig=event({choices:[{delta:{content:'x'.repeat(270000)},finish_reason:'stop'}]})+'data: [DONE]\n\n';
 const p=createNvidiaProvider({apiKey:fakeKey,fetchImpl:async()=>new Response(tooBig,{headers:{'content-type':'text/event-stream'}})});
 await assert.rejects(p.complete('JSON',{}),{code:'RESPONSE_TOO_LARGE'});
 const overhead=': heartbeat\n'.repeat(25000)+event({choices:[{delta:{content:'{"ok":true}'},finish_reason:'stop'}]})+'data: [DONE]\n\n';
 const valid=createNvidiaProvider({apiKey:fakeKey,fetchImpl:async()=>new Response(overhead,{headers:{'content-type':'text/event-stream'}})});
 assert.deepEqual(await valid.complete('JSON',{}),{ok:true});
});
test('provider pins host/model; only auth header contains credential; usage is numeric',async()=>{
 let capture;
 const p=createNvidiaProvider({apiKey:fakeKey,maxCalls:1,fetchImpl:async(url,opts)=>{capture={url,opts};return validResponse();}});
 assert.deepEqual(await p.complete('JSON only',{actual:'가상 활동'},{stage:'review',maxTokens:2400}),{ok:true});
 assert.equal(capture.url,'https://integrate.api.nvidia.com/v1/chat/completions');
 assert.equal(JSON.parse(capture.opts.body).model,NVIDIA_MODEL);assert.ok(!capture.opts.body.includes(fakeKey));
 assert.equal(JSON.parse(capture.opts.body).max_tokens,2400);assert.equal(JSON.parse(capture.opts.body).stream,true);assert.equal(JSON.parse(capture.opts.body).stream_options.include_usage,true);
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

test('review timeout returns 504 without candidates, preserves stage and releases slot',async()=>{
 let calls=0;
 const handler=createLocalAiHandler({env,providerFactory:options=>{
  assert.ok(options.signal instanceof AbortSignal);
  return {metrics:[{stage:'review',durationMs:15,ok:false,code:'TIMEOUT'}],complete:async()=>{calls++;throw new NvidiaError('TIMEOUT');}};
 }});
 const body=JSON.stringify({actual:'주변의 색을 탐색하고 색상환을 완성함.',example:'가상의 활동에 참여함.',level:'보통',confirmed:true,existing:[]});
 for(let i=0;i<2;i++){
  const response=await handler(req(body)),data=await response.json();
  assert.equal(response.status,504);assert.equal(data.retryable,true);assert.equal(data.code,'TIMEOUT');assert.ok(data.error.startsWith('의미 검증'));assert.equal(data.candidates,undefined);
 }
 assert.equal(calls,2);
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
