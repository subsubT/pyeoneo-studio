# 평어담 작업 완료·Production 운영 절차

## 2026-11-12 Gemini 우선 지침

현재 공개 제공사는 Google Gemini Free, 서버 모델 `gemini-3.5-flash-lite`로 전환한다. [현재 설정](PUBLIC-AI-SETUP.md)과 [이번 실행 인계](GEMINI-PUBLIC-AI-HANDOFF.md)가 아래 NVIDIA/미등록 대기 기록보다 우선한다. 사전 검사는 Production Secret을 쓰는 배포별 buildCommand override이며 일반 프로젝트 buildCommand는 수정하지 않는다. 활성 배포에서는 일반 `npm run build`만 실행한다. 실제 Hobby/Fluid/300초 설정을 조회·확인하고 모의/실제/공개 검증을 구분한다. 공유 stop/counters/salt 보존, 실제 외부 생성·검토 최대24회, 공개 실제2배치와 교사 승인·출력까지 완료해야 PASS다.

## 2026-11-12 공개 실호출 실패 복구 기록

Gemini사전검사는통과했으나공개두번째생성에서Google503이발생해활성화완료판정을내리지않았다. 공유stop1/두플래그false, 최종일반build비활성배포 `dpl_ADr4PmG8CyygeqEN5YwKks2aDDRq` READY/도메인/소스/핵심회귀확인. 최초정상대상으로rollback은Hobby의‘직전보다오래된배포rollback은Pro필요’402로거부되어, 유료전환대신승인된새비활성배포로복구했다. stop은현재유지한다. 후속재검사에서는카운터를삭제하지않고두플래그false에서중지키만해제한뒤새명시적실호출예산으로사전검사/공개2배치를수행한다. 이번23/24호출/실패·복구지표는 [Gemini 인계](GEMINI-PUBLIC-AI-HANDOFF.md). 현재공개완료아님.

## 과거 2026-11-11 공개 AI 활성화 지침

사용자가 별도 활동 사실 확인 체크 제거와 공개 AI 활성화를 명시적으로 승인했다. 아래 과거의 공개 AI 비활성 고정/confirmed 필수 지침은 이번 범위에서 대체한다. 계획 확정·후보별 최종 검토/승인·승인 전용 출력은 유지한다. 운영 제공사 권한·서버 키·공유 한도·실제 모델·시간 예산의 **사전 검증**을 통과하면 PUBLIC_AI_VERIFIED/ENABLED를 true로 설정하고 검증 소스를 배포한다. **공개 전체 흐름 검증은 활성 배포 직후의 최종 완료 조건**이다. 실패하면 신규 호출 중지 후 비활성화/복구한다. 사용자 소유 Upstash Free(월 $0, 단일 primary, read region 없음) 생성·연결도 이번 승인 범위다. 추가 유료 계약이나 비용 증액은 별도 결정 대상이다. 현재 준비 구현과 미해결은 [마지막 묶음 인계](PUBLIC-AI-HANDOFF.md)를 따른다.


2026-11-03 (Asia/Seoul) 사용자 확정. 대상은 `subsubT/pyeoneo-studio`, 기본 개발 브랜치는 `checkpoint-5-local-ai`, 공개 URL은 https://pyeoneo-studio.vercel.app/ 이다.

## 승인과 완료 기준

사용자가 승인한 구현은 **구현 → 검증·수정 → 개발 브랜치 커밋·push → 운영 배포 → 공개 사이트 검증 → 결과 인계**까지 한 번에 완료한다. 일반 운영 배포를 매번 다시 승인받지 않고 Preview 제작·사용자 사전 확인을 기본 절차에 넣지 않는다. 과거 문서의 별도 배포 승인·push 후 중단·production 병합 금지는 이번 사용자 결정으로 대체한다. 새 개발 목표와 다음 기능 착수는 사용자가 정한다.

기존 제품 품질·계획 확정·후보별 최종 승인을 보존한다. 공개 AI 활성화는 이번 요청으로 승인되었고, 추가 비용 서비스 도입·파괴적 데이터 변경은 별도 결정 대상이다. 모든 push의 무조건 운영 배포 CI나 개발 브랜치 자동 Preview를 새로 활성화하지 않는다. 문서만 바뀌면 문서 검토·검사·커밋·push·인계로 완료하고 불필요한 앱 재배포는 하지 않는다.

## 최초 적용 시 실제 확인한 배포 경로

