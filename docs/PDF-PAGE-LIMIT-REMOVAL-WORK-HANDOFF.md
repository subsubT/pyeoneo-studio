# PDF 쪽수 제한 제거 — WORK HANDOFF

2026-11-17 KST / Codex 직접 구현. 현재 단계: 구현 반영, Production 배포 전. 기능 PASS 또는 실사용 검증 완료가 아니다.

## 시작과 대상

- 저장소: https://github.com/subsubT/pyeoneo-studio / 개발 브랜치 `checkpoint-5-local-ai`.
- 시작 원격/개발 HEAD: `c3479ac0c382b23ff9336732656d03bbebd67d8b`. 초기 환경은 오래된 `work` / `2f72e1b`였고 미커밋 변경이 없어 최신 개발 브랜치를 fetch·전환했다. 기존 개발 변경을 보존했다.
- 시작 운영/배포 전 복구 대상: 앱 `c80515667f3a953455baa7dfc1b16f63999adcbe`, `dpl_8QtpJHzu1PjnMXpMj1bRsnKSk3j4`, Production READY·aliasError=null.
- 복구 대상 URL: https://pyeoneo-studio-5mc1gk6t9-subsub-tschool.vercel.app / 공개 도메인 https://pyeoneo-studio.vercel.app 의 동일 배포 연결을 metadata로 확인했다.
- 기존 Hobby 팀 `subsub-tschool` / `team_JKZ7B5OCf27pFKiNlhvSVuE4`, 프로젝트 `pyeoneo-studio` / `prj_osDdLkgyiAomzS03J2GFM0c2bVB4`, Next.js / Node24.x를 유지한다. 공개 도메인은 verified·gitBranch=null·projectId 일치다.
- Git 연결 조회는 linkedProjects=[]·originConnections=[]이므로 기존 SHA1 소스 업로드 Production 경로를 사용한다. master 병합·새 Preview·자동 배포 CI는 사용하지 않는다.

## 변경과 코드 검토

- `lib/files.mjs`: doc.numPages>30 거절과 오류 문구를 제거했다. 기존 1부터 실제 doc.numPages까지 순차 처리와 원래 쪽 번호, p.cleanup()·loading.destroy()·worker 전송 전 원본 Base64 보존을 유지한다. 앞 N쪽만 읽거나 전체 쪽을 동시에 처리하지 않는다.
- `lib/restore.mjs`: item.page의 max(30), source.pages 내부 page의 max(30), source.pages 배열의 max(30)을 제거했다. Zod4의 .int()는 Number.isSafeInteger를 검사하므로 안전한 정수 검사는 유지한다. 항목 page>=0, 원본 page>=1, 원본 연속 1..N, 중복 sourceId/항목ID, 존재하는 출처와 해당 쪽 범위 검사는 그대로다. 문장 errors 배열의 max(30)은 쪽수와 무관해 유지한다.
- 같은 validateProject를 사용하는 serializeProject/restoreProject와 PDF 추가·작업 병합 사전 검사가 함께 적용된다. 저장 형식은 v2이며 v1 호환을 유지한다.
- `app/components/plan-review.jsx`: 업로드 안내를 `50MB · 텍스트 PDF · 기존 항목에 추가`로 바꿨다. 쪽 선택·원문·전체 원문은 기존 source.pages 전체 순회, 미리보기는 선택한 실제 쪽의 getPage(page) 경로여서 별도 변경이 필요하지 않았다.
- `app/page.jsx`의 PDF 추가와 작업 병합은 serializeProject로 최종 전체 상태를 검사한 뒤 setter를 실행한다. 다른 한도를 넘는 경우 성공으로 잘라내지 않고 기존 오류를 표시한다. 실패 전에 항목·선택·확정·교사 입력·후보·승인·전체 확인을 바꾸지 않는 기존 경로를 유지했다.
- `lib/core.mjs`의 parsePlanPages와 `lib/pdf-text.mjs`의 전체 문서 어휘 수집은 변경하지 않았다. 최근 띄어쓰기 복구·셀/행/수준 경계와 두 예시 생성·참고 예시 우선 AI 변형 계약을 보존한다.
- README·CHECKPOINT-6·운영 절차의 현행 쪽수 안내와 AGENTS/STATUS 우선 지시를 갱신했다. FILE-LIMITS-HANDOFF에는 후속 정책 링크를 붙이고 과거 PASS/쪽수 거절 기록은 역사로 보존했다.
- `scripts/pdf-drop-browser.mjs`에서 31쪽 파일을 실패로 요구하던 오래된 항목과 결과 설명만 삭제했다. 새 시험·스크립트는 추가하지 않았고 기존 스크립트도 실행하지 않았다. 기존 합성 31쪽 fixture 생성 정의는 제품 차단이 아니므로 보존했다. 이 스크립트가 새 31쪽 성공 흐름을 검증한다고 주장하지 않는다.
- 운영 c805156→시작 c3479ac의 누적 차이는 문서4개와 기존 띄어쓰기 검증 하네스뿐이며 앱 실행 소스는 같았다. 이번 배포 실행 변경은 위 제품 파일3개뿐이다.

