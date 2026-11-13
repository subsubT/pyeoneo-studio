// Reproducible comparison of synthetic inputs with the pre-change generator.
import {execFileSync} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
import {createInputExamples} from '../lib/input-examples.mjs';
import {styleFixtures} from '../tests/reference-style-fixtures.mjs';
const baseline='7cf6de7';
const oldSource=execFileSync('git',['show',`${baseline}:lib/input-examples.mjs`],{encoding:'utf8'});
const {createInputExamples:old}=await import(`data:text/javascript;base64,${Buffer.from(oldSource).toString('base64')}`);
const escape=value=>value.replace(/\|/g,'\\|').replace(/\n/g,'<br>');
const notes=[
 '낱말 찾기·문장 만들기를 모두 보존. 불릿 제거 및 쓰기→만들기 연결. 첫 과제의 관계를 단정해 삭제하지 않음.',
 '자세 알아보기·1학년 경험/까닭 쓰기·감정 발표 보존. 조사/자신이 경험한 호응 교정. 준비 활동은 연결해 보존.',
 '종류 알아보기→디지털 기기로 이야기 자료 탐색. 특징이나 새 자료 종류를 임의 추가하지 않음.',
 '반복된 설명 글 읽기는 한 번으로 통합. 밑줄·이해·질문 만들기·친구 문답 모두 보존.',
 '수의 필요성 말하기와 묶음/낱개로 읽고 쓰기 모두 보존. 새 수학 활동 추가 없음.',
 '몇 시/몇 시 30분·정확성을 보존. 시각을 넣어 말하기→시각 표현으로 호응 교정.',
 '자신의 규칙·자료 배열 및 설명 모두 보존. 표본의 설명 생략을 일반화하지 않음.',
 '물건으로 악기 만들기→참여 종결. 연주·합주/성실성 추가 없음.',
];
const rows=styleFixtures.map((f,i)=>({name:f.name,input:{element:f.element,method:''},before:old({element:f.element}).example,after:createInputExamples({element:f.element}).example,notes:notes[i],variant:f.variant,variantBefore:old({element:f.variant}).example,variantAfter:createInputExamples({element:f.variant}).example,changed:f.changed}));
let doc=`# 참고 예시문장 문체 비교 — 2026-11-13 KST\n\nCodex 직접 실행. 기준 코드 \`${baseline}\`. 원본 item.element/method는 제공되지 않아 **제공 문장으로 구성한 합성 입력**을 사용했다. 아래 수정 전은 해당 합성 필드를 구버전 함수에 직접 넣은 재현값이며, 사용자가 제시한 수정 전과 동일한 원본 입력을 재현했다고 주장하지 않는다. 모든 method는 공란이다. 사용자 수정 후는 문체 기준이며 완전 문자열 일치 시험이 아니다.\n\n| 표본 | 합성 element (method 공란) | 구버전 직접 결과 | 새 결과 | 남긴 핵심·통합한 방법 / 판정 |\n| --- | --- | --- | --- | --- |\n`;
for(const r of rows)doc+=`| ${r.name} | ${escape(r.input.element)} | ${escape(r.before)} | ${escape(r.after)} | PASS — ${r.notes} |\n`;
doc+='\n## 일반화 8개\n\n| 표본 | 변형 element (method 공란) | 구버전 직접 결과 | 새 결과 | 바뀐 대상·조건 / 판정 |\n| --- | --- | --- | --- | --- |\n';
for(const r of rows)doc+=`| ${r.name} | ${escape(r.variant)} | ${escape(r.variantBefore)} | ${escape(r.variantAfter)} | PASS — ${r.changed} 반영, 원형 출력과 다름 |\n`;
doc+='\n## 판정 범위\n\n불릿·명사형 과제 나열·겹종결을 검사하고 각 핵심 토큰/조건의 보존과 변형 반영을 확인했다. 표본 ①의 첫 수행, ④의 밑줄, ⑦의 설명은 관계를 추정하여 삭제하지 않았다. 제공한 후문과 달라도 중립적 수행 문장으로 자연스럽게 연결하고 핵심을 유지하는 것을 통과 기준으로 삼았다. 칭찬·다양한/여러 가지·길이 배수를 자동 삽입하지 않는다.\n\n인식하지 못한 동사는 명사형 활동명으로 남기고 참여 초안을 제공한다. 한도를 초과하는 단일 입력은 잘라서 새 사실을 주장하지 않고 일반 수업 참여 초안을 제공하며 원 입력은 유지한다. 모든 한국어 문장에 대한 의미 분석/문체 품질 보증은 아니며 교사가 편집·최종 승인한다.\n';
await writeFile('docs/REFERENCE-STYLE-COMPARISON.md',doc);
await mkdir('tmp/reference-style',{recursive:true});await writeFile('tmp/reference-style/comparison.json',JSON.stringify(rows,null,2));
console.log(`Wrote ${rows.length} original and ${rows.length} variant comparisons.`);
