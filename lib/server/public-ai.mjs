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
 const reply=(data,status=200,retryAfter=60)=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...([429,503].includes(status)?{'Retry-After':String(retryAfter)}:{})}});
 return async req=>{
  if(!publicAiEnabled(env))return reply({error:'AI 연결이 비활성 상태입니다. 입력과 기존 후보는 유지됩니다.',code:'DISABLED'},503);
  if(!allowedPublicRequest(req))return reply({error:'공개 작업 화면에서 요청하세요.',code:'ORIGIN'},403);
  // Vercel replaces this header with the direct client's IP; never trust a client cookie as quota identity.
  const address=req.headers.get('x-vercel-forwarded-for');
  if(!address||!isIP(address))return reply({error:'요청 주소를 확인할 수 없습니다.',code:'CLIENT_ADDRESS'},403);
  let input;
  try{input=await readGenerationInput(req);}catch(e){return reply({error:'실제 활동(8~4,000자)·예시(5~2,000자)·단계별 개수(합계 1~24)·보관 한도(120)와 입력 크기를 확인하세요.',code:'INVALID_INPUT'},e.code==='INPUT_TOO_LARGE'?413:400);}
  let lease,limiter;
  try{limiter=limiterFactory(env);lease=await limiter.acquire(address);}catch(e){return reply({error:e.code==='SHARED_STOP'?'AI 생성이 일시 중지되었습니다. 입력과 기존 후보는 유지됩니다.':'호출 한도 서비스에 연결하지 못했습니다. 후보는 추가되지 않았습니다.',code:e.code==='SHARED_STOP'?'SHARED_STOP':'LIMIT_SERVICE'},503);}
  if(!lease)return reply({error:'호출 한도 또는 동시 작업 한도에 도달했습니다. 잠시 후 다시 시도하세요.',code:'LIMIT'},429);
  const signal=AbortSignal.any([req.signal,AbortSignal.timeout(timeoutMs)]);
  const deadline=now()+timeoutMs;
  let response,provider;
  try{
   provider=providerFactory({apiKey:env.PYEONEO_GEMINI_API_KEY,maxCalls:3,timeoutMs:Math.min(180000,timeoutMs),signal});
   let calls=0,retries=0;
   const checkLease=async()=>{
    signal.throwIfAborted();let allowed;
    try{allowed=await lease.check();}catch{throw new GeminiError('LIMIT_SERVICE');}
    if(!allowed)throw new GeminiError('SHARED_STOP');
   };
   const guarded={complete:async(...args)=>{
    // The same failed stage is repeated; generateBatch retains any completed generation.
    let retryAttempt=false;
    for(;;){
     await checkLease();if(calls>=3)throw new GeminiError('CALL_LIMIT');
     let permit;try{permit=await limiter.reserveProvider(buildGeminiRequest(...args).bytes);}catch(e){if(e instanceof GeminiError)throw e;throw new GeminiError('LIMIT_SERVICE');}
     if(!permit.allowed)throw new GeminiError(permit.stopped?'SHARED_STOP':'PROVIDER_BUDGET',0,permit.retryAfter);
     signal.throwIfAborted();calls++;
     try{return await provider.complete(args[0],args[1],{...args[2],retryAttempt});}
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
   const code=signal.aborted?(signal.reason?.name==='TimeoutError'?'TIMEOUT':'CANCELLED'):e instanceof GeminiError?e.code:'INVALID_AI_RESPONSE';
   if(code==='PROVIDER_RATE_LIMIT'){try{await limiter.cooldown(e.retryAfter);}catch{response=reply({error:'호출 한도 서비스에 연결하지 못했습니다. 입력과 기존 후보는 유지됩니다.',code:'LIMIT_SERVICE'},503);}}
   const unavailable=e instanceof GeminiError&&e.status===503;
   const status=code==='TIMEOUT'?504:code==='CANCELLED'?499:['PROVIDER_BUDGET','PROVIDER_RATE_LIMIT'].includes(code)?429:['LIMIT_SERVICE','SHARED_STOP'].includes(code)||unavailable?503:code==='INPUT_TOO_LARGE'?413:502;
   const message=unavailable?'AI가 잠시 응답하지 않습니다. 잠시 후 다시 시도해 주세요.':status===429?'AI 호출 한도에 도달했습니다. 요청은 접수되지 않았습니다. 잠시 후 다시 시도하세요.':code==='SHARED_STOP'?'AI 생성이 일시 중지되었습니다.':code==='TIMEOUT'?'생성·검증 시간이 초과되었습니다.':code==='INPUT_TOO_LARGE'?'AI 요청 크기를 초과했습니다. 기존 문장을 나누어 작업하세요.':'AI 생성·검증을 완료하지 못했습니다.';
   response??=reply({error:`${message} 입력과 기존 후보는 유지됩니다.`,code:unavailable?'PROVIDER_UNAVAILABLE':code},status,Math.max(1,Math.ceil(e.retryAfter??(unavailable?2:60))));
  }finally{
   // A failed release leaves the shared lease to expire; it never opens a local fallback slot.
   try{await lease.release();}catch{response=reply({error:'호출 한도 서비스에 연결하지 못했습니다. 입력과 기존 후보는 유지됩니다.',code:'LIMIT_SERVICE'},503);}
  }
  // Only sanitized counters/timing; no prompts, candidates, addresses, or API bodies.
  console.info(JSON.stringify({publicAi:{provider:'gemini',calls:provider?.metrics||[],status:response?.status}}));
  return response;
 };
}
