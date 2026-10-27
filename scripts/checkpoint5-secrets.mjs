import {loadEnvFile} from 'node:process';
import {readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

loadEnvFile('.env.local');
const secrets=['NVIDIA_API_KEY','VERCEL_OIDC_TOKEN'].map(k=>process.env[k]).filter(Boolean);
const fingerprint=JSON.parse(await readFile('tmp/checkpoint5-env-integrity.json','utf8'));
const unchanged=createHash('sha256').update(await readFile('.env.local')).digest('hex')===fingerprint.sha256;
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
async function collect(dir){try{for(const e of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())await collect(p);else files.push(p);}}catch(e){if(e.code!=='ENOENT')throw e;}}
await collect('.next/static');await collect('.next-local/static');await collect('tmp/checkpoint5');
let leaks=0;
for(const file of files){const bytes=await readFile(file);if(secrets.some(s=>bytes.includes(Buffer.from(s))))leaks++;}
const ignored=execFileSync('git',['check-ignore','.env.local'],{encoding:'utf8'}).trim()==='.env.local';
const result={environmentFileUnchanged:unchanged,environmentFileGitIgnored:ignored,filesChecked:files.length,credentialLeaks:leaks};
console.log(JSON.stringify(result));if(!unchanged||!ignored||leaks)process.exitCode=1;
