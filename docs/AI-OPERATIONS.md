# AI 연결 설계와 운영 전 남은 결정

## 2026-11-10 현재 구현과 활성화 차단

공개 AI 활성화는 사용자 승인됨. 현재 운영 키/계약/공유 한도 저장소 미확인으로 비활성 상태를 유지한다. 과거의 승인 대기 설명과 구분한다. `public-ai.mjs`는 기존 NVIDIA 모델·generateBatch·독립 의미 검토를 재사용한다. 다른 모델이나 제공사를 자동 선택하지 않는다. 준비된 Redis REST 어댑터는 새 서비스 가입·결제를 실행하지 않으며 실제 운영 인프라 연결/검증을 완료한 것이 아니다.

서버 설정: `PUBLIC_AI_ENABLED=true`, `PUBLIC_AI_VERIFIED=true`(계약·모델·시간·실호출 검증 후에만), `PUBLIC_NVIDIA_API_KEY`, `PUBLIC_AI_REDIS_URL`(HTTPS Upstash REST), `PUBLIC_AI_REDIS_TOKEN`, `PUBLIC_AI_LIMIT_SALT`(32자 이상). Vercel의 `VERCEL=1`, `VERCEL_ENV=production`도 요구한다. 로컬 `NVIDIA_API_KEY`/`LOCAL_AI_ENABLED`와 분리한다. 모든 값은 서버 전용이며 Git에 넣지 않는다. 키 존재/VERIFIED 문자열 자체는 계약 증거가 아니다.

한도 기본값: 플랫폼이 설정한 `x-vercel-forwarded-for` 주소를 HMAC-SHA256으로 가명 처리하여 주소당 2회/UTC 분, 12회/UTC 일, 전역 100회/UTC 일, 주소당 동시 1개/전역 동시 2개 배치. 로그인 없는 앱이므로 개인 식별 한도가 아닌 IP 기준이며 같은 학교 NAT 사용자는 공유한다. 생성 1회+독립 검토 최대 1회, 따라서 전역 하루 최대 200 모델 호출. 실패/취소도 예약한 배치를 환급하지 않는다. Redis TIME+Lua 원자 실행, 공통 `{pyeoneo-ai-v1}` 키를 배포마다 유지한다. 카운터 TTL 120초/172800초, 실행 lease 300초, active 집합 TTL 600초. 원문/후보/IP 원문 저장 없음. salt/namespace 교체는 사용자 한도를 초기화하므로 운영 중 임의 변경 금지. Redis는 전용·영속 primary와 no-eviction 정책이 필요하며 읽기 replica 사용 금지.

시간 예산(준비값): 본문 읽기 10초, 제한 서비스 작업당 3초, 모델 개별 최대 180초, 생성/검토 전체 270초, 브라우저 290초, 함수 `maxDuration=300`. 기존 로컬 360/370초를 운영에 복사하지 않는다. 실제 계정 플랜/Fluid 설정과 실모델 시간을 추가 확인해야 하며 이 수치만으로 운영 성공을 판정하지 않는다.

중지: Redis `{pyeoneo-ai-v1}:disabled`를 `1`로 설정하면 신규 예약 및 다음 모델 호출을 막는다(진행 중인 한 번의 공급자 호출은 취소되지 않을 수 있음). 장기 비활성화는 `PUBLIC_AI_ENABLED=false`로 설정 후 정확한 소스로 재배포한다. 한도 서비스 오류는 우회하지 않으며 모델 호출 추가/자동 재시도/유료 대체 없음. 실패 응답은 입력과 기존 후보를 유지한다.

허용 Origin/Host는 `https://pyeoneo-studio.vercel.app` 하나. JSON Content-Type, 32,000바이트 본문, 기존 길이/수준/기존문장 스키마 검사와 결과 12개/256KiB 상한. 구버전 confirmed true/false/누락은 수락하되 provider 입력에서 제거. 상세 근거와 미실행은 [인계](PUBLIC-AI-HANDOFF.md).

아래는 과거 기록이다.

