import test from 'node:test';
import assert from 'node:assert/strict';
import {blankItem,validateText} from '../lib/core.mjs';
import {createInputExamples} from '../lib/input-examples.mjs';
import {editItem} from '../lib/plan.mjs';
import {serializeProject,restoreProject} from '../lib/restore.mjs';

test('two assessment tasks produce concrete distinct local pairs with identical activities',()=>{
 assert.deepEqual(createInputExamples({element:'주변에서 여러 가지 색을 찾아보고 10색상환 완성하기'}),{
  actual:'주변에서 여러 가지 색을 찾아보고 10색상환을 완성했다.',
  example:'주변에서 여러 가지 색을 찾아보고 10색상환을 완성함.',
 });
 assert.deepEqual(createInputExamples({element:'구체물을 이용하여 9까지의 두 수의 크기 비교하기'}),{
  actual:'구체물을 이용하여 9까지의 두 수의 크기를 비교했다.',
  example:'구체물을 이용하여 9까지의 두 수의 크기를 비교함.',
 });
});
test('compound tasks and observed qualifiers are retained without extra achievements or broken adverbs',()=>{
 const tasks=[
  ['그림에 알맞은 낱말을 모두 바르게 쓰고 정확하게 소리 내어 읽기','그림에 알맞은 낱말을 모두 바르게 쓰고 정확하게 소리 내어 읽는 활동을 수행함.'],
  ['교사의 도움을 받아 낱말 일부를 따라 쓰기','교사의 도움을 받아 낱말 일부를 따라 쓰는 활동을 수행함.'],
  ['주변의 색 탐색과 10색상환 완성','주변의 색을 탐색하고 10색상환을 완성함.'],
  ['주변의 색 찾아보기, 10색상환 완성하기','주변의 색을 찾아보고 10색상환을 완성함.'],
  ['그림에 맞는 낱말 읽기와 쓰기','그림에 맞는 낱말을 읽고 쓰는 활동을 수행함.'],
  ['식물의 잎 관찰하기','식물의 잎을 관찰함.'],
 ];
 for(const [element,expected] of tasks){const pair=createInputExamples({element});assert.equal(pair.example,expected);assert.deepEqual(validateText(pair.example).errors,[]);}
});
test('preview generation is pure and never borrows original references, levels, or approvals as facts',()=>{
 const item={...blankItem(),element:'10색상환 완성하기',actual:'직접 작성한 실제 활동',example:'발표하며 협력함.',confirmed:true,criteria:'매우 잘함: 스스로 정확하게 발표하고 협력함.',approved:[{text:'기존 승인함.'}]};
 const before=structuredClone(item),pair=createInputExamples(item);
 assert.deepEqual(item,before);assert.equal(pair.example,'10색상환을 완성함.');
 assert.doesNotMatch(pair.example,/발표|협력|스스로|정확/);
});
test('vague or invalid tasks request clarification instead of emitting a fixed or forbidden example',()=>{
 for(const element of ['', '학습', '차분히 색 탐색하기', '식별하기', '색'.repeat(601)+' 탐색하기'])assert.throws(()=>createInputExamples({element}));
 assert.equal(createInputExamples({element:'식물',method:'식물의 잎 관찰하기'}).example,'식물의 잎을 관찰함.');
});
test('copy-sized patches share fact editing invalidation and final values survive save/restore',()=>{
 const item={...blankItem(),element:'10색상환 완성하기',actual:'교사가 작성한 활동',example:'교사가 작성한 예시',confirmed:true,approved:[{text:'기존 문장을 검토함.',level:'잘함'}]};
 const pair=createInputExamples(item),copied=editItem(item,{actual:pair.actual});
 assert.equal(copied.example,item.example);assert.equal(copied.confirmed,false);assert.equal(copied.approved.length,0);assert.equal(copied.candidates.length,1);
 const edited=editItem(editItem(copied,{example:pair.example}),{actual:'주변에서 찾은 색으로 10색상환을 완성했다.'});
 const restored=restoreProject(JSON.parse(serializeProject({items:[edited],examples:[],sources:[],planConfirmed:true})));
 assert.equal(restored.items[0].actual,edited.actual);assert.equal(restored.items[0].example,edited.example);assert.equal(restored.items[0].confirmed,false);
});
