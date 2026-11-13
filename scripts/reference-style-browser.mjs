// Direct local/public UI verification; never sends a candidate-generation POST.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {blankItem} from '../lib/core.mjs';
import {createInputExamples} from '../lib/input-examples.mjs';
import {styleFixtures} from '../tests/reference-style-fixtures.mjs';
import {verifiedBrowserTransport} from './verified-browser-transport.mjs';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE||'/opt/codex/cua_node/lib/node_modules/playwright/index.mjs').href);
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3006',dir=process.env.TEST_OUTPUT_DIR||'tmp/style-browser';
const proxy=new URL(base).hostname==='127.0.0.1'?undefined:{server:process.env.HTTPS_PROXY};
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,proxy,executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium'});
const elements=styleFixtures.flatMap(f=>[f.element,f.variant]);
const items=elements.map(element=>({...blankItem(),subject:'국어',element}));
const seed={version:2,items,sources:[],examples:[],planConfirmed:true};
const report={ok:false,realModelCalls:0,generationPosts:0,views:[],errors:[]};
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({proxy,viewport:{width,height:900},acceptDownloads:true});
  await verifiedBrowserTransport(context,base);
  await context.route('**/api/generate',async route=>{
   if(route.request().method()==='POST'){report.generationPosts++;return route.abort();}
   return route.fallback();
  });
  const p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));
  p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await p.goto(base);await p.locator('input[accept=".json"]').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(seed))});
  await p.getByRole('button',{name:'문장 작업으로 이동 →',exact:true}).click();
  const actual=p.getByLabel('실제 교육활동',{exact:true}),reference=p.getByLabel('참고 예시문장',{exact:true});
  const outputs=[];
  for(let i=0;i<items.length;i++){
   await p.locator('.sidebar .item').nth(i).click();
   await p.getByRole('button',{name:'예시 만들기',exact:true}).click();
   assert.equal(await actual.inputValue(),'');assert.equal(await reference.inputValue(),'');
   const rendered=await p.getByRole('region',{name:'생성한 참고 예시문장',exact:true}).locator('p').innerText();
   assert.equal(rendered,createInputExamples(items[i]).example);assert.doesNotMatch(rendered,/활동을 수행함|▪|하기,|쓰기,/);
   outputs.push(rendered);
   if(i===14)await p.screenshot({path:`${dir}/instrument-${width}.png`,fullPage:true});
  }
  await p.getByRole('button',{name:'실제 교육활동 예시 복사',exact:true}).click();
  await p.getByRole('button',{name:'참고 예시문장 복사',exact:true}).click();
  await actual.fill('교사가 수정한 실제 활동이다.');await reference.fill('교사가 보관한 참고 문장이다.');
  p.once('dialog',d=>d.dismiss());await p.getByRole('button',{name:'참고 예시문장 복사',exact:true}).click();
  assert.equal(await actual.inputValue(),'교사가 수정한 실제 활동이다.');assert.equal(await reference.inputValue(),'교사가 보관한 참고 문장이다.');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  report.views.push({width,outputs,copyEditCancelPreserved:true});await context.close();
 }
 assert.equal(report.generationPosts,0);assert.deepEqual(report.errors,[]);report.ok=true;
}finally{await writeFile(`${dir}/result.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({ok:report.ok,widths:report.views.map(v=>v.width),examplesPerWidth:elements.length,generationPosts:report.generationPosts,realModelCalls:0,errors:report.errors}));await browser.close();}
