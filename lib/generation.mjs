import {z} from 'zod';
import {GenerationResultError} from './generation-result.mjs';
import {validateText} from './core.mjs';
import {assertDistribution} from './batch.mjs';
import {GENERATION_RULES,REVIEW_RULES} from './prompt.mjs';
export const stageSchema=z.object({id:z.string().min(1).max(100),name:z.string().trim().min(1).max(80),description:z.string().max(2000).default(''),count:z.number().int().min(0).max(24)}).strict();
export const inputSchema=z.object({actual:z.string().trim().min(1).max(4000),example:z.string().trim().max(2000).default(''),levels:z.array(stageSchema).min(1).max(100),confirmed:z.boolean().optional(),existing:z.array(z.string().max(1200)).max(120)}).strict().superRefine((v,ctx)=>{
 const total=v.levels.reduce((n,l)=>n+l.count,0);
 if(new Set(v.levels.map(l=>l.id)).size!==v.levels.length||total<1||total>24||total+v.existing.length>120)ctx.addIssue({code:'custom',message:'단계 ID·개수(합계 1~24)·보관 한도(120)를 확인하세요.'});
}).transform(({confirmed,...input})=>input);
export async function reviewCandidates(provider,input,candidates){
 const data=inputSchema.parse(input);
 const reviews=z.array(z.object({index:z.number().int().min(0).max(candidates.length-1),pass:z.boolean(),issues:z.array(z.string().max(500)).max(10)})).length(candidates.length).parse((await provider.complete(REVIEW_RULES,{actual:data.actual,example:data.example,levels:data.levels,candidates},{stage:'review',maxTokens:Math.min(6000,Math.max(2400,candidates.length*200))})).reviews);
 if(new Set(reviews.map(r=>r.index)).size!==candidates.length)throw Error('검증 응답이 완전하지 않습니다.');
 return reviews;
}
export async function generateBatch(provider,input){
 const data=inputSchema.parse(input),total=data.levels.reduce((n,l)=>n+l.count,0);
 const out=await provider.complete(GENERATION_RULES,data,{stage:'generation',maxTokens:Math.min(6000,Math.max(2400,total*500,Math.ceil(data.actual.length*total*2)))});
 const candidates=z.array(z.object({text:z.string().trim().min(1).max(1200),levelId:z.string().min(1).max(100),evidence:z.preprocess(v=>typeof v==='string'?[v]:v,z.array(z.string().min(1).max(4000)).min(1).max(20))})).max(24).parse(out.candidates);
 if(!candidates.length)throw new GenerationResultError('INVALID_AI_RESPONSE');
 assertDistribution(candidates,data.levels);
 const checked=candidates.map((c,i)=>{
  const check=validateText(c.text,data.example,[...data.existing,...candidates.slice(0,i).map(x=>x.text)]);
  if(c.evidence.some(e=>!data.actual.includes(e)))check.errors.push('실제 활동에서 근거를 찾지 못했습니다.');
  return {...c,level:data.levels.find(l=>l.id===c.levelId).name,...check,semanticPass:false};
 });
 // One independent review for the entire batch, including locally flagged sentences.
 const reviews=await reviewCandidates(provider,data,candidates);
 for(const review of reviews){const c=checked[review.index];c.semanticPass=review.pass&&review.issues.length===0;if(!c.semanticPass)c.errors.push(...(review.issues.length?review.issues:['의미 검증 실패']));}
 return {candidates:checked,reasons:[]};
}
