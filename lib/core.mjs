import {sentenceLength,lengthReference,sentenceStyleIssues} from './sentence-style.mjs';
import {pdfCellText,pdfVocabulary} from './pdf-text.mjs';
import {generationSource} from './generation-source.mjs';
import {partitionPlanPage} from './pdf-table.mjs';
export const LEVELS=['매우 잘함','잘함','보통','노력 요함'];
export const BANNED=['구현함','구축함','명확하게','명확히','전략','뚜렷이','기재','절차','안내함','식별','또렷이','재정리','압축','분명히','분명하게','차근차근','차분히','차분하게','또박또박'];
export const blankItem=()=>({id:crypto.randomUUID(),subject:'국어',unit:'',standard:'',area:'',element:'',method:'',criteria:'',page:0,sourceId:'',included:true,actual:'',example:'',target:24,candidates:[],approved:[]});
export function similarity(a,b){const grams=s=>{const t=s.replace(/\s/g,'');return new Set(Array.from({length:Math.max(0,t.length-1)},(_,i)=>t.slice(i,i+2)))};const x=grams(a),y=grams(b);return x.size+y.size?2*[...x].filter(v=>y.has(v)).length/(x.size+y.size):0;}
export function validateText(text,example='',others=[],actual='',{warnSimilarity=true}={}){const errors=[],warnings=[];
 const bad=BANNED.filter(w=>text.includes(w));if(bad.length)errors.push('금지 표현: '+bad.join(', '));
 errors.push(...sentenceStyleIssues(text));
 if(!text.trim()||sentenceLength(text)>1200)errors.push('문장 길이는 1~1,200자로 제한됩니다.');
 if(others.some(s=>s.trim()===text.trim()))errors.push('이미 있는 문장과 동일합니다.');else if(warnSimilarity&&others.some(s=>similarity(s,text)>.9))warnings.push('다른 문장과 표현이 매우 비슷합니다.');
 const baseline=sentenceLength(lengthReference(example,actual)),length=sentenceLength(text);
 if(baseline&&(length<baseline||length>baseline*1.5))warnings.push('기준 문장 길이의 1~1.5배 범위 밖입니다. 핵심 보존과 자연스러움을 우선해 검토하세요.');
 return {errors,warnings};
}
// Conservative qualifier checks supplement the independent model review. A
// sparse activity is valid; only an added qualifier receives a review issue.
// Alias groups avoid requiring a verbatim copy of a teacher's known qualifier.
export function groundingIssues(text,actual,example=''){
 const selected=generationSource({actual,example});
 const withoutHelp=/도움(?:을)?\s*(?:받지\s*않|없이)|지원\s*없이|보조\s*없이/;
 const withHelp=/도움(?:을)?\s*받(?:아|았|으며|고|음)|지원(?:을)?\s*받|보조(?:를)?\s*받/;
 const qualifiers=[
  [/도움|지원|보조/,'도움·지원'],
  [new RegExp('스스로|혼자|독립적|'+withoutHelp.source),'독립 수행'],
  [/정확|바르게|올바르|틀리.*않|오류.*없이/,'정확성'],
  [/적극|자발|의욕|성실/,'태도'],
  [/(?:^|\s)잘(?=\s|했|하|함|[.,]|$)/,'잘 수행함'],
  [/협력|협동|함께/,'협력'],
 ];
 const positiveHelp=value=>value.replace(new RegExp(withoutHelp.source,'g'),'');
 const issues=qualifiers.filter(([pattern,label])=>pattern.test(label==='도움·지원'?positiveHelp(text):text)&&!pattern.test(label==='도움·지원'?positiveHelp(selected.text):selected.text)).map(([,label])=>`변형 원문에 없는 ${label} 표현을 확인해 주세요.`);
 // Explicit assistance/independence contradictions supplement (never replace)
 // the independent review of actions, quantities, negatives and constraints.
 if((withoutHelp.test(actual)&&withHelp.test(text))||(withHelp.test(actual)&&(/스스로|혼자|독립적/.test(text)||withoutHelp.test(text))))issues.push('실제 활동에 명시된 도움·독립 수행 조건과 모순되는지 확인해 주세요.');
 return issues;
}
export function combine(items,ids){const selected=ids.map(id=>items.find(i=>i.id===id));if(selected.length<2||selected.some(i=>!i?.approved.length))throw Error('승인 문장이 있는 항목을 2개 이상 선택하세요.');if(new Set(selected.map(i=>i.subject)).size!==1)throw Error('같은 교과의 항목만 조합할 수 있습니다.');const n=Math.min(...selected.map(i=>i.approved.length));return Array.from({length:n},(_,k)=>({subject:selected[0].subject,text:selected.map(i=>i.approved[k].text).join(' '),sources:selected.map(i=>i.approved[k].id)}));}
export function parsePlanPages(pages,{audit:pageAudits=[]}={}){
 let subject='확인 필요';const results=[],vocabulary=pdfVocabulary(pages);
 for(const page of pages){
  const found=page.tokens.map(t=>t.text).join(' ').match(/(국어|수학|바른\s*생활|슬기로운\s*생활|즐거운\s*생활)\s*과/);
  if(found)subject=found[1].replace(/\s/g,'');
  const {rows,audit,regions}=partitionPlanPage(page);
  let reviewRequired=!regions.length&&page.tokens.some(t=>t.text.trim());
  for(const row of rows){
   const {columns,region}=row,criteria=region.columns.find(c=>c.key==='criteria');
   const edges=[row.top,...(page.lines||[]).filter(l=>l.axis==='h'&&l.at>row.top+2&&l.at<row.bottom-2&&l.from<=criteria.left+2&&l.to>=criteria.right-2).map(l=>l.at),row.bottom].sort((a,b)=>a-b);
   const unique=edges.filter((y,n)=>!n||y-edges[n-1]>1),levels=[];
   let ambiguous=row.uncertain.length>0||columns.criteria.some(t=>t.x<region.levelBoundary&&t.x+t.w>region.levelBoundary+.5);
   for(let n=0;n<unique.length-1;n++){
    const tokens=columns.criteria.filter(t=>t.y>=unique[n]&&t.y<unique[n+1]);
    if(tokens.some(t=>t.y-Math.max(1,t.h||t.fontHeight||10)<unique[n]-2))ambiguous=true;
    const labels=tokens.filter(t=>t.x+t.w<=region.levelBoundary+.5),description=tokens.filter(t=>t.x>=region.levelBoundary-.5);
    const label=pdfCellText(labels,{vocabulary}).replace(/\s/g,'');
    const level=LEVELS.find(l=>l.replace(/\s/g,'')===label);
    if(!level){ambiguous=true;break;}
    for(const t of labels)audit[t.tokenId]={id:t.tokenId,role:'level-label',row:results.length};
    levels.push({name:level,text:pdfCellText(description,{vocabulary})});
   }
   if(levels.length!==4||new Set(levels.map(l=>l.name)).size!==4)ambiguous=true;
   const cols=Object.fromEntries(Object.entries(columns).map(([key,tokens])=>[key,pdfCellText(tokens,{vocabulary})]));
   if(!cols.standard||!cols.element)ambiguous=true;
   if(ambiguous){
    reviewRequired=true;
    for(const tokens of Object.values(columns))for(const t of tokens)audit[t.tokenId]={id:t.tokenId,role:'review',reason:'uncertain-row'};
    continue;
   }
   const code=cols.standard.match(/\[2?(국|수|바|슬|즐)/)?.[1];
   const actualSubject=({국:'국어',수:'수학',바:'바른생활',슬:'슬기로운생활',즐:'즐거운생활'})[code]||subject;
   results.push({...blankItem(),subject:actualSubject,standard:cols.standard,unit:cols.unit,area:cols.area,element:cols.element,method:cols.method,criteria:levels.map(l=>`${l.name}: ${l.text}`).join('\n'),page:page.page});
  }
  for(const entry of audit){
   if(entry.role!=='review')continue;
   const t=page.tokens[entry.id];
   const inTable=regions.some(r=>t.y>=r.headerBottom&&t.y<r.bottom&&t.x<r.columns.at(-1).right&&t.x+(t.w||0)>r.columns[0].left);
   if(inTable)reviewRequired=true;
   else entry.role=regions.length?'outside-table':'review';
  }
  // IDs refer to the original page.tokens array. This stays in browser memory;
  // no educational tokens or bodies are written to server logs.
  pageAudits.push({page:page.page,reviewRequired,assignments:audit});
 }
 return results;
}
