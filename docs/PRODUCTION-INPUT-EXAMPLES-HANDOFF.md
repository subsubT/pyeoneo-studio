# [WORK HANDOFF] 입력 예시 기능 운영 배포

2026-11-03 (Asia/Seoul). **공개 사이트 반영 완료. Production READY 및 새 공개 브라우저 세션의 기능 검증 PASS.**

사용자가 이번 운영 배포와 필요한 정상 병합·push를 승인했다. 이전 문서의 배포 보류는 이번 요청 범위에서 해제되며, 공개 AI 비활성·개발 브랜치 자동 Preview 차단은 유지한다.

## 소스 및 배포 대상

- 저장소 `subsubT/pyeoneo-studio`, 개발 브랜치 `checkpoint-5-local-ai`.
- 작업 시작 시 원격 HEAD와 로컬 HEAD 일치: `d01db11ce9f2f38c138ed6baed4717f398a6ffd6`.
- 원격 `master`: `2f72e1b369328cb54150484198999628aa84e7ef`. 운영 배포 커밋으로 확정한 값이 아니다.
- 최초 미커밋 변경 없음. 이번 변경은 검증 스크립트·상태/인계 문서뿐이며 앱 동작 코드는 변경하지 않았다.
- 지정 팀 `subsub-tschool` / `team_JKZ7B5OCf27pFKiNlhvSVuE4`, 프로젝트 `pyeoneo-studio` / `prj_osDdLkgyiAomzS03J2GFM0c2bVB4`를 실제 조회한 프로젝트 accountId/id 및 도메인 projectId와 대조했다. 초기 팀 접근 403은 사용자 접근 승인 후 해소됐다.
- 공개 URL: https://pyeoneo-studio.vercel.app/
- Vercel 팀 접근은 사용자 승인으로 복구했다. 실제 프로젝트 ID/accountId, 도메인 projectId·verified=true를 위 식별자와 대조했다.
- 이전 운영: `dpl_CprraCzwjNAMVdMqfddm8DCx4nfD`, READY, 소스 `0a83369d56b663fdd07b2a91641f614ba9ba4546`, source=cli, ref=master. 배포 전 공개 도메인 연결을 실제 조회해 복구 대상으로 기록했다.
- 기존 Git 연결 조회의 linkedProjects는 빈 목록이며 도메인 gitBranch=null이다. 과거 운영의 소스 ref는 master이지만, 특정 브랜치 자동 배포 설정을 추정하지 않았다. 이번 배포는 명시적인 Production target 직접 배포이며 master 병합·push나 프로젝트 Git 설정 변경은 없다.
- **실제 배포 소스 커밋:** `9318df4b601a72084934a2143b7f02d084b940f7`.
- **Production:** `dpl_7Dr8XmmcGiEXMoWZTC7x9qr2y3f4`, **READY**, aliasError=null. 빌드 로그 `Deployment completed`, Vercel 빌드 약 30초.
- 배포 URL: https://pyeoneo-studio-dp0zvcibl-subsub-tschool.vercel.app
- 공개 alias `pyeoneo-studio.vercel.app`가 위 새 배포 ID로 연결됨을 get_alias 및 도메인으로 get_deployment를 재조회해 확인했다. 도메인 배포 metadata githubCommitSha=9318df4와 일치한다.
- 개발 검증 도구 후속 커밋: `e75bff44f0e6abf6b0bb184f7622aac8a934afb3`(공개 브라우저의 환경 프록시 지원). 배포 이후 앱/라이브러리/배포 구성 변경은 없다. 문서 전용 후속 커밋은 이번 보고서와 STATUS 갱신 커밋이며 최종 응답에 정확한 해시를 보고한다.
- 복구: **불필요/미실행**, 공개 핵심 장애 없음. 위 이전 정상 배포를 복구 대상으로 유지.

## 누적 변경 검토

실제 이전 운영 소스 `0a83369`와 실제 배포 소스 `9318df4`를 재대조한 전체 차이는 **50파일, +2078/-42행**이다. 초기 master 기준과의 차이는 과거 검증 문서 2행이며 런타임 차이는 같다. 실제 배포 범위에는 다음이 함께 포함된다.

