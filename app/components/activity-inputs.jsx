'use client';
import {useState} from 'react';
import {activityIssues} from '../../lib/activity.mjs';
import {createInputExamples} from '../../lib/input-examples.mjs';

export default function ActivityInputs({item,examples,busy,onUpdate}){
 const [pair,setPair]=useState(null),[message,setMessage]=useState('');
 function makeExamples(){
  try{setPair(createInputExamples(item));setMessage('예시를 만들었습니다. 각 복사 버튼으로 입력창에 넣을 수 있습니다.');}
  catch(error){setPair(null);setMessage(error.message);}
 }
 function copy(field,label){
  if(!pair)return;
  if(item[field]&&item[field]!==pair[field]&&!window.confirm(`${label}에 작성한 글을 예시로 교체할까요? 취소하면 작성한 글을 보존합니다.`))return;
  onUpdate({[field]:pair[field]});
  setMessage(`${label} 입력창에 예시를 넣었습니다. 자유롭게 수정할 수 있습니다.`);
 }
 function preview(field,label){
  return pair&&<section className="input-example" aria-label={`생성한 ${label}`}>
   <div className="card-heading"><strong>{label}</strong><button type="button" disabled={busy} aria-label={`${label} 복사`} onClick={()=>copy(field,field==='actual'?'실제 교육활동':'참고 예시문장')}>복사</button></div>
   <p>{pair[field]}</p>
  </section>;
 }
 return <div className="card facts">
  <div className="card-heading"><h3>실제로 한 활동과 확인한 성취</h3><span className="badge">필수 입력</span></div>
  <p>새로운 활동을 추가하지 않도록 구체적으로 적어 주세요. 학생 실명·개인정보는 입력하지 마세요.</p>
  <button type="button" disabled={busy} onClick={makeExamples}>예시 만들기</button>
  <p>수업에서 실제로 한 활동과 일치하는지 확인한 뒤 사용하세요.</p>
  {message&&<p className="muted" role="status">{message}</p>}
  <label>실제 교육활동<textarea aria-label="실제 교육활동" rows={4} maxLength={4000} placeholder="예: 주변의 색을 탐색하고 10색상환을 완성함. 색 혼합·작품 제작·감상 활동은 하지 않음." value={item.actual} onChange={e=>onUpdate({actual:e.target.value})}/></label>
  {preview('actual','실제 교육활동 예시')}
  {examples.length>0&&<label>불러온 원본 예시 선택<select aria-label="불러온 원본 예시 선택" value="" onChange={e=>{if(e.target.value==='')return;const x=examples[Number(e.target.value)];if(x)onUpdate({example:x.text})}}><option value="">{examples.length}개 원본 예시 중 선택하세요</option>{examples.map((x,n)=><option key={n} value={n}>[{x.sheet} {x.cell}] {x.text.slice(0,90)}</option>)}</select></label>}
  <label>참고 예시문장<textarea aria-label="참고 예시문장" rows={3} maxLength={2000} value={item.example} onChange={e=>onUpdate({example:e.target.value})} placeholder="실제 활동에 부합하는 예시를 입력하거나 예시 만들기를 사용하세요."/></label>
  {preview('example','참고 예시문장')}
  {activityIssues(item).map(issue=><p className="muted" key={issue}>{issue}</p>)}
 </div>;
}
