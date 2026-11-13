# PDF·작업 파일 용량 상향 — WORK HANDOFF

2026-11-13 KST / Codex 직접 실행. **판정: PASS — 공개 사이트 반영 완료.**

## 소스·배포·복구 대상

| 항목 | 결과 |
| --- | --- |
| 저장소 / 개발 브랜치 | `subsubT/pyeoneo-studio` / `checkpoint-5-local-ai` |
| 시작 개발 HEAD | `8667a580376b92c363fc8095e52ce57c7587cad7` (사용자 Work 사전 열람 기준과 일치) |
| 개발 기능 커밋 / 실제 배포 소스 | `de3a4639c6f11c70a4ff4d4aa5782f2f0d322dbc` |
| 인계·검사 스크립트 보강 커밋 | 이 문서를 추가한 커밋. 최종 답변에 정확한 SHA를 기록하며 `git log -1 --format=%H -- docs/FILE-LIMITS-HANDOFF.md`로 조회 가능 |
| Vercel Team | `subsub-tschool` / `team_JKZ7B5OCf27pFKiNlhvSVuE4`, Hobby |
| Project | `pyeoneo-studio` / `prj_osDdLkgyiAomzS03J2GFM0c2bVB4`, Node 24.x / Next.js |
| 새 배포 ID / 환경 / 상태 | `dpl_FJ34MLsPywuM1RcCrBzKhArXp8Yz` / Production / READY / `aliasError=null` |
| 공개 도메인 | https://pyeoneo-studio.vercel.app/ — verified, projectId 일치, 새 ID·소스 SHA 대조 |
| 배포 URL | https://pyeoneo-studio-7t2hfbs6i-subsub-tschool.vercel.app |
| 운영 빌드 | 일반 `npm run build`, Vercel build 완료 28초 / BUILDING→READY 약 35초 |
| 소스 내용 확인 | 새 배포 `src/`의 103/103 파일 SHA1이 정확한 원격 커밋 바이트와 일치 |
| 사전 정상 복구 대상 | `dpl_4gpupMTbqmwQWkGc4v3Pt6gNG1Yg`, 앱 `a3a20a4862ba7af3a48ea325760de401587fb1b1`, Production READY, 기존 alias 2개, 97/97 소스 해시 일치 |
| 복구 실행 | 미실행 / 불필요. 새 앱의 핵심 운영 장애 없음 |

시작 환경의 `work`/`master`는 오래된 `2f72e1b`였으므로 최신 개발 브랜치를 명시적으로 fetch·전환했다. 운영 a3a20a4→시작 8667a58의 누적 차이는 문서와 생성 중 대상 전환 방지 검사 보강뿐이며 제품 실행 코드는 같았다. 운영→de3a463의 전체 19파일 diff를 검토했다. master 병합·자동 배포 CI·개발 Preview 활성화는 하지 않았다.

처음 inline 파일 전체 배포 호출은 결과 없이 중단됐고, 다시 조회해 새 배포가 생성되지 않았음을 확인했다. 동일 커밋에서 변경된 19파일을 인증된 `upload_file`로 SHA1·크기를 지정해 올리고, 기존 파일을 포함한 103파일의 `sha`/`size` 참조로 `create_deployment(target=production)`를 요청해 위 배포 하나를 생성했다. payload·manifest는 `tmp/release-production/`. 서버 Secret pull·플래그·salt·공유 namespace·카운터·중지키 변경은 없었다.

## 구현과 공통 기준

