# 예시·AI 후보 입력 차단 해제 WORK HANDOFF

**판정: PASS — 공개 사이트 반영 완료.**

2026-11-13 (Asia/Seoul), Codex 직접 실행. 이 문서는 입력 구체성·최소 8/5자·참고 예시 필수·단계 충돌 시 생성 거절이라는 과거 규칙을 대체한다. 사실 보존, 독립 검토와 교사의 최종 승인은 유지한다.

## 개발 구현 및 배포 전 검증

- 시작 개발 HEAD `c4b7345b6b251e56b0bbef7f4bb597882555e1dc`, 개발 브랜치 `checkpoint-5-local-ai`. 오래된 초기 `work`/master는 사용하지 않고 원격 개발 브랜치를 명시적으로 fetch했다.
- 시작 운영 앱 `de3a4639c6f11c70a4ff4d4aa5782f2f0d322dbc`, Production `dpl_FJ34MLsPywuM1RcCrBzKhArXp8Yz` READY. 실제 `src/`의 Git 대상 103/103 파일 SHA1 일치. 프로젝트 `prj_osDdLkgyiAomzS03J2GFM0c2bVB4` / 팀 `team_JKZ7B5OCf27pFKiNlhvSVuE4`, 도메인 projectId/verified 대조. linkedProjects/originConnections 없음. 기존 files 업로드 경로 유지.
- 누적 변경: 시작 운영→시작 개발은 용량 인계 문서와 브라우저 assertion 정리(제품 코드 차이 없음). 여기에 이번 입력·프롬프트·스키마·오류·공유 승인/복원 수정과 시험 도구를 포함해 전체 diff 검토.
- `lib/input-examples.mjs`: 기존 변환 우선, 미인식·포괄·개조식·긴 문장은 주제를 인용하는 대체 초안, 관련 정보 공란은 수업 참여 두 초안. 입력창 한도에 맞추기 위해 1,800자 초과 대체 주제는 말줄임 표시. 예시는 사실 자동 확정이 아니며 입력 자동 덮어쓰기 없음. 복사별 교체 확인/취소와 입력창 수정 유지.
- `lib/activity.mjs`, `lib/generation.mjs`, `lib/server/local-ai.mjs`, `lib/server/public-ai.mjs`: actual 문자열 trim 후 1자 이상. example 선택, 누락→빈 문자열. 4,000/2,000자 최대·전송 크기·계획·개수·보관·공유 제한 유지. 공백 actual은 HTTP400 `EMPTY_ACTUAL` / “실제 교육활동을 입력해 주세요.”, quota/provider 이전 차단.
- `lib/prompt.mjs`, `lib/server/gemini.mjs`: 짧거나 포괄적이어도 실제 활동 범위의 간결한 초안을 요청 수/단계별 분포대로 생성. 단계 차이·분량을 위해 활동·성과·도움·태도 추가 금지. 정상 Gemini 스키마 exact count 및 reasons=[]; 빈 배열 선택 경로 제거. 독립 검토는 별도 호출하며 의견을 강제로 PASS로 바꾸지 않음.
- `lib/generation-result.mjs`: 빈 후보/제공사 거절 사유는 입력 보완 422가 아닌 기술 응답 오류. 원시 reasons를 사용자에게 노출하지 않음. 정상 검토 완료 후보는 errors/semanticPass와 무관하게 목록에 추가. 기존 목록 보존·늦은 응답 폐기·중복 추가 방지 유지.
- `app/components/activity-inputs.jsx`, `app/page.jsx`, `lib/restore.mjs`: 선택 참고 예시 안내, 생략 예시 복원 정규화, 예시 없이 편집·전체 확인·일괄 승인·저장·복원. 승인 지적은 그대로 유지하며 수정과 새 전체 확인 필요. 후보별 자동 검토 표시와 특정 종결 강제 없음.
- 자동 검사 91/91, secret 검사, production build, npm audit(취약점0), diff whitespace PASS. React/Next client boundary·label·상태 갱신 검토 적용, 제품 의존성/모델/키/공유namespace/플래그/배포 보호 변경 없음.
- 로컬 브라우저: 신규 입력 회귀(PC/390px, mock2배치, 요청/응답/신규화면 1/1/1 및 2/2/2, 분포1/0/0 및1/1/0, 검토지적 전원 유지·승인차단·수정후승인·조합/복사/XLSX/저장/v1/v2재승인), 기존 예시 회귀, batch(1/12/24), generation-feedback(29 mock POST, 400/413/429/502/503/504/network/빈응답/수·분포오류/검토누락/취소/늦은응답/중복클릭), PDF drop PASS. 실제 모델 호출과 구분한다.
- 실제 크기 로컬 회귀: PDF17/50MB 선택·드롭 및 50MB−1, 작업200MB−1/동일, 저장/복원·출처 해시·초과 사전 차단·원자 보존을 검사한다. 결과 원본 `tmp/file-limits-local/result.json`.
- 도름스체크 v0.3.1 기존 GitHub tag/config detect·scan. npm registry의 동명 패키지는 404여서 설치되지 않았고 기존 승인 tag로 실행. 미확인/권고를 통과로 바꾸지 않음.