1. 입력 예시 로컬 생성, 독립 복사·교체 확인·수정 및 항목별 미리보기 초기화.
2. CP6의 2단계 작업, 전체 항목/교과 선택·제외·재선택, 계획 편집·확정, 선택 항목만 문장 작업/집계/조합/XLSX로 전달.
3. 원본 PDF canvas/확대/추출 원문, 출처 연결, PDF worker minified 엔트리 수정, 아이콘.
4. 작업 v2의 원본 PDF·출처·확정·선택·현재 항목·조합 순서 저장, v1 호환, 복원 시 재확인·재승인, 240문장 보존.
5. CP5 로컬 NVIDIA 어댑터·SSE/시간·토큰 계측·독립 의미 검토·입력/호출 제한. production 또는 VERCEL에서는 항상 비활성인 조건을 코드와 회귀 검사로 확인했다. 제공사 호출·환경값 업로드 없음.
6. 검사·운영/인계 문서·Git 제외 설정·개발 브랜치 자동 배포 차단.

`lib/server/*`, API gate, 생성/검토, 계획·복원·파일 처리, 화면 및 구성을 검토했다. DB·스키마·추가 의존성 변경은 없다. `vercel.json`의 `checkpoint-5-local-ai: false` 유지.

## 이번에 실행한 검사

과거 41/41 보고를 재사용하지 않고 현재 코드에서 실행했다.

| 검사 | 결과 |
| --- | --- |
| `npm test` | **PASS 41/41**, 기존 승인·조합·XLSX 재열기·계획·복원·production AI 차단 포함 |
| `npm run build` | **PASS**, Next.js 16.4.3 webpack production build |
| `node scripts/check-secrets.mjs`, `git diff --check` | **PASS** |
| 서로 다른 색/수 비교 항목 로컬 예시·필수 입력 | **PASS**, 빈 입력은 예시 표시만으로 채워지지 않음 |
| 활동만 복사+참고 직접 작성 / 두 예시 그대로 / 복사 후 수정 | **PASS**, 각 최종 화면값=후보 요청값=저장 JSON=복원값 |
| 두 복사 버튼·교체/취소·재생성·항목 전환 | **PASS**, 독립 동작·보존·확인 해제 및 승인 재검토 |
| 교사 확인·승인·선택 순서 조합·XLSX 다운로드/재열기 | **PASS**, 명시적 승인 전 차단 유지 |
| 합성 PDF의 미지원 표 fallback·직접 추가·원본 canvas | **PASS**, 1쪽 PDF 파싱·원문·출처·canvas 표시 |
| CP6 전체/개별 선택·제외·계획 확정·선택 전달 | **PASS**, 3개 중 2개만 문장 화면에 전달, 0개 선택 확정 차단 |
| PDF bytes·4수준 기준·제외 항목 저장/복원 | **PASS**, PDF 바이트 완전 일치, 계획 편집 후 재확정 필요 |
| 합성 참고 XLSX 업로드·원문 선택 | **PASS**, 입력 일치·실제 활동 빈 상태에서 확인 차단 |
| 로컬 production API | **PASS**, GET enabled=false / POST 503 |
| 로컬 브라우저 오류·경고·외부 요청 | **PASS**, 입력 예시 검사 오류 0/경고 0/외부 요청 0, CP6 검사 오류 0/경고 0 |
| 실제 원본 PDF 16항목·XLSX 168예시 재현 | **미실행**, 원본 파일 없음. 합성 검사와 구분 |
| 실모델 생성/의미 품질 | **미실행**, 공개 AI 비활성 유지. 후보 요청은 브라우저 모의 응답 3회로만 검증 |
| 실제 Vercel 운영 ID/커밋/도메인·복구 대상 확인 | **PASS**, 팀 접근 복구 후 실제 ID·소스·alias 대조 |
| 운영 배포·새 Production READY·새 공개 기능 검사 | **PASS**, 아래 공개 검사 참조 |
| 배포 후 런타임 오류 | **PASS**, 새 배포의 배포 시점부터 2026-11-03 14:30 KST까지 error/fatal 로그 조회 결과 없음 |
| 도름스체크 추가 보안 검사 | **실행 완료**, 사용자 추가 승인 후 v0.3.1 detect/scan. 확인 30·미확인 5·해당 없음 1, 차단 수준 실패 0. 아래 후속 결과 참조 |

비식별 예시 출력:

- 색 활동: `주변에서 여러 가지 색을 찾아보고 10색상환을 완성했다.`
- 색 참고: `주변에서 여러 가지 색을 찾아보고 10색상환을 완성함.`
- 수 활동: `구체물을 이용하여 9까지의 두 수의 크기를 비교했다.`
- 수 참고: `구체물을 이용하여 9까지의 두 수의 크기를 비교함.`

근거는 ignored `tmp/release-local-examples/`의 결과·요청·작업 JSON·XLSX·캡처와 `tmp/release-plan/`의 합성 자료·결과·왕복 저장 파일·캡처에 있다. 원본 교육 자료나 검증 산출물을 Git에 넣지 않는다.

