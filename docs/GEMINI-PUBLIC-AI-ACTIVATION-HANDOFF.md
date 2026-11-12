# 평어담 공개 AI 활성화 WORK HANDOFF

2026-11-12 KST. **PASS — 공개 버튼 활성 확인·실제 생성 성공·출력/복원 검증 모두 완료. 활성 상태로 인계한다.**

## 최종 공개 상태

- 공개 URL: **https://pyeoneo-studio.vercel.app/**
- Production **`dpl_2ZR1G7iFFrt7ZURs3wFaYXxngd2t` READY**, aliasError=null. 배포 URL https://pyeoneo-studio-8px63vjme-subsub-tschool.vercel.app. 팀 `subsub-tschool` / `team_JKZ7B5OCf27pFKiNlhvSVuE4`, 프로젝트 `pyeoneo-studio` / `prj_osDdLkgyiAomzS03J2GFM0c2bVB4`, 공개 도메인과 실제 배포 ID 일치.
- **`PUBLIC_AI_VERIFIED=true`, `PUBLIC_AI_ENABLED=true`** 최종 Production metadata 재조회. **`{pyeoneo-ai-v1}:disabled` 해제**: READY/도메인 확인 후 서버 CLI 결과 stopped=false, 이후 실제 5시도가 모두 공유 예산/중지검사를 거쳐 실행됨. 기존 카운터/salt/namespace 보존.
- GET `/api/generate`: enabled=true / mode=public / localOnly=false. PC·390px에서 실제 ‘AI 후보 12개 생성’ 버튼 활성 확인. 과거 제공사/이용조건 확정 차단 문구 없음. 두 실제 공개 요청 모두200.
- 마지막 배포 buildCommand **`npm run build`**. 일회성 상태/재개 CLI는 최종 배포에서 실행하지 않음. 프로젝트 일반 build 설정·Git 자동 Preview 차단 유지. 새 유료서비스/결제/다른 모델/Gateway 없음.

## 소스·승인 기준과 이전 근거 재사용

| 구분 | 정확한 식별자 |
| --- | --- |
| 시작 개발 / 인계 | `a4d1192fcdc36ffd0ab02d4ddc560b2600157c00` / checkpoint-5-local-ai |
| 시작 운영 앱 | `db1d7e769a198dc40c1079096d23bd8ec1f8f355` / `dpl_ADr4PmG8CyygeqEN5YwKks2aDDRq` READY·비활성 |
| **이번 앱·실제 배포 SHA** | **`b9443ef75edac32cd5c74a54cc6e83dd87fe92e5`** |
| READY 확인용 활성 배포 | `dpl_Et7KooLKoQ6fbTQeG8WbpeevcnDN` / 같은 앱SHA |
| READY 확인 후 중지키만 해제한 서버 작업 | `dpl_4u1VWBZ8XmyKgGnEQHR2TqL4PVA3` / 같은 앱SHA |
| **최종 일반 build 활성 배포** | **`dpl_2ZR1G7iFFrt7ZURs3wFaYXxngd2t` READY** / 같은 앱SHA |
| 문서/검사·인계 최종 SHA | 최종 채팅의 SHA 및 `git log -1 --format=%H -- docs/GEMINI-PUBLIC-AI-ACTIVATION-HANDOFF.md`로 확인. 앱 배포 후 변경은 문서·PDF 검사 도구뿐, 불필요한 앱 재배포 생략 |

원격 최신/깨끗한 작업 트리와 실제 Production을 재조회했다. 시작 운영→개발은 이전 문서/검사 변경뿐이었고, 전체 앱 배포 diff도 검토했다. 검증 앱 커밋 정상push/원격SHA일치 후 소스 업로드. 최종 Vercel 소스88/88파일 SHA-1을 로컬 동일 커밋 manifest와 전부 대조 PASS. 비밀값/환경파일/.vercel/교육원본/작업JSON/검증산출물은 커밋·업로드 제외.

사용자 지시에 따라 이전 실제 Gemini/Upstash 사전 검사(3사례 각12후보·승인가능11/5/8, review-only 부적합5거부/적합1통과), 공개 첫 배치 생성12/수정/선택 승인 근거를 재사용했다. 전체 실모델 사전 검사를 반복하지 않았다. [첫 실행 인계](GEMINI-PUBLIC-AI-HANDOFF.md)의 실제 관찰은 역사로 보존하되 **이전24회총량·자동재시도금지·한 번 공개실패하면 전역비활성화 규칙은 이번 사용자 지시로 대체**했다. 기존 사용자 준비/키/Free플랜 재등록·재확인을 요청하지 않았다.

## 실제 공개 사용자 흐름

합성 평가자료로 공개 사이트를 실제 호출했고 route interception/모의 후보를 사용하지 않았다. 이번 추가 실제 호출은 **5회: 생성3회(그중 재시도1) + 독립 검토2회**, countTokens/전체사전검사 호출0회.

