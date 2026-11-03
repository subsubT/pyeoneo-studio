import {validateText} from './core.mjs';

// Local task-to-sentence rules. These are suggestions, never evidence of performance.
// Both outputs share the whole task so a second activity cannot disappear or appear.
const actions=['비교','완성','탐색','관찰','조사','분류','설명','표현','실천','감상','연주','연습','계산','측정','정리','발표','소개','선택','구별','구분','확인','해결','이해','참여','협력'];
const endings=[
 ['찾아보기','찾아보았다','찾아보는 활동을 수행함'],
 ['살펴보기','살펴보았다','살펴보는 활동을 수행함'],
 ['알아보기','알아보았다','알아보는 활동을 수행함'],
 ['만들기','만들었다','만드는 활동을 수행함'],
 ['꾸미기','꾸몄다','꾸미는 활동을 수행함'],
 ['그리기','그렸다','그리는 활동을 수행함'],
 ['부르기','불렀다','부르는 활동을 수행함'],
 ['나누기','나누었다','나누는 활동을 수행함'],
 ['고르기','골랐다','고르는 활동을 수행함'],
 ['읽기','읽었다','읽는 활동을 수행함'],
 ['쓰기','썼다','쓰는 활동을 수행함'],
 ['듣기','들었다','듣는 활동을 수행함'],
 ['찾기','찾았다','찾는 활동을 수행함'],
 ['세기','세었다','세는 활동을 수행함'],
 ['놓기','놓았다','놓는 활동을 수행함'],
 ['접기','접었다','접는 활동을 수행함'],
 ['뛰기','뛰었다','뛰는 활동을 수행함'],
 ['걷기','걸었다','걷는 활동을 수행함'],
 ['돕기','도왔다','돕는 활동을 수행함'],
 ['지키기','지켰다','지키는 활동을 수행함'],
 ['앉기','앉았다','앉는 활동을 수행함'],
 ['알기','알아보았다','알아보는 활동을 수행함'],
 ['말하기','말했다','말함'],
 ['하기','했다','함'],
 ...actions.map(action=>[action,`${action}했다`,`${action}함`]),
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
function taskSentence(task){
 // Lists of nominal actions become clauses; retain every object and action.
 let text=task;
 for(const [ending] of endings){
  const connective=ending.endsWith('기')?`${ending.slice(0,-1)}고`:`${ending}하고`;
  text=text.replace(new RegExp(`${ending}\\s*(?:와|과|및|[,·/])\\s*`,'g'),`${connective} `);
 }
 text=text.replace(new RegExp(`(\\S+)\\s+(?=(?:${objectVerbs})(?:\\s|$|[.,]))`,'g'),(_,word)=>`${objectParticle(word)} `);
 for(const [ending,past,reference] of endings){
  if(text.endsWith(ending)){
   const stem=text.slice(0,-ending.length);
   return {actual:`${stem}${past}.`,example:`${stem}${reference}.`};
  }
 }
 return null;
}

export function createInputExamples(item){
 if(!item?.element?.trim())throw Error('평가 요소를 확인한 뒤 예시를 만들어 주세요.');
 // Do not borrow level descriptions, existing facts, or the original reference.
 // A vague heading may use an explicit task from the confirmed teaching method.
 const tasks=[item.element,item.method].filter(Boolean);
 for(const source of tasks){
  const task=source.replace(/\s+/g,' ').trim().replace(/[.!。]+$/,'');
  if(task.length>600)continue;
  const pair=taskSentence(task);
  if(pair&&pair.actual.length>=8&&!validateText(pair.example).errors.length)return pair;
 }
 throw Error('관찰할 활동이 드러나도록 평가 요소나 수업·평가 방법을 구체적으로 적어 주세요. 예: 주변의 색을 찾아보고 10색상환 완성하기');
}
