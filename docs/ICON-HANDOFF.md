# [WORK HANDOFF] 인용부호 그릇 아이콘·파비콘 교체

2026-11-10 KST. **PASS — 공개 사이트 반영 완료.** 실제 브라우저 탭 UI 표시는 미검증이며, 사용자 지정 대체 근거인 새 세션 head·자동 파비콘 요청·자산 시각 대조를 확인했다.

## 소스·배포·복구

| 항목 | 이번 직접 확인 |
| --- | --- |
| 저장소 / 개발 브랜치 | `subsubT/pyeoneo-studio` / `checkpoint-5-local-ai` |
| 시작 로컬 | `work` / `2f72e1b369328cb54150484198999628aa84e7ef`, 미커밋 변경 없음. 오래된 스냅샷이므로 개발 원격을 fetch하고 새 로컬 개발 브랜치에서 이어감 |
| 시작 원격 개발 / 실제 운영 소스 | `394ad428568d32e15faecb2400c96ad15e64b32c`. 운영 업로드 69/69 파일의 SHA1이 이 Git 소스의 실제 바이트와 일치 |
| 개발 기능 / 실제 배포 SHA | **`f39d0e16539c5b1495b573c3e9310fdb47f2d3eb`**. 정상 커밋·push 후 원격 SHA 일치 확인 |
| 문서 / 최종 원격 SHA | 이 파일과 STATUS를 함께 갱신한 후속 문서 커밋. 정확한 SHA는 최종 채팅과 `git log -1 --format=%H -- docs/ICON-HANDOFF.md`로 확인. 문서만 변경하여 앱 재배포 생략 |
| Vercel 팀 | `subsub-tschool` / `team_JKZ7B5OCf27pFKiNlhvSVuE4` |
| 프로젝트 | `pyeoneo-studio` / `prj_osDdLkgyiAomzS03J2GFM0c2bVB4`, accountId·공개 도메인 projectId/verified 일치 |
| 새 배포 | **`dpl_2GokWbQsbdS12Dji6NUXqxDBYgV5` / Production / READY / aliasError=null** |
| 배포 URL | https://pyeoneo-studio-ijyjbmpov-subsub-tschool.vercel.app |
| 공개 URL | https://pyeoneo-studio.vercel.app/ — 새 배포 ID·소스·alias 일치 |
| 배포 전 정상 복구 대상 | `dpl_Dqa8RS4QAUZWuqSodvwY6J1iNgCn`, 소스 `394ad428568d32e15faecb2400c96ad15e64b32c`, Production READY, aliasError=null |
| 복구 URL / alias | https://pyeoneo-studio-mdtrj0wre-subsub-tschool.vercel.app / `pyeoneo-studio.vercel.app`, `pyeoneo-studio-subsub-tschool.vercel.app` |
| 복구 실행 | 불필요·미실행. 공개 핵심 장애 없음 |

`AGENTS.md → STATUS → PRODUCTION-OPERATIONS`와 최신 공개 AI 인계를 읽고 시작했다. 운영 SHA에서 배포 SHA까지 전체 차이는 아래 구현 7파일뿐이며 미검증 누적 변경은 없다. 최근 입력 확인 제거·공개 AI 준비 코드, 제공사·대기열/한도·최종 승인 흐름을 유지했다. 실제 공개 API는 여전히 GET enabled=false / POST 503이며 이번 작업이 AI를 활성화하거나 되돌린 것은 아니다.

기존 Vercel `create_deployment(files=…, target=production)` 소스 업로드 경로를 사용했다. 이전 실제 소스와 일치하는 65파일의 digest를 재사용하고 변경 7파일만 `upload_file`로 올렸다. 최종 **72/72 업로드 파일 SHA1과 검증한 Git 소스 manifest 일치**. 배포 metadata만으로 소스 일치를 판정하지 않았다. master 변경·force push·Preview 제작·Git 배포 설정 변경 없음. `vercel.json`의 개발 자동 Preview 차단을 유지했다.

## 변경 파일·자산 관리

