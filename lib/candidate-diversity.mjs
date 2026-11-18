import {similarity} from './core.mjs';
import {prepareSentenceCopy,repairSentenceGrammar,sentenceStyleIssues} from './sentence-style.mjs';

// These are grammatical directions, never topic-specific answer templates.
export const EXPRESSION_DIRECTIONS=[
 '문장 시작을 원문의 구체적 대상·도구로 전환하고, 나머지 조건·수행을 호응시킨다.',
 '수식어·조건절을 해당 대상 앞/수행 앞 사이에서 옮긴다. 조건의 적용 범위는 유지한다.',
 '같은 수행을 동의어·유사 동사로 서술한다. 비교하다/살펴보다/차이점을 찾아내다는 비교 대상·비교 행위까지 보존할 때만 등가이며 관찰만으로 축소하지 않는다.',
 '병렬 연결을 ~하고/~하며/~하여로 바꾼다. ~하여는 원래 관계와 양립할 때, ~한 뒤는 원문에 순서가 있을 때만 쓴다.',
 '원문의 상황·과정에서 시작하고 능동/피동·명사구를 전환한다. 수행 주체·대상·행위를 보존하며 새 사동·원인·결과를 만들지 않는다.',
 '원문에 있는 도구·조건을 문장 시작에 놓고 등가 동사와 병렬 연결을 함께 바꾼다. 핵심을 여러 후보에 나누지 않는다.',
];
const SLOT_GUIDES=[
 '구체 대상에서 시작; 직접 동사 유지',
 '조건/도구에서 시작; 수식 위치와 연결 함께 전환',
 '수행 대상에서 시작; 등가 동사와 명사구 조합',
 '상황에서 시작; 모든 핵심의 연결 구문 재구성',
];
export function expressionPlan(levels){
 let slot=0;
 return levels.flatMap(level=>Array.from({length:level.count},(_,i)=>{
  const position=slot++;
  return {levelId:level.id,ordinal:i+1,direction:position%EXPRESSION_DIRECTIONS.length,guide:SLOT_GUIDES[(Math.floor(position/EXPRESSION_DIRECTIONS.length)+position%EXPRESSION_DIRECTIONS.length)%SLOT_GUIDES.length]};
 }));
}

export function prepareCandidateTexts(candidates,existing=[]){
 const raw=candidates.map(c=>c.text),prepared=raw.map(prepareSentenceCopy);
 const counts=new Map();
 for(const text of prepared)counts.set(text,(counts.get(text)||0)+1);
 const occupied=new Set([...prepared,...existing.map(s=>s.trim())]);
 return prepared.map((text,i)=>{
  if(text.length>1200)return raw[i];
  if(counts.get(text)<2)return text;
  // Preserve an already nominal, grammatical surface form when optional
  // normalization collapses distinct model sentences. Never create synonyms,
  // retain spacing-only variants, or put past/weak activity wrappers back.
  const conservative=repairSentenceGrammar(raw[i]).trim();
  if(conservative!==text&&conservative.length<=1200&&!occupied.has(conservative)&&!sentenceStyleIssues(conservative).length&&!/(?:하는|는)\s+활동(?:을|에)/.test(conservative)&&conservative.replace(/\s/g,'')!==text.replace(/\s/g,'')){
   occupied.add(conservative);return conservative;
  }
  return text; // Unavoidable duplicates remain visible with local errors.
 });
}

// Comparison copies only. This small equivalence list is a repetition signal,
// not a Korean morphological/semantic analyser or a correctness judgement.
function comparisonCopy(text){
 return text.normalize('NFC').replace(/어울리는|알맞은|적절한/g,'맞는')
  .replace(/관련된|관한/g,'관한')
  .replace(/활동(?:을\s*(?:함|하고|하며)|에\s*참여(?:함|하고|하며))/g,'활동')
  .replace(/[.,!?。·]/g,' ').replace(/\s+/g,' ').trim();
}
function units(text){
 return text.split(/\s+/).filter(Boolean).map(word=>word.replace(/(?:에서는|으로는|에는|에서|으로|에게|을|를|은|는|이|가|와|과)$/u,''));
}
function dice(a,b){
 const x=new Set(a),y=new Set(b);
 return x.size+y.size?2*[...x].filter(v=>y.has(v)).length/(x.size+y.size):0;
}
function orderedOverlap(a,b){
 const positions=new Map();
 b.forEach((word,i)=>{if(!positions.has(word))positions.set(word,[]);positions.get(word).push(i);});
 let last=-1,matched=0;
 for(const word of a){
  const list=positions.get(word)||[];let low=0,high=list.length;
  while(low<high){const mid=(low+high)>>>1;if(list[mid]<=last)low=mid+1;else high=mid;}
  if(low<list.length){last=list[low];matched++;}
 }
 return a.length+b.length?2*matched/(a.length+b.length):0;
}
function features(text){const copy=comparisonCopy(text),words=units(copy);return {text,copy,words,pairs:words.slice(1).map((w,i)=>words[i]+' '+w)};}
function closeExpression(a,b){
 if(a.text.trim()===b.text.trim())return false; // Exact duplicates belong to errors.
 const chars=similarity(a.text,b.text),normal=similarity(a.copy,b.copy);
 if(chars<=.9&&normal<.86)return false;
 const order=Math.min(orderedOverlap(a.words,b.words),orderedOverlap(b.words,a.words)),pairs=dice(a.pairs,b.pairs);
 // Multiple surface signals are required; shared subject terms alone do not
 // establish a repeated construction. Thresholds are unmeasured heuristics.
 return (chars>.9&&order>=.7)||(normal>=.86&&order>=.8&&pairs>=.55);
}
export function addRepetitionWarning(warnings,warning){
 // Compare every pair, but bound stored diagnostics and keep both scopes.
 if(warnings.filter(w=>w.scope===warning.scope&&w.source===warning.source).length>=4)return;
 if(!warnings.some(w=>w.source===warning.source&&w.scope===warning.scope&&w.index===warning.index))warnings.push(warning);
}
export function analyseRepetitions(candidates,existing){
 const batch=candidates.map(c=>features(c.text)),old=existing.map(features),warnings=batch.map(()=>[]);
 for(let i=0;i<batch.length;i++){
  for(let j=i+1;j<batch.length;j++)if(closeExpression(batch[i],batch[j])){
   addRepetitionWarning(warnings[i],{source:'local',scope:'batch',index:j});
   addRepetitionWarning(warnings[j],{source:'local',scope:'batch',index:i});
  }
  for(let j=0;j<old.length;j++)if(closeExpression(batch[i],old[j]))addRepetitionWarning(warnings[i],{source:'local',scope:'existing',index:j});
 }
 return warnings;
}
export function comparisonContext(existing,texts){
 // Full existing text remains available to local checks. Transmit only whole,
 // relevant comparison sentences within a small part of the transport budget.
 const ranked=existing.map((text,index)=>({text,index,score:Math.max(...texts.map(t=>similarity(text,t)))})).sort((a,b)=>b.score-a.score||a.index-b.index);
 const selected=[];let bytes=2;
 for(const {text,index} of ranked){const entry={index,text},size=new TextEncoder().encode(JSON.stringify(entry)).length+1;if(bytes+size>6000)continue;selected.push(entry);bytes+=size;if(selected.length===12)break;}
 return selected;
}
