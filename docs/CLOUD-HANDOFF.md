# assessment / 평어담 GitHub·Cloud 인계

기준일: 2026-10-28. 기존 공개 저장소 재사용. 이번 작업은 GitHub 보존까지만 수행하며 Cloud 환경 생성·Linux 호환성 수정·실행 테스트·배포·DB 수정은 하지 않는다.

## 프로젝트와 시작 지점

- 원본 로컬 폴더: `C:\Users\덕인초등학교\Desktop\CodexLaptop\assessment`
- 앱/패키지: 평어담 / `pyeoneo-studio`
- 기존 GitHub: https://github.com/subsubT/pyeoneo-studio (public, 공개 범위 유지)
- 이어갈 브랜치: `checkpoint-5-local-ai`. 기본 브랜치 `master`에는 최신 Checkpoint 5·6 개발 내용이 없다. 환경 구성과 작업 시작 때 이 브랜치를 명시하고 체크아웃 결과를 확인한다.
- 이전 시작 시 개발 커밋: `1e4a210` (Checkpoint 6). 인계 문서는 그 뒤의 문서 커밋에 보존한다. 원격 브랜치 최종 커밋을 기준으로 이어간다.
- Production: https://pyeoneo-studio.vercel.app / Vercel scope `subsub-tschool`
- Vercel projectId `prj_osDdLkgyiAomzS03J2GFM0c2bVB4`, orgId `team_JKZ7B5OCf27pFKiNlhvSVuE4` (식별자이며 인증정보가 아님).
- Supabase 없음. 자료·결과 서버 저장 없음. 이전을 위해 DB를 만들지 않는다.

현재 브랜치의 `vercel.json`은 Git 자동 배포를 차단한다. 그대로 유지한다. 사용자 별도 승인 전 production 병합·재배포·공개 AI 활성화 금지. 다른 브랜치를 push할 때도 자동 배포 차단 상태를 먼저 확인한다.

## 현재 상태와 다음 작업

먼저 루트 `AGENTS.md` → [STATUS](STATUS.md) → [CHECKPOINT-6](CHECKPOINT-6.md)을 읽는다. AI 관련 후속 작업은 [AI-LATENCY](AI-LATENCY.md), [CHECKPOINT-5](CHECKPOINT-5.md), [AI-OPERATIONS](AI-OPERATIONS.md)을 함께 확인한다.

Checkpoint 6은 평가계획 추출·편집·선택·확정 → 실제 활동 확인·문장 검토·승인·XLSX의 두 단계를 완료했다. 기존 기록의 36개 검사와 브라우저 결과는 당시 검증 근거이며 이번 이전에서 재실행한 결과가 아니다. Checkpoint 5의 실모델 품질 동등성은 아직 입증되지 않았다. 다음 개발 범위는 사용자와 정하고 이 한계를 유지한다. 계획·수준을 수행 사실로 만들거나 문장을 자동 승인하지 않는다.

## 후속 환경에서 필요한 설정

- JavaScript ESM, Next.js 16.4.3, React 19.2.4, npm 및 `package-lock.json`. 현재 PC 관측값은 Node.js `v24.21.0`, npm `11.19.0`이다. 후속 환경은 이 버전을 재현 기준으로 삼는다. README의 Node 22 계열을 쓴다면 PDF.js 요구 조건 `>=22.3.0`도 충족해야 한다.
- 프로젝트 루트에서 `npm ci`, 이어서 `node scripts/copy-worker.mjs`로 Git 제외 PDF worker를 재생성한다. `npm run build`도 worker 복사를 수행한다. `npm run dev` 자체는 worker를 복사하지 않으므로 새 체크아웃에서 준비를 생략하지 않는다.
- 기존 명령: 개발 `npm run dev`, 빌드 `npm run build`, 시작 `npm start`, 네트워크 없는 검사 `npm test`. 실제 모델 호출 명령 `npm run dev:ai`, `npm run test:ai`는 기본 설치/시작 명령에 넣지 않는다.
- 기본 개발/시작 서버는 `127.0.0.1`에 바인딩한다. Cloud 브라우저의 포트 연결과 호스트 조건은 후속 구성 시 확인한다. 이번에는 호스트·Origin 검사나 바인딩을 수정하지 않았다.
- 패키지 설치에는 npm 레지스트리 접근이 필요하다. 일반 개발·오프라인 검사에는 외부 AI·Vercel·Supabase 인증이 필요 없다.
- 저장소 자체 Skill과 `.agents/skills/`, `.codex/` 설정은 현재 없다. 전역 Skill·공식 플러그인 캐시는 복사하지 않는다. 향후 필요한 자체 Skill만 `.agents/skills/<name>/SKILL.md`에 배치하고 관련 권한·호환성을 확인한다.

| 변수 | 용도와 후속 처리 |
| --- | --- |
| `NVIDIA_API_KEY` | 로컬 실모델 시험의 서버 전용 인증. 기본 Cloud 개발에는 불필요. 실제 값은 업로드하지 않는다. 로컬 PC 승인만으로 Cloud 외부 전송 시험을 자동 실행하지 않는다. 후속 승인 시 환경의 안전한 비밀값 설정으로 제공하고 기존 `.env.local` 로더와의 연결을 검토한다. |
| `LOCAL_AI_ENABLED` | 명시적 시험 opt-in. 기본 미설정. 기존 `dev:ai` 런처가 `true`로 설정한다. |
| `NODE_ENV`, `VERCEL` | 기존 AI 차단 조건. development와 키·opt-in이 모두 필요하고, `VERCEL` 변수가 존재하거나 production이면 차단한다. 차단을 우회하지 않는다. |
| `VERCEL_OIDC_TOKEN` | 기존 PC 인증 환경에 보존. 개발에 불필요하므로 이전·재사용하지 않는다. 후속 배포 승인 시 별도 인증한다. |
| `PLAYWRIGHT_MODULE`, `BROWSER_CHANNEL` | 선택적 브라우저 회귀 검사 설정. Playwright는 package.json 의존성에 없고 기본 채널은 `chrome`이다. 후속 환경에 Playwright·브라우저가 필요하다. |
| `NEXT_TELEMETRY_DISABLED` | 로컬 AI 런처가 `1`로 지정하는 비밀값 없는 옵션. |

