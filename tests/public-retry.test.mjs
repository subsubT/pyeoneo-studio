import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicAiHandler,PUBLIC_ORIGIN} from '../lib/server/public-ai.mjs';
import {createGeminiProvider,GeminiError,retryAfterSeconds} from '../lib/server/gemini.mjs';
const env={PUBLIC_AI_ENABLED:'true',PUBLIC_AI_VERIFIED:'true',VERCEL:'1',VERCEL_ENV:'production',PYEONEO_GEMINI_API_KEY:'test-key',PUBLIC_AI_REDIS_URL:'https://test.upstash.io',PYEONEO_AI_REDIS_TOKEN:'test',PUBLIC_AI_LIMIT_SALT:'s'.repeat(32)};
const input={actual:'주변의 색을 탐색하고 10색상환을 완성함.',example:'주변의 색을 탐색하고 10색상환을 완성함.',level:'잘함',existing:['기존 입력을 보존함.']};
const req=signal=>new Request(PUBLIC_ORIGIN+'/api/generate',{method:'POST',signal,headers:{origin:PUBLIC_ORIGIN,host:'pyeoneo-studio.vercel.app','x-vercel-forwarded-for':'192.0.2.1','content-type':'application/json'},body:JSON.stringify(input)});
function harness({fail=[],wait=async()=>{},permit=()=>true,check=()=>true,timeoutMs=270000,random=()=>0.5,retryAfter=null,native=false}={}){
 const calls=[],waits=[],reservations=[];let releases=0;
 const complete=async(_,data,o)=>{calls.push({stage:o.stage,data,retry:o.retryAttempt});if(fail.includes(calls.length))throw new GeminiError('PROVIDER_HTTP',503,retryAfter);return o.stage==='generation'?{candidates:[{text:input.actual,evidence:[input.actual]}],reasons:[]}:{reviews:data.candidates.map((_,index)=>({index,pass:true,issues:[]}))};};
 const factory=opts=>native?createGeminiProvider({...opts,fetchImpl:async(_,o)=>{const data=JSON.parse(o.body),stage=data.generationConfig.responseJsonSchema.properties.candidates?'generation':'review';calls.push({stage});if(calls.length===1)return new Response('private error',{status:503,headers:{'Retry-After':'0'}});const out=stage==='generation'?{candidates:Array.from({length:12},()=>({text:input.actual,evidence:[input.actual]})),reasons:[]}:{reviews:JSON.parse(data.contents[0].parts[0].text).candidates.map((_,index)=>({index,pass:true,issues:[]}))};return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(out)}]}}]});}}):{complete};
 const handler=createPublicAiHandler({env,providerFactory:factory,limiterFactory:()=>({acquire:async()=>({check:async()=>check(),release:async()=>releases++}),reserveProvider:async bytes=>{reservations.push(bytes);return {allowed:permit(reservations.length),retryAfter:42};}}),wait:async(ms,signal)=>{waits.push(ms);await wait(ms,signal);},timeoutMs,random});
 return {handler,calls,waits,reservations,get releases(){return releases;}};
}
test('generation 503 retries once; both layers allow 3 attempts and each reserves quota',async()=>{
 for(const native of [false,true]){const h=harness({fail:[1],native});const r=await h.handler(req());assert.equal(r.status,200);assert.deepEqual(h.calls.map(c=>c.stage),['generation','generation','review']);assert.equal(h.reservations.length,3);assert((await r.json()).candidates.some(c=>c.semanticPass));assert.equal(h.releases,1);}
 const h=harness({fail:[1]});await h.handler(req());assert.deepEqual(h.waits,[1000,500]);assert.equal(h.calls[1].retry,true);assert.deepEqual(h.calls[0].data,input);assert.deepEqual(h.calls[1].data,input);
});
test('review 503 retries only review, retaining the generated candidate objects',async()=>{
 const h=harness({fail:[2],retryAfter:2.5});const r=await h.handler(req());assert.equal(r.status,200);assert.deepEqual(h.calls.map(c=>c.stage),['generation','review','review']);assert.equal(h.calls[1].data,h.calls[2].data);assert.equal(h.calls[2].retry,true);assert.equal(h.waits.reduce((a,b)=>a+b,0),2500);assert.equal(h.reservations.length,3);
});
test('repeated 503 preserves input, no partial candidates; next user request gets its own retry budget',async()=>{
 const h=harness({fail:[1,2]});const before=structuredClone(input);const r=await h.handler(req());assert.equal(r.status,503);const data=await r.json();assert.match(data.error,/AI가 잠시 응답하지 않습니다\. 잠시 후 다시 시도해 주세요\./);assert.equal(data.candidates,undefined);assert.equal(h.calls.length,2);assert.deepEqual(input,before);assert.equal((await h.handler(req())).status,200);assert.deepEqual(h.calls.map(c=>c.stage),['generation','generation','generation','review']);assert.equal(h.releases,2);
 const both=harness({fail:[1,3]});assert.equal((await both.handler(req())).status,503);assert.equal(both.calls.length,3); // One extra attempt total, not one per stage.
});
test('cancel, stop, quota denial or long Retry-After ends the request before another provider call',async()=>{
 const controller=new AbortController();const cancelled=harness({fail:[1],wait:async()=>controller.abort()});assert.equal((await cancelled.handler(req(controller.signal))).status,499);assert.equal(cancelled.calls.length,1);
 let active=true;const stopped=harness({fail:[1],wait:async()=>{active=false},check:()=>active});assert.equal((await stopped.handler(req())).status,503);assert.equal(stopped.calls.length,1);
 const limited=harness({fail:[1],permit:n=>n===1});const limitedResponse=await limited.handler(req());assert.equal(limitedResponse.status,429);assert.equal(limitedResponse.headers.get('retry-after'),'42');assert.equal(limited.calls.length,1);assert.equal(limited.reservations.length,2);
 const long=harness({fail:[1],retryAfter:301});assert.equal((await long.handler(req())).status,503);assert.equal(long.calls.length,1);assert.equal(long.waits.length,0);
});
test('actual retry wait is abortable and 503 Retry-After accepts seconds/date without shortening it',async()=>{
 assert.equal(retryAfterSeconds(null),null);assert.equal(retryAfterSeconds('bad'),null);assert.equal(retryAfterSeconds('0'),0);assert.equal(retryAfterSeconds('90'),90);assert.equal(retryAfterSeconds('Thu, 12 Nov 2026 00:00:02 GMT',Date.parse('2026-11-12T00:00:00Z')),2);
 const {waitForRetry}=await import('../lib/server/public-ai.mjs');const c=new AbortController();const waiting=waitForRetry(5000,c.signal);c.abort();await assert.rejects(waiting,e=>e.name==='AbortError');
 const p=createGeminiProvider({apiKey:'test',fetchImpl:async()=>new Response('private',{status:503,headers:{'Retry-After':'90'}})});await assert.rejects(p.complete('rules',input,{stage:'generation'}),e=>e.status===503&&e.retryAfter===90);
});
