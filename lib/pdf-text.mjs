// Layout reconstruction runs only on newly extracted PDFs. It never inserts
// particles or changes a predicate. Original PDF bytes/raw page text stay apart.
import {repairSentenceSpacing} from './sentence-style.mjs';
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
export function pdfCellText(tokens,{left,right}={}){
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
  const paragraph=vertical>Math.max(previous.h,line.h)*(ended?1.9:1.7)||bullet.test(line.text)||/[.!?。;:]\s*$/.test(previous.text);
  // Strong wrap geometry: preceding line reaches the cell edge and the next
  // returns to its left margin. EOL alone never licenses word concatenation.
  const wraps=tail&&head&&Number.isFinite(left)&&Number.isFinite(right)&&tail.x+tail.w<=right+2&&right-(tail.x+tail.w)<Math.max(18,previous.h*2)&&Math.abs(head.x-left)<Math.max(18,line.h*2);
  const separate=paragraph||!sameFont||!comparableHeight||!wraps;
  if(separate){paragraphs.push(line.text);continue;}
  const explicitSpace=/\s$/.test(previous.text)||/^\s/.test(line.text);
  if(explicitSpace){paragraphs[paragraphs.length-1]=paragraphs.at(-1).trimEnd()+' '+line.text.trimStart();continue;}
  // Only a known complete word/inflection or a noun+particle can delete the
  // line separator. Normal 어절 boundaries (including 할 수) become one space.
  // Only the current paragraph participates; task boundaries stay separate.
  const pair=paragraphs.at(-1)+'\n'+line.text;
  const repaired=repairSentenceSpacing(pair);
  if(!repaired.includes('\n')){
   paragraphs[paragraphs.length-1]=repaired;
  }else{
   // A partial lexical repair may leave other original line structure intact.
   paragraphs[paragraphs.length-1]+=' '+line.text;
  }
 }
 return paragraphs.map(paragraph=>{
  const {text,restore}=protectReferenceLiterals(repairSentenceSpacing(paragraph,{lineWrap:false}));
  return restore(text.replace(/[ \t\r\u00a0]+/g,' '));
 }).join('\n').trim();
}
