import {z} from 'zod';
import {GenerationResultError} from './generation-result.mjs';

// Provider transport contract only. Conditional rules and bounds stay local.
export const REVIEW_SCHEMA_VERSION='review-flat-v1';
export const reviewTransportSchema={
 type:'object',additionalProperties:false,required:['reviews','repetitions'],properties:{
  reviews:{type:'array',items:{type:'object',additionalProperties:false,required:['index','pass','issues'],properties:{index:{type:'integer'},pass:{type:'boolean'},issues:{type:'array',items:{type:'string'}}}}},
  repetitions:{type:'array',items:{type:'object',additionalProperties:false,required:['index','scope','peerIndex'],properties:{index:{type:'integer'},scope:{type:'string',enum:['batch','existing']},peerIndex:{type:'integer'}}}},
 },
};
export function reviewOutputSchema(count,existing=[]){
 const index=z.number().int().min(0).max(count-1);
 const batch=z.object({index,scope:z.literal('batch'),peerIndex:index}).strict();
 const indices=new Set(existing.map(e=>e.index));
 const repetition=indices.size?z.union([batch,z.object({index,scope:z.literal('existing'),peerIndex:z.number().int().min(0).refine(i=>indices.has(i))}).strict()]):batch;
 return z.object({
  reviews:z.array(z.union([
   z.object({index,pass:z.literal(true),issues:z.array(z.string().max(500)).length(0)}).strict(),
   z.object({index,pass:z.literal(false),issues:z.array(z.string().min(1).max(500).refine(s=>s.trim().length>0)).min(1).max(10)}).strict(),
  ])).length(count),
  repetitions:z.array(repetition).max(48),
 }).strict();
}
export function validRepetitionReferences(repetitions,existing){
 const indices=new Set(existing.map(e=>e.index));
 return repetitions.every(r=>r.scope==='batch'?r.index!==r.peerIndex:indices.has(r.peerIndex));
}
export function parseReviewOutput(value,count,existing){
 if(!Array.isArray(value?.reviews)||value.reviews.length<count)throw new GenerationResultError('REVIEW_INCOMPLETE',null,'review');
 const checked=reviewOutputSchema(count,existing).safeParse(value);
 if(!checked.success)throw new GenerationResultError('RESPONSE_SCHEMA_ERROR',null,'review');
 const {reviews,repetitions}=checked.data;
 if(new Set(reviews.map(r=>r.index)).size!==count)throw new GenerationResultError('REVIEW_INCOMPLETE',null,'review');
 if(!validRepetitionReferences(repetitions,existing))throw new GenerationResultError('RESPONSE_SCHEMA_ERROR',null,'review');
 return checked.data;
}
