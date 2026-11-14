// Shared grammar for NEW working copies. Reading/restoring never calls this.
import {mapUnquoted,repairReferenceSpacing} from './reference-spacing.mjs';
// Explicit inflections: do not infer conjugation from a final consonant.
export const EVALUATION_VERBS=[
 ['찾아보기','찾아보았다','찾아봄','찾아보고','찾아본다'],
 ['살펴보기','살펴보았다','살펴봄','살펴보고','살펴본다'],
 ['알아보기','알아보았다','알아봄','알아보고','알아본다'],
 ['만들기','만들었다','만듦','만들고','만든다'],
 ['꾸미기','꾸몄다','꾸밈','꾸미고','꾸민다'],
 ['그리기','그렸다','그림','그리고','그린다'],
 ['부르기','불렀다','부름','부르고','부른다'],
 ['나누기','나누었다','나눔','나누고','나눈다'],
 ['고르기','골랐다','고름','고르고','고른다'],
 ['읽기','읽었다','읽음','읽고','읽는다'],
 ['쓰기','썼다','씀','쓰고','쓴다'],
 ['듣기','들었다','들음','듣고','듣는다'],
 ['찾기','찾았다','찾음','찾고','찾는다'],
 ['세기','세었다','셈','세고','센다'],
 ['놓기','놓았다','놓음','놓고','놓는다'],
 ['접기','접었다','접음','접고','접는다'],
 ['뛰기','뛰었다','뜀','뛰고','뛴다'],
 ['걷기','걸었다','걸음','걷고','걷는다'],
 ['돕기','도왔다','도움','돕고','돕는다'],
 ['지키기','지켰다','지킴','지키고','지킨다'],
 ['앉기','앉았다','앉음','앉고','앉는다'],
 ['알기','알았다','앎','알고','안다'],
 ['말하기','말했다','말함','말하고','말한다'],
 ['치기','쳤다','침','치고','친다'],
 ['넣기','넣었다','넣음','넣고','넣는다'],
 ['붙이기','붙였다','붙임','붙이고','붙인다'],
 ['옮기기','옮겼다','옮김','옮기고','옮긴다'],
 ['적기','적었다','적음','적고','적는다'],
 ['배우기','배웠다','배움','배우고','배운다'],
 ['느끼기','느꼈다','느낌','느끼고','느낀다'],
 ['보기','보았다','봄','보고','본다'],
 ['하기','했다','함','하고','한다'],
];
export const EVALUATION_ACTIONS='비교 완성 탐색 관찰 조사 분류 설명 표현 실천 감상 연주 연습 계산 측정 정리 발표 소개 선택 구별 구분 확인 해결 이해 참여 협력 배열 수행 기록 이용 사용 연결 구성'.split(' ');
const objects=/(?:색상환|색|크기|낱말|글자|문장|이름|잎|모양|수|개수|길이|무게|시간|그림|노래|작품|악기|자료|결과|생각|느낌|감정|방법|문제|규칙|약속|모습|특징|물건|구체물|자연|환경|까닭|일|온도|종류|자세|쓰임|도구|제목|밑줄)$/;
export function objectParticle(word){
 if(!objects.test(word)||/[을를]$/.test(word)||/^(?:매일|내일|종일|온종일)$/.test(word))return word;
 const code=word.charCodeAt(word.length-1)-0xac00;
 return word+(code>=0&&code<=11171&&code%28?'을':'를');
}
export function verbForms([task,past,final,,present]){
 return [...new Set([task,past,final,present,past.slice(0,-1)+'음',...(task.endsWith('하기')?[task.slice(0,-2)+'하였다',task.slice(0,-2)+'하였음']:[])])];
}
export function evaluationPredicate(text){
 for(const verb of EVALUATION_VERBS){
  for(const form of verbForms(verb)){
   if(!text.endsWith(form))continue;
   const head=text.slice(0,-form.length);
   // '그림' etc. may be a topic noun rather than a performed action.
   if(!head&&form===verb[2]&&form!=='함')continue;
   return {head,final:verb[2],link:verb[3]};
  }
 }
 for(const action of EVALUATION_ACTIONS){
  if(text.endsWith(action))return {head:text.slice(0,-action.length),final:action+'함',link:action+'하고'};
 }
 // 하다 compounds retain their lexical verb, including participation/performance.
 const compound=text.match(/^(.*?)([가-힣]+?)(?:하였음|하였다|했음|했다|한다|하기|함)$/);
 if(compound)return {head:compound[1],final:compound[2]+'함',link:compound[2]+'하고'};
 const states=[[/^(.*?)(?:할 수 있었다|할 수 있었음|할 수 있다|할 수 있음)$/,'할 수 있음','할 수 있고'],[/^(.*?)(?:할 수 없었다|할 수 없었음|할 수 없다|할 수 없음)$/,'할 수 없음','할 수 없고'],[/^(.*?)(?:않았다|않았음|않는다|않다|않음)$/,'않음','않고'],[/^(.*?)(?:어려웠다|어려웠음|어렵다|어려움)$/,'어려움','어렵고'],[/^(.*?)(?:쉬웠다|쉬웠음|쉽다|쉬움)$/,'쉬움','쉽고'],[/^(.*?)(?:있었다|있었음|있다|있음)$/,'있음','있고'],[/^(.*?)(?:없었다|없었음|없다|없음)$/,'없음','없고'],[/^(.*?)(?:되었다|되었음|된다|됨)$/,'됨','되고']];
 for(const [pattern,final,link] of states){const match=text.match(pattern);if(match)return {head:match[1],final,link};}
 return null;
}
export function sentenceLength(text){return Array.from((text||'').trim()).length;}
export function sourceTaskCopy(source){
 return mapUnquoted(source,text=>text
  .replace(/(^|\n)\s*(?:[-*▪●•◦○□■▶]|\d+[.)]|[①-⑳])\s*/g,'\n')
  .replace(/[▪●•◦■▶]\s*/g,'\n').replace(/[ \t\r\u00a0]+/g,' ')).trim();
}
function grammarCopy(source){
 const predicates=[...EVALUATION_ACTIONS.map(a=>`${a}(?:하기|함|했다|하고|하며)?`),...EVALUATION_VERBS.flatMap(v=>[...verbForms(v),v[3]]),'찾아','넣어'].sort((a,b)=>b.length-a.length).join('|');
 return mapUnquoted(repairReferenceSpacing(source),text=>text
  .replace(/빈\s+칸/g,'빈칸')
  .replace(new RegExp(`(^|\\s)(${EVALUATION_ACTIONS.join('|')})\\s+(?=하(?:였|기|고|며|여|는|다)|했|함)`,'g'),'$1$2')
  .replace(/만드는 활동을 (?:하였음|하였다|했음|했다|함|한다)(?=[.!?。,]|$)/g,'만듦')
  .replace(new RegExp(`(\\S+)\\s+(?=(?:${predicates})(?:\\s|$|[.,와과]))`,'g'),(_,word)=>objectParticle(word)+' ')
  // Task wrappers with an explicit direct verb can retain that verb. Never
  // rewrite '만드는 활동에 참여했다' into a completed performance.
  .replace(/찾아 쓰기(?:를)?(?: 활동을)?\s+(?:하였으며|했으며)/g,'찾아 쓰고,')
  .replace(/찾아 쓰기(?:를)?(?: 활동을)?\s+하고/g,'찾아 쓰고')
  .replace(/자신의 경험한/g,'자신이 경험한')
  .replace(/그때 감정/g,'그때 느낀 감정'));
}
export function prepareSentenceCopy(source){
 // Quotes/literal contents remain byte-for-byte intact. Unknown conjugations
 // stay visible for review rather than being shortened and given '함.'.
 return mapUnquoted(grammarCopy(source),text=>text.replace(/([^.!?。\n]+)([.!?。]+|$)/g,(whole,clause,ending)=>{
  const trailing=clause.match(/\s*$/)[0],body=clause.trimEnd();
  const predicate=evaluationPredicate(body);
  if(!predicate)return whole;
  return predicate.head+predicate.final+'.'+trailing;
 })).trim();
}
export function lengthReference(example,actual=''){
 return prepareSentenceCopy(example?.trim()?example:actual);
}
export function sentenceStyleIssues(text){
 const masked=mapUnquoted(text,value=>value,()=> '인용문');
 const sentences=masked.trim().split(/(?<=[.!?。])(?=\s|[가-힣]|$)/u).filter(Boolean);
 // This checks nominal form only; semantic correctness belongs to the review.
 const nominal=/[가-힣]+[.]$/;
 const issues=[];
 for(const sentence of sentences){
  const word=sentence.match(/([가-힣]+)\.$/)?.[1]||'';
  const code=word.charCodeAt(word.length-1)-0xac00;
  const endsNominal=word.endsWith('음')||(code>=0&&code<=11171&&code%28===16);
  if(!nominal.test(sentence)||!endsNominal||/(?:었|았|였|했)음\.$/.test(sentence)){
   issues.push('동사에 맞는 ‘~ㅁ/음.’ 명사형으로 끝내 주세요.');break;
  }
 }
 if(/(?:을|를)\s+진행하며/.test(text))issues.push('직접 수행 동사 또는 참여 문맥에 맞는 연결 표현으로 고쳐 주세요.');
 return issues;
}