다음은 2026-11-03 Vercel 연결 도구에서 직접 조회한 값이다. 다음 배포에서도 재조회하며 고정된 최신 상태로 가정하지 않는다.

| 항목 | 실제 조회 결과 |
| --- | --- |
| Team/scope | `subsub-tschool` / `team_JKZ7B5OCf27pFKiNlhvSVuE4` |
| Project | `pyeoneo-studio` / `prj_osDdLkgyiAomzS03J2GFM0c2bVB4`, accountId는 위 Team과 일치 |
| Framework / Node | `nextjs` / `24.x` |
| 현재 공개 Production | `dpl_7Dr8XmmcGiEXMoWZTC7x9qr2y3f4`, `target=production`, `readyState=READY`, `aliasError=null` |
| 배포 소스 metadata | `githubCommitSha=9318df4b601a72084934a2143b7f02d084b940f7`, ref=`checkpoint-5-local-ai` |
| 배포 URL | https://pyeoneo-studio-dp0zvcibl-subsub-tschool.vercel.app |
| 공개 도메인 | `pyeoneo-studio.vercel.app`, projectId 일치, `verified=true`, `gitBranch=null`. 도메인으로 배포 조회 시 위 ID·소스와 일치 |
| Git 연결 조회 | `get_git_deployment_context`의 이 팀 `linkedProjects=[]`, `originConnections=[]`. 이 조회 결과만으로 임의의 운영 브랜치 자동 배포를 가정하지 않음 |
| 개발 Git 배포 설정 | 추적된 `vercel.json`의 `git.deploymentEnabled.checkpoint-5-local-ai=false` |
| 실제 업로드 경로 근거 | `list_deployment_files`에서 현재 Production의 `src` 트리 확인. 기존 인계의 직접 `files` 업로드 성공 기록과 일치 |

현재 확인된 경로는 **정확한 원격 Git 커밋의 소스를 기존 프로젝트에 Vercel MCP `create_deployment(files=…, target=production)`로 직접 업로드**하는 방식이다. 개발 브랜치 push 자체는 운영 갱신이 아니다. `master`는 과거 공개 운영 이력이며 현재 경로에는 master 병합·push가 필요하지 않았다. 앞으로 실제 운영 경로가 정상 운영 브랜치 병합·push를 필요로 하면 그것도 수행하고 기록한다. 보호 규칙 우회·force push는 하지 않는다.

과거 Git 연결 방식은 `git_info_fail`로 실패했고 같은 소스의 직접 업로드로 성공했다. 상세는 [운영 배포 인계](PRODUCTION-INPUT-EXAMPLES-HANDOFF.md). 현재 `get_project` 응답에는 install/build/root override가 없으므로 그 값을 확인했다고 주장하지 않는다. 기존 프로젝트 설정을 유지하고 실제 빌드 로그를 확인한다. 저장소의 build 명령은 `node scripts/copy-worker.mjs && next build --webpack`이며 worker는 의존성에서 재생성한다. 로컬 `.env`·인증정보를 운영에 복사하지 않는다.

## 시작과 검증

1. 실제 작업 폴더의 브랜치·HEAD·미커밋 변경과 원격 개발 HEAD를 확인한다. 다른 환경의 오래된 `work`/`master` 스냅샷으로 이어가지 않는다. 기존 사용자 변경은 보존한다.
2. Vercel `list_teams`, `get_project`, 공개 도메인의 `get_deployment(withGitRepoInfo="true")`, `list_project_domains`, `get_git_deployment_context`로 팀·프로젝트·환경·운영 소스·도메인·실제 배포 경로를 대조한다. CLI를 사용하면 `.vercel/project.json`도 대조한다.
3. 운영 소스부터 배포 후보까지 **전체** diff·누적 변경을 검토한다. `git diff --stat <운영SHA> <후보SHA>`와 `git diff <운영SHA> <후보SHA> -- app lib public package.json package-lock.json next.config.mjs vercel.json scripts` 등을 함께 본다. 문서/검사 도구 변경과 실행 코드 변경을 구분한다. 알려지지 않은 운영 소스를 추정해 검토를 생략하지 않는다.
4. 구현 후 기존 자동 검사·비밀값 검사·production 빌드·변경 기능 브라우저·영향받는 회귀를 통과시킨다. 코드가 바뀌면 관련 검사를 다시 실행한다. 다음은 기존 명령이다.

