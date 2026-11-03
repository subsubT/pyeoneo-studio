# [WORK HANDOFF] 작업 완료·상시 운영 배포 규칙 적용

2026-11-03 (Asia/Seoul). **PASS — 운영 문서 반영 완료, 앱 재배포 생략(문서만 변경).** 이번 작업으로 공개 기능이 새로 배포됐다고 보고하지 않는다.

## 커밋과 범위

- 저장소: `subsubT/pyeoneo-studio`, 기본 개발 브랜치: `checkpoint-5-local-ai`.
- 시작 원격 HEAD: `289ac8854399b2c9212d64fc0a2d10ed66d81d8b`.
- 운영 규칙 문서 커밋: **`1b0a05be8f701ecb61c615234b0881fe9f46e9c9`**. 위 시작 HEAD를 부모로 한 정상 fast-forward로 원격 브랜치에 반영하고 readback 확인.
- 개발 기능 커밋: 이번 작업에는 신규 기능 변경 없음. 기존 입력 예시 기능 `043847c51e32b3618a8f63e073e64ab616701ba8`은 과거 이력이다.
- 실제 운영 배포 커밋: **`9318df4b601a72084934a2143b7f02d084b940f7`**. 문서 커밋과 구분한다.
- 이 후속 인계 문서와 STATUS 추가도 Markdown 전용이다. 최종 원격 HEAD는 최종 응답 및 Drive 인계 원본에 기록한다. 이 파일을 추가한 커밋은 `git log -1 --format=%H -- docs/OPERATIONS-POLICY-HANDOFF.md`로 확인할 수 있다.

`AGENTS.md`, `docs/STATUS.md`, README, Cloud 인계, 검증 문서, AI 운영 문서와 날짜별 과거 기록의 충돌을 정리했다. [운영 절차](PRODUCTION-OPERATIONS.md)에 실제 배포 경로, 소스 payload 생성 방법, 배포 전후 검사·복구·완료 문구·인계 서식·Work/Drive 전달 규칙을 기록했다. 일반 운영 배포의 매번 재승인과 push 후 중단 규칙은 이번 사용자 결정으로 대체했다.

공개 AI 비활성·교사 확인/최종 승인·개발 자동 Preview 차단을 유지한다. 무조건 자동 배포 CI를 추가하지 않는다. 새 개발 목표/다음 기능, 공개 AI 활성화·추가 비용 서비스·파괴적 데이터 변경은 별도 사용자 결정 대상이다.

## 실제 Vercel 상태와 전체 누적 차이

- 팀: `subsub-tschool` / `team_JKZ7B5OCf27pFKiNlhvSVuE4`.
- 프로젝트: `pyeoneo-studio` / `prj_osDdLkgyiAomzS03J2GFM0c2bVB4`, accountId 일치, Next.js / Node 24.x.
- 현재 배포 ID: **`dpl_7Dr8XmmcGiEXMoWZTC7x9qr2y3f4`**, 환경 **Production**, 상태 **READY**, aliasError=null.
- 공개 링크: https://pyeoneo-studio.vercel.app/ . 공개 도메인으로 배포를 시작 시점과 문서 push 후 재조회해 동일 ID·소스 metadata 확인. 도메인 projectId·verified=true 확인.
- Git 연결 도구의 linkedProjects/originConnections는 빈 목록이며 공개 도메인 gitBranch=null. 현재 Production의 src 파일 트리를 직접 확인했다. 기존 소스 업로드 성공 기록과 함께 직접 `files` 업로드 경로를 운영 절차에 기록했다. 개발 push 자동 운영 갱신이나 master 자동 배포를 가정하지 않는다.
- 운영 소스 `9318df4` → 시작 HEAD `289ac88`: 3커밋·4파일. `docs/STATUS.md`, `docs/PRODUCTION-INPUT-EXAMPLES-HANDOFF.md`, `scripts/input-examples-browser.mjs`, `scripts/release-plan-browser.mjs`. 앱·라이브러리·자산·의존성·Vercel 구성 차이 없음.
- 이번 정책 커밋은 Markdown 12개만 수정/추가했다. 원격 트리를 기존 base와 비교해 모든 비문서 blob SHA 불변 확인. 후속 인계/STATUS 역시 문서만이다.

## 이번에 직접 수행한 검사

