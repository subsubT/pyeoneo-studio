# [WORK HANDOFF] 두 번째 묶음 — 평가계획 PDF 끌어놓기

2026-11-10 (Asia/Seoul). **PASS — 공개 사이트 반영 완료.** 구현·검증·push·운영 배포·공개 URL 검증을 Codex가 이번 실행에서 직접 수행했다.

## 변경 파일과 처리 경로

- `app/components/plan-review.jsx`: PDF 카드 전체의 dragenter/leave/over/drop, 중첩 진입 카운터, 강조/처리 중 표시, 두 입력 방법 안내, 키보드/터치 파일 선택 유지. 이벤트 영역은 PDF 카드에 한정한다. drop 안에서 File 목록을 동기적으로 확보하며 dragover/drop 기본 파일 열기를 막는다.
- 파일 선택과 드롭은 `acceptFiles → onUpload(File) → Home.uploadPdf(File)`로 합류한다. input 이벤트를 가장하지 않는다. 선택 직후 input 값을 초기화하여 취소·같은 파일 재선택을 지원하고, 선택/드롭 후 드래그 강조도 해제한다.
- 한 번에 여러 파일이면 **“PDF는 한 번에 한 개씩 넣어 주세요.”**를 표시하고 한 개도 반영하지 않는다. 빈 입력은 무시한다. MIME이 빈 정상 PDF는 기존 바이트 검증으로 처리한다.
- `app/page.jsx`: 공통 처리 함수가 File을 받는다. 기존 `run`에 동기적인 ref 잠금을 추가하여 React의 busy 렌더 전 같은 틱의 두 입력도 한 번만 실행한다. 처리 중 선택 입력/추가 드롭은 무시하고 기존 상태를 덮어쓰지 않는다.
- 기존 **`readPdf → encodePdf → serializeProject 사전 검사 → source/items 상태 반영`** 순서를 재사용한다. 파일/추출/작업 용량 검증이 성공한 후 같은 React 배치에서 원본과 항목을 추가한다. 실패 시 source/items/선택/계획 확정/후보/승인 변경 없음. 성공 시 기존 항목에 추가하고 계획 재확정이 필요하다.
- `app/style.css`: `.pdf-upload`의 드래그 강조/처리 중 스타일만 추가.
- `scripts/pdf-drop-browser.mjs`: 실제 DataTransfer/File 및 PDF.js로 검증하는 새 브라우저 회귀. 추출/API/후보 응답을 모의 처리하지 않는다.
- `scripts/create-drop-fixtures.py`: 지원 평가표 2항목·미지원 표·문자 없는 이미지형·31쪽·손상·비PDF 시험 자료 생성. 생성 자료와 글꼴은 ignored `tmp/`에만 둔다.
- `docs/PRODUCTION-OPERATIONS.md`: 새 회귀의 준비/실행 방법 추가. 후속 문서는 이 인계와 `docs/STATUS.md`.
- **기존 파서·파일 형식·제품 의존성·lockfile·복원 로직·원칙 카드·사실 확인·후보별 최종 승인·공개 AI 차단 변경 없음.** 새로운 외부 호출·환경변수·서비스·DB·유료 계약 없음.

## 소스와 실제 Production

| 항목 | 직접 확인한 값 |
| --- | --- |
| 저장소 / 개발 브랜치 | `subsubT/pyeoneo-studio` / `checkpoint-5-local-ai` |
| 시작 로컬/원격 HEAD | `bfb77109db95da56283bc6d2a5dedc935aafa5f2`, 미커밋 변경 없음 |
| 개발 기능·실제 배포 SHA | **`e623a3f68e78c6bd82835d42081d5767dcfb4c47`**; 정상 push 후 원격 일치 |
| 문서 SHA | 이 인계와 STATUS의 후속 문서 전용 커밋. 정확한 SHA는 최종 채팅 `[WORK HANDOFF]` 및 `git log -1 --format=%H -- docs/PDF-DROP-HANDOFF.md`로 확인. 앱 재배포 생략 |
| 팀 | `subsub-tschool` / `team_JKZ7B5OCf27pFKiNlhvSVuE4` |
| 프로젝트 | `pyeoneo-studio` / `prj_osDdLkgyiAomzS03J2GFM0c2bVB4`; accountId 일치 |
| Production ID | **`dpl_FHDbtW8WEXpM5V5zTyuFC6kW1ESa`** |
| 환경 / 상태 | **Production / READY**, `aliasError=null` |
| 공개 URL | https://pyeoneo-studio.vercel.app/ |
| 배포 URL | https://pyeoneo-studio-eyhuox8vn-subsub-tschool.vercel.app |
| 소스·도메인 대조 | 공개 도메인 get_deployment의 ID/SHA 일치, get_alias의 projectId/deploymentId 일치. 도메인 verified=true |
| 실제 업로드 대조 | 배포 `src`의 **61/61 파일 내용 SHA-1**이 정확한 원격 커밋의 업로드 바이트와 일치 |
| manifest SHA-256 | `ca250798794a084f560cc93d716a218a4b3ebfd9b7529c2bd126c939394c8697` |
| 원격 빌드 | Next.js 16.4.3, Node 24.x, Build Completed 약 21초, Deployment completed. 기존 npm `cache-dir` 설정 경고 2회; 빌드 성공 |