```bash
npm ci
npm test
node scripts/check-secrets.mjs
npm run build
git diff --check
npm start -- --port 3006
```

production 서버를 유지한 별도 터미널에서 브라우저 회귀를 실행한다. Playwright와 브라우저는 기존 환경 설치를 사용하고 필요한 `PLAYWRIGHT_MODULE`, `BROWSER_EXECUTABLE`/`BROWSER_CHANNEL`을 지정한다. 준비가 안 됐다면 중요한 미검증으로 보고한다.

```bash
TEST_BASE_URL=http://127.0.0.1:3006 TEST_OUTPUT_DIR=tmp/release-local-examples node scripts/input-examples-browser.mjs
TEST_BASE_URL=http://127.0.0.1:3006 TEST_OUTPUT_DIR=tmp/release-local-plan node scripts/release-plan-browser.mjs
```

예시 생성·각각 복사·수정·교체/취소, 계획 추출·선택·확정, 교사 확인·승인·조합, XLSX 다운로드/재열기, 저장/복원 후 재승인, 모바일과 콘솔을 변경 영향에 맞게 검증한다. 합성 자료와 실제 원본 검사를 구분한다. 후보 POST의 브라우저 모의 응답은 실모델 검증이 아니다. 실제 production API의 상태도 별도 확인한다. 비활성 시 GET enabled=false/POST 503, 활성 시 GET enabled=true/mode=public·Origin 없는 POST 403·허용 Origin의 잘못된 입력 400을 확인한다. 정상 생성 POST는 공개 실모델 브라우저 검사에서만 수행한다.

문서 전용 변경은 diff의 문서 한정 여부·링크·기존 규칙 충돌·비밀값·공백 검사를 수행한다. 앱 빌드/기능 브라우저 회귀/배포를 이번에 재실행하지 않았다면 N/A(문서만 변경)로 기록하며 과거 PASS를 이번 결과로 쓰지 않는다.

## PDF 끌어놓기 회귀 검사

PDF 입력 변경 시 기존 두 브라우저 회귀에 아래 검사를 추가한다. 검증용 Python ReportLab과 한국어 TrueType 글꼴은 시험 환경에서만 사용하며 제품 의존성에 추가하지 않는다. PDF/글꼴/작업 JSON/다운로드/스크린샷은 Git 제외 `tmp/`에 둔다.

```bash
python3 scripts/create-drop-fixtures.py /path/to/korean-font.ttf tmp/pdf-drop-fixtures
TEST_BASE_URL=http://127.0.0.1:3010 TEST_OUTPUT_DIR=tmp/pdf-drop-local node scripts/pdf-drop-browser.mjs
TEST_BASE_URL=https://pyeoneo-studio.vercel.app TEST_OUTPUT_DIR=tmp/pdf-drop-public node scripts/pdf-drop-browser.mjs
```

기존과 같이 `PLAYWRIGHT_MODULE`·`BROWSER_EXECUTABLE`을 지정한다. `TEST_FIXTURE_DIR`로 생성 자료 위치를 바꿀 수 있다. 지원 평가표의 선택/드롭 일치, 실제 DataTransfer 이벤트, 입력 오류/10MB/30쪽/복수 파일/빈 입력, 승인 작업 보존, 처리 중 중복 입력, 10개 원본/40MB 저장 한도, 직접 승인·조합·복사·XLSX·PDF 포함 복원, 키보드/터치를 검사한다. 처리 중 상태 관찰에만 실제 File 읽기를 잠시 지연하며 추출 결과나 API를 모의 처리하지 않는다. 손상 PDF의 예상 파서 경고는 일반 오류와 구분한다.

## 검증한 커밋의 push와 재현 가능한 소스 업로드

검증 완료 소스를 `checkpoint-5-local-ai`에 정상 커밋·push하고 원격 SHA 일치를 확인한다. 아래는 **향후 앱 배포가 필요한 작업에서만** 실행하는 payload 생성 예다. 로컬 HEAD와 원격 개발 HEAD가 정확히 같고 작업 트리가 깨끗해야 한다. 문서 작업에서 실행해 앱을 재배포하지 않는다.

