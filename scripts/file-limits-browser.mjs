// Real files, actual PDF.js, downloads and restoration. No live model calls.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {checkAiState} from './check-ai-state.mjs';
import {blankItem} from '../lib/core.mjs';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright/index.mjs').href);
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3006',dir=process.env.TEST_OUTPUT_DIR||'tmp/file-limits-local',fixtures='tmp/file-limit-fixtures';
await mkdir(dir,{recursive:true});
const proxy=['127.0.0.1','localhost'].includes(new URL(base).hostname)?undefined:{server:process.env.HTTPS_PROXY};
const browser=await chromium.launch({headless:true,proxy,executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium'});
const context=await browser.newContext({proxy,acceptDownloads:true,viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});
context.setDefaultTimeout(180000);
const report={ok:false,base,browser:browser.version(),cases:[],pageErrors:[],consoleErrors:[],warnings:[],memory:[],liveModelCalls:0,blockedGenerationPosts:0};
await context.route('**/api/generate',r=>r.request().method()==='POST'?(report.blockedGenerationPosts++,r.abort()):r.continue());
const hash=async path=>{const h=createHash('sha256');for await(const bytes of createReadStream(path))h.update(bytes);return h.digest('hex');};
async function timed(name,fn){if(process.env.TEST_CASES&&!new RegExp(process.env.TEST_CASES).test(name))return;const start=performance.now();const result=await fn();report.cases.push({name,seconds:+((performance.now()-start)/1000).toFixed(2),...result});console.log(JSON.stringify(report.cases.at(-1)));}
async function page(){const p=await context.newPage();p.on('pageerror',e=>report.pageErrors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());if(m.type()==='warning')report.warnings.push(m.text());});await p.goto(base);await p.evaluate(()=>{window.fileReads=[];for(const method of ['text','arrayBuffer']){const read=File.prototype[method];File.prototype[method]=function(...args){window.fileReads.push({name:this.name,method});return read.apply(this,args);};}});return p;}
const ready=p=>p.waitForFunction(()=>document.querySelector('.pdf-upload')?.getAttribute('aria-busy')==='false');
const status=(p,text)=>p.locator('.notice[role=status]').filter({hasText:text}).waitFor();
async function load(p,file){await p.locator('input[accept=".json"]').setInputFiles(file);await status(p,'작업을 추가로 불러왔습니다.');await ready(p);}
async function save(p,name){const event=p.waitForEvent('download');await p.getByRole('button',{name:'↓ 작업 파일 저장',exact:true}).click();const file=`${dir}/${name}.json`;await(await event).saveAs(file);await ready(p);return file;}
async function pdf(p,file,drop=false){
 if(!drop)await p.locator('input[accept=".pdf"]').setInputFiles(file);
 else{
  const temp=await p.evaluateHandle(()=>{const el=document.createElement('input');el.type='file';el.id='test-drop-source';document.body.append(el);return el;});
  await temp.asElement().setInputFiles(file);
  await p.evaluate(()=>{const input=document.getElementById('test-drop-source'),dt=new DataTransfer();dt.items.add(input.files[0]);document.querySelector('.pdf-upload').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));input.remove();});
 }
}
async function rendered(p){await p.locator('.pdf-preview canvas:visible').waitFor();await p.waitForFunction(()=>!document.querySelector('.pdf-preview [role=status]'));}
async function memory(p,label){try{const cdp=await context.newCDPSession(p);report.memory.push({label,...await cdp.send('Runtime.getHeapUsage')});await cdp.detach();}catch(e){report.memory.push({label,unavailable:e.message});}}
async function sourceSummary(file){const w=JSON.parse(await readFile(file,'utf8'));const value={bytes:(await stat(file)).size,sources:w.sources.map(s=>({name:s.name,base64Characters:s.data.length,pdfBytes:Buffer.byteLength(s.data,'base64'),sha256:createHash('sha256').update(Buffer.from(s.data,'base64')).digest('hex')})),items:w.items.length,excluded:w.items.filter(i=>i.included===false).length};return value;}
try{
 for(const [name,drop] of [['pdf-17',false],['pdf-17',true],['pdf-exact',false],['pdf-exact',true],['pdf-minus',false]])await timed(`${name}-${drop?'drop':'picker'}-extract-preview-save-restore`,async()=>{
  const p=await page(),file=`${fixtures}/${name}.pdf`;if(name==='pdf-exact'&&drop)await p.setViewportSize({width:390,height:844});
  await pdf(p,file,drop);await status(p,'2개 평가 항목을 추출했습니다.');await ready(p);await rendered(p);
  assert.equal((await p.evaluate(()=>window.fileReads)).filter(r=>r.method==='arrayBuffer').length,1);
  const saved=await save(p,`${name}-${drop?'drop':'picker'}`),summary=await sourceSummary(saved);
  assert.equal(summary.sources[0].sha256,await hash(file));
  await memory(p,`${name}-saved`);await p.close();
  const q=await page();if(name==='pdf-exact'&&drop)await q.setViewportSize({width:390,height:844});await load(q,saved);await rendered(q);
  const restored=await save(q,`${name}-${drop?'drop':'picker'}-restored`);assert.deepEqual((await sourceSummary(restored)).sources,summary.sources);
  for(const width of [1440,390]){await q.setViewportSize({width,height:844});assert.equal(await q.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(name==='pdf-exact'&&drop)await q.screenshot({path:`${dir}/exact-restored-${width}.png`,fullPage:true});}
  await q.close();return {pdfBytes:(await stat(file)).size,savedBytes:summary.bytes,oneFileRead:true,sourceHashPreserved:true};
 });
 for(const name of ['minus','exact'])await timed(`work-200MB-${name}-open-save-reopen-resave`,async()=>{
  const input=`${fixtures}/work-${name}.json`,p=await page();if(name==='exact')await p.setViewportSize({width:390,height:844});await load(p,input);await rendered(p);await memory(p,`${name}-200MB-open`);
  const output=await save(p,`200MB-${name}`),summary=await sourceSummary(output);assert.equal(summary.bytes,(await stat(input)).size);assert.equal(summary.sources.length,3);assert.equal(summary.excluded,1);
  await p.close();const q=await page();if(name==='exact')await q.setViewportSize({width:390,height:844});await load(q,output);await rendered(q);const again=await save(q,`200MB-${name}-resaved`);assert.deepEqual(await sourceSummary(again),summary);await q.close();
  return {inputBytes:(await stat(input)).size,savedBytes:summary.bytes,pdfOriginalBytes:summary.sources.reduce((n,s)=>n+s.pdfBytes,0),utf8KoreanMetadata:true};
 });
 await timed('legacy-v1-reapproval-and-invalid-base64-provenance-retry',async()=>{
  const p=await page(),sentence='낱말을 소리 내어 읽는 활동을 수행함.';
  const item={...blankItem(),element:'낱말 읽기',actual:'낱말을 소리 내어 읽었다.',example:sentence,approved:[{text:sentence,level:'잘함'}]};
  const legacy=`${dir}/legacy.json`;await writeFile(legacy,JSON.stringify({version:1,items:[item],examples:[]}));await load(p,legacy);
  await p.getByRole('button',{name:'선택한 평가계획 확정 →',exact:true}).click();assert.equal(await p.locator('article.approved').count(),0);assert.equal(await p.locator('.candidate-row').count(),1);assert.equal(await p.locator('.bulk-confirm input').isChecked(),false);
  await p.locator('.bulk-confirm input').check();await p.getByRole('button',{name:'전체 문장 승인',exact:true}).click();assert.equal(await p.locator('article.approved').count(),1);await p.locator('.steps button').first().click();
  const beforeHash=await hash(await save(p,'legacy-approved'));
  const source={id:'source',name:'synthetic.pdf',data:(await readFile('tmp/pdf-drop-fixtures/supported.pdf')).toString('base64'),pages:[{page:1,text:'합성 원문'}]};
  const raw={version:2,items:[{...blankItem(),sourceId:source.id,page:1}],sources:[source],examples:[]};
  for(const [name,value] of [['base64',{...raw,sources:[{...source,data:source.data.slice(0,-4)+'AB=='}]}],['header',{...raw,sources:[{...source,data:Buffer.from('not a PDF').toString('base64')}]}],['page',{...raw,items:[{...raw.items[0],page:2}]}],['source',{...raw,items:[{...raw.items[0],sourceId:'missing'}]}]]){
   const file=`${dir}/invalid-${name}.json`;await writeFile(file,JSON.stringify(value));await p.locator('input[accept=".json"]').setInputFiles(file);await status(p,'형식 또는 PDF 출처');assert.equal(await hash(await save(p,`after-invalid-${name}`)),beforeHash);
  }
  await p.close();return {version1RestoredAndReapproved:true,invalidBase64HeaderPageSourceRejected:true,existingApprovalPreserved:true};
 });
 await timed('oversize-inputs-block-before-read',async()=>{
  const p=await page();
  for(const drop of [false,true]){await pdf(p,`${fixtures}/pdf-over.pdf`,drop);await status(p,'50MB 이하');await ready(p);}
  await p.locator('input[accept=".json"]').setInputFiles(`${fixtures}/work-over.json`);await status(p,'200MB 이하');await ready(p);
  assert.deepEqual(await p.evaluate(()=>window.fileReads),[]);assert.equal(await p.locator('input[accept=".json"]').inputValue(),'');assert.equal(await p.locator('input[accept=".pdf"]').inputValue(),'');
  await p.setViewportSize({width:390,height:844});await p.screenshot({path:`${dir}/oversize-mobile.png`,fullPage:true});await p.close();return {pdfBytes:52428801,workBytes:209715201,reads:0};
 });
 await timed('aggregate-overflow-and-parse-failures-preserve-approved-candidate-confirmation-selection-plan',async()=>{
  const p=await page();await load(p,`${fixtures}/work-near.json`);await p.getByRole('button',{name:'문장 작업으로 이동 →',exact:true}).click();
  const sentence='낱말을 소리 내어 읽는 활동을 수행함.';
  await p.getByLabel('실제 교육활동',{exact:true}).fill('낱말을 소리 내어 읽었다.');await p.getByLabel('참고 예시문장',{exact:true}).fill(sentence);
  await p.getByLabel('검토할 문장',{exact:true}).fill(sentence);await p.getByRole('button',{name:'후보에 추가',exact:true}).click();await p.locator('.bulk-confirm input').check();await p.getByRole('button',{name:'전체 문장 승인',exact:true}).click();assert.equal(await p.locator('article.approved').count(),1);
  await p.getByLabel('검토할 문장',{exact:true}).fill('낱말을 함께 읽는 활동에 참여함.');await p.getByRole('button',{name:'후보에 추가',exact:true}).click();await p.locator('.bulk-confirm input').check();
  await p.getByRole('button',{name:'조합 · XLSX 내보내기',exact:true}).click();await p.locator('.selection input').first().check();
  await p.locator('.steps button').first().click();
  const before=await save(p,'atomic-before'),beforeHash=await hash(before);assert((await stat(before)).size>40*1024*1024);
  const verify=async name=>{await ready(p);const saved=await save(p,`atomic-${name}`);assert.equal(await hash(saved),beforeHash);assert.equal(await p.getByRole('button',{name:'문장 작업으로 이동 →',exact:true}).count(),1);};
  await pdf(p,`${fixtures}/pdf-17.pdf`,true);await status(p,'200MB 이하');await verify('pdf-overflow');
  await p.locator('input[accept=".json"]').setInputFiles(`${dir}/pdf-17-picker.json`);await status(p,'200MB 이하');await verify('merge-overflow');
  await writeFile(`${dir}/bad.json`,'{"version":');await p.locator('input[accept=".json"]').setInputFiles(`${dir}/bad.json`);await status(p,'형식 또는 PDF 출처');await verify('parse');
  for(let n=0;n<2;n++){await p.locator('input[accept=".json"]').setInputFiles(`${fixtures}/embedded-over.json`);await status(p,'50MB 이하');await verify(`embedded-over-${n}`);}
  await p.locator('.steps button').nth(1).click();await p.locator('.work-tabs button').first().click();assert.equal(await p.locator('article.approved').count(),1);assert.equal(await p.locator('.candidate-row').count(),1);assert.equal(await p.locator('.bulk-confirm input').isChecked(),true);
  await memory(p,'aggregate-failure-recovered');await p.close();return {existingBytes:(await stat(before)).size,pdfAndMergeRejected:true,sameFileRetry:true,fullSavedStateHashPreserved:true,approvalAndAckPreserved:true};
 });
 report.api=await checkAiState(context,base);assert.equal(report.blockedGenerationPosts,0);assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.consoleErrors,[]);report.ok=true;
}catch(error){report.failure={name:error.name,message:error.message};throw error;}
finally{await writeFile(`${dir}/result.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
