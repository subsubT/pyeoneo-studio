import {execFileSync} from 'node:child_process';import {readFileSync} from 'node:fs';
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);const bad=[];
for(const f of files){if(/(^|\/)(\.env[^/]*|\.vercel)(\/|$)|\.(pdf|xlsx)$/i.test(f))bad.push(f);const s=readFileSync(f,'utf8');if(/(?:gh[pousr]_[A-Za-z0-9]{25,}|sk-[A-Za-z0-9_-]{25,}|nvapi-[A-Za-z0-9_-]{25,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----)/.test(s))bad.push(f);}
console.log(bad.length?`FAIL: ${[...new Set(bad)].join(', ')}`:`PASS: ${files.length} source files checked; no detected secret patterns or excluded data files.`);if(bad.length)process.exitCode=1;
