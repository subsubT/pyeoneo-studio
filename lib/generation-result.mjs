import {assertDistribution,confirmationSnapshot,generationPlan} from './batch.mjs';
export class GenerationResultError extends Error{
 constructor(code,reason=null){super(code);this.code=code;this.reason=reason;}
}
// Model prose is untrusted. Only these fixed, actionable categories reach the UI.
export function inputReason(reasons){
 if(!Array.isArray(reasons)||!reasons.length||reasons.length>12||reasons.some(s=>typeof s!=='string'||!s.trim()||s.length>500))return null;
 return reasons.some(s=>/수준|단계|충돌/.test(s))?'CHECK_LEVELS':'ADD_FACTS';
}
export function reasonMessage(reason){return reason==='CHECK_LEVELS'?'평가 단계의 기준과 실제 활동이 맞는지 확인해 주세요.':'실제 활동과 확인된 성취를 더 구체적으로 입력하고 예시·평가 단계를 확인해 주세요.';}
export function generationSignature(item){return JSON.stringify([item.included!==false,confirmationSnapshot(item),generationPlan(item)]);}
// Pure updater: a changed/missing target cannot be silently treated as an applied batch.
export function appendGeneratedBatch(items,snapshot,candidates){
 return items.map(i=>i.id===snapshot.id&&generationSignature(i)===snapshot.signature&&i.candidates.length+i.approved.length+candidates.length<=120&&!candidates.some(c=>[...i.candidates,...i.approved].some(old=>old.id===c.id))?{...i,candidates:[...i.candidates,...candidates]}:i);
}
export function retrySeconds(raw,now=Date.now()){
 if(typeof raw!=='string'||!raw.trim())return null;
 const value=/^\d+(\.\d+)?$/.test(raw.trim())?Number(raw):(Date.parse(raw)-now)/1000;
 return Number.isFinite(value)&&value>=0?Math.ceil(value):null;
}
export async function readGenerationResponse(response,levels){
 let data;try{const text=await response.text();if(!text.trim()||text.length>256*1024)throw Error();data=JSON.parse(text);}catch{throw new GenerationResultError('INVALID_RESPONSE');}
 if(!response.ok){
  const known=new Set(['NEEDS_INPUT','INVALID_INPUT','INPUT_TOO_LARGE','LIMIT','LIMIT_SERVICE','SHARED_STOP','PROVIDER_BUDGET','PROVIDER_RATE_LIMIT','PROVIDER_UNAVAILABLE','TIMEOUT','CANCELLED','INVALID_AI_RESPONSE','DISABLED','ORIGIN','CLIENT_ADDRESS']);
  const error=new GenerationResultError(known.has(data?.code)?data.code:'HTTP_ERROR',data?.reason==='CHECK_LEVELS'?'CHECK_LEVELS':'ADD_FACTS');error.http=response.status;error.retryAfter=[429,503].includes(response.status)?retrySeconds(response.headers.get('retry-after')):null;throw error;
 }
 if(!data||!Array.isArray(data.candidates))throw new GenerationResultError('INVALID_RESPONSE');
 if(data.candidates.length===0){const reason=inputReason(data.reasons);throw new GenerationResultError(reason?'NEEDS_INPUT':'INVALID_RESPONSE',reason);}
 if(data.candidates.length!==levels.reduce((n,l)=>n+l.count,0))throw new GenerationResultError('COUNT_MISMATCH');
 try{assertDistribution(data.candidates,levels);}catch{throw new GenerationResultError('DISTRIBUTION_MISMATCH');}
 if(data.candidates.some(c=>c.text.length>1200||typeof c.semanticPass!=='boolean'||!Array.isArray(c.errors)||c.errors.some(e=>typeof e!=='string')))throw new GenerationResultError('INVALID_RESPONSE');
 return data.candidates;
}
export function generationFailureMessage(error){
 const code=error instanceof GenerationResultError?error.code:'CLIENT_ERROR';
 const messages={NEEDS_INPUT:reasonMessage(error?.reason),INVALID_INPUT:'실제 활동·예시·단계별 개수와 보관 한도를 확인해 주세요.',INPUT_TOO_LARGE:'AI 요청 크기를 초과했습니다. 입력 길이와 기존 문장 수를 확인해 주세요.',LIMIT:'호출 또는 동시 작업 한도에 도달했습니다.',PROVIDER_BUDGET:'공유 AI 호출 한도에 도달했습니다.',PROVIDER_RATE_LIMIT:'AI 제공사의 호출 한도에 도달했습니다.',LIMIT_SERVICE:'호출 한도 서비스에 연결하지 못했습니다.',SHARED_STOP:'AI 생성이 일시 중지되었습니다.',DISABLED:'AI 연결이 비활성 상태입니다.',PROVIDER_UNAVAILABLE:'AI가 잠시 응답하지 않습니다. 잠시 후 다시 시도해 주세요.',TIMEOUT:'생성·검증 대기 시간이 초과되었습니다.',CANCELLED:'생성을 취소했습니다.',NETWORK:'서버에 연결하지 못했습니다. 연결 상태를 확인해 주세요.',COUNT_MISMATCH:'요청한 후보 수와 응답 수가 다릅니다.',DISTRIBUTION_MISMATCH:'요청한 평가 단계와 응답 분포가 다릅니다.',INVALID_RESPONSE:'서버 응답 형식을 확인할 수 없습니다.',INVALID_AI_RESPONSE:'AI 생성·독립 검토 결과를 확인할 수 없습니다.'};
 const message=messages[code]||(error?.http===413?messages.INPUT_TOO_LARGE:error?.http===429?messages.LIMIT:'AI 생성·독립 검토를 완료하지 못했습니다.');
 return `${message}${Number.isFinite(error?.retryAfter)?` ${error.retryAfter}초 후 다시 시도해 주세요.`:''} 이번 후보는 추가되지 않았고 기존 작업은 보존됐습니다.`;
}
