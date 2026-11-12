import test from 'node:test';
import assert from 'node:assert/strict';
import {publicAiControl} from '../scripts/public-ai-control.mjs';
const env={PUBLIC_AI_REDIS_URL:'https://test.upstash.io',PYEONEO_AI_REDIS_TOKEN:'test',VERCEL:'1',VERCEL_ENV:'production',PUBLIC_AI_ENABLED:'true',PUBLIC_AI_VERIFIED:'true'};
test('resume requires active Production and sends exactly the stop key, no quota or salt keys',async()=>{
 for(const key of ['VERCEL','VERCEL_ENV','PUBLIC_AI_ENABLED','PUBLIC_AI_VERIFIED'])await assert.rejects(publicAiControl('resume',{...env,[key]:''},()=>assert.fail()),/RESUME_REQUIRES_ACTIVE_PRODUCTION/);
 const result=await publicAiControl('resume',env,async(_,o)=>{const command=JSON.parse(o.body);assert.deepEqual(command.slice(2),['1','{pyeoneo-ai-v1}:disabled']);assert(!command[1].includes('FLUSH'));return Response.json({result:0});});assert.equal(result.stopped,false);
 await assert.rejects(publicAiControl('resume',env,async()=>Response.json({result:-1})),/CONTROL_FAILED/);
});
