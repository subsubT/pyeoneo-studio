# [WORK HANDOFF] 두 생성 경로 명사형·사실 보존·비교 표시

- 날짜: 2026-11-14 (Asia/Seoul). 관찰 주체: Codex의 코드 읽기/수정 및 Git·Vercel metadata. 아래 구현 설명은 실행 검증 결과가 아니다.
- 저장소: subsubT/pyeoneo-studio / 개발 브랜치 checkpoint-5-local-ai. Cloud 시작 work/master는 2f72e1b369328cb54150484198999628aa84e7ef였으며 개발 최신 64b58a0c96700f6fa94314b218d06063352f608b를 명시적으로 fetch·전환하여 이어감.
- 시작/직전 운영 소스: 86e182589cf880aff73f6a4c5880719c58596a25. 복구 기준: dpl_9nB6NpVAf6w5MfqpXGeSCN7UaJeS / Production READY / aliasError=null / pyeoneo-studio-gf9mx5ne4-subsub-tschool.vercel.app. 공개 도메인 pyeoneo-studio.vercel.app와 pyeoneo-studio-subsub-tschool.vercel.app 연결을 get_deployment로 조회함.
- 팀 subsub-tschool / team_JKZ7B5OCf27pFKiNlhvSVuE4, 프로젝트 pyeoneo-studio / prj_osDdLkgyiAomzS03J2GFM0c2bVB4 / Next.js·Node24.x. list_teams/get_project/list_project_domains에서 ID·accountId·verified 도메인의 projectId를 대조함. CLI를 사용하지 않으며 .vercel/project.json은 없음. 기존 인증 연결의 소스 업로드를 사용함.

## 구현 범위

- lib/sentence-style.mjs: 두 경로의 작업 사본에 재사용하는 알려진 활용/현재·과거·과거명사형/능력·어려움·부정, 직접 수행·참여, 조사·공백, 명사형 형식 검사, 불릿 원천 사본, trim 공백 포함 유니코드 문자 수와 example/actual 길이 기준. 원본 인용문·작품명·수치 내부는 보존함. 받침으로 활용을 추정하거나 전체 예문 정답 매핑으로 처리하지 않음.
- lib/input-example-reference.mjs: 만들기→만드는 활동에 참여함 특수 분기 제거. 독립 과제의 순서·조건을 보존하며 직접 만듦/씀/읽음 등을 연결함. 과제 중복 제거·공통 앞부분 삭제·긴 과제의 포괄 참여문 대체를 제거하여 핵심 유실을 피함. 알 수 없는 활용은 원문 초안에 남겨 교사가 수정함.
- lib/input-examples.mjs / app/components/activity-inputs.jsx: 실제 선택 원천 필드의 원문과 레이블, 불릿 정리 원천의 분량 metadata 제공. 참고 예시의 수정 전/후 표시. 실제 활동 초안 actualSentence의 과거형 규칙은 보존하며 makeExamples는 입력을 자동 덮어쓰지 않음. 실제/참고 각각 기존 복사 조작으로 해당 입력창에 넣고 기존 교체 확인을 유지함.
- lib/prompt.mjs / lib/generation.mjs / lib/server/gemini.mjs: 실제 사실과 핵심 파악→생성→안전한 형식 보정→보정된 동일 후보의 공통 검사·독립 의미 검토. 원본 actual을 evidence의 유일한 근거로 유지하며 실제/예시 작업 사본은 문체 참고임. 생성·검토 모두 명사형과 직접 수행 보존을 요구함. 검토 후 문장을 변경하지 않음. 형식 보정 결과가 기존 1,200자 전송/편집 한도를 넘으면 원래 후보를 현재 검토 대상으로 유지하여 배치 자체가 사라지지 않게 함.
- lib/core.mjs / lib/batch.mjs: 금지어(또박또박 추가)·완전중복·근거·qualifier 검사 및 승인 문체 기준 공통화. 1~1.5배 이탈은 warnings만 생성하며 숨김·삭제·자동 재생성·보충 호출 없음. 예시와 높은 유사도는 거절 근거가 아님. 단계별 수·분포/합계 1~24·보관120·기본12 균등·actual trim1자/example 선택은 보존함.
- app/page.jsx / app/style.css / lib/restore.mjs: AI 입력 example(없으면 actual) 원문을 비교용 metadata로 보관·복원하며 같은 수정 전은 목록 위에 한 번 표시함. 번호별 수정 후 편집 목록과 기존 접근성 이름·개별 복사 유지, 전체 후보 복사는 문장만 줄바꿈으로 연결함. text에 레이블/번호/버튼 문구를 넣지 않음. 전체 확인 체크 하나/원자 일괄 승인/승인 전용 조합·XLSX·복원 재승인을 유지함. 기존 후보·승인 text는 읽기/복원만으로 보정하지 않음.
- AGENTS.md / docs/STATUS.md / docs/PRODUCTION-OPERATIONS.md: 이번 명사형·직접 동사·길이·검증 생략을 최우선 규칙으로 추가하고 과거 기록은 보존함.

## 미실행·한계