| 관찰 | PC 첫 배치 | 모바일390px 두 번째 배치 |
| --- | --- | --- |
| 생성 버튼 | 실제 enabled | 실제 enabled |
| 실제 제공사 동작 | 생성503 → 같은 생성 단계1회재시도 성공 → 독립검토 | 생성 → 독립검토, 재시도 없음 |
| HTTP / 후보 / 승인가능 | 200 / 12 / 10 | 200 / 12 / 12 |
| UI까지 시간 | 9,096ms | 5,217ms |
| 교사 선택 승인 | 후보 수정 시 확인해제 → 시험교사 명시적선택 →1개 승인 | 시험교사 명시적선택 →1개 승인 |

**실제 Google503을 전역 비활성화 없이 복구한 것을 확인했다.** 첫 실패 생성은 미검토 후보를 반환하지 않았고 같은 입력으로 생성만 재시도한 뒤 독립 검토를 통과했다. 화면에 503 오류를 노출할 필요 없이 요청이200으로 완료됐다. 검토503 시 검토만 재시도/반복503의 안내·작업보존/다음 사용자요청 성공은 아래 모의 회귀로 검증했다. 이번 공개 검증에서 반복503·Google429는 발생하지 않았으므로 실제 발생 관찰로 꾸미지 않는다.

실제 후보로 같은 교과 조합·복사(클립보드 내용 일치), XLSX 다운로드·재열기(개별 승인/조합 셀 일치), PDF bytes 포함 작업 저장·복원, PDF canvas 표시, 복원 시 승인해제·시험교사의 명시적 재승인, 390px 넘침 없음 PASS. PDF 원칙/로고/계획확정/직접작성/최종교사승인 유지. 실제 학생 개인정보/교육 원본 없음. 실제 생성 브라우저의 콘솔/pageerror0.

### 단계별 실제 응답

| 화면 | 단계 | 재시도 | ms | 입력 / 출력 / 생각 tokens | 실제 responseModel | 결과 |
| --- | --- | --- | --- | --- | --- | --- |
| PC | generation | 아니오 | 2191 | 미제공 / 미제공 / 미제공 | 미제공 | Google HTTP 503 |
| PC | generation | 예 | 3537 | 768 / 560 / 미제공 | gemini-3.5-flash-lite | PASS |
| PC | review | 아니오 | 1541 | 1009 / 150 / 미제공 | gemini-3.5-flash-lite | PASS |
| 390px | generation | 아니오 | 2729 | 768 / 551 / 미제공 | gemini-3.5-flash-lite | PASS |
| 390px | review | 아니오 | 1691 | 1047 / 149 / 미제공 | gemini-3.5-flash-lite | PASS |

요청 모델은 모든 시도에서 서버 고정 `gemini-3.5-flash-lite`. 성공4회 실제 modelVersion도 동일, 503실패1회는모델/usage미제공. 생각토큰은응답미제공(null)이며0으로꾸미지않음. 원문/키/프롬프트/상위오류본문은로그에없음. 원시시간은Vercel UTC로그, 표는기간ms이며검증일은KST. 이전실행23회와이번5회를별도기록(누계28회); 이전24회제한은이번지시로대체됐다. 비용메타데이터미제공, 사용자확정Free사용·결제변경없음.

## 503·공유 무료 예산 구현

- Gemini REST 어댑터와 공개 핸들러 모두 요청 최대3호출. 평상시 생성+독립검토2, 요청 전체 추가503시도1회. 생성/검토 각각1회씩 추가하는 구조가 아니다. 검토 실패에는 `generateBatch`의 이미 생성한 후보 객체를 그대로 재사용한다. 모델·JSON schema·LOW thinking·종결/금지어/근거·의미검토는 유지했다.
- HTTP503에만 실패단계 재시도. Retry-After 숫자/HTTP-date 존중, 없으면1~2초무작위. 남은 시간보다긴 대기는 요청종료. 대기중취소·서버270초신호·Redis lease/공유중지를 검사하고, 실제 재호출 전 매번 공유예산을 원자예약한다. 429/403/스키마·안전차단/네트워크에는 이503재시도를 적용하지 않는다.
- 반복503에는 **‘AI가 잠시 응답하지 않습니다. 잠시 후 다시 시도해 주세요.’** 및 입력/기존후보 유지 안내. 검토완료 전/실패한 후보는 반환하지 않는다. 개별 공급자 오류나 검사 종료코드만으로 전역중지하지 않는다.
- 기존 공유rolling60초12호출·입력200kbytes, 전체동시2·UTC100배치/일, IP동시1·분2·일12, salt·namespace·카운터 보존. 재시도도 동일 카운터에 예약/실패소비로 남긴다.
- **추가 고정키 `{pyeoneo-ai-v1}:gemini:daily-calls`**, 450실시도/rolling26시간 원자제한. Pacific DST25시간 하루도 보호해500RPD에50호출여유를 둔다. UTC100배치×최대3호출이 Pacific일자 경계를 걸칠 때도 별도 보호한다. 키/카운터를 초기화해 한도를 우회하지 않는다. 같은Google프로젝트의 다른앱사용량은볼수없으므로제공사429/cooldown도유지한다. 같은학교NAT는IP한도를공유한다.
- Redis장애/예산소진/공유stop에는해당호출차단, 메모리fallback·유료모델대체없음. lease300초, 서버모델작업270초·브라우저290초·route maxDuration300 유지. 실제 공개 런타임nodejs24.x, Next functions-config-manifest300. Hobby/Fluid Enabled/기본300초는이전Work화면확인근거재사용.

