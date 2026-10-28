// Explicit live test: authored synthetic cases only, never uploaded teaching/student data.
import {loadEnvFile} from 'node:process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {cases,negativeCandidates} from './checkpoint5-cases.mjs';
loadEnvFile('.env.local');
const mode=process.argv[2];
if(!['baseline','optimized'].includes(mode))throw Error('Use baseline or optimized');
const baselineCommit='f83583ea5ccd86fa9f0af8f2b5bde60f2f97c35b';
if(mode==='baseline'){
 await mkdir('tmp/speed-baseline/server',{recursive:true});
 for(const file of ['generation.mjs','prompt.mjs','core.mjs','server/nvidia.mjs'])await writeFile('tmp/speed-baseline/'+file,execFileSync('git',['show',`${baselineCommit}:lib/${file}`]));
}
const root=mode==='baseline'?'../tmp/speed-baseline/':'../lib/';
const {createNvidiaProvider}=await import(root+'server/nvidia.mjs');
const {generateBatch,reviewCandidates}=await import(root+'generation.mjs');
const report={mode,baselineCommit,startedAt:new Date().toISOString(),syntheticOnly:true,cases:[]};
await mkdir('tmp/ai-speed',{recursive:true});
const label=process.argv.find(a=>a.startsWith('--label='))?.slice(8)||mode;
if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid report label');
const path=`tmp/ai-speed/${label}.json`;
const save=()=>writeFile(path,JSON.stringify(report,null,2));
const selected=process.argv.find(a=>a.startsWith('--case='))?.slice(7);
for(const c of [...cases,{...cases[0],id:'negative'}].filter(c=>!selected||c.id===selected)){
 const entry={id:c.id,calls:[],responses:[]};report.cases.push(entry);
 const transport=createNvidiaProvider({maxCalls:2,fetchImpl:async(url,options)=>{
  const call={stage:entry.calls.length?'review':c.id==='negative'?'review':'generation',requestBytes:Buffer.byteLength(options.body)};
  entry.calls.push(call);const start=performance.now();
  try{const response=await fetch(url,options);call.headersMs=Math.round(performance.now()-start);call.httpStatus=response.status;return response;}
  catch(e){call.fetchError=e.name;throw e;}
 }});
 const provider={async complete(...args){const start=performance.now();try{const result=await transport.complete(...args);entry.responses.push(structuredClone(result));return result;}finally{if(entry.calls.length)entry.calls.at(-1).durationMs=Math.round(performance.now()-start);entry.metrics=transport.metrics;await save();}}};
 const input={...c,confirmed:true,existing:[]};delete input.id;
 const start=performance.now();
 try{
  entry.result=c.id==='negative'?await reviewCandidates(provider,input,negativeCandidates):await generateBatch(provider,input);
  if(c.id!=='negative'){entry.generated=entry.result.candidates.length;entry.accepted=entry.result.candidates.filter(x=>x.semanticPass&&!x.errors.length).length;}
  else entry.correct=entry.result.filter(r=>r.pass===(r.index===5)&&(!r.pass||r.issues.length===0)).length;
 }catch(e){entry.error={code:e.code||'INVALID_RESPONSE',status:e.status||0};}
 entry.totalMs=Math.round(performance.now()-start);entry.externalMs=entry.calls.reduce((n,c)=>n+c.durationMs,0);entry.internalMs=Math.max(0,entry.totalMs-entry.externalMs);
 await save();console.log(JSON.stringify({mode,id:c.id,totalMs:entry.totalMs,generated:entry.generated,accepted:entry.accepted,correct:entry.correct,error:entry.error}));
}
report.finishedAt=new Date().toISOString();
report.pipelinePassed=report.cases.length>0&&report.cases.every(c=>!c.error&&(c.id==='negative'?c.correct===6:c.generated===12&&c.accepted>0));
// A completed pipeline is not proof of equal quality. A lower yield must not be a green run.
if(mode==='optimized'){
 try{
  const baseline=JSON.parse(await readFile('tmp/ai-speed/baseline.json','utf8'));
  report.autoPassCountNotLower=report.cases.every(c=>{
   const before=baseline.cases.find(b=>b.id===c.id);
   return before&&!before.error&&!c.error&&(c.id==='negative'?c.correct>=before.correct:c.accepted>=before.accepted);
  });
 }catch{report.autoPassCountNotLower=null;}
}
report.passed=report.pipelinePassed&&(mode==='baseline'||report.autoPassCountNotLower===true);
await save();if(!report.passed)process.exitCode=1;
