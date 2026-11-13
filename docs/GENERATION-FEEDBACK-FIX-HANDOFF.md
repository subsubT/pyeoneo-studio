# [WORK HANDOFF] AI 후보 미출력 체감·생성 결과 안내 수정

2026-11-13 KST. **PASS — 공개 사이트 반영 완료.** 이번 판정은 합성 자료를 사용한 직접 재현/수정 검증이다. **원래 사용자 작업 파일·브라우저 환경은 제공되지 않아 그 사례 자체는 미재현**이다. 이전 인계의 PASS를 이번 사용자 문제의 재현/해결 근거로 대체하지 않았다.

## 원인과 근거

수정 전 공개 UI에서 기존 후보8개가 있는 항목에 3개(2/1/0)를 요청했다. POST200·생성1회/독립 검토1회 성공, DOM 신규3개와 단계별2/1/0을 확인했다. pageerror/console error0. 그러나 신규 후보는 화면 아래에 있었고, 화면 상단 공통 notice도 viewport 밖이었으며 생성 버튼 옆 결과 안내는0개였다. 버튼이 원래대로 돌아오고 후보/알림이 보이지 않는 **④ 목록 반영 후 위치·피드백 문제**가 이번 합성 재현에서 확인된 실제 원인이다. 제공사400·429·503, 키/활성 설정, AbortSignal/crypto 호환성 오류는 이 실호출에서 관찰되지 않았다.

- 수정 전 시각: 2026-11-13 09:47:46~09:47:52 KST. Network x-vercel-id와 Vercel request `bp4zl-1794530870304-1a7ae97e4e20` 일치. 운영 fe2eed2/배포6ii…에서 API200.
- 먼저 만든 회귀는 모의400 뒤 버튼 옆 결과를 요구했으며 수정 전 `0 != 1`로 실패했다. 실제 API 실패의 확정 원인으로 해석하지 않았다.
- 코드 검토에서 발견한 별도 취약 경로: 조건부 setItems가 아무 항목도 갱신하지 않아도 성공 알림을 설정할 수 있었음, 비JSON 응답의 파싱 오류를 그대로 표시할 수 있었음, 빈 candidates/reasons가 개수 오류에 묻혔음. 원래 사용자 실패의 확정 원인으로 단정하지 않고 이번 요구의 실패/반영 조건으로 보완했다.

## 최소 변경과 전후 동작

| 파일 | 수정 내용 |
| --- | --- |
| app/page.jsx | 생성 전 검증부터 fetch/파싱/ID 생성까지 안전한 try/catch/finally. 버튼 옆 진행·성공·실패·취소·폐기 결과를 다음 요청/닫기까지 유지. 후보 DOM commit의 ID 존재를 확인한 후 성공 표시. 신규 위치 보기·해당 행 표시, 자동 스크롤/편집 포커스 이동 없음. 중복 클릭·revision/취소 가드와 busy/controller 정리 |
| app/style.css | 생성 버튼과 결과 인접 배치·390px 줄바꿈·이번 신규 행 표시 |
| lib/generation-result.mjs | 검증된 응답만 수락, 고정된 안전 오류 안내/실제 Retry-After 해석, 스냅샷이 일치하는 대상에 한 번만 추가하는 순수 updater. updater 안 알림/부수효과 없음 |
| lib/generation.mjs | 빈 후보+유효한 reasons는 NEEDS_INPUT, 사유 없음/잘못된 사유는 INVALID_AI_RESPONSE. 0개 정상 성공·추가 보충 호출 없음 |
| lib/server/public-ai.mjs / local-ai.mjs | NEEDS_INPUT을 정제된 고정 안내/사유 코드와422로 구분. 원시 모델 reasons를 반사하지 않음. 기존 공급자 오류·독립 검토 실패는 미완료 후보 없이 실패 유지 |
| tests 및 browser scripts | 응답/실패/반영 가드 단위검사, 버튼 옆 결과 회귀, 공개 실제 생성·승인/출력 재사용 검사. 기존 batch-browser는 안전 안내 문구 변경에 맞춰 기대값만 조정 |

성공은 HTTP200이 아니라 **유효한 N개가 의도한 항목의 실제 DOM에 나타난 것**으로 판정한다. ‘이번 새 후보 보기’는 사용자가 누를 때만 신규 위치로 이동한다. 기존 후보가 많은 화면에서도 신규 ID를 표시하며 표시 번호는 데이터/원문/XLSX에 붙이지 않는다. 실패 시 이번 후보 미추가와 기존 작업 보존을 알린다. 중복 클릭은 한 요청, 입력 변경/취소 뒤 늦은 응답은 폐기, 다음 요청 가능을 검증했다.

독립 검토 전송/응답 실패는 요청 실패이며, 검토 완료 후 의미 부적합 판정은 후보를 표시하여 수정/승인 검사로 통제한다. 후보별 품질 안내/확인 체크를 되살리지 않았다. 특정 종결 강제·자동 승인·검사 제거·복제/잘라내기·숨은 보충 호출 없음. 고정 Gemini/서버 키/Hobby/Upstash Free·salt·namespace·공유 카운터·503 추가시도 최대1회/총3호출·Retry-After/시간/취소·전체 확인/원자 승인·승인 전용 출력/재승인 규칙은 보존했다. 키 재등록·활성화·공유 중지/카운터 초기화·모델/유료 서비스/DB 변경0.

