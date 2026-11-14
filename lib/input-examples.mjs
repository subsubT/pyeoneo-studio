// Local task-to-sentence rules. These are suggestions, never evidence of performance.
import {BANNED} from './core.mjs';
import {sentenceLength,sourceTaskCopy,sentenceStyleIssues} from './sentence-style.mjs';
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
const objectVerbs=[...actions.map(a=>`${a}(?:하기|하고|하며)?`),'쓰(?:기|고)','읽(?:기|고)','찾(?:기|고|아보기|아보고)','만들(?:기|고)','그리(?:기|고)','꾸미(?:기|고)','부르(?:기|고)','세(?:기|고)'].join('|');
// Only supply omitted particles on recognizable objects, never on adverbs such
// as '바르게', '소리 내어', '따라'. Teacher-authored clauses otherwise stay intact.
const objects=/(?:색상환|색|크기|낱말|글자|문장|이름|잎|모양|수|개수|길이|무게|시간|그림|노래|작품|악기|자료|결과|생각|느낌|방법|문제|규칙|약속|모습|특징|물건|구체물|자연|환경)$/;
function objectParticle(word){
 if(!objects.test(word)||/[을를]$/.test(word))return word;
 const last=word.charCodeAt(word.length-1)-0xac00;
 return word+(last>=0&&last<=11171&&last%28!==0?'을':'를');
}
function actualSentence(task){
 // Lists of nominal actions become clauses; retain every object and action.
 let text=task;
 for(const [ending] of endings){
  const connective=ending.endsWith('기')?`${ending.slice(0,-1)}고`:`${ending}하고`;
  text=text.replace(new RegExp(`${ending}\\s*(?:와|과|및|[,·/])\\s*`,'g'),`${connective} `);
 }
 text=text.replace(new RegExp(`(\\S+)\\s+(?=(?:${objectVerbs})(?:\\s|$|[.,]))`,'g'),(_,word)=>`${objectParticle(word)} `);
 for(const [ending,past] of endings){
  if(text.endsWith(ending)){
   const stem=text.slice(0,-ending.length);
   return `${stem}${past}.`;
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
  return {actual,example,referenceSources,referenceLength:sentenceLength(sourceTaskCopy(source)),referenceIssues:[...sentenceStyleIssues(example),...BANNED.filter(word=>example.includes(word)).map(word=>`금지 표현: ${word}`)]};
 };
 const tasks=sources.map(source=>source.text);
 for(const source of tasks){
  const task=source.replace(/\s+/g,' ').trim().replace(/[.!。]+$/,'');
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
 if(!topic)return {actual:'수업 활동에 참여했다.',example:'수업 활동에 참여함.',referenceSources};
 return result(topicDraft(source),source,referenceSources);
}
function topicDraft(source){
 const topic=source.replace(/\s+/g,' ').trim();
 const excerpt=topic.length>1800?`${topic.slice(0,1800)}…`:topic;
 return `‘${excerpt}’ 관련 수업 활동에 참여했다.`;
}
