import {verifiedBrowserTransport} from './verified-browser-transport.mjs';
// Synthetic fixtures. REAL_PUBLIC_AI=1 sends exactly two real public batches;
// no successful result is retried. Optional teacher fixture decisions are read
// after response inspection; they never change model review flags or auto-approve.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import ExcelJS from 'exceljs';
import {blankItem} from '../lib/core.mjs';
import {assertDistribution} from '../lib/batch.mjs';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright/index.mjs').href);
const real=process.env.REAL_PUBLIC_AI==='1',base=process.env.TEST_BASE_URL||'http://127.0.0.1:3006',dir=process.env.TEST_OUTPUT_DIR||'tmp/input-readiness';
if(real)assert.equal(base,'https://pyeoneo-studio.vercel.app');
await mkdir(dir,{recursive:true});
const proxy=new URL(base).hostname==='127.0.0.1'?undefined:{server:process.env.HTTPS_PROXY};
const browser=await chromium.launch({headless:true,proxy,executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium'});
const ctx=await browser.newContext({proxy,viewport:{width:1440,height:900},acceptDownloads:true,permissions:['clipboard-read','clipboard-write']});
await verifiedBrowserTransport(ctx,base);
const levels=[{id:'high',name:'성취 단계',description:'스스로 정확하게 읽고 자세하게 발표함.'},{id:'low',name:'참여 단계',description:'교사의 도움을 받아 참여함.'},{id:'zero',name:'추가 확인',description:''}];
const seed={version:2,items:['읽기','독서 활동'].map((actual,n)=>({...blankItem(),subject:'국어',element:actual,actual,example:'',levels,generationCounts:{high:'1',low:n?'1':'0',zero:'0'},target:120,candidates:[{text:n?'독서 활동을 함.':'읽는 활동에 참여함.',level:'성취 단계',levelId:'high'}]})),examples:[],sources:[],planConfirmed:true};
const report={realPublicModel:real,mocked:!real,posts:0,emptyPosts:0,batches:[],pageErrors:[],consoleErrors:[],ok:false};
const p=await ctx.newPage();p.on('pageerror',e=>report.pageErrors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
let batchIndex=0;
await p.route('**/api/generate',async r=>{
 if(r.request().method()==='GET')return real?r.fallback():r.fulfill({json:{enabled:true,mode:'public'}});
 report.posts++;const input=r.request().postDataJSON();
 if(real){if(batchIndex===1){delete input.example;return r.fallback({postData:JSON.stringify(input)});}return r.fallback();}
 return r.fulfill({json:{candidates:input.levels.flatMap(l=>Array.from({length:l.count},(_,n)=>({text:`${input.actual} 표현 ${l.id}-${n}임.`,levelId:l.id,evidence:[input.actual],errors:['검토 지적 fixture'],semanticPass:false}))),reasons:[]}});
});
const bulk=()=>p.locator('.bulk-confirm input'),approve=()=>p.getByRole('button',{name:'전체 문장 승인',exact:true}),actual=()=>p.getByLabel('실제 교육활동',{exact:true});
async function save(name){const event=p.waitForEvent('download');await p.getByRole('button',{name:'↓ 작업 파일 저장',exact:true}).click();await(await event).saveAs(`${dir}/${name}.json`);return JSON.parse(await readFile(`${dir}/${name}.json`,'utf8'));}
async function load(raw){const page=await ctx.newPage();await page.goto(base);await page.locator('input[accept=".json"]').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(raw))});await page.getByRole('button',{name:raw.version===1?'선택한 평가계획 확정 →':'문장 작업으로 이동 →',exact:true}).click();return page;}
try{
 await p.goto(base);await p.locator('input[accept=".json"]').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(seed))});await p.getByRole('button',{name:'문장 작업으로 이동 →',exact:true}).click();
 for(batchIndex=0;batchIndex<2;batchIndex++){
  if(batchIndex)await p.locator('.sidebar .item').nth(1).click();
  await p.setViewportSize({width:batchIndex?390:1440,height:900});
  // Preview/copy does not commit facts or overwrite without confirmation.
  const before=await actual().inputValue();await p.getByRole('button',{name:'예시 만들기',exact:true}).click();assert.equal(await p.locator('.input-example').count(),2);assert.equal(await actual().inputValue(),before);
  p.once('dialog',d=>d.dismiss());await p.getByRole('button',{name:'실제 교육활동 예시 복사',exact:true}).click();assert.equal(await actual().inputValue(),before);
  p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'실제 교육활동 예시 복사',exact:true}).click();await actual().fill(seed.items[batchIndex].actual);
  await p.getByRole('button',{name:'참고 예시문장 복사',exact:true}).click();await p.getByLabel('참고 예시문장',{exact:true}).fill('');
  if(batchIndex===0){
   for(const blank of ['', ' ', '\t', '\n']){await actual().fill(blank);const before=await save(`blank-before-${report.emptyPosts}`),posts=report.posts;await p.getByRole('button',{name:'AI 후보 1개 생성',exact:true}).click();await p.locator('.generation-result').filter({hasText:'실제 교육활동을 입력해 주세요.'}).waitFor();assert.equal(report.posts,posts);assert.deepEqual((await save(`blank-after-${report.emptyPosts}`)).items,before.items);report.emptyPosts++;}
   await actual().fill(seed.items[batchIndex].actual);
  }
  // Establish existing approval and a candidate to prove generation preserves both.
  await p.locator('.candidate-row').first().locator('textarea').fill(batchIndex?'독서 활동에 참여함.':'읽는 활동을 함.');await bulk().check();await approve().click();assert.equal(await p.locator('article.approved').count(),1);
  await p.getByLabel('검토할 문장',{exact:true}).fill('보존할 기존 후보임.');await p.getByRole('button',{name:'후보에 추가',exact:true}).click();
  const beforeWork=await save(`before-${batchIndex}`),item=beforeWork.items[batchIndex],n=batchIndex?2:1;
  const wait=p.waitForResponse(r=>r.url()===base+'/api/generate'&&r.request().method()==='POST',{timeout:300000});await p.getByRole('button',{name:`AI 후보 ${n}개 생성`,exact:true}).click();const response=await wait,data=await response.json();
  await writeFile(`${dir}/response-${batchIndex}.json`,JSON.stringify(data,null,2));const request=response.request().postDataJSON();
  assert.equal(response.status(),200,JSON.stringify(data));assertDistribution(data.candidates,request.levels);
  await p.locator('.generation-result').filter({hasText:`새 후보 ${n}개를 목록에 추가했습니다.`}).waitFor();assert.equal(await p.locator('.candidate-row[data-new=true]').count(),n);assert.equal(await p.locator('.candidate-row').count(),n+1);assert.equal(await p.locator('article.approved').count(),1);assert.equal(await bulk().isChecked(),false);
  assert.equal(await p.locator('.candidate-row .muted,.candidate-row .error,.candidate-row .warning').count(),0);
  const added=await save(`generated-${batchIndex}`),after=added.items[batchIndex];assert.deepEqual(after.approved,item.approved);assert.deepEqual(after.candidates[0],item.candidates[0]);
  const result={actual:request.actual,exampleField:request.example===undefined?'omitted':request.example,requested:request.levels.map(l=>l.count),response:data.candidates.length,screenNew:n,screenTotal:n+1,distribution:request.levels.map(l=>data.candidates.filter(c=>c.levelId===l.id).length),semanticPassed:data.candidates.filter(c=>c.semanticPass&&!c.errors.length).length,http:response.status(),vercelRequestId:response.headers()['x-vercel-id']};report.batches.push(result);
  const flagged=data.candidates.some(c=>!c.semanticPass||c.errors.length);if(flagged){await bulk().check();await approve().click();assert.equal(await p.locator('article.approved').count(),1);assert.equal(await p.locator('.candidate-row').count(),n+1);}
  await p.locator('.candidate-row').first().getByRole('button',{name:'삭제',exact:true}).click();
  let edits;
  if(real){console.log(JSON.stringify({fixtureReviewRequired:true,index:batchIndex,response:`${dir}/response-${batchIndex}.json`,gate:`${dir}/teacher-${batchIndex}.json`}));let ready=false;for(let k=0;k<1800;k++){try{await access(`${dir}/teacher-${batchIndex}.json`);ready=true;break;}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready);const decision=JSON.parse(await readFile(`${dir}/teacher-${batchIndex}.json`,'utf8'));assert.equal(decision.approved,true);edits=decision.edits;}
  else edits=batchIndex?[{index:0,text:'독서 활동을 수행함.'},{index:1,text:'독서 활동에 참여한 기록임.'}]:[{index:0,text:'읽기 활동을 수행함.'}];
  for(const edit of edits||[])await p.locator('.candidate-row').nth(edit.index).locator('textarea').fill(edit.text);
  // Synthetic fixture teacher approval is an explicit UI operation after inspection.
  await bulk().check();await approve().click();assert.equal(await p.locator('article.approved').count(),n+1);result.fixtureEdits=edits?.length||0;result.approved=n+1;
  assert.equal(await p.getByLabel('참고 예시문장',{exact:true}).inputValue(),'');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.screenshot({path:`${dir}/approved-${batchIndex}.png`,fullPage:true});
 }
 const work=await save('work');await p.getByRole('button',{name:'조합 · XLSX 내보내기',exact:true}).click();await p.locator('.selection input').first().check();await p.locator('.selection input').nth(1).check();
 const combined=work.items.map(i=>i.approved[0].text).join(' ');assert.equal(await p.locator('article.approved').first().locator('p').innerText(),combined);await p.locator('article.approved').first().getByRole('button',{name:'복사',exact:true}).click();assert.equal(await p.evaluate(()=>navigator.clipboard.readText()),combined);
 const event=p.waitForEvent('download');await p.getByRole('button',{name:'XLSX 다운로드 ↓',exact:true}).click();await(await event).saveAs(`${dir}/approved.xlsx`);const book=new ExcelJS.Workbook();await book.xlsx.readFile(`${dir}/approved.xlsx`);const cells=[];book.eachSheet(s=>s.eachRow(r=>r.eachCell(c=>cells.push(c.value))));for(const i of work.items)for(const c of i.approved)assert(cells.includes(c.text));
 for(const version of [1,2]){const restored=await load({...work,version});assert.equal(await restored.locator('article.approved').count(),0);assert.equal(await restored.locator('.bulk-confirm input').isChecked(),false);await restored.locator('.sidebar .item').nth(1).click();assert.equal(await restored.getByLabel('참고 예시문장',{exact:true}).inputValue(),'');await restored.locator('.bulk-confirm input').check();await restored.getByRole('button',{name:'전체 문장 승인',exact:true}).click();assert.equal(await restored.locator('article.approved').count(),3);await restored.close();}
 report.combinationCopyXlsxRestore=true;assert.equal(report.posts,2);assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.consoleErrors,[]);report.ok=true;
}finally{report.finishedAt=new Date().toISOString();await writeFile(`${dir}/result.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();}
