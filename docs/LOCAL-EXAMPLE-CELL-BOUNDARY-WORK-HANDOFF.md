# PDF 열 경계·로컬 예시 — WORK HANDOFF

2026-11-17 KST / Codex 직접 구현·운영 처리. 현재 구현·코드 검토 완료, 배포 대기. 기능 PASS/실사용 검증 완료가 아니다. 사용자 요청 원본 사본은 [가이드](LOCAL-EXAMPLE-CELL-BOUNDARY-GUIDE.md)에 보존했다.

## 시작·대상·누적 변경

- 저장소 https://github.com/subsubT/pyeoneo-studio / 개발 `checkpoint-5-local-ai`.
- 시작 개발 HEAD `a2c91b92ab05accbb0237d6f6fbecf2b62758c8a`. 초기 Cloud 스냅샷 `work`/`2f72e1b`은 미커밋 변경이 없어 fetch 뒤 최신 개발 브랜치로 전환했다. 강제 초기화/기존 변경 되돌리기는 없다.
- 시작 운영/복구 대상 앱 `0f4dd65f5673eb9f9fda29cf74458e3e1108fb86`, Production `dpl_CpDuC3NmTvz1reNWmbrhjwGqAQz4` READY·aliasError=null.
- 복구 URL https://pyeoneo-studio-8j8gv3yxf-subsub-tschool.vercel.app / 공개 https://pyeoneo-studio.vercel.app 동일 배포 연결을 metadata로 확인했다.
- Vercel 팀 `subsub-tschool`/`team_JKZ7B5OCf27pFKiNlhvSVuE4`, 프로젝트 `pyeoneo-studio`/`prj_osDdLkgyiAomzS03J2GFM0c2bVB4`, Next.js/Node24.x. 실제 팀·프로젝트·도메인 조회 일치, 도메인 verified·gitBranch=null. Git 연결 조회 linkedProjects=[]·originConnections=[]이므로 기존 SHA1 파일 업로드 Production 경로를 유지한다.
- 운영 앱→시작 개발의 누적 변경은 AGENTS/STATUS/운영 절차/쪽수 제거 인계의 문서4개뿐이다. 앱 실행 코드는 같고 최신 쪽수 제한 제거/셀 내부 띄어쓰기를 보존했다.

## 변경 파일·함수·동작

- `lib/pdf-table.mjs` 신규: `pdfTableLines`는 설치본 PDF.js5.4.624의 makePathFromDrawOPS/CanvasGraphics.constructPath/worker buildPath API를 읽고 구현했다. constructPath 내부 DrawOPS0~4를 해석하며 OPS.moveTo 배열로 오인하지 않는다. save/restore·transform·Form XObject matrix·viewport 좌표를 적용하고 선/좁은 채움 사각형을 읽는다. clip 전용 경로는 표 선으로 쓰지 않는다.
- `planTableRegions`는 실제 선과 7개 헤더(성취기준·단원명·평가영역·평가요소·방법·기준·시기)를 각각 대조한다. 분리된 헤더 토큰을 셀 안에서 모으고 앞 두 제목의 단일 scale/고정 좌표 배열을 없앴다. 작은 도형 틈은 합치고 일부 끊긴 세로선은 실제 선의65% 이상 범위 및 전체 헤더/행 텍스트 폭 증거가 맞아야 허용한다. 제목 중심 중간값/특정 PDF·쪽·단어 좌표 예외는 없다.
- 외곽/열·기준의 라벨/설명·시기를 독립 구획하고, 과제 필드 전체를 가로지르는 가로선은 항목 경계, 기준 내부 가로선은 단계 경계로 구분한다. 한 셀 안에서만 기존 pdfCellText의 줄바꿈/어절 복구를 수행한다.
- `partitionPlanPage`/`lib/core.mjs:parsePlanPages`: 토큰 폭/겹침/높이/방향으로 단일 셀 배정을 확인한다. 토큰을 자르거나 복제하지 않는다. 행/단계가 불명확하면 해당 행은 성공 항목으로 확정하지 않고 전체 원문과 직접 편집에 남긴다. 토큰ID별 header/field(시기 포함)/level-label/whitespace/outside-table/review 및 독립 불릿 kind를 브라우저 내부 extractionAudit로 추적한다. 서버에 교육 본문/토큰을 로그하지 않는다.
- `lib/files.mjs:readPdf`는 텍스트와 도형을 동일 viewport 좌표로 옮기며 순차 전체 쪽 처리·원본 PDF/Base64·cleanup/destroy를 유지한다. 도형 정보 판독 실패도 원문을 보존한다. 원본 PDF 바이트/시각 줄·열이 보이는 rawPdfText는 조사/활용 교정과 분리한다.
- `app/page.jsx:uploadPdf`, `app/components/plan-review.jsx`, `lib/restore.mjs`: 부분 추출/불확실 페이지를 원문 검토 필요로 안내하고 전체 원문의 각 쪽에 표시한다. 선택적 page.reviewRequired를 v2 저장/복원하며 v1/기존 파일은 그대로 호환한다. 항목 자동 삭제/기존 입력 재작성/모든 업로드 차단 정책은 없다. 기존 최종 serializeProject 사전 검사 후 상태 반영을 유지한다.
- `lib/input-task.mjs` 신규: 기존 reference의 어휘/절 분리/목표 연결 규칙을 공통 분석으로 이동했다. 명사 나열·수식절 내부 쉼표/와·과/및/PDF 줄바꿈은 완결 수행이 확인될 때만 과제 경계로 쓴다. 및의 두 글자 분리도 처리한다. 절별 동사/연결 수행·목적어와 수식부·조건/부정/도움/리터럴 위치와 원천을 갖는다. original sourceRange는 정확한 필드 전체 구간이며 좁은 문자 대응이 불가능한 경우 임의 좌표를 만들지 않는다. workingRange는 일치가 확인될 때만 제공한다.
- `lib/input-examples.mjs:actualSentence/createInputExamples`, `lib/input-example-reference.mjs:referenceSentence`는 같은 분석 객체의 head와 verb를 사용한다. actual은 사전의 과거형, reference는 동사별 현재 ~ㅁ/음.으로 렌더링하며 모든 동사를 함으로 통일하지 않는다. 원천의 명사 선택지/반복 어구도 보존한다. 끝 동사 앞 head에 남는 정리하고/수식절 등도 유지하며 발표를 참여로 바꾸지 않는다.
- `lib/sentence-style.mjs:repairSentenceGrammar`의 새 taskObjects 옵션은 로컬 새 예시에서만 켠다. 점/사실/이유의 목적어 자리는 인접 발표/설명 등 동사와 보고, 점은 명시 수식부/나열 문맥까지 확인한 뒤 accusativeParticle을 쓴다. 사실과의 중간 명사·점은/점에서/점을·숫자 소수점/점수·보호된 인용/제목에는 전역 치환하지 않는다. AI의 기존 기본 호출은 이 옵션을 쓰지 않는다.
- `taskContentIssues`는 명사형 어미 검사와 별개로 원천 head의 순서·반복·수행 동사·연결 수행/조건/부정/도움/숫자 리터럴 보존을 본다. 조건 수식절 뒤 명사나 나열 목적어가 빠진 제한된 패턴은 불완전으로 표시한다. 모든 한+동사 정규식은 없다. 불확실하면 두 예시 모두 선택한 원문을 인용한 편집 초안으로 제공하며 누락 단어를 추측하지 않는다.
- 원문이 온전히 추출된 경우 반복 표로/수식 명사 점을 보존하고 마지막 점에 목적격을 붙인 뒤 actual의 발표했다./reference의 발표함.을 생성하는 코드 경로다. 가이드 목표 문장은 실행 출력/성공/PASS로 주장하지 않는다.

