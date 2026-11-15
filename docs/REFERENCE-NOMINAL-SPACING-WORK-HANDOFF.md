# 참고 예시 단어 분절·조사·명사형 종결 WORK HANDOFF — 2026-11-15 (KST)

상태: **수정·배포 완료 — 실사용 검증 미실행(사용자 진행)**. 아래 네 쌍은 사용자 확정 구현 목표이며 이번 실행의 앱 출력·시험 결과·PASS가 아니다.

## 시작·대상·Git

- 저장소: https://github.com/subsubT/pyeoneo-studio / 개발 브랜치 `checkpoint-5-local-ai`.
- 환경 최초 `work`/`2f72e1b369328cb54150484198999628aa84e7ef`의 오래된 master 스냅샷, 미커밋 변경 없음. 원격 개발 브랜치를 fetch하고 시작 HEAD `8c6796f5fce2d14bd29d6f8009b7cdf1ac20e5c7`에서 작업했다.
- 시작 공개 도메인 metadata의 운영 기준: `dpl_9iVW6o1n9cvMf9oe6MBM9vgXgDkJ`, 앱 `df68af8aeccce1d2c5fc20c801e3d4a13d80d2aa`, Production READY, aliasError=null. 이 배포의 AI 정상/품질 PASS를 새로 확인하지 않았다.
- 운영 앱→시작 개발 HEAD의 차이는 HTTP400 인계/상태 Markdown 4파일이며 누적 실행 코드 차이는 없었다. 이번 실행 코드 변경은 아래 4파일이다.
- 기능 첫 커밋 `b8bfc3dca825d1245c10b73a129e93124c284dfb` 뒤, 미등록 기형의 명사 오인을 줄이는 보완을 커밋했다. 최종 기능/배포 앱 SHA: `760d57bab69e4f728c030daa87a1f23e5404b841`. 정상 커밋·push 후 ls-remote에서 같은 SHA를 확인했다.
- 인계·AGENTS/STATUS/운영 요약은 배포 후 문서 전용 후속 커밋으로 push한다. 그 실제 커밋이 최종 원격/인계 SHA이며 최종 응답에 전체 SHA·원격 링크를 제공한다. 자체 SHA 삽입만을 위한 재커밋·앱 재배포는 하지 않는다.
- 팀 `subsub-tschool` / `team_JKZ7B5OCf27pFKiNlhvSVuE4`, 프로젝트 `pyeoneo-studio` / `prj_osDdLkgyiAomzS03J2GFM0c2bVB4`. list_teams/get_project의 accountId, 도메인 projectId·verified=true/gitBranch=null을 읽었다. 기존 `.vercel/project.json`은 없으며 CLI 자동 링크·새 프로젝트 없이 인증된 MCP에 정확한 ID를 지정했다. Git deployment context의 linkedProjects/originConnections는 비어 있어 기존 소스 업로드 경로를 사용한다.

## 구현·반환·복사 연결

