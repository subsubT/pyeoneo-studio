// Only numerical timing/usage and synthetic case IDs leave the ignored raw reports.
import {readFile,writeFile} from 'node:fs/promises';
const labels=process.argv.slice(2);
if(!labels.length)throw Error('Provide benchmark labels');
const summary=[];
for(const label of labels){
 if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid label');
 const report=JSON.parse(await readFile(`tmp/ai-speed/${label}.json`,'utf8'));
 summary.push({label,mode:report.mode,startedAt:report.startedAt,finishedAt:report.finishedAt,cases:report.cases.map(c=>({
  id:c.id,totalMs:c.totalMs,externalMs:c.externalMs,internalMs:c.internalMs,
  generated:c.generated,accepted:c.accepted,correct:c.correct,error:c.error,
  calls:c.calls.map((call,i)=>({...call,...c.metrics?.[i]})),
 }))});
}
await writeFile('docs/ai-speed-measurements.json',JSON.stringify(summary,null,2)+'\n');
for(const report of summary)for(const c of report.cases)console.log(JSON.stringify({label:report.label,id:c.id,seconds:c.totalMs/1000,input:c.calls.reduce((n,m)=>n+(m.prompt_tokens||0),0),output:c.calls.reduce((n,m)=>n+(m.completion_tokens||0),0),accepted:c.accepted,correct:c.correct,error:c.error}));
