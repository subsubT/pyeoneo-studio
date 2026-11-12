// Continue verification from already generated/reviewed work. No model POST is permitted.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import ExcelJS from 'exceljs';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright/index.mjs').href);
const base=process.env.TEST_BASE_URL||'https://pyeoneo-studio.vercel.app',dir=process.env.TEST_OUTPUT_DIR||'tmp/batch-output';await mkdir(dir,{recursive:true});
const work=JSON.parse(await readFile(process.env.TEST_RESUME_WORK||'tmp/batch-public-schema/work.json','utf8'));
const proxy={server:process.env.HTTPS_PROXY},browser=await chromium.launch({headless:true,proxy,executablePath:'/usr/bin/chromium'}),ctx=await browser.newContext({proxy,viewport:{width:1440,height:1000},acceptDownloads:true,permissions:['clipboard-read','clipboard-write']});
let posts=0;await ctx.route('**/api/generate',r=>r.request().method()==='POST'?(posts++,r.abort()):r.continue());
const report={ok:false,realModelCalls:0,reusedReviewedWork:true,errors:[]};
async function load(raw){const p=await ctx.newPage();p.on('pageerror',e=>report.errors.push(e.message));await p.goto(base);await p.locator('input[accept=".json"]').setInputFiles({name:'reviewed.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(raw))});await p.getByRole('button',{name:'문장 작업으로 이동 →',exact:true}).click();return p;}
try{
 const p=await load(work),approved=[];
 for(let index=0;index<work.items.length;index++){
  await p.locator('.sidebar .item').nth(index).click();const expected=[...work.items[index].approved,...work.items[index].candidates];
  assert.equal(await p.locator('.candidate-row').count(),expected.length);assert.equal(await p.locator('article.approved').count(),0);assert.equal(await p.locator('.bulk-confirm input').isChecked(),false);
  assert.deepEqual(await p.locator('.candidate-row textarea').evaluateAll(es=>es.map(e=>e.value)),expected.map(c=>c.text));
  await p.locator('.bulk-confirm input').check();await p.getByRole('button',{name:'전체 문장 승인',exact:true}).click();assert.equal(await p.locator('article.approved').count(),expected.length);approved.push(expected);
 }
 for(const width of [1440,390]){await p.setViewportSize({width,height:900});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.screenshot({path:`${dir}/approved-${width}.png`,fullPage:true});}
 await p.getByRole('button',{name:'조합 · XLSX 내보내기',exact:true}).click();await p.locator('.selection input').first().check();await p.locator('.selection input').nth(1).check();const combined=approved.map(a=>a[0].text).join(' ');assert.equal(await p.locator('article.approved').first().locator('p').innerText(),combined);await p.locator('article.approved').first().getByRole('button',{name:'복사',exact:true}).click();assert.equal(await p.evaluate(()=>navigator.clipboard.readText()),combined);
 const event=p.waitForEvent('download');await p.getByRole('button',{name:'XLSX 다운로드 ↓',exact:true}).click();await(await event).saveAs(`${dir}/approved.xlsx`);const book=new ExcelJS.Workbook();await book.xlsx.readFile(`${dir}/approved.xlsx`);const cells=[];book.eachSheet(s=>s.eachRow(r=>r.eachCell(c=>cells.push(c.value))));for(const group of approved)for(const c of group)assert(cells.includes(c.text));
 const capItem={...work.items[0],approved:[],candidates:Array.from({length:119},(_,n)=>({text:`보관 문장 ${n} 있음.`,level:work.items[0].levels[0].name,levelId:work.items[0].levels[0].id})),generationCounts:Object.fromEntries(work.items[0].levels.map((l,n)=>[l.id,n?'0':'2']))};
 const cap=await load({...work,items:[capItem],activeItemId:capItem.id,combinationIds:[]});await cap.getByRole('button',{name:'AI 후보 2개 생성',exact:true}).click();await cap.getByRole('status').filter({hasText:'보관 한도 120개'}).waitFor();assert.equal(await cap.locator('.candidate-row').count(),119);assert.equal(posts,0);
 report.restoredAndReapproved=approved.map(a=>a.length);report.xlsxReopened=true;report.combinationAndClipboard=true;report.capacityBeforeTransport=true;report.naturalEndings=approved.flat().some(c=>c.text.endsWith('있음.'));assert.deepEqual(report.errors,[]);report.ok=true;
}finally{await writeFile(`${dir}/result.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();}
