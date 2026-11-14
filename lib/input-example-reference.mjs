// Local, conservative grammar for teacher-editable reference drafts. Never use
// this wording as observed performance or as a source for actual activities.
import {mapUnquoted} from './reference-spacing.mjs';
import {evaluationPredicate,objectParticle,prepareSentenceCopy,sourceTaskCopy} from './sentence-style.mjs';
function recognize(text) {
 const verb=evaluationPredicate(text);
 if(verb)return {...verb,head:verb.head.replace(/(\S+)\s+$/,(_,word)=>`${objectParticle(word)} `)};
 if(text.endsWith('활동'))return {head:text,final:'에 참여함',link:'에 참여하고'};
 return null;
}

function normalize(source) {
 return prepareSentenceCopy(sourceTaskCopy(source));
}

function tasks(source) {
 // Only split commas outside quotations/parentheses and after recognizable
 // predicates. Thus '몇 시, 몇 시 30분', 1,000, and material names survive.
 const result=[]; let part='', closing='', depth=0;
 const quotes={'‘':'’','“':'”',"'":"'",'"':'"','`':'`'};
 const push=()=>{if(part.trim())result.push(part.trim().replace(/[.!。]+$/,''));part='';};
 for (let i=0;i<source.length;i++) {
  const char=source[i];
  if (closing) {part+=char;if(char==='\\'&&source[i+1])part+=source[++i];else if(char===closing)closing='';continue;}
  if (quotes[char]) {closing=quotes[char];part+=char;continue;}
  if ('(['.includes(char))depth++;
  if (')]'.includes(char))depth=Math.max(0,depth-1);
  if (!depth && (char==='\n'||char===';'||((char===','||char==='·'||char==='/')&&recognize(part.trim())))) {push();continue;}
  if (!depth && /[와과및]/.test(char) && recognize(part.trim()) && /\s/.test(source[i+1]||'')) {push();continue;}
  // Periods terminate prose only after known predicates, never decimals.
  if (!depth && /[.!。]/.test(char) && recognize(part.trim()) && (!source[i+1]||/\s/.test(source[i+1]))) {push();continue;}
  part+=char;
 }
 push();return result.map(t=>mapUnquoted(t,text=>text.replace(/\s+/g,' ')).trim()).filter(Boolean);
}

export function hasReferenceTask(source) {
 return tasks(normalize(source)).some(clause=>recognize(clause)||clause.endsWith('기'));
}

export function referenceSentence(source) {
 let clauses=tasks(normalize(source));
 // Keep every independent task and its original order/conditions.
 if (!clauses.length) return '수업 활동에 참여함.';
 const rendered=clauses.map((clause,index)=>{
  const verb=recognize(clause);
  if(verb)return verb.head+(index===clauses.length-1?verb.final:verb.link);
  // Unknown inflections stay in the editable draft; do not invent participation
  // or erase tasks to fit a length ratio. Bare named activities are recognized.
  return clause;
 });
 return prepareSentenceCopy(rendered.join(', ')+'.');
}