누적 차이도 검토했다. 직전 실제 운영 `b8244a8` → 시작 개발 `bfb7710`은 이전 카드 인계/STATUS 두 문서뿐이며 실행 코드 차이가 없었다. 운영 → 이번 배포 전체는 **8파일 +288/-8**: 위 기능/검사/운영 절차 6파일과 이전 인계 문서 2파일이다. 다른 미배포 기능은 섞이지 않았다.

기존 운영 절차대로 정확한 원격 Git 소스 61파일을 기존 프로젝트에 `create_deployment(files, target=production)`로 업로드했다. 개발 자동 Preview 차단 유지. master 병합·자동 CI·프로젝트 설정 변경·로컬 환경 파일 업로드 없음. 실제 Git 연결 조회의 linkedProjects/originConnections는 빈 목록이었다.

## 검사별 환경과 결과

환경: Node 24.19.0, Chromium 154, Playwright 1.56.1. 로컬 production 서버 `127.0.0.1:3010`, 최종 작은 보완 후 새 production 서버 `127.0.0.1:3011`. 공개 검사는 새 브라우저 컨텍스트로 공개 URL에서 실행했다. 환경 HTTPS 프록시·CA 신뢰와 TLS 검증을 유지했고 기존 Chrome NSS 저장소의 정상 쓰기 권한을 사용했다.