| 파일 | 변경 |
| --- | --- |
| `public/icon.svg` | 유일한 편집 원본, `viewBox="0 0 1000 1000"`, 둥근 정사각형이 전체 viewBox를 채움. 배경 `#245B48`, 인용부호·그릇 `#FFFDF5`, path 3개. 폰트·이모지·문자·외부 참조 없음 |
| `public/favicon.ico` | 위 SVG에서 생성한 16·32·48px RGBA PNG 프레임 3개 포함 |
| `public/apple-touch-icon.png` | 위 SVG에서 생성한 180×180 PNG |
| `scripts/generate-icons.mjs` | `npm ci` 후 `node scripts/generate-icons.mjs`로 재생성. 기존 Next 의존성의 sharp 사용, 새 제품 의존성 없음 |
| `app/page.jsx` | 상단 ‘담’ 대신 같은 SVG를 img로 표시. `alt=""`, `aria-hidden="true"`; 홈 링크의 이름 `평어담 처음으로`와 href 유지 |
| `app/style.css` | 기존 배경·비대칭 모서리 제거. PC 39px·모바일 32px, 제품명 간격 12px 유지 |
| `app/layout.jsx` | ICO·SVG·Apple metadata에 type·sizes·고정 버전 쿼리 명시 |

첨부 이미지의 바깥 밝은 캔버스·질감·명암을 제외하고 곡률·그릇 폭/깊이·여백을 따라 Bézier path로 작성했다. 작은 크기의 구분을 위해 인용부호를 좌우로 각각 viewBox 12단위만 벌렸다. 별도 작은 크기 원본을 만들지 않았다. 상단 외 다른 브랜드 그림, manifest·설치 아이콘·서비스 워커·수동 link·`app/favicon.ico`·`app/icon.*`는 최신 소스 전체 검색에서 없었다. 제품명·문구·PDF/계획/입력/후보/승인/조합/출력/복원 로직 변경 없음.

## 최종 등록 URL과 응답

Next.js **16.4.3**의 `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md` 및 `04-functions/generate-metadata.md`의 icons 절을 읽었다. 공식 [app-icons](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons), [generate-metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)도 조회했다. 기존 public SVG와 metadata 구조를 유지하면서 캐시 버전을 명시하기 위해 명시적 metadata 등록을 사용했다. 파일 기반 자동 등록을 중복 추가하지 않았다.

| rel | 공개 URL | 실제 type / sizes |
| --- | --- | --- |
| icon | https://pyeoneo-studio.vercel.app/favicon.ico?v=quote-bowl-1 | `image/x-icon` / `16x16 32x32 48x48` |
| icon | https://pyeoneo-studio.vercel.app/icon.svg?v=quote-bowl-1 | `image/svg+xml` / `any` |
| apple-touch-icon | https://pyeoneo-studio.vercel.app/apple-touch-icon.png?v=quote-bowl-1 | `image/png` / `180x180` |

로컬 production·공개 HTML head의 위 3개 태그를 직접 확인했다. 각 URL과 버전 없는 `/icon.svg`, `/favicon.ico`, `/apple-touch-icon.png` 모두 HTTP 200·올바른 MIME·원본 파일 SHA256 일치. 기존 `/icon.svg`도 새 디자인을 제공하며 충돌하는 ‘담’ 자산은 없다. 전역 캐시 정책 변경 없음. 이후 디자인 변경 시 원본 수정→생성→세 등록 URL 및 화면 img의 `quote-bowl-1` 버전을 함께 올린다.

자산 SHA256:

- SVG: `5f6a4b6e5528142e01f709dc739681247ed9e102887008cf387e343512bc4fa2`
- ICO: `850cb3f06bcccb1d440cc652fdd982be54d64b41381463b374d6fd6a22aa0808`
- PNG: `a47028ae6ebcd9960f1780f3b52a5ce075400a0780ae7f7db13be308dc16f41e`

## 이번 직접 검증

