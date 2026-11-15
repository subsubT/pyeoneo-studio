// Server only. Direct Google REST; no SDK retries, fallback, or client-selected model.
import {z} from 'zod';
import {reviewOutputSchema,reviewTransportSchema,REVIEW_SCHEMA_VERSION,parseReviewOutput} from '../review-schema.mjs';
import {GenerationResultError,normalizeGenerationFailure,normalizeGenerationStage} from '../generation-result.mjs';
export const GEMINI_MODEL='gemini-3.5-flash-lite';
export const GEMINI_ENDPOINT=`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}`;
export const MAX_GEMINI_REQUEST_BYTES=40000; // Preserve the existing transport input ceiling.
const MAX_RESPONSE_BYTES=256*1024;
export class GeminiError extends Error{
 constructor(code,status=0,retryAfter=null){super(`Gemini request failed (${code})`);this.name='GeminiError';this.code=code;this.status=status;this.retryAfter=retryAfter;}
}
// Fixed categories only: never log an upstream error body or request data.
const PROVIDER_STATUSES=new Set(['INVALID_ARGUMENT','PERMISSION_DENIED','UNAUTHENTICATED','RESOURCE_EXHAUSTED','UNAVAILABLE','DEADLINE_EXCEEDED','INTERNAL','UNKNOWN','NOT_FOUND','FAILED_PRECONDITION','OUT_OF_RANGE','CANCELLED','ABORTED','ALREADY_EXISTS','UNIMPLEMENTED','DATA_LOSS']);
const SCHEMA_FIELDS=new Set(['reviews','index','pass','issues','repetitions','scope','peerIndex','candidates','text','levelId','evidence','reasons']);
function allowedViolationField(field){
 if(typeof field!=='string')return null;
 const path=field.replace(/\[\d+\]/g,'[]').replace(/^generation_config\./,'generationConfig.').replace(/^generationConfig\.response_json_schema/,'generationConfig.responseJsonSchema').replace(/^generationConfig\.response_schema/,'generationConfig.responseSchema').replace(/^generationConfig\.max_output_tokens$/,'generationConfig.maxOutputTokens');
 if(['generationConfig.responseJsonSchema','generationConfig.responseSchema','generationConfig.maxOutputTokens','generationConfig.thinkingConfig'].includes(path))return path;
 // Accept only our declared fields and schema keywords; discard unknown paths whole.
 const parts=path.split('.');
 if(parts[0]!=='generationConfig'||!['responseJsonSchema','responseSchema'].includes(parts[1])||parts.length>20)return null;
 const keywords=new Set(['properties','items','required','type','enum','anyOf','oneOf','minItems','maxItems','minimum','maximum','minLength','maxLength','additionalProperties']);
 return parts.slice(2).every(p=>SCHEMA_FIELDS.has(p.replace(/\[\]$/,''))||keywords.has(p.replace(/\[\]$/,'')))?parts.map(p=>p.replace(/\[\]$/,'')).join('.'):null;
}
export function rejectionDiagnostics(value){
 const error=typeof value==='string'?{message:value}:value?.error??value;
 const providerStatus=PROVIDER_STATUSES.has(error?.status)?error.status:null;
 const violations=Array.isArray(error?.details)?error.details.filter(d=>d?.['@type']==='type.googleapis.com/google.rpc.BadRequest').flatMap(d=>Array.isArray(d.fieldViolations)?d.fieldViolations:[]).slice(0,32):[];
 const fields=[...new Set(violations.map(v=>allowedViolationField(v?.field)).filter(Boolean))].slice(0,8);
 // Analyse bounded text in memory only. A schema reference AND a specific cost
 // symptom are required; a lone "large", "nesting", or "branch" is insufficient.
 const messages=[error?.message,...violations.map(v=>v?.description)].filter(m=>typeof m==='string').map(m=>m.slice(0,8000));
 const schemaField=fields.some(f=>f.startsWith('generationConfig.response'));
 let schema=false,complexity=false,token=false;
 for(const message of messages){
  const context=/\b(?:response[_ ]?json[_ ]?schema|response[_ ]?schema|json schema|schema)\b/i.test(message)||schemaField;
  schema ||= context;
  complexity ||= context&&(/too many (?:states|constraints|branches)|(?:schema|constraints?).{0,60}(?:too complex|exceed.{0,30}complexity)|(?:too complex|complexity limit).{0,60}schema|nesting.{0,30}(?:too deep|exceed)|branching.{0,30}(?:too many|exceed)/i.test(message));
  token ||= /\b(?:maxOutputTokens|max_output_tokens)\b|output token.{0,30}(?:limit|exceed)/i.test(message);
 }
 const category=complexity?'SCHEMA_COMPLEXITY':schema||schemaField?'SCHEMA_ARGUMENT':token||fields.includes('generationConfig.maxOutputTokens')?'TOKEN_ARGUMENT':providerStatus==='INVALID_ARGUMENT'?'INVALID_ARGUMENT':messages.length?'OTHER':'UNSPECIFIED';
 return {category,providerStatus,fields};
}
export function rejectionCategory(value){return rejectionDiagnostics(value).category;}
export function schemaStructureStats(schema){
 const stats={nodes:0,properties:0,maxDepth:0,unionBranches:0,arrayBounds:0,numericBounds:0};
 function visit(node,depth){
  if(!node||typeof node!=='object')return;
  stats.nodes++;stats.maxDepth=Math.max(stats.maxDepth,depth);
  stats.properties+=Object.keys(node.properties||{}).length;
  stats.unionBranches+=(node.anyOf?.length||0)+(node.oneOf?.length||0);
  stats.arrayBounds+=Number('minItems'in node)+Number('maxItems'in node);
  stats.numericBounds+=Number('minimum'in node)+Number('maximum'in node);
  for(const value of Object.values(node))if(Array.isArray(value)){for(const child of value)visit(child,depth+1);}else visit(value,depth+1);
 }
 visit(schema,0);return stats;
}
export function retryAfterSeconds(raw,now=Date.now()){
 if(typeof raw!=='string'||!raw.trim())return null;
 if(/^\d+(?:\.\d+)?$/.test(raw.trim()))return Number.isFinite(Number(raw))?Number(raw):null;
 const time=Date.parse(raw);return Number.isFinite(time)?Math.max(0,(time-now)/1000):null;
}
const candidate=z.object({text:z.string().max(1200),levelId:z.string().min(1).max(100),evidence:z.array(z.string().min(1).max(4000)).length(1)}).strict();
export function geminiOutputSchema(stage,count,existing=[]){
 if(stage==='generation'&&Number.isInteger(count)&&count>0&&count<=24)return z.object({candidates:z.array(candidate).length(count),reasons:z.array(z.string()).length(0)}).strict();
 if(stage==='review'&&Number.isInteger(count)&&count>0&&count<=24)return reviewOutputSchema(count,existing);
 throw new GeminiError('INVALID_STAGE');
}
export function buildGeminiRequest(system,input,options={}){
 const count=options.stage==='generation'?input.levels?.reduce((n,l)=>n+l.count,0):input.candidates?.length;
 const initialValidationSchema=geminiOutputSchema(options.stage,count,input.existing||[]);
 const transportSchema=options.stage==='review'?reviewTransportSchema:z.toJSONSchema(initialValidationSchema);
 // Optional comparisons may shrink; actual, all candidates and slot assignments
 // are never truncated. Both the limiter and provider use this same payload.
 const packedInput={...input,existing:[...(input.existing||[])]};
 const stageInstruction=options.stage==='generation'?'\n앱 source가 선택한 원본 example(있으면) 또는 actual(예시 없으면)을 변형한다. exampleWorkingCopy/actualWorkingCopy는 교정용이며 evidence는 선택 원본의 정확한 부분 문자열 한 개다. example 핵심·조건·수준·직접 수행/참여를 보존하고 actual에만 있는 별도 활동을 덧붙이지 않는다. actual이 포괄적이라는 이유로 예시 핵심을 빼지 말고 actual의 명시적 부정·미실시·도움·어려움·수량에는 모순되지 않는 초안을 쓴다. 명시적 충돌은 독립 검토 대상이며 전체 거절·빈 응답으로 대체하지 않는다. levels count/합계/levelId를 정확히 지키고 reasons=[]로 반환한다. expressionPlan에 따라 시작점·어순·조건 위치·연결·동사 등가 표현을 조합하고 배치 전체를 비교한다. 표현 차이만을 위해 사실을 추가하지 않으며 내부 계획/출처 필드는 출력하지 않는다. 단계 설명은 새 수행의 근거가 아니다.':'\n현재 후보 text를 고치지 않고 전부 독립 검토한다. 앱 source가 선택한 원본 example(없으면 actual)의 핵심·조건·수준·직접 수행/참여 보존과 actual의 명시적 모순을 각각 검사한다. actual이 포괄적이거나 예시의 같은 구체 문구가 없다는 이유로 거부하지 않는다. actual에만 있는 별도 활동 누락은 오류가 아니다. 선택 원문에도 없는 새 내용·칭찬·조건은 지적한다. 명시적 충돌로 예시 핵심이 달라졌으면 actual과 양립하는 초안이어도 구체적 issues를 남긴다. 충돌을 숨기거나 PASS를 강제하지 않는다. 표현 반복은 repetitions에만 기록한다. 모든 index를 정확히 한 번, 거부 시 pass=false와 구체적인 issues를 반환한다. 명사형·자연스러움을 검사하고 핵심·모순·문체 문제가 없으면 pass=true, issues=[]다.';
 const payload={systemInstruction:{parts:[{text:system+stageInstruction}]},contents:[{role:'user',parts:[{text:JSON.stringify(packedInput)}]}],generationConfig:{candidateCount:1,maxOutputTokens:Math.min(6000,Math.max(32,options.maxTokens??6000)),responseMimeType:'application/json',responseJsonSchema:transportSchema,thinkingConfig:{thinkingLevel:'LOW',includeThoughts:false}}};
 let body=JSON.stringify(payload),bytes=Buffer.byteLength(body);
 while(bytes>MAX_GEMINI_REQUEST_BYTES&&packedInput.existing.length){
  packedInput.existing.pop();payload.contents[0].parts[0].text=JSON.stringify(packedInput);
  body=JSON.stringify(payload);bytes=Buffer.byteLength(body);
 }
 if(bytes>MAX_GEMINI_REQUEST_BYTES){const error=new GeminiError('INPUT_TOO_LARGE');error.requestBytes=bytes;throw error;}
 const validationSchema=options.stage==='review'?reviewOutputSchema(count,packedInput.existing):initialValidationSchema;
 return {payload,body,bytes,transportSchema,validationSchema,count,existing:packedInput.existing,schemaVersion:options.stage==='review'?REVIEW_SCHEMA_VERSION:'generation-v1',schemaStats:schemaStructureStats(transportSchema)};
}
export async function boundedGeminiJson(response){
 if(!response.body)throw new GeminiError('EMPTY_RESPONSE');
 const reader=response.body.getReader(),parts=[];let bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>MAX_RESPONSE_BYTES)throw new GeminiError('RESPONSE_TOO_LARGE');parts.push(value);}}
 finally{await reader.cancel().catch(()=>{});}
 try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw new GeminiError('INVALID_JSON');}
}
export function createGeminiProvider({apiKey=process.env.PYEONEO_GEMINI_API_KEY,fetchImpl=fetch,timeoutMs=180000,maxCalls=3,signal}={}){
 if(typeof window!=='undefined')throw new GeminiError('SERVER_ONLY');
 if(typeof apiKey!=='string'||!apiKey.trim())throw new GeminiError('MISSING_KEY');
 const metrics=[];let calls=0;
 return {model:GEMINI_MODEL,get metrics(){return metrics.map(m=>({...m}));},async complete(system,input,options={},preparedRequest){
  const metric={call:null,stage:normalizeGenerationStage(options.stage),retry:options.retryAttempt===true},start=performance.now();
  let requestSignal,phase='payload';
  try{
   signal?.throwIfAborted();
   if(calls>=Math.min(3,maxCalls))throw new GeminiError('CALL_LIMIT');
   // The public limiter can pass the exact built payload it reserved.
   const {body,bytes,validationSchema,count,existing,schemaVersion,schemaStats}=preparedRequest??buildGeminiRequest(system,input,options);
   Object.assign(metric,{requestBytes:bytes,schemaVersion,schemaStats});
   if(options.stage==='review')options.onReviewContext?.(existing);
   requestSignal=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(timeoutMs)]);
   metric.call=++calls;
   phase='request';
   const response=await fetchImpl(`${GEMINI_ENDPOINT}:generateContent`,{method:'POST',redirect:'error',signal:requestSignal,headers:{'x-goog-api-key':apiKey,'Content-Type':'application/json'},body});
   phase='response';
   metric.status=response.status;
   metric.headersMs=Math.round(performance.now()-start);
   if(!response.ok){
    const seconds=retryAfterSeconds(response.headers.get('retry-after'));
    try{const diagnostic=rejectionDiagnostics(await boundedGeminiJson(response));metric.rejectionCategory=diagnostic.category;metric.providerStatus=diagnostic.providerStatus;metric.violationFields=diagnostic.fields;}catch{metric.rejectionCategory='UNSPECIFIED';metric.providerStatus=null;}
    throw new GeminiError(response.status===429?'PROVIDER_RATE_LIMIT':response.status===403?'PROVIDER_FORBIDDEN':'PROVIDER_HTTP',response.status,response.status===429?Math.max(60,Math.ceil(seconds??60)):seconds);
   }
   const json=await boundedGeminiJson(response);requestSignal.throwIfAborted();
   if(!json||typeof json!=='object')throw new GeminiError('INVALID_RESPONSE');
   if(json.promptFeedback?.blockReason)throw new GeminiError('SAFETY_BLOCK');
   const choice=json.candidates?.[0];
   if(choice?.finishReason!=='STOP')throw new GeminiError(['SAFETY','RECITATION','BLOCKLIST','PROHIBITED_CONTENT','SPII'].includes(choice?.finishReason)?'SAFETY_BLOCK':'INCOMPLETE_RESPONSE');
   if(json.candidates.length!==1)throw new GeminiError('INVALID_RESPONSE');
   const parts=choice.content?.parts;
   if(!Array.isArray(parts)||parts.some(p=>!p||p.thought||typeof p.text!=='string'))throw new GeminiError('INVALID_SCHEMA');
   const content=parts.map(p=>p.text).join('');
   if(!content.trim())throw new GeminiError('EMPTY_CONTENT');
   if(content.includes(apiKey))throw new GeminiError('UNSAFE_RESPONSE');
   let parsed;try{parsed=JSON.parse(content);}catch{throw new GeminiError('INVALID_CONTENT_JSON');}
   if(options.stage==='review'){
    const checked=parseReviewOutput(parsed,count,existing);metric.ok=true;return checked;
   }
   if(Array.isArray(parsed?.candidates)&&parsed.candidates.length!==count)throw new GeminiError('COUNT_MISMATCH');
   const checked=validationSchema.safeParse(parsed);if(!checked.success)throw new GeminiError('INVALID_SCHEMA');
   metric.ok=true;return checked.data;
  }catch(e){
   const aborted=requestSignal?.aborted?requestSignal:signal?.aborted?signal:null;
   const failure=normalizeGenerationFailure(aborted?(aborted.reason?.name==='TimeoutError'?'TIMEOUT':'CANCELLED'):e instanceof GeminiError||e instanceof GenerationResultError?e.code:phase==='request'?'NETWORK':phase==='response'?'RESPONSE_SCHEMA_ERROR':'INVALID_AI_RESPONSE',e?.status,options.stage);
   const error=new GeminiError(failure.code,e instanceof GeminiError?e.status:0,e instanceof GeminiError?e.retryAfter:null);error.stage=failure.stage;
   metric.ok=false;metric.code=error.code;metric.status??=error.status;
   if(Number.isSafeInteger(e?.requestBytes))metric.requestBytes=e.requestBytes;
   throw error;
  }finally{metric.durationMs=Math.round(performance.now()-start);metrics.push(metric);}
 }};
}