## 공개 실제 수·분포·호출

| 실행 | 요청 / 응답 / 실제 신규 DOM | 분포 | 관찰 |
| --- | --- | --- | --- |
| 수정 전 진단 | 3 / 3 / 3 | 2/1/0 일치 | 후보/상단 안내가 화면 밖, 버튼 옆 안내0, 브라우저 예외0 |
| 배포 후 공개 검증 | **3 / 3 / 3** | **활동 완성2 / 활동 표현1 / 추가 확인0** | 기존 후보8개+승인1개 보존, 한 번만 추가되어 후보11개, 버튼 옆 success·신규 표시3개·위치 이동 확인 |

배포 후 실제 검증 시각: 2026-11-13 10:32:11~10:33:16 KST. request `hn2qr-1794533534356-fd22f48a3fba`를 Network/Vercel 로그와 대조했다. 초기 승인가능2/3, 시험 교사가 원문에 맞게1문장을 수정한 뒤 전체 체크 해제→다시 체크→3개 일괄 승인. 기존 승인1개는 보존되어 현재 항목 승인4개. 같은 교과의 다른 직접 작성 승인1개와 조합/복사 일치, XLSX 재열기에서 승인 원문5개 일치·미승인1개 제외. 저장/복원 시 승인0·전체 확인 해제·과거 성공 메시지 복원 없음. 이 출력/복원에 추가 모델 호출0.

실제 **총4호출 = 진단 생성1+독립 검토1 / 배포 후 생성1+독립 검토1**. 공개 실제 POST2회, 두 응답200. 숨은 재생성·503 추가시도0, countTokens0, 전체 사전 검사 재실행0. 성공한 다른 배치·상한24 실모델은 반복하지 않았다. 이번 원인은 상한 특정 입력 오류가 아니며 1/12/24와0단계는 아래 모의 검사로 대조했다.

| 시도 | 실제 modelVersion | ms | 입력/출력/생각 tokens |
| --- | --- | --- | --- |
| 진단 generation | gemini-3.5-flash-lite | 1,018 | 946 / 150 / 미제공 |
| 진단 review | 동일 | 802 | 657 / 39 / 미제공 |
| 배포 후 generation | 동일 | 1,104 | 965 / 236 / 미제공 |
| 배포 후 review | 동일 | 995 | 667 / 79 / 미제공 |

비용 메타데이터 미제공, 기존 Free 사용/플랜 변경 없음. 실제 생성 후보의 품질이 전부 통과했다고 주장하지 않는다. 후보 원문/학생 자료/키/프롬프트/IP/제공사 원시 오류 본문은 진단 로그와 Git에 넣지 않았다. 작업/응답/스크린샷/XLSX는 ignored tmp에만 보관했다.

## 검증

- **82/82 npm test PASS**. 기존75개+이번7개. 안전 응답 처리, 유효한 빈 사유/잘못된 빈 응답 구분 및422/502, 미완료 검토 차단/부적합 검토 표시, 한 번만 추가/스냅샷 변경·삭제된 대상 거부/승인 보존, 기존503 재시도·공유 예산·시간/취소 회귀 포함.
- production build PASS, 비밀값/제외 파일 검사97파일 PASS, git diff --check PASS. 운영 fe2eed2부터 개발 HEAD까지 전체 차이 검토. 기존 운영→시작 개발은 문서/검사 변경이며 현재 제품 diff는 위 최소 변경 파일들이다.
- **PC1440·390px 모의 PASS**: 1/12/24·임의 단계명/ID·0단계, 기존 후보/승인·첫/재생성·긴 목록, 400/413/429/502/503/504, 네트워크·비JSON·빈 본문, 수 미달/초과·단계 오배정·빈 후보/사유, 검토 누락/부적합, 취소·중복 클릭·활동/예시 변경·늦은 응답, 오류 후 재시도, 버튼 옆 결과 유지/닫기, 가로 넘침0·pageerror0. 최종 공개 모의 PC29POST/390px29POST이며 모든 POST는 route mock으로 실제 모델0호출. 개발 중 모의 실행은 각 result.json의 posts/ok와 구분한다. 최초 red는1모의POST/예상 실패.
- 대상 변경은 실제 UI에서 생성 중 비활성화된다. 최종 모의에서 전환 차단→응답이 원래 항목에만 추가/다른 항목 보존을 검증했다. 별도로 순수 updater의 누락/변경된 대상·기준/단계/개수 스냅샷 거부를 단위 검증. DOM disabled만 바꾸어 전환·폐기를 기대한 개발 검사2회는 React의 disabled 이벤트 차단 때문에 잘못된 기대값이었고, 제품 코드를 추가하지 않고 실제 전환 차단 검증으로 보정했다. 해당 실패 산출물도 보존했다.
- 기존 batch-browser(1/12/24·실패 보존·승인 전용 출력·복원·120한도), input-examples-browser 회귀 PASS. 기존 batch 검사 첫 실행은 이제 노출하지 않는 원시 서버 문구 ‘시험 오류’를 기다려 실패해, 안전한 실패 안내 기대값으로 조정한 뒤 관련 검사 PASS. 이번 보안/요청/상태 변경과 무관한 PDF parser 전체 회귀는 반복하지 않았다.
- **공개 실제 UI·신규 DOM·버튼 옆 결과·위치 이동·수정/전체 승인·조합/복사·XLSX 재열기·저장/복원 PASS**, PC/390px 결과 화면 확인, 기존 후보/승인 보존, pageerror/console error0. 공개 모의에서 실패 이유 인접 표시/작업 보존까지 확인. 최종 배포 최근15분 error/fatal 로그0.
- 배포 전 기존 도름스체크 v0.3.1/config scan: 확인30·미확인5·해당없음1. 차단 실패0, 기존 CSP/정책/TLS세부/DB 규칙 등의 미확인·권고를 PASS로 바꾸지 않음. NODE_USE_ENV_PROXY=1 및 정상 CA/NSS 접근 사용, TLS 검증/배포 보호 비활성화 없음. 전체 보안 보증 아님.

