import {z} from 'zod';
import {prepareSentenceCopy} from './sentence-style.mjs';
import {GenerationResultError} from './generation-result.mjs';
import {validateText,groundingIssues} from './core.mjs';
import {assertDistribution} from './batch.mjs';
import {GENERATION_RULES,REVIEW_RULES} from './prompt.mjs';
import {EXPRESSION_DIRECTIONS,expressionPlan,analyseRepetitions,comparisonContext,addRepetitionWarning} from './candidate-diversity.mjs';
import {parseReviewOutput} from './review-schema.mjs';
import {generationSource,evidenceIssues} from './generation-source.mjs';
export const stageSchema=z.object({id:z.string().min(1).max(100),name:z.string().trim().min(1).max(80),description:z.string().max(2000).default(''),count:z.number().int().min(0).max(24)}).strict();
export const inputSchema=z.object({actual:z.string().trim().min(1).max(4000),example:z.string().trim().max(2000).default(''),levels:z.array(stageSchema).min(1).max(100),confirmed:z.boolean().optional(),existing:z.array(z.string().max(1200)).max(120)}).strict().superRefine((v,ctx)=>{
 const total=v.levels.reduce((n,l)=>n+l.count,0);
 if(new Set(v.levels.map(l=>l.id)).size!==v.levels.length||total<1||total>24||total+v.existing.length>120)ctx.addIssue({code:'custom',message:'단계 ID·개수(합계 1~24)·보관 한도(120)를 확인하세요.'});
}).transform(({confirmed,...input})=>input);
export async function reviewCandidates(provider,input,candidates){
 const data=inputSchema.parse(input);
 const existing=comparisonContext(data.existing,candidates.map(c=>c.text));
 // Gemini reports the final packed context, retaining original sparse indices.
 let sentExisting=existing;
 const result=await provider.complete(REVIEW_RULES,{actual:data.actual,example:data.example,source:generationSource(data).source,levels:data.levels,candidates,existing},{stage:'review',maxTokens:Math.min(6000,Math.max(2400,candidates.length*200)),onReviewContext:packed=>{sentExisting=packed;}});
 return parseReviewOutput(result,candidates.length,sentExisting);
}
export async function generateBatch(provider,input){
 let stage='generation';provider.setStage?.(stage);
 try{
 const data=inputSchema.parse(input),total=data.levels.reduce((n,l)=>n+l.count,0);
 // Work copies are never written back into the teacher's fields. Evidence
 // refers to the selected ORIGINAL example (or actual), not a corrected copy.
 const selected=generationSource(data);
 const work={...data,source:selected.source,existing:comparisonContext(data.existing,[selected.text]),exampleWorkingCopy:data.example?prepareSentenceCopy(data.example):'',actualWorkingCopy:prepareSentenceCopy(data.actual),expressionDirections:EXPRESSION_DIRECTIONS,expressionPlan:expressionPlan(data.levels)};
 const out=await provider.complete(GENERATION_RULES,work,{stage:'generation',maxTokens:Math.min(6000,Math.max(2400,total*500,Math.ceil(data.actual.length*total*2)))});
 if(!Array.isArray(out?.candidates))throw new GenerationResultError('RESPONSE_SCHEMA_ERROR');
 if(out.candidates.length!==total)throw new GenerationResultError('COUNT_MISMATCH');
 const parsed=z.array(z.object({text:z.string().trim().min(1).max(1200),levelId:z.string().min(1).max(100),evidence:z.preprocess(v=>typeof v==='string'?[v]:v,z.array(z.string().min(1).max(4000)).min(1).max(20))})).max(24).safeParse(out.candidates);
 if(!parsed.success)throw new GenerationResultError('RESPONSE_SCHEMA_ERROR');
 const rawCandidates=parsed.data;
 const candidates=rawCandidates.map(c=>{const text=prepareSentenceCopy(c.text);return {...c,evidenceSource:selected.source,text:text.length<=1200?text:c.text};});
 if(!candidates.length)throw new GenerationResultError('INVALID_AI_RESPONSE');
 try{assertDistribution(candidates,data.levels);}catch{throw new GenerationResultError('DISTRIBUTION_MISMATCH');}
 const repetitionWarnings=analyseRepetitions(candidates,data.existing);
 const checked=candidates.map((c,i)=>{
  const check=validateText(c.text,data.example,[...data.existing,...candidates.filter((_,j)=>j!==i).map(x=>x.text)],data.actual,{warnSimilarity:false});
  check.errors.push(...groundingIssues(c.text,data.actual,data.example),...evidenceIssues(c,data));
  return {...c,level:data.levels.find(l=>l.id===c.levelId).name,...check,repetitionWarnings:repetitionWarnings[i],semanticPass:false};
 });
 // One independent review for the entire batch, including locally flagged sentences.
 stage='review';provider.setStage?.(stage);
 const {reviews,repetitions}=await reviewCandidates(provider,data,candidates);
 for(const review of reviews){const c=checked[review.index];c.semanticPass=review.pass&&review.issues.length===0;if(!c.semanticPass)c.errors.push(...(review.issues.length?review.issues:['의미 검증 실패']));}
 for(const r of repetitions){
  addRepetitionWarning(checked[r.index].repetitionWarnings,{source:'review',scope:r.scope,index:r.peerIndex});
  if(r.scope==='batch')addRepetitionWarning(checked[r.peerIndex].repetitionWarnings,{source:'review',scope:'batch',index:r.index});
 }
 return {candidates:checked,reasons:[]};
 }catch(error){
  if(error instanceof Error)error.stage=stage;
  throw error;
 }
}
