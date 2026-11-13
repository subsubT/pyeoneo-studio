import test from 'node:test';
import assert from 'node:assert/strict';
import {PDF_LIMIT,WORK_FILE_LIMIT,PDF_BASE64_LIMIT,assertPdfSize,assertWorkSize,utf8ByteLength,FileLimitError} from '../lib/file-limits.mjs';
import {WORK_FILE_LIMIT as compatibleLimit} from '../lib/plan.mjs';
import {validateEmbeddedPdf,serializeProject,restoreProject} from '../lib/restore.mjs';
import {readPdf} from '../lib/files.mjs';

test('binary boundaries include equality, keep plan import compatibility; oversized PDF is never read',async()=>{
 assert.equal(PDF_LIMIT,52428800);assert.equal(WORK_FILE_LIMIT,209715200);assert.equal(compatibleLimit,WORK_FILE_LIMIT);assert.equal(PDF_BASE64_LIMIT,69905068);
 for(const [limit,check] of [[PDF_LIMIT,assertPdfSize],[WORK_FILE_LIMIT,assertWorkSize]]){
  assert.doesNotThrow(()=>check(limit-1));assert.doesNotThrow(()=>check(limit));assert.throws(()=>check(limit+1),FileLimitError);
 }
 let reads=0;await assert.rejects(readPdf({size:PDF_LIMIT+1,arrayBuffer(){reads++;throw Error('must not read')}}),/50MB/);assert.equal(reads,0);
});
test('UTF-8 count matches native encoding across Korean, supplementary, unpaired and chunk-boundary surrogates',()=>{
 for(const value of ['한글'.repeat(20000),'a'.repeat(32767)+'😀끝','a'.repeat(32766)+'😀끝','\ud800'.repeat(70000),'x한😀\udc00'.repeat(12000)])assert.equal(utf8ByteLength(value),Buffer.byteLength(value));
});
test('embedded exact 50MiB passes; same Base64 length but 1 extra decoded byte fails; bad encoding/header rejected',()=>{
 const pdf=Buffer.alloc(PDF_LIMIT);pdf.write('%PDF-1.7\n');const data=pdf.toString('base64');
 assert.equal(data.length,PDF_BASE64_LIMIT);assert.doesNotThrow(()=>validateEmbeddedPdf(data));
 const over=Buffer.concat([pdf,Buffer.from('x')]).toString('base64');assert.equal(over.length,data.length);assert.throws(()=>validateEmbeddedPdf(over),/50MB/);
 for(const bad of ['', 'JVBERi0xLjcK=', 'JVBERi0xLjcK\n','JVBERi0xLjcK!!!!','JVBERi0xLjcK====','JVBERi0xLjcKAB==','JVBERi0xLjcKAAF=','Tk9ULVBERi0='])assert.throws(()=>validateEmbeddedPdf(bad));
});
test('save and restore reject invalid PDF source/page relationships as well as invalid embedded bytes',()=>{
 const source={id:'pdf',name:'test.pdf',data:Buffer.from('%PDF-1.7\nsynthetic').toString('base64'),pages:[{page:1,text:'한글 원문'}]};
 const project={version:2,items:[],examples:[],sources:[source]};
 assert.doesNotThrow(()=>restoreProject(project));
 for(const raw of [{...project,sources:[source,source]},{...project,sources:[{...source,pages:[{page:2,text:''}]}]},{...project,sources:[{...source,data:'JVBERi0xLjcKAB=='}]}]){
  assert.throws(()=>serializeProject(raw));assert.throws(()=>restoreProject(raw));
 }
});