| 검사 | 결과·근거 |
| --- | --- |
| 최신 원격 브랜치/HEAD·정확한 원격 문서 조회 | PASS, GitHub 연결 도구에서 고정 SHA 기준 읽기 |
| 실제 Vercel 팀·프로젝트·Production·소스·도메인·배포 src 조회 | PASS, 이번 Codex 직접 조회 |
| 운영 소스부터 시작 HEAD까지 전체 비교 | PASS, 위 3커밋·4파일 범위. 이번 비문서 트리 불변도 확인 |
| 문서 규칙 충돌·과거 기록 우선순위 검토 | PASS, 현재 읽기 순서와 최신 사용자 결정 명시 |
| Markdown 상대 링크 | PASS, 실제 원격 트리와 추가 파일을 기준으로 검증 |
| 배포 payload 예제의 Python 구문 | PASS, AST parse만 실행. payload 생성·배포는 실행하지 않음 |
| `git diff --check` | PASS, 검토용 문서 작업 디렉터리에서 실행 |
| 기존 `node scripts/check-secrets.mjs` | PASS. 정책 검사 16파일, 최종 인계 포함 17파일의 문서/구성 검토 범위. 초기 sandbox의 `spawnSync git EPERM`은 정상 권한 실행으로 해소. 전체 앱 재검사라고 보고하지 않음 |
| 원격 반영/readback | PASS, 정책 커밋 부모·정상 fast-forward·Markdown 12파일 diff·AGENTS 원문 대조. 최종 인계 원격 HEAD도 최종 응답 전에 재조회 |

환경의 최초 체크아웃은 `work` / `2f72e1b`로 오래된 상태였다. `git fetch`는 환경 프록시 연결 실패로 실행할 수 없어 인증된 GitHub 도구로 최신 원격 자료를 읽었다. 별도 문서 검토 디렉터리에서 검사하고 GitHub Git tree/commit/ref API로 정확한 부모 위에 커밋하여 `force=false`, 기대 HEAD 확인과 함께 동일 개발 브랜치를 정상 갱신했다. force push·보호 규칙 우회·운영 브랜치 병합은 없었다. Git 전송 경로의 제약은 연결 도구로 해결했으며 이 문서 작업의 미반영 차단 사항은 없다.

## 미실행·미해결·복구

- 앱 자동 검사·production 빌드·변경 기능 브라우저·공개 핵심 회귀·도름스체크: **이번 문서 작업에서는 N/A/미실행**. 앱 소스·배포 구성 변경과 새 배포가 없기 때문이다. 이전 41/41 및 공개 브라우저 PASS는 [과거 운영 인계](PRODUCTION-INPUT-EXAMPLES-HANDOFF.md)의 보고이며 이번 재실행 결과가 아니다.
- 이번 작업의 새 Production 배포·Preview·운영 브랜치 병합: **미실행, 문서 전용 예외**. 개발 브랜치 push가 공개 사이트를 바꿨다는 주장을 하지 않는다.
- 공개 API/실모델 호출·실제 원본 PDF/XLSX 재현: **미실행**. 기존 공개 AI 비활성과 CP5 품질 동등성 미충족 상태를 바꾸지 않았다.
- 앱 운영 미확인·보안 권고는 과거 인계에 유지한다. 이번 문서 변경의 미해결 장애는 없다. 구문 확인한 배포 실행 예제를 이번에 실제 배포하거나 실환경에서 새로 실행한 것은 아니다. 후속 문서 커밋에서 예제도 브랜치·clean 검사 후 정상 push하도록 정리했다.
- 복구 대상 스냅샷: 현재 정상 Production `dpl_7Dr8XmmcGiEXMoWZTC7x9qr2y3f4` / 소스 `9318df4`. 향후 배포 직전 다시 조회한다.
- 복구 실행: **불필요/미실행**, 앱 배포를 변경하지 않았다. 복구 후 기능 검사도 N/A.

## Work 전달과 관찰 주체

- 이번 조회·문서 검사·원격 갱신은 **Codex 직접 수행/보고**다. 과거 Work의 문서 확인 기록은 과거 기록이며 이번 Work 독립 재실행을 주장하지 않는다.
- 기준 폴더 https://drive.google.com/drive/folders/1sZI59-IfIveVqP4Fqb2rADkHnEuShsrr 의 `Codex_인계자료`에 이 인계의 원본·최종 커밋 정보를 보관하고, 기존 프로젝트 지식·지침·상시 가이드를 같은 ID로 갱신한다. 저장/readback의 최종 결과는 사용자 응답과 Drive 원본에 기록한다.
- Work의 가이드 전문은 대화에 복사 가능한 코드 블록으로 출력하고 Drive에도 함께 저장한다. 다음 기능은 착수하지 않았다.
