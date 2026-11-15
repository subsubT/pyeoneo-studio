# AI 독립 검토 요청 실패 WORK HANDOFF — 2026-11-15 (KST)

상태: **수정·배포 완료 — 실사용 검증 미실행(사용자 진행)**. 플랫폼 배포 성공을 실제 생성/독립 검토 성공·문장 품질 PASS로 기록하지 않는다.

## 시작과 관찰 근거

- 저장소 `subsubT/pyeoneo-studio`, 개발 브랜치 `checkpoint-5-local-ai`. 초기 환경은 `work`/`2f72e1b369328cb54150484198999628aa84e7ef`인 오래된 스냅샷이었으며 미커밋 변경은 없었다. 원격 fetch·ls-remote로 실제 개발 HEAD `88c3f51e5919042ce8dadaa7759aa41db9787d13`를 확인하고 그 커밋에서 작업했다.
- 공개 도메인 get_deployment와 get_project로 확인한 시작 운영/복구 기준: 앱 `9cd81003a3d6b6b6d470c713eeee84b84eb767b9`, 배포 `dpl_H3tKLiWzfwjRw13Z2MCo5v7mt1e6`, Production READY, aliasError=null. URL https://pyeoneo-studio-7yp3mwlu7-subsub-tschool.vercel.app . 운영 앱→시작 개발 HEAD는 인계/상태 Markdown 4파일의 1커밋이며 실행 코드 누적 차이는 없었다.
- 대상 팀 `subsub-tschool` / `team_JKZ7B5OCf27pFKiNlhvSVuE4`, 프로젝트 `pyeoneo-studio` / `prj_osDdLkgyiAomzS03J2GFM0c2bVB4`. get_project의 accountId와 공개 alias가 일치했다. 이 환경에 기존 `.vercel/project.json`은 없으며 인증된 연결 도구에 정확한 팀/프로젝트 ID를 지정한다. CLI 자동 링크나 새 프로젝트를 만들지 않는다.
- Codex가 기존 운영 로그를 직접 읽었다. 2026-11-15 KST 10:56:27 / 10:56:42 / 10:58:13의 요청 `sbxjl-1794707782144-88148f1f6c15`, `sbxjl-1794707797656-9f78928c0c30`, `2tk6h-1794707888310-a55e20cc9241` 모두 생성 STOP 성공 후 검토 PROVIDER_HTTP/status400/OTHER, 앱502였다. 검토 bytes는 18,139 / 18,219 / 18,751로 40,000 이내다. 재현 호출은 하지 않았다.

## 사실·가설·미확정 구분

확정 사실은 검토 단계의 제공사 HTTP400과 오류 전달 손실이다. 종전 GeminiError의 PROVIDER_HTTP/PROVIDER_FORBIDDEN/JSON·스키마 코드 일부가 클라이언트 known 집합에 없어 HTTP_ERROR로 바뀌고 실패 단계도 사라졌다.

유력 가설은 구조화 검토 전송 스키마의 복잡도·제공사 호환성 문제다. 다만 기존 OTHER 로그에는 상세400 인자/필드가 없어 schema complexity 또는 특정 인자를 확정할 수 없다. 생성 성공·요청 크기 상한 이내라는 관찰도 특정 원인을 입증하지 않는다. 수정 후 실제 성공 여부·문장 품질 개선도 사용자 실사용 전에는 미검증이다.

직전 다양성 앱의 부모와 코드를 읽어 구분했다. reviews의 pass별 union, 정확한 배열 길이, issues 길이/개수, index min/max는 원래 있었다. 다양성 앱에서 repetitions 필수 배열(max48), batch/existing scope별 union·peerIndex 경계와 기존 문장 비교 입력/선택 축소가 추가됐다. 이번에 새로 들어온 항목만을400 원인이라고 단정하지 않는다.

## 구현과 계약

