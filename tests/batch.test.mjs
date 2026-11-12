import test from 'node:test';
import assert from 'node:assert/strict';
import {inputSchema,generateBatch} from '../lib/generation.mjs';
import {buildGeminiRequest} from '../lib/server/gemini.mjs';
import {blankItem,validateText} from '../lib/core.mjs';
import {itemLevels,generationPlan,countIssues,orderedCandidates,confirmationSnapshot,approvalIssues} from '../lib/batch.mjs';
import {editItem} from '../lib/plan.mjs';
import {serializeProject,restoreProject} from '../lib/restore.mjs';
const actual='주변의 색을 탐색하고 10색상환을 완성함.',base={actual,example:actual,existing:[]};
const plan=counts=>counts.map((count,n)=>({id:`id-${n}`,name:`사용자 단계 ${n}`,description:'확인된 사실만 표현',count}));
test('one batch across arbitrary stages, zero counts, 1/12/24, exact distribution and one independent review',async()=>{
 for(const counts of [[1],[4,0,3,5],[8,7,6,3,0]]){
  const levels=plan(counts),seen=[];
  const candidates=levels.flatMap(l=>Array.from({length:l.count},(_,n)=>({text:`${l.name} 표현 ${n} ${actual}`,levelId:l.id,evidence:[actual]})));
  const result=await generateBatch({complete:async(_,data,o)=>{seen.push({data,o});return o.stage==='generation'?{candidates}:{reviews:data.candidates.map((_,index)=>({index,pass:true,issues:[]}))};}},{...base,levels});
  assert.equal(seen.length,2);assert(seen[0].o.maxTokens<=6000);assert.deepEqual(seen[0].data.levels,levels);assert.equal(seen[1].data.candidates.length,counts.reduce((a,b)=>a+b,0));assert.equal(result.candidates.length,candidates.length);
  for(const l of levels)assert.equal(result.candidates.filter(c=>c.levelId===l.id).length,l.count);
  const req=buildGeminiRequest('rules',{...base,levels},{stage:'generation',maxTokens:counts.reduce((a,b)=>a+b,0)*500});assert.equal(req.payload.generationConfig.responseJsonSchema.properties.candidates.anyOf[0].minItems,candidates.length);
 }
});
test('invalid UI/server counts, duplicate IDs, empty/decimal/negative/over-limit/all zero reject before model',async()=>{
 for(const count of ['',-1,0.5,25,'1']){assert.throws(()=>inputSchema.parse({...base,levels:plan([count])}));if(count!=='1')assert(countIssues(plan([count])).length);}
 for(const levels of [plan([0,0]),plan([24,1]),[...plan([1]),...plan([1])]])await assert.rejects(generateBatch({complete:()=>assert.fail('must not call')},{...base,levels}));
 assert(inputSchema.safeParse({...base,levels:plan([24]),existing:Array(96).fill('stored')}).success);
 assert(!inputSchema.safeParse({...base,levels:plan([24]),existing:Array(97).fill('stored')}).success);
 assert(countIssues(plan([24]),97).some(s=>s.includes('120')));
});
test('short, excess, zero, wrong or zero-stage allocation never counts as normal completion',async()=>{
 const levels=plan([1,0,1]),c=id=>({text:actual,levelId:id,evidence:[actual]});
 for(const candidates of [[],[c('id-0')],[c('id-0'),c('id-2'),c('id-2')],[c('id-0'),c('id-0')],[c('id-0'),c('id-1')],[c('id-0'),c('unknown')]]){
  let calls=0;await assert.rejects(generateBatch({complete:async()=>{calls++;return {candidates};}},{...base,levels}));assert.equal(calls,1);
 }
});
test('full review retains new activity/core omission controls while natural endings and exact evidence survive',async()=>{
 const candidates=[{text:'색 혼합 실험에 참여함.',levelId:'id-0',evidence:['주변의 색']},{text:'주변의 색을 탐색할 수 있음.',levelId:'id-0',evidence:['주변의 색']},{text:actual,levelId:'id-0',evidence:[actual]}];
 const r=await generateBatch({complete:async(_,d,o)=>o.stage==='generation'?{candidates}:{reviews:[{index:0,pass:false,issues:['새 활동']},{index:1,pass:false,issues:['색상환 완성 누락']},{index:2,pass:true,issues:[]}]}},{...base,levels:plan([3])});
 assert.deepEqual(r.candidates.map(c=>c.semanticPass),[false,false,true]);assert.equal(validateText('표현할 수 있음.').errors.length,0);
});
test('configured IDs/order survive counts and work restore; legacy ending error alone is rejudged',()=>{
 let i={...blankItem(),element:'색 탐색',actual,example:actual,levels:plan([1,2,0]).map(({count,...l})=>l),generationCounts:{'id-0':'1','id-1':'2','id-2':'0'},approved:[{id:'ok',text:actual,level:'사용자 단계 0',levelId:'id-0'}],candidates:[{id:'a',text:'표현할 수 있음.',level:'사용자 단계 1',levelId:'id-1',errors:['종결을 ‘함.’으로 고쳐 주세요.']}]};
 const counted=editItem(i,{generationCounts:{'id-0':'24'}});assert.deepEqual(counted.approved,i.approved);
 const restored=restoreProject(JSON.parse(serializeProject({items:[i],examples:[]}))).items[0];assert.deepEqual(itemLevels(restored),i.levels);assert.deepEqual(restored.generationCounts,i.generationCounts);assert.equal(restored.approved.length,0);assert.equal(restored.candidates[1].text,i.candidates[0].text);assert.deepEqual(restored.candidates[1].errors,[]);
 assert.deepEqual(generationPlan({...blankItem(),criteria:'완성: 내용\n시도: 내용'}).map(l=>Number(l.count)),[6,6]);
});
test('confirmation binds item/IDs/text/stages/facts/criteria; numbering never identifies the target',()=>{
 const i={...blankItem(),actual,example:actual,candidates:[{id:'second',text:'둘째 표현 있음.',level:'보통'},{id:'first',text:actual,level:'잘함'}]},before=confirmationSnapshot(i);
 assert.deepEqual(orderedCandidates(i).map(c=>c.id),['first','second']);assert.deepEqual(orderedCandidates({...i,candidates:i.candidates.filter(c=>c.id!=='first')}).map(c=>c.id),['second']);
 for(const patch of [{id:'other'},{actual:actual+' 변경'},{example:actual+' 변경'},{criteria:'변경'},{candidates:[...i.candidates,{id:'new',text:'추가',level:'보통'}]},{candidates:i.candidates.slice(1)},{candidates:i.candidates.map(c=>({...c,text:c.text+' 변경'}))},{candidates:i.candidates.map(c=>({...c,level:'노력 요함'}))}])assert.notEqual(confirmationSnapshot({...i,...patch}),before);
 const errors=approvalIssues({...i,candidates:[{id:'bad',text:'명확하게 읽음.',level:'잘함'},{id:'ok',text:'표현할 수 있음.',level:'보통'}]});assert.equal(errors.length,1);assert.match(errors[0],/^1번:/);assert.equal(i.approved.length,0);
});
