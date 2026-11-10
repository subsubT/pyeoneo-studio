import {isIP} from 'node:net';
import {generateBatch} from '../generation.mjs';
import {readGenerationInput} from './local-ai.mjs';
import {createNvidiaProvider,NvidiaError} from './nvidia.mjs';
import {createPublicLimiter} from './public-limits.mjs';

export const PUBLIC_ORIGIN='https://pyeoneo-studio.vercel.app';
export const PUBLIC_TIMEOUT_MS=270000;
export function publicAiEnabled(env=process.env){
 // Entitlement/model/infra verification must precede setting VERIFIED. A key is not a license.
 return env.PUBLIC_AI_ENABLED==='true'&&env.PUBLIC_AI_VERIFIED==='true'
  &&env.VERCEL==='1'&&env.VERCEL_ENV==='production'
  &&Boolean(env.PUBLIC_NVIDIA_API_KEY?.trim())
  &&/^https:\/\/[a-zA-Z0-9-]+\.upstash\.io\/?$/.test(env.PUBLIC_AI_REDIS_URL||'')
  &&Boolean(env.PUBLIC_AI_REDIS_TOKEN?.trim())&&(env.PUBLIC_AI_LIMIT_SALT?.length||0)>=32;
}
export function allowedPublicRequest(req){
 return req.headers.get('origin')===PUBLIC_ORIGIN
  &&new URL(req.url).host===new URL(PUBLIC_ORIGIN).host
  &&req.headers.get('host')===new URL(PUBLIC_ORIGIN).host;
}
export function createPublicAiHandler({env=process.env,providerFactory=createNvidiaProvider,limiterFactory=createPublicLimiter,timeoutMs=PUBLIC_TIMEOUT_MS}={}){
 const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...(status===429?{'Retry-After':'60'}:{})}});
 return async req=>{
  if(!publicAiEnabled(env))return reply({error:'AI 연결이 비활성 상태입니다. 입력과 기존 후보는 유지됩니다.',code:'DISABLED'},503);
  if(!allowedPublicRequest(req))return reply({error:'공개 작업 화면에서 요청하세요.',code:'ORIGIN'},403);
  // Vercel replaces this header with the direct client's IP; never trust a client cookie as quota identity.
  const address=req.headers.get('x-vercel-forwarded-for');
  if(!address||!isIP(address))return reply({error:'요청 주소를 확인할 수 없습니다.',code:'CLIENT_ADDRESS'},403);
  let input;
  try{input=await readGenerationInput(req);}catch(e){return reply({error:'실제 활동(8~4,000자)·예시(5~2,000자)·수준과 입력 크기를 확인하세요.',code:'INVALID_INPUT'},e.code==='INPUT_TOO_LARGE'?413:400);}
  let lease;
  try{lease=await limiterFactory(env).acquire(address);}catch{return reply({error:'호출 한도 서비스에 연결하지 못했습니다. 후보는 추가되지 않았습니다.',code:'LIMIT_SERVICE'},503);}
  if(!lease)return reply({error:'호출 한도 또는 동시 작업 한도에 도달했습니다. 잠시 후 다시 시도하세요.',code:'LIMIT'},429);
  const signal=AbortSignal.any([req.signal,AbortSignal.timeout(timeoutMs)]);
  let response;
  try{
   const provider=providerFactory({apiKey:env.PUBLIC_NVIDIA_API_KEY,maxCalls:2,timeoutMs:Math.min(180000,timeoutMs),signal});
   let calls=0;
   const guarded={complete:async(...args)=>{
    signal.throwIfAborted();
    if(calls>=2)throw new NvidiaError('CALL_LIMIT');
    let allowed;try{allowed=await lease.check();}catch{throw new NvidiaError('LIMIT_SERVICE');}
    if(!allowed)throw new NvidiaError('LIMIT_SERVICE');
    signal.throwIfAborted();calls++;return provider.complete(...args);
   }};
   const result=await generateBatch(guarded,input);signal.throwIfAborted();
   // Return only validated candidate fields, never upstream diagnostics or request metadata.
   const body=JSON.stringify(result);
   if(Buffer.byteLength(body)>256*1024)throw new NvidiaError('RESPONSE_TOO_LARGE');
   response=reply(result);
  }catch(e){
   const code=signal.aborted?'TIMEOUT':e instanceof NvidiaError?e.code:'INVALID_AI_RESPONSE';
   response=reply({error:code==='TIMEOUT'?'생성·검증 시간이 초과되었습니다. 입력과 기존 후보는 유지됩니다.':'AI 생성·검증을 완료하지 못했습니다. 입력과 기존 후보는 유지됩니다.',code},code==='TIMEOUT'?504:code==='LIMIT_SERVICE'?503:502);
  }finally{
   // A failed release leaves the shared lease to expire; it never opens a local fallback slot.
   try{await lease.release();}catch{response=reply({error:'호출 한도 서비스에 연결하지 못했습니다. 입력과 기존 후보는 유지됩니다.',code:'LIMIT_SERVICE'},503);}
  }
  return response;
 };
}
