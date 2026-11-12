# Gemini 공개 AI 설정과 무료 한도

## 현재 우선: 공개 활성화 재개 지시 (2026-11-12)

이전 실제 서버 사전 검사/공개 첫 성공 근거는 재사용한다. 이전24회 총량·무조건 재시도 금지·한 번 실패하면 전체 비활성화 규칙은 대체됐다. 같은 모델에서 실패한503단계만 한 번 추가(총최대3호출), Retry-After/취소/시간/공유한도를 지킨다. 각실시도는 rolling12RPM/200k입력bytes 및 **450호출/rolling26시간** 공유예산에 포함한다. 26시간은 Pacific DST의25시간 하루도 보호하며 500RPD에50회 여유를 둔다. 기존카운터/salt/namespace는 유지한다. 무조건100배치×2호출이라는 과거 계산은 이제 최대3호출로 보정한다.

검증 소스·두 플래그true 배포 READY/공개도메인 확인 후에만 서버 일회성 `node scripts/public-ai-control.mjs --resume`으로 중지키 하나를 제거한다. 사전검사를매번반복하지 않는다. 제공사503/429만으로전역중지하지않고오류안내와입력·후보보존을확인해실패한공개사례부터재개한다. 지속공급자장애는미확인검사를남기고활성배포유지. `--resume`은API가아닌Production Secret주입CLI이며카운터/salt는건드리지않는다. 상태CLI는 `--status`, 마지막배포는일반 `npm run build`를사용한다. [현재 실행 인계](GEMINI-PUBLIC-AI-ACTIVATION-HANDOFF.md). 아래는첫실행의역사/기존기능설명이다.


2026-11-12 KST 사용자 결정. 제공사는 Google Gemini API, 모델은 서버 고정 `gemini-3.5-flash-lite`다. Google Free·Vercel Hobby·사용자 소유 Upstash Free만 사용한다. 키 발급/Free 확인/Production 등록은 사용자 완료 확인과 이번 metadata 조회가 있으므로 재등록하지 않는다. [과거 NVIDIA 구성안](history/NVIDIA-PUBLIC-AI-SETUP-2026-11-11.md)은 역사다.

| Production 변수 | 역할 |
| --- | --- |
| `PYEONEO_GEMINI_API_KEY` | 서버 전용 Gemini Secret |
| `PUBLIC_AI_REDIS_URL` | 기존 Upstash HTTPS REST URL; 이름의 PUBLIC은 NEXT_PUBLIC이 아니며 브라우저로 보내지 않음 |
| `PYEONEO_AI_REDIS_TOKEN` | 서버 전용 Redis 쓰기 Secret |
| `PUBLIC_AI_LIMIT_SALT` | 기존32자 이상 HMAC salt Secret; 변경/재생성 금지 |
| `PUBLIC_AI_VERIFIED`, `PUBLIC_AI_ENABLED` | 사전 검사 전 false, 통과 후 true; 기존 배포에는 소급되지 않음 |

두 플래그, VERCEL=1/Production, 키·URL·쓰기토큰·salt가 모두 있어야 공개 경로가 켜진다. NVIDIA 키는 공개 활성 조건이 아니다. 내부 NVIDIA 로컬 시험은 기존처럼 별도 유지된다. Secret은 로컬 env pull로 추출하지 않고 Vercel 서버 build/runtime에서만 사용한다.

Google 공식 REST generateContent를 직접 호출한다. 생성→기존 Zod/문장/근거 검사→독립 의미 검토는 최대2호출, 숨은 재시도·재생성·다른 모델 자동 전환 없음. 지원 JSON Schema·LOW thinking을 지정하고 STOP으로 완료된 구조 전체만 검사한다. 빈/잘림/안전차단/스키마불일치/403/429/네트워크/취소/시간초과 시 부분 후보를 반환하지 않는다. 서버에는 원문 없이 모델 응답 ID(제공 시 모델 version), 시간·토큰·호출 수만 기록한다. 실제 response model이 없으면 null이다. 생성 응답은 사실이 충분한12개 또는 부족안내0개이고, 검토의 true/빈issues·false/구체적issues를 구조화스키마로 함께 강제한다.

## 이번 실행 결과

2026-11-12: 실제 서버사전검사PASS후활성배포했으나공개두번째배치가Google503으로실패했다. 최종공개AI는비활성, 두플래그false와공유stop1, 일반build비활성Production READY다. 키미등록이유가아니다. 이번실호출23/24회, countTokens별도10회. [실행 인계](GEMINI-PUBLIC-AI-HANDOFF.md)의실제/모의/미실행과재개조건을따른다.

## 공유 제한

