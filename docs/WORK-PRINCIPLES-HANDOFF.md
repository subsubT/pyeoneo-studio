# [WORK HANDOFF] 1번 묶음 — 원칙 카드 문구 운영 반영

2026-11-10 (Asia/Seoul). **PASS — 공개 사이트 반영 완료.** Codex가 이번 실행에서 구현·검사·push·운영 배포·공개 검증을 직접 수행했다. 2~4번 기능에는 착수하지 않았다.

## 변경과 소스

- 저장소: `subsubT/pyeoneo-studio`, 개발 브랜치: `checkpoint-5-local-ai`.
- 시작 개발 HEAD 및 원격 HEAD: `0640273aa6d6999682524fa8f576059091c30761`. 환경의 초기 `work / 2f72e1b`는 이전 스냅샷이라 사용하지 않았다. 원격 개발 브랜치를 명시적으로 fetch한 뒤 작업했다.
- 개발 기능 커밋과 실제 배포 SHA: **`b8244a89147bf886d9ea05a864ec36600412a778`**. 정상 push 후 `git ls-remote`와 일치 확인.
- 기능 변경 파일: `app/page.jsx`, `app/style.css` 두 개. 기존 카드의 작은 표제·강조 제목·두 본문을 요청한 띄어쓰기/문장부호 그대로 교체했다. 두 제목은 `<br/>`, 본문은 각각 `<p>`로 구분했다.
- 카드 너비 360px(기존 900px 이하 260px 유지), 단어 단위 줄바꿈과 긴 문자열 보호, 두 본문 간격, 장식의 크기/위치만 조정했다. 카드 장식은 보조기술에서 제외했다. 카드 밖 JSX와 CSS가 시작 개발 소스와 동일함을 문자열 비교로 확인했다.
- 650px 이하에서 카드를 숨기는 **기존 동작을 유지**했다. 사용자도 이번 채팅에서 “기존 모바일 숨김 유지 (문구·카드 내부 스타일만 변경)”를 선택해 확정했다. 모바일에 카드가 보인다고 보고하지 않는다.
- PDF·사실 확인·최종 승인·AI 로직 및 다른 화면 안내문은 변경 없음. 공개 AI 비활성과 개발 자동 Preview 차단 유지.
- 운영 `9318df4` → 시작 개발 `0640273` 누적 차이는 15파일(+365/-34): 운영/인계 문서 및 브라우저 검사 스크립트 2개의 환경 프록시 지원이다. 앱·lib·공개 자산·의존성·배포 구성 차이는 없었다. 이번 배포의 실행 코드 변경은 위 카드 두 파일뿐이다.
- 후속 문서 변경: 이 인계와 `docs/STATUS.md`. 문서 전용 커밋이며 앱 재배포 생략. 최종 문서/원격 HEAD는 `git log -1 --format=%H -- docs/WORK-PRINCIPLES-HANDOFF.md`와 최종 채팅 인계에서 확인한다.

실제 카드 문구:

```text
우리의 작업 원칙
활동은 있는 그대로.
평가 문구 예시는 다양하게!
평가 기록의 다양한 예시를 제안해드립니다.
선생님의 평가 업무 수고를 덜어드립니다.
```

## Production 및 복구 기록

| 항목 | 직접 확인 결과 |
| --- | --- |
| 팀/scope | `subsub-tschool` / `team_JKZ7B5OCf27pFKiNlhvSVuE4` |
| 프로젝트 | `pyeoneo-studio` / `prj_osDdLkgyiAomzS03J2GFM0c2bVB4`; accountId와 위 팀 일치 |
| 공개 URL | https://pyeoneo-studio.vercel.app/ |
| 배포 ID | **`dpl_BeUEGz9VvaGzEk9gYaz56RzRRWik`** |
| 환경/상태 | **Production / READY**, `aliasError=null` |
| 배포 URL | https://pyeoneo-studio-myf1hbjvn-subsub-tschool.vercel.app |
| 실제 배포 소스 | `b8244a89147bf886d9ea05a864ec36600412a778` / `checkpoint-5-local-ai` |
| 도메인 | 프로젝트 소유·verified=true 확인. 공개 도메인의 get_deployment 및 get_alias가 새 ID·SHA와 일치 |
| 업로드 검증 | 정확한 원격 커밋의 58파일 업로드. 배포 src 트리의 **58/58 파일 내용 SHA-1**이 Git에서 만든 업로드 바이트와 전부 일치 |
| 소스 manifest SHA-256 | `d4d5c1ac86da91437b130cb9a0a88e6efd603acdd34d2cca5f53c91cd7ce02fb` |
| 빌드 | Next.js 16.4.3 / Node 24.x, Vercel Build Completed 약 31초, Deployment completed |
| 빌드 주의 기록 | 기존 Vercel npm 설정 `cache-dir` 경고 2회. 빌드 성공; 설정 변경하지 않음 |

