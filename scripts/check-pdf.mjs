import {readFile,writeFile} from 'node:fs/promises';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {parsePlanPages} from '../lib/core.mjs';
const file=process.argv[2];if(!file)throw Error('Provide local PDF path');
const doc=await getDocument({data:new Uint8Array(await readFile(file)),isEvalSupported:false}).promise;const pages=[];
for(let n=1;n<=doc.numPages;n++){const p=await doc.getPage(n),v=p.getViewport({scale:1}),c=await p.getTextContent();pages.push({page:n,width:v.width,height:v.height,tokens:c.items.filter(t=>'str'in t).map(t=>({text:t.str,x:t.transform[4],y:v.height-t.transform[5],w:t.width}))});}
const items=parsePlanPages(pages);await writeFile('tmp/parsed.json',JSON.stringify(items,null,2));await writeFile('tmp/tokens.json',JSON.stringify(pages,null,2));console.log(JSON.stringify(items.map(i=>({page:i.page,subject:i.subject,unit:i.unit,element:i.element,standard:i.standard})),null,2));console.log('ITEMS',items.length);await doc.destroy();if(items.length!==16)process.exitCode=1;
