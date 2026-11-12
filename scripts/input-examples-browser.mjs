// Synthetic browser regression. No live AI; API mocks exist only in Playwright.
// Work files, request captures, downloads and screenshots stay in ignored tmp/.
import assert from 'node:assert/strict';
import {checkAiState} from './check-ai-state.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import ExcelJS from 'exceljs';
import {blankItem} from '../lib/core.mjs';
import {serializeProject} from '../lib/restore.mjs';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3006',dir=process.env.TEST_OUTPUT_DIR||'tmp/input-examples';
const proxy=!['localhost','127.0.0.1'].includes(new URL(base).hostname)&&process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined;
await mkdir(dir,{recursive:true});
const colors={...blankItem(),generationCounts:{'매우 잘함':'1','잘함':'0','보통':'0','노력 요함':'0'},subject:'즐거운생활',element:'주변에서 여러 가지 색을 찾아보고 10색상환 완성하기'};
const numbers={...blankItem(),generationCounts:{'매우 잘함':'1','잘함':'0','보통':'0','노력 요함':'0'},subject:'수학',element:'구체물을 이용하여 9까지의 두 수의 크기 비교하기'};
await writeFile(`${dir}/seed.json`,serializeProject({items:[colors,numbers],examples:[],sources:[],planConfirmed:true,activeItemId:colors.id}));
const browser=await chromium.launch({headless:true,proxy,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{channel:process.env.BROWSER_CHANNEL||'chrome'})});
const context=await browser.newContext({proxy,viewport:{width:1440,height:1000},acceptDownloads:true});
const errors=[],warnings=[],external=[],payloads=[],results=[];
context.on('page',p=>{
 p.on('pageerror',e=>errors.push(e.message));
 p.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});
 p.on('request',r=>{if(!r.url().startsWith(base))external.push(r.url());});
});
const actual=p=>p.getByLabel('실제 교육활동',{exact:true});
const reference=p=>p.getByLabel('참고 예시문장',{exact:true});
const confirmation=p=>p.getByRole('checkbox',{name:'실제 수행한 활동과 확인된 성취임을 확인했습니다.',exact:true});
const make=p=>p.getByRole('button',{name:'예시 만들기',exact:true}).click();
const copyActual=p=>p.getByRole('button',{name:'실제 교육활동 예시 복사',exact:true});
const copyReference=p=>p.getByRole('button',{name:'참고 예시문장 복사',exact:true});
const pair=async p=>({actual:await p.getByRole('region',{name:'생성한 실제 교육활동 예시',exact:true}).locator('p').innerText(),example:await p.getByRole('region',{name:'생성한 참고 예시문장',exact:true}).locator('p').innerText()});
const values=async p=>({actual:await actual(p).inputValue(),example:await reference(p).inputValue()});
async function load(mock=false,file=`${dir}/seed.json`){
 const p=await context.newPage();
 if(mock)await p.route('**/api/generate',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{enabled:true}});
  const data=route.request().postDataJSON();payloads.push(data);
  await route.fulfill({json:{candidates:[{text:data.example,levelId:data.levels[0].id,evidence:[data.actual],errors:[],warnings:[],semanticPass:true}],reasons:[]}});
 });
 await p.goto(base);await p.locator('input[accept=".json"]').setInputFiles(file);
 await p.getByRole('button',{name:'문장 작업으로 이동 →',exact:true}).click();
 return p;
}
async function save(p,name){
 const event=p.waitForEvent('download');await p.getByRole('button',{name:'↓ 작업 파일 저장',exact:true}).click();
 await (await event).saveAs(`${dir}/${name}.json`);
 return JSON.parse(await readFile(`${dir}/${name}.json`,'utf8'));
}
async function replace(p,button,accept){
 let seen=false;p.once('dialog',async dialog=>{seen=true;assert.equal(dialog.type(),'confirm');assert.match(dialog.message(),/교체/);await (accept?dialog.accept():dialog.dismiss());});
 await button.click();assert.equal(seen,true);
}
async function generate(p,expected){
 assert.equal(await confirmation(p).count(),0);const before=payloads.length;
 await p.getByRole('button',{name:'AI 후보 1개 생성',exact:true}).click();
 await p.locator('.candidate-row').first().waitFor();
 assert.equal(payloads.length,before+1);
 assert.deepEqual({actual:payloads.at(-1).actual,example:payloads.at(-1).example},expected);
 assert.equal(payloads.at(-1).confirmed,undefined);
 assert.equal(await p.locator('article.approved').count(),0);
 assert.equal(await p.getByRole('button',{name:'전체 문장 승인',exact:true}).isEnabled(),true);
}
async function roundtrip(p,name,expected){
 const saved=await save(p,name);assert.deepEqual({actual:saved.items[0].actual,example:saved.items[0].example},expected);
 const restored=await load(false,`${dir}/${name}.json`);assert.deepEqual(await values(restored),expected);
 assert.equal(await confirmation(restored).count(),0);assert.equal(await restored.locator('article.approved').count(),0);
 assert.equal(await restored.locator('.input-example').count(),0);
 await restored.close();
}
try{
 const realApi=await checkAiState(context,base);
 const offline=await load();let offlinePosts=0;offline.on('request',r=>{if(r.method()==='POST')offlinePosts++;});
 await make(offline);const colorPair=await pair(offline);
 assert.deepEqual(await values(offline),{actual:'',example:''});assert.equal(await confirmation(offline).count(),0);
 assert.equal(await offline.getByRole('button',{name:'후보에 추가',exact:true}).isDisabled(),true);
 assert.equal(await offline.getByRole('button',{name:/^AI 후보 1개 생성/}).isDisabled(),true);
 assert.equal(await offline.getByText('수업에서 실제로 한 활동과 일치하는지 확인한 뒤 사용하세요.',{exact:true}).count(),1);
 await copyActual(offline).click();assert.equal(await reference(offline).inputValue(),'');assert.equal(await confirmation(offline).count(),0);
 await offline.locator('.sidebar .item').nth(1).click();assert.equal(await offline.locator('.input-example').count(),0);assert.deepEqual(await values(offline),{actual:'',example:''});
 await make(offline);const numberPair=await pair(offline);assert.notDeepEqual(numberPair,colorPair);
 assert.match(numberPair.actual,/9까지의 두 수의 크기를 비교/);
 await actual(offline).fill('구체물로 두 수를 비교했다.');await copyReference(offline).click();
 assert.equal(await actual(offline).inputValue(),'구체물로 두 수를 비교했다.');assert.equal(await reference(offline).inputValue(),numberPair.example);
 await offline.locator('.sidebar .item').first().click();assert.equal(await offline.locator('.input-example').count(),0);assert.equal(await actual(offline).inputValue(),colorPair.actual);
 await make(offline);assert.equal(offlinePosts,0);assert.equal(await confirmation(offline).count(),0);
 await offline.screenshot({path:`${dir}/examples-desktop.png`,fullPage:true});
 await offline.setViewportSize({width:390,height:844});assert.equal(await offline.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await offline.screenshot({path:`${dir}/examples-mobile.png`,fullPage:true});
 results.push('offline generation, required fields, independent reference copy, item switching, no POST, mobile layout');

 const one=await load(true);await make(one);await copyActual(one).click();
 await reference(one).fill('주변의 여러 색을 찾아보고 10색상환을 완성함.');const finalOne=await values(one);
 await generate(one,finalOne);await roundtrip(one,'activity-only',finalOne);
 results.push('activity copy + manual reference: exact request and saved/restored values');

 const two=await load(true);await actual(two).fill('교사가 먼저 작성해 둔 활동이다.');await reference(two).fill('교사가 먼저 작성해 둔 문장을 보관함.');assert.equal(await confirmation(two).count(),0);
 const old=await values(two);await make(two);assert.deepEqual(await values(two),old);assert.equal(await confirmation(two).count(),0);
 await replace(two,copyActual(two),false);assert.deepEqual(await values(two),old);assert.equal(await confirmation(two).count(),0);
 await replace(two,copyReference(two),false);assert.deepEqual(await values(two),old);
 await replace(two,copyActual(two),true);assert.equal(await reference(two).inputValue(),old.example);assert.equal(await confirmation(two).count(),0);
 await replace(two,copyReference(two),true);assert.deepEqual(await values(two),colorPair);
 assert.equal(await confirmation(two).count(),0);await make(two);assert.deepEqual(await values(two),colorPair);assert.equal(await confirmation(two).count(),0);
 await generate(two,colorPair);await roundtrip(two,'both-unchanged',colorPair);
 results.push('both copies unchanged, replace/cancel for both fields, regeneration preserves inputs without a confirmation gate');

 const three=await load(true);await make(three);await copyActual(three).click();await copyReference(three).click();
 await actual(three).fill('주변에서 파란색과 빨간색을 찾아보고 10색상환을 완성했다.');await reference(three).fill('주변에서 파란색과 빨간색을 찾아보고 10색상환을 완성함.');
 const finalThree=await values(three);await generate(three,finalThree);
 await three.locator('.bulk-confirm input[type=checkbox]').check();await three.getByRole('button',{name:'전체 문장 승인',exact:true}).click();
 assert.equal(await three.locator('article.approved').count(),1);
 await make(three);assert.deepEqual(await values(three),finalThree);assert.equal(await three.locator('article.approved').count(),1);
 await roundtrip(three,'copied-then-edited',finalThree);
 // A copied replacement takes the same invalidation path as typing.
 await replace(three,copyActual(three),true);assert.equal(await confirmation(three).count(),0);assert.equal(await three.locator('article.approved').count(),0);assert.equal(await three.locator('.candidate-row').count(),1);
 assert.equal(await three.getByRole('button',{name:'전체 문장 승인',exact:true}).isEnabled(),true);
 results.push('copy then edit: exact request/save/restore, explicit approval, regeneration keeps approval, replacement revokes approval');

 // Existing manual approval -> ordered combination -> downloaded XLSX regression.
 const exportPage=await load(false,`${dir}/copied-then-edited.json`);
 assert.equal(await confirmation(exportPage).count(),0);await exportPage.locator('.bulk-confirm input[type=checkbox]').check();await exportPage.getByRole('button',{name:'전체 문장 승인',exact:true}).click();
 await exportPage.getByRole('button',{name:'← 평가계획 수정 · 선택',exact:true}).click();
 await exportPage.getByRole('button',{name:'＋ 누락 항목 직접 추가',exact:true}).click();
 await exportPage.getByLabel('교과',{exact:true}).fill('즐거운생활');await exportPage.getByLabel('평가 요소',{exact:true}).fill('나뭇잎의 모양 관찰하기');
 await exportPage.getByRole('button',{name:'선택한 평가계획 확정 →',exact:true}).click();
 await actual(exportPage).fill('나뭇잎의 모양을 관찰했다.');await reference(exportPage).fill('나뭇잎의 모양을 관찰함.');assert.equal(await confirmation(exportPage).count(),0);
 await exportPage.getByLabel('검토할 문장',{exact:true}).fill('나뭇잎의 모양을 관찰함.');await exportPage.getByRole('button',{name:'후보에 추가',exact:true}).click();
 assert.equal(await exportPage.getByRole('button',{name:'전체 문장 승인',exact:true}).isEnabled(),true);
 await exportPage.locator('.bulk-confirm input[type=checkbox]').check();await exportPage.getByRole('button',{name:'전체 문장 승인',exact:true}).click();
 await exportPage.getByRole('button',{name:'조합 · XLSX 내보내기',exact:true}).click();
 await exportPage.locator('.selection input').nth(2).check();await exportPage.locator('.selection input').first().check();
 const event=exportPage.waitForEvent('download');await exportPage.getByRole('button',{name:'XLSX 다운로드 ↓',exact:true}).click();await (await event).saveAs(`${dir}/approved.xlsx`);
 const book=new ExcelJS.Workbook();await book.xlsx.readFile(`${dir}/approved.xlsx`);
 assert.equal(book.worksheets[0].getCell('A3').value,finalThree.example);assert.equal(book.worksheets[0].getCell('C3').value,'나뭇잎의 모양을 관찰함.');
 assert.equal(book.worksheets[1].getCell('B2').value,`나뭇잎의 모양을 관찰함. ${finalThree.example}`);
 results.push('manual approval, selection order combination, XLSX download and reopen');

 // Plan edits unmount previews; the new confirmed task produces a new pair.
 await offline.setViewportSize({width:1440,height:1000});await offline.getByRole('button',{name:'← 평가계획 수정 · 선택',exact:true}).click();
 await offline.getByLabel('평가 요소',{exact:true}).fill('식물의 잎 관찰하기');
 await offline.getByRole('button',{name:'선택한 평가계획 확정 →',exact:true}).click();assert.equal(await offline.locator('.input-example').count(),0);
 await make(offline);assert.equal((await pair(offline)).example,'식물의 잎을 관찰함.');
 results.push('plan editing invalidates old previews');
 assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);assert.deepEqual(external,[]);assert.equal(payloads.length,3);
 const report={ok:true,realApi,mockCandidateRequests:payloads.length,examples:{colors:colorPair,numbers:numberPair},results,errors,warnings,externalRequests:external.length};
 await writeFile(`${dir}/browser-result.json`,JSON.stringify(report,null,2));await writeFile(`${dir}/mock-request-payloads.json`,JSON.stringify(payloads,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
