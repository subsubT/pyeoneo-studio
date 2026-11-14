// Spacing repair for generated reference drafts only. These rules delete
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

export function repairReferenceSpacing(source) {
 return mapUnquoted(source, text => {
  for (const pattern of splitWords) {
   text = text.replace(pattern, (match, before) =>
    before + match.slice(before.length).replace(/[ \t\r\n\u00a0]/g, ''));
  }
  return text.replace(detachedParticle, (_, before, noun, suffix) => before + noun + suffix);
 });
}