```bash
python3 - <<'PY'
import base64, hashlib, json, pathlib, subprocess

def git(*args):
    return subprocess.check_output(['git', *args])

branch = git('branch', '--show-current').decode().strip()
assert branch == 'checkpoint-5-local-ai', branch
assert not git('status', '--porcelain'), 'Uncommitted changes'
sha = git('rev-parse', 'HEAD').decode().strip()
subprocess.check_call(['git', 'push', 'origin', 'HEAD:' + branch])
remote = git('ls-remote', '--exit-code', 'origin', 'refs/heads/' + branch).decode().split()[0]
assert sha == remote, 'Remote source differs'
files, manifest = [], []
for entry in git('ls-tree', '-r', '-z', '--full-tree', sha).split(b'\0'):
    if not entry:
        continue
    header, raw_path = entry.split(b'\t', 1)
    mode, kind, blob = header.decode().split()
    path = raw_path.decode('utf-8')
    parts = pathlib.PurePosixPath(path).parts
    assert kind == 'blob' and mode in ('100644', '100755'), path
    assert not any(p.startswith('.env') or p in ('.git', '.vercel', 'tmp', 'node_modules', '.next', '.next-local', '.dorms-check') for p in parts), path
    assert not path.lower().endswith(('.pdf', '.xlsx')), path
    data = git('cat-file', 'blob', blob)
    files.append({'file': path, 'data': base64.b64encode(data).decode(), 'encoding': 'base64'})
    manifest.append({'path': path, 'gitBlob': blob, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
payload = {
    'teamId': 'team_JKZ7B5OCf27pFKiNlhvSVuE4',
    'requestBody': {
        'name': 'pyeoneo-studio',
        'project': 'prj_osDdLkgyiAomzS03J2GFM0c2bVB4',
        'target': 'production',
        'files': files,
        'gitMetadata': {'commitSha': sha, 'commitRef': branch, 'dirty': False, 'remoteUrl': 'https://github.com/subsubT/pyeoneo-studio.git'},
        'meta': {'githubCommitSha': sha, 'githubCommitRef': branch, 'githubRepo': 'pyeoneo-studio', 'githubOrg': 'subsubT'}
    }
}
out = pathlib.Path('tmp/release-production')
out.mkdir(parents=True, exist_ok=True)
manifest_bytes = json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=2).encode()
(out / 'source-manifest.json').write_bytes(manifest_bytes)
(out / 'production-request.json').write_text(json.dumps(payload, ensure_ascii=False), encoding='utf-8')
print('source=', sha, 'files=', len(files), 'manifest_sha256=', hashlib.sha256(manifest_bytes).hexdigest())
PY
```

Codex가 생성된 `production-request.json`의 JSON 객체를 인증된 Vercel MCP `create_deployment`의 인자로 전달한다. 실제 도구 이름은 환경에서 검색한다(현재 환경: `mcp__codex_apps__vercel_create_deployment`). 이 절차는 새 자동 배포 CI를 활성화하지 않는다.

업로드 직전 다시 원격 SHA·팀·프로젝트·target과 전체 파일 목록을 확인하고 비밀값 검사 결과와 manifest를 보관한다. metadata만 붙이고 다른 작업 폴더의 파일을 업로드하지 않는다. payload·manifest는 Git 제외 `tmp/`에만 둔다. 파일 크기 등 API 제한이 있으면 같은 커밋의 바이트를 `upload_file`로 올리고 digest/크기를 검증한 `files` 참조를 사용한다. 대상이나 소스가 불명확하면 배포하지 않고 BLOCKED로 기록한다.

## 배포 직전 복구 기록과 배포 후 확인

배포 직전 공개 도메인에서 현재 정상 배포를 다시 조회한다. ID·환경·READY·소스 SHA·배포 URL·alias와 공개 핵심 동작을 기록한다. 위 최초 적용 스냅샷을 영구 복구 대상으로 고정하지 않는다.

배포 요청 후 반환된 ID로 `get_deployment`와 빌드 이벤트를 확인한다. **Production / READY, 소스 SHA, project/team, aliasError 없음**을 모두 대조하고 공개 도메인으로 다시 조회하여 실제 새 ID를 확인한다. BUILDING/QUEUED나 metadata만으로 완료를 선언하지 않는다.

공개 URL에서 새 브라우저 세션으로 변경 기능과 핵심 기존 흐름을 직접 시험한다. 기존 합성 회귀 명령은 다음과 같다.

```bash
TEST_BASE_URL=https://pyeoneo-studio.vercel.app TEST_OUTPUT_DIR=tmp/release-public-examples node scripts/input-examples-browser.mjs
TEST_BASE_URL=https://pyeoneo-studio.vercel.app TEST_OUTPUT_DIR=tmp/release-public-plan node scripts/release-plan-browser.mjs
```

