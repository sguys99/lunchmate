# 출시 운영 (T10.4, T10.5, T10.6)

> 공개 출시 전에 사용자가 콘솔에서 확인할 일과 관리자 운영 절차를 정리한 문서입니다. 작성 2026-11-02.
> 도메인은 공개 출시도 `https://lunchmate-kr.vercel.app` 유지입니다(D-27). 모든 콘솔에 등록하는 주소는 이 주소와 `http://localhost:3000` 두 개뿐이며, 와일드카드는 쓰지 않습니다(PRD 14.1).
>
> 이 문서와 겹치는 내용은 원래 문서를 정본으로 둡니다.
> - 처음 등록 절차: `docs/setup-guide.md` 3~8장
> - PostHog, Sentry 개인정보 설정, 대시보드, 알림 규칙: `docs/monitoring.md` 4~6장
> - 베타 매일 확인과 의견 분류: `docs/beta-ops.md` 3장, 위험표 9장
> - 관리자 화면 시안과 스키마 결정: `docs/design/g8-comparison-admin.md`, design-decisions D-19
>
> 수치는 2026-11-02에 공식 문서에서 다시 확인했습니다. 콘솔 표시값이 다르면 콘솔을 따르고 이 문서를 고칩니다. 공식 문서에 없어 확정하지 못한 것은 **[콘솔에서 확인]**으로 표시했습니다.

---

## 1. T10.4 브라우저 키 도메인 제한과 사용량 한도, 알림

### 1.0 코드가 쓰는 공개 키 (2026-11-02, `src/lib/env/keys.ts`, `.env.example` 기준, 값은 보지 않음)

| 환경변수 | 서비스 | 브라우저에서 쓰는 곳 | 보호 장치 |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | 카카오 JavaScript 키 | 지도 SDK `dapi.kakao.com/v2/maps/sdk.js`(`libraries=services`로 FD6 장소 검색), 공유 SDK `t1.kakaocdn.net/kakao_js_sdk` | **JavaScript SDK 도메인**(등록 도메인 밖의 요청은 거절) |
| `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` | 네이버 클라우드 Maps | `oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=` | **Web 서비스 URL** |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable 키(`sb_publishable_`) | 모든 DB, Auth, Realtime 호출 | 도메인 제한 기능 없음. **RLS와 보안 함수, DB 하루 한도**가 보호 장치 |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | PostHog 프로젝트 토큰 | 이벤트 전송 | 도메인 제한 기능 없음(토큰은 공개 값). 무료 플랜은 한도를 넘으면 버림 |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN | 오류 전송(서버와 브라우저 공용) | **Allowed Domains**(Origin, Referer 검사) + 무료 쿼터 |

- 서버 전용 키(`SUPABASE_SERVICE_ROLE_KEY` 자리의 `sb_secret_`)는 브라우저 번들 검사(`scripts/check-client-secrets.mjs`)가 막습니다. Supabase도 브라우저 User-Agent로 secret 키를 쓰면 401을 돌려줍니다.
- 키를 바꿔야 할 때(유출 의심): 카카오는 **복제 키 생성**으로 새 값을 만든 뒤 `.env.local`과 Vercel을 바꾸고 재배포, 그다음 원래 키를 지웁니다(JavaScript 키는 대표 키라 마지막 하나는 지울 수 없음). 네이버, Supabase는 각 콘솔의 키 재발급 후 같은 순서입니다.

### 1.1 카카오 디벨로퍼스

확인한 수치(카카오 쿼터 문서, 2026-11-02):

| 항목 | 일 기본 쿼터 |
| --- | --- |
| 지도 Web(JavaScript) SDK | 300,000건(지도 생성 1회가 1건, 이동과 확대는 세지 않음) |
| 카카오맵 키워드로 장소 검색 | 100,000건 |
| 카카오맵 카테고리로 장소 검색(FD6) | 100,000건 |
| 카카오톡 공유 | 30,000건 |
| 월간 | 전체 API 합산 3,000,000건 |

- 카카오맵 API 무료 쿼터는 **개발자 계정에서 처음 활성화한 앱 하나**에만 줍니다.
- 쿼터를 넘었을 때의 동작(오류 코드)은 문서에 없습니다 **[콘솔에서 확인]**. 앱은 재시도 1회 뒤 오류 안내와 "네이버 지도에서 보기"를 보입니다(PRD 12장). 홈 한 번에 카테고리 검색이 최대 3페이지(3건)이므로 하루 약 3만 번 추천을 불러야 닿는 양입니다. 20명 규모에서 닿으면 반복 호출 버그를 먼저 의심합니다(beta-ops 9장).

콘솔 단계:

1. https://developers.kakao.com/console/app 에서 런치메이트 앱을 엽니다.
2. **앱 > 플랫폼 키 > JavaScript 키 > JavaScript SDK 도메인**에 아래 두 개만 있는지 확인합니다. 다른 주소(옛 테스트 주소, 와일드카드)가 있으면 지웁니다. 최대 10개입니다.
   - `https://lunchmate-kr.vercel.app`
   - `http://localhost:3000`
3. **앱 > 제품 링크 관리 > 웹 도메인**도 같은 두 주소인지, 기본 웹 도메인이 `https://lunchmate-kr.vercel.app`인지 확인합니다. 기본 도메인을 바꾸면 공유 링크가 바뀌므로 지금 값이 맞으면 손대지 않습니다.
4. 카카오맵 사용 설정(앱의 제품 설정 화면)이 켜져 있고, 이 앱이 내 계정에서 카카오맵을 처음 켠 앱인지 확인합니다. 다른 앱에서 먼저 켰다면 무료 쿼터가 그 앱에 붙습니다 **[콘솔에서 확인: 메뉴 위치]**.
5. **쿼터** 메뉴에서 지도, 카테고리 검색, 카카오톡 공유의 최근 사용량을 봅니다. 숫자를 1.7절 표에 적습니다.
6. 쿼터 알림 설정이 있으면 80%에 이메일로 켭니다. 없으면 베타 중 주 1회 5번을 반복합니다 **[콘솔에서 확인]**.
7. **REST API 키 > 리다이렉트 URI**가 Supabase 콜백(`https://shgpenqvdlvbpynzgfes.supabase.co/auth/v1/callback`) 하나뿐인지 확인합니다(로그인용, setup-guide 3.3).

출처
- 쿼터: https://developers.kakao.com/docs/ko/getting-started/quota
- JavaScript SDK 도메인, 제품 링크 관리, 복제 키: https://developers.kakao.com/docs/ko/app-setting/app

### 1.2 네이버 클라우드 플랫폼 Maps

확인한 수치:

- 무료 이용량은 **대표 계정 1개**에만 있습니다(Maps API를 가장 먼저 쓴 계정, 개인은 전화번호당 1개). 대표 계정이 아니면 첫 호출부터 과금됩니다(Maps 개요 문서).
- Dynamic Map 무료 이용량은 **월 6,000,000건**입니다. 요금 페이지 표에서 검색으로 확인했고 공식 가이드 본문에는 수치가 없습니다(research-notes T0.15와 같음). 초과 단가와 한도에 닿았을 때 호출이 막히는지는 문서에 없습니다 **[콘솔에서 확인]**.
- 임계치 알림은 고른 비율부터 10%p마다 옵니다(예: 70%를 고르면 70, 80, 90, 100%). 통보 대상이 없으면 알림이 오지 않습니다.

