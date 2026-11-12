// Synthetic materials. REAL_PUBLIC_AI=1 makes exactly two real public batch requests.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import ExcelJS from 'exceljs';
import {blankItem} from '../lib/core.mjs';
import {assertDistribution} from '../lib/batch.mjs';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright/index.mjs').href);
const real=process.env.REAL_PUBLIC_AI==='1',base=process.env.TEST_BASE_URL||'http://127.0.0.1:3006',dir=process.env.TEST_OUTPUT_DIR||'tmp/batch-browser';
if(real)assert.equal(base,'https://pyeoneo-studio.vercel.app');
await mkdir(dir,{recursive:true});
const proxy=new URL(base).hostname==='127.0.0.1'?undefined:{server:process.env.HTTPS_PROXY};
const browser=await chromium.launch({headless:true,proxy,executablePath:'/usr/bin/chromium'}),ctx=await browser.newContext({proxy,viewport:{width:1440,height:1000},permissions:['clipboard-read','clipboard-write'],acceptDownloads:true});
const actual='주변에서 여러 가지 색을 찾아보고, 찾은 색을 10색상환에 나타내어 색상환을 완성했다.',example='주변에서 여러 가지 색을 찾아보고 찾은 색을 10색상환에 나타내어 완성할 수 있음.';
const names=['활동 완성','활동 표현','색 탐색','색상환 표현','추가 확인'];
const levels=n=>Array.from({length:n},(_,k)=>({id:`stable-${k}`,name:names[k],description:'주변에서 색을 찾고 찾은 색을 10색상환에 나타내어 완성한 사실을 표현한다. 도움·태도·성취를 추가하지 않는다.'}));
const seed={version:2,items:[3,5].map((n,k)=>({...blankItem(),element:`색 탐색과 색상환 ${k+1}`,actual,example,levels:levels(n),target:120})),examples:[],sources:[],planConfirmed:true};
const report={realPublicModel:real,mocked:!real,batches:[],errors:[],ok:false},p=await ctx.newPage();p.on('pageerror',e=>report.errors.push(e.message));
let mode='ok',posts=0,release;const payloads=[];
if(!real)await p.route('**/api/generate',async route=>{
 if(route.request().method()==='GET')return route.fulfill({json:{enabled:true,mode:'public'}});
 posts++;const data=route.request().postDataJSON();payloads.push(data);
 if(mode==='wait')await new Promise(r=>release=r);
 if(mode==='network')return route.abort();
 if(typeof mode==='number')return route.fulfill({status:mode,json:{error:'시험 오류: 기존 작업은 유지됩니다.'}});
 const candidates=data.levels.flatMap(l=>Array.from({length:l.count},(_,n)=>({text:`${l.name} 표현 ${posts}-${n}에서 주변의 색을 찾고 10색상환을 완성할 수 있음.`,levelId:l.id,errors:[],semanticPass:true})));
 if(mode==='short')candidates.pop();if(mode==='excess')candidates.push(candidates[0]);if(mode==='wrong')candidates[0].levelId='unknown';
 return route.fulfill({json:{candidates,reasons:[]}});
});
const bulk=p.getByRole('checkbox',{name:'수정한 문장들이 평가의 실제 활동을 정확하고 자연스럽게 표현했음을 확인했습니다.',exact:true});
const approve=p.getByRole('button',{name:'전체 문장 승인',exact:true});
async function save(name){const event=p.waitForEvent('download');await p.getByRole('button',{name:'↓ 작업 파일 저장',exact:true}).click();await(await event).saveAs(`${dir}/${name}.json`);return JSON.parse(await readFile(`${dir}/${name}.json`,'utf8'));}
async function setCounts(counts){for(let n=0;n<counts.length;n++)await p.getByLabel(`${names[n]} 생성할 후보 수`,{exact:true}).fill(String(counts[n]));}
async function generate(counts){await setCounts(counts);const n=counts.reduce((a,b)=>a+b,0),wait=p.waitForResponse(r=>r.url()===base+'/api/generate'&&r.request().method()==='POST',{timeout:300000});await p.getByRole('button',{name:`AI 후보 ${n}개 생성`,exact:true}).click();const response=await wait,data=await response.json();await writeFile(`${dir}/response-${report.batches.length}.json`,JSON.stringify(data));assert.equal(response.status(),200,JSON.stringify(data));const requested=JSON.parse(response.request().postData()).levels;assertDistribution(data.candidates,requested);return {data,requested};}
async function assertNoOverflow(name){assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const cut=await p.locator('.candidate-row textarea').evaluateAll(els=>els.some(e=>e.scrollWidth>e.clientWidth+2));assert.equal(cut,false);await p.screenshot({path:`${dir}/${name}.png`,fullPage:true});}
try{
 await p.goto(base);await p.locator('input[accept=".json"]').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(seed))});await p.getByRole('button',{name:'문장 작업으로 이동 →',exact:true}).click();
 const distributions=real?[[4,2,0],[8,7,6,3,0]]:[[1,0,0],[4,3,2,3,0],[8,7,6,3,0]];
 for(let index=0;index<distributions.length;index++){
  if(index===1)await p.locator('.sidebar .item').nth(1).click();
  if(index===2){while(await p.locator('.candidate-row').count())await p.locator('.candidate-row').first().getByRole('button',{name:'삭제',exact:true}).click();}
  const counts=distributions[index],n=counts.reduce((a,b)=>a+b,0);if(real&&index===1)await p.setViewportSize({width:390,height:844});
  const {data,requested}=await generate(counts);await p.locator('.candidate-row').nth(n-1).waitFor();assert.equal(await p.locator('.candidate-row').count(),n);assert.equal(await p.locator('.candidate-row input[type=checkbox]').count(),0);assert.equal(await bulk.count(),1);assert.equal(await p.locator('.candidate-row .muted,.candidate-row .error,.candidate-row .warning').count(),0);
  assert.deepEqual(await p.locator('.candidate-number').allTextContents(),Array.from({length:n},(_,k)=>String(k+1)));
  await assertNoOverflow(`batch-${index}`);
  report.batches.push({requested:requested.map(l=>({id:l.id,name:l.name,count:l.count})),response:data.candidates.length,newList:n,distribution:requested.map(l=>({id:l.id,count:data.candidates.filter(c=>c.levelId===l.id).length})),semanticPassed:data.candidates.filter(c=>c.semanticPass&&!c.errors?.length).length});
  if(!real)continue;
  // Explicit test-teacher review: rejected candidates must block the whole operation first.
  const blocked=data.candidates.filter(c=>c.errors?.length||!c.semanticPass);
  if(blocked.length){await bulk.check();await approve.click();assert.equal(await p.locator('article.approved').count(),0);await p.getByRole('status').filter({hasText:/번:/}).waitFor();await save(`blocked-${index}`);throw Error('TEST_TEACHER_REVIEW_REQUIRED: inspect saved batch before correction; no automatic acceptance');}
  await bulk.check();assert.equal(await p.locator('article.approved').count(),0);await approve.click();
  assert.equal(await p.locator('article.approved').count(),n);report.batches.at(-1).bulkApproved=n;await save(`progress-${index}`);
 }
 if(!real){
  // Count validation happens before transport, without clearing existing rows.
  const prior=posts;for(const values of [[-1,0,0,0,0],[0.5,0,0,0,0],['',0,0,0,0],[25,0,0,0,0],[0,0,0,0,0]]){await setCounts(values);await p.getByRole('button',{name:/^AI 후보/}).click();await p.getByRole('status').filter({hasText:/정수|합계/}).waitFor();assert.equal(posts,prior);}
  await setCounts([1,0,0,0,0]);
  for(const failure of ['short','excess','wrong',429,503,504,502,'network']){mode=failure;const before=await save('before-failure');await p.getByRole('button',{name:'AI 후보 1개 생성',exact:true}).click();await p.getByRole('status').filter({hasText:/다릅니다|확인할 수|시험 오류|연결하지 못/}).waitFor();assert.deepEqual((await save('after-failure')).items,before.items);}
  mode='wait';const before=posts;await p.getByRole('button',{name:'AI 후보 1개 생성',exact:true}).evaluate(e=>{e.click();e.click()});for(let k=0;!release&&k<100;k++)await new Promise(r=>setTimeout(r,10));assert.equal(posts,before+1);await p.getByLabel('실제 교육활동',{exact:true}).fill(actual+' 변경된 활동');release();await p.getByRole('status').filter({hasText:'이전 요청의 후보를 반영하지 않았습니다'}).waitFor();assert.equal(await p.locator('.candidate-row').count(),24);
  release=undefined;await p.getByRole('button',{name:'AI 후보 1개 생성',exact:true}).click();for(let k=0;!release&&k<100;k++)await new Promise(r=>setTimeout(r,10));await p.getByRole('button',{name:'생성 취소',exact:true}).click();release();await p.getByRole('status').filter({hasText:'취소'}).waitFor();assert.equal(await p.locator('.candidate-row').count(),24);mode='ok';
  await bulk.check();const rowId=await p.locator('.candidate-row').nth(1).getAttribute('data-candidate-id');await p.locator('.candidate-row').first().getByRole('button',{name:'삭제',exact:true}).click();assert.equal(await bulk.isChecked(),false);assert.equal(await p.locator('.candidate-row').first().getAttribute('data-candidate-id'),rowId);await p.locator('.candidate-row').first().locator('textarea').fill('색을 탐색하고 색상환을 완성할 수 있음.');
  await bulk.check();await p.locator('.candidate-row').first().locator('select').selectOption('stable-1');assert.equal(await bulk.isChecked(),false);
  // Clear generated rows then exercise atomic refusal and approved-only output.
  while(await p.locator('.candidate-row').count())await p.locator('.candidate-row').first().getByRole('button',{name:'삭제',exact:true}).click();
  for(const text of ['색을 탐색하고 색상환을 완성할 수 있음.','명확하게 색을 탐색함.']){await p.getByLabel('검토할 문장',{exact:true}).fill(text);await p.getByRole('button',{name:'후보에 추가',exact:true}).click();}
  await bulk.check();await approve.click();assert.equal(await p.locator('article.approved').count(),0);await p.getByRole('status').filter({hasText:/2번: 금지/}).waitFor();await p.locator('.candidate-row').nth(1).getByRole('button',{name:'삭제',exact:true}).click();await bulk.check();await approve.click();assert.equal(await p.locator('article.approved').count(),1);
  await p.getByLabel(`${names[0]} 생성할 후보 수`,{exact:true}).fill('2');assert.equal(await p.locator('article.approved').count(),1);await p.getByLabel('검토할 문장',{exact:true}).fill('출력에서 제외할 미승인 문장임.');await p.getByRole('button',{name:'후보에 추가',exact:true}).click();assert.equal(await p.locator('article.approved').count(),1);
  await bulk.check();await p.locator('.sidebar .item').first().click();assert.equal(await bulk.isChecked(),false);await p.locator('.sidebar .item').nth(1).click();assert.equal(await bulk.isChecked(),false);
  await p.setViewportSize({width:390,height:844});await assertNoOverflow('mobile');
 }
 const work=await save('work');
 await p.getByRole('button',{name:'조합 · XLSX 내보내기',exact:true}).click();
 if(real){await p.locator('.selection input').first().check();await p.locator('.selection input').nth(1).check();const combined=work.items.map(i=>i.approved[0].text).join(' ');assert.equal(await p.locator('article.approved').first().locator('p').innerText(),combined);await p.locator('article.approved').first().getByRole('button',{name:'복사',exact:true}).click();assert.equal(await p.evaluate(()=>navigator.clipboard.readText()),combined);report.combinationAndClipboard=true;}
 const event=p.waitForEvent('download');await p.getByRole('button',{name:'XLSX 다운로드 ↓',exact:true}).click();await(await event).saveAs(`${dir}/approved.xlsx`);const book=new ExcelJS.Workbook();await book.xlsx.readFile(`${dir}/approved.xlsx`);const cells=[];book.eachSheet(s=>s.eachRow(r=>r.eachCell(c=>cells.push(c.value))));for(const i of work.items){for(const c of i.approved)assert(cells.includes(c.text));for(const c of i.candidates)assert(!cells.includes(c.text));}report.approvedOnlyXlsx=true;
 const restored=await ctx.newPage();await restored.goto(base);await restored.locator('input[accept=".json"]').setInputFiles(`${dir}/work.json`);await restored.getByRole('button',{name:'문장 작업으로 이동 →',exact:true}).click();assert.equal(await restored.locator('article.approved').count(),0);assert.equal(await restored.locator('.bulk-confirm input').isChecked(),false);report.restoreRequiresApproval=true;
 if(!real){await restored.locator('.sidebar .item').nth(1).click();await restored.locator('.bulk-confirm input').check();await restored.getByLabel('검토할 문장',{exact:true}).fill('추가 후보로 전체 확인을 무효화할 수 있음.');await restored.getByRole('button',{name:'후보에 추가',exact:true}).click();assert.equal(await restored.locator('.bulk-confirm input').isChecked(),false);}
 const cap=await ctx.newPage();await cap.route('**/api/generate',route=>{assert.equal(route.request().method(),'GET','capacity check must precede POST');return route.fulfill({json:{enabled:true}})});await cap.goto(base);
 const capSeed={...seed,items:[{...seed.items[0],generationCounts:{'stable-0':'2','stable-1':'0','stable-2':'0'},candidates:Array.from({length:119},(_,n)=>({text:`보관 문장 ${n} 있음.`,level:names[0],levelId:'stable-0'}))}]};await cap.locator('input[accept=".json"]').setInputFiles({name:'capacity.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(capSeed))});await cap.getByRole('button',{name:'문장 작업으로 이동 →',exact:true}).click();await cap.getByRole('button',{name:'AI 후보 2개 생성',exact:true}).click();await cap.getByRole('status').filter({hasText:'보관 한도 120개'}).waitFor();assert.equal(await cap.locator('.candidate-row').count(),119);report.capacityBeforeTransport=true;

 assert.deepEqual(report.errors,[]);report.ok=true;
}finally{await writeFile(`${dir}/result.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();}
