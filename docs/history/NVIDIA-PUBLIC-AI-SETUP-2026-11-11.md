# 과거 기록 — 현재 운영 지침 아님

2026-11-12 Google Gemini 사용자 결정으로 대체됨. 현재는 ../PUBLIC-AI-SETUP.md 참조.

# NVIDIA 키 등록과 공유 한도 저장소 구성안

2026-11-11 KST. 사용자 요청에 따른 구성안이며 **새 서비스 가입·결제·DB 생성·환경변수 변경은 실행하지 않았다.** 기존 NVIDIA 어댑터/모델을 유지한다. 기존 Vercel 프로젝트 환경변수와 connector 연결은 비어 있고, 이 Cloud 환경에도 운영용 secret binding이 없다.

## 1. NVIDIA 키 등록 화면

[Vercel 평어담 환경변수 설정](https://vercel.com/subsub-tschool/pyeoneo-studio/settings/environment-variables)

`subsub-tschool → pyeoneo-studio → Settings → Environment Variables → Add Environment Variable`에서 다음을 등록한다. 화면에 Sensitive 옵션이 있으면 켠다. 키 값은 채팅·Git·스크린샷에 넣지 않는다.

| 이름 | 값/범위 | 설명 |
| --- | --- | --- |
| `PUBLIC_NVIDIA_API_KEY` | 보유 NVIDIA API 키 / **Production** | 현재 배포 코드가 사용하는 운영 전용 변수명. 어댑터에는 apiKey 인자로 전달된다 |
| `PUBLIC_AI_ENABLED` | `false` / Production | 설정·권한·검증 완료 전 비활성 유지 |
| `PUBLIC_AI_VERIFIED` | `false` / Production | 운영 권한/모델/Redis/한도/시간 예산의 사전 검증 후에만 true |

기존 로컬 시험 변수명은 `NVIDIA_API_KEY`이다. **현재 코드는 Vercel에 `NVIDIA_API_KEY`만 등록해도 공개 AI를 켜지 않는다.** 같은 키 값이라도 운영에서는 `PUBLIC_NVIDIA_API_KEY`라는 이름으로 분리한다. 로컬 `.env.local`을 통째로 Vercel에 복사하지 않는다. Vercel의 `VERCEL`/`VERCEL_ENV`는 플랫폼 제공값이므로 직접 추가하지 않는다.

환경변수 저장은 기존 배포에 소급 반영되지 않는다. 후속 검증 후 기존 배포 절차로 재배포해야 한다. 지금 키만 등록해도 disabled 상태가 유지되며 자동 유료 호출은 없다.

NVIDIA 키 보유는 사용자 확인됨. 다만 무료 체험 약관 1.2/1.4는 production 이용을 허용하지 않는다. 이 키/계정에 적용되는 운영 Subscription 또는 별도 계약 근거와 해당 모델의 운영 허용/가용성은 아직 확인되지 않았다. 계약 근거는 비밀키 없이 문서명·서비스 플랜·공식 조건 링크로 확인할 수 있다. 기존 어댑터 모델은 `deepseek-ai/deepseek-v4.1-flash`이며 임의 교체하지 않는다.

## 2. 권장안 — 소유 계정의 Upstash Redis Free 1개

현재 규모의 출발점으로 **사용자 소유 Upstash 계정의 Free Redis 한 개, primary 단일 리전, 추가 read region 없음**을 권장한다. Vercel 함수가 iad1이므로 가능한 경우 AWS us-east-1 계열의 가까운 리전을 선택한다. 무료 플랜이 계정에서 사용 불가하거나 원하는 리전이 유료라면 생성 전에 결정한다. 소유 미정 임시/미수령 DB는 운영에 사용하지 않는다.

공식 요금 확인(2026-11-11): [가격표](https://upstash.com/pricing/redis), [기계 판독 가격표](https://upstash.com/pricing/redis.md), [무료 한도 변경](https://upstash.com/blog/redis-new-pricing).

| 구성 | 공식 표시 비용 | 이 앱에서의 판단 |
| --- | --- | --- |
| Free | **월 $0**, 250MB, 월 500,000 commands, bandwidth 10GB, DB 1개 | 우선 추천. 한도 초과/장애 시 AI 중지. SLA 없음 |
| Pay as You Go | **100,000 commands당 $0.20**, 저장 첫 1GB 무료 이후 $0.25/GB, bandwidth 월 200GB 이후 $0.03/GB | 새 비용 승인이 필요한 대안. 지금 활성화하지 않음 |
| Fixed 250MB | **월 $10**, 추가 read region당 월 $5 | 현재 카운터 규모에는 우선 필요 없음 |

수치는 USD 공개 가격이며 세금·환율·향후 요금 변경은 별도다. NVIDIA 추론 비용과 Vercel 함수 비용은 포함하지 않는다. 신규 모델 계약 가격은 계정 계약을 확인하기 전 계산하지 않는다.

현재 앱 한도는 하루 100 생성 배치(최대 모델 호출 200회), IP 주소당 분2/일12/동시1, 전체 동시2다. 성공 배치마다 Redis REST EVAL 4회(예약·생성 전 점검·검토 전 점검·해제), 31일 최대 12,400 HTTP 요청이다. Lua 내부 명령 과금 여부는 이 조사에서 확정하지 못했으므로 EVAL 1회=과금 1회로 단정하지 않는다. 내부 명령까지 약 32개/배치로 보수적으로 계산하면 정상 허용 배치 약 99,200 commands/31일, PAYG 명령 비용 약 $0.20 수준이다. **이는 보장된 총요금 상한이 아니다.** 거절된 요청·운영 점검·복제 명령도 사용량을 늘릴 수 있다. 따라서 처음에는 자동 유료 전환 없는 Free를 유지하고 실제 사용량 대시보드를 확인하는 안이다.

이 앱은 로그인하지 않으므로 사용자 한도는 개인 계정 대신 플랫폼 확인 IP의 HMAC을 기준으로 한다. 같은 학교 NAT에서는 한도를 공유한다. 저장하는 값은 HMAC 식별자·정수 카운터·무작위 lease뿐이며 활동/예시/후보·IP 원문은 저장하지 않는다.

## 3. 설정 순서

1. [Upstash Console](https://console.upstash.com/)에서 소유 계정 확인 → Redis → Create Database. 이름 예: `pyeoneo-ai-limits`, Free 플랜, primary 단일 리전. 영속 저장 확인, eviction은 비활성/no-eviction, 추가 read region 없음. 최종 화면이 유료 플랜을 요구하면 중단하고 선택을 확인한다.
2. 생성된 DB의 **REST API** 영역에서 URL과 읽기·쓰기 가능한 Token을 확인한다. Read-only token은 EVAL/카운터 쓰기에 사용할 수 없다. 이 값도 채팅에 보내지 않는다.
3. 위 Vercel 환경변수 화면에서 Production에 다음을 추가한다. 토큰/salt는 Sensitive로 저장한다.

| 변수 | 값 |
| --- | --- |
| `PUBLIC_AI_REDIS_URL` | 생성된 DB의 HTTPS REST URL (`https://…upstash.io`) |
| `PUBLIC_AI_REDIS_TOKEN` | 해당 DB의 REST 읽기·쓰기 token |
| `PUBLIC_AI_LIMIT_SALT` | 비밀번호 관리자에서 생성한 32자 이상 무작위 비밀 문자열 |

4. salt와 `{pyeoneo-ai-v1}` namespace는 배포마다 바꾸지 않는다. 테스트/Preview를 운영 DB에 연결하지 않는다. EVAL을 EVAL_RO로 바꾸지 않는다. [공식 EVAL 문서](https://upstash.com/docs/redis/commands/scripting/eval)에 따라 스크립트는 원자 실행하며 primary에서 처리한다. 일반 read replica의 지연된 카운터를 허용 근거로 쓰지 않는다.
5. 운영 DB REST 전송·한도·동시 실행·장애·lease 만료·재배포 보존을 시험한다. 로컬 Redis 통과는 이 실제 서비스 검증을 대체하지 않는다. 현재 Vercel 플랜/Fluid/300초 함수 허용 설정과 NVIDIA 생성·검토 실측도 대조한다.
6. 운영 NVIDIA 권한/가용성·소수 비식별 실모델·Redis·호출 예산·시간 예산을 사전 검증한 뒤 `PUBLIC_AI_VERIFIED=true`, `PUBLIC_AI_ENABLED=true`로 설정해 정확한 소스를 배포한다. 공개 실제 전체 흐름은 활성 배포 직후 검증한다. 실패 시 신규 호출 중지와 비활성화/복구를 수행한다. 새 유료 플랜 선택은 별도 결정 대상이다.

즉시 중지: Redis 콘솔에서 `{pyeoneo-ai-v1}:disabled` 값을 `1`로 설정하면 신규 예약과 다음 모델 호출이 중지된다. 장기 중지는 Vercel `PUBLIC_AI_ENABLED=false` 후 재배포한다. 한도 서비스 장애 시 메모리 카운터나 다른 유료 모델로 우회하지 않는다.

## 상태

키 등록 안내·구성안·로컬 실제 Redis/모의 공급자 검증까지 준비 완료. Upstash 생성/계약, 운영 키/Redis 설정, NVIDIA 운영 권한 확인, 실모델 및 공개 AI 실호출은 미완료다. 무료 구성안에 동의하거나 기존 운영 계약 근거/설정 등록이 완료되면 후속 실제 연결 검증을 진행할 수 있다.

## 2026-11-11 후속 요청의 승인 범위

사용자 소유 Upstash Free 생성·연결과 Vercel Production 설정·검증 소스 활성 배포는 승인됨. 공개 전체 흐름을 사전 검증 조건에 넣지 않는다. 본문의 비용표는 공개 요금이며 생성 직전 소유 계정의 실제 Free 플랜을 확인한다. `PUBLIC_AI_LIMIT_SALT`와 비활성 플래그 두 개는 후속 작업에서 Production에 생성했고, 비밀값은 출력하지 않았다. 기존 NVIDIA 키/Redis URL·토큰은 사용자 직접 등록이 필요하다.
