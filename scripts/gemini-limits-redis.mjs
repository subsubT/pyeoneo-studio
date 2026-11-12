// Real isolated local Redis + simulated clock/HTTP transport. Never Upstash evidence.
import assert from 'node:assert/strict';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:net';
import {resolve} from 'node:path';
import {createPublicLimiter} from '../lib/server/public-limits.mjs';
const dir=resolve('tmp/gemini-redis');await mkdir(dir,{recursive:true});
const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
const exec=promisify(execFile),cli=async(...args)=>(await exec(process.env.REDIS_CLI,['-p',String(port),'--json',...args])).stdout.trim();
const server=spawn(process.env.REDIS_SERVER,['--bind','127.0.0.1','--port',String(port),'--dir',dir,'--save',''],{stdio:'ignore'});
const env={PUBLIC_AI_REDIS_URL:'https://test.upstash.io',PYEONEO_AI_REDIS_TOKEN:'test',PUBLIC_AI_LIMIT_SALT:'test-salt'};
let nowMs=null;
const transport=async(_,o)=>{const command=JSON.parse(o.body);if(nowMs!==null)command[1]=command[1].replaceAll("redis.call('TIME')",`{${Math.floor(nowMs/1000)},${(nowMs%1000)*1000}}`);return Response.json({result:JSON.parse(await cli(...command))});};
const limiter=()=>createPublicLimiter(env,transport),checks=[];
const clear=async()=>cli('FLUSHDB'); // Only the disposable loopback server created above.
try{
 for(let n=0;n<100;n++){try{if(JSON.parse(await cli('PING'))==='PONG')break;}catch{}await new Promise(r=>setTimeout(r,30));}
 await clear();nowMs=59999;
 const permits=await Promise.all(Array.from({length:30},()=>limiter().reserveProvider(1000)));assert.equal(permits.filter(p=>p.allowed).length,12);checks.push('30 independent clients race: exactly 12 calls');
 nowMs=60000;assert.equal((await limiter().reserveProvider(1000)).allowed,false);nowMs=119998;assert.equal((await limiter().reserveProvider(1000)).allowed,false);nowMs=119999;assert((await limiter().reserveProvider(1000)).allowed);checks.push('rolling 60000ms: fixed-minute boundary cannot double requests; exact expiry opens');
 await clear();nowMs=200000;
 for(let n=0;n<5;n++)assert((await limiter().reserveProvider(40000)).allowed);assert.equal((await limiter().reserveProvider(1)).allowed,false);nowMs+=60000;assert((await limiter().reserveProvider(40000)).allowed);checks.push('shared 200k input-byte budget and rolling expiry');
 await clear();nowMs=null;
 await limiter().cooldown(90);assert.equal((await limiter().reserveProvider(1000)).allowed,false);await limiter().cooldown(60);assert(Number(JSON.parse(await cli('TTL','{pyeoneo-ai-v1}:gemini:cooldown')))>=89);checks.push('429 cooldown survives client recreation and cannot shorten another cooldown');
 await clear();nowMs=300000;
 const held=await limiter().acquire('192.0.2.1');assert(held);for(let n=0;n<11;n++)assert((await limiter().reserveProvider(1000)).allowed);assert((await limiter().reserveProvider(1000)).allowed);assert.equal((await limiter().reserveProvider(1000)).allowed,false);await held.release();checks.push('second review call denied at 12, lease released');
 await clear();nowMs=400000;
 for(let n=0;n<449;n++)await cli('ZADD','{pyeoneo-ai-v1}:gemini:daily-calls',String(nowMs),`old-${n}`);
 const dailyRace=await Promise.all(Array.from({length:10},()=>limiter().reserveProvider(1000)));assert.equal(dailyRace.filter(p=>p.allowed).length,1);assert.equal(JSON.parse(await cli('ZCARD','{pyeoneo-ai-v1}:gemini:daily-calls')),450);
 nowMs+=93600000;assert((await limiter().reserveProvider(1000)).allowed);checks.push('actual attempts including retries share 450 calls/26h atomically across instances and expire normally');
 await clear();nowMs=500000;
 const expired=await limiter().acquire('192.0.2.1');assert(expired);nowMs+=301000;assert.equal(await expired.check(),false);const renewed=await limiter().acquire('192.0.2.1');assert(renewed);await expired.release();assert(await renewed.check());await renewed.release();checks.push('server time expires stale leases even before passive key expiry; old release cannot delete renewed lease');
 await clear();nowMs=null;
 const lease=await limiter().acquire('192.0.2.1');assert(lease);await cli('SET','{pyeoneo-ai-v1}:disabled','1');assert.equal(await lease.check(),false);assert((await limiter().reserveProvider(1000)).stopped);await lease.release();checks.push('shared stop prevents generation and review');
 const bad=createPublicLimiter(env,async()=>{throw Error('SIMULATED_TRANSPORT');});await assert.rejects(bad.reserveProvider(1000));checks.push('transport outage fails closed');
 const report={ok:true,realLocalRedis:true,simulatedClock:true,productionUpstash:false,checks};await writeFile(`${dir}/result.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{if(server.exitCode===null){const exited=new Promise(r=>server.once('exit',r));server.kill('SIGTERM');await exited;}}
