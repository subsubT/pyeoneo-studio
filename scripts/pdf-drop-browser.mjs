// Real DataTransfer/File events + real parser. No API/candidate mocks or live AI.
// Generate non-identifying fixtures with create-drop-fixtures.py before running.
import assert from 'node:assert/strict';
import {checkAiState} from './check-ai-state.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import ExcelJS from 'exceljs';
import {blankItem,LEVELS} from '../lib/core.mjs';
import {serializeProject} from '../lib/restore.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3010',dir=process.env.TEST_OUTPUT_DIR||'tmp/pdf-drop-local',fixtures=process.env.TEST_FIXTURE_DIR||'tmp/pdf-drop-fixtures';
await mkdir(dir,{recursive:true});
const bytes=await readFile(`${fixtures}/supported.pdf`),supported={name:'supported.pdf',mimeType:'application/pdf',buffer:bytes};
const proxy=['localhost','127.0.0.1'].includes(new URL(base).hostname)?undefined:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined;
const browser=await chromium.launch({headless:true,proxy,executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium'});
const errors=[],warnings=[],results=[];
try{
 const context=await browser.newContext({proxy,acceptDownloads:true,viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write']});
 const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text())});};
 const page=async()=>{const p=await context.newPage();watch(p);await p.goto(base);return p;};
 const input=p=>p.getByLabel('평가계획 PDF 선택',{exact:true}),card=p=>p.locator('.pdf-upload');
 const rendered=async p=>p.waitForFunction(()=>{const c=document.querySelector('.pdf-preview canvas');return c&&!(c.width===300&&c.height===150)&&!c.hidden&&!document.querySelector('.pdf-preview [role=status]');});
 const ready=async p=>{await p.waitForFunction(()=>!document.querySelector('.pdf-upload')||document.querySelector('.pdf-upload').getAttribute('aria-busy')==='false');};
 const extracted=async(p,count)=>{await p.waitForFunction(n=>document.querySelectorAll('.plan-table tbody tr').length===n,count);await ready(p);};
 const save=async(p,name)=>{const pending=p.waitForEvent('download');await p.getByRole('button',{name:'↓ 작업 파일 저장',exact:true}).click();await(await pending).saveAs(`${dir}/${name}.json`);await ready(p);return JSON.parse(await readFile(`${dir}/${name}.json`,'utf8'));};
 const normalize=w=>({...w,sources:w.sources.map(({id,...s})=>s),items:w.items.map(({id,sourceId,...i})=>({...i,sourceIndex:w.sources.findIndex(s=>s.id===sourceId)})),activeItemId:w.items.findIndex(i=>i.id===w.activeItemId),combinationIds:w.combinationIds.map(id=>w.items.findIndex(i=>i.id===id))});
 async function drop(p,files=[supported]){
  const specs=files.map(f=>({name:f.name,type:f.mimeType??'',data:f.buffer.toString('base64')}));
  const prevented=await card(p).evaluate((el,specs)=>{const dt=new DataTransfer();for(const f of specs)dt.items.add(new File([Uint8Array.from(atob(f.data),c=>c.charCodeAt(0))],f.name,{type:f.type}));const over=new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt});el.dispatchEvent(over);const event=new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt});el.dispatchEvent(event);return {over:over.defaultPrevented,drop:event.defaultPrevented};},specs);
  assert.deepEqual(prevented,{over:true,drop:true});assert.equal(p.url(),base+'/');
 }
 const selected=await page();await input(selected).focus();let chooser=selected.waitForEvent('filechooser');await selected.keyboard.press('Space');await(await chooser).setFiles(supported);await extracted(selected,2);
 const choiceWork=await save(selected,'selected');
 assert.deepEqual(choiceWork.items.map(i=>i.element),['낱말 읽기','문장 읽기']);
 for(const i of choiceWork.items){assert.equal(i.actual,'');assert.equal(i.confirmed,undefined);assert.equal(i.page,1);assert.equal(i.sourceId,choiceWork.sources[0].id);for(const l of LEVELS)assert(i.criteria.includes(l+': 합'));}
 await rendered(selected);const canvas=async p=>createHash('sha256').update(await p.locator('.pdf-preview canvas').evaluate(c=>c.toDataURL())).digest('hex');const selectedCanvas=await canvas(selected);
 const p=await page();await card(p).dispatchEvent('dragenter',{dataTransfer:await p.evaluateHandle(()=>{const d=new DataTransfer();d.items.add(new File(['x'],'x.pdf'));return d})});await drop(p);assert(!await card(p).evaluate(e=>e.classList.contains('dragging')));await extracted(p,2);await rendered(p);await selected.locator('.pdf-preview').screenshot({path:`${dir}/selected-preview.png`});await p.locator('.pdf-preview').screenshot({path:`${dir}/dropped-preview.png`});assert.deepEqual(await p.locator('.pdf-preview canvas').evaluate(c=>[c.width,c.height]),await selected.locator('.pdf-preview canvas').evaluate(c=>[c.width,c.height]));
 assert.deepEqual(normalize(await save(p,'dropped')),normalize(choiceWork));
 const selectDrag=await selected.evaluateHandle(()=>{const d=new DataTransfer();d.items.add(new File(['x'],'x.pdf'));return d});await card(selected).dispatchEvent('dragenter',{dataTransfer:selectDrag});await input(selected).setInputFiles(supported);await extracted(selected,4);assert(!await card(selected).evaluate(e=>e.classList.contains('dragging')));await selectDrag.dispose();assert.equal((await save(selected,'same-file-again')).sources.length,2);
 results.push('keyboard file chooser and real drop have identical extracted rows, four levels, raw text, pages, PDF bytes, source links and rendered preview dimensions/visuals; same-file selection works');
 // Nested drag events must retain highlighting until the whole card is left.
 const dt=await p.evaluateHandle(()=>{const d=new DataTransfer();d.items.add(new File(['x'],'x.pdf',{type:'application/pdf'}));return d});
 await card(p).dispatchEvent('dragenter',{dataTransfer:dt});assert(await card(p).evaluate(e=>e.classList.contains('dragging')));
 await card(p).locator('strong').dispatchEvent('dragenter',{dataTransfer:dt});await card(p).locator('strong').dispatchEvent('dragleave',{dataTransfer:dt});assert(await card(p).evaluate(e=>e.classList.contains('dragging')));
 await p.screenshot({path:`${dir}/drag-desktop.png`});await card(p).dispatchEvent('dragleave',{dataTransfer:dt});assert(!await card(p).evaluate(e=>e.classList.contains('dragging')));await dt.dispose();
 assert.equal(await p.locator('body').evaluate(el=>{const e=new DragEvent('dragover',{bubbles:true,cancelable:true});el.dispatchEvent(e);return e.defaultPrevented}),false);
 // Build existing approvals and an excluded item through the UI.
 await p.getByRole('button',{name:'＋ 누락 항목 직접 추가',exact:true}).click();await p.getByLabel('평가 요소',{exact:true}).fill('제외할 보관 항목');await p.getByRole('checkbox',{name:'이 항목 사용',exact:true}).uncheck();
 await p.getByRole('button',{name:'선택한 평가계획 확정 →',exact:true}).click();
 const sentences=['낱말을 소리 내어 읽는 활동을 수행함.','문장을 소리 내어 읽는 활동에 참여함.'];
 async function approve(index,text){await p.locator('.sidebar .item').nth(index).click();await p.getByLabel('실제 교육활동',{exact:true}).fill(text.replace(/함\.$/,'했다.'));await p.getByLabel('참고 예시문장',{exact:true}).fill(text);assert.equal(await p.getByRole('checkbox',{name:'실제 수행한 활동과 확인된 성취임을 확인했습니다.',exact:true}).count(),0);await p.getByLabel('검토할 문장',{exact:true}).fill(text);await p.getByRole('button',{name:'후보에 추가',exact:true}).click();assert.equal(await p.locator('.bulk-confirm input').isChecked(),false);await p.locator('.bulk-confirm input[type=checkbox]').check();await p.getByRole('button',{name:'전체 문장 승인',exact:true}).click();}
 await approve(0,sentences[0]);await approve(1,sentences[1]);await p.getByRole('button',{name:'← 평가계획 수정 · 선택',exact:true}).click();const before=await save(p,'before-errors');
 const failures=[['not-pdf.txt',/올바른 PDF/],['corrupt.pdf',/Invalid PDF|PDF.*올바르|PDF.*손상/],['too-many-pages.pdf',/30쪽 이하/]];
 for(const [name,pattern]of failures){await drop(p,[{name,mimeType:'application/pdf',buffer:await readFile(`${fixtures}/${name}`)}]);await p.getByRole('status').filter({hasText:pattern}).waitFor();await ready(p);assert.deepEqual(await save(p,`after-${name}`),before);}
 await drop(p,[{name:'huge.pdf',buffer:Buffer.alloc(10*1024*1024+1)}]);await p.getByRole('status').filter({hasText:'10MB 이하'}).waitFor();assert.deepEqual(await save(p,'after-huge'),before);
 await drop(p,[supported,supported]);await p.getByRole('status').filter({hasText:'PDF는 한 번에 한 개씩 넣어 주세요.'}).waitFor();assert.deepEqual(await save(p,'after-multiple'),before);
 await drop(p,[]);await input(p).setInputFiles([]);assert.deepEqual(await save(p,'after-empty-cancel'),before);
 await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.screenshot({path:`${dir}/error-mobile.png`,fullPage:true});await p.setViewportSize({width:1440,height:1000});
 // A later valid drop must append once, retain previous work and invalidate plan confirmation.
 await drop(p,[{...supported,mimeType:''}]);await extracted(p,5);const appended=await save(p,'appended');assert.equal(appended.sources.length,2);assert.deepEqual(appended.items.slice(0,3),before.items);assert.equal(appended.planConfirmed,false);assert.equal(appended.items[2].included,false);assert.equal(appended.items[0].approved.length,1);
 await p.getByLabel('단원',{exact:true}).fill('편집한 합성 단원');await p.getByRole('button',{name:'선택한 평가계획 확정 →',exact:true}).click();await p.locator('.sidebar .item').first().click();assert.equal(await p.locator('article.approved').count(),1);
 await p.getByLabel('실제 교육활동',{exact:true}).fill('낱말을 소리 내어 읽었다. 수정한 근거다.');assert.equal(await p.locator('article.approved').count(),0);assert.equal(await p.locator('.candidate-row').count(),1);assert.equal(await p.getByRole('checkbox',{name:'실제 수행한 활동과 확인된 성취임을 확인했습니다.',exact:true}).count(),0);await p.locator('.bulk-confirm input[type=checkbox]').check();await p.getByRole('button',{name:'전체 문장 승인',exact:true}).click();
 const unapproved='새로 쓴 미승인 문장을 보관함.';await p.getByLabel('검토할 문장',{exact:true}).fill(unapproved);await p.getByRole('button',{name:'후보에 추가',exact:true}).click();
 assert.equal(await p.getByRole('button',{name:/^AI 후보 12개 생성/}).isDisabled(),process.env.TEST_PUBLIC_AI_ENABLED!=='true');await p.getByRole('button',{name:'조합 · XLSX 내보내기',exact:true}).click();await p.locator('.selection input').nth(1).check();await p.locator('.selection input').first().check();const combined=[...sentences].reverse().join(' ');assert.equal(await p.locator('article.approved p').innerText(),combined);await p.locator('article.approved').getByRole('button',{name:'복사',exact:true}).click();assert.equal(await p.evaluate(()=>navigator.clipboard.readText()),combined);
 let pending=p.waitForEvent('download');await p.getByRole('button',{name:'XLSX 다운로드 ↓',exact:true}).click();await(await pending).saveAs(`${dir}/approved.xlsx`);const book=new ExcelJS.Workbook();await book.xlsx.readFile(`${dir}/approved.xlsx`);const values=[];book.eachSheet(s=>s.eachRow(r=>r.eachCell(c=>values.push(c.value))));assert(values.includes(combined));assert(!values.includes(unapproved));assert(!values.includes('제외할 보관 항목'));
 const finalWork=await save(p,'final-work');const restored=await page();await restored.locator('input[accept=".json"]').setInputFiles(`${dir}/final-work.json`);await extracted(restored,5);const roundtrip=await save(restored,'roundtrip');assert.deepEqual(roundtrip.sources.map(s=>s.data),finalWork.sources.map(s=>s.data));assert.equal(roundtrip.items[2].included,false);assert.equal(roundtrip.items.reduce((n,i)=>n+i.approved.length,0),0);assert.equal(roundtrip.items.reduce((n,i)=>n+i.candidates.length,0),3);
 await restored.getByRole('button',{name:'문장 작업으로 이동 →',exact:true}).click();assert.equal(await restored.getByRole('checkbox',{name:'실제 수행한 활동과 확인된 성취임을 확인했습니다.',exact:true}).count(),0);
 results.push('invalid/non-PDF/oversize/31-page/multiple/empty/cancel preserve entire approved work; valid empty-MIME retry appends once; edit/select/reconfirm, fact edits revoke approval, ordered copy/XLSX approved-only, PDF save/restore requires reapproval');
 // Artificial read delay ONLY: real File bytes still pass through readPdf/PDF.js.
 const slow=await page();await slow.evaluate(()=>{const read=File.prototype.arrayBuffer;File.prototype.arrayBuffer=async function(){if(this.name==='slow.pdf')await new Promise(resolve=>{window.releasePdf=resolve});return read.call(this)}});
 await drop(slow,[{...supported,name:'slow.pdf'}]);await slow.waitForFunction(()=>window.releasePdf);assert.equal(await card(slow).getAttribute('aria-busy'),'true');assert(await input(slow).isDisabled());await slow.screenshot({path:`${dir}/busy-desktop.png`});await slow.setViewportSize({width:390,height:844});await slow.screenshot({path:`${dir}/busy-mobile.png`});assert.equal(await slow.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await drop(slow);await input(slow).setInputFiles(supported);assert(!await card(slow).evaluate(e=>e.classList.contains('dragging')));
 // Release both real reads (extract then encode) without changing their results.
 await slow.evaluate(()=>{const release=window.releasePdf;delete window.releasePdf;File.prototype.arrayBuffer=Blob.prototype.arrayBuffer;release()});await extracted(slow,2);assert.equal((await save(slow,'slow-result')).sources.length,1);
 const race=await page();await race.evaluate(data=>{const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));const el=document.querySelector('.pdf-upload');for(let i=0;i<2;i++){const dt=new DataTransfer();dt.items.add(new File([bytes],'supported.pdf'));el.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));}},bytes.toString('base64'));await extracted(race,2);assert.equal((await save(race,'same-tick-result')).sources.length,1);
 results.push('busy UI, disabled picker/additional drop and selection, same-tick duplicate drop serialized; real extraction delayed only for observation');
 // Real unsupported and image-only PDF fallback; successful selection clears drag state.
 for(const name of ['unsupported','scanned']){const q=await page();await drop(q,[{name:`${name}.pdf`,buffer:await readFile(`${fixtures}/${name}.pdf`)}]);await q.getByRole('status').filter({hasText:/지원하는 표를 찾지 못했습니다/}).waitFor();const w=await save(q,name);assert.equal(w.sources.length,1);assert.equal(w.items.length,0);if(name==='scanned')assert.equal(w.sources[0].pages[0].text,'');assert(!await card(q).evaluate(e=>e.classList.contains('dragging')));await q.close();}
 // serializeProject rejects additional sources before committing any app state.
 const limit=await page();const sources=Array.from({length:10},(_,i)=>({id:`pdf-${i}`,name:'supported.pdf',data:bytes.toString('base64'),pages:choiceWork.sources[0].pages}));await writeFile(`${dir}/limit-seed.json`,serializeProject({items:[{...blankItem(),element:'보존할 항목',sourceId:sources[0].id,page:1}],sources,examples:[],planConfirmed:true}));await limit.locator('input[accept=".json"]').setInputFiles(`${dir}/limit-seed.json`);await extracted(limit,1);const limitBefore=await save(limit,'limit-before');await drop(limit);await limit.getByRole('status').filter({hasText:/PDF 10개/}).waitFor();assert.deepEqual(await save(limit,'limit-after'),limitBefore);

 // Work byte limit must also reject atomically after successful real PDF parsing.
 const sizePage=await page();const padded=Buffer.concat([bytes,Buffer.alloc(3900000-bytes.length,32)]).toString('base64');
 const sizeSources=Array.from({length:8},(_,n)=>({...sources[0],id:`size-${n}`,data:padded}));
 await writeFile(`${dir}/size-seed.json`,serializeProject({items:[{...blankItem(),element:'용량 검사 보존 항목',sourceId:sizeSources[0].id,page:1}],sources:sizeSources,examples:[],planConfirmed:true}));
 await sizePage.locator('input[accept=".json"]').setInputFiles(`${dir}/size-seed.json`);await extracted(sizePage,1);const sizeBefore=await save(sizePage,'size-before');
 await drop(sizePage,[{...supported,buffer:Buffer.concat([bytes,Buffer.alloc(1100000,32)])}]);await sizePage.getByRole('status').filter({hasText:/작업 파일은 40MB/}).waitFor();assert.deepEqual(await save(sizePage,'size-after'),sizeBefore);await sizePage.close();
 results.push('unsupported/image-only PDF guidance retained; 10-source and 40MB work limits fail atomically');
 const touch=await browser.newContext({proxy,hasTouch:true,isMobile:true,viewport:{width:390,height:844},acceptDownloads:true});const mobile=await touch.newPage();watch(mobile);await mobile.goto(base);chooser=mobile.waitForEvent('filechooser');await card(mobile).tap();await(await chooser).setFiles(supported);await extracted(mobile,2);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await mobile.screenshot({path:`${dir}/touch-mobile.png`,fullPage:true});results.push('touch file chooser and keyboard Space file chooser retained; 390px no overflow');
 const api=await checkAiState(context,base);
 assert.deepEqual(errors,[]);const unexpected=warnings.filter(w=>!w.includes('Indexing all PDF objects')&&!w.includes('standardFontDataUrl'));assert.deepEqual(unexpected,[]);
 const report={ok:true,base,results,realDataTransfer:true,realPdfExtraction:true,candidateMocks:0,liveAiCalls:0,delayedRealRead:true,previewSha256:selectedCanvas,api,errors,expectedParserWarnings:warnings};await writeFile(`${dir}/result.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close()}