- `lib/file-limits.mjs`: PDF_LIMIT = **52,428,800 bytes**, WORK_FILE_LIMIT = **209,715,200 bytes**, 표시 **50MB·200MB**. 정확히 같은 크기는 허용한다. `lib/plan.mjs`의 기존 WORK_FILE_LIMIT import는 re-export로 호환한다.
- 작업 판정은 최종 JSON **전체 UTF-8 bytes**다. Base64·한글·메타데이터를 포함하고 문자열 length/PDF 원본 합계로 판단하지 않는다. `utf8ByteLength`는 작은 encodeInto 버퍼로 계산하며 경계의 surrogate pair도 보존한다.
- PDF Base64 상한은 **69,905,068자**. 문자 집합·4자 단위·종료 패딩·패딩 비트와 디코딩 후 길이를 검사한다. 같은 길이의 Base64라도 원본 50MB+1 byte이면 거절한다. 작은 헤더만 디코딩해 PDF 버전을 검사하며, 출처 ID 중복·누락·쪽수 연속성 및 항목 쪽수 관계를 저장/복원에서 확인한다. 추출·미리보기는 계속 실제 PDF.js를 사용한다.
- `lib/files.mjs`: File은 한 번 읽고 worker에 buffer가 전달·분리되기 **전에** 원본 Base64를 만든다. 추출용 page와 loading task는 성공/오류 모두 정리한다. `pdf-preview.jsx`는 렌더 실패 때도 작업을 정리한다.
- `lib/restore.mjs`: 직렬화 뒤 검사용 JSON.parse를 제거했다. 객체 검증 후 한 번 직렬화하고 전체 bytes를 확인한다. 검증 때문에 대형 PDF를 전부 디코딩하지 않는다.
- `app/page.jsx`: 파일 크기 사전 검사, 용량 오류와 형식 오류 구분, 입력 즉시 초기화/실패 후 재선택, 동기 busyRef 잠금을 유지한다. PDF 추가와 작업 병합은 **계획 확정·활성 항목·조합 선택을 포함한 최종 저장 형태**를 검증한 뒤 모든 상태를 반영한다. 실패 전에는 항목·원본·문장·승인·선택·전체 확인·계획을 바꾸지 않는다. PDF를 빼거나 문장을 잘라서 맞추지 않는다.
- 화면 안내는 `plan-review.jsx`와 sidebar가 공통 표시값을 사용한다. README·CHECKPOINT-6·운영 절차의 현재 안내를 갱신했고 과거 인계의 당시 수치는 유지했다.
- 30쪽·PDF 원본 10개·항목 100개·예시 2,000개·XLSX 5MB, v1/v2·제외 항목·승인문장 후보 전환/확인 해제/재승인·조합/출력 규칙은 유지했다. 공개 Gemini/무료 플랜/AI 활성/공유 한도/독립 검토는 변경하지 않았다. 서버 업로드·DB·OCR·형식 개편·모델 변경 없음.

변경 제품 파일: `lib/file-limits.mjs`, `lib/files.mjs`, `lib/plan.mjs`, `lib/restore.mjs`, `app/page.jsx`, `app/components/plan-review.jsx`, `app/components/pdf-preview.jsx`. 검사 추가는 `tests/file-limits.test.mjs`, 대형 자료 생성기 2개, `file-limits-browser.mjs`, 기존 드롭 회귀 조정이다. 인계 시 `input-examples-browser.mjs`의 AI 버튼 상태 단정 한 줄을 현재 공개 활성 플래그에 맞게 보강했다. 마지막 보강은 검사 스크립트/문서뿐이므로 앱 제품 소스는 배포 커밋과 같고 추가 앱 재배포는 생략한다.

## 경계와 실제 대형 파일 — 직접 실행 PASS

환경: managed Linux / Node **24.19.0** / Chromium **154.0.8037.57** / Playwright, PC 1440px와 390px viewport·기존 touch/keyboard 검사. 로컬 production 빌드는 `http://127.0.0.1:3006`, 공개 검사는 위 공개 도메인의 새 browser/context에서 수행했다. 390px은 데스크톱 Chromium viewport/touch 모의이며 실제 휴대기기 시험이라고 보고하지 않는다.

다음 시간은 단일 API/추출 시간 대신 표에 적은 **전체 자동 흐름**의 벽시계 시간이다. 일부 로컬 검사는 자료 생성·다른 회귀와 동시에 실행돼 공개 시간과 성능 비교용으로 쓸 수 없다.

| 직접 실행 항목 | 실제 bytes | 로컬 전체 흐름(초) | 공개 전체 흐름(초) | 판정 |
| --- | --- | ---: | ---: | --- |
| 17MB PDF 선택 → 추출/미리보기/저장/복원 | 17,825,792 | 50.08 | 25.33 | PASS |
| 17MB PDF 드롭 → 같은 전체 흐름 | 17,825,792 | 58.11 | 12.38 | PASS |
| 정확히 50MB PDF 선택 → 같은 전체 흐름 | 52,428,800 | 58.18 | 28.2 | PASS |
| 390px에서 50MB PDF 드롭 → 같은 전체 흐름 | 52,428,800 | 39.96 | 28.04 | PASS |
| 50MB-1 byte PDF 선택 → 같은 전체 흐름 | 52,428,799 | 29.94 | 22.58 | PASS |
| 200MB-1 byte 작업 열기/저장/재열기/재저장 | 209,715,199 | 53.01 | 34.47 | PASS |
| 390px에서 정확히 200MB 작업의 같은 전체 흐름 | 209,715,200 | 54.35 | 45.44 | PASS |
| v1 재승인 / 잘못된 Base64·헤더·쪽수·출처 거절 | 기본 합성 PDF/작업 | 4.19 | 2.63 | PASS |
| 실제 초과 파일 선택·드롭을 읽기 전 차단 | PDF 52,428,801 / JSON 209,715,201 | 1.59 | 1.54 | PASS |
| PDF 추가/작업 병합/파싱·내장 PDF 오류 후 전체 상태 보존 | 기존 작업 208,679,410 | 73.58 | 88.01 | PASS |

