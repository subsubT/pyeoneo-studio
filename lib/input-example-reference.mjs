// Local grammar for teacher-editable hypothetical references, never actual facts.
import {protectReferenceLiterals,repairReferenceSpacing} from './reference-spacing.mjs';
import {evaluationPredicate,EVALUATION_ACTIONS,REFERENCE_VERBS,referenceVerbForms,sourceTaskCopy,repairSentenceSpacing,repairSentenceGrammar} from './sentence-style.mjs';

const forms=[...REFERENCE_VERBS.flatMap(verb=>[...referenceVerbForms(verb),verb[5]]),...EVALUATION_ACTIONS.flatMap(action=>['하기','하였음','하였다','했음','했다','한다','하고','하며','함'].map(ending=>action+ending))];
const options={reference:true,connective:true};
function normalize(source){
 return repairReferenceSpacing(source,{reference:true,forms}).replace(/\s+/g,' ').trim().replace(/[.!。]+$/,'');
}
function grammar(text){
 return repairSentenceGrammar(text)
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
function recognize(source,normalized=false){
 const text=normalized?source:grammar(normalize(source));
 // Named games are participation; a direct creative task still uses 만듦.
 const game=text.match(/^(.*놀이)(?:를?\s*(?:하기|하였다|하였음|했다|했음|한다|하고|하며|함))$/);
 if(game)return {head:game[1],final:'에 참여함',link:'에 참여하고',relative:'에 참여하는'};
 const verb=evaluationPredicate(text,options)||regularPredicate(text);
 if(verb){
  let head=verb.head;
  // This listing convention belongs only to hypothetical creative examples.
  if(verb.task==='만들기')head=head.replace(/(동물|식물)(?:을|를)?\s+또는\s+(?=동물|식물)/g,'$1, ');
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
  if(!depth&&(char===';'||(char==='\n'&&recognize(part))||((char===','||char==='·'||char==='/')&&recognize(part)))){push();continue;}
  if(char==='\n'){part+=' ';continue;}
  const nominalList=/기$/.test(part.trim())&&/^\s+[가-힣]+기를\s/.test(source.slice(i+1));
  if(!depth&&!nominalList&&/[와과]/.test(char)&&/\s/.test(source[i+1]||'')&&recognize(part)){push();continue;}
  if(!depth&&char==='및'&&/\s/.test(source[i+1]||'')&&recognize(part)){push();continue;}
  if(!depth&&/[.!。]/.test(char)&&recognize(part)&&(!source[i+1]||/\s/.test(source[i+1]))){push();continue;}
  part+=char;
 }
 push();return result;
}
function sourceCopy(source){
 const protectedSource=protectReferenceLiterals(repairSentenceSpacing(source||''));
 return {...protectedSource,clauses:tasks(sourceTaskCopy(protectedSource.text))};
}

function attitude(clause){
 const verb=recognize(clause,true);
 return verb&&/^(?:가짐|기름|느낌)$/.test(verb.final)&&/(?:호기심|관심|흥미)(?:을|를)\s*$/.test(verb.head)?verb:null;
}
function connectGoals(clauses){
 const result=[];
 for(const clause of clauses){
  // Separate a performed action from an explicitly supplied attitude goal.
  let split=false;
  for(const match of clause.matchAll(/\s+/g)){
   const before=clause.slice(0,match.index),after=clause.slice(match.index+match[0].length);
   const action=recognize(before,true),goal=attitude(after);
   if(action?.relative&&goal&&before!==action.head+action.final){
    result.push({text:before,verb:action,bridge:true},{text:after,verb:goal});split=true;break;
   }
  }
  if(!split)result.push({text:clause,verb:recognize(clause,true)});
 }
 // The same goal can be a separate bullet/line/comma clause.
 for(let i=1;i<result.length;i++){
  if(attitude(result[i].text)&&result[i-1].verb?.relative)result[i-1].bridge=true;
 }
 return result;
}

export function hasReferenceTask(source){
 return sourceCopy(source).clauses.some(clause=>recognize(clause,true)||clause.endsWith('기'));
}

export function referenceSentence(source){
 const {clauses,restore}=sourceCopy(source);
 const entries=connectGoals(clauses);
 if(!entries.length)return '수업 활동에 참여함.';
 const rendered=entries.map(({text,verb,bridge},index)=>{
  const last=index===entries.length-1;
  // Preserve unsupported topics/tasks in a nominal task description instead
  // of silently passing an unconverted finite verb or deleting its content.
  if(!verb)return `${text} 관련 과제를 다룸${last?'':', '}`;
  if(bridge)return verb.head+verb.relative+' 활동을 통해 ';
  if(last)return verb.head+verb.final;
  // Before an explicit activity→attitude bridge, use the lexical ~며 form.
  if(entries[index+1]?.bridge&&verb.manner)return verb.head+verb.manner+' ';
  return verb.head+verb.link+', ';
 });
 return restore(rendered.join('').trim()+'.');
}
