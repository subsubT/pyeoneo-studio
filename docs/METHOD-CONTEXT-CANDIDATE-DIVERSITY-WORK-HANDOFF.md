# 수업·평가 방법 결합·AI 후보 중복 억제 WORK HANDOFF — 2026-11-18 KST

[WORK HANDOFF]

상태: **수정·배포 완료 — 실사용 검증 미실행(사용자 진행)**. 이번 기록의 목표·구현 설명은 실행 출력이나 문장 품질 PASS가 아니다.

## 시작과 정확한 소스

- 저장소: https://github.com/subsubT/pyeoneo-studio / 개발 브랜치 `checkpoint-5-local-ai`.
- 환경은 오래된 `work` 브랜치였으며 미커밋 변경이 없었다. 원격 fetch/ls-remote로 최신 개발 `5bc292df012dff761018d7156f986ef26f79d7b2`를 직접 확인하고 그 커밋에서 개발 브랜치를 만들어 작업했다. 요청의 기준 `d2e4c3362e3f14753ad37603c5d2276325006ff9`에서 작업하지 않았다.
- 시작/배포 직전 공개 도메인 직접 조회: 실제 앱 `560a2dcb214665b5bfeed6aba0f2a324fcaebbb3`, Production `dpl_HemDiWvJwBJ5M9AgfRWb3jsLFJMF`, READY, aliasError=null. URL https://pyeoneo-studio-neaa0t4eu-subsub-tschool.vercel.app . 요청의 과거 운영 `658104c`/`dpl_ENNCPSU4iACgdjNBEpQdksAa4br1`보다 최신이다.
- 운영 소스→시작 개발의 차이는 AGENTS/STATUS/PRODUCTION-OPERATIONS/LOCAL-EXAMPLE-CELL-BOUNDARY-WORK-HANDOFF의 Markdown 4파일뿐이었다. 이번 누적 배포 범위는 그 문서 변경과 아래 실행 코드 6파일이다. 최신 PDF 표/열 경계·쪽수 제한 제거·공백/문체 변경을 보존했다.
- 기능/실제 배포 앱 커밋: `0d008b8cb37a20aec535b248aef282f20250b9ff` (`Combine teaching context in examples and constrain candidate repetition`). 정상 commit/push 후 개발 원격 ref의 동일 SHA를 직접 확인했다.
- 최종 운영/인계 문서 커밋은 이 문서를 포함한 후속 문서 전용 커밋이다. 자기 SHA를 넣기 위한 재커밋은 하지 않으며 정확한 최종 원격 SHA는 최종 응답의 [WORK HANDOFF]에 제공한다. 문서 전용 커밋은 앱 재배포하지 않는다.

## 수정 1 — 관련 수업·평가 방법을 두 예시에 결합

- `lib/input-examples.mjs`: 평가 요소를 인식하자마자 반환하던 경로 앞에 방법 결합을 추가했다. 인용·작품명·수치를 보호한 작업 사본에서 `[실험·실습 평가]`, `[서술형 평가]`, `[포트폴리오 평가]`, `[협력적 문제해결력 평가]` 같은 평가유형 태그를 제거한 뒤 기존 공통 과제 분석기를 사용한다.
- 평가 요소와 방법의 관련 어휘 및 추가 구체 수행/도구/대상을 확인한다. 관련 없는 방법을 자동으로 끌어오지 않는다. 평가 요소의 어휘·수식부·분석된 조건이 방법에 포함되고 수행이 대응하면 요약을 중복 나열하지 않는다. 빠진 과제는 유지한 채 방법 과제를 연결한다. 명시적 관련 과제가 없거나 분석이 불확실하거나 입력 한도를 넘으면 기존 교사 편집용 초안 경로를 유지하며 방법 일부를 조용히 자르지 않는다.
- 결합한 과제가 두 개이고 참고 전용 연결부가 아니면 두 문장으로 렌더링하고, 그 외에는 기존 연결형 한 문장으로 정리한다. 실제 활동은 직접 수행의 과거형을 별도로 분석해 렌더링하며 참고 전용 태도 연결/놀이 참여 변환을 섞지 않는다. 참고 예시는 기존 referenceSentence의 만듦/씀/읽음/비교함/설명함 및 놀이 참여 명사형을 유지한다.
- 두 문체의 내용 검사는 각각의 동사 분석과 대조한다. repairSentenceSpacing/repairSentenceGrammar, 원본 referenceSources, 입력 교체 확인, 같은 pair의 미리보기·개별 복사 경로는 유지한다. 기존 교사 입력·보관 후보·승인·복원 문장을 일괄 재작성하지 않는다.
- 사용자 과학 관찰 사례의 설계 목표는 전지 한 개/두 개 직렬 회로에 발광다이오드·전동기·버저 등 부품을 연결해 비교한 구체적 맥락과 경험 나누기를 두 예시에 반영하는 것이다. 이번에 실제 출력해 확인한 예문은 없다.