- `lib/review-schema.mjs`: 전송 전용 `reviewTransportSchema`/버전 `review-flat-v1`을 명시했다. 최상위 필수 reviews/repetitions, reviews 항목 필수 index:integer/pass:boolean/issues:array<string>, repetitions 항목 필수 index:integer/scope:enum(batch,existing)/peerIndex:integer다. 모든 객체는 추가 필드를 금지한다. 전송 계약에 pass/scope별 union, 배열 length/minItems/maxItems, 수치 min/max, issues 문자열 길이 제약을 넣지 않는다. JSON MIME/구조화 출력/원래 필드명은 유지한다.
- 로컬 Zod는 정확한 reviews 수, 정수·현재 후보 index 범위, pass=true→issues=[], pass=false→공백 아닌 1~10개 이유/각500자 이내, repetitions 최대48을 유지한다. `parseReviewOutput`이 모든 현재 index의 중복·누락과 batch 자기참조 금지·현재 범위, existing의 실제 전송 index 집합 포함 여부를 추가 확인한다. 잘못된/누락된 검토는 배치 전체 기술 실패이며 PASS로 변환하지 않는다.
- `lib/server/gemini.mjs`: 빌더가 전송 `transportSchema`와 로컬 `validationSchema`를 별도 이름으로 반환한다. optional existing을 온전한 문장 단위로 뺀 뒤 최종 집합으로 로컬 검증을 만든다. actual/필수 사실/현재 후보/방향 배분은 자르지 않는다. `lib/server/public-ai.mjs`가 같은 빌더의 최종 객체/bytes를 예약과 실제 provider에 함께 넘겨 재빌드 차이를 없앴다. provider의 내부 onReviewContext 콜백으로 최종 sparse index 집합을 상위 검토 파서에도 전달한다. 배열 길이로 재번호를 가정하지 않는다.
- `lib/prompt.mjs`: 전송에서 뺀 검토 개수/필수 필드/정수/사유 길이/48쌍/기존 원래 번호 규칙을 지시문에도 적었다. 생성 지시·후보별 방향 계획·전체 로컬 반복 분석은 보존했다.
- `lib/generation-result.mjs`, `lib/generation.mjs`, `lib/server/public-ai.mjs`, `app/page.jsx`: 안전한 코드와 generation/review 두 단계(아직 단계가 없는 사전 차단은 null)를 명시적으로 정규화한다. 400 PROVIDER_REQUEST_REJECTED,403 PROVIDER_FORBIDDEN,429 PROVIDER_RATE_LIMIT,503 PROVIDER_UNAVAILABLE, TIMEOUT, RESPONSE_JSON_ERROR, RESPONSE_SCHEMA_ERROR, COUNT_MISMATCH, DISTRIBUTION_MISMATCH, REVIEW_INCOMPLETE 등을 구분한다. HTTP400/403 제공사 실패의 앱502,429/503/504/499/413 상태 매핑과 Retry-After 전달은 유지한다. 생성 수·분포의 로컬 예외도 고정 코드로 바꾼다.
- 검토 실패 안내는 “문장 생성 후 AI 독립 검토 요청을 처리하지 못했습니다.”와 확정 유형의 고정 안내, “이번 후보는 추가되지 않았고 기존 작업은 보존됐습니다.” 및 고정 stage/code다. 서버/upstream error 원문·스택을 UI에서 사용하지 않는다. 400을 사용자 입력 부족·혼잡·시간초과로 바꾸지 않는다. 정상 pass=false+유효 issues는 기술 실패가 아니며 후보를 편집 목록에 남겨 교사가 수정·확인·승인한다.
- 400 진단은 boundedGeminiJson의 본문을 메모리에서만 분석한다. schema 맥락과 구체적 states/constraints/complexity/nesting/branching 비용 표현이 함께 있을 때만 SCHEMA_COMPLEXITY 후보 범주를 쓴다. schema 언급·large 단어 하나로 강제하지 않는다. google.rpc.BadRequest의 fieldViolations와 고정 Google status 허용 집합을 읽어 SCHEMA_ARGUMENT/TOKEN_ARGUMENT/INVALID_ARGUMENT/OTHER/UNSPECIFIED를 구분한다. 이는 제한적 분류기이며 상세 원인 증명은 아니다.
- 로그는 고정 stage/code/category/provider status, upstream HTTP status, 호출 번호/재시도 여부/시간/요청 bytes와 전송 schema 버전/구조 통계만 남긴다. 필드 경로는 코드에 선언된 config/schema 키와 앱 필드의 허용 조합만 사용하고 임의 문자열/숫자 index를 버린다. 원래 임의 modelVersion/finishReason 문자열 및 토큰 metadata의 로깅은 제거했다. payload 빌드 실패·로컬 검토·응답 파싱 실패도 최종 고정 failure(stage/code/status)에 남는다. 본문·키·프롬프트·입력/후보 문장·개인정보 저장, 새 DB/모니터링은 없다.