현재 공개 앱은 외부 AI 호출을 하지 않는다. Checkpoint 5에서 로컬 전용 NVIDIA 어댑터를 추가했다. `lib/generation.mjs`는 공급자 독립 생성·검토 로직이며 `lib/server/nvidia.mjs`가 환경변수 NVIDIA_API_KEY로 공식 NVIDIA 엔드포인트를 호출한다. 모델은 `deepseek-ai/deepseek-v4.1-flash`이다. 비밀키 입력 UI나 클라이언트 공개 환경변수는 사용하지 않는다. 공개 AI 활성화와 운영 키 추가는 별도 사용자 결정 대상이다. AI 비활성을 유지한 일반 앱 배포는 2026-11-03 상시 승인에 따라 [운영 절차](PRODUCTION-OPERATIONS.md)로 완료한다.

`LOCAL_AI_ENABLED=true`, `NODE_ENV=development`, `VERCEL` 변수 없음, 키 존재를 모두 만족할 때만 로컬 API가 켜진다. Host/Origin도 loopback 주소와 일치해야 한다. Vercel·production에서는 플래그와 키가 있어도 비활성화한다. 로컬 개발은 `.next-local`을 사용해 production 산출물과 분리한다.

## 예상 이용량 (예측값, 측정값 아님)
평가 항목 16개 × 24문장 = 교사 1명 기준 384문장. 12개 후보당 생성 1회 + 독립 검토 1회이므로 모두 승인한다고 가정해 최소 64 모델 호출. 교사 10명은 640회, 100명은 6,400회. 4수준을 모두 24개씩 만들면 네 배. 검토 탈락·재생성은 추가 호출이다.
후보 12개당 생성+검토 합계 대략 입력 4천~8천, 출력 2천~5천 토큰을 예산의 초기 가정으로 삼되 실제 한국어 tokenizer/응답 길이 측정 후 수정한다. 교사 1명 전체 작업은 약 19만~42만 토큰. 무료 엔드포인트의 일시적 한도나 가용성으로 상시 서비스를 보장하지 않는다.

## NVIDIA 검토 (2026-10-26)
- 개발 시험 후보: deepseek-ai/deepseek-v3.1-terminus. Catalog Free Endpoint 존재 확인. 한국어 사실성 품질은 아직 측정하지 않았음.
- https://build.nvidia.com/deepseek-ai/deepseek-v3_1-terminus/build
- https://docs.api.nvidia.com/nim/docs/product
- https://assets.ngc.nvidia.com/products/api-catalog/legal/NVIDIA%20API%20Trial%20Terms%20of%20Service.pdf
- 약관 1.2 및 1.4: 무료 체험은 내부 시험·평가용. production API 및 generated content 사용은 별도 subscription 필요. 따라서 이 무료 체험을 공용 평가 문장 서비스의 운영 API로 추천하지 않음.
- 계정별 실제 제한은 NVIDIA 계정 화면에서 확인해야 함. 고정된 무료 호출 수를 가정하지 않음.

## 운영 API 연결 전에 구현·검증할 것
1. 사용 가능한 운영 제공사·모델·데이터 보관 조건 결정 및 전송 승인. PDF·전체 XLSX가 아닌 선택 항목의 실제 활동/예시/수준/기존 문장만 전송.
2. 운영자 소유 호출 제한 저장소와 원자적 전역 일일 한도. 교육 자료는 저장하지 않음. 요청 주소는 salt/HMAC으로 처리하고 단기 만료.
3. 분당·일일 사용자 한도, 전역 한도, 동시 호출 상한. 공급자와 제한 서비스 실패 시 호출 중지. cold start 및 여러 인스턴스에서 한도 유지 검증.
4. origin/content-type/바이트 제한(32KB), 스키마, 타임아웃, 응답 상한, 오류 정보 최소화. 서버 로그에 요청/응답/키를 기록하지 않음.
5. 공급자 측 예산 상한, 공개 API 우회 직접 호출 검증. origin 확인만 비용 방어 수단으로 사용하지 않음.
6. 실모델로 색 탐색/색상환, 그림 낱말 읽기, 수 비교 등 사례의 새 활동·관찰 추가/누락/수준 충돌을 검사.
7. 금지 표현이 원본에 있어도 보존. 새 문장에만 제한. 교사 최종 승인 유지.
