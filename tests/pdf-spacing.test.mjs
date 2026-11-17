import test from 'node:test';
import assert from 'node:assert/strict';
import {pdfCellText,rawPdfText,pdfVocabulary} from '../lib/pdf-text.mjs';
import {createInputExamples} from '../lib/input-examples.mjs';
import {repairSentenceGrammar,sentenceStyleIssues} from '../lib/sentence-style.mjs';
const token=(text,x,y)=>({text,x,y,w:[...text].length*8,h:9,font:'test',hasEOL:true});
const centered=(...lines)=>lines.map((text,i)=>token(text,150-[...text].length*4,20+i*12));
test('centered cell continuation stays one task, while raw line breaks remain available',()=>{
 const tokens=centered('알맞은','인사말 하기');
 assert.equal(pdfCellText(tokens,{left:100,right:200}),'알맞은 인사말 하기');
 assert.equal(rawPdfText(tokens),'알맞은\n인사말 하기');
 const pair=createInputExamples({element:pdfCellText(tokens,{left:100,right:200})});
 assert.equal(pair.actual,'알맞은 인사말을 했다.');
 assert.equal(pair.example,'알맞은 인사말을 함.');
});
test('layout line feeds in draft tasks do not turn modifiers into unrelated fallback tasks',()=>{
 const pair=createInputExamples({element:'주변 사람에게\n고마운 마음\n가지기'});
 assert.equal(pair.actual,'주변 사람에게 고마운 마음을 가졌다.');
 assert.equal(pair.example,'주변 사람에게 고마운 마음을 가짐.');
});
test('known verb split is joined but independent normal words keep their space',()=>{
 assert.equal(pdfCellText(centered('퀴즈 알아맞히','기 놀이하기'),{left:100,right:200}),'퀴즈 알아맞히기 놀이하기');
 assert.equal(pdfCellText(centered('할','수 있음'),{left:100,right:200}),'할 수 있음');
 assert.equal(pdfCellText(centered('다양한','안전사고'),{left:100,right:200}),'다양한 안전사고');
});
test('explicit task bullets and large vertical gaps retain task boundaries',()=>{
 const tokens=[token('▪ 그림 그리기',100,20),token('▪ 노래 부르기',100,32),token('별도 제목',100,90)];
 assert.equal(pdfCellText(tokens,{left:100,right:200}),'▪ 그림 그리기\n▪ 노래 부르기\n별도 제목');
 const pair=createInputExamples({element:'▪ 그림 그리기\n▪ 노래 부르기'});
 assert.match(pair.example,/그림을/);assert.match(pair.example,/노래를/);
});
test('document-local vocabulary repairs a new noun while a particle-complete object keeps its predicate separate',()=>{
 const vocabulary=pdfVocabulary([{tokens:[token('새어휘',10,10)]}]);
 assert.equal(pdfCellText(centered('새어','휘를 읽기'),{vocabulary}),'새어휘를 읽기');
 assert.equal(pdfCellText(centered('놀이를','함.'),{vocabulary}),'놀이를 함.');
 assert.equal(pdfCellText(centered('흥미를','가진다.'),{vocabulary}),'흥미를 가진다.');
 assert.equal(pdfCellText(centered('매체로','탐색한다.'),{vocabulary}),'매체로 탐색한다.');
});
test('object particles use the noun and predicate context and stay idempotent',()=>{
 for(const [input,output] of [['인사말 하기','인사말을 하기'],['마음 가지기','마음을 가지기'],['흥미 가지기','흥미를 가지기'],['협동화 만들기','협동화를 만들기'],['수감각 기르기','수감각을 기르기']]){
  assert.equal(repairSentenceGrammar(input),output);assert.equal(repairSentenceGrammar(output),output);
 }
 for(const input of ['학교에 가기','놀이에 참여하기','미세 플라스틱에 대해 알아보기','할 수 있음','‘마음 가지기’ 읽기'])assert.equal(repairSentenceGrammar(input),input);
});
test('valid ㄹ+ㅁ nominal endings do not leave a false grammar warning on corrected examples',()=>{
 for(const text of ['예방책을 만듦.','새로운 사실을 앎.','놀이에 참여함.'])assert.deepEqual(sentenceStyleIssues(text),[]);
 assert(sentenceStyleIssues('예방책을 만들었다.').length>0);
});
test('every layout split of vocabulary nouns and explicit verb forms is recovered',()=>{
 const vocabulary=pdfVocabulary([{tokens:[token('과학탐구자료',10,10),token('자연관찰일지',10,20)]}]);
 const words=['과학탐구자료를','자연관찰일지를','안전사고','알아맞히기','모으기','만들기','알아보기','발음하고'];
 let splits=0;
 for(const word of words)for(let at=1;at<word.length;at++){
  assert.equal(pdfCellText(centered(word.slice(0,at),word.slice(at)),{vocabulary}),word);
  splits++;
 }
 assert.equal(splits,29);
});
