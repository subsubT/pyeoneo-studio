// Local, conservative grammar for teacher-editable reference drafts. Never use
// this wording as observed performance or as a source for actual activities.
import {mapUnquoted,repairReferenceSpacing} from './reference-spacing.mjs';
const verbs = [
 ['찾아보기','찾아보았다','찾아봄','찾아보고','찾아보는'],
 ['살펴보기','살펴보았다','살펴봄','살펴보고','살펴보는'],
 ['알아보기','알아보았다','알아봄','알아보고','알아보는'],
 ['만들기','만들었다','만듦','만들며','만드는'],
 ['꾸미기','꾸몄다','꾸밈','꾸미며','꾸미는'],
 ['그리기','그렸다','그림','그리며','그리는'],
 ['부르기','불렀다','부름','부르며','부르는'],
 ['나누기','나누었다','나눔','나누며','나누는'],
 ['고르기','골랐다','고름','고르며','고르는'],
 ['읽기','읽었다','읽음','읽으며','읽는'],
 ['쓰기','썼다','씀','쓰며','쓰는'],
 ['듣기','들었다','들음','들으며','듣는'],
 ['찾기','찾았다','찾음','찾으며','찾는'],
 ['세기','세었다','셈','세며','세는'],
 ['놓기','놓았다','놓음','놓으며','놓는'],
 ['접기','접었다','접음','접으며','접는'],
 ['뛰기','뛰었다','뜀','뛰며','뛰는'],
 ['걷기','걸었다','걸음','걸으며','걷는'],
 ['돕기','도왔다','도움','도우며','돕는'],
 ['지키기','지켰다','지킴','지키며','지키는'],
 ['앉기','앉았다','앉음','앉으며','앉는'],
 ['알기','알았다','앎','알아보고','아는'],
 ['말하기','말했다','말함','말하며','말하는'],
 ['치기','쳤다','침','치며','치는'],
 ['하기','했다','함','하며','하는'],
];
const actions = '비교 완성 탐색 관찰 조사 분류 설명 표현 실천 감상 연주 연습 계산 측정 정리 발표 소개 선택 구별 구분 확인 해결 이해 참여 협력 배열'.split(' ');
const objects = /(?:색상환|색|크기|낱말|글자|문장|이름|잎|모양|수|개수|길이|무게|시간|그림|노래|작품|악기|자료|결과|생각|느낌|감정|방법|문제|규칙|약속|모습|특징|물건|구체물|자연|환경|까닭|일|온도|종류|자세|쓰임|도구|제목|밑줄)$/;
function particle(word) {
 if (!objects.test(word) || /[을를]$/.test(word) || /^(?:매일|내일|종일|온종일)$/.test(word)) return word;
 const code = word.charCodeAt(word.length - 1) - 0xac00;
 return word + (code >= 0 && code <= 11171 && code % 28 ? '을' : '를');
}
function recognize(text) {
 // Participation wording is chosen only for explicit activity constructions.
 const activity = text.match(/^(.*활동)(?:을 수행(?:하기|함|했다)|에 참여(?:하기|함|했다))?$/);
 if (activity) return {head:activity[1], final:'에 참여함', link:'에 참여하며'};
 for (const [nominal,past,final,link,adjective] of verbs) {
  for (const suffix of [nominal,past,final]) {
   if (!text.endsWith(suffix)) continue;
   let head = text.slice(0,-suffix.length);
   // A bare action noun (e.g. '그림') is ambiguous without an object.
   if (!head && suffix === final && final !== '함') continue;
   head = head.replace(/(\S+)\s+$/,(_,word)=>`${particle(word)} `);
   if (nominal === '만들기') return {head, final:`${adjective} 활동에 참여함`,link};
   return {head,final,link:nominal==='하기'&&/며\s+\S*$/.test(head)?'하고':link};
  }
 }
 for (const action of actions) {
  if (!text.endsWith(action)) continue;
  const head = text.slice(0,-action.length).replace(/(\S+)\s+$/,(_,word)=>`${particle(word)} `);
  return {head,final:`${action}함`,link:`${action}하며`};
 }
 return null;
}