배포는 [기존 운영 절차](PRODUCTION-OPERATIONS.md)의 검증한 Git 소스 → 명시적 Vercel MCP `create_deployment(files, target=production)` 경로를 사용했다. CLI·Preview·master 병합·자동 CI 활성화·환경 파일 업로드 없음. 기존 Git 연결 조회는 linkedProjects/originConnections 빈 목록이었다.

배포 직전 다시 조회한 정상 복구 대상:

- ID: `dpl_7Dr8XmmcGiEXMoWZTC7x9qr2y3f4`, Production READY.
- 소스: `9318df4b601a72084934a2143b7f02d084b940f7`.
- URL: https://pyeoneo-studio-dp0zvcibl-subsub-tschool.vercel.app
- alias: `pyeoneo-studio.vercel.app`, `pyeoneo-studio-subsub-tschool.vercel.app`.
- 배포 전 기존 공개 사이트의 합성 PDF 선택·원본 canvas·계획 선택/확정·저장/복원 브라우저 PASS.
- **복구 불필요/미실행**: 새 공개 사이트 핵심 장애 없음. 복구 후 검증은 N/A(복구하지 않음).

## 이번에 실행한 검사

로컬: Node 24.19.0, Chromium 154, 검증용 Playwright 1.56.1은 ignored `tmp/tools`에 설치했다. 제품 의존성·lockfile 변경 없음. 모든 자료는 비식별 합성 자료이며 원본 PDF·XLSX·작업 JSON·스크린샷은 Git 제외 `tmp/`에만 보존했다.

| 검사 | 이번 직접 실행 결과 |
| --- | --- |
| `npm ci --cache /tmp/pyeoneo-npm-cache --no-audit --no-fund` | PASS. 잠금 의존성 설치; 기존 의존성 폐기 경고 기록 |
| `npm test` | **41/41 PASS**. 모의 의미 검토·운영 AI 강제 차단·승인 전용 출력·구버전 복원 포함 |
| `node scripts/check-secrets.mjs` | PASS. 배포 소스 58파일; 환경 파일·교육 자료 및 알려진 비밀값 패턴 미검출 |
| `npm run build` | PASS. 카드 최종 스타일 수정 후 production 빌드 재실행 |
| `git diff --check` | PASS |
| 카드 영역 한정 비교 | PASS. 카드 JSX와 `.principle` CSS를 제외한 코드가 시작 개발 소스와 동일 |
| 카드 브라우저, 로컬 및 공개 | **PASS**. 다섯 문구·작은 표제/강조 제목/별도 본문 순서·이전 카드 문구 제거 확인. 1440/1024/900/768/700/651/650/390/320px에서 가로 넘침 없음. 보이는 카드의 모든 텍스트 경계가 카드 안에 있음; 1440·651·390px 스크린샷 직접 시각 확인. 650px 이하 기존 숨김 유지 |
| `scripts/release-plan-browser.mjs`, 로컬 및 공개 | PASS. 합성 PDF 선택·추출 원문·canvas, 누락 항목 3개 편집·2개 선택/1개 제외·확정, 네 수준 기준·참고 XLSX 읽기, v2 원본 바이트·선택 상태·저장/복원, 계획 수정 시 재확정 |
| `scripts/input-examples-browser.mjs`, 로컬 및 공개 | PASS. 독립 복사·직접 입력·수정·교체/취소·항목 전환·승인 해제·조합 순서·XLSX 재열기·저장/복원. 후보 POST 3회는 **브라우저 모의 응답**, 실제 모델 아님. 브라우저 외부 요청 0 |
| 추가 직접 작성 전체 흐름, 로컬 및 공개 | PASS. 위 PDF 확정 작업을 복원 → 두 항목 활동/예시 직접 입력 → 사실 확인 → 직접 후보 추가 → 후보별 승인 → 선택 순서 조합 → 클립보드 복사 → XLSX 다운로드/재열기 → 원본 PDF 포함 작업 저장/복원. 미승인 후보가 조합·복사·XLSX에 없음. 복원 후 입력 보존·기존 승인 후보 전환·재승인 필요 확인. 이 흐름은 **모의 응답도 실모델 호출도 없음** |
| 실제 production `/api/generate` | 로컬/공개에서 모의 처리 없이 GET `enabled=false`, POST **503**. 화면의 연결 대기·직접 작성 경로 유지 |
| 브라우저 콘솔 | 기존 두 회귀와 카드 검사에서 오류/경고 0 |
| Vercel runtime error/fatal 로그 | 새 배포 ID·production·최근 30분 필터 조회: 해당 로그 없음. 장기 관측 결과로 확대 해석하지 않음 |
| 도름스체크 v0.3.1 | 기존 승인 버전으로 detect 및 공개 scan 재실행. **확인 30·미확인 5·해당 없음 1, fail 상태 항목 0**. 전역 설치·훅·배포 차단 추가 없음 |

