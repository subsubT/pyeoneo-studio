import {similarity} from './core.mjs';

// These are grammatical directions, never topic-specific answer templates.
export const EXPRESSION_DIRECTIONS=[
 '대상·상황을 앞세우기',
 '조건의 수식 위치 바꾸기',
 '같은 직접 수행의 자연스러운 등가 서술',
 '모든 핵심 활동과 실제 순서를 보존한 연결 바꾸기',
 '대상·상황 앞세우기와 직접 수행의 등가 서술 조합',
 '조건 수식 위치와 핵심 활동 연결 방식 조합',
];
export function expressionPlan(levels){
 let slot=0;
 return levels.flatMap(level=>Array.from({length:level.count},(_,i)=>({levelId:level.id,ordinal:i+1,direction:slot++%EXPRESSION_DIRECTIONS.length})));
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
