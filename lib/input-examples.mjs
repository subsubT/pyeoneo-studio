// Local task-to-sentence rules. These are suggestions, never evidence of performance.
import {BANNED} from './core.mjs';
import {sentenceLength,sourceTaskCopy,sentenceStyleIssues,repairSentenceGrammar,evaluationPredicate,REFERENCE_VERBS} from './sentence-style.mjs';
import {protectReferenceLiterals} from './reference-spacing.mjs';
import {hasReferenceTask,referenceSentence,referenceSourceDraft} from './input-example-reference.mjs';
import {analyzeInputTask,taskContentIssues} from './input-task.mjs';
function actualAnalysis(analysis){
 // Reference-only game/attitude bridges must not change the factual draft.
 const clauses=analysis.clauses.map(clause=>{
  const verb=evaluationPredicate(clause.text,{reference:true,connective:true})||clause.verb;
  const lexical=verb&&REFERENCE_VERBS.find(v=>v[0]===verb.task);
  return {...clause,bridge:false,verb:verb&&{...verb,past:lexical?.[1]||(/함$/.test(verb.final)?verb.final.slice(0,-1)+'했다':clause.verb?.past)}};
 });
 return {...analysis,clauses};
}
function actualSentence(analysis){
 const {clauses}=actualAnalysis(analysis);
 if(!clauses.length||analysis.issues.length||clauses.some(c=>!c.verb?.past))return null;
 return analysis.restore(clauses.map(({verb},n)=>verb.head+(n===clauses.length-1?verb.past:verb.link+', ')).join('')+'.');
}

function methodTasks(source){
 const {text,restore}=protectReferenceLiterals(source||'');
 // Only assessment metadata is removed; quoted titles/numbers stay protected.
 return restore(text.replace(/\[[^\[\]\n]{0,80}평가\s*\]/g,' ')).trim();
}
function anchors(text){
 return text.replace(/(?:하였음|하였다|했음|했다|한다|하기|함)$/,'').split(/\s+/)
  .map(word=>word.replace(/(?:에서는|으로는|에서|으로|에게|을|를|은|는|이|가|와|과|의)$/,''))
  .filter(word=>word.length>1&&!/^(?:다른|여러|다양한|활동|관련|수업)$/.test(word));
}
function coveredTask(clause,origin,analysis){
 const terms=anchors(origin.restore(clause.text));
 const target=analysis.restore(analysis.preparedSource).replace(/\s+/g,'');
 // This is containment, not synonym inference. Missing conditions, literals,
 // objects or modifiers keep the element as a separate task.
 const action=clause.verb?.task||clause.verb?.final;
 return terms.length>0&&terms.every(term=>target.includes(term))&&clause.constraints.every(c=>target.includes(origin.restore(c.text).replace(/\s+/g,'')))&&(!action||analysis.clauses.some(c=>(c.verb?.task||c.verb?.final)===action));
}
function contextualTask(element,method){
 if(!method)return null;
 const context=analyzeInputTask(method),task=analyzeInputTask(element||'');
 if(context.issues.length||!context.clauses.length||context.clauses.some(c=>!c.verb))return null;
 const elementTerms=anchors(element||''),methodText=method.replace(/\s+/g,'');
 const shared=elementTerms.filter(term=>methodText.includes(term));
 // A broad heading can use explicit method tasks. A concrete unrelated
 // method cannot replace the assessment task just because it parses.
 if(elementTerms.length&&(!shared.length||!context.clauses.some(c=>anchors(context.restore(c.text)).some(term=>!elementTerms.includes(term)))))return null;
 const retained=task.clauses.filter(c=>!coveredTask(c,task,context)).map(c=>task.restore(c.text));
 if(retained.length===task.clauses.length&&elementTerms.length&&!shared.some(term=>!['특징','방법','내용','이해','표현'].includes(term)))return null;
 const clauses=[...retained,...context.clauses.map(c=>context.restore(c.text))];
 // Never silently shorten a long method to fit the reference field.
 const source=clauses.join('. '),analysis=analyzeInputTask(source);
 const actual=actualSentence(analysis),example=referenceSentence(source,analysis);
 if(!actual||actual.length>4000||example.length>2000||taskContentIssues(actualAnalysis(analysis),actual).length||taskContentIssues(analysis,example).length)return null;
 return {source,analysis};
}

export function createInputExamples(item){
 if(!item)throw Error('평가 항목을 먼저 선택해 주세요.');
 // Do not borrow level descriptions, existing facts, or the original reference.
 // Combine a short/broad task with explicit, related method performances.
 const sources=[{field:'element',label:'평가 요소',text:item.element},{field:'method',label:'평가 방법',text:item.method}].filter(source=>typeof source.text==='string'&&source.text.trim());
 const result=(actual,source,referenceSources,analysis=analyzeInputTask(source),splitSentences=false)=>{
  const groups=splitSentences&&analysis.clauses.length===2&&!analysis.clauses[0].bridge?analysis.clauses.map(clause=>({...analysis,clauses:[clause]})):[analysis];
  if(groups.length===2)actual=groups.map(group=>actualSentence(group)).join(' ');
  let example=groups.map(group=>referenceSentence(source,group)).join(' ');
  const contentIssues=[...taskContentIssues(actualAnalysis(analysis),actual),...taskContentIssues(analysis,example)];
  if(contentIssues.length){actual=topicDraft(source);example=referenceSourceDraft(source);}
  return {actual:repairSentenceGrammar(actual),example,referenceSources,referenceLength:sentenceLength(sourceTaskCopy(source)),referenceIssues:[...new Set(contentIssues),...sentenceStyleIssues(example),...BANNED.filter(word=>example.includes(word)).map(word=>`금지 표현: ${word}`)]};
 };
 const method=methodTasks(item.method),combined=contextualTask(item.element,method);
 if(combined)return result(actualSentence(combined.analysis),combined.source,sources,combined.analysis,true);
 const tasks=sources.map(source=>source.field==='method'?method:source.text).filter(Boolean);
 for(const source of tasks){
  const analysis=analyzeInputTask(source),actual=actualSentence(analysis);
  const provenance=sources.find(entry=>entry.text===source||entry.field==='method'&&source===method);
  if(actual&&actual.length<=4000)return result(actual,source,[provenance],analysis);
  // A concrete assessment task takes precedence over an unrelated method even
  // when the legacy factual conjugator cannot handle its prose/unknown verb.
  if(hasReferenceTask(source))return result(topicDraft(source),source,[provenance].filter(Boolean));
 }
 // Unrecognized prose/lists remain teacher-editable drafts. Bound the quoted
 // topic so both suggestions fit the existing input limits when copied.
 const source=tasks[0]||[item.subject,item.unit,item.area,item.standard].filter(v=>typeof v==='string'&&v.trim()).join(' · ');
 const topic=source.replace(/\s+/g,' ').trim();
 const referenceSources=tasks.length?[sources[0]]:['subject','unit','area','standard'].filter(field=>typeof item[field]==='string'&&item[field].trim()).map(field=>({field,label:({subject:'교과',unit:'단원',area:'영역',standard:'성취기준'})[field],text:item[field]}));
 if(!topic)return result('수업 활동에 참여했다.','',referenceSources);
 return result(topicDraft(source),source,referenceSources);
}
function topicDraft(source){
 const topic=source.replace(/\s+/g,' ').trim();
 const excerpt=topic.length>1800?`${topic.slice(0,1800)}…`:topic;
 return `‘${excerpt}’ 관련 수업 활동에 참여했다.`;
}
