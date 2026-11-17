import {parsePlanPages} from './core.mjs';
import {assertPdfSize} from './file-limits.mjs';
import {rawPdfText} from './pdf-text.mjs';
import {pdfTableLines} from './pdf-table.mjs';
export function encodePdf(bytes){let binary='';for(let n=0;n<bytes.length;n+=32768)binary+=String.fromCharCode(...bytes.subarray(n,n+32768));return btoa(binary);}
export function decodePdf(data){return Uint8Array.from(atob(data),c=>c.charCodeAt(0));}
// The same-version minified entry avoids the Next dev eval-source-map/ESM name collision.
export async function readPdf(file){
 assertPdfSize(file.size);
 const pdfjs=await import('pdfjs-dist/build/pdf.min.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';
 const bytes=new Uint8Array(await file.arrayBuffer());
 assertPdfSize(bytes.byteLength);
 if(new TextDecoder().decode(bytes.subarray(0,5))!=='%PDF-')throw Error('올바른 PDF 파일이 아닙니다.');
 // PDF.js transfers/detaches this buffer. Preserve the original before transfer,
 // without reading the File again or retaining an additional full byte buffer.
 const data=encodePdf(bytes);
 const loading=pdfjs.getDocument({data:bytes,isEvalSupported:false});
 try{
  const doc=await loading.promise;
  const pages=[];
  for(let n=1;n<=doc.numPages;n++){
   const p=await doc.getPage(n);
   try{
    const v=p.getViewport({scale:1}),c=await p.getTextContent();
    let lines=[];
    try{lines=pdfTableLines(await p.getOperatorList(),v,pdfjs.OPS);}catch{/* Text/original PDF remain available for manual review. */}
    const tokens=c.items.filter(t=>'str'in t).map(t=>{
     const transform=pdfjs.Util.transform(v.transform,t.transform),length=Math.hypot(t.transform[0],t.transform[1])||1;
     const start=v.convertToViewportPoint(t.transform[4],t.transform[5]);
     const end=v.convertToViewportPoint(t.transform[4]+t.width*t.transform[0]/length,t.transform[5]+t.width*t.transform[1]/length);
     return {text:t.str,x:Math.min(start[0],end[0]),y:Math.max(start[1],end[1]),w:Math.abs(end[0]-start[0]),h:Math.hypot(transform[2],transform[3]),fontHeight:Math.hypot(transform[2],transform[3]),font:t.fontName,fontFamily:c.styles[t.fontName]?.fontFamily,ascent:c.styles[t.fontName]?.ascent,descent:c.styles[t.fontName]?.descent,hasEOL:t.hasEOL,dir:t.dir,transform,unsupportedOrientation:Math.abs(end[1]-start[1])>1};
    });
    pages.push({page:n,width:v.width,height:v.height,tokens,lines});
   }finally{p.cleanup();}
  }
  const extractionAudit=[],items=parsePlanPages(pages,{audit:extractionAudit});
  return {data,items,extractionAudit,pages:pages.map((p,n)=>({page:p.page,text:rawPdfText(p.tokens),reviewRequired:extractionAudit[n].reviewRequired}))};
 }finally{await loading.destroy();}
}
export async function readExamples(file){if(file.size>5*1024*1024)throw Error('XLSX는 5MB 이하만 가능합니다.');const {default:ExcelJS}=await import('exceljs');const book=new ExcelJS.Workbook();await book.xlsx.load(await file.arrayBuffer());const entries=[];book.eachSheet(s=>s.eachRow(row=>row.eachCell(cell=>{if(entries.length>=2000)return;if(typeof cell.value==='string'&&cell.value.trim().length>=12)entries.push({sheet:s.name,cell:cell.address,text:cell.value});})));return entries;}
export async function workbookBuffer(items,combinations=[]){const {default:ExcelJS}=await import('exceljs');const book=new ExcelJS.Workbook();book.creator='평어담';const subjects=[...new Set(items.filter(i=>i.approved.length).map(i=>i.subject))];for(const [si,subject] of subjects.entries()){const sheet=book.addWorksheet(`${si+1} ${subject}`.replace(/[\\/*?:\[\]]/g,' ').slice(0,31));const group=items.filter(i=>i.subject===subject&&i.approved.length);sheet.views=[{state:'frozen',ySplit:2}];group.forEach((item,k)=>{const col=k*2+1;sheet.getColumn(col).width=65;sheet.getColumn(col+1).width=3;sheet.getCell(1,col).value=item.element||item.unit||'평가 항목';sheet.getCell(2,col).value=`${item.unit} · 승인 ${item.approved.length}개`;item.approved.forEach((s,n)=>{sheet.getCell(n*2+3,col).value=s.text;sheet.getCell(n*2+4,col).value=s.level;sheet.getCell(n*2+4,col).font={color:{argb:'FF66756E'},size:9};});});sheet.eachRow((row,n)=>{row.height=n===1?36:n===2?26:n%2===1?72:20;row.eachCell(cell=>{cell.alignment={wrapText:true,vertical:'middle'};if(n===1){cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF245B48'}};cell.font={bold:true,color:{argb:'FFFFFFFF'},size:12};}});});}
 if(combinations.length){const sheet=book.addWorksheet('교과별 조합');sheet.columns=[{header:'교과',key:'subject',width:18},{header:'승인 문장 조합',key:'text',width:110}];combinations.forEach(c=>sheet.addRow({subject:c.subject,text:c.text}));sheet.getRow(1).font={bold:true};sheet.eachRow(row=>{row.height=70;row.alignment={wrapText:true,vertical:'middle'};});}if(!book.worksheets.length)throw Error('승인한 문장이 없습니다.');return book.xlsx.writeBuffer();}
export function download(data,name,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
