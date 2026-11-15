// Source provenance is chosen by the app, never by the model. Evidence locates
// wording in this original string; it does not certify student performance.
export function generationSource({actual='',example=''}={}){
 return example.trim()?{source:'example',text:example}:{source:'actual',text:actual};
}
export function evidenceIssues(candidate,input){
 const selected=generationSource(input);
 if(candidate.evidenceSource!==selected.source)return ['변형 원문의 출처가 현재 입력과 다릅니다.'];
 if(!Array.isArray(candidate.evidence)||!candidate.evidence.length||candidate.evidence.some(part=>typeof part!=='string'||!part.trim()||!selected.text.includes(part)))return ['선택한 변형 원문에서 정확한 인용 근거를 찾지 못했습니다.'];
 return [];
}
