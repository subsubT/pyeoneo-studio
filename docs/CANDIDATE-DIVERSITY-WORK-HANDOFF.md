# AI 후보 서술 다양성 WORK HANDOFF — 2026-11-15

상태: **수정·배포 완료 — 실사용 검증 미실행(사용자 진행)**. 문장 다양성·의미 품질/실사용 PASS를 주장하지 않는다.

## 시작 근거와 범위

- 원격 최신 개발/시작 HEAD: `34c929307dbe0f7ac55de28002cce32c7d7705b5`, 브랜치 `checkpoint-5-local-ai`. 오래된 work 스냅샷에서 개발하지 않았다. 기존 미커밋 변경은 없었다.
- Vercel에서 이번 직접 조회한 시작 운영/복구 기준: 앱 `296e648383fa30c3d70b48bf857d8bafc5209782`, `dpl_4m5ug5hWU8UPPt1Hq3gduC78hFyB`, Production READY·aliasError=null. 공개 도메인 연결과 프로젝트/accountId가 일치했다. 운영→시작 HEAD 차이는 운영/인계 문서4파일뿐이며 누적 앱 변경은 없었다.
- 대상: `subsubT/pyeoneo-studio`, 팀 `subsub-tschool` (`team_JKZ7B5OCf27pFKiNlhvSVuE4`), 프로젝트 `pyeoneo-studio` (`prj_osDdLkgyiAomzS03J2GFM0c2bVB4`), 공개 URL https://pyeoneo-studio.vercel.app .

## 읽은 코드와 구현

기존 공통 생성 규칙은 어휘·조사·연결 변형을, Gemini 추가 지시는 어순·조사만의 변형도 허용했다. core는 trim 동일 문장을 오류, 공백 제외 문자2-gram 유사도>0.9를 경고로 처리했고 독립 검토 입력에 existing이 없었다. 이것만으로 실제 반복의 원인 전체를 확정하지 않았다.

- `lib/candidate-diversity.mjs`: 실제 단계 ID·단계 안1부터 후보 순번·방향 번호만 담는 로컬 계획을 만든다. 대상/상황, 조건 위치, 직접 수행 등가 서술, 핵심 활동 연결 및 조합의6방향을 전체 후보 자리에 순환 배분한다. 주제별 정답/완성문 목록과 별도 모델 계획 호출은 없다. 적용 어려운 방향은 자연스러운 같은 사실 서술로 대체하도록 지시한다.
- 같은 파일의 반복 분석은 보정된 배치의 모든 쌍과 같은 항목의 기존 후보/승인 전체를 비교한다. 문자 겹침에 어절의 순서 보존 대응·인접 어절쌍·제한된 동의 표현/활동 군더더기 정규화를 함께 참고한다. 정규화는 비교 사본에만 적용하며 원문/인용/교과 용어/수치/복사 text를 바꾸지 않는다. 각 후보의 진단은 source(local/review)·scope(batch/existing)별4건으로 보관을 제한하지만 비교 자체는 전부 수행한다.
- `lib/generation.mjs`, `lib/core.mjs`: 생성→기존 안전한 보정→현재 동일 text의 로컬 검사/반복 분석→한 번의 전체 독립 검토 순서다. 배치의 앞뒤 모든 후보를 동일 문장 검사에 포함해 완전 중복 오류를 남긴다. 새 AI 경로의 문자 겹침 단독 경고를 별도 복합 신호 경고로 대체하며 다른 입력/승인 경로의 기본 검사는 보존한다. 모든 후보를 편집 목록에 남기고 검토 후 다시 쓰지 않는다.
- `lib/prompt.mjs`, `lib/review-schema.mjs`, `lib/server/gemini.mjs`: 공통/Gemini 생성 지시를 일치시켰다. 독립 검토의 reviews(pass/issues)는 사실·핵심·문체용이고 repetitions(index/scope/peerIndex)는 표현 반복 전용이다. 공유 스키마·어댑터·파서·병합을 함께 연결했다. 현재 후보 범위/자기참조/실제 전달된 기존 index를 검사한다. 반복 의견은 최대48쌍, 후보의 내부 repetitionWarnings로 병합하며 semanticPass/errors/승인 판정에는 넣지 않는다. 후보별 자동 검토 문구 UI는 추가하지 않았다.
- 기존 문장 전송은 관련 표면 유사도 순으로 온전한 문장 최대12개·JSON6,000bytes 이내다. 40,000bytes 전체 요청을 초과하면 선택 비교 문장을 뒤에서 더 줄인다. actual·현재 후보·방향 계획은 자르지 않고 필수 입력만으로도 초과하면 기존 기술 오류로 처리한다. 공유 예산 예약과 실제 전송은 같은 payload 생성 함수를 쓴다. 전체 기존 문장 로컬 비교는 생략하지 않는다.

## 보존과 미측정 한계

actual만 사실 근거, 모든 핵심/순서/조건/수량/확인된 수준의 후보별 보존, 직접 동사·동사별 ~ㅁ/음., 길이1~1.5배, 금지어/인용 보존을 유지한다. 세 주제는 정답 목록으로 심지 않았다. 합계1~24·기본12·분포·보관120, 선택 example/actual trim1자, 취소·429/503·시간초과·작업보존, 정상 생성1+검토1/503추가1·최대3회, 무료 Gemini 3.5 Flash-Lite/thinking·Vercel Hobby·Upstash Free·키/플래그/salt/namespace/공유 한도/중지키·PDF50MB/작업200MB를 바꾸지 않았다. 새 서비스/DB/인증/임베딩·재생성/교정/보충 호출은 없다.

