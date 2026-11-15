# PDF 줄 경계·두 예시·AI 원문 변형 WORK HANDOFF — 2026-11-15 (KST)

현재: 구현 반영 중, 공개 배포 결과는 후속 기록. 목표 예문은 설계 기준이며 실행 출력이나 문장 품질 PASS가 아니다.

## 시작·대상·누적 차이

- 저장소 https://github.com/subsubT/pyeoneo-studio / 개발 브랜치 `checkpoint-5-local-ai`.
- 최초 환경은 오래된 `work`/`2f72e1b369328cb54150484198999628aa84e7ef`, 미커밋 변경 없음. origin fetch 후 최신 개발 `efc5f344db95aafa90387bc42f02ada02e707c59`로 전환해서 작업했다.
- 직접 조회한 시작 운영: Production `dpl_4afNCbABPF54H9p3LxBcpYD3kozN`, 실제 앱 SHA `760d57bab69e4f728c030daa87a1f23e5404b841`, READY, aliasError=null, URL https://pyeoneo-studio-ddzidi3os-subsub-tschool.vercel.app . 공개 도메인도 같은 ID에 연결되어 있었다. 이는 기존 앱의 품질 확인이 아니다.
- 운영 SHA→시작 개발 HEAD의 전체 누적 차이는 AGENTS/STATUS/PRODUCTION-OPERATIONS/REFERENCE-NOMINAL-SPACING-WORK-HANDOFF의 Markdown 4파일뿐이며 누적 실행 코드 변경은 없다. 이번 배포는 아래 변경 전체를 포함한다.
- list_teams/get_project/get_project_domain/get_git_deployment_context/list_deployment_files를 직접 읽었다. 팀 `subsub-tschool` / `team_JKZ7B5OCf27pFKiNlhvSVuE4`, Hobby. 프로젝트 `pyeoneo-studio` / `prj_osDdLkgyiAomzS03J2GFM0c2bVB4`, accountId 일치, Next.js/Node24.x. 도메인 verified=true/gitBranch=null. 연결된 Git 프로젝트/Origin 없음. CLI 자동 링크 없이 기존 MCP SHA1 소스 업로드 경로를 유지한다.

## PDF 새 추출과 원본 보존

- `lib/files.mjs`: 새 PDF에서 text/x/y/w 외 h, transform 기반 fontHeight, font/fontFamily/ascent/descent, hasEOL, dir, transform을 파싱 시점까지 유지한다. 공백-only/빈 EOL 토큰도 버리지 않는다. PDF.js 전송 전 기존 Base64 원본 보존/50MB/30쪽/cleanup 흐름은 유지한다.
- `lib/core.mjs`: 기존 기준 표의 교과/열/항목 행/평가 단계 앵커 판별은 유지한다. 각 셀과 단계 설명 그룹을 먼저 나누고 `lib/pdf-text.mjs`의 동일한 복구 원칙으로 성취기준/단원/영역/평가 요소/방법/단계 설명을 조립한다. 다른 열/행/단계의 토큰을 단어 복구 입력에 섞지 않는다.
- `pdfLines`는 baseline과 높이로 줄을 묶고 x순으로 정렬한다. 명시 공백과 토큰 폭 사이 실제 간격은 줄 내부 경계에 반영한다. 줄 사이에는 폰트/방향/높이, 수직 간격과 hasEOL, 앞줄의 셀 우측 도달/다음 줄의 좌측 복귀를 함께 사용한다. hasEOL만으로 결합하지 않는다. 불릿/문장 끝/큰 간격/불확실한 배치는 문단 경계를 남긴다.
- 확인 가능한 셀 내부 배치 줄바꿈에서만 알려진 완전 어휘·활용 또는 명사+조사가 줄 경계를 삭제할 수 있다. 정상 어절 경계는 한 칸이다. 한글끼리/한 글자라는 이유로 합치지 않는다. 가로 공백으로 이미 분리된 알려진 단어도 같은 공백 규칙으로 복구한다. 이 단계는 조사 삽입/동사 변경/문장 완성을 하지 않는다.
- `rawPdfText`는 교정 없이 전체 페이지의 줄바꿈과 큰 열 간격(탭)을 보존한다. 저장 source.pages.text/원문 보기는 이 별도 표현을 쓰고, 편집/후속 예시는 셀 작업 문자열을 쓴다. sourceId/page와 원본 PDF로 대조 가능하다. 기존 저장 작업 원문이나 교사 수정 필드에 새 추출 알고리즘을 로드 시 재적용하지 않는다.

## 의미 중립 교정과 두 문체