## 배포 경로와 공개 사이트 검증

Vercel MCP로 기존 팀/프로젝트에 명시적인 target=production을 사용했다. 첫 Git 소스 배포 `dpl_H58cpa4gJiUvdp81UBcVDwSB4rge`는 빌드 시작 전 `git_info_fail`로 **FAIL**했으며 기존 공개 도메인은 유지됐다. 동일 소스를 Git 연결 없는 기존 운영의 소스 업로드 경로로 전환해 최종 배포에 성공했다. Preview 생성·production 브랜치 병합·force push·보호 규칙 변경은 없었다.

업로드 소스는 작업 폴더 전체가 아니라 `git show 9318df4:<path>`로 추출한 추적 파일 56개다. 파일별 base64 원문을 Vercel create_deployment files로 전달했으며, 소스 manifest SHA256은 `97a4adffb8221acc95c486da4913837d3303b51f19fa35e82817acade558a592`이다. `.env`, 인증 파일, 원본 교육 자료, tmp, node_modules, 로컬 빌드 결과는 포함하지 않았다. PDF worker는 기존 빌드 스크립트가 의존성에서 재생성한다. 로컬 환경값을 운영에 복사하지 않았다.

실제 https://pyeoneo-studio.vercel.app/ 에서 새 Chromium 프로세스·새 컨텍스트로 두 검사 스크립트를 실행했다. 이 환경이 제공한 프록시 CA를 해당 실행의 브라우저 NSS 저장소에 추가하고 환경 HTTPS 프록시를 명시했다. TLS 검증 해제나 배포 보호 우회는 하지 않았다. 초기 브라우저 인증서 오류 및 APIRequest 프록시 미사용 오류는 환경 신뢰/프록시 설정을 적용해 해결했다.

| 실제 공개 사이트 검사 | 결과 |
| --- | --- |
| 서로 다른 색·수 비교 항목에서 예시 표시 및 각각 복사 | **PASS**, 위 비식별 문구와 입력창 전문 일치 |
| 예시만 표시 시 필수 입력·사실 확인 차단 | **PASS**, 표시만으로 입력·확인·후보·승인 자동 실행 없음 |
| 활동만 복사+참고 직접 작성 / 둘 다 그대로 / 복사 후 일부 수정 | **PASS**, 세 경로 최종 입력=후보 요청=저장=복원 |
| 기존 글 교체·취소·독립 복사·재생성·항목 전환 | **PASS**, 기존 글과 반대편 입력 보존, 예시 재생성으로 승인 유지, 항목 전환 시 이전 예시 제거 |
| 교사 확인·승인·조합·XLSX | **PASS**, 실제 공개 UI에서 승인 차단/명시적 승인, 선택 순서 조합, 다운로드 파일 재열기 및 내용 일치 |
| 합성 PDF·원문·canvas·계획 선택/확정·원본 저장/복원 | **PASS**, 3개 항목 중 2개 선택 전달, PDF bytes·4수준 기준·제외 상태 보존 |
| 합성 참고 XLSX 읽기 | **PASS**, 공개 UI 업로드 후 원문 입력 일치 |
| 모바일 390px·화면 시각 확인 | **PASS**, 가로 넘침 없음, 공개 데스크톱 예시·계획 canvas 캡처 확인 |
| 브라우저 오류/경고 | **PASS**, 두 검사 각각 0/0 |
| 공개 AI 비활성 | **PASS**, 실제 API GET `{enabled:false,localOnly:true}`, POST 503. 예시 작업의 후보 POST 0·외부 요청 0 |
| 후보 요청값 검사와 실모델 구분 | **PASS(모의)**, 세 페이지에만 route 모의 응답 사용. 서버 설정이나 실제 NVIDIA 호출 없음. 실모델 품질 검증으로 보고하지 않음 |
| 공개 도메인과 배포 소스 | **PASS**, 새 Production ID 및 githubCommitSha 일치, 도메인 alias 확인 |

공개 근거는 ignored `tmp/release-public-examples/`의 browser-result.json·mock-request-payloads.json·작업 JSON 3종·approved.xlsx·데스크톱/모바일 캡처와 `tmp/release-public-plan/`의 result.json·합성 PDF/XLSX·왕복 작업 JSON·plan.png이다. 로컬 검사 산출물과 별도 디렉터리로 구분했다.

## 남은 사항 및 재현

