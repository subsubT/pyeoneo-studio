# Gemini 공개 AI WORK HANDOFF

2026-11-12 KST. 실행 중 기록. 아래 완료되지 않은 항목은 PASS가 아니다.

- 시작: Cloud checkout의 `work`/2f72e1b는 오래된 스냅샷. 깨끗한 작업 트리를 확인하고 원격 `checkpoint-5-local-ai` HEAD `1c7acdae74066aa95e16bf6387f2818c005fb7ad`를 fetch/switch했다. 기존 변경 덮어쓰기 없음.
- 시작 운영/복구 대상: `dpl_4G6RhbCQ9BWXr37fyxNWbqPzwGz9` READY, Production, 소스 `3365053bf018e20335c7fa986a7e5236007c9723`, URL https://pyeoneo-studio-24f6bkgnw-subsub-tschool.vercel.app, aliases `pyeoneo-studio.vercel.app` / `pyeoneo-studio-subsub-tschool.vercel.app`, 프로젝트/팀 일치. 가이드의 dpl_9kqs는 현재 배포가 아닌 과거 기록. 운영→개발 차이는 문서2파일뿐이었다.
- 설정 읽기: Gemini/Redis Secret·URL·기존 salt 존재/Production, 두 플래그false. 값 추출 없음. 과거 NVIDIA Secret도 보존. 일반 build 로그는 `npm run build`; get_project는 원시 build override/Fluid/함수제한/플랜을 반환하지 않음. get_team도 플랜 미제공. 실제 설정 확인 요청 중이며 코드 선언300초만을 실제 허용시간으로 쓰지 않음.
- 구현: 고정 Gemini REST/단계 JSON schema/STOP·usage·오류/최대2호출, 기존 검토/교사 승인 흐름 유지. 공유 rolling12RPM+200k입력bytes·429 cooldown. 모델 사전 검사도 운영 호출 예산 사용, Redis 기능 검사만 무작위 namespace.
- 이번 직접 자동 검사60/60 PASS. 기존53 포함. 실제 로컬Redis7.4.2+모의HTTP·시계: 경쟁30→12/분경계/rolling만료/200k입력예산/cooldown/두번째호출거부/중지/장애 PASS. 기존 전체/IP 제한·AOF재시작보존 PASS. Upstash 운영 시험 아님.
- 실제 Gemini generateContent 호출: 아직0. countTokens: 아직0. 실제 Upstash: 아직미실행. 사전검사·활성 배포·공개 실제생성: 아직미실행. production 빌드·비밀값·공백·브라우저 client bundle 서버키/endpoint 미포함 PASS. 로컬PC/390px 예시/계획/PDF드롭/생성오류·늦은응답4종 PASS(생성응답은 모의). 로컬CLI Redis 사전검사의 lease TTL/만료복구·격리namespace까지 PASS.

## 2026-11-12 실행 중 추가 근거

- Work 직접 Vercel 화면 확인을 사용자 전달로 수신: Hobby, Fluid Compute Enabled, Advanced Settings Default Max Duration 기본300초(직접 입력 저장 아님). 프로젝트 설정 재확인/키 재등록 불필요. Codex는 route Node.js/maxDuration300, Next functions-config-manifest `/api/generate.maxDuration=300`, 서버270초·브라우저290초 관계 확인. Vercel 도구의 원시 함수 설정 필드는 미제공.
- 첫 배포 요청 자동검토 거부 후 공개 GitHub private=false/visibility=public 및 원격84파일 hash/목적지 일치를 추가 대조하여 같은 요청 허용됨. 우회 경로·환경값 추출 없음.
- 초기 서버 Redis 사전 검사 실패2회: 1ms/25ms 시험 만료 가정. Redis server TIME의 ZSET lease 기한을 CHECK에서도 검사하고 만료된 lease의 user lock 정리 추가. 원래300초 TTL 유지. 재검사에서 실제 Upstash PTTL996~997ms/해제·만료복구 포함 전체PASS. 중지시험/삭제는 무작위시험namespace만, 모델 예산은고정운영namespace.
- 초기 모델 실호출9회: 색8후보/통과3 실패2호출; 제약보강 후 색12/통과12의2호출+낱말생성503의1호출; 다음 검사 색12/12와 낱말12/4의4호출 후 좁은 핵심어 정규식이 동의어를 거부해 중지. 출력/의미 검사를 생략하지 않고 12또는0 JSON schema·사실유지 규칙, 핵심어 검사의 동등한 활용형을 수정. 자동 재시도 없음. countTokens6회(생성/검토 각3측정). 생성최대입력26126, 검토30099토큰: 12최대입력은TPM초과가능하여 공유200k입력bytes 예산이 실제허용횟수를줄임.
- 공개 브라우저 초기 TLS 오류: NSS 저장소가 샌드박스에서 읽기전용이라 Chromium이 열지 못함. 사용자 임시CA등록/검증후제거 승인 수신. 공식proxy CA는 이미 `OpenAI-nebula-dns`에 동일fingerprint로 존재했고 새task nickname은생성되지않음. 저장소에 검증프로세스 한정쓰기권한을 부여해 TLS검증유지 HTTP200/disabled GET확인. 기존4개신뢰인증서는삭제/변경하지않음.
- 공개 비활성 기존회귀: 예시·계획 PASS, PDF 진행중. 실제AI응답 없음(예시회귀는모의3회 구분). 최소보안v0.3.1 직접scan확인30/미확인5/해당없음1. Node proxy설정으로재실행; 첫연결실패결과를PASS로사용하지않음. 기존권고·미확인 유지.

- d2656a8 서버검사: 색12/통과10·낱말12/통과0으로 필수 품질 FAIL. 추가4호출로 누계13, countTokens누계8. 공개활성화하지않음. 오류범주만추가진단하며 원문/리뷰사유원문은로그에남기지않음. 구체이유없는false·issues있는true를허용하지않는검토JSON schema와LOW thinking/균형검토규칙으로보강후재검사계획. 24호출중남은11=전체사전7+공개2배치4의예산.
- 공개비활성회귀3종(예시/계획/PDF드롭) PASS. PDF bytes보존/390px/승인/조합·복사/XLSX재열기/저장복원·재승인, 오류0·예상손상PDF경고1. 실모델0회, 예시에서모의후보3회.