## 실제 원인 재현의 범위

- 배포 전 공개 실제 API에 합성 `actual="읽기"`, example 생략, 1개 요청→HTTP400 INVALID_INPUT, 과거 8/5자 안내. 스키마 이전 차단이므로 모델 호출0. `tmp/before-release-short-input.json`.
- 과거 prompt/schema에는 빈 후보+reasons 생성 및 NEEDS_INPUT/422 전환 경로가 직접 존재함을 확인했다. 모의 제공사 빈 응답으로 이 경로와 새 기술 오류 분류를 검사했다.
- 원래 사용자의 입력/응답 원본은 제공되지 않았다. 그 요청이 실제로 프롬프트 거절·429/503·다른 원인 중 무엇이었는지는 재현하지 못했으며 단정하지 않는다.

## 브라우저 환경과 증거

- 각 스크립트 지정 PC(1440px)/390px에서 직접 실행한다. 브라우저 버전은 용량 회귀 result에 기록.
- 공개 Chromium 직접 HTTPS는 환경 프록시 CA를 신뢰하지 않아 ERR_CERT_AUTHORITY_INVALID였다. 영구 NSS CA 추가는 자동 승인 검토에서 지속 TLS 신뢰 변경 위험으로 거부되었고 실행되지 않았다.
- 안전한 대안 `scripts/verified-browser-transport.mjs` / `VERIFIED_HTTPS_RELAY=1`: 이미 환경이 제공한 NODE_EXTRA_CA_CERTS를 사용하는 Playwright Node HTTPS 요청이 인증서를 검증하고 실제 응답을 브라우저에 전달한다. TLS 검증 비활성화·영구 신뢰 변경 없음. 재시도0, 같은 공개 origin/요청/실제 응답, 제품 코드 변경 없음. 실제 모델 검증 시 응답/후보를 모의하지 않는다. 시험별 명시적 mock 경로는 따로 구분한다.
- 검증 산출물/합성 PDF·작업·응답·다운로드는 Git 제외 tmp/에만 보존. 서버 키 pull/출력 없음.

## 배포 및 공개 검증

배포 후 정확한 개발/배포/문서 SHA, 배포 ID, 실제 호출 수·요청/응답/화면 분포와 공개 회귀 결과를 아래에 기록한다. 이 단계에서 완료 판정을 선기록하지 않는다.


## 첫 공개 실모델 관찰과 보강

