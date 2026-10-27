// Synthetic text only. Credentials stay in this process and are never printed.
import {loadEnvFile} from 'node:process';
import {mkdir, writeFile} from 'node:fs/promises';
import {createNvidiaProvider, NvidiaError} from '../lib/server/nvidia.mjs';

try {
  loadEnvFile('.env.local');
  const provider = createNvidiaProvider({maxCalls:1,timeoutMs:180000,maxTokens:64});
  const result = await provider.complete('Return only JSON: {"ok":true}.', {message:'connection test using synthetic input'});
  if (result.ok !== true) throw new NvidiaError('UNEXPECTED_SMOKE_RESULT');
  await mkdir('tmp/checkpoint5',{recursive:true});
  const report = {ok:true, model:provider.model, metrics:provider.metrics};
  await writeFile('tmp/checkpoint5/smoke.json', JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
} catch (e) {
  console.error(JSON.stringify({ok:false,code:e instanceof NvidiaError ? e.code : 'LOCAL_SETUP_ERROR',status:e instanceof NvidiaError ? e.status : 0}));
  process.exitCode = 1;
}
