# 공개 AI 활성화 재개 WORK HANDOFF

2026-11-12 KST. 실행 중, 아직 활성화 완료 판정 아님.

- 시작 개발 a4d1192fcdc36ffd0ab02d4ddc560b2600157c00, 원격 일치/작업트리 깨끗함. 시작 앱 db1d7e769a198dc40c1079096d23bd8ec1f8f355, Production dpl_ADr4PmG8CyygeqEN5YwKks2aDDRq READY/도메인/팀/프로젝트 일치. 두 플래그false·공유중지1은 이전 인계 상태.
- 사용자 지시로 기존 실제 Gemini/Upstash/모델3사례/review-only대조/첫공개12후보·수정·선택승인 증거 재사용. 전체실모델사전검사는 이번에 반복하지 않음. [첫 실행 인계](GEMINI-PUBLIC-AI-HANDOFF.md)는 과거 근거이며 24회총량/재시도금지/일반공급자실패시전체중지 규칙은 이번 지시로 대체됨.
- 구현: 같은 모델/실패 단계 503 재시도 추가1회, 요청 최대3호출. Retry-After 또는1~2초무작위지연, 대기중취소/중지/기한/한도검사. 독립검토전 생성결과 재사용. 반복503은 해당요청만친절한오류, 후보미반환/작업보존. 공유RPM/입력bytes·기존배치/IP한도 보존, 추가450실시도/rolling26시간 제한.
- 계획: 자동검사·production빌드·로컬Redis→push→두플래그true/Production READY·도메인확인→중지키만해제→일반build최종배포→PC/390px 실제생성/승인/출력/복원. 일반503/429에서는활성유지/실패사례부터재개.
