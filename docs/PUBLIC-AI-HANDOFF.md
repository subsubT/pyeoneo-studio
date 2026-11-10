# [WORK HANDOFF] 마지막 묶음 — 입력 확인 제거 / 공개 AI 준비

2026-11-10 KST. **부분 완료 — 공개 AI 활성화 BLOCKED.** 별도 활동 확인 체크 제거는 구현·로컬 검증 완료. 공개 배포 후 결과는 이 문서의 후속 기록과 최종 채팅에 구분한다. 실모델/공개 AI 성공을 주장하지 않는다.

## 변경과 보존

- `activity-inputs.jsx`, `page.jsx`, `activity.mjs`: 활동 확인 체크·종전 승인 해제 설명 제거, 8~4,000자 활동/5~2,000자 예시 입력 안내. 입력 충족 시 직접 후보와 활성 상태의 AI 요청 가능. 숨은 확인/confirmed=true 주입 없음.
- `generation.mjs`, `core.mjs`, `plan.mjs`, `restore.mjs`: legacy confirmed true/false/누락 수락·무시. 공급자에는 confirmed를 전달하지 않는다. 입력 길이/수준/형식 검사 유지. v1/v2 문장 복원은 모두 후보로 남기며 후보별 최종 승인이 필요하다. 활동·예시·계획 수정 시 승인 문장을 후보로 보존한다.
- 평가계획 확정, 최종 검토 체크·승인, 승인 문장만 조합·XLSX 출력하는 규칙 유지. 계획/평가 수준으로 실제 활동 자동 채움 없음. 입력 예시는 사용자가 복사한 때에만 적용.
- UI의 AI 출처/버튼/복원 안내를 정리했다. 활성 상태 버튼 `AI 후보 12개 생성`. 비활성 안내는 실제 상태를 표시한다. 변경 revision으로 활동/예시/수준 변경 후 늦은 응답을 폐기한다. 기존 동기 busy 잠금으로 같은 틱 중복 요청 차단.
- `public-ai.mjs`, `public-limits.mjs`, route: 로컬/공개 경로 분리. 기존 NVIDIA 어댑터·모델 `deepseek-ai/deepseek-v4.1-flash`·생성/독립 검토 재사용. 서버 설정 없는 공개 요청은 GET disabled/POST 503. 준비된 REST Redis 경로는 실제 서비스 신규 가입/결제를 하지 않았다.
- Origin/Host, JSON 유형/32,000바이트, 기존 스키마, 본문 읽기 10초, 후보 12개/256KiB 응답 상한. 공개 생성/검토 270초, 호출당 180초 이하, 브라우저 290초, 함수 300초 선언. 서버 키/원문을 로그에 기록하지 않는다. 로컬 시험의 기존 장시간 예산은 별도 유지.
- 상세 설정명·IP 기준 한도·UTC 집계/TTL·동시 실행·즉시 중지·재배포 비활성화는 [AI 운영](AI-OPERATIONS.md)의 현재 구현 절 참조. 새로운 제품 의존성/lockfile 변경 없음. 모델 교체·자동 유료 대체·무제한 재시도 없음.
- 자동/브라우저 검사 스크립트는 기존 확인 체크 기대를 체크 부재·최종 승인 유지 기대로 변경했다. 실패 검사를 삭제하지 않았다. 새 검사: `public-ai.test.mjs`, `generation-browser.mjs`, `public-limits-redis.mjs`.

## 확인된 운영 차단 사유와 필요한 조치

1. Vercel `filter_project_envs(decrypt=false)` 결과 envs=[], hiddenProductionEnvCount=0. 프로젝트 connector 연결도 빈 목록. Cloud 환경의 secret bindings=[], 로컬 `.env.local` 없음. 기존 운영용 키/공유 한도 저장소가 이 작업에 연결되어 있지 않다. 기존 승인 경로가 있다면 해당 설정과 계약 근거를 제공해야 한다. 비밀값은 채팅 대신 서버 환경 설정에 등록한다.
2. 공식 NVIDIA API Trial Terms PDF를 이번에 내려받아 1.2·1.4 확인: trial API/Generated Content production 사용 금지, production은 별도 Subscription 조건. 계정별 운영 계약·사용 가능한 모델은 확인하지 못했다. 키 유무나 공개 AI 개발 승인을 NVIDIA 계약 권한으로 간주하지 않았다. 공식 근거: https://assets.ngc.nvidia.com/products/api-catalog/legal/NVIDIA%20API%20Trial%20Terms%20of%20Service.pdf
3. 실제 운영 Redis/공급자 예산 제어·데이터 보관 조건·현재 플랜/Fluid 함수 제한은 추가 확인 필요. get_project/get_team 응답은 식별·Node 24.x를 제공하지만 플랜/Fluid/함수 한도를 제공하지 않았다. maxDuration=300 선언은 계정의 실제 허용 실행 시간을 측정한 근거가 아니다. 새로운 계약/비용 또는 모델 교체가 필요하면 해당 선택만 사용자 결정이 필요하다.
4. 계약·설정이 갖춰진 후 비식별 색/낱말/수 비교 실모델 시험(12개, 생성+독립 검토, 오류/의미/시간/토큰/비용), 운영 Redis 장애·다중 인스턴스·공개 브라우저 end-to-end 검증을 수행해야 한다. `PUBLIC_AI_VERIFIED`는 그 근거를 기록한 뒤에만 설정한다. 새 실모델 호출 **0**, 후보/승인 가능 수/토큰/비용/품질 측정 **미실행**. 과거 CP5 품질 동등성 미충족 판정 유지.