- `lib/input-example-reference.mjs`: 원천 작업 사본의 인용/작품명/수치를 먼저 마스킹하고, 불릿/줄바꿈·세미콜론·괄호 깊이와 인식 가능한 서술어 뒤 경계를 보존한다. 각 과제의 공백 복구→어형/목적어/활동 분류→조사/호응→명사형·연결→리터럴 복원의 공통 마무리는 `referenceSentence`다. 쉼표·와/과를 일괄 분할하지 않는다.
- `lib/reference-spacing.mjs`: `protectReferenceLiterals`는 인용·《》/〈〉/「」/『』 작품명·숫자/쉼표/소수/시각/비율을 보존한다. `repairReferenceSpacing(...,{reference:true,forms})`에서만 호기심/발음/플라스틱/빈칸과 명시적 활용 전체의 내부 가로 공백을 복구한다. 발음/호기심/관심/흥미/플라스틱/동물/식물/한글과 분리된 조사를 결합한다. 줄 경계는 먼저 분리하며 한글 사이 공백을 일괄 제거하지 않는다. 미세 플라스틱의 정상 어절 간격은 유지한다. 어형별 정규식은 forms 배열별로 캐시한다.
- `lib/sentence-style.mjs`: 기존 `EVALUATION_VERBS`를 바탕으로 참고 전용 `REFERENCE_VERBS`와 `referenceVerbForms`를 공통화했다. 현재/과거/과거명사형/과제형·연결형과 관형형/며형을 함께 사용해 만들기/만들었다/만들었음/만든다→만듦, 알아보기 계열→알아봄, 가지기/갖기/가졌다/가졌음/가진다→가짐으로 정리한다. 놀이하기·기르기·받기·짓기·눕기·자르기·기다리기·움직이기·가리키기·놀기도 명시했다. 쓰기/읽기 등 기존 어형을 보존하며 하다 복합어의 하였다/했다/한다/하였음도 현재 명사형으로 만든다.
- `evaluationPredicate(...,{reference:true,connective:true})`만 확장 어형·연결/관형 정보와 그림/느낌/기름/도움/걸음/부름의 명사 오인 방지를 사용한다. 옵션 없는 AI 호출의 어형 집합·반환 계약, `prepareSentenceCopy`/`lengthReference`와 공통 저수준 공백 보정의 기본 동작은 유지했다. actual의 과거형 생성 함수는 변경하지 않았다.
- 참고 전용 문맥 규칙: 알려진 목적어 및 낱말/호기심의 누락 목적격 보완, 문장 속 알맞은 낱말→문장에 알맞은 낱말, 이름이 있는 놀이하기→놀이에 참여함. 직접 만들기는 만듦을 유지하고, 동물/식물 창작 목적어의 또는만 쉼표 나열로 정리한다. 다른 선택 조건·actual·AI 사실 근거·인용문의 또는는 바꾸지 않는다.
- `connectGoals`는 원천에 호기심/관심/흥미와 가지기/갖기/기르기/느끼기가 명시되어 있을 때만 앞 수행의 관형형+활동을 통해로 연결한다. 그 앞 활동은 어휘별 ~며형으로 연결할 수 있다. 원천에 없는 태도·칭찬·성취를 넣거나 모든 ~며를 바꾸지 않는다.
- 판별 가능한 미등록 규칙 활용은 기/는다와 받침 ㄴ의 현재 다형에 한정해 현재 명사형으로 정리한다. 미등록 기형에는 목적격 조사 또는 바르게/스스로/함께/직접의 수행 문맥을 요구하고 이야기/비행기 등 명사 예외를 제외한다. 사전 밖 ㄷ/ㅂ/ㅅ/ㅎ 불규칙과 과거 축약형을 임의 복원하지 않는다. 인식 못한 과제/명사 제목은 내용을 보존한 `… 관련 과제를 다룸.` 초안으로 제공한다. 내용 삭제·일괄 참여함·지원 어형만 허용하는 입력 차단/빈 결과를 추가하지 않았다.
- `lib/input-examples.mjs`: 정상/원천 과제 인식/대체 초안/빈 원천 반환 모두 `result`→`referenceSentence`를 거친다. 실제 원천 필드와 `referenceSources` 원문은 그대로다. `referenceIssues`는 최종 생성 문자열의 기존 알림이며 수정 자체를 대신하지 않는다.
- `app/components/activity-inputs.jsx`는 읽고 변경하지 않았다. 수정 후 미리보기는 `pair.example`, 복사는 `onUpdate({example:pair.example})`여서 같은 최종 문장을 사용한다. 수정 전은 `referenceSources.text` 원문이다. 기존 교체 확인·입력 수정 시 승인 해제·문장만 복사 흐름도 유지한다. 가상 참고 예시를 actual 수행 사실로 자동 승격시키지 않는다.

## 사용자 확정 목표 예문 — 실행 결과 아님

1. 전: 선생님의 발음 을 듣고 문장 속 알맞은 낱말을 쓰고, 발음이 같은 다양한 낱말 알 아보고, 소리와 표기가 다른 낱말을 쓰 며 한글에 호기 심 가지기.
   후(목표): 선생님의 발음을 듣고 문장에 알맞은 낱말을 쓰고, 발음이 같은 다양한 낱말을 알아보며 소리와 표기가 다른 낱말을 쓰는 활동을 통해 한글에 호기심을 가짐.
2. 전: 새로운 동물 또는 식물 만들 기.
   후(목표): 새로운 동물, 식물을 만듦.
3. 전: 고양이와 쥐 달리기 놀이하 기.
   후(목표): 고양이와 쥐 달리기 놀이에 참여함.
4. 전: 미세 플라스틱 에 대해 알아보 기.
   후(목표): 미세 플라스틱에 대해 알아봄.

전체 원문 네 개를 키로 하는 정답 매핑은 없다. 네 표본/변형을 실제 실행하거나 비교표/PASS를 만들지 않았다.

## 보존·한계·미실행

원본 PDF/계획/불러온 예시·교사 입력·기존 저장 후보/승인 문장 일괄 교정은 없다. HTTP400 수정의 review-flat-v1·엄격한 로컬 검토·최종 existing 집합/예약 bytes·고정 code/stage를 변경하지 않았다. 후보별 방향·내부 반복 경고/사실 판정 분리·합계1~24/기본12/보관120·교사 승인·무료 모델/키/활성 플래그/공유 한도/중지키·정상2/503추가1/최대3호출·PDF50MB/작업200MB를 유지한다. 새 AI/교정/임베딩 API·유료 서비스·형태소 분석 의존성은 추가하지 않았다.

