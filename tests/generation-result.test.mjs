import test from 'node:test';
import assert from 'node:assert/strict';
import {GenerationResultError,appendGeneratedBatch,generationSignature,readGenerationResponse,generationFailureMessage} from '../lib/generation-result.mjs';
import {generateBatch} from '../lib/generation.mjs';
import {blankItem} from '../lib/core.mjs';
const levels=[{id:'custom',name:'선생님 단계',count:1,description:''}],actual='주변의 색을 탐색하고 10색상환을 완성함.';
const c={id:'new',text:actual,levelId:'custom',semanticPass:true,errors:[]};
test('valid reviewed batch including semantic rejection is displayable; missing review is not',async()=>{
 for(const pass of [true,false])assert.equal((await readGenerationResponse(Response.json({candidates:[{...c,semanticPass:pass,errors:pass?[]:['핵심 누락']}]}),levels)).length,1);
 await assert.rejects(readGenerationResponse(Response.json({candidates:[{text:actual,levelId:'custom'}]}),levels),e=>e.code==='INVALID_RESPONSE');
});
test('malformed/empty HTTP bodies, status codes and hostile messages never escape into UI',async()=>{
 for(const response of [new Response(''),new Response('<html>PRIVATE</html>',{status:502}),... [400,413,429,502,503,504].map(status=>Response.json({error:'PRIVATE ZodError SyntaxError',code:'arbitrary PRIVATE'},{status,headers:{'Retry-After':'7'}}))]){
  try{await readGenerationResponse(response,levels);assert.fail();}catch(e){assert(e instanceof GenerationResultError);assert(!/PRIVATE|ZodError|SyntaxError/.test(generationFailureMessage(e)));if(response.status===429||response.status===503)assert.match(generationFailureMessage(e),/7초/);}
 }
});
test('wrong count/distribution and model input insufficiency are distinct safe failures',async()=>{
 for(const [data,code] of [[{candidates:[],reasons:[]},'INVALID_RESPONSE'],[{candidates:[],reasons:['실제 활동 정보가 부족합니다. PRIVATE']},'NEEDS_INPUT'],[{candidates:[c,c]},'COUNT_MISMATCH'],[{candidates:[{...c,levelId:'wrong'}]},'DISTRIBUTION_MISMATCH']])await assert.rejects(readGenerationResponse(Response.json(data),levels),e=>e.code===code&&!generationFailureMessage(e).includes('PRIVATE'));
});
test('server empty candidates need validated reasons and never trigger independent review or zero-success',async()=>{
 for(const reasons of [[],['실제 활동 정보가 부족합니다. PRIVATE'],['단계 기준과 충돌 PRIVATE'],[null]]){let calls=0;
  await assert.rejects(generateBatch({complete:async()=>{calls++;return {candidates:[],reasons};}},{actual,example:actual,existing:[],levels}),e=>e.code===(reasons.length&&typeof reasons[0]==='string'?'NEEDS_INPUT':'INVALID_AI_RESPONSE'));
  assert.equal(calls,1);
 }
});
test('apply is pure, preserves approvals, refuses stale/missing target and does not add a batch twice',()=>{
 const item={...blankItem(),actual,example:actual,candidates:[],approved:[{id:'old',text:'기존 승인 있음.',level:'잘함'}]},snapshot={id:item.id,signature:generationSignature(item)};
 const applied=appendGeneratedBatch([item],snapshot,[c]);assert.equal(applied[0].candidates.length,1);assert.equal(item.candidates.length,0);assert.equal(applied[0].approved,item.approved);
 assert.equal(appendGeneratedBatch(applied,snapshot,[c])[0],applied[0]);
 for(const patch of [{actual:actual+' 변경'},{example:actual+' 변경'},{included:false},{generationCounts:{'잘함':'2'}},{criteria:'새 기준'},{levels:[{id:'new',name:'새 단계'}]}]){const changed={...item,...patch};assert.equal(appendGeneratedBatch([changed],snapshot,[c])[0],changed);}
 assert.deepEqual(appendGeneratedBatch([],snapshot,[c]),[]);
});
test('unexpected client exceptions and invalid retry headers remain safe',()=>{
 assert.match(generationFailureMessage(null),/이번 후보는 추가되지/);
 assert(!generationFailureMessage(new Error('PRIVATE')).includes('PRIVATE'));
});
