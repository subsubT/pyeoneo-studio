import test from 'node:test';
import assert from 'node:assert/strict';
import {createGeminiProvider,GEMINI_ENDPOINT,GEMINI_MODEL,GeminiError,buildGeminiRequest} from '../lib/server/gemini.mjs';
const options={stage:'generation',maxTokens:2400},input={actual:'주변의 색을 탐색하고 10색상환을 완성함.',example:'주변의 색을 탐색하고 10색상환을 완성함.',levels:[{id:'잘함',name:'잘함',description:'',count:12}],existing:[]};
const output={candidates:Array.from({length:12},()=>({text:input.actual,levelId:'잘함',evidence:[input.actual]})),reasons:[]};
const answer=(data=output,extra={})=>Response.json({modelVersion:GEMINI_MODEL,candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(data)}]}}],usageMetadata:{promptTokenCount:123,candidatesTokenCount:45,thoughtsTokenCount:6,totalTokenCount:174},...extra});
test('Gemini uses server header/fixed endpoint, stage JSON schemas, token caps and supported thinking options',async()=>{
 const seen=[],p=createGeminiProvider({apiKey:'server-test-key',maxCalls:2,fetchImpl:async(url,o)=>{seen.push({url,o,body:JSON.parse(o.body)});return seen.length===1?answer():answer({reviews:[{index:0,pass:true,issues:[]}]});}});
 assert.deepEqual(await p.complete('rules',input,options),output);
 await p.complete('review-rules',{candidates:output.candidates.slice(0,1)},{stage:'review',maxTokens:2400,model:'evil',endpoint:'https://evil.test'});
 for(const c of seen){assert.equal(c.url,`${GEMINI_ENDPOINT}:generateContent`);assert.equal(c.o.headers['x-goog-api-key'],'server-test-key');assert(!c.url.includes('server-test-key'));assert.equal(c.o.redirect,'error');assert.equal(c.body.generationConfig.responseMimeType,'application/json');assert.equal(c.body.generationConfig.maxOutputTokens,2400);assert.deepEqual(c.body.generationConfig.thinkingConfig,{thinkingLevel:'LOW',includeThoughts:false});assert.equal(c.body.chat_template_kwargs,undefined);assert.equal(c.body.model,undefined);}
 assert(seen[0].body.generationConfig.responseJsonSchema.properties.candidates);assert(seen[1].body.generationConfig.responseJsonSchema.properties.reviews);
 assert.equal(p.metrics[0].responseModel,GEMINI_MODEL);assert.equal(p.metrics[0].inputTokens,123);assert.equal(p.metrics[0].outputTokens,45);assert.equal(p.metrics[0].thoughtTokens,6);
 await assert.rejects(p.complete('rules',input,options),e=>e.code==='CALL_LIMIT');assert.equal(seen.length,2);
});
test('Gemini blocks empty/truncated/unsafe/schema responses without exposing partial candidates',async()=>{
 const failures=[
  [()=>new Response(''),'INVALID_JSON'],[()=>new Response('{'),'INVALID_JSON'],
  [()=>answer(output,{candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'partial'}]}}]}),'INCOMPLETE_RESPONSE'],
  [()=>answer(output,{promptFeedback:{blockReason:'SAFETY'}}),'SAFETY_BLOCK'],
  [()=>answer(output,{candidates:[{finishReason:'SAFETY'}]}),'SAFETY_BLOCK'],
  [()=>answer({candidates:[{text:'bad',levelId:'잘함',evidence:[]}],reasons:[]}),'INVALID_SCHEMA'],
  [()=>answer(output,{candidates:[{finishReason:'STOP',content:{parts:[{text:''}]}}]}),'EMPTY_CONTENT'],
  [()=>answer(output,{candidates:[{finishReason:'STOP',content:{parts:[{text:'{'}]}}]}),'INVALID_CONTENT_JSON'],
  [()=>answer({candidates:[{text:'private-test-key',levelId:'잘함',evidence:['x']}],reasons:[]}),'UNSAFE_RESPONSE'],
  [()=>new Response('x'.repeat(256*1024+1)),'RESPONSE_TOO_LARGE'],
 ];
 for(const [response,code]of failures){let calls=0;const p=createGeminiProvider({apiKey:'private-test-key',fetchImpl:async()=>{calls++;return response();}});await assert.rejects(p.complete('rules',input,options),e=>e.code===code);assert.equal(calls,1);assert.equal(p.metrics.length,1);assert.equal(p.metrics[0].ok,false);assert(!JSON.stringify(p.metrics).includes('private-test-key'));}
});
test('Gemini 403/429/network errors are sanitized and never retried; usage/model absence is explicit',async()=>{
 for(const status of [403,429,500]){let calls=0;const p=createGeminiProvider({apiKey:'test',fetchImpl:async()=>{calls++;return new Response('sensitive upstream error',{status,headers:{'Retry-After':'90'}});}});await assert.rejects(p.complete('rules',input,options),e=>e.status===status&&!e.message.includes('sensitive')&&(status!==429||e.retryAfter===90));assert.equal(calls,1);}
 const p=createGeminiProvider({apiKey:'test',fetchImpl:async()=>{throw Error('sensitive');}});await assert.rejects(p.complete('rules',input,options),e=>e.code==='NETWORK'&&!e.message.includes('sensitive'));
 const absent=createGeminiProvider({apiKey:'test',fetchImpl:async()=>answer(output,{modelVersion:undefined,usageMetadata:undefined})});await absent.complete('rules',input,options);assert.equal(absent.metrics[0].responseModel,null);assert.equal(absent.metrics[0].inputTokens,null);
});
test('Gemini cancellation/timeout abort fetch and prevent further stages',async()=>{
 for(const cancel of [false,true]){const controller=new AbortController();let calls=0;const p=createGeminiProvider({apiKey:'test',timeoutMs:15,signal:controller.signal,fetchImpl:async(_,o)=>{calls++;return new Promise((_,reject)=>o.signal.addEventListener('abort',()=>reject(o.signal.reason),{once:true}));}});const pending=p.complete('rules',input,options),keep=setTimeout(()=>{},100);if(cancel)controller.abort();try{await assert.rejects(pending,e=>e.code===(cancel?'CANCELLED':'TIMEOUT'));assert.equal(calls,1);}finally{clearTimeout(keep);}}
});
test('Gemini transport bounds keep the existing 40k input limit and reject unknown stages',()=>{
 assert.throws(()=>buildGeminiRequest('x'.repeat(40000),input,options),e=>e.code==='INPUT_TOO_LARGE');assert.throws(()=>buildGeminiRequest('rules',input,{stage:'unknown'}),GeminiError);
});

