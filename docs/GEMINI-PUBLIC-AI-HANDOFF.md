# Gemini 공개 AI WORK HANDOFF

2026-11-12 KST. 실행 중 기록. 아래 완료되지 않은 항목은 PASS가 아니다.

- 시작: Cloud checkout의 `work`/2f72e1b는 오래된 스냅샷. 깨끗한 작업 트리를 확인하고 원격 `checkpoint-5-local-ai` HEAD `1c7acdae74066aa95e16bf6387f2818c005fb7ad`를 fetch/switch했다. 기존 변경 덮어쓰기 없음.
- 시작 운영/복구 대상: `dpl_4G6RhbCQ9BWXr37fyxNWbqPzwGz9` READY, Production, 소스 `3365053bf018e20335c7fa986a7e5236007c9723`, URL https://pyeoneo-studio-24f6bkgnw-subsub-tschool.vercel.app, aliases `pyeoneo-studio.vercel.app` / `pyeoneo-studio-subsub-tschool.vercel.app`, 프로젝트/팀 일치. 가이드의 dpl_9kqs는 현재 배포가 아닌 과거 기록. 운영→개발 차이는 문서2파일뿐이었다.
- 설정 읽기: Gemini/Redis Secret·URL·기존 salt 존재/Production, 두 플래그false. 값 추출 없음. 과거 NVIDIA Secret도 보존. 일반 build 로그는 `npm run build`; get_project는 원시 build override/Fluid/함수제한/플랜을 반환하지 않음. get_team도 플랜 미제공. 실제 설정 확인 요청 중이며 코드 선언300초만을 실제 허용시간으로 쓰지 않음.
- 구현: 고정 Gemini REST/단계 JSON schema/STOP·usage·오류/최대2호출, 기존 검토/교사 승인 흐름 유지. 공유 rolling12RPM+200k입력bytes·429 cooldown. 모델 사전 검사도 운영 호출 예산 사용, Redis 기능 검사만 무작위 namespace.
- 이번 직접 자동 검사60/60 PASS. 기존53 포함. 실제 로컬Redis7.4.2+모의HTTP·시계: 경쟁30→12/분경계/rolling만료/200k입력예산/cooldown/두번째호출거부/중지/장애 PASS. 기존 전체/IP 제한·AOF재시작보존 PASS. Upstash 운영 시험 아님.
- 실제 Gemini generateContent 호출: 아직0. countTokens: 아직0. 실제 Upstash: 아직미실행. 사전검사·활성 배포·공개 실제생성: 아직미실행. production 빌드·비밀값·공백·브라우저 client bundle 서버키/endpoint 미포함 PASS. 로컬PC/390px 예시/계획/PDF드롭/생성오류·늦은응답4종 PASS(생성응답은 모의). 로컬CLI Redis 사전검사의 lease TTL/만료복구·격리namespace까지 PASS.
