// Layout reconstruction runs only on newly extracted PDFs. It never inserts
// particles or changes a predicate. Original PDF bytes/raw page text stay apart.
import {repairSentenceSpacing,REFERENCE_VERBS,referenceVerbForms,EVALUATION_ACTIONS} from './sentence-style.mjs';
import {protectReferenceLiterals} from './reference-spacing.mjs';

const heightOf=token=>Math.max(1,token.h||token.fontHeight||10);
export function pdfLines(tokens){
 const lines=[];
 for(const token of [...tokens].sort((a,b)=>a.y-b.y||a.x-b.x)){
  const line=lines.slice(-3).find(line=>Math.abs(line.y-token.y)<=Math.min(3,heightOf(token)*.28,line.h*.28));
  if(line){line.tokens.push(token);line.h=Math.max(line.h,heightOf(token));}
  else lines.push({y:token.y,h:heightOf(token),tokens:[token]});
 }
 return lines.sort((a,b)=>a.y-b.y).map(line=>({...line,tokens:line.tokens.sort((a,b)=>a.x-b.x)}));
}
function lineText(line,raw=false){
 let text='';
 for(let n=0;n<line.tokens.length;n++){
  const token=line.tokens[n],previous=line.tokens[n-1];
  const gap=previous?token.x-previous.x-previous.w:0;
  const threshold=Math.max(1.5,Math.min(heightOf(token),heightOf(previous||token))*.16);
  if(previous&&!/\s$/.test(text)&&!/^\s/.test(token.text)&&gap>threshold)text+=raw&&gap>Math.max(12,line.h*2)?'\t':' ';
  text+=token.text;
 }
 return text;
}
export function rawPdfText(tokens){
 // Full-page lines retain columns as tabs and visual line breaks. No repairs.
 return pdfLines(tokens).map(line=>lineText(line,true)).join('\n');
}
const bullet=/^\s*(?:[-*▪●•◦○□■▶]|\d+[.)]|[①-⑳])/;
// Learn vocabulary only from this PDF, never from another user's document.
// These are word candidates, not a license to delete every layout separator.
export function pdfVocabulary(pages){
 const words=new Set('고운 목소리 소릿값 자음자 모음자 역할 서로 수감각 협동화 마음 인사말 활동 어려움 단어 자료 필요성 건강 안전 일부 하나 소극적 파악 발음 예상 비슷한 있다 없다 많다 무겁다 넓다'.split(' '));
 for(const verb of REFERENCE_VERBS){for(const form of referenceVerbForms(verb))words.add(form);words.add(verb[4].slice(0,-1));}
 for(const page of pages)for(const token of page.tokens)for(const match of token.text.matchAll(/[가-힣]{2,}/g))words.add(match[0]);
 return words;
}
const suffixes='에게서 에서는 에게는 에서도 으로는 으로도 에게 으로 에서 까지는 부터는 까지 부터 처럼 보다 끼리 들의 들이 들을 들과 들은 들도 을 를 은 는 이 가 와 과 에 도 만 의 로'.split(' ');
const regularStems=new Set(['맡','싶','나오','지',...REFERENCE_VERBS.map(v=>v[0].slice(0,-1))]);
function knownWord(word,vocabulary){
 if(vocabulary.has(word))return true;
 for(const suffix of suffixes)if(word.endsWith(suffix)&&vocabulary.has(word.slice(0,-suffix.length)))return true;
 const action=word.match(/^(.{2,})(?:하기|하고|하며|하여|하는|한다|함|하다|하니|할|하게)$/);
 if(action&&(EVALUATION_ACTIONS.includes(action[1])||['파악','발음','예상','건강','안전'].includes(action[1])))return true;
 const verb=word.match(/^(.+?)(?:게|면서|은|면)$/);
 if(verb&&regularStems.has(verb[1]))return true;
 return false;
}
function joinContinuation(before,after,vocabulary){
 const pair=before+'\n'+after;
 const repaired=repairSentenceSpacing(pair);
 if(!repaired.includes('\n'))return repaired;
 const tail=before.match(/[가-힣]+$/)?.[0],head=after.match(/^[가-힣]+/)?.[0];
 if(head==='다'&&tail&&(tail.charCodeAt(tail.length-1)-0xac00)%28===4)return before+after;
 if(tail&&head&&knownWord(tail+head,vocabulary))return before+after;
 return before+' '+after;
}
export function pdfCellText(tokens,{vocabulary=new Set()}={}){
 const lines=pdfLines(tokens).map(line=>({...line,text:lineText(line)})).filter(line=>line.text.trim());
 const paragraphs=[];
 for(let n=0;n<lines.length;n++){
  const line=lines[n];
  if(!n){paragraphs.push(line.text);continue;}
  const previous=lines[n-1];
  const prevTokens=previous.tokens.filter(token=>token.text.trim()),nextTokens=line.tokens.filter(token=>token.text.trim());
  const tail=prevTokens.at(-1),head=nextTokens[0];
  const sameFont=(!tail?.font||!head?.font||tail.font===head.font)&&(!tail?.dir||!head?.dir||tail.dir===head.dir);
  const comparableHeight=Math.abs(previous.h-line.h)<=Math.max(previous.h,line.h)*.3;
  const vertical=line.y-previous.y;
  const ended=previous.tokens.some(token=>token.hasEOL);
  const paragraph=vertical>Math.max(previous.h,line.h)*(ended?2.3:2)||bullet.test(line.text)||/^[\[【]/.test(line.text)||/[.!?。;:]\s*$/.test(previous.text);
  // A centered/short line can continue inside a cell too. Cell/row/level
  // partitioning is the boundary; reaching both margins is not required.
  const separate=paragraph||!sameFont||!comparableHeight;
  if(separate){paragraphs.push(line.text);continue;}
  const explicitSpace=/\s$/.test(previous.text)||/^\s/.test(line.text);
  if(explicitSpace){paragraphs[paragraphs.length-1]=paragraphs.at(-1).trimEnd()+' '+line.text.trimStart();continue;}
  // Only a known complete word/inflection or a noun+particle can delete the
  // line separator. Normal 어절 boundaries (including 할 수) become one space.
  // Only the current paragraph participates; task boundaries stay separate.
  paragraphs[paragraphs.length-1]=joinContinuation(paragraphs.at(-1),line.text,vocabulary);
 }
 return paragraphs.map(paragraph=>{
  const {text,restore}=protectReferenceLiterals(repairSentenceSpacing(paragraph,{lineWrap:false}));
  return restore(text.replace(/[ \t\r\u00a0]+/g,' '));
 }).join('\n').trim();
}
