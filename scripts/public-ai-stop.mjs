// One-time server build/CLI emergency stop. No endpoint, counter deletion, or auto-resume.
if(!process.env.PUBLIC_AI_REDIS_URL||!process.env.PYEONEO_AI_REDIS_TOKEN||!/^https:\/\/[a-zA-Z0-9-]+\.upstash\.io\/?$/.test(process.env.PUBLIC_AI_REDIS_URL)){
 console.log(JSON.stringify({publicAiStop:{ok:false,code:'MISSING_SERVER_SETTING'}}));process.exitCode=1;
}else{
 try{
  const response=await fetch(process.env.PUBLIC_AI_REDIS_URL,{method:'POST',redirect:'error',signal:AbortSignal.timeout(3000),headers:{Authorization:`Bearer ${process.env.PYEONEO_AI_REDIS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(['SET','{pyeoneo-ai-v1}:disabled','1'])});
  if(!response.ok)throw Error();const raw=await response.text();if(raw.length>1000||JSON.parse(raw).result!=='OK')throw Error();
  console.log(JSON.stringify({publicAiStop:{ok:true,inFlightCancelled:false}}));
 }catch{console.log(JSON.stringify({publicAiStop:{ok:false,code:'LIMIT_SERVICE'}}));process.exitCode=1;}
}
