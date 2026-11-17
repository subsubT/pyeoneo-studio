// Uses a private real PDF and independently reviewed expectations supplied by
// the caller. Original material/results remain in ignored tmp/, never Git.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {verifiedBrowserTransport} from './verified-browser-transport.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const pdf=process.env.TEST_PDF,expectedFile=process.env.TEST_EXPECTED_JSON;
assert(pdf&&expectedFile,'Provide TEST_PDF and TEST_EXPECTED_JSON');
const expected=JSON.parse(await readFile(expectedFile,'utf8'));
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3008';
const out=process.env.TEST_OUTPUT_DIR||'tmp/spacing-browser';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',args:JSON.parse(process.env.BROWSER_ARGS||'[]')});
// Physical line feeds and spacing around list dots are presentation; spaces
// inside/between Korean words remain significant in these comparisons.
const norm=text=>text.replace(/\s+/g,' ').replace(/\s*([․·])\s*/g,'$1').trim();
const reports=[];
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true});
  context.setDefaultTimeout(12000);
  await verifiedBrowserTransport(context,base);
  const errors=[],posts=[];context.on('page',p=>{p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});});
  const page=await context.newPage();await page.goto(base);
  await page.getByLabel('평가계획 PDF 선택',{exact:true}).setInputFiles(pdf);
  await page.waitForFunction(count=>document.querySelectorAll('.plan-table tbody tr').length===count,expected.items.length,{timeout:60000});
  const fields={standard:'성취기준',unit:'단원',area:'평가 영역',element:'평가 요소',method:'수업·평가 방법',criteria:'평가 기준 전체'};
  let fieldChecks=0;
  for(let i=0;i<expected.items.length;i++){
   await page.locator('.plan-table tbody tr').nth(i).getByRole('button',{name:'검토 · 편집',exact:true}).click();
   for(const [key,label] of Object.entries(fields)){
    assert.equal(norm(await page.getByLabel(label,{exact:true}).inputValue()),norm(expected.items[i][key]),`field ${i}/${key}/${width}`);fieldChecks++;
   }
  }
  await page.getByRole('button',{name:'선택한 평가계획 확정 →',exact:true}).click();
  for(let i=0;i<expected.examples.length;i++){
   await page.locator('.sidebar .item').nth(i).click();
   await page.getByRole('button',{name:'예시 만들기',exact:true}).click();
   const actual=await page.getByRole('region',{name:'생성한 실제 교육활동 예시',exact:true}).locator('p').last().innerText();
   const reference=(await page.getByRole('region',{name:'생성한 참고 예시문장',exact:true}).locator('p').last().innerText()).replace(/^수정 후:\s*/,'');
   assert.equal(actual,expected.examples[i].actual,`actual ${i}/${width}`);
   assert.equal(reference,expected.examples[i].example,`reference ${i}/${width}`);
   await page.getByRole('button',{name:'실제 교육활동 예시 복사',exact:true}).click();
   await page.getByRole('button',{name:'참고 예시문장 복사',exact:true}).click();
   assert.equal(await page.getByLabel('실제 교육활동',{exact:true}).inputValue(),actual);
   assert.equal(await page.getByLabel('참고 예시문장',{exact:true}).inputValue(),reference);
  }
  // Prove that regeneration does not silently rewrite a teacher's fields.
  await page.getByLabel('실제 교육활동',{exact:true}).fill('교사가 직접 수정한 활동을 보관했다.');
  await page.getByRole('button',{name:'예시 만들기',exact:true}).click();
  assert.equal(await page.getByLabel('실제 교육활동',{exact:true}).inputValue(),'교사가 직접 수정한 활동을 보관했다.');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'↓ 작업 파일 저장',exact:true}).click();
  const path=`${out}/work-${width}.json`;await (await download).saveAs(path);
  const saved=JSON.parse(await readFile(path,'utf8'));assert.equal(saved.items.length,expected.items.length);
  const restored=await context.newPage();await restored.goto(base);await restored.locator('input[accept=".json"]').setInputFiles(path);
  await restored.getByRole('button',{name:'문장 작업으로 이동 →',exact:true}).click();
  for(let i=0;i<expected.examples.length;i++){
   await restored.locator('.sidebar .item').nth(i).click();
   assert.equal(await restored.getByLabel('실제 교육활동',{exact:true}).inputValue(),saved.items[i].actual);
   assert.equal(await restored.getByLabel('참고 예시문장',{exact:true}).inputValue(),saved.items[i].example);
  }
  assert.equal(posts.length,0,'Local extraction/examples must not call AI');assert.deepEqual(errors,[]);
  await page.screenshot({path:`${out}/examples-${width}.png`,fullPage:true});
  reports.push({width,fieldChecks,examples:expected.examples.length,copies:expected.examples.length*2,saveRestore:true,noAiPosts:true,pageErrors:errors});
  await context.close();
 }
 await writeFile(`${out}/report.json`,JSON.stringify({base,reports},null,2));console.log(JSON.stringify({base,reports},null,2));
}finally{await browser.close();}
