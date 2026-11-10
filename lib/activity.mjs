// Shared input readiness. This is validation, never a claim of user confirmation.
export function activityIssues(item){
 const issues=[];
 if(!item||item.actual.trim().length<8||item.actual.length>4000)issues.push('실제 교육활동을 8~4,000자로 입력하세요.');
 if(!item||item.example.trim().length<5||item.example.length>2000)issues.push('참고 예시문장을 5~2,000자로 입력하세요.');
 return issues;
}
