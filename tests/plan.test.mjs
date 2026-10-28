import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {blankItem,LEVELS,parsePlanPages} from '../lib/core.mjs';
import {selectSubject,selectedItems,editItem,planIssues,splitCriteria,editCriterion} from '../lib/plan.mjs';
import {serializeProject,restoreProject} from '../lib/restore.mjs';
import {encodePdf,decodePdf,workbookBuffer} from '../lib/files.mjs';

const make=(patch={})=>({...blankItem(),element:'낱말 읽기',...patch});
const source={id:'source-a',name:'가상 계획.pdf',data:encodePdf(new TextEncoder().encode('%PDF-1.7\nsynthetic')),pages:[{page:1,text:'원본 추출 원문'}]};
const project=items=>({items,examples:[],sources:[source],planConfirmed:true});

test('subject and individual exclusion/reselection preserve every item and sentence',()=>{
 const a=make({approved:[{text:'낱말을 읽는 활동을 수행함.',level:'잘함'}]}),b=make(),c=make({subject:'수학'});
 const original=[a,b,c],excluded=selectSubject(original,'국어',false);
 assert.equal(excluded.length,3);assert.deepEqual(selectedItems(excluded),[c]);
 assert.deepEqual(excluded[0].approved,a.approved);
 assert.deepEqual(selectSubject(excluded,'국어',true),original);
 assert.deepEqual(selectedItems([{...excluded[0],included:true},excluded[1],c]).map(i=>i.id),[a.id,c.id]);
});
test('plan cannot be confirmed with no selection or unnamed selected rows; excluded incomplete rows are retained',()=>{
 assert.ok(planIssues([]).length);assert.ok(planIssues([make({included:false})]).length);
 assert.ok(planIssues([make({element:''})]).length);assert.ok(planIssues([make({subject:''})]).length);
 assert.deepEqual(planIssues([make(),make({element:'',included:false})]),[]);
});
test('four-level editing preserves exact other levels and never fills missing criteria',()=>{
 const text=LEVELS.map((l,n)=>`${l}: 원문 ${n}`).join('\n');
 const edited=editCriterion(text,'보통','교사가 수정한 설명');
 assert.equal(splitCriteria(edited).levels['보통'],'교사가 수정한 설명');
 for(const l of LEVELS.filter(l=>l!=='보통'))assert.equal(splitCriteria(edited).levels[l],splitCriteria(text).levels[l]);
 const unknown='수준 구분을 하지 못한 원문';
 const result=splitCriteria(editCriterion(unknown,'잘함','직접 입력'));
 assert.equal(result.unassigned,unknown);assert.equal(result.levels['노력 요함'],'');
 assert.equal(splitCriteria('잘함: 하나\n잘함: 둘').unassigned,'잘함: 하나\n잘함: 둘');
 assert.throws(()=>editCriterion('잘함: 하나\n잘함: 둘','보통','보충'));
});
test('plan edits invalidate fact confirmation and move approvals to review without losing sentences',()=>{
 const i=make({actual:'직접 확인한 실제 활동',confirmed:true,approved:[{text:'낱말을 읽는 활동을 수행함.',level:'잘함'}]});
 for(const field of ['subject','unit','area','standard','element','method','criteria','page','sourceId']){
  const edited=editItem(i,{[field]:field==='page'?2:'수정'});
  assert.equal(edited.confirmed,false);assert.equal(edited.actual,i.actual);assert.equal(edited.approved.length,0);assert.equal(edited.candidates[0].text,i.approved[0].text);
 }
 assert.deepEqual(editItem(i,{included:false}).approved,i.approved);
});
test('version 2 round trip preserves confirmed plan, excluded rows, raw PDF bytes, pages and edited criteria',()=>{
 const items=[make({sourceId:source.id,page:1,criteria:editCriterion('원문','보통','수정 기준')}),make({included:false,actual:'기존 실제 사실',example:'원본 예시'})];
 const r=restoreProject(JSON.parse(serializeProject({...project(items),activeItemId:items[1].id})));
 assert.equal(r.planConfirmed,true);assert.equal(r.items[1].included,false);assert.equal(r.items[0].criteria,items[0].criteria);
 assert.equal(r.items[0].page,1);assert.equal(r.items[0].sourceId,r.sources[0].id);assert.notEqual(r.items[0].id,items[0].id);
 assert.equal(r.activeItemId,r.items[1].id);assert.equal(r.sources[0].data,source.data);assert.deepEqual(r.sources[0].pages,source.pages);
 assert.equal(r.items[1].actual,items[1].actual);assert.equal(r.items[1].example,items[1].example);
 const longCriteria=editCriterion('미분류 원문 '.repeat(1800),'잘함','교사가 입력한 기준');
 assert.equal(restoreProject(JSON.parse(serializeProject(project([make({criteria:longCriteria})])))).items[0].criteria,longCriteria);
});
test('repeated saves/restores keep all 240 sentences and require renewed fact confirmation and approval',()=>{
 let i=make({confirmed:true,candidates:Array.from({length:120},(_,n)=>({text:`후보 ${n} 함.`,level:'잘함',errors:['재검토 필요']})),approved:Array.from({length:120},(_,n)=>({text:`승인 ${n} 함.`,level:'보통'}))});
 for(let n=0;n<3;n++){
  const r=restoreProject(JSON.parse(serializeProject(project([i]))));i=r.items[0];
  assert.equal(i.confirmed,false);assert.equal(i.approved.length,0);assert.equal(i.candidates.length,240);
  assert.equal(i.candidates[239].text,'후보 119 함.');assert.deepEqual(i.candidates[239].errors,['재검토 필요']);
 }
});
test('legacy version 1 work remains readable; plan and sentence approval never inferred',()=>{
 const i=make({page:9,approved:[{text:'기존 승인 문장을 보관함.',level:'보통'}]});
 const r=restoreProject({version:1,items:[i],examples:[]});
 assert.equal(r.planConfirmed,false);assert.equal(r.items[0].included,true);assert.equal(r.items[0].page,9);assert.equal(r.sources.length,0);assert.equal(r.items[0].candidates[0].text,i.approved[0].text);
});
test('invalid provenance, duplicate IDs and invalid plan confirmations fail safely',()=>{
 const i=make({sourceId:source.id,page:1});
 assert.throws(()=>restoreProject({...project([i]),version:2,sources:[]}));
 assert.throws(()=>restoreProject({...project([{...i,page:2}]),version:2}));
 assert.throws(()=>restoreProject({...project([i,i]),version:2}));
 assert.throws(()=>restoreProject({...project([i]),version:2,sources:[source,source]}));
 assert.throws(()=>restoreProject({...project([i]),version:2,sources:[{...source,data:'https://external.invalid/a.pdf'}]}));
 assert.equal(restoreProject({...project([make({included:false})]),version:2}).planConfirmed,false);
});
test('restoring the same file twice produces independent PDF and item IDs',()=>{
 const raw={version:2,...project([make({sourceId:source.id,page:1})])},a=restoreProject(raw),b=restoreProject(raw);
 assert.notEqual(a.items[0].id,b.items[0].id);assert.notEqual(a.sources[0].id,b.sources[0].id);
 assert.equal(a.items[0].sourceId,a.sources[0].id);assert.equal(b.items[0].sourceId,b.sources[0].id);
});
test('PDF byte encoding is lossless across chunk boundaries',()=>{
 const bytes=Uint8Array.from({length:100000},(_,i)=>i%256);assert.deepEqual(decodePdf(encodePdf(bytes)),bytes);
});
test('unsupported PDF geometry stays unextracted instead of inventing a plan',()=>{
 assert.deepEqual(parsePlanPages([{page:1,height:800,tokens:[{text:'국어과',x:10,y:10,w:30},{text:'성취기준',x:20,y:40,w:40}]}]),[]);
});
test('excluded approvals are preserved in work but never reach selected-item XLSX',async()=>{
 const chosen=make({approved:[{text:'선택한 문장을 승인함.',level:'잘함'}]}),excluded=make({included:false,approved:[{text:'제외한 문장은 보관함.',level:'보통'}]});
 const book=new ExcelJS.Workbook();await book.xlsx.load(await workbookBuffer(selectedItems([chosen,excluded])));
 const values=[];book.eachSheet(s=>s.eachRow(r=>r.eachCell(c=>values.push(c.value))));
 assert.ok(values.includes(chosen.approved[0].text));assert.ok(!values.includes(excluded.approved[0].text));assert.equal(excluded.approved.length,1);
});
