# [WORK HANDOFF] 공개 AI 후속 — 사전 검사와 운영 설정

2026-11-11 KST. **공개 AI 활성화 진행 중 / 서버 키·소유 Redis·계정 운영 권한 입력 대기.** 아래는 이번 직접 수행 결과이며 이전 실모델 시험을 재실행한 것으로 보고하지 않는다.

## 시작과 승인 범위

- 개발 브랜치 `checkpoint-5-local-ai`, 시작 로컬/원격 HEAD `fa3dadd42e18a303192938eed36203277643b6cf`, 작업 트리 깨끗함.
- 시작 운영 소스 `f39d0e16539c5b1495b573c3e9310fdb47f2d3eb`, Production `dpl_2GokWbQsbdS12Dji6NUXqxDBYgV5`, READY/aliasError=null. 공개 https://pyeoneo-studio.vercel.app/ 및 배포 https://pyeoneo-studio-ijyjbmpov-subsub-tschool.vercel.app.
- 팀 `team_JKZ7B5OCf27pFKiNlhvSVuE4`, 프로젝트 `prj_osDdLkgyiAomzS03J2GFM0c2bVB4`. get_project의 accountId 일치. 운영→시작 개발 차이는 인계/STATUS 4문서뿐, 실행 코드 동일. 새 아이콘·기존 기능·개발 자동 Preview 차단 유지.
- 공개 활성화/설정/검증/배포 및 사용자 소유 Upstash Free 월 $0 생성·연결은 승인됨. 유료 변경만 별도 결정 대상. 사전 검증과 활성 배포 뒤 공개 완료 검증을 구분하도록 AGENTS/운영/설정 문서의 순환 조건을 수정함.

## 실제 설정 조회와 반영

- 시작 Vercel Production envs=[]/hiddenProductionEnvCount=0, 팀 Upstash integration configuration=[], Cloud secret bindings=[], CLI 인증/키 변수 없음. get_project/get_team 응답에 플랜/Fluid/함수 제한 정보는 없음.
- Production에 새로 생성: `PUBLIC_AI_LIMIT_SALT` 32바이트 암호학적 난수(64 hex), Sensitive; `PUBLIC_AI_ENABLED=false`, `PUBLIC_AI_VERIFIED=false`. 다른 변수값 수정 없음. 비밀값을 채팅/로그/Git에 출력하지 않음. salt는 재배포해도 재사용하며 회전/운영 카운터 초기화 금지.
- `PUBLIC_NVIDIA_API_KEY`, `PUBLIC_AI_REDIS_URL`, `PUBLIC_AI_REDIS_TOKEN`은 아직 미등록. 사용자에게 정확한 Vercel 화면/Production/Secret 범위와 소유 Upstash Free DB 생성·REST 쓰기 토큰 등록을 한 번에 요청함. 채팅에 비밀값을 요청하지 않음.
- 현재 연결 도구는 Vercel 환경 설정과 기존 integration 조회를 지원하지만 Upstash 계정 로그인·DB 생성 기능은 제공하지 않음. Cloud desktop 제어 도구도 노출되지 않았고 CLI 인증이 없음. 미소유 임시 DB를 만들지 않음. `upstash/redis` 플랜 조회는 상품 ID 미확인으로 404였으므로 이 결과로 Free 비용을 확인했다고 주장하지 않음. 소유 계정 생성 화면에서 실제 월 $0 확인이 필요.
- NVIDIA 무인증 공식 `/v1/models` HTTP 200, 모델 84개 중 **deepseek-ai/deepseek-v4.1-flash** 존재 직접 확인. 이는 공개 카탈로그 근거이며 보유 키의 접근/운영 계약 근거가 아님. 보유 키의 실제 모델 접근과 운영 Subscription 확인은 대기 중. 무료 Trial 약관의 production 제한을 키 보유만으로 충족했다고 처리하지 않음.

## 변경과 시험 경로