## 소스와 복구 대상

- 저장소 `subsubT/pyeoneo-studio`, 개발 `checkpoint-5-local-ai`.
- 시작 원격 HEAD `f9d76ff41efe26bf2b7a1aea5696c5d0113d5cac`. Cloud 초기 `work`는 과거 master 스냅샷이므로 최신 원격 개발 브랜치로 fast-forward한 뒤 작업했다.
- 시작 운영/배포 전 복구 대상: `dpl_FHDbtW8WEXpM5V5zTyuFC6kW1ESa`, 소스 `e623a3f68e78c6bd82835d42081d5767dcfb4c47`, Production READY, aliasError=null.
- 복구 URL https://pyeoneo-studio-eyhuox8vn-subsub-tschool.vercel.app / 공개 alias https://pyeoneo-studio.vercel.app 및 pyeoneo-studio-subsub-tschool.vercel.app.
- 프로젝트 `prj_osDdLkgyiAomzS03J2GFM0c2bVB4`, 팀 `team_JKZ7B5OCf27pFKiNlhvSVuE4`; get_project accountId 및 get_project_domain projectId/verified=true 일치 확인.
- 운영 소스→시작 개발 HEAD 차이는 PDF 인계/STATUS 두 문서뿐. 그 누적 문서 변경과 이번 전체 실행 코드 차이를 검토했다. 개발 자동 Preview 차단 유지. master 변경/강제 push 없음.
- 정확한 개발/배포/후속 문서 SHA와 새 Production ID는 아래 후속 결과 및 최종 채팅에 기록한다. 문서 자체의 최종 SHA는 `git log -1 --format=%H -- docs/PUBLIC-AI-HANDOFF.md`로도 확인 가능.

## 이번 직접 검사

환경 Node 24, Next.js 16.4.3, Playwright 1.56.1, /usr/bin/chromium. 합성 PDF/XLSX만 사용. 산출물/작업 파일/약관 PDF/테스트용 Redis 소스는 ignored tmp에 보관.

| 검사 | 결과와 범위 |
| --- | --- |
| 시작 기준 검사 | 기존 41/41 PASS |
| 최종 `npm test` | 51/51 PASS: legacy 6조합, 활성/미설정/비활성 공개 핸들러, Origin/Host/주소/JSON/크기/입력 오류, 두 호출 예산, 불완전 검토/공급자 장애/전체 timeout, 한도 장애 시 다음 호출 중지, 느린 본문 취소 포함. 외부 공급자는 모의 |
| `npm run build` | 최종 앱 수정 후 production build PASS |
| 비밀값 검사/공백 | `scripts/check-secrets.mjs`, `git diff --check` PASS. 운영 키가 없는 환경이므로 실제 운영 키 문자열 대조 검사는 미실행. 기존 checkpoint5-secrets는 해당 .env 및 fingerprint가 없어 N/A |
| 실제 로컬 Redis 7.4.2 | Lua 원자 실행으로 독립 클라이언트 20개 동시 요청에서 2개 허용, 주소당 동시1/분2/일12·전체일100, AOF 재시작 후 카운터·lease 보존, 공유 중지키·저장소 장애 차단 PASS. REST 전송은 로컬 Redis CLI bridge이므로 실제 Upstash REST/운영 인프라 검증은 아님 |
| 입력 예시 브라우저 | 예시 생성/복사/교체·취소/수정/항목 전환, 원문 보존, 직접 후보/최종 승인/조합/XLSX 재열기/복원 PASS. 후보 POST 3회만 모의, 실제 API disabled/503 별도 확인 |
| 계획 브라우저 | 합성 PDF 원문/원본 바이트/canvas·수준 편집·선택/제외·확정·v2 저장복원 PASS |
| PDF 드롭 브라우저 | 실제 DataTransfer+PDF.js. 파일 선택/드롭 동일성, 잘못된/다중/빈/초과 입력 전후 전체 작업 보존, 같은 틱/처리 중 중복 차단, 예시→직접 후보→최종 승인→조합/클립보드→XLSX 재열기→PDF 포함 저장복원 PASS. 예상 손상 PDF 경고 1건, JS/console error 0 |
| 생성 브라우저 | v1/v2 × confirmed true/false/누락에서 체크 부재·모의 12후보·자동 승인 없음. 429/504/502/연결실패 시 후보 보존. 활동/예시/수준 변경 후 응답 폐기 및 중복 요청 차단 PASS. 총 모의 POST 13회, 실모델 0 |
| 모바일 | 390px 넘침 없음, 생성 모바일 스크린샷 직접 시각 검토. 원칙 카드 내용/스타일 코드 변경 없음; 별도 9너비 기존 비추적 스크립트는 이번 환경에 없어 미실행 |

근거: `tmp/final-tests.log`, `tmp/final-build.log`, `tmp/confirmation-examples`, `tmp/confirmation-plan`, `tmp/confirmation-pdf`, `tmp/generation-browser`, `tmp/redis-integration/result.json`. Redis는 시스템 패키지 목록에서 찾지 못해 공식 download.redis.io의 7.4.2 소스를 tmp에서 빌드해 전용 loopback 프로세스로 시험 후 종료했다. 제품·운영 의존성에 포함하지 않는다.

공개 AI가 막혔다는 이유로 미검증 활성 상태를 배포하지 않는다. 가능한 입력 흐름 개선 배포와 공개 회귀는 별도로 기록한다. Work의 Drive 보관/프로젝트 지식 readback은 담당 Work 후속이며 Codex가 수행했다고 보고하지 않는다. 인계 후 중단한다.
