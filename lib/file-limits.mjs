// File limits concern local browser files, independently of AI request budgets.
export const PDF_LIMIT_MB=50,WORK_FILE_LIMIT_MB=200;
export const PDF_LIMIT=PDF_LIMIT_MB*1024*1024;
export const WORK_FILE_LIMIT=WORK_FILE_LIMIT_MB*1024*1024;
export const PDF_LIMIT_LABEL=`${PDF_LIMIT_MB}MB`,WORK_FILE_LIMIT_LABEL=`${WORK_FILE_LIMIT_MB}MB`;
export const PDF_BASE64_LIMIT=4*Math.ceil(PDF_LIMIT/3);
export class FileLimitError extends Error {}
export function assertPdfSize(bytes){
 if(bytes>PDF_LIMIT)throw new FileLimitError(`PDF는 ${PDF_LIMIT_LABEL} 이하만 업로드할 수 있습니다. 기존 작업은 유지됩니다.`);
}
export function assertWorkSize(bytes){
 if(bytes>WORK_FILE_LIMIT)throw new FileLimitError(`작업 파일은 ${WORK_FILE_LIMIT_LABEL} 이하만 가능합니다. PDF를 추가하기 전에 별도 작업으로 저장해 주세요. 기존 작업은 유지됩니다.`);
}
// Count actual UTF-8 bytes with bounded scratch space, including surrogate pairs.
export function utf8ByteLength(text){
 const encoder=new TextEncoder(),buffer=new Uint8Array(32768*3);
 let bytes=0;
 for(let start=0;start<text.length;){
  let end=Math.min(start+32768,text.length);
  if(end<text.length&&text.charCodeAt(end-1)>=0xD800&&text.charCodeAt(end-1)<=0xDBFF)end--;
  bytes+=encoder.encodeInto(text.slice(start,end),buffer).written;start=end;
 }
 return bytes;
}
