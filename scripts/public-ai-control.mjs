// One-time Production server CLI. Only the existing stop key may be removed.
import {pathToFileURL} from 'node:url';
export async function publicAiControl(action,env=process.env,fetchImpl=fetch){
 if(!['status','resume'].includes(action))throw Error('INVALID_ACTION');
 if(!/^https:\/\/[a-zA-Z0-9-]+\.upstash\.io\/?$/.test(env.PUBLIC_AI_REDIS_URL||'')||!env.PYEONEO_AI_REDIS_TOKEN)throw Error('MISSING_SERVER_SETTING');
 if(action==='resume'&&(env.VERCEL!=='1'||env.VERCEL_ENV!=='production'||env.PUBLIC_AI_ENABLED!=='true'||env.PUBLIC_AI_VERIFIED!=='true'))throw Error('RESUME_REQUIRES_ACTIVE_PRODUCTION');
 const script=action==='resume'?"local value=redis.call('GET',KEYS[1]); if value and value~='1' then return -1 end; redis.call('DEL',KEYS[1]); return redis.call('EXISTS',KEYS[1])":"return redis.call('GET',KEYS[1])=='1' and 1 or 0";
 const response=await fetchImpl(env.PUBLIC_AI_REDIS_URL,{method:'POST',redirect:'error',signal:AbortSignal.timeout(3000),headers:{Authorization:`Bearer ${env.PYEONEO_AI_REDIS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(['EVAL',script,'1','{pyeoneo-ai-v1}:disabled'])});
 if(!response.ok||!response.body)throw Error('LIMIT_SERVICE');
 const reader=response.body.getReader();let body='',bytes=0;
 try{for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>1000)throw Error('LIMIT_SERVICE');body+=Buffer.from(part.value).toString('utf8');}}finally{await reader.cancel().catch(()=>{});}
 let data;try{data=JSON.parse(body);}catch{throw Error('LIMIT_SERVICE');}
 if(data.error||![0,1].includes(data.result)||action==='resume'&&data.result!==0)throw Error('CONTROL_FAILED');
 return {action,ok:true,stopped:data.result===1,countersAndSaltPreserved:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{console.log(JSON.stringify({publicAiControl:await publicAiControl(process.argv[2]?.replace(/^--/,''))}));}
 catch(e){console.log(JSON.stringify({publicAiControl:{ok:false,code:['INVALID_ACTION','MISSING_SERVER_SETTING','RESUME_REQUIRES_ACTIVE_PRODUCTION','CONTROL_FAILED'].includes(e.message)?e.message:'LIMIT_SERVICE'}}));process.exitCode=1;}
}
