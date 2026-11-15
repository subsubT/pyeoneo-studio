// Local task-to-sentence rules. These are suggestions, never evidence of performance.
import {BANNED} from './core.mjs';
import {sentenceLength,sourceTaskCopy,sentenceStyleIssues,repairSentenceGrammar,REFERENCE_VERBS,referenceVerbForms} from './sentence-style.mjs';
import {protectReferenceLiterals} from './reference-spacing.mjs';
import {hasReferenceTask,referenceSentence} from './input-example-reference.mjs';
const actions=['비교','완성','탐색','관찰','조사','분류','설명','표현','실천','감상','연주','연습','계산','측정','정리','발표','소개','선택','구별','구분','확인','해결','이해','참여','협력'];
const endings=[
 ['찾아보기','찾아보았다'],
 ['살펴보기','살펴보았다'],
 ['알아보기','알아보았다'],
 ['만들기','만들었다'],
 ['꾸미기','꾸몄다'],
 ['그리기','그렸다'],
 ['부르기','불렀다'],
 ['나누기','나누었다'],
 ['고르기','골랐다'],
 ['읽기','읽었다'],
 ['쓰기','썼다'],
 ['듣기','들었다'],
 ['찾기','찾았다'],
 ['세기','세었다'],
 ['놓기','놓았다'],
 ['접기','접었다'],
 ['뛰기','뛰었다'],
 ['걷기','걸었다'],
 ['돕기','도왔다'],
 ['지키기','지켰다'],
 ['앉기','앉았다'],
 ['알기','알아보았다'],
 ['말하기','말했다'],
 ['하기','했다'],
 ...actions.map(action=>[action,`${action}했다`]),
];
function actualSentence(task){
 // Lists of nominal actions become clauses; retain every object and action.
 const protectedTask=protectReferenceLiterals(repairSentenceGrammar(task));
 let text=protectedTask.text;
 for(const [ending] of endings){
  const connective=ending.endsWith('기')?`${ending.slice(0,-1)}고`:`${ending}하고`;
  text=text.replace(new RegExp(`${ending}\\s*(?:와|과|및|[,·/])\\s*`,'g'),`${connective} `);
 }
 for(const [ending,past] of endings){
  if(text.endsWith(ending)){
   const stem=text.slice(0,-ending.length);
   return protectedTask.restore(`${stem}${past}.`);
  }
 }
 for(const verb of REFERENCE_VERBS){
  for(const form of referenceVerbForms(verb,false)){
   if(!text.endsWith(form))continue;
   const head=text.slice(0,-form.length);
   if(form===verb[2]&&['그림','느낌','기름','도움','걸음','부름'].includes(form)&&!/[을를]\s*$/.test(head))continue;
   return protectedTask.restore(head+verb[1]+'.');
  }
 }
 return null;
}

export function createInputExamples(item){
 if(!item)throw Error('평가 항목을 먼저 선택해 주세요.');
 // Do not borrow level descriptions, existing facts, or the original reference.
 // A vague heading may use an explicit task from the confirmed teaching method.
 const sources=[{field:'element',label:'평가 요소',text:item.element},{field:'method',label:'평가 방법',text:item.method}].filter(source=>typeof source.text==='string'&&source.text.trim());
 const result=(actual,source,referenceSources)=>{
  const example=referenceSentence(source);
  return {actual:repairSentenceGrammar(actual),example,referenceSources,referenceLength:sentenceLength(sourceTaskCopy(source)),referenceIssues:[...sentenceStyleIssues(example),...BANNED.filter(word=>example.includes(word)).map(word=>`금지 표현: ${word}`)]};
 };
 const tasks=sources.map(source=>source.text);
 for(const source of tasks){
  const task=flatDraft(source).replace(/[.!。]+$/,'');
  const actual=actualSentence(task);
  if(actual&&actual.length<=4000)return result(actual,source,[sources.find(entry=>entry.text===source)]);
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
 const topic=flatDraft(source);
 const excerpt=topic.length>1800?`${topic.slice(0,1800)}…`:topic;
 return `‘${excerpt}’ 관련 수업 활동에 참여했다.`;
}
function flatDraft(source){
 const {text,restore}=protectReferenceLiterals(repairSentenceGrammar(source));
 return restore(text.replace(/\s+/g,' ').trim());
}