- 1차 앱 `5e4f07c1092cdc3026ce81dbf9c1f12eec485683`, Production `dpl_ygYKMxDRCtu6Bo9ncujMyrGdCPJL` READY, 108/108 소스 일치. 실제 두 배치 모두 HTTP200, 요청/응답/신규DOM 1/1/1 및2/2/2, 단계분포1/0/0·1/1/0. 예시 공란 및 example 필드 생략을 각각 검증했다. 실제 Gemini 생성+검토 각각2회, 합계4호출 성공·실패0·503추가시도0. 기존 승인/후보 보존·수정/전체승인·조합/복사/XLSX/v1/v2복원 PASS.
- 실모델 의미 품질은 별도 관찰했다. 첫 배치 독립 검토가 실제에 없는 높은 단계의 정확성 누락을 지적했지만 후보1개는 목록에 유지되었다. 둘째 배치 한 후보는 기존 승인과 중복이고 다른 후보에는 actual에 없는 ‘교사의 도움’이 추가되었으나 독립 검토는 PASS였다. 이 독립 검토의 오판을 성공 품질로 계산하지 않고 원래 응답/semanticPass를 보존했다. 합성 자료를 직접 확인한 Codex가 내용 수정→새 전체확인→UI 최종승인으로 출력 흐름을 시험했다.
- 후속 보강 `lib/core.mjs`의 groundingIssues: actual에 없는 도움·지원/독립수행/정확성/태도/협력 표현을 보수적으로 지적하며 동의어 그룹을 허용한다. `lib/generation.mjs`에서는 오류를 붙여 후보 전원을 그대로 반환하고, `lib/batch.mjs`에서는 승인 시 다시 검사한다. semanticPass는 실제 독립 검토값을 유지하며 임의 PASS/자동승인하지 않는다. 모든 의미 오류를 잡는 보증은 아니다.
- 생성/독립검토 프롬프트에 희소 입력의 구체적 예와 ‘단계 설명에만 있는 도움/정확성은 사실이 아니며, 이를 actual에서 누락된 성취로 오인하지 말 것’을 명시했다. 재생성 버튼 자동 반복/개수 보충/추가 검토 호출은 추가하지 않았다. 이 코드 변경에 한정해 두 대표 배치를 고정 재검증한다.
- 자동92/92 및 production build PASS. 새 검증은 독립 검토가 놓친 도움 추가가 있어도 후보는 남고 승인만 차단하며, edited/errors 메타데이터만 바꿔서는 통과하지 못하고 실제 문장을 고쳐야 함을 확인한다.
- 공개 PDF drop의 별도 touch context에서 HTTPS 전달 설정이 빠진 시험 도구 오류를 발견해 같은 helper를 적용했다. 첫 실패는 앱 오류가 아닌 해당 context의 인증서 오류였다. 제품 TLS/보호 설정 변경 없음.

## 최종 공개 검증 결과 (2026-11-13)

최종 개발·배포 앱: `a988750e63f0213c82af5a4ee28eda72473432bd`.
최종 Production: `dpl_5fs6M3NfhjoA9CCvoCHf9foHnnt6`, READY / aliasError=null.
공개 URL: https://pyeoneo-studio.vercel.app/ (도메인으로 배포 조회·108/108 소스 SHA1 일치).
배포 URL: https://pyeoneo-studio-ktupqz75v-subsub-tschool.vercel.app/ .

| 실제 공개 배치 | example 전송 | 요청/응답/신규 DOM | 단계 분포 요청=응답=화면 | 기존 후보 포함 화면 | 독립 검토 지적 | 수정 후 승인 합계(기존1 포함) |
| --- | --- | --- | --- | --- | --- | --- |
| `읽기`, PC1440px | 빈 문자열 | 1 / 1 / 1 | 1 / 0 / 0 | 2 | 1개 유지 | 2 |
| `독서 활동`, 390px, 충돌 우려 단계 설명 | 필드 생략→서버 빈 문자열 | 2 / 2 / 2 | 1 / 1 / 0 | 3 | 2개 유지(중복 포함) | 3 |

