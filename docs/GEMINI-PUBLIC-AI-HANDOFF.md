# Gemini 공개 AI WORK HANDOFF

2026-11-12 KST, Codex 직접 실행. **판정: FAIL — 공개 AI 활성화 및 공개 사이트 검증 미완료. 사전 연결 PASS, 공개 2배치 중 두 번째 Gemini 503로 중단, 안전 비활성 복구 완료.**

## 현재 공개 상태

- https://pyeoneo-studio.vercel.app/ : **비활성**. GET enabled=false/mode=disabled/localOnly=false, POST503. AI 버튼은 연결 대기, 직접 작성/검토/교사 승인/출력은 정상이다. 활성 시 이전 차단 안내 대신 전송·독립검토 안내와 ‘AI 후보 12개 생성’ 버튼을 실제 확인했으나 최종 상태는 안전 비활성이다.
- Production **`dpl_ADr4PmG8CyygeqEN5YwKks2aDDRq` READY**, aliasError=null, https://pyeoneo-studio-h99auw9qc-subsub-tschool.vercel.app. 공개 도메인/프로젝트/소스 일치, 84/84 소스 SHA-1 대조 PASS.
- `PUBLIC_AI_ENABLED=false`, `PUBLIC_AI_VERIFIED=false`. 운영 Redis **`{pyeoneo-ai-v1}:disabled=1` 유지**. 새/다음 호출 차단. 중지키만으로 이미 진행 중인 Google 요청이 취소되었다고 주장하지 않는다. 이 시험의 요청은 오류 반환 후 lease 해제까지 완료했다.
- 프로젝트 일반 buildCommand는 변경하지 않았다. 배포별 사전검사/중지 override 뒤 최종 배포는 **`npm run build`**, preflight 재실행0회 확인. 자동 Preview 차단 유지, 비용/결제/모델 대체 변경 없음.

## 소스와 배포

| 구분 | SHA / 배포 |
| --- | --- |
| 시작 원격 개발 | `1c7acdae74066aa95e16bf6387f2818c005fb7ad` / checkpoint-5-local-ai |
| 시작/최초 복구 대상 | `3365053bf018e20335c7fa986a7e5236007c9723` / `dpl_4G6RhbCQ9BWXr37fyxNWbqPzwGz9` READY / pyeoneo-studio-24f6bkgnw-subsub-tschool.vercel.app |
| 검증한 최종 앱 / 실제 배포 소스 | **`db1d7e769a198dc40c1079096d23bd8ec1f8f355`** |
| 최종 사전 검사 PASS | `dpl_HaL5HDc4tfRMjYCaPpfTpkAjpHXp` READY / 같은 db1d7e7 소스·두 플래그false |
| 활성 시험 | `dpl_2qqcMo3G3JDE54xjdGgxBtJXCESw` READY / 같은 소스·두 플래그true / 공개 첫 배치 성공, 두 번째 실패 |
| 실제 공유 중지 실행 | `dpl_C6eK8yFrYcz8dw3X4t55yTHVBZkW` READY / publicAiStop.ok=true / ENABLED=false |
| 최종 일반 비활성 복구 | **`dpl_ADr4PmG8CyygeqEN5YwKks2aDDRq` READY** / 같은 db1d7e7 소스·두 플래그false |
| 운영 문서/검사·인계 최종 커밋 | 최종 채팅의 SHA 및 `git log -1 --format=%H -- docs/GEMINI-PUBLIC-AI-HANDOFF.md`로 확인. 앱 배포 후의 변경은 문서와 브라우저 검사 도구뿐이며 재배포 생략 |

최초 Cloud `work`/2f72e1b 스냅샷은 오래되어 깨끗한 트리 확인 후 원격 개발 HEAD를 fetch/switch했다. 다른 작업 변경 덮어쓰기 없음. 시작 운영3365053→1c7acda 차이는 문서2파일뿐. 실제 운영→최종 앱의 전체 차이와 누적 변경을 검토했으며 제품 화면·로고·PDF 기능은 보존했다. GitHub public/private=false를 직접 조회, 업로드84파일은 원격 커밋 바이트와 일치한다. `.env`/`.vercel`/교육 원본/PDF/XLSX/작업JSON/검증산출물은 업로드/커밋 제외.

## 구현과 무료 제한

