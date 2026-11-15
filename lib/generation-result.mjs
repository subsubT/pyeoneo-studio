import {EMPTY_ACTIVITY_MESSAGE} from './activity.mjs';
import {assertDistribution,confirmationSnapshot,generationPlan} from './batch.mjs';
export class GenerationResultError extends Error{
 constructor(code,reason=null,stage=null){super(code);this.code=code;this.reason=reason;this.stage=normalizeGenerationStage(stage);}
}
const FAILURE_CODES=new Set(['EMPTY_ACTUAL','INVALID_INPUT','INPUT_TOO_LARGE','LIMIT','LIMIT_SERVICE','SHARED_STOP','PROVIDER_BUDGET','PROVIDER_RATE_LIMIT','PROVIDER_UNAVAILABLE','PROVIDER_REQUEST_REJECTED','PROVIDER_FORBIDDEN','PROVIDER_HTTP','TIMEOUT','CANCELLED','NETWORK','INVALID_AI_RESPONSE','DISABLED','ORIGIN','CLIENT_ADDRESS','RESPONSE_JSON_ERROR','RESPONSE_SCHEMA_ERROR','REVIEW_INCOMPLETE','COUNT_MISMATCH','DISTRIBUTION_MISMATCH','INVALID_RESPONSE','SAFETY_BLOCK','INCOMPLETE_RESPONSE','CALL_LIMIT','REQUEST_BUILD_ERROR','HTTP_ERROR','CLIENT_ERROR']);
export function normalizeGenerationStage(stage){return stage==='generation'||stage==='review'?stage:null;}
export function normalizeGenerationFailure(code,status=0,stage=null){
 if(code==='PROVIDER_HTTP'&&status===400)code='PROVIDER_REQUEST_REJECTED';
 else if(code==='PROVIDER_HTTP'&&status===403)code='PROVIDER_FORBIDDEN';
 else if(code==='PROVIDER_HTTP'&&status===429)code='PROVIDER_RATE_LIMIT';
 else if(code==='PROVIDER_HTTP'&&status===503)code='PROVIDER_UNAVAILABLE';
 else if(['INVALID_JSON','INVALID_CONTENT_JSON'].includes(code))code='RESPONSE_JSON_ERROR';
 else if(['INVALID_SCHEMA','EMPTY_CONTENT','EMPTY_RESPONSE','UNSAFE_RESPONSE','RESPONSE_TOO_LARGE'].includes(code))code='RESPONSE_SCHEMA_ERROR';
 else if(code==='INVALID_STAGE')code='REQUEST_BUILD_ERROR';
 return {code:FAILURE_CODES.has(code)?code:'INVALID_AI_RESPONSE',stage:normalizeGenerationStage(stage)};
}
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
  const failure=normalizeGenerationFailure(data?.code,0,data?.stage);
  const error=new GenerationResultError(failure.code,null,failure.stage);error.http=response.status;error.retryAfter=[429,503].includes(response.status)?retrySeconds(response.headers.get('retry-after')):null;throw error;
 }
 if(!data||!Array.isArray(data.candidates))throw new GenerationResultError('INVALID_RESPONSE');
 if(data.candidates.length===0)throw new GenerationResultError('INVALID_RESPONSE');
 if(data.candidates.length!==levels.reduce((n,l)=>n+l.count,0))throw new GenerationResultError('COUNT_MISMATCH');
 try{assertDistribution(data.candidates,levels);}catch{throw new GenerationResultError('DISTRIBUTION_MISMATCH');}
 if(data.candidates.some(c=>c.text.length>1200||typeof c.semanticPass!=='boolean'||!Array.isArray(c.errors)||c.errors.some(e=>typeof e!=='string')))throw new GenerationResultError('INVALID_RESPONSE');
 return data.candidates;
}
export function generationFailureMessage(error){
 const {code,stage}=normalizeGenerationFailure(error instanceof GenerationResultError?error.code:'CLIENT_ERROR',0,error?.stage);
 const messages={EMPTY_ACTUAL:EMPTY_ACTIVITY_MESSAGE,INVALID_INPUT:'실제 활동·단계별 개수와 입력 길이·보관 한도를 확인해 주세요.',INPUT_TOO_LARGE:'AI 요청 크기를 초과했습니다. 입력 길이와 기존 문장 수를 확인해 주세요.',LIMIT:'호출 또는 동시 작업 한도에 도달했습니다.',PROVIDER_BUDGET:'공유 AI 호출 한도에 도달했습니다.',PROVIDER_RATE_LIMIT:'AI 제공사의 호출 한도에 도달했습니다.',LIMIT_SERVICE:'호출 한도 서비스에 연결하지 못했습니다.',SHARED_STOP:'AI 생성이 일시 중지되었습니다.',DISABLED:'AI 연결이 비활성 상태입니다.',PROVIDER_UNAVAILABLE:'AI가 잠시 응답하지 않습니다. 잠시 후 다시 시도해 주세요.',TIMEOUT:'생성·검증 대기 시간이 초과되었습니다.',CANCELLED:'생성을 취소했습니다.',NETWORK:'서버에 연결하지 못했습니다. 연결 상태를 확인해 주세요.',COUNT_MISMATCH:'요청한 후보 수와 응답 수가 다릅니다.',DISTRIBUTION_MISMATCH:'요청한 평가 단계와 응답 분포가 다릅니다.',INVALID_RESPONSE:'서버 응답 형식을 확인할 수 없습니다.',INVALID_AI_RESPONSE:'AI 생성·독립 검토 결과를 확인할 수 없습니다.'};
 Object.assign(messages,{PROVIDER_REQUEST_REJECTED:'AI 제공사가 요청을 거절했습니다(HTTP 400).',PROVIDER_FORBIDDEN:'AI 제공사 접근이 거부됐습니다(HTTP 403).',PROVIDER_HTTP:'AI 제공사 요청을 처리하지 못했습니다.',RESPONSE_JSON_ERROR:'AI 응답의 JSON 형식을 확인할 수 없습니다.',RESPONSE_SCHEMA_ERROR:'AI 응답이 필수 검토·응답 규칙을 충족하지 않습니다.',REVIEW_INCOMPLETE:'모든 후보의 독립 검토 결과가 도착하지 않았습니다.',SAFETY_BLOCK:'AI 제공사가 응답을 제한했습니다.',INCOMPLETE_RESPONSE:'AI 응답이 끝까지 완료되지 않았습니다.',CALL_LIMIT:'이번 요청의 AI 호출 상한에 도달했습니다.',REQUEST_BUILD_ERROR:'AI 요청을 구성하지 못했습니다.'});
 const message=messages[code]||(error?.http===413?messages.INPUT_TOO_LARGE:error?.http===429?messages.LIMIT:'AI 생성·독립 검토를 완료하지 못했습니다.');
 const prefix=stage==='review'?'문장 생성 후 AI 독립 검토 요청을 처리하지 못했습니다. ':stage==='generation'?'AI 문장 생성을 완료하지 못했습니다. ':'';
 return `${prefix}${message}${Number.isFinite(error?.retryAfter)?` ${error.retryAfter}초 후 다시 시도해 주세요.`:''} 이번 후보는 추가되지 않았고 기존 작업은 보존됐습니다. [${stage?stage+'/':''}${code}]`;
}
