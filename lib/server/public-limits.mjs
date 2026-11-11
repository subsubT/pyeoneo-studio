import {createHmac,randomUUID} from 'node:crypto';

// One Redis primary, atomic Lua, server time, fixed UTC windows. No input text stored.
// Keys retain the same hash tag across deployments/instances. Never rename to reset quotas.
const ROOT='{pyeoneo-ai-v1}';
export const ACQUIRE=`
local t=redis.call('TIME'); local now=tonumber(t[1]);
local root=KEYS[1]; local uid=ARGV[1]; local token=ARGV[2];
if redis.call('GET',root..':disabled')=='1' then return 0 end
local active=root..':active'; local user=root..':user:'..uid;
redis.call('ZREMRANGEBYSCORE',active,'-inf',now);
if redis.call('ZCARD',active)>=2 or redis.call('EXISTS',user)==1 then return 0 end
local minute=root..':m:'..math.floor(now/60)..':'..uid;
local day=root..':d:'..math.floor(now/86400); local daily=day..':'..uid;
if tonumber(redis.call('GET',minute) or '0')>=2 or tonumber(redis.call('GET',daily) or '0')>=12 or tonumber(redis.call('GET',day) or '0')>=100 then return 0 end
redis.call('INCR',minute); redis.call('EXPIRE',minute,120);
redis.call('INCR',daily); redis.call('EXPIRE',daily,172800);
redis.call('INCR',day); redis.call('EXPIRE',day,172800);
redis.call('ZADD',active,now+300,token); redis.call('EXPIRE',active,600);
redis.call('SET',user,token,'EX',300); return 1`;
const CHECK=`if redis.call('GET',KEYS[1]..':disabled')=='1' then return 0 end
return redis.call('GET',KEYS[1]..':user:'..ARGV[1])==ARGV[2] and 1 or 0`;
const RELEASE=`redis.call('ZREM',KEYS[1]..':active',ARGV[2]);
local key=KEYS[1]..':user:'..ARGV[1]; if redis.call('GET',key)==ARGV[2] then redis.call('DEL',key) end; return 1`;

export function createPublicLimiter(env,fetchImpl=fetch,{namespace=ROOT}={}){
 // CLI preflight uses a fresh namespace; HTTP handlers always keep the production root.
 if(namespace!==ROOT&&!/^\{pyeoneo-ai-preflight-[a-f0-9-]{36}\}$/.test(namespace))throw Error('INVALID_LIMIT_NAMESPACE');
 async function command(script,uid,token){
  const response=await fetchImpl(env.PUBLIC_AI_REDIS_URL,{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(3000),
   headers:{Authorization:`Bearer ${env.PUBLIC_AI_REDIS_TOKEN}`,'Content-Type':'application/json'},
   body:JSON.stringify(['EVAL',script,'1',namespace,uid,token]),
  });
  if(!response.ok||!response.body)throw Error('LIMIT_SERVICE');
  const reader=response.body.getReader();let text='',bytes=0;
  try{while(true){const p=await reader.read();if(p.done)break;bytes+=p.value.length;if(bytes>16384)throw Error('LIMIT_SERVICE');text+=Buffer.from(p.value).toString('utf8');}}
  finally{await reader.cancel().catch(()=>{});}
  const data=JSON.parse(text);if(data.error||![0,1].includes(data.result))throw Error('LIMIT_SERVICE');
  return data.result===1;
 }
 return {async acquire(address){
  const uid=createHmac('sha256',env.PUBLIC_AI_LIMIT_SALT).update(address).digest('hex'),token=randomUUID();
  if(!await command(ACQUIRE,uid,token))return null;
  return {check:()=>command(CHECK,uid,token),release:()=>command(RELEASE,uid,token)};
 }};
}
