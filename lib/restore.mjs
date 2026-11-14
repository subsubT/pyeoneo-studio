import {z} from 'zod';
import {blankItem} from './core.mjs';
import {planIssues} from './plan.mjs';
import {PDF_LIMIT,PDF_BASE64_LIMIT,assertPdfSize,assertWorkSize,utf8ByteLength} from './file-limits.mjs';
const str=z.string().max(5000);
const sentence=z.object({comparisonBefore:z.string().max(4000).optional(),comparisonSource:z.enum(['actual','example']).optional(),text:z.string().max(1200),level:z.string().min(1).max(80),levelId:z.string().min(1).max(100).optional(),errors:z.array(str).max(30).optional()});
const levelSchema=z.object({id:z.string().min(1).max(100),name:z.string().trim().min(1).max(80),description:z.string().max(2000).default('')});
const itemSchema=z.object({levels:z.array(levelSchema).min(1).max(100).refine(ls=>new Set(ls.map(l=>l.id)).size===ls.length).optional(),generationCounts:z.record(z.string(),z.union([z.string().max(20),z.number()])).optional(),id:z.string().max(100).optional(),subject:str,unit:str,standard:str,area:str,element:str,method:str,criteria:z.string().max(20000),actual:str,example:str.default(''),target:z.number().int().min(1).max(120),page:z.number().int().min(0).max(30).optional(),sourceId:z.string().max(100).optional(),included:z.boolean().optional(),candidates:z.array(sentence).max(240),approved:z.array(sentence).max(120)}).refine(i=>i.candidates.length+i.approved.length<=240);
const sourceSchema=z.object({id:z.string().min(1).max(100),name:z.string().max(300),data:z.string(),pages:z.array(z.object({page:z.number().int().min(1).max(30),text:z.string().max(1000000)})).min(1).max(30)});
const schema=z.object({version:z.union([z.literal(1),z.literal(2)]),items:z.array(itemSchema).max(100),examples:z.array(z.object({sheet:str,cell:str,text:str})).max(2000),sources:z.array(sourceSchema).max(10).optional(),planConfirmed:z.boolean().optional(),activeItemId:z.string().max(100).optional(),combinationIds:z.array(z.string().max(100)).max(100).optional()});
// Check canonical Base64 and decoded size without decoding/copying the full PDF.
export function validateEmbeddedPdf(data){
 if(data.length>PDF_BASE64_LIMIT)assertPdfSize(PDF_LIMIT+1);
 const invalid=()=>{throw Error('내장 PDF의 Base64 형식 또는 PDF 헤더가 올바르지 않습니다.');};
 if(!data.length||data.length%4)invalid();
 const padding=data.endsWith('==')?2:data.endsWith('=')?1:0;
 assertPdfSize(data.length/4*3-padding);
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
 for(let n=0;n<data.length-padding;n++){
  const c=data.charCodeAt(n);
  if(!(c>=65&&c<=90||c>=97&&c<=122||c>=48&&c<=57||c===43||c===47))invalid();
 }
 if(padding&&alphabet.indexOf(data[data.length-padding-1])%(padding===2?16:4))invalid();
 // Only a small header is decoded; extraction/preview still use PDF.js.
 if(!/^%PDF-(?:1\.[0-7]|2\.0)[\r\n]/.test(atob(data.slice(0,12))))invalid();
}
function validateProject(raw){
 const valid=schema.safeParse(raw);
 if(!valid.success)throw Error('작업 파일의 허용 범위를 확인하세요. 한 작업에 평가 항목 100개·PDF 10개·예시 2,000개까지 보관할 수 있습니다. 기존 작업은 유지됩니다.');
 const data=valid.data,sources=data.version===2?data.sources||[]:[];
 for(const source of sources)validateEmbeddedPdf(source.data);
 if(new Set(sources.map(s=>s.id)).size!==sources.length)throw Error('PDF 출처 ID가 중복된 작업 파일입니다.');
 if(sources.some(s=>s.pages.some((p,n)=>p.page!==n+1)))throw Error('PDF 쪽수 정보가 올바르지 않습니다.');
 const sourceMap=new Map(sources.map(s=>[s.id,s]));
 const ids=new Set();
 for(const i of data.items){
  if(i.id&&ids.has(i.id))throw Error('평가 항목 ID가 중복된 작업 파일입니다.');
  if(i.id)ids.add(i.id);
  if(i.sourceId&&(!sourceMap.has(i.sourceId)||!i.page||i.page>sourceMap.get(i.sourceId).pages.length))throw Error('평가 항목의 PDF 출처 또는 쪽수를 확인할 수 없습니다.');
 }
 return {data,sources};
}
export function serializeProject(project){
 const raw={version:2,...project};
 validateProject(raw);
 const json=JSON.stringify(raw);
 assertWorkSize(utf8ByteLength(json));
 return json;
}
export function restoreProject(raw){
 const {data,sources}=validateProject(raw);
 const sourceIds=new Map(sources.map(s=>[s.id,crypto.randomUUID()]));
 const itemIds=new Map();
 for(const i of data.items){if(i.id&&itemIds.has(i.id))throw Error('평가 항목 ID가 중복된 작업 파일입니다.');if(i.id)itemIds.set(i.id,crypto.randomUUID());}
 const items=data.items.map(i=>{
  return {...blankItem(),...i,id:itemIds.get(i.id)||crypto.randomUUID(),sourceId:sourceIds.get(i.sourceId)||'',included:i.included!==false,approved:[],candidates:[...i.approved,...i.candidates].map(c=>({...c,id:crypto.randomUUID(),source:'작업 파일',edited:true,semanticPass:false,errors:(c.errors||[]).filter(e=>e!=='종결을 ‘함.’으로 고쳐 주세요.')}))};
 });
 return {items,examples:data.examples,sources:sources.map(s=>({...s,id:sourceIds.get(s.id)})),planConfirmed:data.version===2&&data.planConfirmed===true&&!planIssues(items).length,activeItemId:itemIds.get(data.activeItemId)||items[0]?.id||'',combinationIds:(data.combinationIds||[]).map(id=>itemIds.get(id)).filter(id=>items.some(i=>i.id===id&&i.included))};
}
