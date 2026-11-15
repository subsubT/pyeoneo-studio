import {z} from 'zod';

export function reviewOutputSchema(count,existingCount=0){
 const index=z.number().int().min(0).max(count-1);
 const batch=z.object({index,scope:z.literal('batch'),peerIndex:index}).strict();
 const repetition=existingCount?z.union([batch,z.object({index,scope:z.literal('existing'),peerIndex:z.number().int().min(0).max(existingCount-1)}).strict()]):batch;
 return z.object({
  reviews:z.array(z.union([
   z.object({index,pass:z.literal(true),issues:z.array(z.string().max(500)).length(0)}).strict(),
   z.object({index,pass:z.literal(false),issues:z.array(z.string().min(1).max(500)).min(1).max(10)}).strict(),
  ])).length(count),
  repetitions:z.array(repetition).max(48),
 }).strict();
}
export function validRepetitionReferences(repetitions,existing){
 const indices=new Set(existing.map(e=>e.index));
 return repetitions.every(r=>r.scope==='batch'?r.index!==r.peerIndex:indices.has(r.peerIndex));
}