## 소스·배포·복구

| 구분 | 식별자 |
| --- | --- |
| 저장소 / 브랜치 | subsubT/pyeoneo-studio / checkpoint-5-local-ai |
| 시작 개발 HEAD / 원격 | f4a0812108ef6032ad4a82d0d3f20ff3131e8cc8 / 시작 조회 일치 |
| 시작 운영·정상 복구 소스 | fe2eed23ddeb9945e0ed9177f10420a95f4b7ca3 |
| **개발 / 실제 배포 SHA** | **a3a20a4862ba7af3a48ea325760de401587fb1b1** |
| 문서/인계/추가 검사 SHA | 이 문서의 최종 커밋(`git log -1 --format=%H -- docs/GENERATION-FEEDBACK-FIX-HANDOFF.md`), 최종 채팅에 정확한 SHA 기록. 앱 소스 차이0, 추가 앱 재배포 생략 |
| Vercel 팀 / 프로젝트 | subsub-tschool / team_JKZ7B5OCf27pFKiNlhvSVuE4 / prj_osDdLkgyiAomzS03J2GFM0c2bVB4 |
| **최종 배포 / 환경 / 상태** | **dpl_4gpupMTbqmwQWkGc4v3Pt6gNG1Yg / Production / READY / aliasError=null** |
| 배포 URL | https://pyeoneo-studio-c0gyy2fkf-subsub-tschool.vercel.app |
| **공개 URL** | **https://pyeoneo-studio.vercel.app/** |
| 정상 복구 대상 | dpl_6iiovimru2TsV8P2nQJwMQcTB3gb / READY / fe2eed2 / https://pyeoneo-studio-cy288pe0r-subsub-tschool.vercel.app |

시작/배포 직전 팀·프로젝트 accountId·도메인 projectId·운영 소스/READY 재조회. 검증 소스를 정상 commit/push하고 정확한 원격 SHA를 대조해 기존 Vercel files Production 경로로 배포했다. 최종97/97 source file SHA-1을 manifest와 전부 대조 PASS. 공개 도메인 조회로 실제 배포 ID/소스/Production READY/aliasError=null 확인. 개발 자동 Preview 차단·master·일반 buildCommand·활성 설정 유지. 실제 공개 생성과 운영 로그가 위 배포를 사용함을 확인했다.

복구 실행/전역 중지/비활성화 없음. 새 운영 결함 미관찰, 원래 사용자 작업 자체의 원인 확정은 미완료이므로 그 사례까지 동일 원인이라고 일반화하지 않는다. PDF 전체 회귀/전체 Gemini·Upstash 사전 검사·실서비스 부하/450회 소진·추가 상한 실모델은 이번 범위에서 미실행(불필요한 반복 방지, 기존 근거 및 현재 관련 자동/모의 검사 재사용). 새 기능 착수 없음.

## 근거와 재현

Codex 직접 실행: `tmp/generation-fix/before-report.json`, before.png/before-work.json, red/result.json, tests-final.log, build2.log, mock*/result.json, batch-final/result.json, examples/result.json, public-mock/result.json, public-mobile/result.json, live/result.json·status-1440/390.png·approved.xlsx·work.json, security.log, runtime-evidence.json, deploy/manifest.json. 실패한 개발 검사 보고서와 이번 실제 성공도 분리 보관한다. 검증 산출물·작업 자료는 Git 제외다.

```bash
npm test
node scripts/check-secrets.mjs
npm run build
git diff --check
TEST_BASE_URL=http://127.0.0.1:3011 node scripts/generation-feedback-browser.mjs
# 실모델은 이미 검증 완료. 추가 반복 호출 없이 저장된 결과로 출력/복원을 검사했다.
```

Work의 Drive 보관/프로젝트 지식 파일 갱신은 이번 Codex에서 수행하지 않았다. 이 파일과 최종 채팅이 전달 원본이며 Work 직접 저장/확인 결과와 구분한다.