## 보존과 제한

actual만 사실 근거, 모든 독립 핵심/순서/조건/수량/확인된 수준, 직접 동사·자연스러운 ~ㅁ/음., 길이1~1.5배·금지어를 유지한다. 표현 반복은 semanticPass/errors와 분리하며 완전동일 오류·편집·전체 확인1개·원자 일괄 승인·승인 전용 조합/복사/XLSX·복원 후 재승인을 보존한다. 실패 배치는 후보 추가 전에 거부되고 기존 입력/후보/승인/작업파일을 바꾸지 않는다.

합계1~24/기본12·사용자 단계별 개수(24개 및21/1/1/1 포함)·보관120, actual trim1자/example선택, 요청40,000bytes·응답256KiB·출력2,400~6,000토큰 기존 범위, 무료 Gemini3.5 Flash-Lite/thinking LOW·Vercel Hobby·Upstash Free, 키/플래그/salt/공유 namespace·한도·중지키·PDF50MB/작업200MB를 유지한다. 정상 생성1+검토1, 요청 전체503만 추가1회/최대3호출이며400 자동 재시도·보충·교정·재생성·모델/엔드포인트/SDK 변경·새 큐/인증·요금제 전환·기존 저장 문장 일괄 수정은 없다.

## 실행과 배포

사용자 지시로 별도 자동/단위/통합/회귀/정적/lint/typecheck/비밀값/도름스/브라우저/API/실모델 시험·별도 검증용 빌드를 실행하지 않았고 새 테스트/재현/검증 스크립트도 작성하지 않았다. 실제 모델 추가 호출0회다. 코드/기존 로그 읽기, Git/원격 식별과 배포 digest/manifest 생성·metadata 수신만 수행하며 이를 기능/품질 PASS로 보고하지 않는다. 플랫폼 필수 빌드와 강제 처리는 수행한다. CI/hook/보호/TLS를 끄지 않고 master 병합·새 Preview/자동 CI 활성화도 하지 않는다.

### 최종 배포와 Git 기록

| 항목 | Codex가 직접 확인한 결과 |
| --- | --- |
| 브랜치 | `checkpoint-5-local-ai` |
| 시작 개발 SHA | `88c3f51e5919042ce8dadaa7759aa41db9787d13` |
| 시작 운영/복구 앱 SHA | `9cd81003a3d6b6b6d470c713eeee84b84eb767b9` |
| 기능 커밋 / 실제 배포 앱 SHA | `df68af8aeccce1d2c5fc20c801e3d4a13d80d2aa` |
| 최종 인계 SHA | 이 문서와 AGENTS/STATUS/PRODUCTION-OPERATIONS만 갱신하는 후속 커밋. 정상 push 후 원격에서 받은 전체 SHA를 최종 응답에 기재한다. 자체 SHA를 본문에 넣기 위한 재커밋/앱 재배포는 하지 않는다. |
| 배포 ID / 환경 | `dpl_9iVW6o1n9cvMf9oe6MBM9vgXgDkJ` / `production` |
| 상태 | `READY`, `aliasError=null` |
| 실제 배포 URL | https://pyeoneo-studio-ccw7g4sox-subsub-tschool.vercel.app |
| 공개 URL | https://pyeoneo-studio.vercel.app |
| 팀 / 프로젝트 | `team_JKZ7B5OCf27pFKiNlhvSVuE4` / `prj_osDdLkgyiAomzS03J2GFM0c2bVB4` |

