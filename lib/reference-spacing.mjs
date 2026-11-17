// Spacing repair for new working copies only. These rules delete
// whitespace; they never rewrite letters, punctuation, or the original fields.
const gap = '[ \\t\\r\\n\\u00a0]';
const boundary = '[^\\p{L}\\p{N}_]';
const particles = '에서는|에서도|에게서|에게는|에게도|으로는|으로도|까지는|부터는|에서|에게|께서|으로|까지|부터|처럼|보다|을|를|은|는|이|가|와|과|에|도|만|의';
const endings = '하였던|하였을|하였음|하였고|하였으며|하였다|했었던|했었다|했으면|하면서|하는|하던|했던|하고|하며|하여|해서|했다|한다|하다|하기|하니|하면|해서는|하여서|했음|했을|한|할|함|해';
// Admit only known stems with complete, known inflections/particles. Unknown
// words and names are not guessed, and a separate '한/일/중/수' is never joined.
const splitWords = ['경험', '기억'].map(word => new RegExp(
 `(^|${boundary})(${[...word].join(`${gap}*`)})(?:(?:${endings})(?:${particles})?|(?:${particles}))?(?=$|${boundary})`, 'gu'
));
const nouns = '색상환 색 크기 낱말 글자 문장 이름 잎 모양 수 개수 길이 무게 시간 그림 노래 작품 악기 자료 결과 생각 느낌 감정 방법 문제 규칙 약속 모습 특징 물건 구체물 자연 환경 까닭 일 온도 종류 자세 쓰임 도구 제목 밑줄 경험 기억 앞 뒤 옆 안 밖'.split(' ');
// A particle must be a whole token after a known noun, not the first syllable
// of e.g. '이야기/가르치기/도구'. No all-Hangul or single-character heuristic.
const detachedParticle = new RegExp(
 `(^|${boundary})(${nouns.join('|')})${gap}+(${particles})(?=$|${boundary})`, 'gu'
);

// Preserve quotation/literal contents, including whitespace comparisons. An
// unclosed quotation protects the remainder rather than guessing its meaning.
export function mapUnquoted(source, transform, preserve = text => text) {
 const quotes = {'‘':'’', '“':'”', "'":"'", '"':'"', '`':'`'};
 let result = '', start = 0, index = 0;
 while (index < source.length) {
  const closing = quotes[source[index]];
  if (!closing) {index++; continue;}
  result += transform(source.slice(start, index));
  const quotedStart = index++;
  while (index < source.length) {
   if (source[index] === '\\') {index += 2; continue;}
   if (source[index++] === closing) break;
  }
  result += preserve(source.slice(quotedStart, index));
  start = index;
 }
 return result + transform(source.slice(start));
}

// Reference-only literals include book/work titles and numeric expressions.
// Mask before task splitting as well, so punctuation inside them is untouched.
export function protectReferenceLiterals(source) {
 const literals=[];
 const hold=value=>{const key=`\ue000${literals.length}\ue001`;literals.push(value);return key;};
 const text=mapUnquoted(source,value=>value.replace(/《[^》]*(?:》|$)|〈[^〉]*(?:〉|$)|「[^」]*(?:」|$)|『[^』]*(?:』|$)|\d[\d,.:/]*(?:[ \t]*(?:%|㎝|㎏))?/g,(literal,index)=>{
  // Numbered bullet markers are structure, not numeric task contents.
  if(/(?:^|\n)[ \t]*$/.test(value.slice(0,index))&&((/^\d+[.]$/.test(literal)&&/\s/.test(value[index+literal.length]||''))||(/^\d+$/.test(literal)&&/^\)\s/.test(value.slice(index+literal.length)))))return literal;
  return hold(literal);
 }),hold);
 return {text,restore:value=>value.replace(/\ue000(\d+)\ue001/g,(_,index)=>literals[Number(index)])};
}

const referencePatterns=new WeakMap();
export const OBJECT_NOUNS='색상환 색 크기 낱말 글자 문장 이름 잎 모양 수 개수 길이 무게 시간 그림 노래 작품 악기 자료 결과 생각 느낌 감정 방법 문제 규칙 약속 모습 특징 물건 구체물 자연 환경 까닭 일 온도 종류 자세 쓰임 도구 제목 밑줄 경험 기억 발음 호기심 관심 흥미 동물 식물 한글 안전사고 예방책 대책 해결책 계획 보고서 이야기 편지 글 책 내용 의견 정보 인사말 마음 수감각 활동 협동화'.split(' ');
// Productive noun heads, not a rule that every word before a verb is an object.
export function isObjectNoun(word){
 return OBJECT_NOUNS.includes(word)||/^[가-힣]{2,}(?:책|자료|보고서|계획|작품|방법|의견|정보|문장)$/.test(word);
}
const noForms=[];
function spacingPatterns(forms,lineWrap){
 let variants=referencePatterns.get(forms);
 if(variants?.has(lineWrap))return variants.get(lineWrap);
 const horizontal=lineWrap?'[ \\t\\r\\n\\u00a0]*':'[ \\t\\r\\u00a0]*';
 const words=[...new Set(['경험','기억','호기심','발음','플라스틱','빈칸','안전사고',...forms])].filter(word=>!word.includes(' ')).sort((a,b)=>b.length-a.length);
 const patterns=words.map(word=>({word,pattern:new RegExp(`(^|${boundary})${[...word].join(horizontal)}(?=$|${boundary}|(?:${particles})(?=$|${boundary}))`,'gu')}));
 if(!variants){variants=new Map();referencePatterns.set(forms,variants);}
 variants.set(lineWrap,patterns);return patterns;
}
export function repairReferenceSpacing(source,{reference=false,forms=noForms,lineWrap=false}={}) {
 return mapUnquoted(source, text => {
  for (const pattern of splitWords) {
   text = text.replace(pattern, (match, before) =>
    before + match.slice(before.length).replace(/[ \t\r\n\u00a0]/g, ''));
  }
  text=text.replace(detachedParticle, (_, before, noun, suffix) => before + noun + suffix);
  if(!reference)return text;
  // Cross-line lexical repair is opt-in, after the caller establishes a cell
  // paragraph (or before new task splitting, for a recognized broken word).
  for(const {word,pattern} of spacingPatterns(forms,lineWrap)){
   text=text.replace(pattern,(_,before)=>before+word);
  }
  const nounPattern=new RegExp(`(^|${boundary})([가-힣]+)${gap}+(${particles})(?=$|${boundary})`,'gu');
  return text.replace(nounPattern,(whole,before,noun,suffix)=>isObjectNoun(noun)||noun==='플라스틱'?before+noun+suffix:whole);
 });
}