## 수정 2 — 동일 문장 억제·서술 방향·보정 충돌

- `lib/prompt.mjs`, `lib/server/gemini.mjs`: 생성 지시의 최우선 제약에 배치 내 동일 text 반복 금지, 같은 단계 15개에서도 앞 후보 복제 금지, 원문 그대로는 배치 전체 최대 한 개를 명시했다. 개수/분포·모든 핵심 사실과 함께 지켜야 하며 삭제/빈 문장/과잉 생성 후 자르기를 금지한다.
- `lib/candidate-diversity.mjs`: 6방향의 실제 설명을 문장 시작점, 도구/대상, 수식어/조건절 이동, 동의어·유사 동사, 병렬 연결, 피동/명사구 전환으로 구체화했다. 각 슬롯은 direction과 4종 guide 조합을 받으므로 6개 뒤에도 같은 지시만 반복하지 않는다. 비교→살펴보기/차이점 찾기는 비교 행위·대상까지 보존할 때만, `~한 뒤`는 명시된 순서가 있을 때만 허용한다. 새 사동/원인/결과를 만들어 다양성을 채우지 않는다.
- 단계 description과 양립하는 원문 내 어휘·서술 초점을 선택하도록 안내했다. 매우 잘함/잘함의 확인된 수행 관계, 보통의 수행 대상/과정, 노력 요함의 핵심 과제 서술도 원문과 실제 description이 허용하는 범위에서만 쓴다. 단계 이름으로 정확성·독립 수행·도움·어려움을 창작하거나 핵심을 줄이지 않는다. 근거가 없으면 사실상의 성취 차이를 억지로 만들지 않는다.
- `lib/core.mjs`: 선택한 원문에 직접 수행이 있고 후보만 `비교하는 활동을 함/비교하는 활동에 참여함` 같은 불필요한 포장으로 바뀐 경우 groundingIssues가 알려진 동사/활용 범위에서 지적한다. 원문 자체의 활동 참여 사실은 직접 성취로 바꾸지 않는다. 인용 내용은 이 점검에서 제외한다. 생성/독립 검토 지시에도 같은 약화 금지를 명시했다.
- `lib/candidate-diversity.mjs`, `lib/generation.mjs`: 모델 응답의 문체·공백 보정을 배치 단위로 준비한다. 보정 결과가 충돌할 때 이미 명사형인 원래 표현을 grammar 교정 후 안전하게 유지할 수 있으면 그 표현을 쓴다. 공백 차이만 되돌리거나 과거형/활동 포장을 되살리지 않는다. 남는 완전 중복은 기존 중복 오류 및 보정 충돌 오류를 남기고 전부 교사 편집 목록에 유지한다. 모델이 만든 동일 문장들을 로컬의 임의 동의어로 바꾸지 않는다.
- 최종 text 전부를 기존 로컬 검사→배치 독립 검토 1회에 전달한다. 검토 후 text를 바꾸거나 검토 결과를 재사용하지 않는다. 표현 반복 경고와 사실/핵심/문체 오류는 분리한다. 일괄 승인에서 남은 동일 문장은 기존대로 차단된다.

## 절대 보존 계약

합계 1~24개/단계별 정확한 분포·보관120개·원본 example 우선 generationSource 및 actual 모순 대조·원본 evidence substring/evidenceSource·review-flat-v1/엄격한 index와 참조 검사·단일 전체 확인 체크/원자 일괄 승인·승인 전용 출력·저장/복원 재승인·무료 Gemini `gemini-3.5-flash-lite`/thinking/키/활성 플래그·Upstash 공유 한도/중지키·요청40,000bytes/공유200,000bytes·생성1+독립검토1/503추가1/최대3호출을 유지했다. 추가 AI 재호출/교정 루프·유료 API·의존성·새 UI·master 병합·Preview/자동CI·보호/CI/hook/TLS 해제·force push는 없다.

## 배포와 플랫폼 metadata

