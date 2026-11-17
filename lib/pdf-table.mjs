// PDF.js 5.4.624 constructPath uses DrawOPS (0 move, 1 line, 2 cubic,
// 3 quadratic, 4 close), not OPS.moveTo. See installed pdf.mjs
// makePathFromDrawOPS / CanvasGraphics.constructPath and worker buildPath.
const identity=[1,0,0,1,0,0];
const multiply=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const point=(m,x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
export function pdfTableLines(list,viewport,OPS){
 const lines=[],stack=[];let matrix=identity;
 const add=(a,b)=>{
  if(!a||!b)return;
  const [x,y]=point(viewport.transform,...point(matrix,...a)),[xx,yy]=point(viewport.transform,...point(matrix,...b));
  if(Math.abs(x-xx)<=.8&&Math.abs(y-yy)>4)lines.push({axis:'v',at:(x+xx)/2,from:Math.min(y,yy),to:Math.max(y,yy)});
  else if(Math.abs(y-yy)<=.8&&Math.abs(x-xx)>4)lines.push({axis:'h',at:(y+yy)/2,from:Math.min(x,xx),to:Math.max(x,xx)});
 };
 for(let n=0;n<list.fnArray.length;n++){
  const op=list.fnArray[n],args=list.argsArray[n];
  if(op===OPS.save||op===OPS.paintFormXObjectBegin){stack.push(matrix);if(op===OPS.paintFormXObjectBegin&&args[0])matrix=multiply(matrix,args[0]);}
  else if(op===OPS.restore||op===OPS.paintFormXObjectEnd)matrix=stack.pop()||identity;
  else if(op===OPS.transform)matrix=multiply(matrix,args);
  else if(op===OPS.constructPath){
   const [paint,data,box]=args,buffer=data?.[0];
   if(!buffer||paint===OPS.endPath)continue; // clipping paths are not table rules
   const stroke=[OPS.stroke,OPS.closeStroke,OPS.fillStroke,OPS.eoFillStroke,OPS.closeFillStroke,OPS.closeEOFillStroke].includes(paint);
   // Filled narrow rectangles are a common representation of table rules.
   if(!stroke&&(!box||Math.min(Math.abs(box[2]-box[0]),Math.abs(box[3]-box[1]))>2))continue;
   let current=null,start=null;
   for(let k=0;k<buffer.length;){
    const draw=buffer[k++];
    if(draw===0){current=[buffer[k++],buffer[k++]];start=current;}
    else if(draw===1){const next=[buffer[k++],buffer[k++]];add(current,next);current=next;}
    else if(draw===2){k+=4;current=[buffer[k++],buffer[k++]];}
    else if(draw===3){k+=2;current=[buffer[k++],buffer[k++]];}
    else if(draw===4){add(current,start);current=start;}
    else break; // unknown API/path: leave it for raw-source review
   }
  }
 }
 return mergeLines(lines);
}
function mergeLines(lines){
 const groups=[];
 for(const line of lines.sort((a,b)=>a.axis.localeCompare(b.axis)||a.at-b.at||a.from-b.from)){
  let group=groups.at(-1);
  if(!group||group.axis!==line.axis||Math.abs(group.at-line.at)>1){group={axis:line.axis,at:line.at,ranges:[]};groups.push(group);}
  group.ranges.push([line.from,line.to]);
 }
 return groups.flatMap(group=>{
  const ranges=[];
  for(const [from,to] of group.ranges.sort((a,b)=>a[0]-b[0])){const last=ranges.at(-1);if(last&&from<=last[1]+2)last[1]=Math.max(to,last[1]);else ranges.push([from,to]);}
  return ranges.map(([from,to])=>({axis:group.axis,at:group.at,from,to}));
 });
}
const compact=text=>text.replace(/[\s·ㆍ・]/g,'');
const names={standard:'성취기준',unit:'단원명',area:'평가영역',element:'평가요소',method:'평가방법',criteria:'평가기준',timing:'평가시기'};
function title(text){const value=compact(text);return Object.keys(names).find(key=>value.includes(names[key]));}
const inside=(token,left,right,top,bottom)=>token.x>=left-.5&&token.x+(token.w||0)<=right+.5&&token.y>=top&&token.y<bottom;
const overlap=(a,b,c,d)=>Math.max(0,Math.min(b,d)-Math.max(a,c));
function verticalSupport(lines,x,top,bottom,tokens){
 const pieces=lines.filter(l=>Math.abs(l.at-x)<1&&overlap(l.from,l.to,top,bottom)>0).sort((a,b)=>a.from-b.from);
 if(!pieces.length)return false;
 let covered=0,cursor=top;
 for(const p of pieces){const start=Math.max(top,p.from,cursor),end=Math.min(bottom,p.to);if(end>start){covered+=end-start;cursor=end;}}
 if(covered<(bottom-top)*.65)return false;
 // A partial painted rule also needs compatible text extents throughout the
 // gap. Header labels are checked separately against every resulting cell.
 return !tokens.some(t=>t.text.trim()&&t.y>=top&&t.y<bottom&&t.x<x-.5&&t.x+(t.w||0)>x+.5);
}
// No template scale or heading midpoint is used to decide a cell boundary.
// Small drawing gaps are joined. Partial vertical rules also need coverage
// and compatible header/body text extents; missing geometry goes to review.
export function planTableRegions(page){
 const rules=page.lines||[],vertical=rules.filter(l=>l.axis==='v'),horizontal=rules.filter(l=>l.axis==='h');
 const ys=[...new Set(horizontal.map(l=>l.at))].sort((a,b)=>a-b),regions=[];
 for(let n=0;n<ys.length-1;n++){
  const top=ys[n],bottom=ys[n+1];if(bottom-top<5)continue;
  const headerTokens=page.tokens.filter(t=>t.y>=top&&t.y<bottom&&t.text.trim());
  if(!compact(headerTokens.map(t=>t.text).join('')).includes('성취기준'))continue;
  const xs=[...new Set(vertical.filter(l=>verticalSupport(vertical,l.at,top,bottom,headerTokens)).map(l=>l.at))].sort((a,b)=>a-b);
  const columns=[];
  for(let c=0;c<xs.length-1;c++){
   const tokens=headerTokens.filter(t=>inside(t,xs[c],xs[c+1],top,bottom));
   const key=title(tokens.sort((a,b)=>a.y-b.y||a.x-b.x).map(t=>t.text).join(''));
   if(key)columns.push({key,left:xs[c],right:xs[c+1]});
  }
  const keys=columns.map(c=>c.key);
  if(!['standard','unit','area','element','method','criteria','timing'].every(key=>keys.filter(k=>k===key).length===1))continue;
  if(keys.join(',')!=='standard,unit,area,element,method,criteria,timing')continue;
  const left=columns[0].left,right=columns.at(-1).right,method=columns.find(c=>c.key==='method'),criteria=columns.find(c=>c.key==='criteria');
  const fullAt=y=>horizontal.some(l=>Math.abs(l.at-y)<1&&l.from<=left+2&&l.to>=right-2);
  if(!fullAt(top)||!fullAt(bottom))continue;
  // Item separators cross all five task fields. Level separators only cross
  // the criteria cell and never become a new assessment task.
  const tableEnd=Math.min(...vertical.filter(l=>Math.abs(l.at-left)<1&&l.from<=top+2&&l.to>=bottom-2).map(l=>l.to));
  const rowEdges=ys.filter(y=>y>=bottom-1&&y<=tableEnd+1&&horizontal.some(l=>Math.abs(l.at-y)<1&&l.from<=left+2&&l.to>=method.right-2));
  if(rowEdges.length<2)continue;
  const end=rowEdges.at(-1);
  if(columns.some(c=>[c.left,c.right].some(x=>!verticalSupport(vertical,x,bottom,end,page.tokens))))continue;
  const splits=[...new Set(vertical.filter(l=>l.at>criteria.left+3&&l.at<criteria.right-3&&verticalSupport(vertical,l.at,bottom,end,page.tokens)).map(l=>l.at))];
  if(splits.length!==1)continue;
  regions.push({top,headerBottom:bottom,bottom:end,columns,levelBoundary:splits[0],rows:rowEdges.slice(0,-1).map((y,k)=>({top:y,bottom:rowEdges[k+1]}))});
 }
 return regions;
}
export function partitionPlanPage(page){
 const regions=planTableRegions(page),rows=[],audit=page.tokens.map((t,id)=>({id,role:t.text.trim()?'review':'whitespace'}));
 for(const region of regions){
  for(let id=0;id<page.tokens.length;id++){
   const token=page.tokens[id];
   if(inside(token,region.columns[0].left,region.columns.at(-1).right,region.top,region.headerBottom))audit[id]={id,role:'header'};
  }
  for(const row of region.rows){
   const columns=Object.fromEntries(region.columns.map(c=>[c.key,[]])),uncertain=[];
   for(let id=0;id<page.tokens.length;id++){
    const t=page.tokens[id];if(!t.text.trim()||t.y<row.top||t.y>=row.bottom)continue;
    const hits=region.columns.filter(c=>overlap(t.x,t.x+(t.w||.01),c.left,c.right)>0);
    if(!hits.length)continue;
    const c=hits.length===1?hits[0]:null;
    const height=Math.max(1,t.h||t.fontHeight||10);
    // Width is evidence of overlap; never slice/duplicate a text token whose
    // per-character positions PDF.js has not supplied.
    if(!c||!inside(t,c.left,c.right,row.top,row.bottom)||t.y-height<row.top-2||(t.dir==='ttb'||t.unsupportedOrientation)||(audit[id].role!=='review'&&audit[id].role!=='whitespace')){
     uncertain.push(id);audit[id]={id,role:'review',reason:'cell-overlap'};continue;
    }
    columns[c.key].push({...t,tokenId:id});audit[id]={id,role:'field',field:c.key,row:rows.length,...(/^[▪●•◦○□■▶-]$/.test(t.text.trim())?{kind:'bullet'}:{})};
   }
   rows.push({...row,columns,uncertain,region});
  }
 }
 return {rows,audit,regions};
}
