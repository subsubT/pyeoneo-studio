// Real public calls only: no route interception, no mock provider, no automatic product approval.
// This regression acts as a test teacher to review synthetic candidates; report contains counts/metrics only.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import ExcelJS from 'exceljs';
import {blankItem} from '../lib/core.mjs';
import {cases} from './checkpoint5-cases.mjs';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE||`${process.cwd()}/tmp/tools/node_modules/playwright/index.mjs`).href);
const base=process.env.TEST_BASE_URL||'https://pyeoneo-studio.vercel.app',dir=process.env.TEST_OUTPUT_DIR||'tmp/public-ai-live';
assert.equal(new URL(base).origin,'https://pyeoneo-studio.vercel.app');await mkdir(dir,{recursive:true});
const proxy=process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined;
const browser=await chromium.launch({headless:true,proxy,executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium'});
const report={startedAt:new Date().toISOString(),realPublicModel:true,mocked:false,batches:[],pageErrors:[],consoleErrors:[],ok:false};
try{
 const context=await browser.newContext({proxy,acceptDownloads:true,viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});
 const status=await context.request.get(`${base}/api/generate`);assert.deepEqual(await status.json(),{enabled:true,mode:'public',localOnly:false});
 const p=await context.newPage();p.on('pageerror',e=>report.pageErrors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text())});
 const resume=process.env.TEST_RESUME_WORK?JSON.parse(await readFile(process.env.TEST_RESUME_WORK,'utf8')):null;
 const pdf=await readFile(process.env.TEST_PUBLIC_PDF||'tmp/pdf-drop-fixtures/supported.pdf');
 const source=resume?.sources?.[0]||{id:'synthetic-live-pdf',name:'supported.pdf',data:pdf.toString('base64'),pages:[{page:1,text:'비식별 합성 평가계획: 주변의 색 탐색과 색상환 완성'}]};
 await p.goto(base);const seed=resume||{version:2,items:[0,1].map(n=>({...blankItem(),subject:'즐거운생활',element:`색 탐색과 색상환 ${n+1}`,sourceId:source.id,page:1})),examples:[],sources:[source],planConfirmed:false};
 await p.locator('input[accept=".json"]').setInputFiles({name:'synthetic-live.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(seed))});
 await p.getByRole('button',{name:seed.planConfirmed?'문장 작업으로 이동 →':'선택한 평가계획 확정 →',exact:true}).click();
 const saveCheckpoint=async name=>{const event=p.waitForEvent('download');await p.getByRole('button',{name:'↓ 작업 파일 저장',exact:true}).click();await(await event).saveAs(`${dir}/${name}.json`);return JSON.parse(await readFile(`${dir}/${name}.json`,'utf8'));};
 const approved=[];
 for(let n=0;n<2;n++){
  if(n===1)await p.setViewportSize({width:390,height:844});
  await p.locator('.sidebar .item').nth(n).click();await p.getByLabel('실제 교육활동',{exact:true}).fill(cases[0].actual);await p.getByLabel('참고 예시문장',{exact:true}).fill(cases[0].example);await p.getByLabel('평가 수준',{exact:true}).selectOption(cases[0].level);
  assert.equal(await p.getByRole('checkbox',{name:'실제 수행한 활동과 확인된 성취임을 확인했습니다.',exact:true}).count(),0);
  const started=performance.now(),previous=await saveCheckpoint(`before-${n}`);
  let data;const reused=!!resume?.items[n]?.approved?.length;
  if(reused){data={candidates:[...resume.items[n].approved.map(c=>({...c,semanticPass:true,errors:[]})),...resume.items[n].candidates]};}
  else{
  assert(await p.getByRole('button',{name:'AI 후보 12개 생성',exact:true}).isEnabled());report.publicButtonEnabled=true;
  const wait=p.waitForResponse(r=>r.url()===`${base}/api/generate`&&r.request().method()==='POST',{timeout:300000});await p.getByRole('button',{name:'AI 후보 12개 생성',exact:true}).click();
  const response=await wait;data=await response.json();
  if(response.status()!==200){
   await p.getByRole('status').filter({hasText:data.error}).waitFor();
   const after=await saveCheckpoint('failure-work');
   const preserve=work=>work.items.map(i=>({actual:i.actual,example:i.example,candidates:i.candidates.map(c=>c.text),approved:i.approved.map(c=>c.text)}));
   assert.deepEqual(preserve(after),preserve(previous));await p.screenshot({path:`${dir}/failed-${n}.png`,fullPage:true});
   report.failure={batch:n,status:response.status(),code:data.code,retryAfter:response.headers()['retry-after']||null,inputCandidatesApprovalsPreserved:true,resumeWork:`${dir}/failure-work.json`};
   throw Error('PUBLIC_REQUEST_FAILED_SERVICE_REMAINS_ACTIVE');
  }
  assert.equal(data.candidates.length,12);
  }

  await p.locator('.sentence').nth(11).waitFor();assert.equal(await p.locator('article.approved').count(),0);
  const accepted=data.candidates.map((c,index)=>({c,index})).filter(({c})=>c.semanticPass&&(!c.errors||c.errors.length===0));assert(accepted.length>0);
  // The browser must retain every flagged candidate for review, and cannot approve it.
  for(let index=0;index<data.candidates.length;index++)if(data.candidates[index].errors?.length)assert(await p.locator('.sentence').nth(index).getByRole('button',{name:'승인하여 담기 ＋',exact:true}).isDisabled());
  const {c,index}=accepted[0];assert(c.text.trim().endsWith('함.'));approved.push(c.text);
  const row=p.locator('.sentence').nth(index);assert(await row.getByRole('button',{name:'승인하여 담기 ＋',exact:true}).isDisabled());await row.locator('input[type=checkbox]').check();
  if(n===0){const editor=row.getByLabel('후보 문장 수정',{exact:true});await editor.fill(`${c.text} `);assert(await row.getByRole('button',{name:'승인하여 담기 ＋',exact:true}).isDisabled());await editor.fill(c.text);await row.locator('input[type=checkbox]').check();report.candidateEditRequiresReapproval=true;}
  await row.getByRole('button',{name:'승인하여 담기 ＋',exact:true}).click();assert.equal(await p.locator('article.approved').count(),1);
  if(n===1){await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.screenshot({path:`${dir}/live-mobile.png`,fullPage:true});await p.setViewportSize({width:1440,height:1000});}
  await saveCheckpoint('progress-work');
  report.batches.push({reusedPriorApproved:reused,candidates:data.candidates.length,eligible:accepted.length,flagged:data.candidates.length-accepted.length,totalMs:Math.round(performance.now()-started),approvedByTestTeacher:1});
 }
 await p.getByRole('button',{name:'조합 · XLSX 내보내기',exact:true}).click();await p.locator('.selection input').first().check();await p.locator('.selection input').nth(1).check();const combined=approved.join(' ');assert.equal(await p.locator('article.approved p').innerText(),combined);await p.locator('article.approved').getByRole('button',{name:'복사',exact:true}).click();assert.equal(await p.evaluate(()=>navigator.clipboard.readText()),combined);
 let event=p.waitForEvent('download');await p.getByRole('button',{name:'XLSX 다운로드 ↓',exact:true}).click();await(await event).saveAs(`${dir}/approved.xlsx`);const book=new ExcelJS.Workbook();await book.xlsx.readFile(`${dir}/approved.xlsx`);assert.equal(book.worksheets[0].getCell('A3').value,approved[0]);assert.equal(book.worksheets[0].getCell('C3').value,approved[1]);assert.equal(book.worksheets[1].getCell('B2').value,combined);
 event=p.waitForEvent('download');await p.getByRole('button',{name:'↓ 작업 파일 저장',exact:true}).click();await(await event).saveAs(`${dir}/work.json`);const work=JSON.parse(await readFile(`${dir}/work.json`,'utf8'));assert.equal(work.items.reduce((n,i)=>n+i.approved.length,0),2);assert.equal(work.sources[0].data,source.data);report.pdfBytesSaved=true;
 const restored=await context.newPage();await restored.goto(base);await restored.locator('input[accept=".json"]').setInputFiles(`${dir}/work.json`);await restored.locator('canvas').first().waitFor();assert.equal(await restored.locator('.source-file').count()>0||await restored.locator('canvas').count()>0,true);await restored.getByRole('button',{name:'문장 작업으로 이동 →',exact:true}).click();report.pdfRestored=true;
 for(let n=0;n<2;n++){await restored.locator('.sidebar .item').nth(n).click();assert.equal(await restored.getByLabel('실제 교육활동',{exact:true}).inputValue(),cases[0].actual);assert.equal(await restored.locator('article.approved').count(),0);const row=restored.locator('.sentence').first();assert(await row.getByRole('button',{name:'승인하여 담기 ＋',exact:true}).isDisabled());await row.locator('input[type=checkbox]').check();await row.getByRole('button',{name:'승인하여 담기 ＋',exact:true}).click();assert.equal(await restored.locator('article.approved').count(),1);}
 await restored.setViewportSize({width:390,height:844});assert.equal(await restored.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await restored.screenshot({path:`${dir}/restored-mobile.png`,fullPage:true});
 assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.consoleErrors,[]);report.ok=true;report.xlsxReopened=true;report.clipboardMatched=true;report.restoredReapproval=true;
}finally{report.finishedAt=new Date().toISOString();await writeFile(`${dir}/result.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();}