환경 HTTPS 프록시·정상 CA 신뢰를 유지하고 TLS 검증이나 배포 보호를 끄지 않는다. `/api/generate` 실제 차단 상태, 브라우저 콘솔, 배포 이후 런타임 오류도 확인한다. 기존 도름스체크는 기존 승인 범위·설정·고정 버전을 사용하고 실행/미실행/미확인 근거를 인계한다. 검사기의 미확인을 PASS로 바꾸지 않는다.

핵심 운영 장애가 생기면 기록한 직전 정상 배포로 복구한다. 인증된 Vercel의 해당 프로젝트 rollback 경로(정상 CLI 예: `vercel rollback <기록한-배포-URL> --scope subsub-tschool`)를 사용하고 원복할 소스를 임의로 다시 빌드하지 않는다. 도구 권한·보호 규칙을 우회하지 않는다. 복구 후 공개 도메인 연결·Production READY·실제 정상 소스·핵심 브라우저 흐름을 다시 확인한다. rollback이 향후 자동 도메인 할당을 중지할 수 있으므로 그 상태와 후속 정상 promote 필요 여부도 인계한다.

## FAIL/BLOCKED와 결과 인계

필수 검사 실패, 중요한 미검증, 인증·권한 부족, 잘못된 대상, 해결되지 않은 보호 규칙이면 배포를 강행하지 않는다. 가능한 수정·문서화·인계까지 마친 뒤 FAIL/BLOCKED의 이유·미실행 범위·필요 조치를 보고한다. 이미 받은 정상 배포 승인을 반복 요청하지 않되 기술적 차단을 숨기지 않는다.

- 구현·push까지만 끝남: **개발 반영 완료, 공개 배포 미완료**.
- 운영 배포 및 공개 사이트 검증까지 통과: **공개 사이트 반영 완료**.
- 문서만 변경: **운영 문서 반영 완료, 앱 재배포 생략(문서만 변경)**. 기존 배포 상태 조회를 이번 새 공개 기능 검증으로 보고하지 않는다.

```text
[WORK HANDOFF]
판정: PASS / FAIL / BLOCKED, 완료 범위와 위 완료 문구
저장소 / 개발 브랜치 / 시작 HEAD / 최종 원격 HEAD:
개발 기능 커밋 / 실제 배포 커밋 / 운영 문서 커밋 / 인계 문서 커밋:
전체 배포 차이와 누적 변경 검토:
Vercel 팀 / 프로젝트 / 배포 ID / 환경 / 상태 / aliasError:
공개 링크 / 도메인 연결 및 소스 대조:
배포 전 검사: 명령·환경·소스·결과, 모의/실모델 구분
배포 후 검사: 공개 기능·핵심 회귀·API·콘솔·런타임 결과
미실행: 항목·이유·영향 (N/A와 미검증 구분)
미해결: 이유·필요 조치
복구 대상 / 복구 실행 여부 / 복구 후 검증:
근거 위치 및 관찰 주체: Codex 직접 실행 / 과거 Codex 보고 / Work 직접 확인
Work: 인계 원본 보관 링크 / 같은 프로젝트 지식 ID 갱신·readback 결과
```

## Work 전달·Google Drive 보관

기준 폴더: https://drive.google.com/drive/folders/1sZI59-IfIveVqP4Fqb2rADkHnEuShsrr

Work는 `Codex_인계자료`에 날짜·커밋을 붙여 인계 원본을 보존하고 같은 `평어담_프로젝트_지식.md` 파일 ID를 갱신한다. 확정 결정, 완료와 검증 근거, 미해결/미실행, 다음 후보와 착수 조건을 갱신하되 다음 기능에 임의 착수하지 않는다. Codex 보고와 Work가 직접 확인·재실행한 내용을 구분한다. 저장 후 읽기 또는 metadata로 결과를 확인한다.

Work가 작성하는 Codex 가이드·실행 프롬프트는 대화에도 **전문을 복사 가능한 코드 블록**으로 출력하고 `Codex_작업가이드`에 함께 저장한다. 사용자가 파일을 내려받아야만 전달받을 수 있는 방식으로 끝내지 않는다. Drive 실패 시 미반영 범위와 복사 가능한 원문을 제공한다.