사용자 지시로 자동 테스트/회귀/정적·비밀값 검사/diff 검사/재현·비교표/로컬·공개 브라우저·기기/API·실모델/별도 검증용 빌드와 새 검증 스크립트 작성 모두 미실행. 실제 모델 호출 **0회**. 목표 예문을 이번에 생성해 확인한 비교표·PASS 수치는 없음. 배포 필수 플랫폼 빌드만 아래 별도 결과로 기록함. 실사용 검증은 사용자 진행.

로컬 규칙은 한국어 전체 형태소·의미 분석기가 아님. 미등록 활용·문맥은 교사 수정과 AI 경로의 독립 검토가 필요함. 입력과 문장의 기존 절대 길이·전송 예산은 유지하므로 매우 긴 원천은 편집이 필요할 수 있음. 길이 비율 자체로 생성·승인을 차단하지 않음. 검토 지적 후보를 강제 PASS/자동 승인하지 않음. 새 외부 교정 API·모델·유료 호출 없음. 기존 모델/플랜/키/플래그/Redisnamespace·카운터·중지키/503/PDF50MB·작업200MB 변경 없음.

## 최종 배포·인계 기록

- 최종 상태: **수정·배포 완료 — 실사용 검증 미실행(사용자 진행)**. 구현/배포 완료와 모델 품질·실사용 확인을 구분함. 이번 두 생성 경로 수정에서 중단함.
- 개발 기능 커밋/실제 배포 커밋: `296e648383fa30c3d70b48bf857d8bafc5209782`. 정상 커밋·push 후 `git ls-remote`에서 개발 원격 HEAD 일치를 확인함. 상태/인계 문서는 후속 문서 커밋이며 앱 소스 재배포 없음. 문서 커밋 SHA는 아래 후속 기록과 최종 응답에 명시함.
- 배포: `dpl_4m5ug5hWU8UPPt1Hq3gduC78hFyB`, target=production, readyState=READY, aliasError=null. 배포 URL https://pyeoneo-studio-d78kq3jiv-subsub-tschool.vercel.app . 공개 URL https://pyeoneo-studio.vercel.app . get_deployment(공개 도메인, withGitRepoInfo=true)에서 같은 ID·소스 SHA·두 alias 연결을 확인했고 get_project의 latestDeployment/accountId도 일치함. 이는 플랫폼 metadata 확인이며 공개 앱 기능 확인이 아님.
- 플랫폼 필수 처리: Vercel CLI65.14.0, Next16.4.3, 기존 캐시 복원·의존성 설치·`node scripts/copy-worker.mjs && next build --webpack` 성공. Build Completed30초, compile7.1초, TypeScript 단계·정적 페이지4/4·build trace·출력 배포 완료. 기존 npm cache-dir 경고만 관찰함. 별도 검증 빌드를 실행한 것은 아니며 보호/CI/hook을 해제하지 않음.
- 전체 배포 차이: 운영86e1825→시작 개발64b58a0은 문서4파일뿐이며 누적 앱 변경 없음. 이번 변경12개 실행 파일 및 정책/인계 문서를 코드 읽기로 검토함. 공개 Git에 정상 push된 정확한 커밋의 실행·빌드 파일35개를 SHA1/size 참조로 배포하고, 변경12개 실행 파일을 직접 업로드함. app/lib/public, package/lock, next.config.mjs, vercel.json, .vercelignore, scripts/copy-worker.mjs만 업로드했으며 문서/검증 스크립트/교육자료/환경/인증 파일은 포함하지 않음.
- 업로드 중 자동 승인 검토: AGENTS.md 전송은 운영 정보 전송의 승인 근거 부족으로 거부되어 해당 문서 및 모든 docs 업로드를 제외함. 실행 소스 첫 전송도 비공개 코드라는 이유로 거부됨. GitHub get_repo로 visibility=public, fetch_file로 위 커밋의 공개 파일을 직접 확인한 추가 근거 이후 동일 실행 파일 업로드가 정상 허용됨. 거부된 경로를 우회하거나 보호 설정을 변경하지 않음. 운영 문서는 공개 개발 브랜치에 보존함. 초기 문서 포함 inline payload 생성은 로컬 도구 출력 제한으로 중단됐으며 실제 배포 요청은1회, 배포 실패는0회임.
- 모델/무료요금제/키/활성 플래그/공유 namespace·한도·중지키/503 처리/파일 한도는 수정하지 않음. 자동 Preview/CI 활성화·master 병합 없음. 현재 설정을 새로 실호출 검증했다고 주장하지 않음.
- 미해결 운영 장애는 관찰되지 않았으나 실사용·의미 품질은 미검증임. 미등록 한국어 활용, 매우 긴 원천, 제한된 로컬 형식 판단, AI 의미 검토 오류 가능성은 위 한계대로 남음. 공개 동작/콘솔/런타임 오류 스캔도 사용자 지시로 미실행함.
- 복구 기준은 시작의 dpl_9nB6NpVAf6w5MfqpXGeSCN7UaJeS/86e1825임. 이번 배포 실패/rollback/복구 실행 없음. 따라서 복구 후 동작 검증도 수행하지 않음.
- Work 전달: 이 저장소 인계 원문과 최종 응답을 전달함. Drive 원본 보관/동일 프로젝트 지식 파일 갱신·readback은 Work 담당 후속이며 이번 Codex가 수행했다고 보고하지 않음.