- `lib/reference-spacing.mjs`의 알려진 어휘/활용 패턴과 명사+분리 조사 복구를 `lib/sentence-style.mjs`의 `repairSentenceSpacing`/`repairSentenceGrammar`로 공통화했다. 완전 어형 목록·생산적인 명사 머리(책/자료/보고서/계획/작품/방법/의견/정보/문장 등)와 타동사 문맥을 조합한다. 예방책 한 단어만 추가하거나 전체 목표 문장을 치환하는 매핑은 없다.
- 공통 타동사 활용/연결/관형형 문맥에서 목적어와 선택적 부사를 구별해 을/를을 보완한다. `accusativeParticle`의 받침 선택을 재사용하고 잘못 붙은 목적격도 알려진 명사에 한해 바로잡는다. 연결절·수식어·마지막 나열 목적어와 만들기/만듦/만들었다 같은 직접 어형을 지원한다. 장소/다른 조사·주어·부사·보어에 일괄 목적격을 붙이지 않는다. 사전 밖 불규칙을 받침으로 추정하지 않는다.
- 인용문·작품명·수치 보호 후 작업 사본을 고치고 복원한다. `미세 플라스틱`, `가정 내에서`, `할 수`의 정상 어절을 일괄 붙이지 않는다. 보호된 고유명/제목 및 알 수 없는 이름은 추정 교정하지 않는다.
- `lib/input-examples.mjs`: 정상 actual, 명사형/현재형 입력의 명시적 활용→과거형, 원천 인식/긴 입력/대체 초안/빈 입력의 모든 result 경로에 공통 교정을 연결했다. 대체 초안을 새 인용으로 감싸기 전에 원천 사본을 먼저 교정한다. 기존 과거형 문체를 유지하고 reference 전용 놀이 참여/동식물 나열/태도 연결을 actual에 적용하지 않는다.
- `lib/input-example-reference.mjs`: 공통 교정 후 기존 reference 전용 연결·현재 명사형을 렌더링한다. 흥미에 고정 을을 붙이던 분기를 없애고 공통 받침 선택으로 바꿨다. 미등록 기형의 명사 예외는 기를 제거한 어간이 아니라 어간+기를 전체 명사와 비교한다. 알려진 대체 종결은 재적용 시 중복되지 않게 처리한다.
- `app/components/activity-inputs.jsx`의 미리보기/복사는 그대로 같은 pair.actual/pair.example을 사용한다. 교체 확인, editItem 승인 해제, 수정 전 referenceSources 원문, 불러온 원본 예시, 전체 문장/개별 복사도 보존한다. 새 초안 생성만 교정하고 교사 필드/저장 문장을 자동 재작성하지 않는다.

## AI source/evidence·생성·독립 검토·승인

- `lib/generation-source.mjs`의 `generationSource`가 example.trim 유무로 출처를 정한다. 원본 example(있으면) 또는 원본 actual(없으면)이 유일한 변형 원문이다. actual과 example을 출처 구분 없이 합친 문자열은 만들지 않는다.
- 모델 출력 스키마는 기존 evidence:string[] 그대로이며 Gemini는 한 인용 구절을 요구한다. 앱이 후보의 최소 `evidenceSource: example|actual`을 부여한다. evidence 검사는 선택한 원본 문자열의 정확한 substring과 대조하며 교정된 WorkingCopy와 대조하지 않는다. evidence는 실제 수행 자동 확정이 아니다.
- `lib/prompt.mjs` 공통 GENERATION_RULES/REVIEW_RULES와 `lib/server/gemini.mjs` stageInstruction 모두 example 핵심 변형·actual 명시적 모순 대조 계약으로 바꿨다. 원본 actual/example은 별도로 전달하고 exampleWorkingCopy/actualWorkingCopy는 생성용 교정 사본으로만 전달한다. 독립 검토는 원본과 현재 candidates.text를 받는다.
- example이 있으면 활동·대상·핵심 의미·조건·수준·직접 수행/참여를 보존하며 actual에만 있는 별도 활동을 모든 후보에 넣지 않는다. actual이 포괄적이라는 이유로 예시의 세부 수행을 제거/거부하지 않는다. example이 없으면 actual의 모든 핵심/조건을 유지한다. 단계/계획은 새 수행의 근거가 아니다.
- actual의 명시적 부정/미실시/도움/어려움/수량과 충돌하면 양립하는 초안을 만들되 핵심 변경/충돌을 독립 검토 issues에 지적하도록 했다. 해결이 어려워도 전원 편집 목록을 유지한다. 전체 거절·추가 교정 호출·PASS 강제를 추가하지 않는다.
- `groundingIssues`는 선택 원문에 없는 정확성/태도/독립 수행/도움 등을 검사하고 actual의 명시적 도움↔독립 수행 모순도 보조 검사한다. 수행 부정·수량·수준 등 의미 관계와 예시 핵심 보존/변경은 독립 검토가 담당한다. `lib/batch.mjs` approvalIssues도 같은 선택 원문 계약을 사용하고 새 비편집 AI 후보의 evidence 출처를 다시 대조한다.
- 후보 생성→공백/조사/명사형 보정→현재 text 로컬 검사→배치 독립 검토 순서다. 검토 뒤 text 수정/semanticPass 재사용 없음. 후보별 표현 방향·배치/기존 문장 비교, 반복 경고와 의미 오류 분리는 유지한다. 교사 편집 시 기존 검토 무효화/전체 확인/원자 일괄 승인·승인 전용 출력은 그대로다.
- `lib/restore.mjs`: evidenceSource/evidence는 optional로 저장/복원 가능하다. metadata 없는 v1/v2도 허용하며 source를 임의로 생성하거나 기존 text를 교정하지 않는다. 기존 승인 문장은 후보로 돌아가고 edited=true/semanticPass=false로 재승인한다. 교사가 편집한 문장에는 이전 AI evidence로 새 문장을 증명하도록 강제하지 않으며 기존 교사 확인 경로를 유지한다.

