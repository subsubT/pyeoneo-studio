import {LEVELS,validateText,groundingIssues} from './core.mjs';

// Legacy headings become stable IDs; explicit configured stages keep their own IDs/order.
export function itemLevels(item){
 if(item.levels?.length)return item.levels;
 const matches=[...(item.criteria||'').matchAll(/^([^:\n]{1,80}):[ \t]*(.*)$/gm)];
 if(matches.length&&new Set(matches.map(m=>m[1])).size===matches.length)return matches.map((m,n)=>({id:m[1],name:m[1],description:item.criteria.slice(m.index+m[1].length+1,matches[n+1]?.index??item.criteria.length).trim()}));
 return LEVELS.map(name=>({id:name,name,description:''}));
}
export function generationPlan(item){
 const levels=itemLevels(item);
 return levels.map((l,n)=>({...l,count:item.generationCounts?.[l.id]??String(Math.floor(12/levels.length)+(n<12%levels.length?1:0))}));
}
export function countIssues(plan,stored=0){
 const issues=[];
 for(const l of plan)if(!/^\d+$/.test(String(l.count))||!Number.isInteger(Number(l.count))||Number(l.count)>24)issues.push(`${l.name}: 생성할 후보 수는 0~24개 정수로 입력하세요.`);
 const total=plan.reduce((n,l)=>n+Number(l.count),0);
 if(!issues.length&&(total<1||total>24))issues.push('생성할 후보 수 합계는 1~24개여야 합니다.');
 if(!issues.length&&stored+total>120)issues.push(`보관 한도 120개를 초과합니다. 현재 ${stored}개 + 새 후보 ${total}개입니다.`);
 return issues;
}
export function assertDistribution(candidates,levels){
 if(!Array.isArray(candidates)||candidates.length!==levels.reduce((n,l)=>n+l.count,0))throw Error('요청한 후보 수와 응답 수가 다릅니다. 기존 작업은 유지됩니다.');
 const counts=new Map(levels.map(l=>[l.id,0]));
 for(const c of candidates){if(!counts.has(c.levelId)||typeof c.text!=='string'||!c.text.trim())throw Error('후보의 평가 단계 또는 문장을 확인할 수 없습니다.');counts.set(c.levelId,counts.get(c.levelId)+1);}
 if(levels.some(l=>counts.get(l.id)!==l.count))throw Error('요청한 단계별 후보 수와 응답 분포가 다릅니다. 기존 작업은 유지됩니다.');
}
export function orderedCandidates(item){
 const order=new Map(itemLevels(item).map((l,n)=>[l.id,n]));
 return [...item.candidates].sort((a,b)=>(order.get(a.levelId??a.level)??999)-(order.get(b.levelId??b.level)??999));
}
export function confirmationSnapshot(item){
 return JSON.stringify({id:item.id,actual:item.actual,example:item.example,criteria:item.criteria,levels:itemLevels(item),candidates:orderedCandidates(item).map(c=>({id:c.id,text:c.text,levelId:c.levelId??c.level,level:c.level,errors:c.errors,semanticPass:c.semanticPass})),approved:item.approved.map(c=>({id:c.id,text:c.text}))});
}
export function approvalIssues(item){
 const rows=orderedCandidates(item),levels=itemLevels(item),seen=item.approved.map(c=>c.text);
 return rows.flatMap((c,n)=>{
  const errors=[...validateText(c.text,item.example,seen).errors,...groundingIssues(c.text,item.actual),...(c.errors||[])];seen.push(c.text);
  if(!levels.some(l=>l.id===(c.levelId??c.level)))errors.push('평가 단계를 선택하세요.');
  if(c.source==='AI 후보'&&!c.edited&&c.semanticPass!==true)errors.push('독립 의미 검토를 통과하지 못했습니다.');
  return errors.length?[`${n+1}번: ${errors[0].slice(0,160)}`]:[];
 });
}