운영 `{pyeoneo-ai-v1}`의 기존 전체동시2·전체UTC하루100배치, IP동시1·분2·UTC하루12배치를 유지한다. 같은 학교 NAT는 IP 한도를 공유한다. Redis에는 HMAC 주소 식별자·카운터·무작위 lease만 저장한다. 입력/후보/IP 원문 저장 없음.

Google 프로젝트 Free 한도(사용자 계정 확인): 15 RPM / 입력250,000 TPM / 500 RPD. 동시15명을 뜻하지 않는다. 모든 인스턴스·배포·실모델 사전 검사는 생성/검토 직전에 고정 `{pyeoneo-ai-v1}:gemini:calls`에서 최대12회/rolling60초를 원자 예약한다. 분 경계 초기화가 없다. `:gemini:input-bytes`는 같은 rolling window의 요청 UTF-8 바이트(규칙·JSON 스키마·기존문장·근거 포함)를200,000까지 예약한다. 텍스트 토큰의 보수적 바이트 상한을 써서 입력TPM에50,000 이상 여유를 둔다. 따라서 최대 크기 요청은12회보다 적게 허용될 수 있다. 기존32k HTTP/40k 제공사 요청 크기는 축소하지 않았다. 최대 크기 합성 생성/검토의 실제 countTokens 측정은 서버 사전 검사에 포함한다.

`gemini:cooldown`은 제공사429를 모든 인스턴스에 최소60초(제공사 Retry-After가 더 길면 최대하루) 공유한다. 예약은 실패/취소돼도 소비된 것으로 보수적으로 남긴다. 예산 거부는429/Retry-After이며 실제 접수/대기로 표시하지 않는다. 공개 경로는 자동 대기열이 없다. 장애/중지/lease 만료는 fail closed. 사전 검사 CLI만 외부 호출 없이 예산 해제를 기다릴 수 있다.

100배치는 최대200 생성/검토호출이지만 사전 검사·실패·다른 앱 사용량도 프로젝트 한도를 소비한다. Google RPD는 Pacific time 기준 자정, 앱 일일 카운터는UTC여서 동일하지 않다. 12RPM/200k는 이 사이트의 예산이며 같은 Google 프로젝트의 다른 앱 사용량을 알 수 없으므로429 공유 중지와 계정 사용량 확인이 필요하다.

## 사전 검사와 활성화

`node scripts/public-ai-preflight.mjs`를 두 플래그 false인 Vercel Production 일회성 buildCommand에서 실행한다. 프로젝트의 일반 buildCommand는 변경하지 않고 배포별 override를 사용한다. 테스트 namespace만 정리하며 운영 카운터·중지키를 삭제하지 않는다. Redis 기능 시험은 무작위 `{pyeoneo-ai-preflight-UUID}`, 모델 시험의 호출 예산은 운영 고정 namespace다. 생성/검토3사례6회 + review-only 대조1회, 합계7회가 정상 계획이다. countTokens2회는 generateContent와 구분한다. 전체 수정 재검사·공개2배치4회를 포함24회 이내로 센다.

실제 Hobby/Fluid/함수300초 설정·Upstash·모델/품질·시간 사전 검사 통과 후 VERIFIED/ENABLED=true, 일반 buildCommand의 정확한 소스 배포, 실제 공개2배치 및 승인·조합·복사·XLSX 재열기·PDF 포함 저장/복원/재승인·390px를 확인한다. 서버 전체270초, 브라우저290초, 함수 선언300초. 선언만으로 실제 계정 허용시간을 검증했다고 보고하지 않는다.

즉시 중지는 Redis `{pyeoneo-ai-v1}:disabled=1`, 장기 중지는 ENABLED=false 후 비활성 배포/기록한 정상 배포 rollback이다. 중지키는 이미 실행 중인 Google 요청을 취소하지 못한다. 원격 API 오류 본문/키·입력은 응답/로그로 내보내지 않는다. 복구 후 READY·도메인·핵심 기능을 다시 확인한다.

공식 근거: [모델](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite), [REST](https://ai.google.dev/api/generate-content), [구조화 출력](https://ai.google.dev/gemini-api/docs/structured-output), [Thinking](https://ai.google.dev/gemini-api/docs/thinking), [무료 요금](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.5-flash-lite), [데이터/이용 조건](https://ai.google.dev/gemini-api/terms), [Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), [Vercel 한도](https://vercel.com/docs/functions/limitations). 무료 API에서는 Google의 제품 개선 데이터 이용 조건이 적용될 수 있으므로 학생 개인정보 없는 합성/교육 활동·평어 예시만 입력한다. 실제 없는 활동/성취를 만들 수 있다는 뜻이 아니다.
