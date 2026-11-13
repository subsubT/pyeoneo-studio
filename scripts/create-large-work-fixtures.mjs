// Actual embedded PDF bytes dominate these files; Korean reference metadata fills
// the remaining space. No JSON whitespace padding or mocked File sizes.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {blankItem} from '../lib/core.mjs';
import {serializeProject,restoreProject} from '../lib/restore.mjs';
import {WORK_FILE_LIMIT} from '../lib/file-limits.mjs';
const dir='tmp/file-limit-fixtures';
const pages=[{page:1,text:'국어과 합성 평가계획: 낱말 읽기, 문장 읽기. 학생 자료 없음.'}];
const exact=(await readFile(`${dir}/pdf-exact.pdf`)).toString('base64');
const smaller=(await readFile(`${dir}/pdf-49.pdf`)).toString('base64');
const sources=[exact,exact,smaller].map((data,n)=>({id:crypto.randomUUID(),name:`합성 원본 ${n+1}.pdf`,data,pages}));
const items=[0,1].map((n)=>({...blankItem(),element:n?'제외 보관 항목':'낱말 읽기',sourceId:sources[n].id,page:1,included:!n}));
const project={items,examples:[],sources,planConfirmed:true,activeItemId:items[0].id,combinationIds:[]};
let remaining=WORK_FILE_LIMIT-1-Buffer.byteLength(serializeProject(project));
while(remaining>200){
 const text='가'.repeat(Math.min(4990,Math.floor((remaining-80)/3)));
 const entry={sheet:'합성',cell:`A${project.examples.length+1}`,text};
 const delta=Buffer.byteLength(JSON.stringify(entry))+(project.examples.length?1:0);
 project.examples.push(entry);remaining-=delta;
}
project.examples.at(-1).text+='x'.repeat(remaining);
const manifest=[];
for(const delta of [-1,0,1]){
 if(delta!==-1)project.examples.at(-1).text+='x';
 const json=JSON.stringify({version:2,...project});
 assert.equal(Buffer.byteLength(json),WORK_FILE_LIMIT+delta);
 if(delta<=0){
  assert.equal(serializeProject(project),json);
  const restored=restoreProject(JSON.parse(json));
  assert.equal(Buffer.byteLength(serializeProject(restored)),WORK_FILE_LIMIT+delta);
 }else assert.throws(()=>serializeProject(project),/200MB/);
 const file=`${dir}/work-${delta===-1?'minus':delta===0?'exact':'over'}.json`;
 await writeFile(file,json);
 manifest.push({file,bytes:Buffer.byteLength(json),characters:json.length,pdfOriginalBytes:2*52428800+51380224,sources:3,examples:project.examples.length,utf8NotStringLength:json.length!==Buffer.byteLength(json)});
}
const embeddedOver={items:[],examples:[],sources:[{...sources[0],data:(await readFile(`${dir}/pdf-over.pdf`)).toString('base64')}]};
project.examples.splice(-70);
await writeFile(`${dir}/work-near.json`,serializeProject(project));
await writeFile(`${dir}/embedded-over.json`,JSON.stringify({version:2,...embeddedOver}));
await writeFile(`${dir}/work-manifest.json`,JSON.stringify(manifest,null,2));
console.log(JSON.stringify(manifest,null,2));