50MB 원본은 Base64 69,905,068자로 저장·복원됐다. 200MB 경계 작업은 각각 원본 PDF **50MB+50MB+49MB = 156,237,824 bytes**와 한글 메타데이터·예시 94개·제외 항목을 포함한다. 작업 JSON 실제 크기는 위와 같고 문자열 길이는 각각 208,786,109 / 208,786,110 / 208,786,111자로, 200MB+1 byte 파일도 문자열 length 자체는 한도 미만이다. -1/동일 파일은 실제 저장·열기·재저장이 통과하고 +1은 File.text 전 차단됐다.

합산 검사는 208,679,410-byte 기존 작업(승인 1·후보 1·전체 확인 체크·조합 선택·계획 확정 포함)에 **17,825,792-byte PDF**를 추가하거나 **23,769,414-byte 작업 JSON**을 병합했다. 입력 각각은 자기 한도 이하이고 원본 PDF 합계도 174,063,616 bytes로 200MB 미만이지만 최종 JSON이 200MB를 넘으므로 차단됐다. 실패 전후 전체 저장 파일 SHA256이 같았고 UI 승인·후보·전체 확인도 보존됐다. 잘못된 JSON과 내장 PDF 50MB 초과를 두 번 같은 파일로 재선택해도 busy 해제·재시도·기존 상태 보존을 확인했다.

합성 PDF는 ReportLab 지원 평가표에 pypdf가 **참조된 EmbeddedFile 스트림**을 넣어 목표 크기로 작성했다. strict pypdf 읽기·쪽수·첨부 stream 길이를 확인했다. 후행 공백이나 파일 size 모의를 실제 대형 처리 PASS로 쓰지 않았다. 작업의 큰 부분은 실제 PDF Base64이며 나머지는 허용 범위의 한글 예시 메타데이터다. 자료·폰트·PDF·JSON·XLSX·다운로드·스크린샷은 모두 Git 제외 `tmp/`. 원래 학생/교육 자료는 사용·추적하지 않았다.

## 자동 검사·관련 회귀

| 검사 | 이번 직접 실행 결과 |
| --- | --- |
| `npm test` | **86/86 PASS** (기존 82 + 새 4). 경계 모의는 단위 검사이며 실제 대형 처리와 구분 |
| 새 단위 검사 | bytes 경계·기존 import·읽기 전 차단·한글/보조평면/고립 surrogate UTF-8·동일 Base64 길이의 50MB+1·패딩/헤더/출처/쪽수 거절 |
| 비밀값 / 공백 | `node scripts/check-secrets.mjs`, `git diff --check` PASS. 검출 패턴 범위의 검사이며 전체 보안 보증 아님 |
| production build | 로컬 및 Vercel 일반 build PASS; PDF worker 재생성 |
| `npm audit --omit=dev` | 알려진 취약점 0건 |
| 기존 `pdf-drop-browser.mjs` | 로컬/공개 PASS: 선택·실제 DataTransfer·30쪽 초과·손상/비PDF·다중/빈 입력·오류 후 재시도·busy/중복·11번째 원본 거절·선택/확정·승인 보존·조합/복사/XLSX 재열기·PDF 포함 복원·키보드/터치/390px |
| 기존 계획/예시 브라우저 | 로컬/공개 PASS: 편집/선택/확정/원본/복원·독립 복사/수정/교체/취소·후보/승인·출력 |
| 생성 피드백 모의 | 로컬/공개 각각 29 POST 모의, 1/12/24 후보·오류·취소·대상 변경 방지·PC/390px PASS. 실모델 품질 시험 아님 |
| 예시 모의 | 로컬/공개 각각 후보 POST 3개 모의, 외부 생성 0 |
| 공개 실제 API 상태 | GET enabled=true/mode=public, Origin 없는 잘못된 POST403, 공개 Origin의 잘못된 POST400. 유효 생성 POST/실모델 호출 **0회** |
| 콘솔/런타임 | 대형 공개 pageerror 0 / console error 0; 기존 손상 PDF의 예상 indexing 경고 1건은 별도. 새 배포 error/fatal 로그 조회 해당 없음 |
| 도름스체크 v0.3.1 | 기존 config로 detect·배포 전후 scan 직접 실행, 확인30·미확인5·해당없음1, fail 상태 항목0. TLS 세부/HTTP 리다이렉트/정책/DB 권한 미확인과 기존 권고는 미확인/권고로 유지 |