기능 커밋을 정상 push한 뒤 git ls-remote로 원격 HEAD가 `df68af8aeccce1d2c5fc20c801e3d4a13d80d2aa`와 같음을 확인했다. 원격 Git의 그 커밋에서 실행/빌드 소스37개만 SHA1/size manifest로 구성해 기존 업로드 경로로 배포했다. 변경7개 업로드와30개 content-addressed 파일 재사용이며 운영 문서·테스트·교육자료·환경/인증 파일을 배포 소스에 섞지 않았다. 요청은1회, forceNew=1이며 플랫폼 로그에 캐시 생략이 명시됐다. Git 제외 manifest의 SHA256은 `e72d7a4822debbfe0fdab9c78220f24fff50c4a6090a2d3af2752ba1498d00b9`다. 로컬 release payload는 `tmp/review-request-release/`에만 있다.

필수 플랫폼 빌드는 Vercel CLI65.14.0 / Next16.4.3 / Node24.x에서 일반 `npm run build`(`node scripts/copy-worker.mjs && next build --webpack`)로 완료됐다. Build Completed34초, compile11.9초, 플랫폼 내부 TypeScript 및 정적 페이지4/4, traces/출력 배포/캐시 업로드가 완료됐다. 기존 npm cache-dir 및 간접 의존성의 deprecated 경고가 있었고 빌드 실패는 없었다. 로컬 검증용 빌드·typecheck·audit를 별도로 실행한 결과가 아니다.

배포 ID와 공개 도메인 각각의 get_deployment(withGitRepoInfo=true), get_alias, get_project_domain, get_project metadata를 직접 받았다. 앱 SHA·ref, Production READY·aliasError=null, project ID와 team accountId, 두 alias가 일치했다. 공개 도메인은 verified=true/gitBranch=null이고 alias.deploymentId는 새 배포 ID다. 이것은 배포 상태/연결 확인이며 브라우저/API/모델 기능 검증이 아니다.

배포 차단/실패·자동 승인 거절·복구 실행은 없었다. 직전 복구 기준은 배포 직전에 재조회한 `dpl_H3tKLiWzfwjRw13Z2MCo5v7mt1e6` / `9cd81003a3d6b6b6d470c713eeee84b84eb767b9`다. 시작 운영 자체에 검토400 장애가 관찰됐으므로 이를 AI 검토 정상/품질 PASS 복구 대상으로 표현하지 않는다. rollback 가능 여부·기능은 새로 시험하지 않았다.

이번 변경 파일은 실행7개(`app/page.jsx`, `lib/review-schema.mjs`, `lib/server/gemini.mjs`, `lib/generation.mjs`, `lib/prompt.mjs`, `lib/server/public-ai.mjs`, `lib/generation-result.mjs`)와 문서4개(`AGENTS.md`, `docs/STATUS.md`, `docs/PRODUCTION-OPERATIONS.md`, 이 문서)다. 사용자 입력/후보/승인/작업파일·키/플래그/공유 한도/중지키는 편집하지 않았다. master 병합·새 Preview/자동 CI 활성화·보호 해제는 없다.

미검증으로 남은 것은 사용자 실사용에서 생성→독립 검토의 실제 성공 여부, 최종 후보 수/분포·문장 품질/편집·교사 확인/승인·출력·복원의 실제 동작, 사용자 화면의 고정 오류 안내와 후속 런타임 진단이다. 새 유료 서비스나 추가 모델 호출 없이 요청 범위의 구현·배포·인계를 마쳤고 후속 기능에 착수하지 않는다.

## Work 인계

이 문서와 AGENTS/STATUS/PRODUCTION-OPERATIONS의 최신 부분을 Work가 기존 Google Drive 기준 문서에 확정 사실과 미검증 사항을 구별해 반영한다. Codex가 Drive 저장/readback을 완료한 것으로 보고하지 않는다. 이번 원인 분석·오류 수정·배포·인계에서 중단한다. 남은 실사용 확인은 사용자 진행이다.