- `lib/server/public-limits.mjs`: 기본 운영 namespace `{pyeoneo-ai-v1}` 유지. 서버 CLI만 지정할 수 있는 UUID 기반 `{pyeoneo-ai-preflight-…}`를 허용하여 실제 서비스 시험이 운영 카운터와 충돌하지 않도록 함. HTTP 핸들러/환경변수에는 namespace override를 추가하지 않음.
- `scripts/public-ai-preflight.mjs`: Production 비밀값을 사용하는 일회성 서버 CLI. Vercel 배포별 buildCommand `node scripts/public-ai-preflight.mjs && npm run build`로 실행 가능. 공개 API/Origin/환경 검사를 제거하지 않으며 영구 디버그 API 없음. 두 플래그가 false일 때만 실행.
- 실제 Redis PING/EVAL, 동시 20개→2개 허용, 사용자 동시1/분2/일12·전체일100, recreated-client 보존, 공유 stop, release/TTL 및 단축된 시험 lease 만료·재획득을 검사. 무작위 시험 namespace의 키만 정리. 실제 Redis 장애는 아직 미실행, 네트워크 실패 차단은 모의로 구분.
- 모델 단계는 기존 색/낱말/수 비교 3고정 사례에서 생성+독립 검토 최대2회/배치, 후보12/통과후보 존재/270초 이내를 검사. 별도 review-only 음성 대조 5개+양성1개는 최대1회. 자동 재시도/모델 교체 없음. 입력/후보 원문 없이 개수·단계별 시간·토큰만 로그 출력. 비용 정보가 없으면 null로 기록.
- `scripts/public-ai-browser.mjs`: 실제 공개 POST 2회 후 후보별 검토·선택 승인→동일 교과 조합/복사→XLSX 재열기→저장/복원/재승인 흐름. 실제 호출만 허용하고 모의 route interception 없음. 아직 공개 활성화 미완료이므로 미실행.
- `scripts/check-ai-state.mjs` 및 기존 예시/PDF 회귀: TEST_PUBLIC_AI_ENABLED=true이면 활성 GET public, Origin 없는 POST403, 잘못된 입력 POST400을 확인. 정상 모델 요청은 보내지 않는다. false 기본값은 기존 disabled/503 검증 유지.

## 이번 직접 검증

- `npm test`: **53/53 PASS**. 기존 51개 및 운영 namespace 보존/독립 namespace 검사·활성 플래그 상태에서 CLI 사전 검사 차단 포함. 실제 공급자 호출 0.
- `npm run build`: PASS. `node scripts/check-secrets.mjs`, `git diff --check`: PASS.
- 실제 로컬 Redis 7.4.2 + HTTP bridge에서 새 사전 검사 실행: 동시/분·일 한도/중지/lease TTL·만료/운영 namespace 보존 PASS. **Upstash 실제 연결 시험이 아니며**, 운영 데이터/카운터를 사용하지 않음. 근거 `tmp/activation-redis-preflight-local.json`.
- 로컬 production `127.0.0.1:3012`: 입력 예시·계획·PDF 드롭 기존 브라우저 3종 PASS. 입력/후보/최종 승인/조합/복사/XLSX 재열기/저장복원/오류 보존/390px 유지. 후보 POST 3회 모의와 PDF 실제 추출을 구분. 오류0, 손상 PDF 예상 경고1.
- 근거: `tmp/activation-unit-tests.log`, `tmp/activation-build.log`, `tmp/activation-local-*`. 키 없는 CLI 실행은 `MISSING_SERVER_SETTING`으로 종료하여 외부 전송하지 않음을 확인.

## 사전 검증 이후 순서

1. 사용자 키/Redis 등록·실제 소유 Free/운영 이용권한 및 Vercel 플랜/Fluid/300초 허용 확인.
2. 두 플래그 false인 상태에서 검증 커밋으로 일회성 서버 buildCommand 사전 검사. 성공 근거를 기록하고 일반 buildCommand로 되돌린다. 사전 검사 없는 일반 활성 배포로 건너뛰지 않는다.
3. VERIFIED=true → ENABLED=true → 정확한 소스 Production 배포 → READY·소스·도메인 대조.
4. TEST_PUBLIC_AI_ENABLED=true로 실제 공개 생성 스크립트 및 기존 핵심 회귀. 실제 후보 수/통과가능 수/품질·시간·호출/토큰·비용 근거 기록. 공개 전체 흐름 통과 후에만 ‘공개 AI 활성화 및 공개 사이트 검증 완료’.
5. 실패 시 Redis `{pyeoneo-ai-v1}:disabled=1`로 신규/다음 호출 차단, ENABLED=false 후 재배포 또는 위 정상 ID로 복구. 진행 중 공급자 호출은 중지키만으로 취소되지 않을 수 있음. 데이터/카운터를 삭제하지 않는다.

설정 안내만으로 목표 완료를 판정하지 않는다. 사용자 입력이 등록되면 이미 승인된 실제 사전 검사·활성 배포·공개 검증을 같은 작업에서 이어간다. 아직 실모델 후보/토큰/비용/품질 측정과 실제 Upstash 검증은 0회/미실행이며 과거 CP5 품질 동등성 미충족은 그대로다.