- 생성문은 각각 ‘읽기 활동에 참여함.’, ‘독서 활동에 참여함.’, ‘독서 활동에 임함.’이었다. 최종 배치에서는 미확인 도움·정확성·발표를 생성문에 추가하지 않았다. 독립 검토는 여전히 단계 설명을 혼동한 지적을 반환했다. 이 지적은 응답 원본/semanticPass=false로 보존했고 후보를 숨기거나 PASS로 고치지 않았다. 합성 자료를 확인한 Codex가 문장을 수정하고 새로운 전체 확인→UI 최종승인→출력을 시험했다. 실제 교사의 사용자 자료를 대신 승인한 것이 아니다.
- 실제 제공사 호출: 최종 2배치 **5회(성공4, 제공사503 실패1)**. 첫 배치는 생성+독립검토2회. 둘째는 생성503→같은 생성 단계1회 재시도→독립검토, 총3회. 검토를 건너뛰거나 개수 보충/유료 대체/자동 재생성을 하지 않았다. 실제 503 재시도와 요청당 최대3호출도 확인했다.
- 이번 작업 총 실제 호출: 1차 공개4회 + 보강 후5회 = **9회, 성공8/실패1(503)**. 성공은 제공사 기술 응답 완료를 뜻하며 문장 품질·독립 검토 PASS와 다르다. 실제 API 배치4건은 모두 최종 HTTP200이었다. 최종 모델 응답 version은 `gemini-3.5-flash-lite`, 503 시도는 modelVersion/usage 없음.
- 최종 공개 공란 직접 요청: 빈 문자열/스페이스/탭/줄바꿈/혼합 전부 HTTP400 EMPTY_ACTUAL·정확한 안내, 모델0호출. UI 공란4종은 POST0·동일 저장 상태 보존. Origin 없는 직접 POST403. GET enabled=true/mode=public. 로컬/공개 공유 기준 단위 검사도 일치.
- 최종 공개 예시 회귀·입력 회귀·PDF drop(선택/실제 DataTransfer/키보드/390px 터치) PASS. 예시별 복사/교체확인/취소/수정, 기존 승인·후보 보존, 검토지적 전원 목록 유지/승인 차단, 예시 없이 전체확인/승인·조합/복사/XLSX 재열기·저장/v1/v2복원 후 재승인 PASS. 페이지/예상 외 console 오류0. 손상 PDF의 예상 parser 경고는 별도 기록.
- Chrome/Chromium `154.0.8037.57`, PC1440px / 모바일390px, 정상 인증서 검증 HTTPS 전달 경로로 실제 공개 소스/서버 응답을 시험했다. 기능 회귀의 mock 후보와 위 실모델 응답은 별도 산출물이다.
- 최신 배포의 최근15분 error/fatal 로그 없음. 503은 error 로그에 숨긴 것이 아니라 sanitized `publicAi.calls`의 실패 시도로 명시적으로 기록되어 있다.

## 근거·미실행·복구·인계

- 직접 실행 원본: `tmp/readiness-tests.log`(92/92), `tmp/readiness-build.log`, `tmp/final-audit.json`(취약점0), `tmp/readiness-release-evidence.json`(소스 manifest·두 배포 실호출 로그·runtime error 조회).
- 최종 실모델/화면/교사 시험 수정 원본: `tmp/readiness-final-public/response-{0,1}.json`, `generated-{0,1}.json`, `teacher-{0,1}.json`, `result.json`, `approved-{0,1}.png`, `approved.xlsx`, `work.json`. 1차는 `tmp/readiness-public/`에 별도 보존.
- 공개 공란 `tmp/public-blank-final-direct.json`, 최초 공개 차단 재현 `tmp/before-release-short-input.json`. mock/로컬 최종 회귀는 `tmp/readiness-final-local`, `tmp/feedback-final-local`, `tmp/batch-final-local`, `tmp/examples-final-local`. 공개 예시/PDF는 `tmp/examples-final-public`, `tmp/pdf-drop-final-public`. 실제 크기 파일 검사는 `tmp/file-limits-local`, 1차 `tmp/file-limits-public`, 최종 `tmp/file-limits-final-public`.
- 미실행/미확정: 원래 사용자의 요청 입력/응답 미제공으로 원래 요청의 실제 모델 거절 원인은 미확정. 대신 합성 공개 직접400, 실제503, 모델 생성/독립검토 의견을 각각 분리하여 직접 관찰했다. 실교사 자료·실제 학생 정보는 사용/업로드하지 않았다. NVIDIA 실호출은 이번 대상이 아니며 로컬 경로는 모의 제공사 검증이다. 유료/부하/모든 기기 최대 메모리 검증은 미실행이며 수행했다고 주장하지 않는다.
- 독립 의미 검토는 단계 설명을 사실로 혼동하는 오판이 남을 수 있다. 후보 전체 확인·수정·최종 승인과 승인 전용 출력은 필수이며, 단순 규칙/모델이 모든 의미 오류를 검출한다는 보증은 하지 않는다. 이번에는 이 오판을 후보0개/입력보완으로 바꾸지 않도록 한 요구가 실제로 충족되었다.
- 도름스체크 v0.3.1 기존 config로 배포 전후 직접 scan. 확인30/미확인5/해당없음1. 기존 TLS 세부/개인정보 정책/DB 규칙 등의 미확인 및 CSP/약관/OG/canonical/CORS·코드 패턴 권고는 그대로 유지. 정상 CA 신뢰 영구 추가가 거부된 시도는 실행되지 않았고 임시 검증 HTTPS 전달로 모든 공개 기능 검사를 수행했다. 보안/보호 설정을 약화시키지 않았다.
- 원래 복구 대상: `dpl_FJ34MLsPywuM1RcCrBzKhArXp8Yz` / `de3a4639c6f11c70a4ff4d4aa5782f2f0d322dbc`, 공개 alias 두 개. 후속 배포 직전 대상은 첫 구현 `dpl_ygYKMxDRCtu6Bo9ncujMyrGdCPJL` / `5e4f07c1092cdc3026ce81dbf9c1f12eec485683`. 핵심 운영 장애가 없어 rollback 미실행. 모델 품질 관찰은 요청 범위 내 보강·재배포로 처리했으며 공유 stop/카운터/salt/키/무료 플랜/활성 플래그를 변경하지 않았다.
- 일반 배포 재승인, 새 CI/Preview 활성화, master push/force push 없음. 문서 마무리는 문서 전용 커밋으로 push하며 제품 재배포하지 않는다. 실제 앱 배포 SHA와 최종 문서/원격 HEAD를 혼동하지 않는다.
- Work 전달: 이 저장소의 인계 원본과 STATUS/운영 절차를 사용한다. Google Drive `Codex_인계자료` 보관 및 동일 프로젝트 지식 ID 갱신/readback은 Work 담당이며 Codex의 이번 직접 실행 범위에는 포함하지 않았다. 관찰 주체는 위에 명시한 Codex 직접 실행, 원래 교사 사례는 미재현이다.