환경: Node 24.19.0, Next 16.4.3, Playwright 1.62.1, Chromium 154.0.8037.57. 로컬 `npm start -- --port 3006`; 모든 자료는 비식별 합성 자료다. PDF·폰트·작업 JSON·다운로드·스크린샷·배포 payload는 ignored `tmp/`에만 보관했다.

| 검사 | 결과 |
| --- | --- |
| 설치·기존 자동 검사 | `npm ci`, `npm test` **51/51 PASS**, skip/fail 0 |
| production build | 로컬 `npm run build` PASS. Vercel 같은 Next 버전으로 원격 build 성공, READY 확인 |
| 비밀값·변경 범위 | `node scripts/check-secrets.mjs`: 72파일 PASS. `git diff --check` PASS. 환경 파일·학생 자료·인증 파일 추적 없음 |
| 자산 정상 디코딩 | SVG XML·sharp 렌더, Pillow ICO 16/32/48 모든 프레임 및 PNG 180 디코딩 PASS. 재생성 바이트 동일. 16/32/48의 인용부호 영역이 두 도형으로 구분됨 |
| 자산 시각 대조 | SVG 16·32·39·48·180·512, 실제 ICO 프레임·180 PNG 확인. 첨부 형태 및 밝은/어두운 배경에서 시각 검토 |
| 로컬/공개 아이콘 | 각 환경에서 별도 새 Chromium 프로세스 4개(1440/390px × light/dark). 39/32px 정사각형·제품명 중앙 정렬·12px 간격·잘림/가로 넘침 없음, CLS 0, JS/console error 0 |
| 접근성 | Tab으로 홈 링크 첫 포커스·3px outline, Enter로 홈 이동. 접근 가능한 이름 유지, 장식 img 중복 낭독 제외 |
| 실제 head·요청 | 위 3개 rel/type/sizes/URL 일치. 새 세션에서 SVG와 ICO의 자동 favicon 요청(`resourceType=other`) HTTP 200. 버전/무버전 6 URL의 내용 hash 대조 PASS |
| 입력 예시 회귀 | 로컬/공개 모두 예시 생성·각각 복사·수정·교체/취소·항목 전환·직접 후보/최종 승인·순서대로 조합·XLSX 다운로드/재열기·복원 후 재승인 PASS. 후보 POST 3회씩만 브라우저 모의 |
| 계획 회귀 | 로컬/공개 합성 PDF 원문·PDF 바이트/canvas·기준 편집·선택/제외·계획 확정·XLSX 예시·v2 저장복원 PASS |
| PDF 입력 및 대표 흐름 | 로컬/공개 실제 File/DataTransfer와 PDF.js 추출. 선택/드롭 동일성, 오류/복수/10MB/30쪽·동시 입력/10개 원본/40MB 제한, 기존 작업 보존, 계획 편집/재확정→직접 입력·작성→최종 승인→조합/클립보드→XLSX 재열기→PDF 포함 저장/복원 PASS. 키보드/터치/390px PASS |
| 생성 관련 보존 | 로컬 기존 generation-browser PASS: v1/v2 legacy confirmed true/false/누락, 늦은 응답 폐기·중복 요청 방지·오류 시 후보 보존. 모의 POST 13회, 실모델 0 |
| 콘솔·실제 API | 로컬/공개 회귀 JS/console error 0. 손상 PDF의 예상 파서 경고 1건씩만 있음. 모의 없는 실제 GET enabled=false / POST 503 |
| 운영 로그 | 새 배포로 범위를 제한한 Vercel runtime error/fatal 조회에 기록 없음. 로그 부재를 전체 무오류 보증으로 해석하지 않음 |
| 도름스체크 v0.3.1 | 기존 설정·고정 버전 detect/공개 scan 실행. **확인 30·미확인 5·해당 없음 1, fail 상태 항목 0**. 전역 설치·훅·배포 차단 추가 없음 |

