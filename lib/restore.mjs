import {z} from 'zod';
import {blankItem,LEVELS} from './core.mjs';
import {WORK_FILE_LIMIT,planIssues} from './plan.mjs';
const str=z.string().max(5000);
const sentence=z.object({text:z.string().max(1200),level:z.enum(LEVELS),errors:z.array(str).max(30).optional()});
const itemSchema=z.object({id:z.string().max(100).optional(),subject:str,unit:str,standard:str,area:str,element:str,method:str,criteria:z.string().max(20000),actual:str,example:str,target:z.number().int().min(1).max(120),page:z.number().int().min(0).max(30).optional(),sourceId:z.string().max(100).optional(),included:z.boolean().optional(),candidates:z.array(sentence).max(240),approved:z.array(sentence).max(120)}).refine(i=>i.candidates.length+i.approved.length<=240);
const sourceSchema=z.object({id:z.string().min(1).max(100),name:z.string().max(300),data:z.string().max(14*1024*1024).regex(/^JVBER[A-Za-z0-9+/]*={0,2}$/),pages:z.array(z.object({page:z.number().int().min(1).max(30),text:z.string().max(1000000)})).min(1).max(30)});
const schema=z.object({version:z.union([z.literal(1),z.literal(2)]),items:z.array(itemSchema).max(100),examples:z.array(z.object({sheet:str,cell:str,text:str})).max(2000),sources:z.array(sourceSchema).max(10).optional(),planConfirmed:z.boolean().optional(),activeItemId:z.string().max(100).optional(),combinationIds:z.array(z.string().max(100)).max(100).optional()});
export function serializeProject(project){
 const json=JSON.stringify({version:2,...project});
 if(new TextEncoder().encode(json).byteLength>WORK_FILE_LIMIT)throw Error('작업 파일은 40MB까지 저장할 수 있습니다. PDF를 추가하기 전에 별도 작업으로 저장해 주세요.');
 const valid=schema.safeParse(JSON.parse(json));
 if(!valid.success)throw Error('작업 파일의 허용 범위를 확인하세요. 한 작업에 평가 항목 100개·PDF 10개·예시 2,000개까지 보관할 수 있습니다. 기존 작업은 유지됩니다.');
 return json;
}
export function restoreProject(raw){
 const data=schema.parse(raw),sources=data.version===2?data.sources||[]:[];
 if(new Set(sources.map(s=>s.id)).size!==sources.length)throw Error('PDF 출처 ID가 중복된 작업 파일입니다.');
 if(sources.some(s=>s.pages.some((p,n)=>p.page!==n+1)))throw Error('PDF 쪽수 정보가 올바르지 않습니다.');
 const sourceIds=new Map(sources.map(s=>[s.id,crypto.randomUUID()]));
 const itemIds=new Map();
 for(const i of data.items){if(i.id&&itemIds.has(i.id))throw Error('평가 항목 ID가 중복된 작업 파일입니다.');if(i.id)itemIds.set(i.id,crypto.randomUUID());}
 const items=data.items.map(i=>{
  if(i.sourceId&&(!sourceIds.has(i.sourceId)||!i.page||i.page>sources.find(s=>s.id===i.sourceId).pages.length))throw Error('평가 항목의 PDF 출처 또는 쪽수를 확인할 수 없습니다.');
  return {...blankItem(),...i,id:itemIds.get(i.id)||crypto.randomUUID(),sourceId:sourceIds.get(i.sourceId)||'',included:i.included!==false,confirmed:false,approved:[],candidates:[...i.approved,...i.candidates].map(c=>({...c,id:crypto.randomUUID(),source:'작업 파일',edited:true,semanticPass:false,errors:c.errors||[]}))};
 });
 return {items,examples:data.examples,sources:sources.map(s=>({...s,id:sourceIds.get(s.id)})),planConfirmed:data.version===2&&data.planConfirmed===true&&!planIssues(items).length,activeItemId:itemIds.get(data.activeItemId)||items[0]?.id||'',combinationIds:(data.combinationIds||[]).map(id=>itemIds.get(id)).filter(id=>items.some(i=>i.id===id&&i.included))};
}
