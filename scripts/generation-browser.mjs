// Browser transport mocks only. These checks are not evidence of live model quality.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {blankItem} from '../lib/core.mjs';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE||`${process.cwd()}/tmp/tools/node_modules/playwright/index.mjs`).href);
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3010',dir=process.env.TEST_OUTPUT_DIR||'tmp/generation-browser';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium'});
const errors=[],report=[];
try{
 const context=await browser.newContext();
 for(const version of [1,2])for(const confirmed of [true,false,undefined]){
  const seed={version,items:[{...blankItem(),confirmed,element:'색 탐색',actual:'주변의 색을 탐색하고 색상환을 완성했다.',example:'주변의 색을 탐색하고 색상환을 완성함.'}],examples:[]};
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  let count=0,release,mode='success';const payloads=[];
  await p.route('**/api/generate',async route=>{
   if(route.request().method()==='GET')return route.fulfill({json:{enabled:true,mode:'public'}});
   count++;payloads.push(route.request().postDataJSON());
   if(mode==='wait')await new Promise(r=>release=r);
   if(mode==='network')return route.abort();
   if(typeof mode==='number')return route.fulfill({status:mode,json:{error:'시험 오류: 기존 후보는 유지됩니다.'}});
   return route.fulfill({json:{candidates:Array.from({length:12},(_,n)=>({text:`${n+1}번 색을 탐색하고 색상환을 완성함.`,errors:[],warnings:[],semanticPass:true})),reasons:[]}});
  });
  await p.goto(base);await p.locator('input[accept=".json"]').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(seed))});
  await p.getByRole('button',{name:'선택한 평가계획 확정 →',exact:true}).click();
  assert.equal(await p.getByRole('checkbox',{name:'실제 수행한 활동과 확인된 성취임을 확인했습니다.',exact:true}).count(),0);
  const generate=p.getByRole('button',{name:'AI 후보 12개 생성',exact:true});
  await generate.click();await p.locator('.sentence').nth(11).waitFor();assert.equal(count,1);assert.equal(payloads[0].confirmed,undefined);assert.equal(await p.locator('article.approved').count(),0);
  if(version===2&&confirmed===undefined){
   for(const status of [429,504,502,'network']){
    mode=status;await generate.click();await p.getByRole('status').filter({hasText:status==='network'?'서버에 연결하지 못했습니다':'시험 오류'}).waitFor();assert.equal(await p.locator('.sentence').count(),12);
   }
   for(const field of ['actual','example','level']){
    mode='wait';release=undefined;const before=count;
    await generate.evaluate(el=>{el.click();el.click()});
    await p.waitForFunction(()=>document.querySelector('.facts')!==null);
    for(let n=0;!release&&n<100;n++)await new Promise(r=>setTimeout(r,10));
    assert(release);assert.equal(count,before+1);
    if(field==='level')await p.getByLabel('평가 수준',{exact:true}).selectOption('보통');
    else await p.getByLabel(field==='actual'?'실제 교육활동':'참고 예시문장',{exact:true}).fill(field==='actual'?'바뀐 활동에서 두 수를 비교했다.':'바뀐 예시에서 두 수를 비교함.');
    release();await p.getByRole('status').filter({hasText:'이전 요청의 후보를 반영하지 않았습니다'}).waitFor();assert.equal(await p.locator('.sentence').count(),12);
   }
   await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.screenshot({path:`${dir}/mobile.png`,fullPage:true});
  }
  report.push({version,confirmed:String(confirmed),mockRequests:count,candidates:12});await p.close();
 }
 assert.deepEqual(errors,[]);await writeFile(`${dir}/result.json`,JSON.stringify({ok:true,mocked:true,report,errors},null,2));console.log(JSON.stringify({ok:true,mocked:true,report,errors}));
}finally{await browser.close();}