## 보존 계약·한계

미리보기/복사는 기존 ActivityInputs의 동일 pair.actual/pair.example이다. referenceSources/수정 전 표시는 선택한 원천 필드를 그대로 쓴다. 기존 교사 입력·보관 예시/후보/승인은 읽기/복원 시 자동 교정하지 않는다. 손상된 기존 항목은 원본을 새로 추출·검토한 뒤 예시를 다시 만들거나 직접 수정해야 한다. 참고 예시는 실제 수행 증명이 아니다.

AI example 우선/공란이면 actual, 정확 substring evidence/evidenceSource, 독립 검토·전체 확인·교사 최종 승인·승인 전용 출력·복원 후 재승인은 변경하지 않는다. 모델/키/활성 플래그/무료 팀/프로젝트/공유 한도/중지키·정상2/503추가1·최대3호출·PDF50MB/작업200MB/항목100·PDF10개·예시2,000·XLSX5MB와 다른 한도를 보존한다. PDF 쪽수 상한을 다시 넣지 않는다. 새 API/교정 서비스/형태소 분석 의존성/모델 호출/업그레이드는 없다.

선 없는 표·복잡한 병합 셀·헤더가 다른 표·일부 선/투명도/클리핑/중첩 그래픽·여러 표/회전 세로쓰기 등은 보수적인 원문 검토로 갈 수 있다. 새 표 인식률과 기존 실제9쪽/16항목 유지 여부는 이번 미검증이다. 어휘 사전 밖 불규칙/중첩절/중의성은 범용 문법 보증이 아니며 완결성 판단은 제한된 규칙이다. 긴 원문 인용 초안은 기존 입력 한도 안에서1,800자 발췌이며 referenceSources·원본/전체 원문에는 전체가 남는다.

## 실행과 미실행

코드/설치본 API 읽기·변경 diff 검토·정상 Git/원격/배포 metadata 처리는 Codex 직접 수행한다. 구현 API를 읽기 위해 npm ci --ignore-scripts로 잠금 의존성을 설치했다. 별도 자동/단위/통합/회귀/재현/표본비교·정적/lint/typecheck/비밀값/도름스·검증용 build·브라우저/모바일/API/실모델 시험은 사용자 지시로 미실행이며 새 검증 스크립트도 작성하지 않았다. 모델0회. 플랫폼 필수 빌드/강제 처리만 수행하고 보호/CI/hook/TLS를 해제하지 않는다.

가이드의 원본 표 선/단어 좌표는 이전 분석자가 확인한 근거이며 이번 PDF.js 앱 실행 재현이 아니다. 원본 PDF/사용자 세션 JSON은 이번에 실행하지 않았고 저장소에 넣지 않는다. 기존 잔여30실패도 이번에 재실행하거나 전체PASS로 바꾸지 않는다.

## 배포 결과

개발 기능/실제 배포 SHA, Production ID/READY/aliasError, 공개 도메인, 필수 빌드와 소스 metadata 및 복구 실행 여부는 배포 완료 후 이 절에 기록한다. 최종 문서 인계 SHA는 후속 문서 커밋이며 최종 응답과 Git 이력에서 확인한다.

## Work 연결

현재 프로젝트 지침/상태/운영 문서와 이 인계·가이드 사본을 함께 갱신했다. Work는 원본 인계/가이드를 기준 Drive 폴더에 보관하고 동일 프로젝트 지식 파일에 확정 범위·현재 배포·미검증/한계를 반영한다. Work 직접 재실행/확인과 Codex 보고는 구별한다. 이번 Codex의 Drive/Work 직접 갱신 여부는 최종 결과에 사실대로 기록하며 다른 기능에는 착수하지 않는다.
