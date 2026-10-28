import {LEVELS} from './core.mjs';

export const WORK_FILE_LIMIT=40*1024*1024;
export const selectedItems=items=>items.filter(i=>i.included!==false);
export function selectSubject(items,subject,included){
 return items.map(i=>i.subject===subject?{...i,included}:i);
}
// Unrecognized or ambiguous criteria stay visible verbatim; never infer missing descriptions.
export function splitCriteria(text){
 const matches=[...text.matchAll(/^(매우 잘함|잘함|보통|노력 요함):[ \t]*(.*)$/gm)];
 if(!matches.length||new Set(matches.map(m=>m[1])).size!==matches.length)
  return {unassigned:text,ambiguous:matches.length>0,levels:Object.fromEntries(LEVELS.map(l=>[l,'']))};
 const levels=Object.fromEntries(LEVELS.map(l=>[l,'']));
 matches.forEach((m,n)=>{levels[m[1]]=text.slice(m.index+m[1].length+1,matches[n+1]?.index??text.length).trim()});
 return {unassigned:text.slice(0,matches[0].index).trimEnd(),levels};
}
export function editCriterion(text,level,value){
 const {unassigned,levels,ambiguous}=splitCriteria(text);
 if(ambiguous)throw Error('중복된 수준 표기를 전체 원문에서 먼저 수정하세요.');
 levels[level]=value;
 return [unassigned,...LEVELS.map(l=>`${l}: ${levels[l]}`)].filter(Boolean).join('\n');
}
export function editItem(item,patch){
 const changed=['actual','example','subject','unit','area','standard','element','method','criteria','sourceId','page']
  .some(k=>k in patch&&patch[k]!==item[k]);
 return {...item,...patch,...(changed?{confirmed:false,approved:[],candidates:[...item.candidates,...item.approved].map(c=>({...c,semanticPass:false,errors:[],edited:true}))}:{})};
}
export function planIssues(items){
 const chosen=selectedItems(items);
 if(!chosen.length)return ['평가 항목을 한 개 이상 선택하세요.'];
 return chosen.flatMap((i,n)=>!i.subject.trim()||!i.element.trim()? [`${n+1}번째 선택 항목의 교과와 평가 요소를 입력하세요. 모르는 내용은 원본에서 확인하세요.`]:[]);
}
