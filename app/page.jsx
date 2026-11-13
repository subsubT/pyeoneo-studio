'use client';
import {useState,useEffect,useRef} from 'react';
import {itemLevels,generationPlan,countIssues,orderedCandidates,confirmationSnapshot,approvalIssues} from '../lib/batch.mjs';
import {GenerationResultError,generationSignature,appendGeneratedBatch,readGenerationResponse,generationFailureMessage} from '../lib/generation-result.mjs';
import {activityIssues} from '../lib/activity.mjs';
import {blankItem,LEVELS,combine} from '../lib/core.mjs';
import {readPdf,readExamples,workbookBuffer,download} from '../lib/files.mjs';

import PlanReview from './components/plan-review';
import ActivityInputs from './components/activity-inputs';
import {selectedItems,selectSubject,editItem,planIssues} from '../lib/plan.mjs';
import {serializeProject,restoreProject} from '../lib/restore.mjs';
import {assertWorkSize,FileLimitError,WORK_FILE_LIMIT_LABEL} from '../lib/file-limits.mjs';

export default function Home(){
 const [items,setItems]=useState([]),[selected,setSelected]=useState(''),[step,setStep]=useState(1),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[examples,setExamples]=useState([]),[sources,setSources]=useState([]),[planConfirmed,setPlanConfirmed]=useState(false),[view,setView]=useState('review'),[level,setLevel]=useState(LEVELS[0]),[manual,setManual]=useState(''),[ids,setIds]=useState([]),[ack,setAck]=useState({});
 const [aiEnabled,setAiEnabled]=useState(false),[generationResult,setGenerationResult]=useState(null);
 const candidateList=useRef(null);
 const busyRef=useRef(false),generationRevision=useRef(0),generationController=useRef(null);
 const [aiTimeout,setAiTimeout]=useState(290000);
 useEffect(()=>{let alive=true;fetch('/api/generate',{cache:'no-store'}).then(r=>r.json()).then(s=>{if(alive){setAiEnabled(s.enabled===true);if(s.mode==='local')setAiTimeout(370000)}}).catch(()=>{});return()=>{alive=false}},[]);
 async function generate(){
  if(busyRef.current)return;
  setNotice('');
  const failed=message=>setGenerationResult({itemId:item?.id,kind:'error',message:`${message} 이번 후보는 추가되지 않았고 기존 작업은 보존됐습니다.`});
  if(!item||!planConfirmed||item.included===false)return failed('평가계획과 대상 항목을 먼저 확인해 주세요.');
  if(!aiEnabled)return failed('AI 연결이 비활성 상태입니다.');
  const issues=[...activityIssues(item),...countIssues(generationPlan(item),item.candidates.length+item.approved.length)];
  if(issues.length)return failed(issues.join(' '));
  busyRef.current=true;setBusy(true);
  const revision=generationRevision.current;let controller,requestSignal;
  setGenerationResult({itemId:item.id,kind:'pending',message:'후보 생성과 독립 검토를 요청합니다. 완료를 기다려 주세요.'});
  try{
   const snapshot={id:item.id,signature:generationSignature(item),actual:item.actual,example:item.example,levels:generationPlan(item).map(l=>({...l,count:Number(l.count)})),existing:[...item.approved,...item.candidates].map(c=>c.text)};
   controller=new AbortController();generationController.current=controller;
   requestSignal=AbortSignal.any([controller.signal,AbortSignal.timeout(aiTimeout)]);
   let response;
   try{response=await fetch('/api/generate',{method:'POST',signal:requestSignal,headers:{'Content-Type':'application/json'},body:JSON.stringify({actual:snapshot.actual,example:snapshot.example,levels:snapshot.levels,existing:snapshot.existing})});}
   catch(e){throw new GenerationResultError(controller.signal.aborted?'CANCELLED':e.name==='TimeoutError'?'TIMEOUT':'NETWORK');}
   const candidates=await readGenerationResponse(response,snapshot.levels);
   if(controller.signal.aborted)throw new GenerationResultError('CANCELLED');
   if(generationRevision.current!==revision){setGenerationResult({itemId:snapshot.id,kind:'discarded',message:'입력이나 대상이 바뀌어 이전 요청의 후보를 반영하지 않았습니다. 이번 후보는 추가되지 않았고 기존 작업은 보존됐습니다. 현재 입력으로 다시 생성해 주세요.'});return;}
   const added=candidates.map(c=>({...c,id:crypto.randomUUID(),level:snapshot.levels.find(l=>l.id===c.levelId).name,source:'AI 후보'}));
   setItems(prev=>appendGeneratedBatch(prev,snapshot,added));
   setAck({});setGenerationResult({itemId:snapshot.id,kind:'applying',newIds:added.map(c=>c.id),message:'후보 목록 반영을 확인하고 있습니다.'});
  }catch(e){
   // Cancellation/input changes win even if a late HTTP/parse failure arrives afterwards.
   if(controller?.signal.aborted)e=new GenerationResultError('CANCELLED');
   else if(requestSignal?.aborted)e=new GenerationResultError('TIMEOUT');
   if(controller&&!controller.signal.aborted&&generationRevision.current!==revision)setGenerationResult({itemId:item.id,kind:'discarded',message:'입력이나 대상이 바뀌어 이전 요청의 후보를 반영하지 않았습니다. 이번 후보는 추가되지 않았고 기존 작업은 보존됐습니다.'});
   else setGenerationResult({itemId:item.id,kind:e?.code==='CANCELLED'?'cancelled':'error',message:generationFailureMessage(e)});
  }finally{if(generationController.current===controller)generationController.current=null;busyRef.current=false;setBusy(false);}
 }
 const activeItems=selectedItems(items);
 const item=(step===1?items:activeItems).find(i=>i.id===selected);const total=activeItems.reduce((n,i)=>n+i.approved.length,0);
 const stages=item?itemLevels(item):[],plan=item?generationPlan(item):[],newCount=plan.reduce((n,l)=>n+Number(l.count),0);
 const rows=item?orderedCandidates(item):[];
 // This runs after the candidate rows commit. A 200 response alone is never success.
 useEffect(()=>{
  if(generationResult?.kind!=='applying')return;
  const present=new Set(Array.from(candidateList.current?.querySelectorAll('[data-candidate-id]')||[],el=>el.dataset.candidateId));
  const applied=item?.id===generationResult.itemId&&generationResult.newIds.every(id=>present.has(id));
  setGenerationResult(result=>result?.kind!=='applying'?result:{...result,kind:applied?'success':'discarded',message:applied?`새 후보 ${result.newIds.length}개를 목록에 추가했습니다. 아래 버튼으로 이번 신규 후보 위치를 확인하세요.`:'대상 항목이나 입력 상태가 달라 후보를 반영하지 않았습니다. 이번 후보는 추가되지 않았고 기존 작업은 보존됐습니다. 다시 생성해 주세요.'});
 },[items,selected,step,view,generationResult,item]);
 function showNewCandidates(){
  const first=Array.from(candidateList.current?.querySelectorAll('[data-candidate-id]')||[]).find(el=>generationResult?.newIds?.includes(el.dataset.candidateId));
  first?.scrollIntoView({behavior:'smooth',block:'center'});
 }
 const combinations=(()=>{try{return combine(activeItems,ids)}catch{return []}})();
 function update(patch){generationRevision.current++;setItems(prev=>prev.map(i=>i.id===selected?editItem(i,patch):i));setAck({});}
 function editPlan(patch){update(patch);setPlanConfirmed(false);}
 function toggle(id,included){setItems(prev=>prev.map(i=>i.id===id?{...i,included}:i));setPlanConfirmed(false);setIds(a=>a.filter(x=>x!==id));setAck({});}
 function subjectSelection(subject,included){setItems(prev=>selectSubject(prev,subject,included));setPlanConfirmed(false);setIds([]);setAck({});}
 function confirmPlan(){const issues=planIssues(items);if(issues.length){setNotice(issues.join(' '));return;}setPlanConfirmed(true);setSelected(activeItems.some(i=>i.id===selected)?selected:activeItems[0].id);setStep(2);setView('review');setAck({});setNotice('선택한 평가계획을 확정했습니다. 실제 수행한 활동과 예시문장은 별도로 입력·확인하세요.');}
 async function saveWork(){await run(async()=>download(serializeProject({items,examples,sources,planConfirmed,activeItemId:selected,combinationIds:ids}),'평어담-작업.json','application/json'));}
 async function openWork(e){const input=e.currentTarget,f=input.files?.[0];input.value='';if(!f)return;await run(async()=>{
  assertWorkSize(f.size);
  let v;try{v=restoreProject(JSON.parse(await f.text()));}catch(error){if(error instanceof FileLimitError)throw error;throw Error('작업 파일 형식 또는 PDF 출처 정보가 올바르지 않습니다. 기존 작업은 유지됩니다.');}
  const empty=items.length===0&&sources.length===0;
  const merged={items:[...items,...v.items],examples:[...examples,...v.examples],sources:[...sources,...v.sources],planConfirmed:empty?v.planConfirmed:false,activeItemId:v.activeItemId,combinationIds:items.length===0?v.combinationIds:[]};
  serializeProject(merged);
  setItems(merged.items);setExamples(merged.examples);setSources(merged.sources);setPlanConfirmed(merged.planConfirmed);setSelected(merged.activeItemId);setIds(merged.combinationIds);setStep(1);setAck({});setManual('');setNotice('작업을 추가로 불러왔습니다. 항목 선택·계획·PDF 원본을 복원했습니다. 기존 승인 문장은 후보로 보관되며 전체 확인과 재승인이 필요합니다.');
 });}
 async function run(fn){if(busyRef.current)return;busyRef.current=true;setBusy(true);setNotice('');try{await fn()}catch(e){setNotice(e.message||'작업을 완료하지 못했습니다.')}finally{busyRef.current=false;setBusy(false)}}
 function add(){if(busy||items.length>=100)return;const n=blankItem();setItems(a=>[...a,n]);setSelected(n.id);setStep(1);setPlanConfirmed(false);setAck({});}
 async function uploadPdf(f){if(!f)return;await run(async()=>{
  const result=await readPdf(f),source={id:crypto.randomUUID(),name:f.name,data:result.data,pages:result.pages};
  const added=result.items.map(i=>({...i,sourceId:source.id}));
  const next={items:[...items,...added],examples,sources:[...sources,source],planConfirmed:false,activeItemId:added[0]?.id||selected,combinationIds:ids};
  serializeProject(next);
  setSources(next.sources);setItems(next.items);setPlanConfirmed(next.planConfirmed);setSelected(next.activeItemId);setAck({});
  setNotice(added.length?`${added.length}개 평가 항목을 추출했습니다. 전체 목록에서 선택하고 원본과 비교해 수정한 뒤 확정하세요.`:'지원하는 표를 찾지 못했습니다. 전체 추출 원문과 원본 PDF를 참고하여 항목을 직접 추가하세요. 스캔 PDF는 문자 인식 후 사용하세요.');
 });}
 function editCandidate(id,text){update({candidates:item.candidates.map(c=>c.id===id?{...c,text,edited:true,semanticPass:false,errors:[]}:c)});}
 function approveAll(){
  if(!item||busyRef.current)return;
  if(!planConfirmed||item.included===false)return setNotice('평가계획을 먼저 확정하세요.');
  if(ack.itemId!==item.id||ack.snapshot!==confirmationSnapshot(item))return setNotice('현재 후보 목록을 전체 확인해 주세요.');
  const issues=[...activityIssues(item),...approvalIssues(item)];
  if(item.approved.length+item.candidates.length>item.target)issues.push('항목별 승인 목표를 전체 문장 수 이상으로 늘려 주세요.');
  if(issues.length)return setNotice(issues.join(' / '));
  update({candidates:[],approved:[...item.approved,...rows.map(c=>({...c,approvedAt:new Date().toISOString(),actualSnapshot:item.actual,exampleSnapshot:item.example}))]});
  setNotice(`${rows.length}개 전체 문장을 승인했습니다.`);
 }
 function move(index,d){const a=[...item.approved];[a[index],a[index+d]]=[a[index+d],a[index]];update({approved:a});}
 return <div className="app"><header><a className="brand" href="/" aria-label="평어담 처음으로"><img className="brand-mark" src="/icon.svg?v=quote-bowl-1" width="39" height="39" alt="" aria-hidden="true"/><strong>평어담</strong><span className="brand-sub">교과 평가 문장 작업실</span></a><span className="private"><i/>로그인 없이 · 내 브라우저에서 작업</span></header>
 <main><section className="intro"><div><div className="eyebrow">TEACHER’S WRITING STUDIO</div><h1>배움의 사실을 담아,<br/><em>평가 문장을 다듬어요.</em></h1><p>실제로 한 활동을 입력하고, 문장을 검토하세요.<br/>선생님이 승인한 문장만 최종 결과에 담깁니다.</p></div><aside className="principle"><span className="small-label">우리의 작업 원칙</span><h2>활동은 있는 그대로.<br/>평가 문구 예시는 다양하게!</h2><p>평가 기록의 다양한 예시를 제안해드립니다.</p><p>선생님의 평가 업무 수고를 덜어드립니다.</p><span className="leaf" aria-hidden="true">✳</span></aside></section>
 <nav className="steps" aria-label="작업 단계"><button className={step===1?'active':''} disabled={busy} onClick={()=>setStep(1)}><span>01</span>평가계획 추출 · 검토 · 선택<b>{items.length}</b></button><button className={step===2?'active':''} disabled={busy||!planConfirmed} onClick={()=>{setSelected(activeItems.some(i=>i.id===selected)?selected:activeItems[0]?.id||'');setStep(2)}}><span>02</span>평가문장 생성 · 검토 · 승인 · 내보내기<b>{total}</b></button></nav>
 {notice&&<div className="notice" role="status">{notice}<button aria-label="알림 닫기" onClick={()=>setNotice('')}>×</button></div>}
 <div className={`workspace ${step===1?'plan-workspace':''}`}><aside className={`sidebar ${step===1?'plan-sidebar':''}`}>{step===2&&<><div className="sidebar-title"><h2>확정한 평가 항목</h2><span>{activeItems.length}</span></div><p className="muted">선택한 항목별로 사실과 문장을 관리해요.</p><button className="add" disabled={busy} onClick={()=>setStep(1)}>← 평가계획 수정 · 선택</button><div className="item-list">{activeItems.map((i,n)=><button key={i.id} className={`item ${selected===i.id?'selected':''}`} disabled={busy} onClick={()=>{generationRevision.current++;setSelected(i.id);setAck({});setManual('')}}><span>{i.subject} <small>{i.page?`PDF ${i.page}쪽`:'직접 입력'}</small></span><strong>{i.element||i.unit||`새 평가 항목 ${n+1}`}</strong><div className="progress"><i style={{width:`${Math.min(100,i.approved.length/i.target*100)}%`}}/></div><small>승인 {i.approved.length} / {i.target}</small></button>)}</div>{!activeItems.length&&<div className="empty-side">아직 평가 항목이 없어요.<br/>PDF를 불러오거나<br/>직접 추가해 주세요.</div>}</>}<div className="session-note">자료는 서버에 저장하지 않습니다. 창을 닫으면 작업이 사라집니다. 원본 PDF도 작업 파일에 포함됩니다. 작업 파일을 저장해 이어서 사용하세요.</div><button className="text-button" disabled={busy||(!items.length&&!sources.length)} onClick={saveWork}>↓ 작업 파일 저장</button><label className={`text-button file-label ${busy?'disabled':''}`}>↑ 작업 이어서 열기<input disabled={busy} type="file" accept=".json" onChange={openWork}/></label><span className="muted">원본 PDF 포함 · 최대 {WORK_FILE_LIMIT_LABEL}</span></aside>
 <section className="content">
 {step===1&&<PlanReview items={items} item={item} sources={sources} busy={busy} confirmed={planConfirmed} onSelect={id=>{generationRevision.current++;setSelected(id);setAck({});setManual('')}} onUpdate={editPlan} onToggle={toggle} onSubject={subjectSelection} onAdd={add} onUpload={uploadPdf} onUploadError={setNotice} onConfirm={confirmPlan}/>}
 {step===2&&<nav className="work-tabs" aria-label="문장 작업 보기"><button className={view==='review'?'primary':''} disabled={busy} onClick={()=>setView('review')}>실제 활동 · 생성 · 검토 · 승인</button><button className={view==='export'?'primary':''} disabled={busy} onClick={()=>setView('export')}>조합 · XLSX 내보내기</button></nav>}
 {step===2&&view==='review'&&<><div className="section-heading"><div><span className="eyebrow">02 · REVIEW</span><h2>문장을 검토하고 모으기</h2></div><span className="badge amber">{aiEnabled?'AI 후보 생성':'AI 연결 대기'}</span></div>{item?<><label className="upload example-upload"><strong>참고 예시 XLSX 불러오기</strong><span>5MB · 원본 문장 보존</span><input disabled={busy} type="file" accept=".xlsx" onChange={e=>{const f=e.target.files?.[0];if(f)run(async()=>{setExamples(await readExamples(f));setNotice('예시문장을 불러왔습니다. 항목에 맞는 문장을 선택하세요.')});e.target.value=''}}/></label> <ActivityInputs key={item.id} item={item} examples={examples} busy={busy} onUpdate={update}/><div className="card"><h3>{item.element||'평가 항목'}</h3><p className="quote">{item.actual||'먼저 실제 교육활동을 입력하세요.'}</p><details><summary>원본 예시문장</summary><p>{item.example||'예시 없음'}</p></details><div className="generation-counts"><h4>단계별 생성할 후보 수</h4>{plan.map(l=><label key={l.id}>{l.name}<input aria-label={`${l.name} 생성할 후보 수`} disabled={busy} type="number" min={0} max={24} step={1} value={l.count} onChange={e=>update({generationCounts:{...Object.fromEntries(plan.map(x=>[x.id,x.count])),[l.id]:e.target.value}})}/></label>)}</div><p className="generation-total">이번에 새로 생성할 후보: 총 {Number.isFinite(newCount)?newCount:'—'}개</p><label>항목별 승인 목표<input aria-label="항목별 승인 목표" disabled={busy} type="number" min={1} max={120} value={item.target} onChange={e=>update({target:Math.max(item.approved.length,Math.min(120,Math.max(1,Number(e.target.value))))})}/></label><div className="generation-controls"><div className="generation-buttons"><button className="primary" disabled={!aiEnabled||busy} onClick={generate}>{busy?'생성·검증 중…':`AI 후보 ${Number.isFinite(newCount)?newCount:'—'}개 생성${aiEnabled?'':' · 연결 대기'}`}</button>{busy&&generationController.current&&<button onClick={()=>{generationRevision.current++;generationController.current?.abort()}}>생성 취소</button>}</div>{generationResult?.itemId===item.id&&<div className="generation-result" role="status" data-kind={generationResult.kind}><p>{generationResult.message}</p>{generationResult.kind==='success'&&rows.some(c=>generationResult.newIds.includes(c.id))&&<button onClick={showNewCandidates}>이번 새 후보 보기</button>}{!['pending','applying'].includes(generationResult.kind)&&<button className="text-button" aria-label="생성 결과 닫기" onClick={()=>setGenerationResult(null)}>닫기</button>}</div>}</div><p className="muted">{aiEnabled?'선택 항목의 실제 활동·예시·단계별 개수와 기준·기존 문장만 AI 제공사에 전송합니다. PDF 전체·학생 실명은 보내지 마세요. 생성 후 별도 AI 검토를 거치며 자동 승인은 하지 않습니다.':'AI 연결이 비활성 상태입니다. 입력과 기존 후보는 보존되며 직접 작성·검토·승인할 수 있습니다.'}</p></div><div className="card"><h3>직접 작성한 후보 추가</h3><label>직접 작성 평가 단계<select aria-label="직접 작성 평가 단계" disabled={busy} value={stages.some(l=>l.id===level)?level:stages[0]?.id} onChange={e=>setLevel(e.target.value)}>{stages.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label><label>검토할 문장<textarea aria-label="검토할 문장" value={manual} maxLength={1200} rows={3} onChange={e=>setManual(e.target.value)} placeholder="실제 활동을 자연스럽게 표현한 문장을 입력하세요."/></label><button disabled={busy||!manual.trim()||activityIssues(item).length||item.candidates.length+item.approved.length>=120} onClick={()=>{update({candidates:[...item.candidates,{id:crypto.randomUUID(),text:manual.trim(),levelId:stages.find(l=>l.id===level)?.id||stages[0].id,level:stages.find(l=>l.id===level)?.name||stages[0].name,source:'직접 작성',edited:true,errors:[]}]});setManual('')}}>후보에 추가</button></div><div className="card-heading"><h3>검토할 후보 <small>{item.candidates.length}</small></h3></div>{!!rows.length&&<><div ref={candidateList} className="candidate-list" aria-label="전체 단계 후보 목록"><div className="candidate-columns" aria-hidden="true"><span>번호</span><span>평가 단계</span><span>문장</span><span>조작</span></div>{rows.map((c,n)=><article className="candidate-row" key={c.id} data-candidate-id={c.id} data-new={generationResult?.kind==='success'&&generationResult.newIds.includes(c.id)?'true':undefined}><span className="candidate-number">{n+1}</span><select aria-label={`${n+1}번 평가 단계`} disabled={busy} value={c.levelId??c.level} onChange={e=>update({candidates:item.candidates.map(x=>x.id===c.id?{...x,levelId:e.target.value,level:stages.find(l=>l.id===e.target.value).name,edited:true,semanticPass:false,errors:[]}:x)})}>{!stages.some(l=>l.id===(c.levelId??c.level))&&<option value={c.levelId??c.level}>단계 확인</option>}{stages.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select><textarea aria-label={`${n+1}번 후보 문장 수정`} disabled={busy} rows={2} value={c.text} maxLength={1200} onChange={e=>editCandidate(c.id,e.target.value)}/><div className="candidate-actions"><button disabled={busy} onClick={()=>run(async()=>{await navigator.clipboard.writeText(c.text);setNotice('문장을 복사했습니다.')})}>복사</button><button disabled={busy} onClick={()=>update({candidates:item.candidates.filter(x=>x.id!==c.id)})}>삭제</button></div></article>)}</div><div className="bulk-confirm"><p>현재 항목의 전체 후보 {rows.length}개 확인</p><label className="check"><input type="checkbox" disabled={busy} checked={ack.itemId===item.id&&ack.snapshot===confirmationSnapshot(item)} onChange={e=>setAck(e.target.checked?{itemId:item.id,snapshot:confirmationSnapshot(item)}:{})}/>수정한 문장들이 평가의 실제 활동을 정확하고 자연스럽게 표현했음을 확인했습니다.</label><button className="primary" disabled={busy} onClick={approveAll}>전체 문장 승인</button></div></>}{!rows.length&&<p className="empty-inline">아직 검토할 후보가 없습니다.</p>}
 <div className="card-heading"><h3>승인한 문장 <small>{item.approved.length} / {item.target}</small></h3><button onClick={()=>setView('export')}>최종 결과 보기 →</button></div>{item.approved.map((c,n)=><article className="approved" key={c.id}><span className="number">{String(n+1).padStart(2,'0')}</span><div><span className="muted">{c.level}</span><p>{c.text}</p><div className="actions"><button disabled={n===0} onClick={()=>move(n,-1)} aria-label="위로 이동">↑</button><button disabled={n===item.approved.length-1} onClick={()=>move(n,1)} aria-label="아래로 이동">↓</button><button onClick={()=>run(async()=>{await navigator.clipboard.writeText(c.text);setNotice('문장을 복사했습니다.')})}>복사</button><button onClick={()=>update({approved:item.approved.filter(x=>x.id!==c.id),candidates:[...item.candidates,{...c,edited:true,errors:[]}]})}>승인 해제 · 수정</button><button onClick={()=>update({approved:item.approved.filter(x=>x.id!==c.id)})}>삭제</button></div></div></article>)}</>:<div className="empty"><h3>평가 항목을 먼저 추가하세요.</h3><button onClick={()=>setStep(1)}>자료 입력으로</button></div>}</>}
 {step===2&&view==='export'&&<><div className="section-heading"><div><span className="eyebrow">02 · EXPORT</span><h2>승인한 문장으로 완성하기</h2></div><span className="badge">전체 {total}개 승인</span></div><div className="card"><h3>교과별 조합</h3><p>같은 교과의 항목을 2개 이상 선택하세요. 선택한 순서대로 각 항목의 1번 문장끼리, 2번 문장끼리 이어 붙입니다.</p>{activeItems.map(i=><label className="check selection" key={i.id}><input type="checkbox" disabled={!i.approved.length} checked={ids.includes(i.id)} onChange={e=>setIds(a=>e.target.checked?[...a,i.id]:a.filter(id=>id!==i.id))}/><span>{i.subject} · {i.element||i.unit||'이름 없는 항목'} <small>승인 {i.approved.length}개 {ids.includes(i.id)?`· 연결 순서 ${ids.indexOf(i.id)+1}`:''}</small></span></label>)}{ids.length>=2&&!combinations.length&&<p className="error">승인 문장이 있는 같은 교과 항목만 선택하세요.</p>}<p className="muted">조합 개수는 선택한 항목 중 승인 문장이 가장 적은 항목에 맞춥니다. 원래 승인 문장은 모두 개별 시트에 포함됩니다.</p></div>{combinations.map((c,n)=><article className="approved" key={n}><span className="number">{n+1}</span><div><span className="muted">{c.subject} · 조합</span><p>{c.text}</p><button onClick={()=>run(async()=>{await navigator.clipboard.writeText(c.text);setNotice('조합 문장을 복사했습니다.')})}>복사</button></div></article>)}<div className="export-card"><div><h3>교실에서 바로 활용하세요.</h3><p>승인한 개별 평어와 현재 선택한 조합을 XLSX로 저장합니다.<br/>교과별 시트 · 항목별 열 · 문장 사이 여백</p></div><button className="primary" disabled={!total||busy} onClick={()=>run(async()=>download(await workbookBuffer(activeItems,combinations),'평어담-승인결과.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))}>XLSX 다운로드 ↓</button></div></>}
 </section></div><footer><strong>평어담</strong><span>사실을 입력하고, 표현을 검토하고, 선생님의 판단으로 완성합니다.</span><span>{aiEnabled?'요청한 항목의 입력만 AI 제공사에 전송하며 앱 서버에 보관하지 않습니다.':'현재 자료·결과는 서버에 보관하거나 AI에 전송하지 않습니다.'}</span></footer></main></div>
}