## 구현 목표 — 실행 결과 아님

`안전사\n고`→`안전사고`, `예방책\n을`→`예방책을`, `만들\n기`→`만들기`, `다양한\n안전사고`→`다양한 안전사고`, `할\n수`→`할 수`는 셀 내부 배치 줄바꿈의 설계 기준이다. 실제 PDF 토큰 재현 결과가 아니다.

사용자 확정 목표: `가정 내에서 일어날 수 있는 다양한 안전사 고 예방책 만듦.` → `가정 내에서 일어날 수 있는 다양한 안전사고 예방책을 만듦.`. 같은 과제의 actual 문체 적용 목표는 `…다양한 안전사고 예방책을 만들었다.`이다. 이번에 앱을 실행해 출력하거나 품질 PASS로 확인한 문장이 아니다.

## 보존·한계·미실행

합계1~24/기본12·단계별 분포·보관120·선택/확정·수정 전후 표시·문장만 복사·승인/조합/XLSX·작업 저장/복원·무료 Gemini/요금제/키/thinking/활성 플래그·공유한도/중지키·정상 생성+독립검토2호출/503추가1/최대3호출·PDF50MB/작업200MB를 변경하지 않았다. review-flat-v1·엄격 응답/index/참조 검사·최종 existing과 예약 bytes 일치·고정 오류 code/stage를 유지했다. 새 AI/교정/임베딩 API·유료서비스·형태소 분석 의존성 없음. master 병합·새 Preview/자동 CI 활성화·force push·CI/hook/보호/TLS 해제 없음.

사용자 지시로 자동/단위/통합/회귀/정적/lint/typecheck/비밀값/도름스/재현/비교표/브라우저/기기/API/실모델·별도 검증용 빌드를 실행하지 않았다. 새 테스트/재현/검증 스크립트도 작성하지 않았다. 모델 추가 호출 **0회**. 소스/누적 변경 읽기·Git/원격 식별·배포용 digest/크기 산출·플랫폼 metadata 조회만 수행하며 필수 플랫폼 빌드의 강제 내부 처리는 별도로 기록한다.

사용자 원본 PDF가 제공되지 않아 그 PDF에서 실제 해결을 확인하지 않았다. 사전 밖 어휘/불규칙/축약·무표지 고유명과 일반명사의 중의성·복잡한 중첩절/부정·장거리 목적어·특이 폰트/회전/여러 표·화면 줄바꿈과 독립 항목의 모호한 경계는 남은 한계다. 일반적인 한국어 공백 복구·두 예시의 자연스러움/멱등성·모델 후보 품질·기존 기능 회귀는 실행 미검증이다. 불확실 경계는 원문/PDF와 대조하고 교사가 편집·확정·승인해야 한다. 기능 추가/추가 제품 검증에는 착수하지 않는다.

## 배포·SHA·실패/복구

배포 직전 운영 metadata 재조회와 복구 기준, 기능/실제 앱 SHA·원격 push·소스 manifest·배포 ID·필수 빌드·READY/aliasError/도메인 확인은 배포 후 이 절에 기록한다. 최종 인계 커밋은 문서 전용 후속 commit/push로 남기며 자체 SHA 삽입만을 위한 재커밋·앱 재배포는 하지 않는다.

## Work 전달

Work는 원격의 이 인계 전문을 기존 Drive 기준 폴더 https://drive.google.com/drive/folders/1sZI59-IfIveVqP4Fqb2rADkHnEuShsrr 의 인계 원본과 같은 프로젝트 지식/지침 갱신에 사용할 수 있다. Codex의 Drive 반영/readback은 미실행이다. 최종 응답에 기능/앱 SHA와 최종 원격/인계 SHA, 고정 원격 인계 링크를 제공한다. 실사용 검증은 사용자 진행이다.