실제 모델 대상은 기존 NVIDIA `https://integrate.api.nvidia.com`이며 모델·프롬프트·독립 의미 검증·후보 목표 12개를 유지한다. Cloud의 인증·통신 허용과 로컬 전용 실행 조건은 후속 판단 사항이다. 이번에는 네트워크 정책이나 런타임 설정을 만들지 않았다.

## 자료 분류와 중복 처리

| 분류 | GitHub 보존 또는 제외 방식 |
| --- | --- |
| 앱 코드·구성 | `app/`, `lib/`, `public/icon.svg`, package/lock, Next/Vercel 구성은 기존 이력 그대로 재사용. |
| 규칙·진행 기록 | 루트 `AGENTS.md`, README, `docs/`의 상태·체크포인트·AI 운영·가상 사례 시간/토큰 보고서 보존. 새 인계 문서와 규칙 연결만 추가. |
| 안전한 검사 자료 | 기존 `tests/`의 가상 입력 및 `scripts/` 검사·worker·보고서 스크립트 재사용. 실제 교육 원문을 새 예제로 복사하지 않음. |
| 공통 규칙·Skill | `subsubT/codex-common` README·registry·PC profile 확인. 이 프로젝트 전용 자체 Skill 없음. 공통 저장소 수정·중복 업로드 없음. |
| 공통 참고 원문 | `subsubT/codex-reference-library` README 확인. 이 앱용 원본 등록은 확인되지 않았으며 앱 코드 실행에 필수인 별도 공통 자료 없음. 실제 PDF/XLSX를 이 저장소에 새로 올리지 않음. |
| 비밀값·인증 | `.env.local`, `.vercel/`, 인증·세션·브라우저 상태 제외. 기존 PC 파일 보존. |
| 교육 원본·검증 산출물 | 원본 PDF/XLSX, 추출 원문, 작업 v2 JSON, 캡처·보고서·다운로드는 ignored `tmp/` 또는 기존 로컬 원본 위치에 유지. 업로드하지 않음. |
| 재생성 가능 파일 | `node_modules/`, `.next/`, `.next-local/`, `public/pdf.worker.min.mjs`, 로그·검사 캐시 제외. 기존 `.gitignore` 유지. |
| 로컬 임시 분석 도구 | ignored `scripts/inspect_sources.py`는 Windows Downloads의 실제 원본에 의존하는 일회성 도구. 원본 파일은 유지하고 업로드하지 않음. 앱 실행에 불필요. |

공통 규칙의 단일 원본은 [codex-common notebook AGENTS](https://github.com/subsubT/codex-common/blob/a08877e521bbd55f43edb84beea28745a3e06c15/profiles/notebook/AGENTS.md)이다. 현재 사용자가 제공한 DoRms 규칙과 일치함을 확인했다. 후속 환경에서 전체 공통 규칙이 필요하면 이 고정 커밋과 접근 권한을 사용해 명시적으로 제공한다. URL만으로 규칙이 적용되지는 않는다. 핵심 보호 규칙은 프로젝트 `AGENTS.md`에도 명시했다. 공통 registry의 다른 프로젝트용 Skill은 이 앱의 의존성이 아니다.

원본 PDF/XLSX가 없으면 당시 16항목·168예시의 정확한 브라우저 재현은 불가능하다. 필요 시 사용자가 적법하게 제공한 자료를 Git 밖에서 사용한다. 작업 JSON에는 원본 PDF·추출 원문·제외 항목까지 포함되므로 공개 예제로 쓰지 않는다. `checkpoint5-secrets.mjs` 같은 일부 과거 검증 도구는 ignored `tmp/`의 당시 fingerprint·결과에 의존해 새 체크아웃에서 바로 재현되지 않는다.

## 이전 확인 범위

기존 저장소·브랜치·Git 이력을 재사용하고 기존 원격 커밋과 중복 업로드하지 않는다. 문서 변경만 검토·비밀값 검사 후 동일 개발 브랜치에 commit/push한다. 원격 최종 커밋 일치, 미전송 커밋·미커밋 변경 없음, 신규 인증정보·민감 원문 제외, 로컬 환경 파일 보존을 확인한다. 이번 이전의 근거는 ignored `tmp/cloud-migration/`에 보관하며 업로드하지 않는다. 기능 전체 검사·실모델 호출·도름스체크·배포는 실행하지 않는다.

후속 Cloud 설정의 공식 참고: [OpenAI Cloud environments](https://learn.chatgpt.com/docs/environments/cloud-environments). 저장소·패키지 설치·환경변수와 비밀값·통신 허용을 후속 환경에서 구성한다. 개인 PC Skill은 Cloud에 자동 동기화되지 않는다. 이번 단계에서 환경을 생성하거나 실행 검증하지 않았다.
