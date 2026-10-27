import {readFile,writeFile} from 'node:fs/promises';
const load=async name=>JSON.parse(await readFile('tmp/checkpoint5/'+name,'utf8'));
const baseline=await load('live-results.json');
const colors=await load('colors-regression.json');
const words=await load('words-regression.json');
let negativeRun;
try{negativeRun=await load('negative-regression.json');}catch{negativeRun={metrics:[],error:{code:'PENDING'}};}
const chosen=[colors.cases.find(c=>c.id==='colors'),words.cases.find(c=>c.id==='words')||baseline.cases.find(c=>c.id==='words'),...baseline.cases.filter(c=>['numbers','support'].includes(c.id))];
if(chosen.some(c=>!c))throw Error('Live results are incomplete.');
const negative=negativeRun.negativeTest||colors.negativeTest;
const passed=chosen.every(c=>c.accepted>0)&&!words.error&&negativeRun.passed===true&&negative?.rejected===5&&negative?.positiveControlPassed;
const recorded=[baseline,colors,words,negativeRun,await load('words-review-timeout.json'),await load('words-schema-failure.json'),await load('smoke.json')].flatMap(r=>r.metrics||[]);
const sum=key=>recorded.reduce((a,m)=>a+(m[key]||0),0);
const rows=chosen.map(c=>`| ${c.id} | ${c.input.level} | ${c.generated} | ${c.accepted} | ${c.flagged} |`).join('\n');
const markdown=`# Checkpoint 5: 로컬 NVIDIA 실제 생성·검증\n\n상태: ${passed?'PASS (로컬 연결·검증 기능)':'부분 완료: 로컬 연결·생성 기능 완료, 실모델 품질 재검증 일부 미완료'} / 2026-10-27\n\n`+
`모델: deepseek-ai/deepseek-v4.1-flash. 공식 https://integrate.api.nvidia.com/v1/chat/completions 호출. 가상 교육활동만 사용했고 학생자료·PDF·전체 XLSX는 전송하지 않았다.\n\n`+
`## 실모델 결과\n\n| 사례 | 수준 | 생성 | 자동 검사 통과 | 검토 표시 |\n|---|---|---:|---:|---:|\n${rows}\n\n`+
`자동 검사 통과는 교사 승인과 다르다. 형식·금지어·중복·근거 확인에서 탈락한 후보는 표시하고 제외하며, 유효 후보는 별도 모델 호출로 의미를 검토한다. 최종 승인은 교사가 수행한다. 색은 수정 후 재시험, 수 비교/도움 필요는 최초 시험 결과다. 낱말은 최초 확인 결과를 보수적으로 남겼고 후속 검토 상태는 ${words.error?.code||'완료'}이다. 검토 재시도에는 이미 받은 실제 생성 응답을 재사용했다.\n\n`+
`색 혼합 실험, 별도 작품 제작, 친구 작품 감상, 색상환 완성 누락, 협력 행동 추가를 넣은 부적합 문장 5/5 거부. 실제 활동만 담은 대조 문장 1/1 통과. 이는 마지막 성공한 시험 결과이며, 검토 지침 보완 후 최신 재검사 상태는 ${negativeRun.error?.code||'완료'}이다. 시간 초과를 통과로 처리하지 않는다.\n\n`+
`처음 색 시험은 12개 중 8개 통과, 낱말 시험은 종결 등의 이유로 0개 통과했다. 근거가 문자열로 온 후속 응답도 전체 차단했다. 수정 후에는 단일 근거 문자열만 배열로 표준화하고 정확한 입력 근거 검사를 유지했다. 종결 지침과 동일한 활동을 표현한 문장의 검토 지침을 보완했다. 부적합 후보를 자동 수정·승인하지 않는다.\n\n`+
`기록된 CLI 성공 호출 ${recorded.length}회: 입력 ${sum('prompt_tokens')} / 출력 ${sum('completion_tokens')} / 전체 ${sum('total_tokens')} 토큰. 브라우저 시험 2회 및 초기 시간초과 요청은 이 집계에 포함하지 않았다. 성공 호출 시간 ${Math.min(...recorded.map(m=>m.durationMs))}~${Math.max(...recorded.map(m=>m.durationMs))}ms. 대기 시간이 길어 공개 운영의 응답성을 검증했다는 의미는 아니다.\n\n`+
`## 보호·화면·빌드 검사\n\n- 단위/통합 테스트 19개 PASS. production/Vercel 환경에서 플래그와 키가 있어도 GET enabled=false / POST 503. 요청·응답 크기, Host/Origin, 동시 실행, 한도, 오류 정보 최소화 검사.\n- production build PASS. 로컬 개발 산출물은 .next-local로 분리.\n- 로컬 브라우저에서 후보 12개 수신 → 검토 → 1개 승인 → XLSX 다운로드 → 다시 열어 문장/수준 일치 확인. 브라우저 오류·경고 0건. 원본 예시 수정 없음.\n- .env.local 원본 바이트 일치, 기존 VERCEL_OIDC_TOKEN 보존, Git 제외 확인. Git 대상 소스·브라우저 번들·로컬 결과에서 두 실제 비밀값을 검색해 누출 0건 확인.\n- 재배포·Vercel 환경변수 편집 없음. 기존 production dpl_CprraCzwjNAMVdMqfddm8DCx4nfD Ready 유지. 공개 API 응답 {enabled:false} 확인.\n\n`+
`## 실행\n\n로컬 키를 .env.local에 둔 상태에서 npm run dev:ai. http://127.0.0.1:3005 에서 실행한다. 일반 npm run dev 또는 production에서는 AI가 꺼진다. npm run test:ai는 가상 자료를 실제 API에 전송하는 명시적 시험이며 자동 테스트에 포함하지 않는다.\n\n`+
`## 남은 한계\n\n대표 가상 사례의 검증이며 모든 활동·문장에서 사실성이 보장되는 것은 아니다. 일부 문장은 종결·중복·의미 누락 등으로 계속 검토 대상이 된다. 공개 운영용 약관 확인, 분산 호출/예산 제한, 장시간 가용성·부하 시험은 별도 단계다. 원시 실모델 시험 기록은 Git 제외 경로 tmp/checkpoint5/에 보관한다.\n`;
await writeFile('docs/CHECKPOINT-5.md',markdown);
console.log(JSON.stringify({checkpoint5:passed?'PASS':'INCOMPLETE',cases:chosen.map(c=>({id:c.id,accepted:c.accepted,flagged:c.flagged})),negativeRejected:negative.rejected}));
if(!passed)process.exitCode=1;
