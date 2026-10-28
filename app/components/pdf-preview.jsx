'use client';
import {useEffect,useRef,useState} from 'react';
import {decodePdf} from '../../lib/files.mjs';

export default function PdfPreview({source,page}){
 const canvas=useRef(null),[message,setMessage]=useState(''),[zoom,setZoom]=useState(false);
 useEffect(()=>{
  if(!source)return;
  let cancelled=false,loading,document,render;
  setMessage('원본 PDF를 여는 중…');
  (async()=>{
   const pdfjs=await import('pdfjs-dist/build/pdf.min.mjs');
   if(cancelled)return;
   pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';
   loading=pdfjs.getDocument({data:decodePdf(source.data),isEvalSupported:false});
   document=await loading.promise;
   if(cancelled)return;
   const pdfPage=await document.getPage(page);
   if(cancelled)return;
   const base=pdfPage.getViewport({scale:1}),viewport=pdfPage.getViewport({scale:Math.min(1.6,1400/base.width)});
   const target=canvas.current;
   target.width=viewport.width;target.height=viewport.height;
   render=pdfPage.render({canvasContext:target.getContext('2d'),viewport});
   await render.promise;
   if(!cancelled)setMessage('');
  })().catch(()=>{if(!cancelled)setMessage('원본 PDF를 표시하지 못했습니다. 추출 원문을 확인하거나 원본 파일을 따로 열어 대조하세요.');});
  return ()=>{cancelled=true;render?.cancel();if(document)void document.destroy().catch(()=>{});else if(loading)void loading.destroy().catch(()=>{});};
 },[source,page]);
 if(!source)return <p className="muted">{page?`PDF ${page}쪽으로 기록된 항목입니다. 이전 작업 파일에는 원본 PDF가 포함되지 않았습니다.`:'직접 입력한 항목입니다. 필요하면 원본 PDF와 쪽수를 지정하세요.'}</p>;
 return <div className="pdf-preview"><div className="card-heading"><span>{source.name} · {page}쪽</span><button onClick={()=>setZoom(v=>!v)}>{zoom?'쪽 맞춤':'확대 보기'}</button></div>{message&&<p role="status">{message}</p>}<div className={`pdf-canvas ${zoom?'zoom':''}`}><canvas ref={canvas} aria-label={`${source.name} 원본 ${page}쪽`} hidden={!!message}/></div></div>;
}