핵심 기능/배포에 미해결 장애 없음. 과거 원본 PDF/XLSX 재현·실모델 품질 검증은 위 사유로 미실행이며 기존 CP5 품질 동등성 미충족을 유지한다. 도름스체크는 처음 자동 승인 거부로 보류됐으나 사용자가 추가 실행을 명시적으로 승인하여 완료했다. 아래 미확인·권고를 유지하며, 이 결과는 포괄적 보안 보증이 아니다.

검사 재현: `PLAYWRIGHT_MODULE`과 `BROWSER_EXECUTABLE`을 환경에 맞게 지정해 `node scripts/input-examples-browser.mjs`, `node scripts/release-plan-browser.mjs` 실행. `TEST_BASE_URL`과 `TEST_OUTPUT_DIR`로 로컬/공개 근거를 분리한다. 공개 검사에서는 환경 HTTPS_PROXY를 사용하고 환경 CA를 브라우저에 신뢰 등록해야 한다.

## 도름스체크 추가 승인 후 결과 (2026-11-03 15:35 KST)

사용자가 제3자 코드 실행 위험 안내 후 v0.3.1 추가 검사를 명시적으로 승인했다. 기존 설정을 사용해 `npx -y https://github.com/shinnanchanguk/dorms-check/archive/refs/tags/v0.3.1.tar.gz detect`와 `scan --url https://pyeoneo-studio.vercel.app`을 실행했다. npm 캐시는 ignored tmp에 한정했고 전역 설치·훅·배포 차단을 추가하지 않았다.

첫 실행은 공개 응답 연결 시간 초과로 확인 4·미확인 2에 그쳤다. Node의 `NODE_USE_ENV_PROXY=1`로 기존 환경 HTTPS 프록시를 적용해 재실행했으며 TLS 검증을 유지했다. **최종 결과: 공개 화면 최소 점검 완료, 확인 30·미확인 5·해당 없음 1, blockingFails=[], critical/high/medium/low 실패 모두 0.**

- 시크릿/민감자료: 하드코딩 시크릿, 클라이언트 시크릿, 점검한 공개 본문·경로의 비공개 인증정보 미검출. 설정 파일·소스맵·스택트레이스 추가 노출 미검출.
- 확인: 공개 HTTPS 본문, HSTS, X-Frame-Options, nosniff, Referrer/Permissions 정책, mixed content 없음 등. 쿠키 플래그는 응답 쿠키가 없어 해당 없음.
- 미확인 5: HTTP→HTTPS 강제 전환, TLS 세부 버전, 개인정보처리방침, Supabase RLS, Firebase 규칙. DB 두 검사는 도구가 공개 DB 정보를 찾지 못해 미확인으로 기록한 것이며 이 앱은 두 DB를 사용하지 않는다. 실제 DB 권한 검증 결과로 보고하지 않는다.
- 권고: CSP, wildcard CORS, 약관, OG/canonical, 미인증 API 접근, 헤더 설정 위치 및 위험 코드 패턴. `/api/generate` GET은 의도된 공개 연결 상태 응답이며 실제 자료를 제공하지 않는다. POST는 기존처럼 503으로 차단된다. 헤더 설정 위치는 next.config.mjs 감지 정보다.
- 코드 패턴 4건 검토: 모두 의존성에서 복사한 `public/pdf.worker.min.mjs`의 25·28행이다. `new Function` 2건은 PDF.js의 상수 기능 감지 및 PostScript 컴파일 분기다. 실제 PDF 읽기와 원본 미리보기는 모두 `isEvalSupported:false`를 전달하여 문서 기반 eval 컴파일을 비활성화한다. `child_process exec` 2건은 검사기의 일반 `exec(...)` 패턴이 PDF.js 정규식 호출을 잡은 것이다. worker에는 `child_process`/`node:child_process` 문자열이 없다. 이 검토는 라이브러리 전체의 안전성을 보증하지 않는다.

긴급 수정이 필요한 위험 검출 없음. 이번 후속은 **문서만 변경**하며 앱 코드·환경변수·Production 배포·공개 AI 설정은 변경하지 않았다. 기존 Production READY/공개 기능 검증 결과와 복구 대상은 그대로 유지한다. 과거 원본 PDF/XLSX·실모델 미실행 사유도 유지한다.

최종 원본 보고서·scan JSON은 ignored `tmp/release-dorms-final/`, 실행 로그는 `tmp/release-dorms-detect.log`, `tmp/release-dorms-scan.log`, `tmp/release-dorms-scan-proxy.log`에 보존했다. 보고서 원문이나 산출물은 Git에 올리지 않는다.