콘솔 단계:

1. https://console.ncloud.com 에 로그인하고 Maps의 Application 목록을 엽니다(setup-guide 6.1의 새 Maps 메뉴).
2. `lunchmate` Application의 **대표 계정 확인**을 눌러 대표 계정인지 확인합니다. 아니면 멈추고 Claude와 상의합니다(과금 위험).
3. **수정**에서 **Web 서비스 URL**이 `https://lunchmate-kr.vercel.app`과 `http://localhost`(포트 없이) 두 개뿐인지 확인합니다. 서비스 선택은 **Web Dynamic Map**만 체크되어 있어야 합니다.
4. **한도 및 알림 설정 > 한도 설정** 탭에서 Web Dynamic Map 월별 한도를 무료 이용량 이하(권장 6,000,000), 일별 한도를 200,000으로 입력합니다. 월별, 일별 체크박스를 켜고 임계치 70%를 고른 뒤 저장합니다.
5. **통보대상 설정** 탭에 본인 이메일이 있는지 확인합니다. 없으면 **Cloud Insight > Notification Recipient**에서 본인을 먼저 등록하고 추가, 저장합니다.
6. **한도 변경 이력** 탭에서 4번이 저장됐는지 확인합니다.
7. 이번 달 이용량을 확인해 1.7절 표에 적습니다(마이페이지의 이용 내역 또는 콘솔 이용량 화면) **[콘솔에서 확인: 메뉴 위치]**.

출처
- 한도 및 알림 설정, Web 서비스 URL 규칙: https://guide.ncloud-docs.com/docs/maps-app
- 대표 계정과 무료 이용량 대상: https://guide.ncloud-docs.com/docs/maps-overview
- 요금(월 6,000,000건 무료): https://www.ncloud.com/product/applicationService/maps

### 1.3 Supabase

publishable 키의 성격(공식 API 키 문서): 공개 코드에 넣어도 되는 키이고, 도메인이나 Origin으로 제한하는 기능은 문서에 없습니다. 데이터는 **RLS가 지킵니다**. 로그인하지 않은 요청은 `anon`, 로그인한 요청은 `authenticated` 역할로 돕니다. 그래서 이 프로젝트의 보호선은 콘솔이 아니라 마이그레이션입니다: 모든 테이블 RLS, `admin_*` 보안 함수의 관리자 확인, `private.consume_daily_quota` 하루 한도, 정지 쓰기 차단 트리거, 금칙어 DB 안전망(T10.3b).

무료 플랜 수치(요금 페이지, 2026-11-02):

| 항목 | Free |
| --- | --- |
| MAU | 50,000 |
| DB 크기 | 500 MB |
| Egress | 5 GB(+ 캐시 Egress 5 GB) |
| Realtime | 동시 접속 200, 월 메시지 2,000,000, 초당 메시지 100, 초당 채널 참여 100 |
| 백업 | 없음(D-24 수동 `pnpm db:backup`) |
| 일시 정지 | 1주 활동이 적으면 정지(3.4절) |

- 한도를 넘으면: 알림 메일이 오고 유예 기간이 지나면 Fair Use 제한이 걸립니다. 제한에는 프로젝트 정지, DB 읽기 전용, **모든 API 요청에 HTTP 402**가 포함될 수 있습니다. 다음 결제 주기에 풀리거나 Pro로 올리면 바로 풀립니다(Billing FAQ).
- Realtime 동시 접속 200을 넘으면 새 채널 참여가 `too_many_connections`로 거절됩니다. 투표방 화면에서만 구독하므로 20명 베타에서는 닿지 않습니다.

콘솔 단계:

1. https://supabase.com/dashboard 에서 런치메이트 프로젝트를 엽니다.
2. **Authentication > URL Configuration**: Site URL이 `https://lunchmate-kr.vercel.app`, Redirect URLs가 `https://lunchmate-kr.vercel.app/**`와 `http://localhost:3000/**` 두 개(또는 두 주소 기준의 정확한 경로)뿐인지 확인합니다. 다른 도메인이나 `*.vercel.app` 같은 넓은 패턴이 있으면 지웁니다 **[콘솔에서 확인: 지금 등록된 경로 형식 그대로 유지]**.
3. **Authentication > Rate Limits**에서 기본값이 그대로인지 확인합니다(로그인 남용 방지). 바꾸지 않습니다.
4. **Project Settings > API Keys**에서 publishable 키가 하나, secret 키가 하나인지 확인합니다. 쓰지 않는 키가 있으면 Claude에게 알려 주십시오(지우기 전에 Vercel 값과 대조).
5. 조직의 **Usage** 화면에서 지난 30일 DB 크기, Egress, MAU, Realtime 최고 동시 접속을 1.7절 표에 적습니다.
6. 조직 **Billing**에서 플랜이 Free인지 확인합니다. Free에는 지출 상한(Spend Cap) 설정이 없습니다(Pro 이상 기능, Pro는 기본 켜짐).
7. 계정 **Preferences**(또는 Account) 이메일이 받는 주소인지 확인합니다. 일시 정지 경고와 한도 초과 알림이 이 주소로 옵니다.

출처
- API 키(publishable, secret): https://supabase.com/docs/guides/api/api-keys
- 요금과 무료 한도: https://supabase.com/pricing
- 한도 초과 시 제한(402 등): https://supabase.com/docs/guides/platform/billing-faq
- Spend Cap: https://supabase.com/docs/guides/platform/cost-control
- Realtime 한도: https://supabase.com/docs/guides/realtime/limits

### 1.4 PostHog

무료 플랜 수치(요금 페이지, 2026-11-02): 월 이벤트 1,000,000, 세션 리플레이 5,000, 기능 플래그 요청 1,000,000, 예외 100,000, 설문 응답 1,500, 프로젝트 1개, 보관 1년.

- 무료 플랜에서 한도를 넘으면 **그 달의 나머지 이벤트는 버려집니다**(과금되지 않음). 다음 달 초에 다시 쌓입니다. 조직 소유자에게 무료 할당량 80%, 100%에서 메일이 옵니다.
- 청구 한도(billing limit)는 결제 수단을 넣은 유료 플랜에서 쓰는 기능입니다. 지금은 카드를 넣지 않는 것이 가장 확실한 상한입니다.
- 프로젝트 토큰은 공개 값이라 도메인으로 막을 수 없습니다. 남이 토큰으로 가짜 이벤트를 보내면 한도만 줄어듭니다. 지표 해석은 `$host` 필터로 방어합니다(monitoring.md 5.1의 4).
- 세션 리플레이는 쓰지 않습니다(setup-guide 7장).

콘솔 단계:

