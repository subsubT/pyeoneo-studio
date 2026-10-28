export const LEVELS=['매우 잘함','잘함','보통','노력 요함'];
export const BANNED=['구현함','구축함','명확하게','명확히','전략','뚜렷이','기재','절차','안내함','식별','또렷이','재정리','압축','분명히','분명하게','차근차근','차분히','차분하게'];
export const blankItem=()=>({id:crypto.randomUUID(),subject:'국어',unit:'',standard:'',area:'',element:'',method:'',criteria:'',page:0,sourceId:'',included:true,actual:'',example:'',confirmed:false,target:24,candidates:[],approved:[]});
export function similarity(a,b){const grams=s=>{const t=s.replace(/\s/g,'');return new Set(Array.from({length:Math.max(0,t.length-1)},(_,i)=>t.slice(i,i+2)))};const x=grams(a),y=grams(b);return x.size+y.size?2*[...x].filter(v=>y.has(v)).length/(x.size+y.size):0;}
export function validateText(text,example='',others=[]){const errors=[],warnings=[];
 if(!text.trim().endsWith('함.'))errors.push('종결을 ‘함.’으로 고쳐 주세요.');
 const bad=BANNED.filter(w=>text.includes(w));if(bad.length)errors.push('금지 표현: '+bad.join(', '));
 if(!text.trim()||text.length>1200)errors.push('문장 길이는 1~1,200자로 제한됩니다.');
 if(others.some(s=>s.trim()===text.trim()))errors.push('이미 있는 문장과 동일합니다.');else if(others.some(s=>similarity(s,text)>.9))warnings.push('다른 문장과 표현이 매우 비슷합니다.');
 if(example&&(text.length<example.length*1.2||text.length>example.length*2))warnings.push('예시 길이의 1.2~2배 범위 밖입니다. 사실성을 우선해 검토하세요.');
 if(/을 진행하며|를 진행하며/.test(text))warnings.push('의미가 유지되면 ‘에 참여하여’로 바꿔 주세요.');
 return {errors,warnings};
}
export function combine(items,ids){const selected=ids.map(id=>items.find(i=>i.id===id));if(selected.length<2||selected.some(i=>!i?.approved.length))throw Error('승인 문장이 있는 항목을 2개 이상 선택하세요.');if(new Set(selected.map(i=>i.subject)).size!==1)throw Error('같은 교과의 항목만 조합할 수 있습니다.');const n=Math.min(...selected.map(i=>i.approved.length));return Array.from({length:n},(_,k)=>({subject:selected[0].subject,text:selected.map(i=>i.approved[k].text).join(' '),sources:selected.map(i=>i.approved[k].id)}));}
export function parsePlanPages(pages){let subject='확인 필요';const results=[];
 for(const page of pages){const ts=page.tokens.filter(t=>t.text.trim());const all=ts.map(t=>t.text).join(' ');const found=all.match(/(국어|수학|바른\s*생활|슬기로운\s*생활|즐거운\s*생활)\s*과/);if(found)subject=found[1].replace(/\s/g,'');
 const header=ts.find(t=>t.text.replace(/\s/g,'')==='성취기준');if(!header)continue;
 const byText=s=>ts.find(t=>t.text.replace(/\s/g,'')===s&&Math.abs(t.y-header.y)<12);
 const unit=byText('단원명'),area=byText('평가영역');const headerText=ts.filter(t=>Math.abs(t.y-header.y)<3).sort((a,b)=>a.x-b.x).map(t=>t.text).join('').replace(/\s/g,'');if(!unit||!area||!headerText.includes('평가요소')||!headerText.includes('평가기준'))continue;
 // Reference template geometry, scaled and translated from its two stable headings.
 // Other layouts are exposed as raw text for teacher entry, never guessed as verified facts.
 const scale=(unit.x-header.x)/76.32,offset=header.x-97.68*scale;
 if(Math.abs(area.x-(221.28*scale+offset))>8)continue;
 const bounds=[0,...[161,215,266,333,498,706].map(x=>x*scale+offset)];
 const very=ts.filter(t=>t.text.trim()==='매우'&&t.x>bounds[5]-40).sort((a,b)=>a.y-b.y);const effort=ts.filter(t=>t.text.trim()==='노력'&&t.x>bounds[5]-40).sort((a,b)=>a.y-b.y);if(!very.length)continue;
 bounds[5]=Math.min(...very.map(t=>t.x))-12;
 const starts=[header.y+14,...very.slice(1).map((v,k)=>{const prev=effort.filter(e=>e.y>very[k].y&&e.y<v.y).at(-1);return prev?(prev.y+12+v.y)/2:v.y-12;})];
 const join=arr=>{const sorted=arr.sort((a,b)=>Math.abs(a.y-b.y)>3?a.y-b.y:a.x-b.x);return sorted.map((t,i)=>{const prev=sorted[i-1];return (prev&&(Math.abs(t.y-prev.y)>3||t.x-prev.x-prev.w>1.5)?' ':'')+t.text}).join('').replace(/\s+/g,' ').trim();};
 for(let k=0;k<starts.length;k++){
 const row=ts.filter(t=>t.y>=starts[k]&&t.y<(starts[k+1]??page.height-20));
 const cols=bounds.slice(0,-1).map((b,c)=>join(row.filter(t=>t.x>=b&&t.x<bounds[c+1])));
 if(!cols[0]&&!cols[3])continue;
 const labels=row.filter(t=>t.x>=bounds[5]&&t.x<537*scale+offset).sort((a,b)=>a.y-b.y);
 const top=labels.find(t=>t.text==='매우'),bottom=labels.find(t=>t.text==='노력');
 const anchors=[top?top.y+6:null,labels.find(t=>t.text==='잘함'&&t.y>(top?.y??0)+18)?.y,labels.find(t=>t.text==='보통')?.y,bottom?bottom.y+6:null];
 if(anchors.every(y=>typeof y==='number')){
 const descriptions=row.filter(t=>t.x>=537*scale+offset&&t.x<bounds[6]);const groups=anchors.map(()=>[]);
 for(const t of descriptions){const distances=anchors.map(y=>Math.abs(t.y-y));groups[distances.indexOf(Math.min(...distances))].push(t);}
 cols[5]=LEVELS.map((l,n)=>`${l}: ${join(groups[n])}`).join('\n');
 }
 const code=cols[0].match(/\[2?(국|수|바|슬|즐)/)?.[1];
 const actualSubject=({국:'국어',수:'수학',바:'바른생활',슬:'슬기로운생활',즐:'즐거운생활'})[code]||subject;
 results.push({...blankItem(),subject:actualSubject,standard:cols[0],unit:cols[1],area:cols[2],element:cols[3],method:cols[4],criteria:cols[5],page:page.page});}
 }return results;
}
