// Server/CLI only. Never import this module from a client component.
import {performance} from 'node:perf_hooks';

export const NVIDIA_MODEL = 'deepseek-ai/deepseek-v4.1-flash';
const ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MAX_RESPONSE_BYTES = 256 * 1024;

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

export function createNvidiaProvider({
  apiKey = process.env.NVIDIA_API_KEY,
  fetchImpl = fetch,
  timeoutMs = 180000,
  maxCalls = 24,
  maxTokens = 6000,
} = {}) {
  if (typeof apiKey !== 'string' || !apiKey.trim()) throw new NvidiaError('MISSING_KEY');
  if (typeof window !== 'undefined') throw new NvidiaError('SERVER_ONLY');
  const metrics = [];
  let calls = 0;
  return {
    model: NVIDIA_MODEL,
    get metrics() { return metrics.map(m => ({...m})); },
    async complete(system, input) {
      if (calls >= maxCalls) throw new NvidiaError('LOCAL_CALL_LIMIT');
      const payload = JSON.stringify({
        model: NVIDIA_MODEL,
        messages: [{role:'system', content:system}, {role:'user', content:JSON.stringify(input)}],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: Math.min(6000,Math.max(32,maxTokens)),
        stream: false,
        chat_template_kwargs: {thinking:false, reasoning_effort:1},
        response_format: {type:'json_object'},
      });
      if (Buffer.byteLength(payload) > 40000) throw new NvidiaError('INPUT_TOO_LARGE');
      calls++;
      const start = performance.now();
      let response;
      try {
        response = await fetchImpl(ENDPOINT, {
          method:'POST',
          headers:{Authorization:`Bearer ${apiKey}`, 'Content-Type':'application/json'},
          body:payload,
          redirect:'error',
          signal:AbortSignal.timeout(timeoutMs),
        });
      } catch (e) {
        throw new NvidiaError(e?.name === 'TimeoutError' || e?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK');
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new NvidiaError('HTTP_ERROR', response.status);
      }
      const json = await boundedJson(response);
      const choice = json.choices?.[0];
      if (choice?.finish_reason !== 'stop') throw new NvidiaError('INCOMPLETE_RESPONSE');
      const content = choice?.message?.content;
      if (typeof content !== 'string' || !content.trim()) throw new NvidiaError('EMPTY_CONTENT');
      // Do not let even a malicious upstream echo a credential into logs/artifacts.
      if (content.includes(apiKey)) throw new NvidiaError('UNSAFE_RESPONSE');
      let parsed;
      try { parsed = JSON.parse(content.replace(/^\s*```(?:json)?\s*/,'').replace(/\s*```\s*$/,'')); }
      catch { throw new NvidiaError('INVALID_CONTENT_JSON'); }
      const safeUsage = Object.fromEntries(['prompt_tokens','completion_tokens','total_tokens']
        .filter(k => Number.isSafeInteger(json.usage?.[k]) && json.usage[k] >= 0)
        .map(k => [k,json.usage[k]]));
      metrics.push({call:calls, durationMs:Math.round(performance.now()-start), ...safeUsage});
      return parsed;
    },
  };
}
