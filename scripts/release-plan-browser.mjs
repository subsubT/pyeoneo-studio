// Synthetic CP6 release regression. No original teaching documents or live AI.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import ExcelJS from 'exceljs';
import {LEVELS} from '../lib/core.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3008',dir=process.env.TEST_OUTPUT_DIR||'tmp/release-plan';
const proxy=!['localhost','127.0.0.1'].includes(new URL(base).hostname)&&process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined;
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,proxy,executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium'});
const context=await browser.newContext({proxy,acceptDownloads:true});
const errors=[],warnings=[];
context.on('page',p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});});
const save=async(p,name)=>{const event=p.waitForEvent('download');await p.getByRole('button',{name:'↓ 작업 파일 저장',exact:true}).click();await (await event).saveAs(`${dir}/${name}.json`);return JSON.parse(await readFile(`${dir}/${name}.json`,'utf8'));};
try{
 const fixture=await context.newPage();await fixture.setContent('<h1>SYNTHETIC ASSESSMENT SOURCE</h1><p>Observation of colors and completion of a color wheel.</p>');await fixture.pdf({path:`${dir}/synthetic.pdf`});await fixture.close();
 const p=await context.newPage();await p.goto(base);
 await p.locator('input[accept=".pdf"]').setInputFiles(`${dir}/synthetic.pdf`);
 await p.getByText(/지원하는 표를 찾지 못했습니다/).waitFor();
 assert.equal(await p.locator('.plan-table tbody tr').count(),0);
 for(let n=0;n<3;n++){
  await p.getByRole('button',{name:'＋ 누락 항목 직접 추가',exact:true}).click();
  await p.getByLabel('교과',{exact:true}).fill(n===2?'수학':'즐거운생활');
  await p.getByLabel('평가 요소',{exact:true}).fill(['주변의 색 탐색하기','10색상환 완성하기','두 수의 크기 비교하기'][n]);
  for(const level of LEVELS)await p.getByLabel(level,{exact:true}).fill(`${level} 합성 기준 ${n}`);
  await p.getByLabel('원본 PDF',{exact:true}).selectOption({index:1});
  await p.locator('.pdf-preview canvas:visible').waitFor();
 }
 await p.getByRole('button',{name:'수학 전체 해제',exact:true}).click();
 await p.getByRole('button',{name:'즐거운생활 전체 해제',exact:true}).click();
 assert.equal(await p.getByRole('button',{name:'선택한 평가계획 확정 →',exact:true}).isDisabled(),true);
 await p.getByRole('button',{name:'즐거운생활 전체 선택',exact:true}).click();
 const first=p.locator('.plan-table tbody tr').first();await first.getByRole('checkbox').uncheck();await first.getByRole('checkbox').check();
 const draft=await save(p,'draft');assert.equal(draft.items.length,3);assert.equal(draft.items.filter(i=>i.included).length,2);
 assert.deepEqual(Buffer.from(draft.sources[0].data,'base64'),await readFile(`${dir}/synthetic.pdf`));
 assert.match(draft.sources[0].pages[0].text,/SYNTHETIC/);
 await p.getByRole('button',{name:'선택한 평가계획 확정 →',exact:true}).click();assert.equal(await p.locator('.sidebar .item').count(),2);
 const book=new ExcelJS.Workbook();book.addWorksheet('합성').getCell('A1').value='주변의 색을 찾아보는 활동을 수행함.';await book.xlsx.writeFile(`${dir}/reference.xlsx`);
 await p.locator('input[accept=".xlsx"]').setInputFiles(`${dir}/reference.xlsx`);
 await p.getByLabel('불러온 원본 예시 선택',{exact:true}).selectOption('0');
 assert.equal(await p.getByLabel('참고 예시문장',{exact:true}).inputValue(),'주변의 색을 찾아보는 활동을 수행함.');
 assert.equal(await p.getByRole('checkbox',{name:'실제 수행한 활동과 확인된 성취임을 확인했습니다.',exact:true}).isDisabled(),true);
 const final=await save(p,'confirmed');assert.equal(final.planConfirmed,true);
 const restored=await context.newPage();await restored.goto(base);await restored.locator('input[accept=".json"]').setInputFiles(`${dir}/confirmed.json`);
 await restored.getByRole('button',{name:'문장 작업으로 이동 →',exact:true}).waitFor();
 assert.equal(await restored.locator('.plan-table tbody tr').count(),3);
 await restored.locator('.plan-table tbody tr').first().getByRole('button',{name:'검토 · 편집',exact:true}).click();
 await restored.locator('.pdf-preview canvas:visible').waitFor();
 for(const level of LEVELS)assert.equal(await restored.getByLabel(level,{exact:true}).inputValue(),`${level} 합성 기준 0`);
 const roundtrip=await save(restored,'roundtrip');assert.equal(roundtrip.sources[0].data,final.sources[0].data);assert.equal(roundtrip.items[2].included,false);
 await restored.getByLabel('단원',{exact:true}).fill('수정한 합성 단원');
 assert.equal(await restored.getByRole('button',{name:/평가문장 생성 · 검토 · 승인 · 내보내기/}).isDisabled(),true);
 assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);
 await restored.screenshot({path:`${dir}/plan.png`,fullPage:true});
 const report={ok:true,syntheticPdf:true,originalPdf:false,items:3,selected:2,excluded:1,pdfBytesPreserved:true,canvasRendered:true,criteriaRestored:true,xlsxReferenceRead:true,planEditRequiresConfirmation:true,errors,warnings};
 await writeFile(`${dir}/result.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
