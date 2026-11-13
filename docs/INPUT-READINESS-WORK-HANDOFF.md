# 예시·AI 후보 입력 차단 해제 WORK HANDOFF

2026-11-13 (Asia/Seoul), Codex 직접 실행. 이 문서는 입력 구체성·최소 8/5자·참고 예시 필수·단계 충돌 시 생성 거절이라는 과거 규칙을 대체한다. 사실 보존, 독립 검토와 교사의 최종 승인은 유지한다.

## 개발 구현 및 배포 전 검증

- 시작 개발 HEAD `c4b7345b6b251e56b0bbef7f4bb597882555e1dc`, 개발 브랜치 `checkpoint-5-local-ai`. 오래된 초기 `work`/master는 사용하지 않고 원격 개발 브랜치를 명시적으로 fetch했다.
- 시작 운영 앱 `de3a4639c6f11c70a4ff4d4aa5782f2f0d322dbc`, Production `dpl_FJ34MLsPywuM1RcCrBzKhArXp8Yz` READY. 실제 `src/`의 Git 대상 103/103 파일 SHA1 일치. 프로젝트 `prj_osDdLkgyiAomzS03J2GFM0c2bVB4` / 팀 `team_JKZ7B5OCf27pFKiNlhvSVuE4`, 도메인 projectId/verified 대조. linkedProjects/originConnections 없음. 기존 files 업로드 경로 유지.
- 누적 변경: 시작 운영→시작 개발은 용량 인계 문서와 브라우저 assertion 정리(제품 코드 차이 없음). 여기에 이번 입력·프롬프트·스키마·오류·공유 승인/복원 수정과 시험 도구를 포함해 전체 diff 검토.
- `lib/input-examples.mjs`: 기존 변환 우선, 미인식·포괄·개조식·긴 문장은 주제를 인용하는 대체 초안, 관련 정보 공란은 수업 참여 두 초안. 입력창 한도에 맞추기 위해 1,800자 초과 대체 주제는 말줄임 표시. 예시는 사실 자동 확정이 아니며 입력 자동 덮어쓰기 없음. 복사별 교체 확인/취소와 입력창 수정 유지.
- `lib/activity.mjs`, `lib/generation.mjs`, `lib/server/local-ai.mjs`, `lib/server/public-ai.mjs`: actual 문자열 trim 후 1자 이상. example 선택, 누락→빈 문자열. 4,000/2,000자 최대·전송 크기·계획·개수·보관·공유 제한 유지. 공백 actual은 HTTP400 `EMPTY_ACTUAL` / “실제 교육활동을 입력해 주세요.”, quota/provider 이전 차단.
- `lib/prompt.mjs`, `lib/server/gemini.mjs`: 짧거나 포괄적이어도 실제 활동 범위의 간결한 초안을 요청 수/단계별 분포대로 생성. 단계 차이·분량을 위해 활동·성과·도움·태도 추가 금지. 정상 Gemini 스키마 exact count 및 reasons=[]; 빈 배열 선택 경로 제거. 독립 검토는 별도 호출하며 의견을 강제로 PASS로 바꾸지 않음.
- `lib/generation-result.mjs`: 빈 후보/제공사 거절 사유는 입력 보완 422가 아닌 기술 응답 오류. 원시 reasons를 사용자에게 노출하지 않음. 정상 검토 완료 후보는 errors/semanticPass와 무관하게 목록에 추가. 기존 목록 보존·늦은 응답 폐기·중복 추가 방지 유지.
- `app/components/activity-inputs.jsx`, `app/page.jsx`, `lib/restore.mjs`: 선택 참고 예시 안내, 생략 예시 복원 정규화, 예시 없이 편집·전체 확인·일괄 승인·저장·복원. 승인 지적은 그대로 유지하며 수정과 새 전체 확인 필요. 후보별 자동 검토 표시와 특정 종결 강제 없음.
- 자동 검사 91/91, secret 검사, production build, npm audit(취약점0), diff whitespace PASS. React/Next client boundary·label·상태 갱신 검토 적용, 제품 의존성/모델/키/공유namespace/플래그/배포 보호 변경 없음.
- 로컬 브라우저: 신규 입력 회귀(PC/390px, mock2배치, 요청/응답/신규화면 1/1/1 및 2/2/2, 분포1/0/0 및1/1/0, 검토지적 전원 유지·승인차단·수정후승인·조합/복사/XLSX/저장/v1/v2재승인), 기존 예시 회귀, batch(1/12/24), generation-feedback(29 mock POST, 400/413/429/502/503/504/network/빈응답/수·분포오류/검토누락/취소/늦은응답/중복클릭), PDF drop PASS. 실제 모델 호출과 구분한다.
- 실제 크기 로컬 회귀: PDF17/50MB 선택·드롭 및 50MB−1, 작업200MB−1/동일, 저장/복원·출처 해시·초과 사전 차단·원자 보존을 검사한다. 결과 원본 `tmp/file-limits-local/result.json`.
- 도름스체크 v0.3.1 기존 GitHub tag/config detect·scan. npm registry의 동명 패키지는 404여서 설치되지 않았고 기존 승인 tag로 실행. 미확인/권고를 통과로 바꾸지 않음.

## 실제 원인 재현의 범위

- 배포 전 공개 실제 API에 합성 `actual="읽기"`, example 생략, 1개 요청→HTTP400 INVALID_INPUT, 과거 8/5자 안내. 스키마 이전 차단이므로 모델 호출0. `tmp/before-release-short-input.json`.
- 과거 prompt/schema에는 빈 후보+reasons 생성 및 NEEDS_INPUT/422 전환 경로가 직접 존재함을 확인했다. 모의 제공사 빈 응답으로 이 경로와 새 기술 오류 분류를 검사했다.
- 원래 사용자의 입력/응답 원본은 제공되지 않았다. 그 요청이 실제로 프롬프트 거절·429/503·다른 원인 중 무엇이었는지는 재현하지 못했으며 단정하지 않는다.

## 브라우저 환경과 증거

- Chromium 1280/390px 가정이 아니라 각 스크립트 지정 PC(1440px)/390px에서 직접 실행한다. 브라우저 버전은 용량 회귀 result에 기록.
- 공개 Chromium 직접 HTTPS는 환경 프록시 CA를 신뢰하지 않아 ERR_CERT_AUTHORITY_INVALID였다. 영구 NSS CA 추가는 자동 승인 검토에서 지속 TLS 신뢰 변경 위험으로 거부되었고 실행되지 않았다.
- 안전한 대안 `scripts/verified-browser-transport.mjs` / `VERIFIED_HTTPS_RELAY=1`: 이미 환경이 제공한 NODE_EXTRA_CA_CERTS를 사용하는 Playwright Node HTTPS 요청이 인증서를 검증하고 실제 응답을 브라우저에 전달한다. TLS 검증 비활성화·영구 신뢰 변경 없음. 재시도0, 같은 공개 origin/요청/실제 응답, 제품 코드 변경 없음. 실제 모델 검증 시 응답/후보를 모의하지 않는다. 시험별 명시적 mock 경로는 따로 구분한다.
- 검증 산출물/합성 PDF·작업·응답·다운로드는 Git 제외 tmp/에만 보존. 서버 키 pull/출력 없음.

## 배포 및 공개 검증

배포 후 정확한 개발/배포/문서 SHA, 배포 ID, 실제 호출 수·요청/응답/화면 분포와 공개 회귀 결과를 아래에 기록한다. 이 단계에서 완료 판정을 선기록하지 않는다.
