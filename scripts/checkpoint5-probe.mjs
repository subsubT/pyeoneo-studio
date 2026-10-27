import {loadEnvFile} from 'node:process';
loadEnvFile('.env.local');
const started=Date.now();
try {
 const r=await fetch('https://integrate.api.nvidia.com/v1/models',{headers:{Authorization:`Bearer ${process.env.NVIDIA_API_KEY}`},signal:AbortSignal.timeout(20000),redirect:'error'});
 if(!r.ok){await r.body?.cancel();console.log(JSON.stringify({stage:'models',status:r.status,elapsedMs:Date.now()-started}));process.exitCode=1;}
 else {const j=await r.json();const ids=(j.data||[]).map(x=>x.id).filter(x=>typeof x==='string'&&/deepseek.*(?:v4|flash)/i.test(x));console.log(JSON.stringify({stage:'models',status:r.status,models:ids,elapsedMs:Date.now()-started}));}
}catch(e){console.log(JSON.stringify({stage:'models',error:e.name,networkCode:/^[A-Z0-9_]+$/.test(e.cause?.code||'')?e.cause.code:null,elapsedMs:Date.now()-started}));process.exitCode=1;}
