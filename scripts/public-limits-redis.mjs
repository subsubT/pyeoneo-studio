// Optional real Redis integration, isolated loopback server. No production credentials or data.
// REDIS_SERVER and REDIS_CLI must point to local test binaries.
import assert from 'node:assert/strict';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'node:net';
import {createHmac} from 'node:crypto';
import {createPublicLimiter} from '../lib/server/public-limits.mjs';
const exec=promisify(execFile),dir=resolve('tmp/redis-integration');await mkdir(dir,{recursive:true});
const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
const cli=async(...args)=>(await exec(process.env.REDIS_CLI,['-h','127.0.0.1','-p',String(port),'--raw',...args])).stdout.trim();
let server;
async function start(){server=spawn(process.env.REDIS_SERVER,['--bind','127.0.0.1','--port',String(port),'--dir',dir,'--appendonly','yes','--appendfsync','always','--save',''],{stdio:'ignore'});for(let n=0;n<100;n++){if(server.exitCode!==null)throw Error('Redis start failed');try{if(await cli('PING')==='PONG')return;}catch{}await new Promise(r=>setTimeout(r,50));}throw Error('Redis start timeout');}
async function stop(){if(server?.exitCode===null){const exited=new Promise(r=>server.once('exit',r));server.kill('SIGTERM');await exited;}}
const env={PUBLIC_AI_REDIS_URL:'https://test.upstash.io',PYEONEO_AI_REDIS_TOKEN:'test',PUBLIC_AI_LIMIT_SALT:'test-salt'};
const fetchImpl=async(_,options)=>Response.json({result:Number(await cli(...JSON.parse(options.body)))});
const limiter=()=>createPublicLimiter(env,fetchImpl),root='{pyeoneo-ai-v1}';
const id=address=>createHmac('sha256',env.PUBLIC_AI_LIMIT_SALT).update(address).digest('hex');
const results=[];
try{
 await start();await cli('FLUSHDB');
 const attempts=await Promise.all(Array.from({length:20},(_,n)=>limiter().acquire(`192.0.2.${n+1}`)));assert.equal(attempts.filter(Boolean).length,2);await Promise.all(attempts.filter(Boolean).map(l=>l.release()));results.push('20 concurrent independent limiter clients: exactly 2 leases');
 await cli('FLUSHDB');let a=await limiter().acquire('192.0.2.1');assert(a);assert.equal(await limiter().acquire('192.0.2.1'),null);await a.release();a=await limiter().acquire('192.0.2.1');assert(a);await a.release();assert.equal(await limiter().acquire('192.0.2.1'),null);results.push('per-address concurrency 1, fixed-minute quota 2');
 await cli('FLUSHDB');const day=Math.floor(Number((await cli('TIME')).split('\n')[0])/86400);
 await cli('SET',`${root}:d:${day}:${id('192.0.2.1')}`,'12');assert.equal(await limiter().acquire('192.0.2.1'),null);await cli('SET',`${root}:d:${day}`,'100');assert.equal(await limiter().acquire('192.0.2.2'),null);results.push('per-address daily 12 and global daily 100 block atomically');
 await cli('FLUSHDB');a=await limiter().acquire('192.0.2.1');assert(a);await stop();await start();assert.equal(await limiter().acquire('192.0.2.1'),null);const b=await limiter().acquire('192.0.2.2');assert(b);assert.equal(await limiter().acquire('192.0.2.3'),null);assert(await a.check());results.push('Redis restart with AOF preserves quota and active leases across recreated clients');
 await cli('SET',`${root}:disabled`,'1');assert.equal(await a.check(),false);await assert.rejects(limiter().acquire('192.0.2.4'),e=>e.code==='SHARED_STOP');results.push('shared emergency stop blocks new reservations and next provider call');
 const keys=await cli('KEYS','*');assert(!keys.includes('192.0.2.'));await stop();await assert.rejects(limiter().acquire('192.0.2.1'));results.push('storage failure rejects with no local fallback; keys contain no raw address');
 await writeFile(`${dir}/result.json`,JSON.stringify({ok:true,realLocalRedis:true,productionRedis:false,results},null,2));console.log(JSON.stringify({ok:true,results}));
}finally{await stop();}