- 공개 제공사 Google Gemini Free, **서버 고정 `gemini-3.5-flash-lite`**, 공식 REST 직접 fetch. `PYEONEO_GEMINI_API_KEY`, `PUBLIC_AI_REDIS_URL`, `PYEONEO_AI_REDIS_TOKEN`, 기존 `PUBLIC_AI_LIMIT_SALT`, 두 활성 플래그. 모두 Production 존재/범위/Secret 여부를 metadata로 확인했다. 비밀값 로컬 추출/로그/브라우저 노출 없음. 과거 NVIDIA 내부 시험 경로/키는 보존, 공개 fallback 없음.
- 생성→Zod/종결·금지어·중복·근거 로컬검사→독립 의미 검토, 최대2호출. 서버 LOW thinking, 단계 JSON schema, 생성12개 또는 사실부족0개. 검토 true/빈issues 또는 false/구체issues로 일관성 강제. 무검증 부분 응답/빈/잘림/안전차단/403/429/네트워크/취소/timeout은 실패. 자동 재시도·재생성·모델교체·SDK/Gateway 없음. 별도 confirmed 체크 복원 없음. 계획 확정/교사 최종 선택/승인 전용 출력 유지.
- 기존 전체동시2/UTC하루100배치, IP동시1·분2·UTC하루12 유지. 같은 학교 NAT는 IP 한도를 공유한다. lease300초, Redis server TIME의 ZSET 만료를 CHECK에서도 검사해 수동 TTL 정밀도에만 의존하지 않는다. 만료 lease를 재획득해도 이전 release가 새 lease를 지우지 않음.
- 고정 운영 namespace에 **rolling60초 최대12실호출 + 입력200,000bytes**를 생성/검토 직전 각각 원자 예약한다. 규칙·스키마·기존문장·근거·JSON framing 포함 UTF-8 bytes를 텍스트토큰 보수 상한으로 사용, Google 입력250k TPM에50k 이상 여유. 최대 크기 요청은12회보다 적게 허용된다. 기존32k HTTP/40k 제공사 요청 한도는 축소하지 않았다. 429는 공유cooldown/Retry-After, Redis 장애/중지/만료는 fail closed. 고정 분 카운터만으로 RPM을 보호하지 않으며 메모리 fallback/카운터 삭제/namespace 변경 없음.
- 최종 최대입력 실측 countTokens: 생성 **26,126 tokens / 36,262bytes**, 검토 **29,570 / 39,925**. 따라서 최대 입력을 무조건12회 보내면 TPM에 여유가 없고 공유 입력예산이 필요하다. 이전 schema의 검토 최대30,099토큰도 별도 기록. Google500RPD는 Pacific 자정, 앱은UTC일자. 정상100배치 최대200호출 외 실패/시험/다른 앱 사용량은 별도 소비한다.
- Work가 실제 Vercel 화면에서 확인한 사용자 전달 근거: Hobby, Fluid Compute Enabled, Default Max Duration 기본300초(직접입력 저장 아님). Codex: route Node.js/maxDuration300 및 Next functions-config-manifest300, 실제 공개 런타임 **nodejs24.x** 확인. 모델 작업 signal270초·브라우저290초·함수선언300초 유지. 입력읽기최대10초/Redis각3초 등 별도 bounded 작업이 있어 HTTP 전체가 정확히270초라는 측정으로 과장하지 않는다. Vercel 도구는 원시 함수 설정 필드를 미제공; 설정 근거는 Work 화면+빌드manifest+실제 배포/런타임을 구분한다.

## 실제 사전 검사와 공개 결과

실제 **generateContent 23/24회**: 사전20 + 공개3. 자동 재시도0. 성공응답21, Google503 실패2(사전1/공개1). countTokens는별도 **10회**. 알려진 usage 합계 입력17,328·출력7,629토큰이며 실패2회 usage는미제공이므로 총실사용량으로 단정하지 않는다. 생각토큰은23회모두응답미제공(null), 0으로 기록하지 않았다. 성공응답21회 modelVersion은 모두 gemini-3.5-flash-lite, 실패2회는미제공. 비용메타데이터미제공; 사용자확정Free를사용했고유료서비스변경없음.

최종 사전 검사(동일 db1d7e7 앱):

| 사례 | 후보 / 승인가능 / 표시된 부적합 | 전체 시간 | 호출 |
| --- | --- | --- | --- |
| 색 | 12 / 11 / 1 | 4,258ms | 생성+독립검토2 |
| 낱말 | 12 / 5 / 7 | 3,638ms | 생성+독립검토2 |
| 수 비교 | 12 / 8 / 4 | 4,350ms | 생성+독립검토2 |
| review-only 대조 | 부적합5/5거부, 적합1통과 | 아래 지표 | 검토1 |

