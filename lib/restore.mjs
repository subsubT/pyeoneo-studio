import {z} from 'zod';
import {blankItem,LEVELS} from './core.mjs';
const str=z.string().max(5000);const sentence=z.object({text:z.string().max(1200),level:z.enum(LEVELS)});
const schema=z.object({version:z.literal(1),items:z.array(z.object({subject:str,unit:str,standard:str,area:str,element:str,method:str,criteria:str,actual:str,example:str,target:z.number().int().min(1).max(120),candidates:z.array(sentence).max(120),approved:z.array(sentence).max(120)})).max(100),examples:z.array(z.object({sheet:str,cell:str,text:str})).max(2000)});
export function restoreProject(raw){const data=schema.parse(raw);return {items:data.items.map(i=>({...blankItem(),...i,confirmed:false,approved:[],candidates:[...i.approved,...i.candidates].slice(0,240).map(c=>({...c,id:crypto.randomUUID(),source:'작업 파일',edited:true,errors:[]}))})),examples:data.examples};}
