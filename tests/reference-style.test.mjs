import test from 'node:test';
import assert from 'node:assert/strict';
import {createInputExamples} from '../lib/input-examples.mjs';
import {referenceSentence} from '../lib/input-example-reference.mjs';
import {groundingIssues,validateText} from '../lib/core.mjs';
import {styleFixtures} from './reference-style-fixtures.mjs';
import {generateBatch} from '../lib/generation.mjs';
import {approvalIssues} from '../lib/batch.mjs';
import {blankItem} from '../lib/core.mjs';

for(const fixture of styleFixtures){
 test(`reference style and changed conditions: ${fixture.name}`,()=>{
  const item={element:fixture.element,method:'친구들과 합주하고 감상 발표하기'};
  const before=structuredClone(item),pair=createInputExamples(item);
  for(const word of fixture.keep)assert(pair.example.includes(word),`${word}: ${pair.example}`);
  assert.doesNotMatch(pair.example,/[▪●•]|활동을 수행함|하기,|쓰기,|알아보기,|함함|합주|감상 발표/);
  assert.deepEqual(validateText(pair.example).errors,[]);
  const variant=createInputExamples({element:fixture.variant}).example;
  assert(variant.includes(fixture.changed),variant);assert.notEqual(variant,pair.example);
  assert.deepEqual(item,before);
 });
}
test('lists, quotes, numeric commas and independent performances survive grammar conversion',()=>{
 assert.equal(referenceSentence('1. 물의 온도 측정하기\n2. 결과를 표로 정리하기'),'물의 온도를 측정하며, 결과를 표로 정리함.');
 assert.equal(referenceSentence('‘쉼표, 마침표’의 쓰임 알아보기, 1,000까지 수 읽기'),'‘쉼표, 마침표’의 쓰임을 알아보고, 1,000까지 수를 읽음.');
 assert.equal(referenceSentence('‘낱말 쓰기, 규칙 설명하기’라는 제목 읽기'),'‘낱말 쓰기, 규칙 설명하기’라는 제목을 읽음.');
 assert.equal(referenceSentence('성실하게 낱말을 알맞게 쓰기'),'성실하게 낱말을 알맞게 씀.');
 assert.equal(referenceSentence('매일 바르게 소리 내어 읽기'),'매일 바르게 소리 내어 읽음.');
 const text=referenceSentence('교사의 도움을 받아 일부 낱말 따라 쓰기, 어려움을 겪으며 문장을 정확하게 읽기');
 for(const token of ['교사의 도움','일부','어려움','정확하게','쓰며','읽음'])assert(text.includes(token),text);
 assert.doesNotMatch(text,/스스로|성실|잘 |바르게/);
 assert.equal(referenceSentence('규칙 설명하기, 결과 발표하기'),'규칙을 설명하며, 결과를 발표함.');
 assert.equal(referenceSentence('그림을 살펴보고 색을 구분하기, 그림을 살펴보고 모양을 설명하기'),'그림을 살펴보고 색을 구분하며, 모양을 설명함.');
});
test('unknown, blank and long input yield bounded editable drafts, without full quoted fallback',()=>{
 for(const element of ['', '학습', '몸을 오므리기', '글을 읽었다.', '- 읽기\n- 이야기 나눔', '활동'.repeat(2500)]){
  const pair=createInputExamples({element});assert(pair.actual);assert(pair.example);
  assert(pair.actual.length<=4000);assert(pair.example.length<=2000);
  assert.doesNotMatch(pair.example,/^‘.*’ 관련 수업/);
 }
 assert.equal(referenceSentence('몸을 오므리기'),'몸을 오므리기 활동에 참여함.');
});
test('reference wording never supplies performance facts or adds music activities',()=>{
 const item={element:'주변 물건으로 악기 만들기',actual:'종이 상자로 악기를 만들었다.',example:'성실하게 악기를 만들고 연주함.'};
 const pair=createInputExamples(item);
 assert.doesNotMatch(pair.actual,/성실|연주|합주/);assert.doesNotMatch(pair.example,/성실|연주|합주/);
 assert(groundingIssues('성실하게 악기를 만듦.',item.actual).length>0);
 assert.equal(item.example,'성실하게 악기를 만들고 연주함.');
});
test('a prose or unfamiliar core task cannot be replaced by an unrelated teaching method',()=>{
 for(const element of ['주변 물건으로 악기를 만드는 활동','몸을 오므리기','상자의 소리를 살펴봄.']){
  const pair=createInputExamples({element,method:'친구와 합주하기'});
  assert.doesNotMatch(pair.example,/합주/);assert.doesNotMatch(pair.actual,/합주/);
 }
});
test('mock independent review cannot turn reference-only diligence into an approvable fact',async()=>{
 const actual='악기를 만들었다.',example='성실하게 악기를 만드는 활동에 참여함.';
 const levels=[{id:'a',name:'참여',description:'',count:1}];let calls=0;
 const result=await generateBatch({complete:async(_,data,options)=>{
  calls++;assert.equal(data.actual,actual);assert.equal(data.example,example);
  return options.stage==='generation'?{candidates:[{text:example,levelId:'a',evidence:[actual]}]}:{reviews:[{index:0,pass:true,issues:[]}]};
 }},{actual,example,levels,existing:[]});
 assert.equal(calls,2);assert.equal(result.candidates.length,1);assert.equal(result.candidates[0].semanticPass,true);
 assert(result.candidates[0].errors.some(e=>e.includes('태도')));
 const item={...blankItem(),actual,example,levels,candidates:result.candidates};
 assert(approvalIssues(item).length);assert.equal(item.actual,actual);
});