핵심활동 동등표현 검사도세사례모두PASS. 낱말6개는‘함.’ 종결로컬검사에서거부, 의미거부1개; 잘못된문장을통과시키지않았다. 이 소수 합성검사가 모든입력의품질을보증하지않으며 교사최종승인을유지한다.

공개 실제: PC 첫 배치 후보12/통과12, 5,315ms(UI까지), 후보 수정 시 승인해제→시험교사의명시적선택→승인1개 PASS. **390px 두 번째 배치의 생성 단계가 Google503(1,511ms), 앱502를 반환**. 독립검토까지진행하지않았고자동재시도없음. 따라서 실제2배치·실제후보조합/복사/XLSX·PDF포함복원/재승인은미완료다. 해당출력경로는복구후합성직접후보회귀로PASS했으며 실제AI전체성공으로대체하지않는다. 23회후남은1회로는새배치2호출검증이불가하여추가실호출중단.

초기실패/수정은역사로남김: 서버Redis1ms/25ms 만료시험실패2회→serverTIME기한/1초시험보강후PASS; 색8후보실패→12또는0 schema보강; 사전Google5031회; 좁은핵심어활용형검사실패→동등표현보강; 낱말통과0→LOW thinking/거부구체사유schema보강후최종전체PASS. 출력검사/의미검토를끄거나원문을로그로출력하지않았다.

## 단계별 실제 응답 지표

응답모델은 실제 modelVersion이며 요청모델표시로대체하지않았다. 입력/출력/생각은응답usage, 미제공은그대로표시. 아래23행이외생성·검토호출없음.

| 실행 | 단계 | ms | 입력 / 출력 / 생각 tokens | 응답 모델 | 판정 |
| --- | --- | --- | --- | --- | --- |
| 사전3/colors | generation | 3638 | 652 / 549 / 미제공 | gemini-3.5-flash-lite | PASS |
| 사전3/colors | review | 1544 | 778 / 166 / 미제공 | gemini-3.5-flash-lite | PASS |
| 사전4/colors | generation | 2763 | 768 / 557 / 미제공 | gemini-3.5-flash-lite | PASS |
| 사전4/colors | review | 1413 | 934 / 149 / 미제공 | gemini-3.5-flash-lite | PASS |
| 사전4/words | generation | 1865 | 미제공 / 미제공 / 미제공 | 미제공 | PROVIDER_HTTP/503 |
| 사전5/colors | generation | 2631 | 768 / 554 / 미제공 | gemini-3.5-flash-lite | PASS |
| 사전5/colors | review | 1378 | 931 / 149 / 미제공 | gemini-3.5-flash-lite | PASS |
| 사전5/words | generation | 3192 | 784 / 881 / 미제공 | gemini-3.5-flash-lite | PASS |
| 사전5/words | review | 1026 | 621 / 51 / 미제공 | gemini-3.5-flash-lite | PASS |
| 사전6/colors | generation | 3227 | 768 / 556 / 미제공 | gemini-3.5-flash-lite | PASS |
| 사전6/colors | review | 1474 | 933 / 173 / 미제공 | gemini-3.5-flash-lite | PASS |
| 사전6/words | generation | 2762 | 784 / 641 / 미제공 | gemini-3.5-flash-lite | PASS |
| 사전6/words | review | 1112 | 771 / 151 / 미제공 | gemini-3.5-flash-lite | PASS |
| 사전7/colors | generation | 2826 | 768 / 560 / 미제공 | gemini-3.5-flash-lite | PASS |
| 사전7/colors | review | 1407 | 1055 / 163 / 미제공 | gemini-3.5-flash-lite | PASS |
| 사전7/words | generation | 2711 | 784 / 660 / 미제공 | gemini-3.5-flash-lite | PASS |
| 사전7/words | review | 903 | 846 / 87 / 미제공 | gemini-3.5-flash-lite | PASS |
| 사전7/numbers | generation | 2564 | 769 / 524 / 미제공 | gemini-3.5-flash-lite | PASS |
| 사전7/numbers | review | 1765 | 1021 / 213 / 미제공 | gemini-3.5-flash-lite | PASS |
| 사전7/대조 | review | 1337 | 772 / 139 / 미제공 | gemini-3.5-flash-lite | PASS |

| 공개 | generation | 2767 | 768 / 557 / 미제공 | gemini-3.5-flash-lite | PASS |
| 공개 | review | 1529 | 1053 / 149 / 미제공 | gemini-3.5-flash-lite | PASS |
| 공개 | generation | 1511 | 미제공 / 미제공 / 미제공 | 미제공 | PROVIDER_HTTP/503 |

