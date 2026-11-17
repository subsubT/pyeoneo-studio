// A small shared analysis for NEW local examples only. No restore/AI path uses it.
import {protectReferenceLiterals,repairReferenceSpacing} from './reference-spacing.mjs';
import {evaluationPredicate,EVALUATION_ACTIONS,REFERENCE_VERBS,referenceVerbForms,sourceTaskCopy,repairSentenceSpacing,repairSentenceGrammar} from './sentence-style.mjs';
const forms=[...REFERENCE_VERBS.flatMap(verb=>[...referenceVerbForms(verb),verb[5]]),...EVALUATION_ACTIONS.flatMap(action=>['하기','하였음','하였다','했음','했다','한다','하고','하며','함'].map(ending=>action+ending))];
const options={reference:true,connective:true};
function normalize(source){
 return repairReferenceSpacing(source,{reference:true,forms}).replace(/\s+/g,' ').trim().replace(/[.!。]+$/,'');
}
function grammar(text){
 return repairSentenceGrammar(text,{taskObjects:true})
  .replace(/자신의 경험한/g,'자신이 경험한')
  .replace(/그때 감정/g,'그때 느낀 감정')
  .replace(/만드는 활동을 (?:하였음|하였다|했음|했다|함|한다)$/g,'만듦')
  .replace(/문장 속 알맞은(?=\s+낱말)/g,'문장에 알맞은');
}

// Only regular task stems and explicit present endings use this fallback.
// ㄷ/ㅂ/ㅅ/ㅎ irregulars and contracted past forms require lexical entries.
function regularPredicate(text){
 let match=text.match(/^(.*?)([가-힣]{2,})(기|는다)$/);
 // A noun such as 이야기/비행기 is not a verb just because it ends in 기.
 // Unknown task forms need an explicit object/adverbial performance context.
 if(match?.[3]==='기'&&(!/(?:[을를]|바르게|스스로|함께|직접)\s+$/.test(match[1])||/^(?:이야기|비행기|기러기|쓰레기|전기|악기|일기|자기|아기|기기)$/.test(match[2]+match[3])))return null;
 if(!match){
  const present=text.match(/^(.*?)([가-힣]+)다$/);
  if(!present)return null;
  const code=present[2].charCodeAt(present[2].length-1)-0xac00;
  if(code%28!==4)return null;
  match=[present[0],present[1],present[2].slice(0,-1)+String.fromCharCode(0xac00+code-4)];
 }
 const [,head,stem]=match,code=stem.charCodeAt(stem.length-1)-0xac00;
 const jong=code%28;
 if(![0,1,4,8,16,21,22,23,24,25,26].includes(jong))return null;
 const final=jong===0||jong===8?stem.slice(0,-1)+String.fromCharCode(0xac00+code-jong+16):stem+'음';
 return {head,final,link:stem+'고',relative:(jong===8?stem.slice(0,-1)+String.fromCharCode(0xac00+code-8):stem)+'는'};
}
export function recognizeTask(source,normalized=false){
 const text=normalized?source:grammar(normalize(source));
 // Named games are participation; a direct creative task still uses 만듦.
 const game=text.match(/^(.*놀이)(?:를?\s*(?:하기|하였다|하였음|했다|했음|한다|하고|하며|함))$/);
 if(game)return {head:game[1],final:'에 참여함',link:'에 참여하고',relative:'에 참여하는'};
 const verb=evaluationPredicate(text,options)||regularPredicate(text);
 if(verb){
  let head=verb.head;
  return {...verb,head};
 }
 if(text.endsWith(' 관련 과제를 다룸'))return {head:text.slice(0,-2),final:'다룸',link:'다루고',relative:'다루는'};
 if(text.endsWith('활동'))return {head:text,final:'에 참여함',link:'에 참여하고',relative:'에 참여하는'};
 return null;
}

function tasks(source){
 const result=[];let part='',depth=0;
 const push=()=>{const text=normalize(part);if(text)result.push(grammar(text));part='';};
 for(let i=0;i<source.length;i++){
  const char=source[i];
  if('(['.includes(char))depth++;
  if(')]'.includes(char))depth=Math.max(0,depth-1);
  // A PDF/textarea line feed may be inside a clause. Split only after a
  // complete predicate; commas/conjunctions never divide object/nominal lists.
  if(!depth&&(char===';'||(char==='\n'&&recognizeTask(part))||((char===','||char==='·'||char==='/')&&recognizeTask(part)))){push();continue;}
  if(char==='\n'){part+=' ';continue;}
  const nominalList=/기$/.test(part.trim())&&/^\s+[가-힣]+기를\s/.test(source.slice(i+1));
  if(!depth&&!nominalList&&/[와과]/.test(char)&&/\s/.test(source[i+1]||'')&&recognizeTask(part)){push();continue;}
  if(!depth&&source.startsWith('및',i)&&/\s/.test(source[i+2]||'')&&recognizeTask(part)){push();i++;continue;}
  if(!depth&&/[.!。]/.test(char)&&recognizeTask(part)&&(!source[i+1]||/\s/.test(source[i+1]))){push();continue;}
  part+=char;
 }
 push();return result;
}
function sourceCopy(source){
 const protectedSource=protectReferenceLiterals(repairSentenceSpacing(source||''));
 return {...protectedSource,clauses:tasks(sourceTaskCopy(protectedSource.text))};
}