이번 진행 중 수정한 검사 환경/가정: (1) 최초 로컬 마지막 화면 이동이 계획을 재확정해 확인 체크를 지우는 검사 코드였다. stage 이동으로 고치고 합산 검사 전체를 다시 실행해 PASS. 최초 실패를 숨기지 않고 `result-initial.json`에 보존했다. (2) 공개 최초 브라우저는 cloud proxy CA/NSS 접근이 없어 ERR_CERT_AUTHORITY_INVALID로 입력 전 중단됐다. 환경이 제공한 CA를 정상 NSS 신뢰에 등록하고 해당 저장소 접근 권한을 적용해 재실행했다. TLS 검증·배포 보호는 해제하지 않았다. (3) 공개 예시 회귀의 과거 AI 비활성 단정 한 줄을 현재 활성 상태에 맞춰 고친 뒤 로컬/공개 재실행 PASS. 모두 검사 환경/가정 수정이며 제품 결함으로 인한 rollback은 없었다.

## 메모리·시간 관찰의 한계와 미실행

CDP Runtime.getHeapUsage를 시험 시점에 읽었다. 전체 관찰 usedSize 범위 **5,759,280~1,052,726,596 bytes**, 공개 관찰 범위 **53,872,580~1,052,726,596 bytes**. 원시 usedSize/totalSize/embedderHeap/backingStorage 값은 보고서에 있다. GC 시점·실행 병렬성의 영향을 받으며 전 프로세스 RSS/실제 peak·누수 부재를 증명하지 않는다. 대형 파일 처리의 모든 기기 안전성을 보장하지 않는다.

실제 사용자 원본·실제 휴대기기/iOS/Safari/Firefox·전체 프로세스 peak 측정은 이번에 실행하지 않았다. 요청한 유효 합성 자료·PC/390px 검증과 구분한다. 실모델 재호출/품질 검증·새 DB/서비스·다음 기능은 범위 밖이며 실행하지 않았다. 기존 준비 의존성을 사용했고 `npm ci` 재설치는 하지 않았으며 패키지/lock 변경 없이 자동 검사·빌드·audit를 수행했다. 필수 파일 처리 검증에서 남은 FAIL/BLOCKED는 없다.

## 근거·Work 전달

- `tmp/file-limits-local/consolidated-result.json`: 최초 부분 성공+검사 가정 수정 후 합산 PASS+390px/v1 보강의 직접 관찰을 결합. 최초 전체 실행이 PASS였다고 기록하지 않는다.
- `tmp/file-limits-mobile-local/result.json`, `tmp/file-limits-public/result.json`: 실제 크기·전체 흐름 시간·브라우저·콘솔·CDP 관찰. 공개 전체 10개 case PASS.
- `tmp/file-limit-fixtures/pdf-manifest.json`, `work-manifest.json`, 생성기 로그: 실제 자료 크기/구조.
- `tmp/regression-*/`, `tmp/regression-public-*/`: 계획·드롭·예시·생성 모의·XLSX/저장/복원·화면 근거.
- `tmp/automated-tests.log`, `file-limit-production-build.log`, `npm-audit.json`, `dorms-*.log`, ignored `.dorms-check/`: 검사 원본.
- `tmp/rollback-record.json`, `rollback-source-manifest.json`, `release-production/source-manifest.json`, `source-verification.json`, `reference-request.json`: 복구·정확한 배포 소스 근거. payload/산출물을 Git에 추가하지 않는다.

위 결과는 **Codex 직접 실행**이다. Work의 8667a58 사전 열람 및 이전 인계의 성공 수치를 이번 검증 근거로 대신 쓰지 않았다. Work의 Drive `Codex_인계자료` 원본 보관과 같은 프로젝트 지식 파일 갱신·readback은 **Work 후속/이번 Codex 미실행**이다. 인계 원본은 이 공개 저장소 문서와 최종 답변으로 전달한다. 다음 기능에는 착수하지 않았다.