function normalize(source) {
 // Repair known word/particle splits before task and verb recognition, and
 // before omitted-object particles are supplied. The source field is untouched.
 const quoted=[];
 source=mapUnquoted(repairReferenceSpacing(source),text=>text,value=>`\uE000${quoted.push(value)-1}\uE001`);
 const predicates=[...actions.map(a=>`${a}(?:하기|함|했다|하고|하며)?`),...verbs.flatMap(v=>[v[0],v[3]]),'찾아','넣어'].join('|');
 return source.replace(new RegExp(`(\\S+)\\s+(?=(?:${predicates})(?:\\s|$|[.,와과]))`,'g'),(_,word)=>`${particle(word)} `)
  .replace(/자신의 경험한/g,'자신이 경험한')
  .replace(/그때 감정/g,'그때 느낀 감정')
  .replace(/시각을 넣어 말(?:하기|함|했다)/g,'시각을 표현하기')
  .replace(/(^|\n)\s*(?:[-*▪●•◦○□■▶]|\d+[.)]|[①-⑳])\s*/g,'\n')
  .replace(/[▪●•◦■▶]\s*/g,'\n')
  .trim().replace(/\uE000(\d+)\uE001/g,(_,i)=>quoted[Number(i)]);
}

function tasks(source) {
 // Only split commas outside quotations/parentheses and after recognizable
 // predicates. Thus '몇 시, 몇 시 30분', 1,000, and material names survive.
 const result=[]; let part='', closing='', depth=0;
 const quotes={'‘':'’','“':'”',"'":"'",'"':'"','`':'`'};
 const push=()=>{if(part.trim())result.push(part.trim().replace(/[.!。]+$/,''));part='';};
 for (let i=0;i<source.length;i++) {
  const char=source[i];
  if (closing) {part+=char;if(char==='\\'&&source[i+1])part+=source[++i];else if(char===closing)closing='';continue;}
  if (quotes[char]) {closing=quotes[char];part+=char;continue;}
  if ('(['.includes(char))depth++;
  if (')]'.includes(char))depth=Math.max(0,depth-1);
  if (!depth && (char==='\n'||char===';'||((char===','||char==='·'||char==='/')&&recognize(part.trim())))) {push();continue;}
  if (!depth && /[와과및]/.test(char) && recognize(part.trim()) && /\s/.test(source[i+1]||'')) {push();continue;}
  // Periods terminate prose only after known predicates, never decimals.
  if (!depth && /[.!。]/.test(char) && recognize(part.trim()) && (!source[i+1]||/\s/.test(source[i+1]))) {push();continue;}
  part+=char;
 }
 push();return result.map(t=>mapUnquoted(t,text=>text.replace(/\s+/g,' ')).trim()).filter(Boolean);
}

export function hasReferenceTask(source) {
 return tasks(normalize(source)).some(clause=>recognize(clause)||clause.endsWith('기'));
}

export function referenceSentence(source) {
 let clauses=tasks(normalize(source));
 clauses=[...new Set(clauses)];
 if (!clauses.length) return '수업 활동에 참여함.';
 // Repeated leading reading/observation phrases may be shared by two tasks.
 // Keep both subsequent performances, including underline/explanation/help.
 for(let i=1;i<clauses.length;i++) {
  const prefix=clauses[i-1].match(/^(.+?(?:읽고|살펴보고|관찰하고))\s+/)?.[0];
  if(prefix&&clauses[i].startsWith(prefix))clauses[i]=clauses[i].slice(prefix.length);
 }
 const rendered=clauses.map((clause,index)=>{
  const verb=recognize(clause);
  if(verb)return verb.head+(index===clauses.length-1?verb.final:verb.link);
  // Unknown verbs remain explicit nominal tasks rather than being conjugated
  // by guessing. Prose/topic fallback is neutral and never invents attainment.
  const topic=clause.replace(/[.!。]+$/,'');
  const head=topic.endsWith('기')?`${topic} 활동`:`${topic} 관련 수업 활동`;
  return head+(index===clauses.length-1?'에 참여함':'에 참여하며');
 });
 const sentence=rendered.join(', ')+'.';
 if(sentence.length<=2000)return sentence;
 // Do not truncate a task/condition into a different claim. Long input remains
 // in the original field; a generic editable draft fits the existing maximum.
 return '제시된 학습 내용을 바탕으로 수업 활동에 참여함.';
}