최종 앱 공개 실제 파일 크기 회귀10/10 PASS: PDF 17MB·50MB 선택/드롭·50MB−1, 실제 UTF-8 작업209,715,199/209,715,200 bytes 열기/저장/재열기/재저장, PDF52,428,801 및 작업209,715,201 bytes 읽기 전 차단, 합산 초과·잘못된 Base64/출처·같은 파일 재시도 시 승인/후보/전체확인/조합선택/계획 상태 해시 보존. v1 재승인·v2 원본 포함 복원 PASS. 실제 모델0호출, console/pageerror0. 메모리는 CDP 해당 시점 관찰값이며 전체 peak 측정은 아니다.

```text
[WORK HANDOFF]
판정: PASS — 공개 사이트 반영 완료
저장소/브랜치: subsubT/pyeoneo-studio / checkpoint-5-local-ai
시작 개발 HEAD: c4b7345b6b251e56b0bbef7f4bb597882555e1dc
첫 구현: 5e4f07c1092cdc3026ce81dbf9c1f12eec485683
최종 개발/실제 배포 SHA: a988750e63f0213c82af5a4ee28eda72473432bd
최종 인계 문서/상태 문서 SHA: docs/STATUS.md 상단의 확정 기록 및 Git log 참조
Production: dpl_5fs6M3NfhjoA9CCvoCHf9foHnnt6 / READY / aliasError=null
공개: https://pyeoneo-studio.vercel.app/ / 108파일 SHA1 일치
프런트·서버: actual trim 후1자 / example 선택·생략→빈 문자열 / 공란400·모델0
최종 요청/응답/신규DOM: 1/1/1, 2/2/2 / 단계분포1·0·0,1·1·0
최종 실모델: 5호출(성공4·503실패1), 전체9호출(성공8·503실패1)
검토지적 후보3개 유지·자동승인0·수정/전체확인 후 최종승인·승인전용출력 PASS
자동92 / secret / production build / audit0 / 로컬·공개 PC390px 회귀 PASS
PDF50MB·작업200MB·PDF drop·v1/v2·기존작업 보존 PASS
미확정: 원래 사용자 요청 입력/응답이 없어 그 사례의 실제 원인은 미재현
남은 운영 차단: 없음 / 복구 실행: 없음 / 복구 대상은 위 본문 기록
Work 담당 Drive 보관·동일 프로젝트 지식 갱신: 이번 Codex 직접 실행 아님
```
