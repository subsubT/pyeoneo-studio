// Server/CLI only. Never import this module from a client component.
import {performance} from 'node:perf_hooks';

export const NVIDIA_MODEL = 'deepseek-ai/deepseek-v4.1-flash';
const ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MAX_RESPONSE_BYTES = 256 * 1024;
// SSE repeats transport metadata per token. Bound framing separately from model content.
const MAX_STREAM_BYTES = 4 * 1024 * 1024;

export class NvidiaError extends Error {
  constructor(code, status = 0) {
    super(`NVIDIA 요청 실패 (${code}${status ? `, HTTP ${status}` : ''}).`);
    this.name = 'NvidiaError';
    this.code = code;
    this.status = status;
  }
}

async function boundedJson(response) {
  if (!response.body) throw new NvidiaError('EMPTY_RESPONSE');
  const reader = response.body.getReader();
  const parts = [];
  let bytes = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new NvidiaError('RESPONSE_TOO_LARGE');
    }
    parts.push(value);
  }
  try { return JSON.parse(Buffer.concat(parts).toString('utf8')); }
  catch { throw new NvidiaError('INVALID_JSON'); }
}

// Transport streaming only: no unvalidated partial text is exposed to the browser.
async function boundedStream(response, metric, start) {
  if(!response.body)throw new NvidiaError('EMPTY_RESPONSE');
  const reader=response.body.getReader(), decoder=new TextDecoder();
  let bytes=0,contentBytes=0,buffer='',content='',finish=null,usage,done=false;
  function event(line){
    if(!line.startsWith('data:'))return;
    const value=line.slice(5).trim();
    if(value==='[DONE]'){done=true;return;}
    let chunk;try{chunk=JSON.parse(value);}catch{throw new NvidiaError('INVALID_JSON');}
    if(chunk.error)throw new NvidiaError('STREAM_ERROR');
    const choice=chunk.choices?.[0];
    if(choice?.delta?.content){
      if(typeof choice.delta.content!=='string')throw new NvidiaError('INVALID_JSON');
      metric.firstContentMs??=Math.round(performance.now()-start);
      contentBytes+=Buffer.byteLength(choice.delta.content);
      if(contentBytes>MAX_RESPONSE_BYTES)throw new NvidiaError('RESPONSE_TOO_LARGE');
      content+=choice.delta.content;
    }
    if(choice?.finish_reason)finish=choice.finish_reason;
    if(chunk.usage)usage=chunk.usage;
  }
  try{
    while(!done){
      const part=await reader.read();
      if(part.done){buffer+=decoder.decode();if(buffer.trim())event(buffer);break;}
      bytes+=part.value.length;if(bytes>MAX_STREAM_BYTES)throw new NvidiaError('RESPONSE_TOO_LARGE');
      metric.firstByteMs??=Math.round(performance.now()-start);
      buffer+=decoder.decode(part.value,{stream:true});
      let index;while((index=buffer.indexOf('\n'))>=0){event(buffer.slice(0,index).replace(/\r$/,''));buffer=buffer.slice(index+1);}
    }
    if(!done)throw new NvidiaError('INCOMPLETE_RESPONSE');
    return {choices:[{finish_reason:finish,message:{content}}],usage};
  }finally{await reader.cancel().catch(()=>{});}
}

export function createNvidiaProvider({
  apiKey = process.env.NVIDIA_API_KEY,
  fetchImpl = fetch,
  timeoutMs = 180000,
  maxCalls = 24,
  maxTokens = 6000,
  stream = true,
  signal,
} = {}) {
  if (typeof apiKey !== 'string' || !apiKey.trim()) throw new NvidiaError('MISSING_KEY');
  if (typeof window !== 'undefined') throw new NvidiaError('SERVER_ONLY');
  const metrics = [];
  let calls = 0;
  return {
    model: NVIDIA_MODEL,
    get metrics() { return metrics.map(m => ({...m})); },
    async complete(system, input, options = {}) {
      if (calls >= maxCalls) throw new NvidiaError('LOCAL_CALL_LIMIT');
      const payload = JSON.stringify({
        model: NVIDIA_MODEL,
        messages: [{role:'system', content:system}, {role:'user', content:JSON.stringify(input)}],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: Math.min(6000,Math.max(32,Math.min(maxTokens,options.maxTokens??maxTokens))),
        stream,
        ...(stream?{stream_options:{include_usage:true}}:{}),
        chat_template_kwargs: {thinking:false, reasoning_effort:1},
        response_format: {type:'json_object'},
      });
      if (Buffer.byteLength(payload) > 40000) throw new NvidiaError('INPUT_TOO_LARGE');
      calls++;
      const start = performance.now();
      const metric={call:calls,stage:options.stage||'unspecified',requestBytes:Buffer.byteLength(payload)};
      const timeout=AbortSignal.timeout(timeoutMs);
      const requestSignal=signal?AbortSignal.any([signal,timeout]):timeout;
      let response;
      try {
        response = await fetchImpl(ENDPOINT, {
          method:'POST',
          headers:{Authorization:`Bearer ${apiKey}`, 'Content-Type':'application/json'},
          body:payload,
          redirect:'error',
          signal:requestSignal,
        });
      metric.headersMs=Math.round(performance.now()-start);
      if (!response.ok) {
        await response.body?.cancel();
        throw new NvidiaError('HTTP_ERROR', response.status);
      }
      const json = stream&&response.headers.get('content-type')?.includes('text/event-stream')
        ?await boundedStream(response,metric,start):await boundedJson(response);
      metric.bodyCompleteMs=Math.round(performance.now()-start);
      const safeUsage = Object.fromEntries(['prompt_tokens','completion_tokens','total_tokens']
        .filter(k => Number.isSafeInteger(json.usage?.[k]) && json.usage[k] >= 0)
        .map(k => [k,json.usage[k]]));
      Object.assign(metric,safeUsage);
      const choice = json.choices?.[0];
      if (choice?.finish_reason !== 'stop') throw new NvidiaError('INCOMPLETE_RESPONSE');
      const content = choice?.message?.content;
      if (typeof content !== 'string' || !content.trim()) throw new NvidiaError('EMPTY_CONTENT');
      // Do not let even a malicious upstream echo a credential into logs/artifacts.
      if (content.includes(apiKey)) throw new NvidiaError('UNSAFE_RESPONSE');
      let parsed;
      try { parsed = JSON.parse(content.replace(/^\s*```(?:json)?\s*/,'').replace(/\s*```\s*$/,'')); }
      catch { throw new NvidiaError('INVALID_CONTENT_JSON'); }
      metric.ok=true;
      return parsed;
      } catch(e) {
        const error=e instanceof NvidiaError?e:new NvidiaError(requestSignal.aborted?(requestSignal.reason?.name==='TimeoutError'?'TIMEOUT':'CANCELLED'):(e?.name==='TimeoutError'?'TIMEOUT':'NETWORK'));
        metric.ok=false;metric.code=error.code;metric.status=error.status;
        throw error;
      } finally {
        metric.durationMs=Math.round(performance.now()-start);metrics.push(metric);
      }
    },
  };
}