## 이번 자동·회귀 검사

- **67/67 자동검사 PASS**, production빌드 PASS, 비밀패턴88파일/공백검사 PASS. 생성503후성공(실제어댑터의3회상한까지모의전송), 검토503후검토만재시도·생성객체동일, 반복503후다음요청성공, 두단계실패에도추가1회상한, 대기취소·공유중지·예산거부·긴Retry-After·초/HTTP-date, 미검토후보미반환/입력보존 검사.
- 실제 **로컬Redis7.4.2+모의시계/HTTP**: 다중클라이언트경쟁/RPM분경계/정확rolling만료/입력bytes/cooldown/450회일일경쟁과26시간만료/lease만료·갱신/stop·장애 PASS. 이는실제Upstash450회부하시험이아님. 기존실제Upstash검증재사용, 이번실제공개5시도는새Lua예산으로Upstash정상작동직접확인.
- 로컬생성오류·늦은응답브라우저PASS(모의). 공개 활성 상태의 예시·계획·PDF드롭 기존회귀3종PASS: 실제PDF선택/드롭·파싱·출처·bytes보존, 직접후보/선택승인/출력/복원·오류/중복입력/390px. 예시후보3회는모의이며실제모델성공에합산하지않음. Origin없는POST403/허용Origin잘못된입력400확인, 모델전송없음.
- PDF회귀첫실행은 canvas가표시된직후기본300×150을읽는검사경쟁으로실패했다. 제품PDF코드는변경하지않고검사가실제render완료(초기canvas크기해제·loading없음·visible)까지기다리도록수정해해당PDF회귀재실행PASS. 일반검사실패로서비스를끄지않음. 최종렌더1280×1120/선택·드롭동일, 콘솔오류0·손상PDF예상경고1.
- 최소보안v0.3.1 기존config scan재실행: 확인30/미확인5/해당없음1, 차단실패0. HTTP→HTTPS/TLS세부/정책/DB규칙 등미확인과CSP등기존권고유지, 전체보안보증으로보고하지않음. 최근30분최종배포error/fatal로그없음. TLS검증을유지하고검증프로세스에기존NSS저장소접근권한만부여, 새CA등록없음.

## 중지키 해제 순서·인계

1. Production설정metadata 키·Redis·salt 존재/범위/Secret여부만재조회(값추출없음). 두플래그true설정.
2. b9443ef 소스활성배포 **Et7… READY와공개도메인연결확인**. 서버CLI status stopped=true로기존stop확인.
3. 별도일회성서버CLI `node scripts/public-ai-control.mjs --resume`: **disabled키하나만 DEL**, 결과stopped=false/countersAndSaltPreserved=true. 두플래그true/Production에서만허용. 영구디버그API·클라이언트resume기능없음.
4. 같은소스일반 `npm run build`최종배포 **2ZR… READY/도메인/88파일hash일치**, preflight/자동resume재실행0. 실제생성·출력회귀후플래그true재조회.

이번복구/전역비활성화실행없음. 이전비활성배포ID는위시작운영에기록했지만일반503에서는돌아가지않았다. 안전상실(키노출/공유한도우회/독립검토우회) 때만필요범위차단·수정·재활성화한다. **공개버튼/실제생성/출력·복원 모두PASS, 필수미완료없음.** 실제공개반복503/429·검토503는이번에발생하지않아관련모의검증과구분한다. 새기능미착수.

Git제외근거: `tmp/gemini-retry/tests.log`, `build.log`, `redis.log`, `live/result.json`, `live/approved.xlsx`, `live/work.json`, `runtime-evidence.json`, `deploy/*manifest.json`, `public-button.json`, `public-*/`, `security-scan.log`. 작업자료/후보원문은저장JSON·이미지등로컬회귀산출물만, 공개로그/문서에는없음. 관찰주체는이번검사는Codex직접, 이전Free·Fluid조건은사용자/Work확인재사용. Work의Drive보관/프로젝트지식업데이트는이번Codex에서미수행.