| 검사 | 로컬 / 공개 직접 결과 |
| --- | --- |
| `npm test` | **41/41 PASS**. 최종 앱 수정 후 재실행. 모의 의미 검토·운영 AI 강제 차단·승인/복원 단위 검사 포함 |
| `node scripts/check-secrets.mjs` | PASS. 배포 대상 61파일, 교육 자료/환경 파일 및 알려진 비밀값 패턴 미검출 |
| `npm run build` | PASS. 최종 앱 보완 후 재빌드 |
| 공백·구문 | `git diff --check`, 새 Node 검사 스크립트 구문 및 Python generator compile PASS |
| 동일한 지원 평가표 선택/드롭 | **양쪽 PASS**. 2개 평가 항목·4수준 기준·전체 원문·쪽수·원본 바이트·출처 연결·원본 canvas 크기 동일. 무작위 ID는 정규화하여 비교. 선택/드롭 미리보기 스크린샷 직접 대조. 빈 실제 활동·사실 확인 미체크 유지 |
| 한 번의 드롭 / 같은 파일 재선택 | **양쪽 PASS**. 드롭 한 번에 원본 1개/항목 2개, 같은 파일 선택 재시도는 원본 1개/항목 2개를 추가 |
| 오류 입력 | **양쪽 PASS**. 비PDF·손상 PDF·10MB 초과·31쪽·여러 파일·빈 드롭·빈 파일 선택 전후 저장 작업 전체 동일. 원본/항목/선택/확정/후보/승인 포함 |
| 오류 후 재시도 / MIME 공백 | **양쪽 PASS**. 기존 승인 작업에 정상 PDF(MIME 빈 값)를 드롭하면 한 번 추가, 이전 세 항목·승인·제외 항목 유지, 계획 확정 해제 |
| 작업 사전 검증 | **양쪽 PASS**. 기존 원본 10개 한도 및 기존 작업 약 40MB + 새 PDF로 40MB 초과 시 전체 이전 작업 동일. 새 원본만 남거나 항목만 생기지 않음 |
| 처리 중 / 같은 틱 입력 | **양쪽 PASS**. 실제 File 읽기만 지연해 처리 상태 관찰. 추가 드롭/선택 무시, 중복 없음. 지연 없는 같은 틱 두 drop도 원본 1개/항목 2개만 추가 |
| 드래그 상태·기본 동작 | **양쪽 PASS**. 카드와 내부 요소 진입/이탈 중 강조 유지, 전체 이탈·드롭·선택 후 해제. dragover/drop defaultPrevented=true, 현재 URL 유지. 카드 밖 dragover는 취소하지 않음 |
| 지원 표 없는/문자 없는 유효 PDF | **양쪽 PASS**. 원본/추출 원문 저장, 수동 항목 추가·스캔/OCR 안내 유지. 문자 없는 PDF 원문은 빈 값으로 보존 |
| 전체 업무 흐름 | **양쪽 PASS**. 기존 작업에 PDF 추가 → 원본 대조 → 단원 편집·선택·재확정 → 활동/예시 → 직접 후보·최종 승인 → 순서 조합·클립보드 복사 → XLSX 다운로드/재열기 → 두 PDF 포함 작업 저장/복원. 미승인·제외 항목은 최종 출력에 없음 |
| 기존 승인 규칙 | **양쪽 PASS**. PDF 추가만으로 기존 승인 문장 소실 없음. 실제 활동 수정 시 승인은 후보로 이동. 복원 후 기존 문장은 후보로 보존하고 사실 확인·재승인 필요 |
| 접근/반응형 | **양쪽 PASS**. 키보드 focus+Space 파일 선택, 터치 에뮬레이션 tap 파일 선택, 390px 안내/오류/처리 상태 및 가로 넘침 없음. 데스크톱 강조·오류와 모바일 오류/처리 화면 직접 시각 확인 |
| 기존 브라우저 회귀 | `input-examples-browser.mjs`, `release-plan-browser.mjs` 로컬/공개 PASS. 예시 복사·수정·승인·조합·XLSX·복원, 계획 확정·출처·제외 항목 보존 |
| 원칙 카드 회귀 | 로컬/공개 PASS. 문구·제목/본문 순서 보존, 320~1440px 9개 너비, 650px 이하 기존 카드 숨김 유지 |
| 실제 `/api/generate` | **양쪽 PASS**, 모의 응답 없이 GET `enabled=false`, POST **503**. 화면 연결 대기·사실 확인·직접 작성 경로 유지 |
| 콘솔 | 새 드롭 회귀의 pageerror/console.error **0**. 손상 PDF의 예상 `Warning: Indexing all PDF objects` 1건씩은 별도 기록. 기존 회귀와 카드 검사 오류/경고 0 |
| 런타임 로그 | 새 Production ID, 최근 30분, error/fatal 필터 조회: 해당 로그 없음. 장기 관찰로 확대 해석하지 않음 |
| 도름스체크 v0.3.1 | detect/공개 scan 재실행: 확인 30·미확인 5·해당 없음 1, fail 상태 항목 0. 전역 설치·훅·배포 차단 추가 없음 |

처음 브라우저 시험 자료를 Chrome 인쇄로 만들었을 때 한글 제목이 글자별 토큰으로 나뉘어 지원 표로 추출되지 않았다. **제품 파서는 바꾸지 않고**, 한국어 글꼴이 포함된 ReportLab 시험 PDF로 지원 표를 만들었다. 초기 검사에서 미리보기 PNG 바이트의 일치는 렌더링 차이 때문에 고정 검증으로 사용하지 않았고, 실제 PDF 바이트·원문·출처·canvas 크기 비교 및 스크린샷 직접 대조로 검증했다.

## 직접 수행·계측·모의 구분 및 재현

- 새 드롭 회귀는 Playwright가 **실제 DataTransfer/File을 담은 drag/drop DOM 이벤트**를 발생시킨 자동 브라우저 검사다. PDF 파싱·작업 저장·승인·XLSX는 실제 코드이며 API/추출 응답 모의 없음. 실제 외부 OS 파일 관리자에서 사람 손으로 끌어놓은 것으로 표현하지 않는다.
- 처리 중 상태 관찰에만 File.arrayBuffer를 일시 대기시켰다. 실제 바이트와 실제 PDF.js 추출을 계속 사용했다. 지연 없는 같은 틱 중복 입력도 별도로 확인했다.
- 기존 입력 예시 회귀는 후보 POST 3회에 한해서 브라우저 모의 응답을 사용했다. 실모델 시험이 아니며 실제 서버 차단은 별도 요청으로 확인했다. **이번 실모델 호출 0**.
- 합성 자료 생성에는 기존 환경의 Python ReportLab과 Noto Sans KR TrueType 글꼴을 시험용으로만 사용했다. 제품 의존성을 추가하지 않았다. 이번 글꼴 SHA-256: `194018e6b2b293a7964f037b25c0249ce1418bc9ab3c971060a03aa57861e252`. 생성 자료/글꼴/작업 JSON은 Git 제외이며 배포 소스에 없다.

