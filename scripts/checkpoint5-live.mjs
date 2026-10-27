import {loadEnvFile} from 'node:process';
import {mkdir,writeFile} from 'node:fs/promises';
import {createNvidiaProvider,NvidiaError} from '../lib/server/nvidia.mjs';
import {generateBatch,reviewCandidates} from '../lib/generation.mjs';
import {cases,negativeCandidates} from './checkpoint5-cases.mjs';

loadEnvFile('.env.local');
const colorsOnly=process.argv.includes('--colors-only');
const negativeOnly=process.argv.includes('--negative-only');
const selectedCase=colorsOnly?'colors':process.argv.find(a=>a.startsWith('--case='))?.slice(7);
if(selectedCase&&!cases.some(c=>c.id===selectedCase))throw Error('Unknown synthetic case');
const skipNegative=process.argv.includes('--skip-negative');
const reuseGeneration=process.argv.includes('--reuse-generation');
const cached=reuseGeneration?JSON.parse(await (await import('node:fs/promises')).readFile('tmp/checkpoint5/words-review-timeout.json','utf8')):null;
if(reuseGeneration&&selectedCase!=='words')throw Error('Replay is only supported for the recorded words case.');
const reportPath=negativeOnly?'tmp/checkpoint5/negative-regression.json':selectedCase?`tmp/checkpoint5/${selectedCase}-regression.json`:'tmp/checkpoint5/live-results.json';
const transport=createNvidiaProvider({maxCalls:20});
const report={startedAt:new Date().toISOString(),model:transport.model,syntheticOnly:true,cases:[],negativeTest:null,metrics:[],responses:[]};
report.generationReplay=reuseGeneration;
let usedCache=false;
const provider={model:transport.model,get metrics(){return transport.metrics},async complete(system,input){let output;if(cached&&!usedCache){usedCache=true;output=cached.responses[0];}else output=await transport.complete(system,input);report.responses.push(output);await save();return output;}};
await mkdir('tmp/checkpoint5',{recursive:true});
async function save(){report.metrics=provider.metrics;await writeFile(reportPath,JSON.stringify(report,null,2));}
try {
 for(const c of negativeOnly?[]:selectedCase?cases.filter(c=>c.id===selectedCase):cases){
  const input={...c,confirmed:true,existing:[]};delete input.id;
  const result=await generateBatch(provider,input);
  const accepted=result.candidates.filter(x=>x.semanticPass&&!x.errors.length);
  const entry={id:c.id,input,result,generated:result.candidates.length,accepted:accepted.length,flagged:result.candidates.length-accepted.length};
  report.cases.push(entry);await save();
  console.log(JSON.stringify({case:c.id,generated:entry.generated,accepted:entry.accepted,flagged:entry.flagged}));
 }
 if(!skipNegative){
 const input={...cases[0],confirmed:true,existing:[]};delete input.id;
 const reviews=await reviewCandidates(provider,input,negativeCandidates);
 const rejected=reviews.filter(r=>r.index<5&&!r.pass).length;
 report.negativeTest={input,candidates:negativeCandidates,reviews,expectedRejected:5,rejected,positiveControlPassed:reviews.find(r=>r.index===5)?.pass===true};
 }
 report.passed=report.cases.every(c=>c.generated>0&&c.accepted>0)&&(skipNegative||(report.negativeTest.rejected===5&&report.negativeTest.positiveControlPassed));
 report.finishedAt=new Date().toISOString();await save();
 console.log(JSON.stringify({passed:report.passed,negativeRejected:report.negativeTest?.rejected,expected:skipNegative?null:5,positiveControlPassed:report.negativeTest?.positiveControlPassed,calls:provider.metrics.length}));
 if(!report.passed)process.exitCode=1;
} catch(e){
 report.passed=false;report.error={code:e instanceof NvidiaError?e.code:'INVALID_GENERATION_OR_REVIEW',status:e instanceof NvidiaError?e.status:0};
 await save();console.error(JSON.stringify(report.error));process.exitCode=1;
}