공개 브라우저 최초 시도는 `ERR_CERT_AUTHORITY_INVALID`였다. 환경 프록시 CA를 Chrome NSS 저장소에 신뢰 등록하고 해당 저장소의 정상 쓰기 권한을 부여한 실행으로 해소했다. TLS 검증·프록시·배포 보호는 유지했다. 처음 실패를 최종 성공과 구분한다. npm 최초 설치는 기본 캐시가 읽기 전용이라 실패하여 writable 임시 캐시를 지정해 완료했다.

도름스체크의 미확인 5개(HTTP→HTTPS, TLS 세부 버전, 개인정보처리방침, Supabase/Firebase 접근 설정)는 PASS가 아니다. 이 앱은 두 DB를 사용하지 않는다. 기존 CSP/CORS/약관/OG/canonical/API 접근/worker 패턴 권고를 유지한다. PDF worker의 패턴 4건은 이전 인계와 같은 의존성 코드이며 PDF `isEvalSupported:false` 설정·의존성 변경 없음. 이 최소 검사를 전체 안전 보증으로 보고하지 않는다.

## 근거와 재현

실행 디렉터리: `/workspace/pyeoneo-studio`. 브라우저 공통 환경:

```bash
PLAYWRIGHT_MODULE=/workspace/pyeoneo-studio/tmp/tools/node_modules/playwright/index.mjs
BROWSER_EXECUTABLE=/usr/bin/chromium
```

`TEST_BASE_URL`은 로컬 `http://127.0.0.1:3006` 또는 공개 URL, `TEST_OUTPUT_DIR`은 아래 ignored 경로를 사용했다. 공개에서는 환경 HTTPS 프록시·CA 신뢰를 유지했다.

- `tmp/principle-local-card/`, `tmp/principle-public-card/`: 너비별 스크린샷과 `result.json`; 일회성 검사 `tmp/principle-browser.mjs`.
- `tmp/principle-local-plan/`, `tmp/principle-public-plan/`, `tmp/principle-before-public-plan/`: PDF·작업·원본 화면·`result.json`.
- `tmp/principle-local-examples/`, `tmp/principle-public-examples/`: `browser-result.json`, 모의 요청, 작업 JSON, 승인 XLSX.
- `tmp/principle-local-full/`, `tmp/principle-public-full/`: 직접 작성 전체 흐름 결과·XLSX·원본 포함 작업; 일회성 검사 `tmp/principle-full-flow.mjs`.
- `tmp/release-production/`: 원격 소스 manifest 및 배포 요청 payload. 비밀값·로컬 환경 파일 없음.
- `tmp/principle-dorms-detect.log`, `tmp/principle-dorms-public.log`, `tmp/principle-dorms-public.json`, `tmp/principle-dorms-public.md`: 이번 최소 검사 기록.

## 미실행·미해결·Work 전달

- 실제 교육 원본 재현: 미실행. 이번 요청에 따라 합성 PDF/XLSX로 검사했다. 합성 PDF는 지원하는 평가표가 없어 추출 원문/원본을 확인한 뒤 항목을 직접 추가했다. 실제 평가표 자동 추출 품질을 이번에 새로 입증한 것은 아니다.
- 실모델·성능·비용 시험: 미실행. 이번 1번 묶음 범위 밖이며 공개 AI 차단 유지가 요구사항이다. 기존 CP5 품질 동등성 미충족을 변경하지 않는다.
- 2번 드롭, 3번 사실 확인 제거, 4번 공개 AI 활성화: **미착수**, 이번 요청 범위 밖. 새 유료 계약·증액·DB·스키마·권한 변경 없음.
- 모바일 카드 신규 표시: 미실행. 기존 숨김 정책 유지. 모바일 일반 레이아웃과 가로 넘침 검사는 실행했다.
- 핵심 미해결 장애 없음. 기존 보안 검사 미확인/권고는 위에 구분했다.
- 이 문서와 최종 채팅이 Codex 인계 원본이다. **Work 직접 재실행·Google Drive 보관·같은 프로젝트 지식 갱신은 아직 수행하지 않았으며 Work 담당 후속 단계**다. 기준 폴더의 `Codex_인계자료` 보관 및 지식 갱신/readback 결과를 임의로 완료 처리하지 않는다.
- 이 실행은 인계 후 중단한다. 다음 기능은 사용자 지시 후 착수한다.
