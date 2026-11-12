// Server only. Direct Google REST; no SDK retries, fallback, or client-selected model.
import {z} from 'zod';
export const GEMINI_MODEL='gemini-3.5-flash-lite';
export const GEMINI_ENDPOINT=`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}`;
export const MAX_GEMINI_REQUEST_BYTES=40000; // Preserve the existing transport input ceiling.
const MAX_RESPONSE_BYTES=256*1024;
export class GeminiError extends Error{
 constructor(code,status=0,retryAfter=0){super(`Gemini request failed (${code})`);this.name='GeminiError';this.code=code;this.status=status;this.retryAfter=retryAfter;}
}
const candidate=z.object({text:z.string().max(1200),evidence:z.array(z.string().min(1).max(4000)).min(1).max(20)}).strict();
export function geminiOutputSchema(stage,count){
 if(stage==='generation')return z.object({candidates:z.array(candidate).max(12),reasons:z.array(z.string().max(500)).max(12)}).strict();
 if(stage==='review'&&Number.isInteger(count)&&count>0&&count<=12)return z.object({reviews:z.array(z.object({index:z.number().int().min(0).max(count-1),pass:z.boolean(),issues:z.array(z.string().max(500)).max(10)}).strict()).length(count)}).strict();
 throw new GeminiError('INVALID_STAGE');
}
export function buildGeminiRequest(system,input,options={}){
 const schema=geminiOutputSchema(options.stage,input.candidates?.length);
 const payload={systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:JSON.stringify(input)}]}],generationConfig:{candidateCount:1,maxOutputTokens:Math.min(6000,Math.max(32,options.maxTokens??6000)),responseMimeType:'application/json',responseJsonSchema:z.toJSONSchema(schema),thinkingConfig:{thinkingLevel:'MINIMAL',includeThoughts:false}}};
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
export function createGeminiProvider({apiKey=process.env.PYEONEO_GEMINI_API_KEY,fetchImpl=fetch,timeoutMs=180000,maxCalls=2,signal}={}){
 if(typeof window!=='undefined')throw new GeminiError('SERVER_ONLY');
 if(typeof apiKey!=='string'||!apiKey.trim())throw new GeminiError('MISSING_KEY');
 const metrics=[];let calls=0;
 return {model:GEMINI_MODEL,get metrics(){return metrics.map(m=>({...m}));},async complete(system,input,options={}){
  signal?.throwIfAborted();
  if(calls>=Math.min(2,maxCalls))throw new GeminiError('CALL_LIMIT');
  const {body,bytes,schema}=buildGeminiRequest(system,input,options);
  const requestSignal=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(timeoutMs)]);
  const metric={call:++calls,stage:options.stage,requestedModel:GEMINI_MODEL,requestBytes:bytes,responseModel:null,inputTokens:null,outputTokens:null,thoughtTokens:null,totalTokens:null},start=performance.now();
  try{
   const response=await fetchImpl(`${GEMINI_ENDPOINT}:generateContent`,{method:'POST',redirect:'error',signal:requestSignal,headers:{'x-goog-api-key':apiKey,'Content-Type':'application/json'},body});
   metric.headersMs=Math.round(performance.now()-start);
   if(!response.ok){
    const raw=response.headers.get('retry-after'),seconds=Number(raw),retryAfter=Math.min(86400,Math.max(60,Number.isFinite(seconds)?seconds:Math.ceil((Date.parse(raw)-Date.now())/1000)||60));
    await response.body?.cancel();throw new GeminiError(response.status===429?'PROVIDER_RATE_LIMIT':response.status===403?'PROVIDER_FORBIDDEN':'PROVIDER_HTTP',response.status,response.status===429?retryAfter:0);
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