test('Gemini review requires a concrete rejection reason and cannot pass with issues',async()=>{
 for(const review of [{index:0,pass:false,issues:[]},{index:0,pass:true,issues:['unsupported fact']}]){
  const p=createGeminiProvider({apiKey:'test',fetchImpl:async()=>answer({reviews:[review]})});
  await assert.rejects(p.complete('review rules',{candidates:output.candidates.slice(0,1)},{stage:'review',maxTokens:2400}),e=>e.code==='INVALID_SCHEMA');
 }
});

test('400 diagnostics expose only a fixed classification, never upstream text',async()=>{
 for(const [message,expected] of [['sensitive schema too complex request','SCHEMA_COMPLEXITY'],['sensitive maxOutput token limit','TOKEN_ARGUMENT'],['private invalid argument','OTHER']]){
  const p=createGeminiProvider({apiKey:'key',fetchImpl:async()=>Response.json({error:{message}},{status:400})});await assert.rejects(p.complete('rules',input,options));assert.equal(p.metrics[0].rejectionCategory,expected);assert(!JSON.stringify(p.metrics).includes(message));
 }
});

test('24-candidate response schema keeps one exact evidence span per sentence to bound structured-output states',()=>{
 const p=buildGeminiRequest('rules',{...input,levels:[{...input.levels[0],count:24}]},options).payload.generationConfig.responseJsonSchema;
 const items=p.properties.candidates.anyOf[0].items;
 assert.equal(items.properties.evidence.maxItems,1);assert.equal(p.properties.candidates.anyOf[0].minItems,24);
});