미지원 한계는 사전 밖 불규칙/축약 과거·중의적 동사/명사·복잡한 중첩절/부정·관심 목표의 먼 지시 관계다. 미등록 명사 제목의 `관련 과제를 다룸`은 구체적 수행을 새로 추정하지 않는 대체 초안으로 문체가 일반적일 수 있다. 이름/그림을 받침 ㅁ만으로 서술 완료로 판단하지 않으며, 모든 한국어 활용을 지원한다고 주장하지 않는다. 마스킹된 내용 자체의 오류는 의도적으로 그대로 둔다. 실제 생성 결과의 자연스러움·경계 판단·미리보기/복사·기존 기능은 이번에 실행 확인하지 않았다.

사용자 지시로 자동/단위/통합/회귀/정적/lint/typecheck/비밀값/도름스/재현/비교/브라우저/기기/API/실모델·별도 검증용 빌드를 실행하지 않았고 새 테스트/재현/검증 스크립트도 작성하지 않았다. 실모델 추가 호출 **0회**. 소스/변경 범위 읽기·Git/원격 식별·배포 digest/크기 생성·플랫폼 metadata 확인만 수행했다. 플랫폼 필수 빌드의 내부 처리는 별도 제품 검증 PASS가 아니다.

## 배포 결과

배포 ID `dpl_4afNCbABPF54H9p3LxBcpYD3kozN`, URL https://pyeoneo-studio-ddzidi3os-subsub-tschool.vercel.app , target=production, READY, aliasError=null. 앱 SHA `760d57bab69e4f728c030daa87a1f23e5404b841`와 개발 ref가 일치한다. 공개 https://pyeoneo-studio.vercel.app 의 get_deployment, get_alias, get_project_domain, get_project를 직접 수신해 같은 배포 ID/앱 SHA·팀/프로젝트·두 alias·verified=true/gitBranch=null을 확인했다. 이는 배포 metadata 확인이며 제품 검증 PASS가 아니다.

필수 플랫폼 빌드: Vercel CLI65.14.0/Node24.x/Next16.4.3, 일반 npm run build(copy-worker→next build --webpack), 캐시 생략(forceNew=1), Build Completed36초·compile12.4초·플랫폼 TypeScript·정적 페이지4/4·출력 배포/캐시 업로드 완료. 기존 npm cache-dir 및 간접 의존성 deprecated 경고가 있었으며 빌드 오류/배포 실패는 없었다. 별도 로컬 빌드/typecheck/audit는 실행하지 않았다.

기술적 차단·자동 승인 거절·미해결 배포 오류·복구 실행은 없다. 최종 배포 직전 복구 기준은 공개 도메인에서 재조회한 1차 배포 `dpl_Ci26n8V2XkR83NFXsEjy734GnrWh`/`b8bfc3dca825d1245c10b73a129e93124c284dfb` READY·aliasError=null이며 AI 정상/문장 품질 PASS 복구 대상으로 부르지 않는다. 복구 기능도 새로 시험하지 않았다. 사용자에게 남은 것은 네 목표/변형·기타 문장 품질·복사/승인/출력 등 실사용 확인이다.

정확한 원격 기능 커밋의 실행·빌드 소스36개를 SHA1/size 참조로 구성했다. 1차 배포에서 변경4개를 upload_file로 올리고 나머지32개의 content-addressed 파일을 재사용했다. 미등록 과제형의 명사 오인 방지를 보완한 최종 배포는 변경1개 업로드/35개 재사용이다. docs/AGENTS/테스트/교육자료/환경·인증 파일은 배포에서 제외했다. manifest SHA256 `35c911f78668af264f4fe3902eeb81669b8556d59b4092bb7c0abc04cbbb3c1a`, 로컬 payload/manifest는 Git 제외 `tmp/reference-nominal-release/final/`다. 기존 프로젝트에 target=production/forceNew=1로 소스별 1회씩 총2회 요청했다. 첫 배포 `dpl_Ci26n8V2XkR83NFXsEjy734GnrWh`/`b8bfc3dca825d1245c10b73a129e93124c284dfb`도 READY·aliasError=null/필수 빌드35초였으며 오류 재시도나 별도 검증 빌드가 아니라 코드 보완 후 후속 배포다. 보호/CI/hook/TLS 해제·master 병합·새 Preview/자동 CI 활성화는 없다.

## Work 전달

인계 전문은 이 파일과 최종 응답에 제공한다. Work가 기존 Drive 기준 폴더 https://drive.google.com/drive/folders/1sZI59-IfIveVqP4Fqb2rADkHnEuShsrr 의 인계 원본과 동일 프로젝트 지식/지침을 갱신할 수 있도록 GitHub 원격 링크도 제공한다. Codex의 Drive 반영/readback은 미실행이다. 실사용 검증은 사용자가 진행하며 이번 수정·배포·인계에서 중단한다.