도름스체크 공개 첫 요청은 Node 프록시 미적용으로 미확인 4/2에 그쳤고, 기존 인계 방식 `NODE_USE_ENV_PROXY=1`로 TLS 검증을 유지해 재검사했다. 로컬 HTTP 검사기의 암호화되지 않은 연결 표시는 loopback 시험 URL에 대한 것이며, 최종 공개 HTTPS 검사에서는 없다. 남은 미확인: HTTP→HTTPS 강제 전환·TLS 세부 버전·개인정보처리방침·Supabase RLS·Firebase 규칙. DB 두 종류는 앱에서 사용하지 않는다. 기존 CSP/CORS/약관/OG/canonical/API/헤더 관련 권고 유지, 아이콘 범위 밖 설정 변경 없음.

위험 패턴 5건은 기존 PDF.js worker의 4건(상수/컴파일 기능 감지 및 정규식 exec)과 기존 Redis 시험의 `execFile` 1건이다. 실제 PDF 로드/미리보기는 `isEvalSupported:false`, worker에 child_process import 없음. Redis 시험은 분리된 loopback 바이너리와 인자 배열을 실행하며 운영 코드에서 호출하지 않는다. 이번 변경에 새 위험 패턴 없음.

## 근거·미실행·Work 인계

모든 이번 검사·시각 검토의 관찰 주체는 Codex다. Work 직접 재확인으로 표시하지 않는다.

- 비교 화면: `tmp/icon-release/before-after.png` (시작 실제 운영 화면과 새 공개 화면, PC/모바일·포커스 비교).
- 크기/테마: `size-comparison.png`, `favicon-themes.png`, `ico-16.png`, `ico-32.png`, `ico-48.png`, `asset-validation.json`.
- 화면/head/요청: `tmp/icon-release/{before,local,public}/`의 screenshot·`result.json`.
- 회귀: `tmp/icon-release/{local,public}-{examples,plan,pdf}/`의 `browser-result.json` 또는 `result.json`; `local-generation/result.json`. 테스트 로그와 `tests.log`, `build.log`도 같은 상위 폴더.
- 배포: `source-manifest.json`, `deployment-evidence.json`, `production-request.json`; 마지막 파일은 Git 바이트 전체 payload이며 실제 업로드는 동일 SHA의 digest 참조를 사용했다.
- 공개 최소 점검: `dorms-public-proxy.log`, `dorms-public-scan.json`, `dorms-public-report.md`.
- **실제 탭 UI / 북마크 UI: 미검증.** Cloud Desktop 제어 도구가 이 실행에 제공되지 않아 탭 장식 영역을 볼 수 없다. 새 프로세스·빈 세션의 실제 head/자동 favicon 요청과 해시·시각 대조를 대체 근거로 사용했다. 기존 방문자의 이미 저장된 북마크 갱신 시점까지 보증하지 않는다.
- 실제 원본 교육 PDF/XLSX 재현·실모델 호출·공개 AI 활성 검증: 미실행. 이번 작업에 원본 자료/운영 모델 자격 증명이 필요하지 않으며 합성 대표 회귀로 검사했다. 기존 PUBLIC-AI-HANDOFF의 운영 활성화 미해결 사항 유지.
- Cloud 프록시 CA 등록은 처음 자동 승인 검토가 영구 신뢰 변경으로 거부했다. 사용자가 이 Cloud 환경의 CA 등록을 명시 허용한 뒤 확인했다. 제공된 CA는 NSS의 기존 `OpenAI-nebula-dns`와 같은 인증서였으며, Chromium이 DB를 열 수 있도록 해당 디렉터리 접근 권한을 부여해 성공했다. TLS 검증 비활성 플래그·보호 정책 변경 없음. 현재 검증 차단 해소.
- 이번 아이콘 범위의 미해결 장애 없음. 복구 불필요. 문서만 변경한 최종 커밋은 문서/비밀값 검사·push 후 인계하고 추가 앱 배포하지 않는다.
- Work의 Drive `Codex_인계자료` 원본 보관·같은 프로젝트 지식 파일 갱신/readback은 담당 Work 후속이다. Codex가 Drive 보관을 수행했다고 보고하지 않는다. 다음 기능 미착수.