1. https://us.posthog.com 로그인 → **Settings > Organization > Billing**에서 플랜이 Free인지, 결제 수단이 없는지 확인합니다.
2. 같은 화면에서 이번 달 이벤트 사용량을 1.7절 표에 적습니다. 20명 베타 한 달은 수만 건 수준이어야 정상입니다. 수십만 건이면 Claude에게 알립니다(중복 발화 의심).
3. **Settings > Organization > Members**에서 본인이 Owner이고 이메일이 받는 주소인지 확인합니다(80%, 100% 메일 수신).
4. **Settings > Project > Authorized URLs**(툴바 허용 주소)에 `https://lunchmate-kr.vercel.app`만 있는지 확인합니다. 이 목록은 툴바 실행 허용용이며 이벤트 수집을 막지는 않습니다.
5. 개인정보 설정(IP 폐기, 시간대)은 monitoring.md 4장에서 끝났습니다(T9.0). 다시 하지 않습니다.

출처
- 요금과 무료 한도: https://posthog.com/pricing
- 청구 한도와 80%, 100% 알림, 한도 초과 데이터 손실: https://posthog.com/docs/billing/limits-alerts
- Authorized URLs: https://posthog.com/docs/health-checks/authorized-urls

### 1.5 Sentry

Developer(무료) 플랜 수치(요금 페이지, 2026-11-02): 오류 월 5,000, 스팬 5,000,000, 리플레이 50, 첨부 1 GB, 크론 모니터 1, 사용자 1명, 보관 30일. 유료 Team은 월 $29(연간 결제 시 $26).

- 쿼터를 넘으면 서버가 **429**로 응답하고 이벤트는 받지 않습니다(그 달 남은 기간 오류를 못 봄). Owner에게 쿼터에 가까워지거나 넘으면 메일이 갑니다.
- 트레이스는 10% 샘플링(`SENTRY_TRACES_SAMPLE_RATE = 0.1`)이라 스팬 한도는 여유가 큽니다. 먼저 닿을 것은 **오류 5,000**입니다. 오류 폭주 하나가 한 달 쿼터를 먹지 않게 Spike Protection을 켭니다.
- Allowed Domains는 브라우저 요청의 Origin, Referer를 검사합니다. 서버 SDK 요청은 이 헤더가 없어 그대로 통과합니다.

콘솔 단계:

1. https://sentry.io 로그인 → **Settings > Projects > (런치메이트)**.
2. **Allowed Domains**(Client Security 묶음, 또는 Inbound Filters 화면)에 `lunchmate-kr.vercel.app` 한 줄만 넣고 저장합니다. 기본값 `*`이면 바꿉니다. localhost는 넣지 않습니다(이미 Inbound Filters의 localhost 필터로 버림, 로컬 `pnpm dev`는 `enabled: false`) **[콘솔에서 확인: 메뉴 위치]**.
3. **Settings > Spike Protection**에서 이 프로젝트를 켭니다(Owner 권한).
4. **Stats > Usage**에서 지난 30일 오류 수(Accepted, Dropped, Filtered)를 1.7절 표에 적습니다. Dropped가 있으면 이유(Rate limited, Disallowed Domain)를 함께 적습니다.
5. **Settings > Subscription**에서 플랜이 Developer인지 확인합니다.
6. 계정 **User Settings > Notifications > Quota**(쿼터 알림)가 켜져 있는지 확인합니다 **[콘솔에서 확인]**.
7. 알림 규칙과 개인정보 스크러빙은 monitoring.md 4장, 6장 결과(T9.0)를 그대로 둡니다.

출처
- 요금과 무료 쿼터: https://sentry.io/pricing/
- 쿼터 초과, Spike Protection, Usage 화면: https://docs.sentry.io/pricing/quotas/
- 오류 쿼터 관리와 429: https://docs.sentry.io/pricing/quotas/manage-event-stream-guide/
- Allowed Domains(Origin, Referer 검사): https://docs.sentry.io/concepts/data-management/filtering/

### 1.6 Vercel

이 팀은 **이미 Pro 플랜**입니다(3.1절, `vercel teams ls`와 팀 정보 2026-11-02 확인). Pro에는 지출 관리(Spend Management)가 있고, 지금 **On-Demand Budget $10, 도달 시 프로덕션 일시 중지 켬**으로 설정되어 있습니다(`vercel budgets`).

- 예산은 월 $20 크레딧을 다 쓴 **뒤의 추가 사용분**에 적용됩니다. 지출이 50%, 75%, 100%에 닿으면 웹과 이메일 알림, 100%에서 SMS(설정 시)가 옵니다. 크레딧 75%에서도 자동 알림이 옵니다.
- **일시 중지가 켜져 있으면 예산 도달 몇 분 뒤 모든 프로젝트의 프로덕션이 503 `DEPLOYMENT_PAUSED`가 됩니다.** 예산을 올려도 자동으로 풀리지 않고 프로젝트마다 손으로 재개해야 합니다. 3.3절의 결정 안건입니다.

콘솔 단계:

1. https://vercel.com 로그인 → 팀 `Kwang Myung Yu's projects` → **Settings > Billing**에서 Plan이 Pro인지, 다음 결제일을 확인합니다.
2. 같은 화면 **Spend Management**에서 On-Demand Budget과 **Pause Production Deployments** 상태를 확인합니다. 바꿀지는 3.3절 결정에 따릅니다.
3. **Settings > My Notifications**에서 Team 항목의 **Spend Management**와 사용량 알림이 웹, 이메일로 켜져 있는지 확인합니다. SMS를 받으려면 하단 SMS를 켜고 번호를 인증합니다(100% 도달 시에만 발송).
4. 왼쪽 **Usage**에서 기간을 **Last 30 days**로 바꾸고 3.2절 표와 비교합니다. 터미널에서는 `vercel usage --since 30d`로 같은 값을 볼 수 있습니다(Claude가 대신 실행 가능).
5. 프로젝트 **Settings > Domains**에 `lunchmate-kr.vercel.app`만 프로덕션 도메인으로 있는지 확인합니다.

출처
- 지출 관리(예산, 50/75/100% 알림, 일시 중지 503, 수동 재개): https://vercel.com/docs/spend-management
- Pro 크레딧과 75% 알림: https://vercel.com/docs/plans/pro-plan
- 사용량 화면과 CLI: https://vercel.com/docs/pricing/manage-and-optimize-usage

### 1.7 기록표 (T10.4 완료 기준)

각 콘솔 단계를 마치면 아래 표를 채우고 Claude에게 "T10.4 완료"와 함께 알려 주십시오. 키 값은 적지 않습니다.

| 서비스 | 도메인 제한 확인 | 한도, 알림 설정 | 지난 30일 사용량 | 확인일 |
| --- | --- | --- | --- | --- |
| 카카오 | JS SDK 도메인 2개, 웹 도메인 2개 | 쿼터 화면 확인 | 지도 /일, FD6 /일, 공유 /일 | |
| 네이버 Maps | Web 서비스 URL 2개 | 월 / 일 한도, 70% 알림, 통보 대상 | 월 건 | |
| Supabase | Site URL, Redirect URLs | (Free, 상한 없음) | DB MB, Egress GB, MAU, Realtime 최고 | |
| PostHog | (해당 없음) | Free, 카드 없음, Owner 메일 | 이벤트 건 | |
| Sentry | Allowed Domains | Spike Protection, 쿼터 알림 | 오류 건(Dropped 건) | |
| Vercel | 프로덕션 도메인 1개 | 예산 $, 일시 중지 켬/끔, 알림 | 3.2절 | |