## 보존한 한도와 범위

PDF **52,428,800bytes(50MB)**, 작업 JSON **UTF-8 209,715,200bytes(200MB)**, PDF10개, 평가 항목100개, 예시2,000개, XLSX5MB와 기존 필드·AI 요청/보관/공유 한도를 유지한다. Base64/헤더/파일 형식·크기·출처/쪽수 무결성도 그대로다. 독립 검토·교사 최종 승인·승인 전용 출력·복원 후 재승인을 유지한다.

무료 플랜·모델/키·활성 플래그·공유 저장소/한도는 변경하지 않는다. AI 실호출0회. 새 OCR·서버 자료 업로드·외부 저장소·유료 서비스·의존성 업그레이드·기존 저장 문장 일괄 교정은 수행하지 않는다. 기기 메모리/처리 시간/다른 데이터 한도까지 무제한이라는 뜻이 아니며 새 쪽수 상한이나 필수 PDF 분할을 도입하지 않는다.

## 실행·미실행 구분

이번 사용자는 이전 띄어쓰기 검증 재개 예외와 구분하여 검증 생략을 명시했다. 구현에 필요한 코드 읽기·저장소 전체 쪽수 관련 검색·변경 검토·Git 원격/배포 metadata 확인은 수행한다. 별도 자동/단위/통합/회귀/정적/lint/typecheck/비밀값/도름스/브라우저/기기/API/실모델 시험·검증용 빌드는 미실행이며 새 검증 스크립트도 작성하지 않는다. 플랫폼 필수 빌드/강제 검사는 정상 수행하고 보호/CI/hook/TLS는 해제하지 않는다.

과거 띄어쓰기 검사의 잔여30실패는 이전 인계 기록이며 이번 재실행 결과가 아니다. 이번 기능을 PASS/검증 완료로 표시하지 않는다. 실사용·31쪽 이후 추출/복원/미리보기의 실행 결과는 미검증이다.

## 배포 결과

정상 개발 commit/push → 정확한 원격 소스의 기존 Production 업로드 → 필수 빌드 → READY·실제 앱SHA·공개 도메인 metadata 확인 뒤 이 절을 갱신한다. 후속 상태/인계 전용 커밋은 앱을 재배포하지 않는다. 기능/실제 배포SHA·배포ID·빌드·최종 인계SHA·복구 여부를 구분해 최종 응답에도 제공한다.

## 미래의 사용자 확인 절차 — 이번 실행 결과 아님

다른 기존 한도 안의 31쪽 이상 PDF를 파일 선택/드롭으로 추가 → 뒤쪽 항목과 원본 쪽수 확인 → 작업 저장/다시 열기 → 같은 원문/미리보기 유지 확인. 기존 작업에 추가하는 경우에도 같은 흐름을 확인한다.

이번 쪽수 제한 제거·배포·인계에서 중단한다. Work의 Drive 보관·프로젝트 지식 갱신/readback은 Work 후속이며 이번 Codex 실행으로 보고하지 않는다.
