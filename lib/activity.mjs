// Shared input readiness. This is validation, never a claim of user confirmation.
export const EMPTY_ACTIVITY_MESSAGE='실제 교육활동을 입력해 주세요.';
export function activityIssues(item){
 const issues=[];
 if(typeof item?.actual!=='string'||!item.actual.trim())issues.push(EMPTY_ACTIVITY_MESSAGE);
 else if(item.actual.trim().length>4000)issues.push('실제 교육활동은 4,000자까지 입력할 수 있습니다.');
 if(item?.example!==undefined&&(typeof item.example!=='string'||item.example.trim().length>2000))issues.push('참고 예시문장은 2,000자까지 입력할 수 있습니다.');
 return issues;
}
