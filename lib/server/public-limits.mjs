import {createHmac,randomUUID} from 'node:crypto';

// One Redis primary, atomic Lua, server time, fixed UTC windows. No input text stored.
// Keys retain the same hash tag across deployments/instances. Never rename to reset quotas.
const ROOT='{pyeoneo-ai-v1}';
export const PROVIDER_RPM=12;
export const PROVIDER_INPUT_BYTE_BUDGET=200000;
export const PROVIDER_DAILY_CALLS=450;
// 26h covers even a 25h Pacific DST day; leave 50 calls for prior/other project usage.
// UTF-8 bytes conservatively bound text tokens, including rules/schema/framing.
// Keep 50k TPM headroom. Large requests may therefore admit fewer than 12 calls.
export const PROVIDER_RESERVE=`
local t=redis.call('TIME'); local now=tonumber(t[1])*1000+math.floor(tonumber(t[2])/1000);
local root=KEYS[1]; local calls=root..':gemini:calls'; local weights=root..':gemini:input-bytes';
if redis.call('GET',root..':disabled')=='1' then return {-1,60} end
local cooldown=redis.call('PTTL',root..':gemini:cooldown'); if cooldown>0 then return {0,math.ceil(cooldown/1000)} end
local expired=redis.call('ZRANGEBYSCORE',calls,'-inf',now-60000);
for _,id in ipairs(expired) do redis.call('HDEL',weights,id) end
redis.call('ZREMRANGEBYSCORE',calls,'-inf',now-60000);
local sum=0; for _,n in ipairs(redis.call('HVALS',weights)) do sum=sum+tonumber(n) end
if redis.call('ZCARD',calls)>=12 or sum+tonumber(ARGV[2])>200000 then
 local oldest=redis.call('ZRANGE',calls,0,0,'WITHSCORES');
 return {0,math.max(1,math.ceil((tonumber(oldest[2] or now)+60000-now)/1000))}
end
local daily=root..':gemini:daily-calls';
redis.call('ZREMRANGEBYSCORE',daily,'-inf',now-93600000);
if redis.call('ZCARD',daily)>=450 then
 local oldest=redis.call('ZRANGE',daily,0,0,'WITHSCORES');
 return {0,math.max(1,math.ceil((tonumber(oldest[2])+93600000-now)/1000))}
end
redis.call('ZADD',calls,now,ARGV[1]); redis.call('HSET',weights,ARGV[1],ARGV[2]);
redis.call('ZADD',daily,now,ARGV[1]); redis.call('PEXPIRE',daily,93660000);
redis.call('PEXPIRE',calls,120000); redis.call('PEXPIRE',weights,120000); return {1,0}`;
const COOLDOWN=`local key=KEYS[1]..':gemini:cooldown'; local duration=tonumber(ARGV[1])*1000;
if redis.call('PTTL',key)<duration then redis.call('SET',key,'1','PX',duration) end; return 1`;
export const ACQUIRE=`
local t=redis.call('TIME'); local now=tonumber(t[1]);
local root=KEYS[1]; local uid=ARGV[1]; local token=ARGV[2];
if redis.call('GET',root..':disabled')=='1' then return -1 end
local active=root..':active'; local user=root..':user:'..uid;
redis.call('ZREMRANGEBYSCORE',active,'-inf',now);
local previous=redis.call('GET',user);
if previous and not redis.call('ZSCORE',active,previous) then redis.call('DEL',user); previous=false end
if redis.call('ZCARD',active)>=2 or previous then return 0 end
local minute=root..':m:'..math.floor(now/60)..':'..uid;
local day=root..':d:'..math.floor(now/86400); local daily=day..':'..uid;
if tonumber(redis.call('GET',minute) or '0')>=2 or tonumber(redis.call('GET',daily) or '0')>=12 or tonumber(redis.call('GET',day) or '0')>=100 then return 0 end
redis.call('INCR',minute); redis.call('EXPIRE',minute,120);
redis.call('INCR',daily); redis.call('EXPIRE',daily,172800);
redis.call('INCR',day); redis.call('EXPIRE',day,172800);
redis.call('ZADD',active,now+300,token); redis.call('EXPIRE',active,600);
redis.call('SET',user,token,'EX',300); return 1`;
const CHECK=`if redis.call('GET',KEYS[1]..':disabled')=='1' then return 0 end
local t=redis.call('TIME'); local expires=tonumber(redis.call('ZSCORE',KEYS[1]..':active',ARGV[2]) or '0');
return expires>tonumber(t[1]) and redis.call('GET',KEYS[1]..':user:'..ARGV[1])==ARGV[2] and 1 or 0`;
const RELEASE=`redis.call('ZREM',KEYS[1]..':active',ARGV[2]);
local key=KEYS[1]..':user:'..ARGV[1]; if redis.call('GET',key)==ARGV[2] then redis.call('DEL',key) end; return 1`;

export function createPublicLimiter(env,fetchImpl=fetch,{namespace=ROOT}={}){
 // CLI preflight uses a fresh namespace; HTTP handlers always keep the production root.
 if(namespace!==ROOT&&!/^\{pyeoneo-ai-preflight-[a-f0-9-]{36}\}$/.test(namespace))throw Error('INVALID_LIMIT_NAMESPACE');
 async function command(script,uid,token){
  const response=await fetchImpl(env.PUBLIC_AI_REDIS_URL,{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(3000),
   headers:{Authorization:`Bearer ${env.PYEONEO_AI_REDIS_TOKEN}`,'Content-Type':'application/json'},
   body:JSON.stringify(['EVAL',script,'1',namespace,uid,token]),
  });
  if(!response.ok||!response.body)throw Error('LIMIT_SERVICE');
  const reader=response.body.getReader();let text='',bytes=0;
  try{while(true){const p=await reader.read();if(p.done)break;bytes+=p.value.length;if(bytes>16384)throw Error('LIMIT_SERVICE');text+=Buffer.from(p.value).toString('utf8');}}
  finally{await reader.cancel().catch(()=>{});}
  const data=JSON.parse(text);if(data.error)throw Error('LIMIT_SERVICE');
  if(script===PROVIDER_RESERVE){if(!Array.isArray(data.result)||data.result.length!==2||![-1,0,1].includes(data.result[0])||!Number.isInteger(data.result[1])||data.result[1]<0)throw Error('LIMIT_SERVICE');return {allowed:data.result[0]===1,stopped:data.result[0]===-1,retryAfter:data.result[1]};}
  if(script===ACQUIRE&&data.result===-1)throw Object.assign(Error('SHARED_STOP'),{code:'SHARED_STOP'});
  if(![0,1].includes(data.result))throw Error('LIMIT_SERVICE');
  return data.result===1;
 }
 return {
 async reserveProvider(bytes){if(!Number.isSafeInteger(bytes)||bytes<1||bytes>40000)throw Error('INVALID_PROVIDER_WEIGHT');return command(PROVIDER_RESERVE,randomUUID(),String(bytes));},
 async cooldown(seconds=60){return command(COOLDOWN,String(Math.min(86400,Math.max(60,Math.ceil(seconds)))),'');},
 async acquire(address){
  const uid=createHmac('sha256',env.PUBLIC_AI_LIMIT_SALT).update(address).digest('hex'),token=randomUUID();
  if(!await command(ACQUIRE,uid,token))return null;
  return {check:()=>command(CHECK,uid,token),release:()=>command(RELEASE,uid,token)};
 }};
}