function attitude(clause){
 const verb=recognizeTask(clause,true);
 return verb&&/^(?:가짐|기름|느낌)$/.test(verb.final)&&/(?:호기심|관심|흥미)(?:을|를)\s*$/.test(verb.head)?verb:null;
}
function connectGoals(clauses){
 const result=[];
 for(const clause of clauses){
  // Separate a performed action from an explicitly supplied attitude goal.
  let split=false;
  for(const match of clause.matchAll(/\s+/g)){
   const before=clause.slice(0,match.index),after=clause.slice(match.index+match[0].length);
   const action=recognizeTask(before,true),goal=attitude(after);
   if(action?.relative&&goal&&before!==action.head+action.final){
    result.push({text:before,verb:action,bridge:true},{text:after,verb:goal});split=true;break;
   }
  }
  if(!split)result.push({text:clause,verb:recognizeTask(clause,true)});
 }
 // The same goal can be a separate bullet/line/comma clause.
 for(let i=1;i<result.length;i++){
  if(attitude(result[i].text)&&result[i-1].verb?.relative)result[i-1].bridge=true;
 }
 return result;
}

function taskStructure(text,verb){
 const connectives=[...REFERENCE_VERBS.map(v=>v[3]),...EVALUATION_ACTIONS.map(a=>a+'하고')].sort((a,b)=>b.length-a.length);
 const performances=[];
 for(const match of text.matchAll(new RegExp(`(^|\\s)(${[...new Set(connectives)].join('|')})(?=\\s|$)`,'g'))){
  performances.push({form:match[2],start:match.index+match[1].length,end:match.index+match[0].length,role:'connective'});
 }
 if(verb)performances.push({form:text.slice(verb.head.length),start:verb.head.length,end:text.length,role:'final'});
 return {performances,objectAndModifiers:verb?.head||text,constraints:[...text.matchAll(/(?:도움|지원|보조)(?:을|를)?\s*받[가-힣]*|(?:하지|하지는|되지)\s*않[가-힣]*|(?:안|못)\s+[가-힣]+|[가-힣]+(?:없이|면|때)|\ue000\d+\ue001/g)].map(m=>({text:m[0],start:m.index,end:m.index+m[0].length}))};
}
export function analyzeInputTask(source){
 const copy=sourceCopy(source),preparedSource=copy.text;
 let cursor=0;
 const clauses=connectGoals(copy.clauses).map(({text,verb,bridge})=>{
  // The original field span is retained even when spacing/morphology changes
  // prevent a narrower exact character alignment. Never invent a PDF position.
  const start=preparedSource.indexOf(text,cursor);if(start>=0)cursor=start+text.length;
  const lexical=verb&&REFERENCE_VERBS.find(v=>v[0]===verb.task);
  return {text,bridge,...taskStructure(text,verb),verb:verb?{...verb,past:lexical?.[1]||(/함$/.test(verb.final)?verb.final.slice(0,-1)+'했다':null)}:null,sourceRange:{start:0,end:source.length},workingRange:start>=0?{start,end:cursor}:null};
 });
 const issues=[];
 for(const clause of clauses){
  const text=clause.text;
  // Restricted dependency patterns: a conditional modifier still needs its
  // noun head. This is not a blanket rule about every '한 + verb'.
  if(/(?:면|다면)\s+(?:편리한|유리한|중요한|필요한)\s+(?:발표|설명|소개|정리|말)(?:하기|함|했다|한다|하고)?$/.test(text))issues.push('수식절의 대상 명사가 빠졌는지 원본 평가 요소를 확인해 주세요.');
  if(/(?:사실|이유|점)(?:와|과)\s+(?:발표|설명|소개|정리|말)(?:하기|함|했다|한다|하고)?$/.test(text))issues.push('나열한 목적어의 한쪽 내용이 빠졌는지 원본을 확인해 주세요.');
 }
 return {...copy,source,preparedSource,clauses,issues};
}
export function taskContentIssues(analysis,rendered){
 const issues=[...analysis.issues];let cursor=0;
 const normalized=rendered.replace(/\s+/g,' ');
 for(const {text,verb,performances,constraints} of analysis.clauses){
  if(!verb){if(!normalized.includes(analysis.restore(text).replace(/\s+/g,' ')))issues.push('미인식 과제를 삭제하지 않고 원문 초안으로 제공합니다.');continue;}
  const head=analysis.restore(verb.head).replace(/\s+/g,' ');
  if(!head.trim())continue;
  const at=normalized.indexOf(head,cursor);
  if(at<0)issues.push('원천 과제의 목적어·수식부·조건이 보존되지 않아 원문 초안으로 제공합니다.');
  else {
   cursor=at+head.length;
   const allowed=[verb.final,verb.past,verb.link,verb.relative,verb.manner].filter(Boolean);
   if(!allowed.some(form=>normalized.slice(cursor).startsWith(form)))issues.push('원천 수행 동사를 보존한 초안을 확인해 주세요.');
  }
  for(const span of [...performances.filter(p=>p.role==='connective').map(p=>({...p,text:p.form})),...constraints]){
   if(!normalized.includes(analysis.restore(span.text).replace(/\s+/g,' ')))issues.push('원천의 수행·조건·부정·도움·수량이 보존되지 않아 원문 초안으로 제공합니다.');
  }
 }
 return [...new Set(issues)];
}
