import {EMPTY_ACTIVITY_MESSAGE} from '../activity.mjs';
import {GenerationResultError,normalizeGenerationFailure,normalizeGenerationStage,generationFailureMessage} from '../generation-result.mjs';
import {isIP} from 'node:net';
import {generateBatch} from '../generation.mjs';
import {readGenerationInput} from './local-ai.mjs';
import {createGeminiProvider,GeminiError,buildGeminiRequest} from './gemini.mjs';
import {createPublicLimiter} from './public-limits.mjs';

export const PUBLIC_ORIGIN='https://pyeoneo-studio.vercel.app';
export const PUBLIC_TIMEOUT_MS=270000;
export function waitForRetry(ms,signal){
 signal.throwIfAborted();
 return new Promise((resolve,reject)=>{
  const done=()=>{signal.removeEventListener('abort',abort);resolve();};
  const timer=setTimeout(done,ms);
  const abort=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);reject(signal.reason);};
  signal.addEventListener('abort',abort,{once:true});
 });
}
export function publicAiEnabled(env=process.env){
 // Google Free API/model/infra preflight must precede VERIFIED; public E2E follows activation.
 return env.PUBLIC_AI_ENABLED==='true'&&env.PUBLIC_AI_VERIFIED==='true'
  &&env.VERCEL==='1'&&env.VERCEL_ENV==='production'
  &&Boolean(env.PYEONEO_GEMINI_API_KEY?.trim())
  &&/^https:\/\/[a-zA-Z0-9-]+\.upstash\.io\/?$/.test(env.PUBLIC_AI_REDIS_URL||'')
  &&Boolean(env.PYEONEO_AI_REDIS_TOKEN?.trim())&&(env.PUBLIC_AI_LIMIT_SALT?.length||0)>=32;
}
export function allowedPublicRequest(req){
 return req.headers.get('origin')===PUBLIC_ORIGIN
  &&new URL(req.url).host===new URL(PUBLIC_ORIGIN).host
  &&req.headers.get('host')===new URL(PUBLIC_ORIGIN).host;
}
export function createPublicAiHandler({env=process.env,providerFactory=createGeminiProvider,limiterFactory=createPublicLimiter,timeoutMs=PUBLIC_TIMEOUT_MS,wait=waitForRetry,random=Math.random,now=Date.now}={}){
 const reply=(data,status=200,retryAfter=60)=>Response.json(data.code?{...data,...normalizeGenerationFailure(data.code,0,data.stage)}:data,{status,headers:{'Cache-Control':'no-store',...([429,503].includes(status)?{'Retry-After':String(retryAfter)}:{})}});
 return async req=>{
  if(!publicAiEnabled(env))return reply({error:'AI 연결이 비활성 상태입니다. 입력과 기존 후보는 유지됩니다.',code:'DISABLED'},503);
  if(!allowedPublicRequest(req))return reply({error:'공개 작업 화면에서 요청하세요.',code:'ORIGIN'},403);
  // Vercel replaces this header with the direct client's IP; never trust a client cookie as quota identity.
  const address=req.headers.get('x-vercel-forwarded-for');
  if(!address||!isIP(address))return reply({error:'요청 주소를 확인할 수 없습니다.',code:'CLIENT_ADDRESS'},403);
  let input;
  try{input=await readGenerationInput(req);}catch(e){return reply({error:e.code==='EMPTY_ACTUAL'?EMPTY_ACTIVITY_MESSAGE:'실제 활동(1~4,000자)·선택 예시(최대 2,000자)·단계별 개수(합계 1~24)·보관 한도(120)와 입력 크기를 확인하세요.',code:e.code==='EMPTY_ACTUAL'?'EMPTY_ACTUAL':'INVALID_INPUT'},e.code==='INPUT_TOO_LARGE'?413:400);}
  let lease,limiter;
  try{limiter=limiterFactory(env);lease=await limiter.acquire(address);}catch(e){return reply({error:e.code==='SHARED_STOP'?'AI 생성이 일시 중지되었습니다. 입력과 기존 후보는 유지됩니다.':'호출 한도 서비스에 연결하지 못했습니다. 후보는 추가되지 않았습니다.',code:e.code==='SHARED_STOP'?'SHARED_STOP':'LIMIT_SERVICE'},503);}
  if(!lease)return reply({error:'호출 한도 또는 동시 작업 한도에 도달했습니다. 잠시 후 다시 시도하세요.',code:'LIMIT'},429);
  const signal=AbortSignal.any([req.signal,AbortSignal.timeout(timeoutMs)]);
  const deadline=now()+timeoutMs;
  let response,provider,failure=null,cleanupCode=null,stage='generation';const started=performance.now();
  try{
   provider=providerFactory({apiKey:env.PYEONEO_GEMINI_API_KEY,maxCalls:3,timeoutMs:Math.min(180000,timeoutMs),signal});
   let calls=0,retries=0;
   const checkLease=async()=>{
    signal.throwIfAborted();let allowed;
    try{allowed=await lease.check();}catch{throw new GeminiError('LIMIT_SERVICE');}
    if(!allowed)throw new GeminiError('SHARED_STOP');
   };
   const guarded={setStage:next=>{stage=normalizeGenerationStage(next);},complete:async(...args)=>{
    stage=normalizeGenerationStage(args[2]?.stage);
    // The same failed stage is repeated; generateBatch retains any completed generation.
    let retryAttempt=false;
    for(;;){
     await checkLease();if(calls>=3)throw new GeminiError('CALL_LIMIT');
     // Build once: quota reservation and fetch share identical final bytes/context.
     const preparedRequest=buildGeminiRequest(...args);
     let permit;try{permit=await limiter.reserveProvider(preparedRequest.bytes);}catch{throw new GeminiError('LIMIT_SERVICE');}
     if(!permit.allowed)throw new GeminiError(permit.stopped?'SHARED_STOP':'PROVIDER_BUDGET',0,permit.retryAfter);
     signal.throwIfAborted();calls++;
     try{return await provider.complete(args[0],args[1],{...args[2],retryAttempt},preparedRequest);}
     catch(e){
      if(!(e instanceof GeminiError)||e.status!==503||retries>=1||calls>=3)throw e;
      const delay=e.retryAfter===null?1000+Math.floor(random()*1001):Math.ceil(e.retryAfter*1000);
      if(!Number.isFinite(delay)||delay<0||delay+1000>=deadline-now())throw e;
      retries++;retryAttempt=true;
      // Poll the authoritative stop/lease while waiting; never reserve an unsent retry.
      let remaining=delay;
      do{await checkLease();const chunk=Math.min(1000,remaining);if(chunk)await wait(chunk,signal);remaining-=chunk;}while(remaining>0);
     }
    }
   }};
   const result=await generateBatch(guarded,input);signal.throwIfAborted();
   // Return only validated candidate fields, never upstream diagnostics or request metadata.
   const body=JSON.stringify(result);
   if(Buffer.byteLength(body)>256*1024)throw new GeminiError('RESPONSE_TOO_LARGE');
   response=reply(result);
  }catch(e){
   const normalized=normalizeGenerationFailure(signal.aborted?(signal.reason?.name==='TimeoutError'?'TIMEOUT':'CANCELLED'):e instanceof GeminiError||e instanceof GenerationResultError?e.code:'INVALID_AI_RESPONSE',e instanceof GeminiError?e.status:0,e?.stage??stage);
   const {code}=normalized;failure={...normalized,status:e instanceof GeminiError?e.status:0};
   if(Number.isSafeInteger(e?.requestBytes))failure.requestBytes=e.requestBytes;
   if(code==='PROVIDER_RATE_LIMIT'){try{await limiter.cooldown(e.retryAfter);}catch{cleanupCode='LIMIT_SERVICE';response=reply({error:generationFailureMessage(new GenerationResultError('LIMIT_SERVICE',null,normalized.stage)),code:'LIMIT_SERVICE',stage:normalized.stage},503);}}
   const unavailable=e instanceof GeminiError&&e.status===503;
   const status=code==='TIMEOUT'?504:code==='CANCELLED'?499:['PROVIDER_BUDGET','PROVIDER_RATE_LIMIT'].includes(code)?429:['LIMIT_SERVICE','SHARED_STOP'].includes(code)||unavailable?503:code==='INPUT_TOO_LARGE'?413:502;
   response??=reply({error:generationFailureMessage(new GenerationResultError(code,null,normalized.stage)),...normalized},status,Math.max(1,Math.ceil(e.retryAfter??(unavailable?2:60))));
  }finally{
   // A failed release leaves the shared lease to expire; it never opens a local fallback slot.
   try{await lease.release();}catch{cleanupCode='LIMIT_SERVICE';response=reply({error:generationFailureMessage(new GenerationResultError('LIMIT_SERVICE',null,stage)),code:'LIMIT_SERVICE',stage},503);}
  }
  // Only sanitized counters/timing; no prompts, candidates, addresses, or API bodies.
  console.info(JSON.stringify({publicAi:{provider:'gemini',calls:provider?.metrics||[],failure,cleanupCode,durationMs:Math.round(performance.now()-started),status:response?.status}}));
  return response;
 };
}