## 자동·브라우저·복구 검증

- **61/61 자동검사 PASS**(이번실행, 기존53포함), production빌드 PASS, 비밀패턴검사(84파일)/공백검사/client bundle 서버키·endpoint 미포함 PASS. 요청고정키/모델·단계schema·usage/종료·2호출상한·취소/timeout·오류시후보미반환·새변수·공개활성조건·독립검토전한도거부·공유429 cooldown 검사.
- 실제 **로컬Redis7.4.2** + 모의시계/HTTP: 30클라이언트경쟁→12, 분경계/정확rolling만료, 입력200k예산/cooldown, 두번째검토예산거부, serverTIME lease만료/갱신/이전release무해, 장애/중지 PASS. 기존 전체/IP동시·분/일·AOF재시작보존 PASS. 로컬CLI preflight TTL/만료복구/독립namespace PASS. 운영Upstash시험으로보고하지않음.
- 실제 **Production Upstash**: 연결/PING/EVAL, 동시20→2, IP동시1/분2/일12·전체일100, 클라이언트재생성보존, 제공사12RPM경쟁·입력예산/cooldown, release/TTL/만료회복/공유stop PASS. 네트워크장애차단만모의주입이며 실제Upstash장애발생으로보고하지않음. 기능시험삭제는자기UUID namespace한정; 모델예산과긴급stop은고정운영namespace사용.
- 로컬PC/390px: 예시·계획·PDF드롭·생성오류/늦은응답4종PASS. 공개비활성및최종복구후: 예시·계획·PDF드롭3종PASS, 합성PDF실제파싱·bytes보존·미승인제외·교사선택·조합/복사·XLSX재열기·PDF포함저장복원/재승인·390px·오류보존PASS. 실제교육원본/학생자료없음. 콘솔/pageerror0, 손상PDF예상경고1. 생성오류브라우저회귀는GET/POST모의임을구분하며429/503/504/502/네트워크·중복클릭·활동/예시/수준수정·늦은응답을PASS.
- 최소보안v0.3.1 detect/기존config init/scan 직접실행: 확인30/미확인5/해당없음1, 차단수준실패0. 첫네트워크실패후NODE_USE_ENV_PROXY=1로재실행. TLS세부/HTTP→HTTPS/정책/DB규칙미확인과기존권고는PASS로바꾸지않음. 최종복구배포최근30분error/fatal로그없음.
- 최초배포자동승인거부는목적지/공개원격84파일hash추가대조후같은도구요청으로허용됨. Chromium CA 변경거부후사용자‘검증동안등록후제거’승인수신. 공식CA가이미OpenAI-nebula-dns에동일fingerprint로존재하여task nickname실제추가없음. Chromium이NSS쓰기접근을요구해검증프로세스에만해당경로권한을부여, TLS검증유지. 기존4신뢰인증서는보존, 새CA잔존없음.

## 실패 복구와 미실행

공개502즉시ENABLED=false, 기록한최초정상배포rollback시도는 **Hobby402: previous production보다오래된rollback은Pro필요**로거부됨. 유료전환/우회/alias조작하지않았다. 대신승인된비활성배포경로로공유stopSET1성공→VERIFIED=false→일반build비활성Production READY/공개도메인/84파일hash/핵심회귀까지복구. 초기rollback대상으로돌아갔다고보고하지않으며최종소스는db1d7e7이다. 일반프로젝트buildCommand변경없고최종배포npm run build만실행.

미완료: 공개실제2배치와실제AI후보전체출력/복원. 이유는키누락/사용자준비미완료가아닌Google503및이번24회실호출상한이다. **다시실행하려면새시험예산을명시한후속작업에서공급자가용성검사와공개2배치를수행해야한다.** 현재stop을유지하며자동재개하지않는다. 운영재검사전두플래그false를확인하고서버/소유Redis콘솔에서중지키만해제할수있다(카운터/salt/namespace삭제금지). 키재등록/계약질문/유료서비스추가는필요없다. 이번작업에서다음기능미착수.

복구근거/상세산출물은Git제외 `tmp/gemini-execution-evidence.json`, `tmp/gemini-*-source-manifest.json`, `tmp/gemini-public-live/result.json`, `tmp/gemini-recovery-*`, `tmp/gemini-tests.log`, `tmp/gemini-build.log` 및Vercel배포로그. 원문/키/프롬프트는로그에없다. Work의Drive원본보관/프로젝트지식갱신은이Codex실행에서미수행; Work가이인계를기준으로확정결정·실제PASS·FAIL·미실행을구분해보관한다.
