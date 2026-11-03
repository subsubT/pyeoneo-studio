# [WORK HANDOFF] 입력 예시 기능 운영 배포

2026-11-03 (Asia/Seoul). **운영 배포 BLOCKED: Vercel 팀 접근 복구 대기. 공개 사이트 반영 완료 아님.**

사용자가 이번 운영 배포와 필요한 정상 병합·push를 승인했다. 이전 문서의 배포 보류는 이번 요청 범위에서 해제되며, 공개 AI 비활성·개발 브랜치 자동 Preview 차단은 유지한다.

## 소스 및 배포 대상

- 저장소 `subsubT/pyeoneo-studio`, 개발 브랜치 `checkpoint-5-local-ai`.
- 작업 시작 시 원격 HEAD와 로컬 HEAD 일치: `d01db11ce9f2f38c138ed6baed4717f398a6ffd6`.
- 원격 `master`: `2f72e1b369328cb54150484198999628aa84e7ef`. 운영 배포 커밋으로 확정한 값이 아니다.
- 최초 미커밋 변경 없음. 이번 변경은 검증 스크립트·상태/인계 문서뿐이며 앱 동작 코드는 변경하지 않았다.
- 지정 팀 `subsub-tschool` / `team_JKZ7B5OCf27pFKiNlhvSVuE4`, 프로젝트 `pyeoneo-studio` / `prj_osDdLkgyiAomzS03J2GFM0c2bVB4`는 저장소 지침상 식별자다. 실제 연결 대조는 도구의 팀 접근 403으로 BLOCKED.
- 공개 URL: https://pyeoneo-studio.vercel.app/
- 실제 Production 브랜치·운영 소스 커밋·현재 정상 배포 ID·도메인 매핑: **BLOCKED**. 이 정보 확인 전 배포/운영 브랜치 병합을 실행하지 않는다.
- 기존 기록의 `dpl_CprraCzwjNAMVdMqfddm8DCx4nfD`는 과거 정상 배포 참고값이며 현재 검증된 복구 대상으로 취급하지 않는다.
- 실제 배포 소스 커밋 / 새 Production ID·READY: **없음(배포 미실행)**.
- 복구: 운영 변경이 없으므로 미실행.

## 누적 변경 검토

확인 가능한 `master@2f72e1b`와 개발 소스 `d01db11`의 전체 차이는 **48파일, +1941/-42행**이다. 실제 운영 커밋 확인 후 기준을 재대조해야 한다. 후보에는 다음이 함께 포함된다.

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
| 실제 Vercel 운영 ID/커밋/도메인·복구 대상 확인 | **BLOCKED**, 팀 접근 403 |
| 운영 배포·새 Production READY·새 공개 기능 검사 | **BLOCKED**, 위 접근 복구 후 진행 필요 |
| 배포 후 런타임 오류·도름스체크 | **미실행**, 배포 전 단계에서 막힘 |

비식별 예시 출력:

- 색 활동: `주변에서 여러 가지 색을 찾아보고 10색상환을 완성했다.`
- 색 참고: `주변에서 여러 가지 색을 찾아보고 10색상환을 완성함.`
- 수 활동: `구체물을 이용하여 9까지의 두 수의 크기를 비교했다.`
- 수 참고: `구체물을 이용하여 9까지의 두 수의 크기를 비교함.`

근거는 ignored `tmp/release-local-examples/`의 결과·요청·작업 JSON·XLSX·캡처와 `tmp/release-plan/`의 합성 자료·결과·왕복 저장 파일·캡처에 있다. 원본 교육 자료나 검증 산출물을 Git에 넣지 않는다.

## 접근 복구와 다음 단계

Vercel MCP의 프로젝트 및 도메인 배포 조회가 모두 `403 forbidden: Not authorized ... subsub-tschool`을 반환했다. 도구 지시대로 `authorize_team_access`를 호출해 사용자에게 일회용 팀 접근 링크를 제공했다. 이 절차는 배포 재승인이 아니라 연결 권한 복구다. 토큰·환경 파일 요청이나 보안 우회는 하지 않는다.

복구 후 동일 연결로 프로젝트/Production 브랜치/도메인/소스/복구 ID를 확인하고, 운영 소스와 후보 전체 차이를 재대조한다. 검증한 소스 커밋을 기존 프로젝트의 정상 Production 경로로 배포한다. 개발 자동 Preview 차단과 공개 AI 비활성을 유지한다. 새 브라우저 세션으로 공개 기능·저장/복원·승인·조합·XLSX 및 런타임 오류를 확인하고 문서 후속 커밋을 push한다.

검사 재현: `PLAYWRIGHT_MODULE`과 `BROWSER_EXECUTABLE`을 환경에 맞게 지정해 `node scripts/input-examples-browser.mjs`, `node scripts/release-plan-browser.mjs` 실행. `TEST_BASE_URL`과 `TEST_OUTPUT_DIR`로 로컬/공개 검사 근거를 분리할 수 있다.
