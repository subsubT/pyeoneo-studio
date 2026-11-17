// Local task-to-sentence rules. These are suggestions, never evidence of performance.
import {BANNED} from './core.mjs';
import {sentenceLength,sourceTaskCopy,sentenceStyleIssues,repairSentenceGrammar} from './sentence-style.mjs';
import {hasReferenceTask,referenceSentence,referenceSourceDraft} from './input-example-reference.mjs';
import {analyzeInputTask,taskContentIssues} from './input-task.mjs';
function actualSentence(analysis){
 if(!analysis.clauses.length||analysis.issues.length||analysis.clauses.some(c=>!c.verb?.past))return null;
 return analysis.restore(analysis.clauses.map(({verb,bridge},n)=>verb.head+(bridge?verb.relative+' 활동을 통해 ':n===analysis.clauses.length-1?verb.past:verb.link+', ')).join('')+'.');
}

export function createInputExamples(item){
 if(!item)throw Error('평가 항목을 먼저 선택해 주세요.');
 // Do not borrow level descriptions, existing facts, or the original reference.
 // A vague heading may use an explicit task from the confirmed teaching method.
 const sources=[{field:'element',label:'평가 요소',text:item.element},{field:'method',label:'평가 방법',text:item.method}].filter(source=>typeof source.text==='string'&&source.text.trim());
 const result=(actual,source,referenceSources,analysis=analyzeInputTask(source))=>{
  let example=referenceSentence(source,analysis);
  const contentIssues=[...taskContentIssues(analysis,actual),...taskContentIssues(analysis,example)];
  if(contentIssues.length){actual=topicDraft(source);example=referenceSourceDraft(source);}
  return {actual:repairSentenceGrammar(actual),example,referenceSources,referenceLength:sentenceLength(sourceTaskCopy(source)),referenceIssues:[...new Set(contentIssues),...sentenceStyleIssues(example),...BANNED.filter(word=>example.includes(word)).map(word=>`금지 표현: ${word}`)]};
 };
 const tasks=sources.map(source=>source.text);
 for(const source of tasks){
  const analysis=analyzeInputTask(source),actual=actualSentence(analysis);
  if(actual&&actual.length<=4000)return result(actual,source,[sources.find(entry=>entry.text===source)],analysis);
  // A concrete assessment task takes precedence over an unrelated method even
  // when the legacy factual conjugator cannot handle its prose/unknown verb.
  if(hasReferenceTask(source))return result(topicDraft(source),source,[sources.find(entry=>entry.text===source)].filter(Boolean));
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