편집·전체 확인1개·원자 일괄 승인·승인 전용 조합/XLSX·저장/복원 재승인은 기존 흐름이다. 기존 입력/후보/승인 일괄 교정이나 저장 형식 필수 필드 추가는 없다. 계획과 진단 index는 생성 시점 내부 자료이며 복원 후 필수 정보로 쓰지 않는다.

표면 반복 규칙과 임계값은 미측정 휴리스틱이다. 한국어 전체 의미/형태소 판단, 모든 반복 검출 또는 다양성 개선의 실측 보장은 없다. 짧은 문장의 필수 용어 겹침·같은 의미·example 유사도만으로 부적합 처리하지 않는다. 의미 보존 판단에는 기존 독립 검토의 오류 가능성과 교사 최종 검토가 남는다.

## 실행·배포 결과

사용자 지시로 자동 테스트·정적/lint/typecheck·비밀값/도름스·재현/비교 실험·세 주제 생성/비교표·브라우저/PC/모바일·공개 API·실모델 품질·별도 검증용 빌드를 실행하지 않았고 새 테스트/검증 스크립트도 작성하지 않았다. 실제 모델 호출0회. 코드 읽기/변경 범위 파악/Git·원격 식별과 필수 업로드 digest/크기 생성·배포 metadata 수신은 제품 검증 PASS가 아니다. 앱 실행 중 형식/근거/독립 검토는 유지했다.

기능 커밋/배포 요청 앱 SHA는 `9cd81003a3d6b6b6d470c713eeee84b84eb767b9`이며 정상 커밋·push 후 git ls-remote의 개발 원격 HEAD 일치를 확인했다. 기존 운영부터 이 커밋까지 누적 앱 변경은 위6개 실행 파일이다. 실행/빌드 소스37개를 SHA1/size로 전달했고 변경6개를 업로드,31개를 재사용했다. Production 요청은 `dpl_H3tKLiWzfwjRw13Z2MCo5v7mt1e6` / https://pyeoneo-studio-7yp3mwlu7-subsub-tschool.vercel.app 이다. 최종 상태는 아래와 같다. 배포에는 app/lib/public 및 필수 빌드/설정 파일만 전달하며 운영 문서·교육자료·환경/인증 파일을 섞지 않는다. master 병합·새 Preview/자동 CI 활성화·보호 해제는 하지 않는다.

- 실제 배포 앱/기능 SHA: `9cd81003a3d6b6b6d470c713eeee84b84eb767b9`. Production `dpl_H3tKLiWzfwjRw13Z2MCo5v7mt1e6`, target=production, readyState=READY, aliasError=null. get_deployment(공개 도메인, withGitRepoInfo=true)·get_alias·get_project에서 같은 배포/소스·두 alias·팀 accountId/프로젝트 일치를 직접 확인했다. 도메인의 verified=true·gitBranch=null도 확인했다. 이는 플랫폼 배포 상태 확인이며 공개 브라우저/API 기능 검증이 아니다.
- 필수 플랫폼 빌드: Vercel CLI65.14.0 / Next16.4.3 / Node24.x, 기존 캐시 복원·의존성 설치·`node scripts/copy-worker.mjs && next build --webpack`, Build Completed21초. compile4.8초, 플랫폼 TypeScript 단계·정적 페이지4/4·build traces·출력 배포·캐시 업로드가 완료됐다. 기존 npm cache-dir 경고가 있었고 빌드 실패는 없었다. 별도 로컬 빌드나 정적 검사를 실행한 것이 아니다.
- 배포 요청1회·업로드6개/재사용31개. 운영/인계 문서·교육자료·환경/인증 파일은 배포 소스에 포함하지 않았다. 자동 승인 검토 차단·배포 실패·rollback/복구 실행은 없었다. 복구 기준은 시작에 조회한 `dpl_4m5ug5hWU8UPPt1Hq3gduC78hFyB`/`296e648383fa30c3d70b48bf857d8bafc5209782`다.
- 해결되지 않은 배포 차단은 없다. 실제 문장 품질/공개 동작/브라우저 콘솔/런타임 오류 스캔은 미검증이며 사용자 진행이다. 다양성 개선 효과·임계값 정확도는 측정하지 않았다. 모델/thinking/무료 호출 조건·승인 흐름의 보존은 변경 범위와 코드 읽기에 근거하며 새 실호출 검증 결과가 아니다.
- 최종 인계/원격 SHA는 이 파일과 AGENTS/STATUS/PRODUCTION-OPERATIONS를 담은 후속 문서 전용 커밋이며 최종 응답에 정확한 SHA를 제공한다. 문서 커밋 때문에 앱을 재배포하지 않는다. 실제 앱 SHA와 구별한다.

## Work 전달

인계 원본 경로: `docs/CANDIDATE-DIVERSITY-WORK-HANDOFF.md`. Work는 이 전문과 AGENTS/STATUS/PRODUCTION-OPERATIONS의 우선 지시를 기존 Google Drive 인계 폴더/동일 프로젝트 지식에 반영할 수 있다. Codex는 Drive를 갱신하지 않았으며 Drive 저장/readback 완료를 주장하지 않는다. 이번 AI 후보 수정·배포·인계에서 중단한다.