## 이번 배포와 최종 관찰

- **부분 완료/BLOCKED**: 사전 검사 코드와 비활성 상태의 공개 회귀 배포 완료. 공개 AI 활성화/실모델 검증은 미완료. 키·소유 계정 설정과 운영 이용권한을 요청한 상태이며, 없는 자격정보를 추정하거나 모의 응답으로 대체하지 않았다.
- 개발/실제 배포 커밋 `3365053bf018e20335c7fa986a7e5236007c9723`, 정상 push 후 원격 일치. Production **`dpl_9kqs9GWfLah2oysSEbLYBCWPfutt`**, https://pyeoneo-studio-bd181pr9j-subsub-tschool.vercel.app. READY/aliasError=null, 공개 도메인 연결 및 소스 일치. 업로드 **78/78 소스 파일 SHA-1 일치**, manifest SHA-256 `7f98b39af7c726dd0e89ea07b19d4e8aa7913626012e301a00b1765e5648f4b3`. 기존 정상 소스/아이콘 유지. 일회성 실모델 buildCommand는 필요한 설정/권한이 없어 아직 실행하지 않았고 일반 build만 실행했다.
- 새 공개 배포에서 입력 예시·계획·PDF 드롭 브라우저 3종 PASS. 직접 후보/교사 최종 승인/조합/복사/XLSX 재열기/저장복원/미승인 제외/오류·중복 보존/모바일을 확인. 활성 플래그는 false, 실제 API GET enabled=false/mode=disabled/localOnly=false, POST503. 공개 모델 호출0, 모의 후보 요청3. 이번 검사를 실제 생성 성공으로 보고하지 않는다.
- 최신 로고 `/icon.svg?v=quote-bowl-1`, icon.svg/favicon.ico/apple-touch-icon.png의 공개 HTTP200·로컬 SHA-256 일치, 390px 넘침 없음 PASS. 근거 `tmp/activation-icons.json`, `tmp/activation-icons-mobile.png`.
- 공개 회귀 콘솔/pageerror 0. 손상 PDF 예상 경고1. 새 Production 최근30분 error/fatal 조회 해당 로그 없음. 최소 보안 검사 v0.3.1 공개 scan 확인30/미확인5/해당없음1 유지; HTTP→HTTPS/TLS 세부·정책·DB 권한 미확인을 PASS로 변경하지 않는다. 새 검사기의 코드 패턴 권고는 CLI의 로컬 테스트용 child_process와 기존 PDF worker 패턴이며 공개 입력의 shell 실행 경로를 추가하지 않았다. 근거 `tmp/activation-dorms.log`, ignored `.dorms-check/`.
- 최종 환경 metadata 재조회: `PUBLIC_AI_LIMIT_SALT`, `PUBLIC_AI_ENABLED`, `PUBLIC_AI_VERIFIED`만 Production에 존재. NVIDIA 키/Redis URL·쓰기토큰 미등록. 계정의 실제 Free 적용, NVIDIA Subscription, Vercel Fluid/실행시간 정보는 사용자 입력 대기. CLI 인증이나 브라우저 제어가 없는 상태에서 소유 계정 로그인을 대신하거나 임시 DB를 만들지 않았다.
- 새로 필요한 사용자 입력은 이미 한 번에 요청함: Vercel Production `PUBLIC_NVIDIA_API_KEY`(Secret), `PUBLIC_AI_REDIS_URL`, `PUBLIC_AI_REDIS_TOKEN`(Secret), NVIDIA 운영 Subscription/계약 근거, Vercel Functions 플랜/Fluid/300초 설정. salt·두 플래그 재등록/Cloud 중복 키 등록은 요구하지 않는다. Free 생성 비용이 실제 계정에서 월 $0인지 확인 후 진행한다.
- 복구 실행 없음. 신규 공급자 호출도 없으므로 긴급 중지키 사용 없음. 이후 활성화 직전에는 이 비활성 READY 배포를 다시 조회해 복구 대상으로 기록할 수 있다. 문서 후속 변경만으로 앱 재배포는 생략한다. 후속 문서 SHA는 최종 채팅 및 `git log -1 --format=%H -- docs/PUBLIC-AI-ACTIVATION-HANDOFF.md`로 확인.
- Work의 Drive 보관·프로젝트 지식 readback은 이번 Codex 실행에서 수행하지 않음. 설정 입력이 오면 사전 검증→활성 배포→공개 실제 모델 전체 흐름을 이어가며, 현재 BLOCKED 판정은 유지한다.