실행 디렉터리 `/workspace/pyeoneo-studio`. 공통 `PLAYWRIGHT_MODULE=/workspace/pyeoneo-studio/tmp/tools/node_modules/playwright/index.mjs`, `BROWSER_EXECUTABLE=/usr/bin/chromium`. 명령은 [운영 절차](PRODUCTION-OPERATIONS.md)의 PDF 회귀 절을 따른다. 이번 fixture는 `python3 scripts/create-drop-fixtures.py tmp/pdf-drop-fixtures/NotoSansKR.ttf tmp/pdf-drop-fixtures`로 생성했다. 글꼴 원본은 Google Fonts `ofl/notosanskr/NotoSansKR[wght].ttf`이며 배포 대상이 아니다.

근거(모두 ignored):

- `tmp/pdf-drop-local-final/result.json`, `tmp/pdf-drop-public/result.json`: 최종 새 회귀 결과, 선택/드롭 및 오류 전후 작업·원본·XLSX·스크린샷. 최초 로컬 실행은 `tmp/pdf-drop-local/`.
- `tmp/drop-regression-local-examples/`, `tmp/drop-regression-public-examples/`: 기존 예시/승인/내보내기 결과, 모의 요청은 별도 파일.
- `tmp/drop-regression-local-plan/`, `tmp/drop-regression-public-plan/`, `tmp/drop-before-public-plan/`: 기존 계획/원본/복원 및 배포 직전 정상 공개 기능 결과.
- `tmp/drop-regression-local-card/`, `tmp/drop-regression-public-card/`: 원칙 카드 회귀.
- `tmp/drop-error-visual.mjs`, 두 PDF 회귀 디렉터리의 `multiple-error-1440.png`/`multiple-error-390.png`: 로컬/공개의 실제 오류 표시 추가 시각 검사.
- `tmp/drop-release-production/`: 소스 manifest·배포 payload·직전 정상/새 배포/alias/내용 hash/빌드/런타임 증거.
- `tmp/drop-dorms-detect.log`, `tmp/drop-dorms-public.log/json/md`: 이번 최소 보안 검사.

## 복구·미실행·미해결·다음 단계

배포 직전 복구 대상으로 기록한 정상 Production은 **`dpl_BeUEGz9VvaGzEk9gYaz56RzRRWik`**, 소스 **`b8244a89147bf886d9ea05a864ec36600412a778`**, URL https://pyeoneo-studio-myf1hbjvn-subsub-tschool.vercel.app 이다. alias는 `pyeoneo-studio.vercel.app`, `pyeoneo-studio-subsub-tschool.vercel.app`. 실제 READY·도메인·소스를 재조회했고 기존 공개 계획 브라우저도 배포 전에 PASS였다.

- **복구 불필요/미실행**. 공개 핵심 장애 없음. 복구 후 검증은 N/A(복구하지 않음).
- 실제 교육 원본: 미실행. 이번에는 지원 평가표를 갖춘 비식별 합성 PDF를 사용했다. 다양한 실제 학교 서식 전체의 추출 품질을 보증하지 않는다.
- 실제 모바일 기기/OS 파일 관리자 드래그/OS 취소 버튼 직접 조작: 미실행. Chromium 터치/키보드 파일 chooser와 빈 파일 선택/빈 드롭으로 데이터 경로를 검증했다.
- 보안 미확인 5개는 PASS 아님: HTTP→HTTPS·TLS 세부 버전·개인정보처리방침·Supabase/Firebase 접근 규칙. 두 DB는 사용하지 않는다. 기존 CSP/CORS/약관/OG/canonical/API 접근/PDF worker 패턴 권고 유지. worker·eval 비활성 설정 변경 없음. 최소 검사는 전체 안전 보증이 아니다.
- 핵심 미해결 없음. 새 프로젝트 비용·계약·DB·보호 규칙 변경 없음.
- 사실 확인 제거와 공개 AI 활성화는 다음 사용자 지시의 한 묶음이며 이번에는 미착수. 이전 실모델 품질 동등성 미충족 기록도 변경 없음.
- 이 인계와 최종 채팅은 Codex의 직접 실행 보고다. Work의 Drive 보관·프로젝트 지식 갱신/readback·직접 재실행은 수행하지 않았으며 담당 후속 단계로 구분한다.
- **인계 후 중단한다.**
