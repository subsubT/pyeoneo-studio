// Explicit opt-in for a loopback-only development server. Never writes .env.local.
import {loadEnvFile} from 'node:process';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
if (process.env.VERCEL !== undefined) throw new Error('Local development only.');
loadEnvFile('.env.local');
if (!process.env.NVIDIA_API_KEY?.trim()) throw new Error('NVIDIA_API_KEY is missing.');
const require=createRequire(import.meta.url);
const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port','3005'],{
  stdio:'inherit',env:{...process.env,LOCAL_AI_ENABLED:'true',NEXT_TELEMETRY_DISABLED:'1'},
});
process.on('SIGINT',()=>child.kill('SIGINT'));
child.on('exit',code=>process.exitCode=code??1);
