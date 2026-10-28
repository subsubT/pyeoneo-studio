import {z} from 'zod';
import {LEVELS,validateText} from './core.mjs';
import {GENERATION_RULES,REVIEW_RULES} from './prompt.mjs';
export const inputSchema=z.object({actual:z.string().trim().min(8).max(4000),example:z.string().trim().min(5).max(2000),level:z.enum(LEVELS),confirmed:z.literal(true),existing:z.array(z.string().max(1200)).max(120)}).strict();
// Provider-independent orchestration; credentials and transport live in server-only modules.
export async function reviewCandidates(provider,input,candidates){
 const data=inputSchema.parse(input);
 const reviews=z.array(z.object({index:z.number().int().min(0).max(candidates.length-1),pass:z.boolean(),issues:z.array(z.string().max(500)).max(10)})).length(candidates.length).parse((await provider.complete(REVIEW_RULES,{actual:data.actual,example:data.example,level:data.level,candidates},{stage:'review',maxTokens:2400})).reviews);
 if(new Set(reviews.map(r=>r.index)).size!==candidates.length)throw Error('검증 응답이 완전하지 않습니다.');
 return reviews;
}
export async function generateBatch(provider,input){
 const data=inputSchema.parse(input);
 const out=await provider.complete(GENERATION_RULES,data,{stage:'generation',maxTokens:Math.min(6000,Math.max(2400,Math.ceil(data.actual.length*24)))});
 const candidates=z.array(z.object({text:z.string().max(1200),evidence:z.preprocess(v=>typeof v==='string'?[v]:v,z.array(z.string().min(1).max(4000)).min(1).max(20))})).max(12).parse(out.candidates);
 if(!candidates.length)return {candidates:[],reasons:['사실을 유지하며 생성할 수 없습니다. 실제 활동을 더 구체적으로 입력하세요.']};
 const checked=candidates.map((c,i)=>{
  const check=validateText(c.text,data.example,[...data.existing,...candidates.slice(0,i).map(x=>x.text)]);
  if(c.evidence.some(e=>!data.actual.includes(e)))check.errors.push('실제 활동에서 근거를 찾지 못했습니다.');
  return {...c,...check,semanticPass:false};
 });
 // Invalid candidates remain flagged and are not sent for another model call.
 const eligible=checked.map((c,index)=>({c,index})).filter(({c})=>!c.errors.length);
 if(eligible.length){
  const reviews=await reviewCandidates(provider,data,eligible.map(({c})=>({text:c.text,evidence:c.evidence})));
  for(const review of reviews){
   const candidate=checked[eligible[review.index].index];
   candidate.semanticPass=review.pass&&review.issues.length===0;
   if(!candidate.semanticPass)candidate.errors.push(...(review.issues.length?review.issues:['의미 검증 실패']));
  }
 }
 return {candidates:checked,reasons:[]};
}