---

## 2. T10.5 관리자 계정과 신고 처리 절차

근거 코드: `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, `src/features/admin/*`, `src/copy/admin.ts`, 마이그레이션 `20261101180000_t8_5_admin_moderation.sql`, `20261102120000_t9_4_beta_feedback.sql`, `20261101120000_t6_5_reviews_reports_deals_waits.sql`.

### 2.1 구조 요약

- **관리자 판별**: `profiles.role = 'admin'` 하나입니다. 사용자는 이 열을 바꿀 권한이 없어 SQL 편집기에서만 지정합니다(PRD Q9 운영자 본인 단독).
- **세 겹 가드**: (1) `src/proxy.ts`가 `/admin`을 로그인 필요로 막음, (2) 레이아웃 서버 컴포넌트가 관리자가 아니면 404(존재를 숨김), 플래그 `adminConsole`, `auth`가 꺼져도 404, (3) 모든 데이터와 처리는 첫 줄에서 관리자를 확인하는 `public.admin_*` 보안 함수로만.
- **화면 구역 5개**: 신고된 후기, 폐업 제보, 사용자, 처리 이력, 베타 의견.
- **관리자도 볼 수 없는 것**: 비공개(나만 보기) 후기의 글. 신고 뒤 작성자가 나만 보기로 바꾼 글은 "작성자가 나만 보기로 바꾼 글"로만 보입니다(AC-FB-2). 장소 이름도 저장하지 않으므로 장소 번호 + 카카오맵 링크로 봅니다(T0.16).

| 함수 | 하는 일 |
| --- | --- |
| `admin_reported_items()` | 신고 큐(후기, 할인). 자동 숨김 먼저, 신고 많은 순, 첫 신고 오래된 순, 200건까지 |
| `admin_closures()` | 폐업 제보 큐 |
| `admin_users(p_query)` | 닉네임 검색, 정지 중 목록, 정지 검토 후보 |
| `admin_log(p_limit)` | 처리 이력(기본 100건) |
| `admin_decide_item(종류, id, hide/restore, 사유, 같은 작성자 포함)` | 숨김 확정 또는 복구 |
| `admin_decide_closure(place_id, confirm/dismiss)` | 폐업 확인 또는 영업 중으로 두기 |
| `admin_set_suspension(user_id, suspended/active, 기간, 사유)` | 정지 또는 해제 |
| `admin_clear_user(user_id)` | 정지 검토 후보 "문제없음" |
| `admin_undo(action_ids)` | 되돌리기(뒤에 같은 대상 처리가 있으면 거절) |
| `admin_beta_feedback(p_limit, p_before)` | 베타 의견(익명 번호) |

**자동으로 일어나는 일 (관리자가 손대기 전)**

| 무엇 | 조건 | 결과 |
| --- | --- | --- |
| 후기, 할인 자동 숨김 (MOD-02) | 마지막 관리자 결정 뒤 **서로 다른 3명**이 신고 | 다른 사람에게 숨김, 큐에 "자동 숨김"으로 올라옴 |
| 신고한 사람 본인 | 신고 1건 | 신고한 사람에게만 바로 가림(D-11, D-13) |
| 폐업 추천 제외 (MOD-03) | 서로 다른 3명이 "아예 닫았어요" 또는 "옮겼어요"("오늘만 쉬어요"는 세지 않음) | 추천과 지도에서 빠짐, 큐에 "추천 제외 중" |
| 정지 검토 후보 | 마지막 결정 뒤 숨겨진 글 2건 이상 | 사용자 구역 "정지 검토가 필요한 분"에 표시(정지는 하지 않음) |
| 정지 해제 | 기간 끝 | pg_cron `lunchmate_expire_suspensions` 10분마다 해제(크론 전이라도 기간이 지나면 쓰기 허용) |
| 처리 이력 정리 | 1년 경과 | 매일 04:40 KST 삭제 |
| 하루 한도 (MOD-05) | 후기 20, 신고와 정보 제보 합산 30, 투표방 10, 베타 의견 10 | DB가 거절 |

### 2.2 관리자 지정과 해제 (Supabase SQL 편집기)

관리자는 운영자 본인 계정 하나만 둡니다(T9.0에서 구글 계정으로 지정 완료). 아래는 다시 지정하거나 바꿀 때의 절차입니다.

1. https://supabase.com/dashboard → 런치메이트 프로젝트 → **SQL Editor** → New query.
2. 지금 관리자 확인:
   ```sql
   select user_id, nickname, provider, created_at
     from public.profiles
    where role = 'admin';
   ```
3. 지정할 계정 찾기(닉네임으로, 또는 최근 가입 순):
   ```sql
   select p.user_id, p.nickname, p.provider, p.role, p.status, p.created_at
     from public.profiles as p
    where p.nickname = '<닉네임>';
   -- 닉네임이 없으면: order by p.created_at desc limit 5
   ```
4. 지정:
   ```sql
   update public.profiles set role = 'admin' where user_id = '<user_id>';
   ```
5. 해제(정지 상태에는 영향 없음):
   ```sql
   update public.profiles set role = 'user' where user_id = '<user_id>';
   ```
6. 확인: 그 계정으로 `/admin`을 새로고침합니다. 지정했으면 "○○ 님, 관리자"가, 해제했으면 404가 보여야 합니다. 2번 쿼리를 다시 돌려 관리자가 의도한 수(1명)인지 봅니다.

주의
- 관리자는 정지할 수 없습니다(`admin_set_suspension`이 `moderation_admin_target`으로 거절). 관리자 계정을 정지해야 하면 5번으로 먼저 해제합니다.
- 관리자 계정을 탈퇴하면 처리 이력의 관리자 id는 null(익명)로 남습니다. 탈퇴 전에 다른 계정을 먼저 지정합니다.
- SQL 편집기는 RLS를 건너뛰는 권한으로 돕니다. `role`, `status` 외의 열은 고치지 않습니다. 정지와 해제는 SQL이 아니라 `/admin`에서 합니다(처리 이력이 남아야 되돌릴 수 있음).
- 관리자 계정(구글)과 Supabase 대시보드 계정은 2단계 인증을 켭니다.

### 2.3 하루 확인 루틴 (5분, 14:00 전후)

베타 기간에는 beta-ops 3장 루틴(monitoring.md 8장 지표 → Sentry → 베타 의견)에 아래 순서를 붙입니다. 출시 뒤에도 같은 순서로 하루 한 번 봅니다.

1. `/admin` 열기(나 탭 설정의 "관리자 화면" 줄). 머리줄의 새로고침을 한 번 누릅니다.
2. **신고된 후기**: "자동 숨김"부터 끝까지 한 건씩 판단합니다(2.4절). 남은 건수가 0이 되면 "검토할 것을 모두 마쳤습니다"가 나옵니다.
3. **폐업 제보**: "추천 제외 중"을 먼저 봅니다. 카카오맵 링크로 장소를 열어 영업 여부를 확인하고 결정합니다(2.4.3).
4. **사용자**: "정지 검토가 필요한 분"이 있으면 2.5절 기준으로 정지 또는 "문제없음". "정지 중" 목록의 기간이 맞는지 훑어봅니다.
5. **처리 이력**: 오늘 처리한 것이 의도대로인지 봅니다. 잘못 누른 것은 여기서 되돌립니다.
6. **베타 의견**: beta-ops 3.3절대로 읽습니다(베타 기간만).
7. 문의 메일함(`NEXT_PUBLIC_CONTACT_EMAIL`)에서 신고, 이의 제기 메일을 확인합니다(2.6절).

목표 처리 시간: 자동 숨김과 "개인정보" 사유 신고는 **당일**, 나머지 신고와 폐업 제보는 **영업일 2일 안**. 하루 비우는 날은 자동 숨김과 하루 한도가 계속 돌므로 다음 날 몰아서 봅니다.

### 2.4 신고 유형별 판단 기준과 처리

공통 원칙
- 판단은 **글 내용**으로 합니다. 신고 수는 우선순위일 뿐 결론이 아닙니다(3건이어도 문제없으면 복구).
- 의심스러우면 숨김을 확정하지 않고 그대로 둡니다. 단, 개인정보와 위협은 의심만으로도 숨깁니다.
- 숨김 사유는 화면이 가장 많이 받은 신고 사유를 미리 골라 둡니다. 실제 판단과 다르면 바꿔서 숨깁니다.
- 같은 작성자의 다른 신고 글이 같은 이유로 문제면 "같은 작성자의 다른 신고 글 n건도 함께 숨기기"를 씁니다. 하나씩 되돌릴 수 있습니다.

#### 2.4.1 후기 신고 (사유 코드: `spam`, `abuse`, `privacy`, `false`, `other`)

| 사유 | 숨김 확정 기준 | 숨기지 않는 경우 | 작성자 조치 |
| --- | --- | --- | --- |
| 광고, 스팸 `spam` | 다른 가게, 상품, 연락처, 링크 홍보. 식사와 무관한 같은 문장 반복 | 그 식당의 메뉴, 가격을 구체적으로 칭찬한 글(광고처럼 보여도 경험이면 둠) | 같은 홍보가 2건 이상이면 정지 검토 |
| 욕설, 비방 `abuse` | 욕설, 특정인(직원, 사장, 손님) 비하, 혐오 표현 | 맛, 서비스, 가격에 대한 강한 불만("최악이었다", "다시 안 감") | 위협이나 혐오는 1회로도 정지 검토 |
| 개인정보 `privacy` | 실명, 전화번호, 얼굴 특정 묘사, 직원 이름표 언급 등 누군지 알 수 있는 내용 | 가게 공개 정보(상호, 대표 메뉴) | 의도적 노출이면 정지. **당일 처리** |
| 허위 `false` | 명백히 다른 가게 이야기, 존재하지 않는 메뉴, 같은 사람이 여러 글로 평점 조작 | 운영자가 사실을 확인할 수 없는 경험담(맛, 양, 대기) | 조작 패턴이면 정지 검토 |
| 기타 `other` | "기타 사유에 남긴 말"을 읽고 위 네 가지 중 하나에 해당하면 그 사유로 숨김 | 개인 취향 차이 | |

- 후기 글이 없고 평가(좋았어요, 별로였어요)만 있으면 숨길 이유가 거의 없습니다. 같은 사람이 같은 가게를 반복 평가하는 패턴만 봅니다.
- "작성자가 나만 보기로 바꾼 글"은 이미 다른 사람에게 보이지 않으므로 "문제없음"으로 넘깁니다(글을 볼 수 없어 판단 근거가 없음).

#### 2.4.2 할인 정보 신고 (사유 코드: `ad_false`, `abuse`, `privacy`, `other`)

| 사유 | 숨김 확정 기준 | 숨기지 않는 경우 |
| --- | --- | --- |
| 광고성, 허위 `ad_false` | 그 식당과 무관한 할인, 외부 링크, 연락처 유도, 끝난 행사를 계속 올림 | 내용이 짧거나 조건이 애매한 실제 할인(종료일, "끝났어요" 3건으로 자연히 숨겨짐) |
| 욕설, 비방, 개인정보, 기타 | 후기와 같은 기준 | |

- 할인은 추천 점수에 반영되지 않습니다(AC-DEAL-2). 그래서 할인 숨김은 표시 품질 문제이고 추천 공정성 문제가 아닙니다. 판단이 애매하면 둡니다.

#### 2.4.3 폐업 제보 (종류: 아예 닫았어요, 옮겼어요, 오늘만 쉬어요)

1. 카드의 "카카오맵에서 보기"로 장소를 엽니다. 카카오맵에 폐업 표시가 있거나 네이버 지도, 최근 리뷰로 폐업이 확인되면 **폐업 확인**(계속 추천 제외).
2. 최근 영업 흔적(최근 1~2주 리뷰, 영업시간 갱신)이 있으면 **영업 중으로 두기**. 그때까지의 제보는 무효가 되고 그 뒤 제보만 다시 셉니다.
3. 확인할 수 없으면 결정하지 않고 둡니다. 3명 제보로 이미 추천에서 빠져 있으므로 사용자 피해는 작습니다. 1주 뒤 다시 봅니다.
4. "옮겼어요"는 옛 장소 번호를 폐업 확인합니다. 새 위치는 카카오에 따로 있는 장소이므로 할 일이 없습니다.

#### 2.4.4 앱 밖으로 들어온 신고 (문의 메일)

앱에서 신고되지 않은 글을 메일로 알려 오면, 관리자 계정으로 앱에서 그 후기를 직접 신고한 뒤 신고 큐에서 처리합니다(관리자 화면에는 신고된 글만 보임). 개인정보 노출이면 당일 처리하고 보낸 분께 2.6절 답장을 보냅니다.

### 2.5 정지 기간 기준

정지 효과: 후기, 신고, 제보, 할인, 웨이팅, 투표방 만들기, 투표, 후보 넣기를 새로 할 수 없고 공개 후기가 목록에서 빠집니다. 로그인, 열람, 내 글 지우기, 탈퇴는 됩니다(D-19 안건 6). 사용자에게는 "이용이 제한된 계정입니다 … 궁금한 점은 나 탭의 문의하기로 보내 주세요."가 보입니다.

| 상황 | 기간 | 정지 사유 코드 |
| --- | --- | --- |
| 정지 검토 후보(숨김 2건 이상)지만 고의성이 약함(감정적 불만 표현) | 정지 없이 "문제없음" | |
| 숨김 2건 이상, 같은 유형 반복(스팸, 욕설) 첫 정지 | **7일** | `repeated` 또는 `spam`, `abuse` |
| 7일 정지가 끝난 뒤 다시 숨김 2건 이상 | **30일** | 같은 사유 |
| 30일 정지 뒤 또 반복 | **해제할 때까지** | 같은 사유 |
| 다른 사람의 개인정보를 의도적으로 노출, 위협, 혐오 | 1회로 **30일**, 심하면 **해제할 때까지** | `privacy`, `abuse` |
| 자동화로 보이는 도배(짧은 시간 같은 문장 다수), 홍보 계정 | **해제할 때까지** | `spam` |
| 그 밖에 위 표로 판단하기 어려움 | 7일, 판단 근거를 2.7절 메모에 남김 | `other` |

- 정지는 "작성자 정지"(신고 카드) 또는 사용자 구역에서 합니다. 정지 직후 토스트의 되돌리기나 처리 이력에서 되돌릴 수 있습니다.
- 정지해도 이미 숨긴 글은 그대로이고, 정지를 풀어도 숨긴 글은 복구되지 않습니다(필요하면 글마다 복구).

### 2.6 이의 제기 응대 (문의 이메일)

창구는 이메일 하나입니다(D-21, `NEXT_PUBLIC_CONTACT_EMAIL`, 나 탭 > 문의하기).

1. **받은 날 확인 답장**(정형 문구, 습니다체):
   > 보내 주신 내용을 받았습니다. 영업일 3일 안에 확인 결과를 알려 드리겠습니다. 확인을 위해 런치메이트 닉네임을 알려 주시면 도움이 됩니다.
2. **확인**: `/admin` 사용자 구역에서 닉네임을 찾아 정지 기간, 사유, 최근 글과 받은 신고 수를 봅니다. 처리 이력에서 어떤 글을 어떤 사유로 숨겼는지 봅니다.
3. **판단**: 2.4, 2.5절 기준으로 다시 봅니다. 판단이 틀렸으면 처리 이력에서 되돌리거나(뒤에 다른 처리가 없을 때) 정지 해제, 글 복구를 합니다. 기준대로였으면 유지합니다.
4. **결과 답장**(영업일 3일 안):
   - 유지: "확인 결과 [사유] 기준에 해당해 [기간] 이용 제한을 유지합니다. 제한은 [날짜]에 자동으로 풀립니다." 숨긴 글의 원문은 메일에 옮기지 않습니다.
   - 철회: "확인 결과 제한을 풀었습니다. 지금부터 다시 후기와 제보를 남길 수 있습니다. 불편을 드려 죄송합니다."
5. 같은 건으로 두 번째 이의 제기가 오면 결과를 바꿀 새 사실이 있는지만 보고, 없으면 1회 답장으로 마칩니다.

주의: 신고한 사람이 누구인지는 어떤 경우에도 알려 주지 않습니다. 다른 사용자의 기록(방문, 투표, 후기)도 메일로 보내지 않습니다. 본인 정보 열람, 삭제 요청은 개인정보 처리방침 절차를 따릅니다(T10.3 약관).

### 2.7 기록 방법

| 무엇 | 어디에 | 비고 |
| --- | --- | --- |
| 숨김, 복구, 폐업 결정, 정지, 해제, 문제없음 | **자동**: `private.moderation_actions`(처리 이력 구역) | 1년 보관 뒤 자동 삭제. 별도로 적지 않습니다 |
| 판단이 애매했던 건의 근거, 정지 `other` 사유 | 문의 메일함의 본인 메모(라벨 `런치메이트/운영`) | 저장소에 사용자 닉네임, 글 원문을 옮기지 않습니다 |
| 이의 제기 메일과 답장 | 메일함 라벨 `런치메이트/이의제기` | 결과(유지, 철회)를 제목 앞에 붙임 |
| 월간 요약 | `docs/beta-retro.md`(베타 기간) 또는 출시 뒤 운영 회고 | 건수만: 신고 n, 숨김 n, 복구 n, 폐업 확인 n, 정지 7일/30일/무기한 n, 이의 제기 n(철회 n) |
| 기준을 바꾼 결정 | `docs/design-decisions.md` 새 D 항목과 이 문서 2.4, 2.5절 | |

월간 요약 숫자를 뽑는 SQL(SQL 편집기, 읽기 전용):

```sql
select action, count(*) as n
  from private.moderation_actions
 where created_at >= date_trunc('month', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'
   and reverted_at is null
 group by action
 order by action;
```

---

## 3. T10.6 Vercel 플랜 검토

### 3.1 지금 상태 (2026-11-02 CLI 확인)

| 항목 | 값 | 근거 |
| --- | --- | --- |
| 플랜 | **Pro**(체험판 아님, 결제 상태 active) | `vercel teams ls`, 팀 billing 정보(trial 없음) |
| Pro 전환일 | 2026-09-26(런치메이트 시작 전) | 팀 billing `planChangedAt` |
| 결제 주기 | 매월 26일 시작(이번 주기 10/26~11/26) | 팀 billing `period` |
| 지출 관리 | On-Demand Budget **$10**, 도달 시 **프로덕션 일시 중지 켬** | `vercel budgets` |
| 빌드 머신 | Elastic(기본값) | 팀 `resourceConfig` |

CLAUDE.md 13장, PRD 13장 표(Vercel 행), setup-guide 1장, research-notes T0.19는 "Hobby" 전제로 적혀 있습니다. 실제는 Pro이므로 **상업적 이용 제한은 지금 적용되지 않습니다.** 문서 정정은 사용자 확인 뒤 오케스트레이터가 합니다.

### 3.2 현재 사용량 (지난 30일, 10/03~11/02, 크레딧 차감 전)

| 항목 | 사용량 | 금액 | Hobby 한도였다면 |
| --- | --- | --- | --- |
| Build CPU Minutes | 1,888분 | $6.61 | (Hobby는 표준 빌드 머신 포함, 별도 과금 없음) |
| Deployment Storage | 150.78 GB | $0.50 | |
| ISR Writes | 69.7K | $0.36 | |
| Fluid Active CPU | **2.07시간** | $0.34 | 월 4시간의 **52%** |
| Function Storage | 88.86 GB | $0.30 | |
| Fast Origin Transfer | 1.13 GB | $0.24 | 월 10 GB의 11% |
| Fluid Provisioned Memory | 7.92 GB-hr | $0.11 | 월 360 GB-hr의 2% |
| Function Invocations | 69.24K | $0.04 | 월 1,000,000의 7% |
| Image Optimization Transformations | 340 | $0.02 | 월 5,000의 7% |
| 인프라 합계 | | **$8.72** | |
| Pro 좌석 | 1 | $19.85 | |

판단
- 인프라 $8.72는 월 크레딧 $20 안이라 **실제 청구는 좌석 $20 수준**입니다. On-Demand 예산 $10은 아직 한 번도 쓰이지 않았습니다.
- 대부분은 개발 중 빌드(main 직접 푸시마다 빌드)와 E2E, 시각 회귀 확인용 접속입니다. 사용자 트래픽이 거의 없는데도 Active CPU가 Hobby 한도의 절반이라, Hobby로 내리면 공개 출시 뒤 한도(넘으면 대부분 **30일 대기**)에 닿을 위험이 있습니다.
- 가장 큰 항목은 Build CPU입니다. 푸시 빈도가 줄면 같이 줄어듭니다.

### 3.3 Hobby와 Pro 비교, 결정 안건

| 항목 | Hobby | Pro(지금) |
| --- | --- | --- |
| 상업적 이용 | **금지**(비상업 개인 용도만) | 허용 |
| 비용 | $0 | 월 $20(개발 좌석 1개, 사용량 크레딧 $20 포함), 크레딧 넘으면 종량 |
| 함수 호출 | 월 1,000,000 | 크레딧 안에서 종량($0.60/100만) |
| Active CPU | 월 4시간 | 종량(시간당 $0.128부터) |
| 데이터 전송 | Fast Data Transfer 월 100 GB, Origin 10 GB | Flat Rate CDN 월 1 TB, 요청 100만 포함 |
| 한도 초과 | 대부분 **30일 동안 그 기능 사용 불가** | 종량 과금, 지출 관리로 알림이나 일시 중지 |
| Cron | 하루 1회, 시각 ±59분 | 분 단위(이 앱은 pg_cron을 써서 해당 없음) |
| 함수 최대 실행 시간 | 300초 | 기본 300초, 최대 800초 |
| 배포 횟수 | 하루 100회 | 하루 6,000회 |
| 런타임 로그 | 1시간 | 1일 |
| 지출 관리 | 없음 | 있음 |

Hobby의 상업적 이용 정의(Fair Use Guidelines): 제작에 관여한 누구든 금전적 이익을 얻는 배포. 방문자 결제, 상품이나 서비스 판매 광고, 사이트 제작 대가, 제휴 링크가 주목적인 사이트, AdSense 같은 광고 포함이 예시입니다. 기부 요청은 해당하지 않습니다. 지금 런치메이트는 광고, 제휴, 결제가 없으므로 Hobby 정의에도 걸리지 않지만, 수익화 2단계(네이티브 배너, 사장님 등록)를 켜는 순간 Pro가 필수입니다.

**권장안: Pro 유지.** 이유는 (1) 출시 뒤 Hobby 한도 초과 시 30일 중단 위험(Active CPU가 이미 절반), (2) 수익화 단계에서 어차피 필요, (3) 실제 비용이 월 $20 정도로 고정적, (4) 런타임 로그 1일과 지출 관리가 1인 운영에 도움.

사용자에게 물을 결정
1. **Pro 유지 여부.** 기본안: 유지. Hobby로 내리면 월 $20을 아끼지만 위 위험을 감수하고, 수익화 전에 다시 Pro로 올려야 합니다.
2. **예산 도달 시 프로덕션 일시 중지.** 지금은 켜짐($10). 켜 두면 비용 폭주(봇 트래픽 등)를 막지만, 도달하면 앱 전체가 503으로 멈추고 손으로 재개해야 합니다. 기본안: **출시 주간에는 켜 둔 채 예산을 $30으로 올림**(한 달 최대 약 $50), 1.6절 알림 50/75/100%로 미리 압니다. 대안 A: 지금대로 $10. 대안 B: 일시 중지를 끄고 알림만.
3. **빌드 머신.** Elastic이 Build CPU를 가장 많이 씁니다. 빌드 시간이 문제가 아니면 표준 머신으로 바꿔 크레딧을 아낄 수 있습니다 **[콘솔에서 확인: Settings > Build and Deployment의 머신 선택]**. 기본안: 지금대로 두고 크레딧을 넘는 달이 생기면 바꿈.

Pro를 유지할 때 다시 볼 조건
- 인프라 사용량이 두 달 연속 크레딧 $20을 넘을 때: 빌드 머신, ISR 쓰기, 이미지 최적화를 먼저 줄임.
- 협업자가 생길 때: 배포 권한 좌석은 1명당 월 $20, 읽기 전용 Viewer는 무료.
- 자체 도메인(수익화 단계, D-27): Pro 유료 팀은 일부 최상위 도메인(.app, .dev, .site 등 16종)을 첫해 무료로 받을 수 있습니다. `.kr`은 대상이 아닙니다.

출처
- Hobby 한도, 30일 대기, Pro 비교표: https://vercel.com/docs/plans/hobby (갱신 2026-09-14)
- 상업적 이용 정의와 Pro 종량 단가: https://vercel.com/docs/limits/fair-use-guidelines (갱신 2026-09-14)
- Pro 가격, 크레딧, Flat Rate CDN, 무료 도메인: https://vercel.com/docs/plans/pro-plan (갱신 2026-09-15)
- Cron 빈도: https://vercel.com/docs/cron-jobs/usage-and-pricing (갱신 2026-07-15)
- 지출 관리: https://vercel.com/docs/spend-management (갱신 2026-09-18)

### 3.4 Supabase 무료 플랜 일시 정지 위험 (짧게)

- 조건: **7일 동안 DB 활동이 적으면** 무료 프로젝트를 정지합니다. 하루 몇 건의 사용자 요청이면 보통 정지되지 않습니다. pg_cron 작업(1분 투표 마감 등)이 "활동"으로 세는지는 문서에 없습니다.
- 경고: 정지 약 **1주 전 경고 메일**, 정지되면 확인 메일이 소유자에게 갑니다. 경고를 받으면 대시보드에서 프로젝트를 열거나 앱을 몇 번 쓰면 막힙니다.
- 복구: 대시보드 → 프로젝트 → **Resume project**. 데이터와 설정이 그대로 돌아오며 정지 뒤 **1년 안**에만 가능합니다.
- 이 프로젝트는 개발과 운영이 같은 프로젝트 하나입니다(D-27). 정지되면 운영 앱 전체(로그인, 추천, 투표)가 멈춥니다. 출시 뒤 매일 사용이 있으면 위험은 낮고, **사용이 끊길 때**(휴가, 사용자 이탈) 위험합니다.
- Pro(조직당 월 $25부터, 컴퓨트는 프로젝트별 별도이며 크레딧 포함)는 정지가 없고 일일 백업이 들어갑니다. 전환 조건 기본안: 아래 중 하나가 생기면 사용자에게 묻고 전환합니다.
  1. 수익화 시작 전(Vercel과 같은 시점)
  2. 무료 한도 80%: DB 400 MB, Egress 4 GB, MAU 40,000, Realtime 동시 접속 160 중 하나
  3. 운영자가 1주 이상 앱과 대시보드를 못 보는 기간이 예정될 때
  4. 한도 초과 알림을 한 번이라도 받았을 때(유예 뒤 402 제한 위험, 1.3절)

출처
- 일시 정지: https://supabase.com/docs/guides/platform/free-project-pausing
- 요금: https://supabase.com/pricing
- 한도 초과 제한: https://supabase.com/docs/guides/platform/billing-faq

---

## 4. T10.11 검색 등록 (구글 Search Console, 네이버 서치어드바이저)

> 사용자가 콘솔에서 하는 일입니다. 코드 쪽은 준비돼 있습니다(2026-11-02): `robots.txt`, `sitemap.xml`(랜딩과 약관 3종), 페이지마다 canonical과 Open Graph, 랜딩 JSON-LD, 소유 확인 메타 자리.
> 등록 주소는 `https://lunchmate-kr.vercel.app` 하나입니다(D-27). `vercel.app`의 하위 주소라 DNS를 고칠 수 없으므로 구글은 **URL 접두어 속성**만, 소유 확인은 **HTML 태그(메타)** 방식으로 합니다.

### 4.0 소유 확인 방식 (정해 둔 것)

- 두 서비스 모두 **HTML 태그**로 확인합니다. 파일 업로드(`public/`에 HTML 파일)는 쓰지 않습니다. 토큰이 저장소에 남고, 계정을 바꿀 때 코드를 고쳐야 하기 때문입니다.
- 토큰은 **서버 환경변수**로 받습니다. 브라우저 번들에 들어갈 이유가 없어 `NEXT_PUBLIC_`을 붙이지 않습니다.

| 환경변수 | 들어가는 메타 | 비었을 때 |
| --- | --- | --- |
| `GOOGLE_SITE_VERIFICATION` | `<meta name="google-site-verification" content="값">` | 메타를 넣지 않음 |
| `NAVER_SITE_VERIFICATION` | `<meta name="naver-site-verification" content="값">` | 메타를 넣지 않음 |

- 코드: `src/lib/env/verification.ts` → 루트 `src/app/layout.tsx`의 `metadata.verification`. 모든 페이지 `<head>`에 들어갑니다.
- 값은 메타 태그의 `content` 따옴표 안 문자열만 넣습니다(태그 전체를 넣지 않음).
- 루트 레이아웃 메타는 **빌드 때** 읽습니다. Vercel에서 값을 넣거나 바꾸면 **다시 배포**해야 반영됩니다.
- 확인이 끝난 뒤에도 **환경변수를 지우지 않습니다.** 구글은 태그가 남아 있는지 주기적으로 확인하고, 없어지면 유예 기간 뒤 권한이 사라집니다. 네이버도 태그 방식은 주기적 재확인이 있다는 안내가 있습니다 **[콘솔에서 확인]**.

### 4.1 구글 Search Console

1. https://search.google.com/search-console 에 운영 구글 계정으로 들어갑니다.
2. **속성 추가** → 오른쪽 **URL 접두어**를 고르고 `https://lunchmate-kr.vercel.app` 을 넣습니다(끝 슬래시 없이 넣어도 됩니다). 왼쪽 "도메인"은 DNS 확인이 필요해 쓸 수 없습니다.
3. 확인 방법 목록에서 **HTML 태그**를 펼치고 `content="..."` 안 문자열만 복사합니다.
4. Vercel → 프로젝트 → Settings → Environment Variables에서 `GOOGLE_SITE_VERIFICATION`을 **Production** 환경에 추가합니다(Sensitive 아님, 공개되는 값).
5. Deployments → 최신 프로덕션 배포 → **Redeploy**.
6. 배포가 끝나면 터미널에서 확인합니다: `curl -s https://lunchmate-kr.vercel.app/ | grep google-site-verification` 한 줄이 나와야 합니다.
7. Search Console로 돌아가 **확인**을 누릅니다.
8. 왼쪽 **Sitemaps** → `sitemap.xml` 입력 → 제출. 상태가 "성공"이고 발견된 URL이 4개(`/`, `/terms`, `/privacy`, `/location`)인지 봅니다.
9. 상단 **URL 검사**에 `https://lunchmate-kr.vercel.app/` 를 넣고 **색인 생성 요청**을 누릅니다.
10. 며칠 뒤 **페이지** 보고서에서 "색인이 생성됨"을 확인합니다. `/today`, `/beta` 등이 "noindex 태그로 제외됨"으로 보이는 것은 의도한 상태입니다.

### 4.2 네이버 서치어드바이저

1. https://searchadvisor.naver.com 에 운영 네이버 계정으로 들어가 **웹마스터 도구**를 엽니다.
2. 사이트 등록 칸에 `https://lunchmate-kr.vercel.app` 을 넣고 추가합니다.
3. 소유확인 방법에서 **HTML 태그**를 고르고 `content="..."` 안 문자열만 복사합니다.
4. Vercel 환경변수 `NAVER_SITE_VERIFICATION`을 **Production**에 추가하고 다시 배포합니다(4.1의 4, 5단계와 같음. 구글과 같이 넣으면 배포는 한 번이면 됩니다).
5. `curl -s https://lunchmate-kr.vercel.app/ | grep naver-site-verification` 로 한 줄이 나오는지 봅니다.
6. 서치어드바이저로 돌아가 **소유확인**을 누르고 보안 문자를 넣습니다.
7. 사이트를 고른 뒤 **요청 → 사이트맵 제출**에 `https://lunchmate-kr.vercel.app/sitemap.xml` 을 넣습니다.
8. **검증 → robots.txt**에서 수집 가능 여부를 봅니다. `/`가 허용, `/poll`, `/login`, `/me`, `/admin`이 차단으로 나오면 정상입니다.
9. **요청 → 웹 페이지 수집**에 `https://lunchmate-kr.vercel.app/` 를 넣어 수집을 요청합니다.
10. 며칠 뒤 **리포트**에서 수집과 노출을 확인합니다.

### 4.3 등록 뒤 확인 (링크 미리보기)

- 카카오톡: https://developers.kakao.com/tool/debugger/sharing 에 `https://lunchmate-kr.vercel.app/` 를 넣어 제목 "오늘 뭐 먹지, 10초 안에 정합니다"와 2:1 이미지가 보이는지 봅니다. 예전 미리보기가 남아 있으면 같은 화면의 **캐시 초기화**를 누릅니다.
- X(트위터) 카드 검증 도구는 없어졌습니다. 글쓰기 창에 주소를 붙여 큰 이미지 카드가 뜨는지만 봅니다(올리지 않아도 됨).
- 랜딩 OG 이미지 주소는 빌드가 붙이는 해시(`/opengraph-image?<해시>`)가 있어 그림 코드를 바꾸면 주소도 바뀝니다. 약관 3종은 해시 없는 `/opengraph-image`를 쓰므로 그림을 바꿨다면 카카오 캐시 초기화를 한 번 합니다.

### 4.4 기록표

| 항목 | 날짜 | 결과 |
| --- | --- | --- |
| Vercel `GOOGLE_SITE_VERIFICATION` 등록과 재배포 | | |
| Search Console 소유 확인, 사이트맵 제출(URL 4개) | | |
| Vercel `NAVER_SITE_VERIFICATION` 등록과 재배포 | | |
| 서치어드바이저 소유확인, 사이트맵 제출, robots.txt 검증 | | |
| 카카오 공유 디버거 미리보기 | | |

출처
- 구글 HTML 태그 확인, 속성 종류, 태그 유지: https://support.google.com/webmasters/answer/9008080
- 네이버 소유확인 메타 이름 `naver-site-verification`: 서치어드바이저 콘솔 안내(2차 자료 https://inblog.ai/ko/docs/seo-tutorial-domain-setup/registering-with-naver-search-advisor 로 대조, 메뉴 이름은 **[콘솔에서 확인]**)
- Next.js `metadata.verification`: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md` "verification"