- 팀 `subsub-tschool` / `team_JKZ7B5OCf27pFKiNlhvSVuE4`, 프로젝트 `pyeoneo-studio` / `prj_osDdLkgyiAomzS03J2GFM0c2bVB4`의 accountId/프로젝트ID를 get_project로 직접 대조했다. get_project_domain에서 공개 도메인 projectId 일치·verified=true·gitBranch=null을 확인했다. CLI 자동 링크 대신 기존 연결 도구의 SHA1 소스 업로드 경로를 사용했다.
- 깨끗한 기능 커밋의 Git 바이트로 실행 소스40개를 구성했다. 변경6개는 upload_file로 업로드하고 기존34개는 동일 digest 참조를 재사용했다. 문서/테스트/비실행 scripts/교육 원본/작업JSON/환경/인증 파일은 배포에서 제외했다. 소스 manifest SHA256 `c833a75bc60b0b024c2dc9e994b2947a9998cd3d1aba320083eea7d759df1924`; 로컬 패키징 근거 `/tmp/pyeoneo-method-release/source-manifest.json`은 Git 제외다.
- create_deployment는 기존 프로젝트의 target=production, forceNew=1, 일반 `npm run build`, Next.js/Node24.x, 정확한 기능 SHA metadata로 한 번 요청했다.
- Production ID `dpl_4Dmq4AK5su4Tzb45P2ZXnYnHLmzV`, URL https://pyeoneo-studio-pacnqqvug-subsub-tschool.vercel.app . target=production, READY, aliasError=null, 앱 SHA `0d008b8cb37a20aec535b248aef282f20250b9ff`, ref `checkpoint-5-local-ai`. 배포 ID와 공개 https://pyeoneo-studio.vercel.app 을 get_deployment로 각각 재조회해 같은 ID/앱 SHA 연결을 확인했다. get_alias/get_project도 같은 배포와 프로젝트/팀을 가리킨다. list_deployment_files의 실행 소스40/40 SHA1이 기능 커밋의 manifest와 일치하고 목록 잘림이 없다. 이는 배포 출처 확인이며 제품 품질 PASS가 아니다.
- 필수 플랫폼 빌드: Vercel CLI65.15.0 / Node24.x / Next16.4.3, 일반 npm run build(copy-worker→next build --webpack), Build Completed39초, compile14.2초, 플랫폼 TypeScript 완료·정적 페이지4/4·출력 배포 후 READY. 기존 npm cache-dir 및 rimraf/lodash.isequal/inflight/glob/fstream 간접 의존성 deprecated 경고가 있었다. 별도 로컬 빌드/검사/audit는 실행하지 않았다.
- 배포 요청/소스 대조 근거는 로컬 `/tmp/pyeoneo-method-release/production-request.json` 및 `source-metadata.json`에도 남겼다. 최종 문서4파일(AGENTS/STATUS/PRODUCTION-OPERATIONS/이번 인계)은 앱 재배포 없이 정상 commit/push한다.
- 복구 대상으로 시작 Production ID/소스/URL을 위에 기록했다. 빌드/배포 실패·자동 승인 거절·차단·rollback 실행은 없다. 남은 배포 차단/빌드 오류는 없다.

## 미실행·남은 한계·사용자 인계

- **사용자 지시로 별도 자동/단위/통합/회귀/정적/lint/typecheck/비밀값/브라우저/기기/API/실모델 및 검증용 빌드를 실행하지 않았다. 새 테스트/검증 스크립트도 만들지 않았다. 모델 추가 호출 0회.** 코드 읽기·diff 검토·Git 식별/정상 push·배포 패키징/소스 digest·플랫폼 배포와 metadata 조회만 수행했다. Vercel 필수 빌드의 강제 내부 처리는 제품 검증과 구별한다.
- 두 예시의 실제 자연스러움·방법 결합의 범용성, 과학 입력의 실제 출력, 18개(15/1/1/1) AI 후보의 고유 문장 수/단계별 어휘/독립검토 성공·기존 흐름 회귀는 **미검증이며 사용자 실사용 검증 대기**다.
- 방법 결합은 기존의 작은 한국어 활용 사전과 보수적인 어휘/조건 포함 판단이다. 사전 밖 활용·복잡한 조건/중첩절·관계가 애매한 문장·긴 방법은 종전 초안 경로로 돌아갈 수 있다. 어휘 포함은 완전한 의미 분석을 대신하지 않는다. 교사가 계획 원문과 대조해야 한다.
- 프롬프트 강화가 실모델의 고유 문장 수를 보장하지 않는다. 중복·보정 충돌이 남으면 요청 수/분포 그대로 반환해 교사가 편집해야 하며 추가 모델 호출로 숨기지 않는다. 원문에 성취 차이가 없으면 네 단계의 실질적인 성취 차이를 보장할 수 없다. 지시/슬롯 정보 증가에도 요청 예산은 그대로여서 긴 입력은 기존 한도 오류 대상이 될 수 있다.
- 기존 교사 입력/저장된 예시·후보에는 소급 적용하지 않는다. 새로 예시 만들기/후보 생성을 실행할 때 적용된다. 이번 실사용 검증을 하지 않았으므로 기능 PASS/검증 완료/공개 기능 검증 완료로 보고하지 않는다.
- Codex가 직접 확인한 Git/배포 metadata와 과거 사용자 관찰·설계 목표를 구분해 기록했다. Drive 업로드/프로젝트 지식 갱신은 이번 범위에서 실행하지 않았다. Work는 원격의 이 인계 원문을 사용해 기존 보관 경로에 전달할 수 있다. 다음 기능이나 추가 제품 검증에는 착수하지 않는다.
