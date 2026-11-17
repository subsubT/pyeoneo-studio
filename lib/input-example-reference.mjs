// Local grammar for teacher-editable hypothetical references, never actual facts.
import {analyzeInputTask,taskContentIssues} from './input-task.mjs';

export function hasReferenceTask(source){
 return analyzeInputTask(source).clauses.some(clause=>clause.verb||clause.text.endsWith('기'));
}

export function referenceSentence(source,analysis=analyzeInputTask(source)){
 const {restore}=analysis;
 if(analysis.issues.length)return referenceSourceDraft(source);
 const entries=analysis.clauses;
 if(!entries.length)return '수업 활동에 참여함.';
 const rendered=entries.map(({text,verb,bridge},index)=>{
  const last=index===entries.length-1;
  // Preserve unsupported topics/tasks in a nominal task description instead
  // of silently passing an unconverted finite verb or deleting its content.
  if(!verb)return `${text} 관련 과제를 다룸${last?'':', '}`;
  if(bridge)return verb.head+verb.relative+' 활동을 통해 ';
  if(last)return verb.head+verb.final;
  // Before an explicit activity→attitude bridge, use the lexical ~며 form.
  if(entries[index+1]?.bridge&&verb.manner)return verb.head+verb.manner+' ';
  return verb.head+verb.link+', ';
 });
 const sentence=restore(rendered.join('').trim()+'.');
 return taskContentIssues(analysis,sentence).length?referenceSourceDraft(source):sentence;
}

export function referenceSourceDraft(source){
 const excerpt=source.replace(/\s+/g,' ').trim();
 return `‘${excerpt.length>1800?excerpt.slice(0,1800)+'…':excerpt}’ 관련 과제를 다룸.`;
}
