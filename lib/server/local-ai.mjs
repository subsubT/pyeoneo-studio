import {inputSchema, generateBatch} from '../generation.mjs';
import {createNvidiaProvider, NvidiaError} from './nvidia.mjs';

export function localAiEnabled(env = process.env) {
  return env.LOCAL_AI_ENABLED === 'true' && env.NODE_ENV === 'development'
    && !('VERCEL' in env) && Boolean(env.NVIDIA_API_KEY?.trim());
}

export function allowedLocalRequest(req) {
  const url = new URL(req.url);
  const allowed = ['127.0.0.1','localhost','[::1]'];
  try {
    // Next dev may normalize req.url to localhost while preserving Host=127.0.0.1.
    // Both must still be loopback on the same port, and Origin must exactly match Host.
    const host=req.headers.get('host');
    const requested=new URL(`http://${host}`);
    return allowed.includes(url.hostname) && allowed.includes(requested.hostname)
      && url.protocol==='http:' && requested.port===url.port
      && req.headers.get('origin')===requested.origin;
  } catch { return false; }
}

export async function readGenerationInput(req) {
  if (!req.headers.get('content-type')?.startsWith('application/json')) throw new NvidiaError('CONTENT_TYPE');
  if (!req.body) throw new NvidiaError('INVALID_INPUT');
  const reader = req.body.getReader();
  let size = 0;
  const parts = [];
  while (true) {
    const {done,value} = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 32000) { await reader.cancel(); throw new NvidiaError('INPUT_TOO_LARGE'); }
    parts.push(value);
  }
  try { return inputSchema.parse(JSON.parse(Buffer.concat(parts).toString('utf8'))); }
  catch { throw new NvidiaError('INVALID_INPUT'); }
}

// Deliberately local-process limits, not a substitute for public-service rate limiting.
export function createLocalAiHandler({env=process.env, providerFactory=createNvidiaProvider, now=Date.now}={}) {
  let active = false;
  let windowStart = now();
  let batches = 0;
  const reply = (data,status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
  return async function handle(req) {
    if (!localAiEnabled(env)) return reply({error:'AI 연결 대기 중입니다. 공개 서비스의 AI는 비활성 상태입니다.'},503);
    if (!allowedLocalRequest(req)) return reply({error:'로컬 작업 화면에서만 요청할 수 있습니다.'},403);
    if (active) return reply({error:'다른 생성 작업이 진행 중입니다.'},429);
    if (now()-windowStart >= 3600000) { windowStart=now(); batches=0; }
    if (batches >= 12) return reply({error:'로컬 시험 한도(시간당 12회)에 도달했습니다.'},429);
    let input;
    try { input=await readGenerationInput(req); }
    catch (e) { return reply({error:'실제 활동·예시·수준·확인 여부와 입력 크기를 확인하세요.'},e.code==='INPUT_TOO_LARGE'?413:400); }
    if (active) return reply({error:'다른 생성 작업이 진행 중입니다.'},429);
    active=true;
    batches++;
    try {
      const provider=providerFactory({apiKey:env.NVIDIA_API_KEY,maxCalls:2});
      return reply(await generateBatch(provider,input));
    } catch (e) {
      // Never return the upstream body, stack, request headers, or environment values.
      const code=e instanceof NvidiaError?e.code:'INVALID_AI_RESPONSE';
      return reply({error:`AI 요청을 완료하지 못했습니다 (${code}). 후보는 추가되지 않았습니다.`},502);
    } finally { active=false; }
  };
}
