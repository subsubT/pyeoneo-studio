import assert from 'node:assert/strict';
// Never makes a valid generation request, even against an active deployment.
export async function checkAiState(context,base){
 const expected=process.env.TEST_PUBLIC_AI_ENABLED==='true';
 const status=await context.request.get(`${base}/api/generate`),body=await status.json();
 assert.equal(body.enabled,expected);if(expected)assert.equal(body.mode,'public');
 const denied=await context.request.post(`${base}/api/generate`,{data:{}});assert.equal(denied.status(),expected?403:503);
 if(expected){const malformed=await context.request.post(`${base}/api/generate`,{headers:{Origin:new URL(base).origin},data:{}});assert.equal(malformed.status(),400);}
 return {enabled:expected,postStatus:denied.status()};
}
