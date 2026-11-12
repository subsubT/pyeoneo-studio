// Server only. Direct Google REST; no SDK retries, fallback, or client-selected model.
import {z} from 'zod';
export const GEMINI_MODEL='gemini-3.5-flash-lite';
export const GEMINI_ENDPOINT=`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}`;
export const MAX_GEMINI_REQUEST_BYTES=40000; // Preserve the existing transport input ceiling.
const MAX_RESPONSE_BYTES=256*1024;
export class GeminiError extends Error{
 constructor(code,status=0,retryAfter=null){super(`Gemini request failed (${code})`);this.name='GeminiError';this.code=code;this.status=status;this.retryAfter=retryAfter;}
}
// Fixed categories only: never log an upstream error body or request data.
export function rejectionCategory(message){
 if(typeof message!=='string')return 'UNSPECIFIED';
 if(/schema.*(?:complex|large)|complex.*schema|too many states|nesting/i.test(message))return 'SCHEMA_COMPLEXITY';
 if(/schema|responseJsonSchema|maxItems|minItems/i.test(message))return 'SCHEMA_ARGUMENT';
 if(/token|maxOutput|output.*limit/i.test(message))return 'TOKEN_ARGUMENT';
 return 'OTHER';
}
export function retryAfterSeconds(raw,now=Date.now()){
 if(typeof raw!=='string'||!raw.trim())return null;
 if(/^\d+(?:\.\d+)?$/.test(raw.trim()))return Number(raw);
 const time=Date.parse(raw);return Number.isFinite(time)?Math.max(0,(time-now)/1000):null;
}
const candidate=z.object({text:z.string().max(1200),levelId:z.string().min(1).max(100),evidence:z.array(z.string().min(1).max(4000)).min(1).max(20)}).strict();
export function geminiOutputSchema(stage,count){
 if(stage==='generation')return z.object({candidates:z.union([z.array(candidate).length(count),z.array(candidate).length(0)]),reasons:z.array(z.string().max(500)).max(12)}).strict();
 if(stage==='review'&&Number.isInteger(count)&&count>0&&count<=24)return z.object({reviews:z.array(z.union([z.object({index:z.number().int().min(0).max(count-1),pass:z.literal(true),issues:z.array(z.string().max(500)).length(0)}).strict(),z.object({index:z.number().int().min(0).max(count-1),pass:z.literal(false),issues:z.array(z.string().min(1).max(500)).min(1).max(10)}).strict()])).length(count)}).strict();
 throw new GeminiError('INVALID_STAGE');
}
export function buildGeminiRequest(system,input,options={}){
 const schema=geminiOutputSchema(options.stage,options.stage==='generation'?input.levels?.reduce((n,l)=>n+l.count,0):input.candidates?.length);
 const stageInstruction=options.stage==='generation'?'\nlevels의 각 count와 합계를 정확히 지켜 한 배치로 반환한다. 0개 단계는 제외한다. levelId를 정확히 사용한다. 어순·조사·연결 표현만 바꾼 문장도 허용한다. 개수를 늘리려고 사실을 보태거나 원문을 복제하지 않는다. 핵심 활동·확인된 성취를 보존한다. 사실 부족이면 candidates를 비우고 reasons로 안내한다.':'\n각 index를 독립적으로 판단한다. actual의 모든 핵심 활동과 확인된 성취를 그대로 보존하고 새로운 사실이 없으며 자연스러운 문장은 pass=true, issues=[]이다. 거부할 때는 pass=false와 적어도 한 개의 구체적인 이유가 필요하다. 어떤 핵심 활동·확인된 성취가 빠졌거나 어떤 사실이 추가되었는지를 판단한다. 단순 어순·동의어·종결의 차이는 사실이 같다면 거부 이유가 아니다. 사실이 부족하거나 불확실하면 거부한다.';
 const payload={systemInstruction:{parts:[{text:system+stageInstruction}]},contents:[{role:'user',parts:[{text:JSON.stringify(input)}]}],generationConfig:{candidateCount:1,maxOutputTokens:Math.min(12000,Math.max(32,options.maxTokens??6000)),responseMimeType:'application/json',responseJsonSchema:z.toJSONSchema(schema),thinkingConfig:{thinkingLevel:'LOW',includeThoughts:false}}};
 const body=JSON.stringify(payload),bytes=Buffer.byteLength(body);
 if(bytes>MAX_GEMINI_REQUEST_BYTES)throw new GeminiError('INPUT_TOO_LARGE');
 return {payload,body,bytes,schema};
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
 return {model:GEMINI_MODEL,get metrics(){return metrics.map(m=>({...m}));},async complete(system,input,options={}){
  signal?.throwIfAborted();
  if(calls>=Math.min(3,maxCalls))throw new GeminiError('CALL_LIMIT');
  const {body,bytes,schema}=buildGeminiRequest(system,input,options);
  const requestSignal=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(timeoutMs)]);
  const metric={call:++calls,stage:options.stage,retry:options.retryAttempt===true,requestedModel:GEMINI_MODEL,requestBytes:bytes,responseModel:null,inputTokens:null,outputTokens:null,thoughtTokens:null,totalTokens:null},start=performance.now();
  try{
   const response=await fetchImpl(`${GEMINI_ENDPOINT}:generateContent`,{method:'POST',redirect:'error',signal:requestSignal,headers:{'x-goog-api-key':apiKey,'Content-Type':'application/json'},body});
   metric.headersMs=Math.round(performance.now()-start);
   if(!response.ok){
    const seconds=retryAfterSeconds(response.headers.get('retry-after'));
    if(response.status===400){try{const rejected=await boundedGeminiJson(response);metric.rejectionCategory=rejectionCategory(rejected.error?.message);}catch{metric.rejectionCategory='UNSPECIFIED';}}else await response.body?.cancel();throw new GeminiError(response.status===429?'PROVIDER_RATE_LIMIT':response.status===403?'PROVIDER_FORBIDDEN':'PROVIDER_HTTP',response.status,response.status===429?Math.max(60,Math.ceil(seconds??60)):seconds);
   }
   const json=await boundedGeminiJson(response);requestSignal.throwIfAborted();
   if(typeof json.modelVersion==='string'&&!json.modelVersion.includes(apiKey)&&/^[a-zA-Z0-9._/-]{1,120}$/.test(json.modelVersion))metric.responseModel=json.modelVersion;
   for(const [dest,source]of Object.entries({inputTokens:'promptTokenCount',outputTokens:'candidatesTokenCount',thoughtTokens:'thoughtsTokenCount',totalTokens:'totalTokenCount'}))if(Number.isSafeInteger(json.usageMetadata?.[source])&&json.usageMetadata[source]>=0)metric[dest]=json.usageMetadata[source];
   if(json.promptFeedback?.blockReason)throw new GeminiError('SAFETY_BLOCK');
   const choice=json.candidates?.[0];metric.finishReason=typeof choice?.finishReason==='string'&&/^[A-Z_]{1,60}$/.test(choice.finishReason)?choice.finishReason:null;
   if(choice?.finishReason!=='STOP')throw new GeminiError(['SAFETY','RECITATION','BLOCKLIST','PROHIBITED_CONTENT','SPII'].includes(choice?.finishReason)?'SAFETY_BLOCK':'INCOMPLETE_RESPONSE');
   if(json.candidates.length!==1)throw new GeminiError('INVALID_RESPONSE');
   const parts=choice.content?.parts;
   if(!Array.isArray(parts)||parts.some(p=>p.thought||typeof p.text!=='string'))throw new GeminiError('INVALID_RESPONSE');
   const content=parts.map(p=>p.text).join('');
   if(!content.trim())throw new GeminiError('EMPTY_CONTENT');
   if(content.includes(apiKey))throw new GeminiError('UNSAFE_RESPONSE');
   let parsed;try{parsed=JSON.parse(content);}catch{throw new GeminiError('INVALID_CONTENT_JSON');}
   const checked=schema.safeParse(parsed);if(!checked.success)throw new GeminiError('INVALID_SCHEMA');
   metric.ok=true;return checked.data;
  }catch(e){
   const error=e instanceof GeminiError?e:new GeminiError(requestSignal.aborted?(requestSignal.reason?.name==='TimeoutError'?'TIMEOUT':'CANCELLED'):'NETWORK');
   metric.ok=false;metric.code=error.code;metric.status=error.status;throw error;
  }finally{metric.durationMs=Math.round(performance.now()-start);metrics.push(metric);}
 }};
}
