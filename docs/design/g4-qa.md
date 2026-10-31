# G4 확인 (T4.30)

> 2026-10-31. 대상: 4단계 화면 `/login`, `/welcome/terms`, `/welcome/onboarding`, `/me`와 하위 화면, `/`(랜딩).
> 방법: dev 서버(3100, `NEXT_PUBLIC_DESIGN_LAB=true`)에서 정적 검사, 단위, RLS, E2E를 돌리고, test_rls_ 사용자 세션(e2e/helpers/session.ts 방식)으로
> 실제 화면을 캡처했다. 캡처, 360px 검사, axe는 임시 스펙으로 돌린 뒤 스펙은 지웠다(리포에 남기지 않음). 테스트 사용자는 `pnpm test:rls:cleanup`으로 0명 확인.
> 프로덕션 확인은 읽기 전용(curl GET, 플래그 꺼짐 확인용 빈 POST)만 했다.

## 1. 자동 검사 결과

| 명령 | 결과 |
| --- | --- |
| `pnpm lint` | 통과 (경고 0, CSS 하드코딩 색 없음) |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 통과, 95 파일 1040건 (2 파일 31건은 DB 필요라 건너뜀, 아래 test:rls로 실행) |
| `pnpm lint:copy` | 통과, 금지 문자 0 (329 파일). 문체 경고 1건: `src/copy/landing.ts` 해요체 22%(허용 25~40%, 경고만) |
| `pnpm test:rls` | 통과, 2 파일 30건 (t4-account, t4-delete-account) |
| `RUN_DB_E2E=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 pnpm test:e2e:onboarding` | 통과, 4건 (AC-ONB-1, AC-ONB-2 × 390, 1280) |
| `RUN_DB_E2E=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 pnpm test:e2e:me` | 통과, 6건 (첫 화면과 화면 모드, 사무실, 예산과 기피와 땡겨요 × 390, 1280). 필요한 값: `RUN_DB_E2E=1`(스크립트가 켬), `.env.local`의 Supabase URL, publishable 키, secret 키 |
| `PLAYWRIGHT_BASE_URL=http://localhost:3100 pnpm test:e2e:a11y` (`NEXT_PUBLIC_DESIGN_LAB=true`, mobile + desktop) | 처음 176 통과 8 실패 → **고친 뒤 184건 전부 통과** |
| smoke (`e2e/smoke.spec.ts`, mobile + desktop) | 통과, 4건 (랜딩 제목과 메타, robots와 sitemap) |

### 고친 것

| 문제 | 원인 | 고친 내용 |
| --- | --- | --- |
| a11y `로그인 필요 /poll → /login`, `/me → /login` 8건 실패(라이트, 다크 × 390, 1280) `color-contrast` 2.25:1 | `/login`의 네이버 버튼(가이드 색 초록 면 + 흰 글자). 브랜드 예외(G3 안건 7, DESIGN.md 5장)인데 이 테스트에만 예외 처리가 빠져 있었다. 랜딩 `/`, 시안 화면 검사는 이미 `[data-provider="naver"]`를 뺀다 | `e2e/a11y.spec.ts` 해당 테스트에 같은 `exclude`와 이유 주석 추가. 제품 코드 변경 없음 |

## 2. AC 매트릭스

표기: **자동** 자동 테스트로 증명, **실측** 사용자가 개발 프로젝트에서 직접 확인, **실기기 대기** T4.14에서 확인.

| ID | 내용 | 상태 | 근거 |
| --- | --- | --- | --- |
| AUTH-01 | 카카오(`custom:kakao`), 구글 로그인 | 실측 + 자동(부분) | 2026-10-30 사용자 실측: DB에 provider, 닉네임, 아바타 호스트(kakaocdn, googleusercontent), 약관 동의 저장 확인. 시작과 콜백 로직 `src/features/auth/login-params.test.ts`, `complete-sign-in.test.ts` |
| AUTH-01N | 네이버 로그인(`custom:naver`), 콜백에서 프로필 1회 동기화 | 실측 + 자동(부분) | 2026-10-30 사용자 실측: 토큰 교환, 콜백 프로필 동기화, 닉네임과 pstatic 사진, 약관 저장. `naver-profile.test.ts`(토큰 미저장, 실패 처리) |
| AUTH-02 | 약관 필수 3개, 미체크 시 버튼 꺼짐과 남은 개수, 나중에 하기는 로그아웃 | 자동 | `src/features/auth/terms.test.ts`, `e2e/onboarding.spec.ts`(동의 후 온보딩 이동), 이번 캡처 `g4-terms-*`(남은 3개 안내, 버튼 꺼짐) |
| AUTH-03 | 로그인 후 원래 경로 복귀, 내부 경로만 | 자동 | `redirect.test.ts`(sanitizeNext), `routes.test.ts`, a11y `/poll`, `/me` → `/login?next=` 확인. 카카오톡 인앱 복귀는 AC-AUTH-1(실기기) |
| AUTH-04 | 인앱 감지, 카카오 우선, 구글 탭 시 외부 브라우저 스킴 시도 후 안내 | 자동(UA 판정) + 실기기 대기 | `src/lib/inapp.test.ts`, `design-lab/auth/shared/inapp.test.ts`, 360px `/login?inapp=kakao` 넘침 없음. 실제 스킴 동작은 T4.14 |
| AUTH-05 | 로그아웃, 탈퇴 | 자동 | `delete-account.test.ts`, `t4-delete-account.rls.test.ts`, 실측 시 로그아웃 확인 |
| AUTH-06 | 만 14세 확인(필수 3개 중 하나) | 자동 | `terms.test.ts`(필수 3개 판정), 저장은 사용자 실측(약관 동의 저장) |
| AUTH-07 | 둘러보기와 로그인 유도 시트, 로그인 필요 경로는 전용 화면 | 자동(부분) | `routes.test.ts`, a11y `/today`, `/map` 비로그인 200 + `/poll`, `/me` → `/login`. 시트 실제 연결은 T5 (확인 화면 `/design-lab/auth/sheet`) |
| ONB-01 | 핀을 직접 놓아야 저장, 검색, 현위치 좌표 저장 안 함 | 자동 | `src/features/onboarding/pin.test.ts`, `submit.test.ts`, `e2e/onboarding.spec.ts` |
| ONB-02 | 예산과 도보 슬라이더 기본값, 반경 원과 근처 식당 수 | 자동 | `nearby.test.ts`, `use-onboarding.test.ts`, E2E(`nearby-count`, 저장값 1만, 2만, 10분) |
| ONB-03 | 기피 음식, 알레르기 칩, 직접 입력 | 자동 | `use-onboarding.test.ts`, `submit.test.ts`, 캡처 `g4-onboarding-3-390-light` |
| ONB-04 | 건너뛰기, 진행 표시, 여기까지 하고 시작 | 자동 | `use-onboarding.test.ts`, E2E 건너뛰기 2회 |
| ONB-05 | 완료 즉시 첫 추천 | 자동(임시) | E2E에서 `/today` 도착. 추천 카드는 T5에서 단언 교체(스펙 주석) |
| SET-01 | 사무실 최대 5곳, 기본 지정, 이름 편집 | 자동 | `offices.test.ts`, `add-office-path.test.ts`, `e2e/me.spec.ts` 사무실 |
| SET-02 | 예산, 도보 분 수정 | 자동 | `settings.test.ts`, `e2e/me.spec.ts` |
| SET-03 | 기피 음식, 알레르기 수정 | 자동 | `settings.test.ts`, `e2e/me.spec.ts` |
| SET-04 | 화면 모드 시스템/라이트/다크 (P1) | 자동 | `ui-prefs/prefs.test.ts`, `store.test.ts`, `e2e/me.spec.ts`(첫 페인트 다크) |
| SET-05 | 요즘 이게 땡겨요 7일 (P1) | 자동 | `craving.test.ts`, `e2e/me.spec.ts` |
| AC-AUTH-1 | 카카오톡에서 `/poll/{code}` → 카카오 로그인 → 같은 투표방 | **실기기 대기** | T4.14. 복귀 로직 자체는 `redirect.test.ts`, `routes.test.ts`. `/poll/{code}` 화면은 7단계라 지금은 복귀 경로만 확인 가능 |
| AC-AUTH-2 | 카카오톡 인앱에서 구글 → 외부 브라우저 안내 | **실기기 대기** | T4.14. UA 판정과 안내 화면은 자동(위 AUTH-04) |
| AC-AUTH-3 | 탈퇴 후 재가입 시 새 사용자 | 자동 | `src/lib/supabase/rls/t4-delete-account.rls.test.ts` (새 id, 이전 행 없음) |
| AC-ONB-1 | 기본값으로 60초 안에 홈 | 자동 | `e2e/onboarding.spec.ts` (390, 1280 통과, 약 3초) |
| AC-ONB-2 | 위치 권한 거부해도 주소 검색으로 완료 | 자동 | `e2e/onboarding.spec.ts` (390, 1280 통과) |
| AC-ONB-3 | 현위치, 검색 좌표는 저장 요청에 없음 | 자동 | `pin.test.ts`, `submit.test.ts`(UserPinnedLatLng), E2E AC-ONB-2 저장값 대조, `e2e/me.spec.ts` 사무실 추가 |

**3종 로그인 동작**: 카카오, 네이버, 구글 모두 2026-10-30 사용자 실측 완료(데스크톱 브라우저). 인앱 브라우저는 T4.14.

## 3. DoD 점검 (2.1절, 4단계 화면)

### 3.1 390, 1280, 다크 캡처

`docs/design/shots/2026-10-31/` (18장, `prefers-reduced-motion: reduce`, 지도는 E2E 가짜 SDK라 빈 면)

| 화면 | 390 라이트 | 390 다크 | 1280 라이트 | axe(390 라이트, 다크, 1280) |
| --- | --- | --- | --- | --- |
| `/` 랜딩 | `g4-landing-390-light` | `g4-landing-390-dark` | 넘침 검사만(캡처 생략) | a11y 스펙에서 통과 |
| `/login` | `g4-login-390-light` | `g4-login-390-dark` | `g4-login-1280-light` | 통과 (네이버 버튼 예외) |
| `/welcome/terms` | `g4-terms-390-light` | `g4-terms-390-dark` | `g4-terms-1280-light` | 통과 |
| `/welcome/onboarding` 1단계 | `g4-onboarding-1-390-light` | `g4-onboarding-1-390-dark` | `g4-onboarding-1-1280-light` | 통과 |
| 온보딩 2, 3단계 | `g4-onboarding-2-390-light`, `g4-onboarding-3-390-light` | | | 통과 |
| `/me` | `g4-me-390-light` | `g4-me-390-dark` | `g4-me-1280-light` | 통과 |
| `/me/offices`, `/me/budget` | `g4-me-offices-390-light`, `g4-me-budget-390-light` | | | 통과 |
| `/me/avoid`, `/me/craving`, `/me/account`, `/me/offices/new` | (캡처 생략) | | | 390 라이트, 다크 모두 통과 |

참고: `/me` 전체 페이지 캡처에서 하단 탭이 중간에 찍힌 것은 fixed 요소의 전체 페이지 캡처 특성이다(화면 버그 아님).

### 3.2 4상태 (로딩 스켈레톤, 빈 상태, 오류, 오프라인)

| 화면 | 로딩 | 빈 상태 | 오류 | 오프라인 |
| --- | --- | --- | --- | --- |
| `/login` | 해당 없음(서버에서 바로 그림, fallback 없는 Suspense) | 해당 없음(고정 버튼) | 있음 `?error=` 안내, 외부 브라우저 열기 실패 시 수동 안내와 링크 복사 | 있음, 버튼 `aria-disabled` |
| `/welcome/terms` | `TermsSkeleton` | 해당 없음 | 저장 실패 안내(선택 유지) | 있음 |
| `/welcome/onboarding` | `OnboardingSkeleton`, 지도, 검색, 근처 수 스켈레톤 | 검색 결과 없음 | 저장, 검색, 지도 로드 오류(다시 시도) | 있음, 저장, 검색, 현위치 막음 |
| `/me` | `SettingsSkeleton` | 해당 없음(고정 설정 묶음) | `ErrorState` + 다시 불러오기 | 있음(`SaveNotes`, 로그아웃) |
| `/me/offices` | 있음 | `EmptyState` + 사무실 추가 | 있음 | 있음 |
| `/me/offices/new` | `OnboardingSkeleton` 재사용 | 해당 없음(5곳이면 되돌림) | 있음(핀, 이름 유지) | 있음 |
| `/me/budget`, `/me/avoid`, `/me/craving` | 있음 | 해당 없음(값이 항상 있음, 고르지 않음도 유효) | `ErrorState`, `SaveBar` | `SaveBar` |
| `/me/account` | `AccountSkeleton` | 해당 없음 | `?error=delete` 안내 | 있음 |
| `/` 랜딩 | 해당 없음(정적 데모) | 해당 없음 | 로그인 오류는 `/login?error=` | 있음 |

메모: `/welcome/onboarding`에서 사무실 수 조회가 실패하면 오류 화면 없이 온보딩을 보여준다(`src/app/welcome/onboarding/page.tsx` 60행). proxy와 같은 가용성 우선 판단으로 보이며 다시 저장해도 사무실이 하나 더 생길 뿐이라 그대로 둔다.

### 3.3 분석 이벤트 (PRD 10.2)

| 이벤트 | 연결 |
| --- | --- |
| `login_started` | 서버 `/auth/sign-in`에서 PostHog HTTP 캡처(익명 id) |
| `login_completed` | 서버 `/auth/callback`, 세션 교환 성공 시만 |
| `onboarding_step_completed` | 클라이언트 `onboarding-screen.tsx`, 1~3단계 완료와 건너뛰기 |

10.2절에 설정, 랜딩, 약관 이벤트는 없다(따라서 미연결이 누락이 아님). PostHog 대시보드 수신 확인은 사용자 몫(키가 개발 프로젝트용).

### 3.4 새 테이블 RLS 3역할

`profiles`, `offices`, `avoid_rules`, `preferences`, 공개 프로필 뷰: `pnpm test:rls` 30건 통과(본인, 타인, 비로그인).

## 4. 360px 가로 넘침

`document.documentElement.scrollWidth <= 360`으로 자동 확인. **전부 통과 (넘침 0)**

`/`, `/login`, `/login?inapp=kakao`, `/terms`, `/privacy`, `/welcome/terms`, `/welcome/onboarding` 1, 2, 3단계, `/me/offices`, `/me/offices/new`, `/me/budget`, `/me/avoid`, `/me/craving`, `/me/account`.
390, 1280 캡처 화면도 모두 scrollWidth = 화면 폭.

참고: 360px에서 Next dev 인디케이터(N 버튼, dev 전용)가 온보딩 "이 위치로 저장" 버튼 왼쪽을 덮어 자동 클릭이 막혔다. 프로덕션에는 없어서 검사에서만 숨겼다.

## 5. 프로덕션 확인 (https://lunchmate-kr.vercel.app, 배포 커밋 d2b545f = HEAD)

| 경로 | 결과 |
| --- | --- |
| `/` | 200, "출시를 준비하고 있습니다" 안내(auth 플래그 꺼짐), 로그인 버튼과 `/login` 링크 없음. title, description, canonical, og:title 있음 |
| `/login`, `/welcome/terms`, `/welcome/onboarding`, `/me`, `/me/offices`, `/today`, `/terms`, `/privacy`, `/design-lab`, `/auth/callback` | 404 |
| `/auth/sign-in`, `/auth/sign-out` (GET) | 405 (POST 전용) |
| `/auth/sign-in`, `/auth/sign-out`, `/auth/delete-account` (빈 POST) | 404 (플래그 꺼짐) |
| `/robots.txt` | 200. `Allow: /`, Disallow `/design-lab`, `/auth/`, `/login`, `/welcome`, `/me`, `/poll`, `/admin`, `/api/`, Sitemap 줄 |
| `/sitemap.xml` | 200. `/` 한 개(weekly, priority 1) |

## 6. 실기기 확인 (T4.14와 iOS Safari)

Claude가 대신 확인하지 않았다. 아래 7장 방법으로 준비한 주소에서 직접 본다.

### 카카오톡 인앱 (iOS, Android 각각)
- [ ] AC-AUTH-1: 카카오톡 대화방에 `<주소>/poll/<code>` 링크를 보내 열기 → 로그인 화면 → 카카오 로그인 → 같은 `/poll/<code>` 경로로 복귀(투표방 화면은 7단계 전이라 경로와 주소창만 확인)
- [ ] 첫 로그인이면 약관 → 온보딩 → 원래 경로로 이어지는지
- [ ] 네이버 로그인도 인앱에서 끝까지 되는지
- [ ] AC-AUTH-2: 구글 버튼 → OAuth 오류 화면이 아니라 외부 브라우저 자동 열기(`kakaotalk://web/openExternal`) 또는 1.5초 뒤 수동 안내
- [ ] 자동 열기 성공 시 외부 브라우저에서 같은 화면이 열리고 구글 로그인이 끝나는지
- [ ] 수동 안내의 메뉴 위치 그림과 이름이 실제와 맞는지(iOS 오른쪽 아래 공유/더보기, Android 오른쪽 위 점 세 개, "다른 브라우저로 열기" 이름)
- [ ] "링크 복사" 버튼이 실제로 복사되는지(붙여 넣어 확인)
- [ ] 브랜드 버튼 레이블 서체(system-ui)

### 네이버 앱 인앱
- [ ] 구글 버튼 탭 시 안내가 뜨는지, 안내 없이 구글이 되는지 확인(되면 안건 11 안내를 풀 수 있음)

### 온보딩과 설정 (iOS Safari, Android Chrome)
- [ ] 위치 권한 팝업: 현위치 버튼 → 시스템 팝업 → 허용 시 지도만 이동, 거부 시 안내 문구와 검색으로 계속
- [ ] 주소 검색 입력 시 키보드가 시트를 가리지 않는지, 결과 목록 스크롤
- [ ] 핀 누르기와 끌기(지도 끌기와 충돌 없는지), 놓은 뒤 저장 버튼 켜짐
- [ ] 시트 높이와 하단 safe area(iOS 홈 인디케이터), 100dvh
- [ ] 2단계 슬라이더 엄지 조작, 반경 원 변화
- [ ] `/me` 진동 토글: 켬/끔이 실제 진동에 반영되는지(Android. iOS Safari는 Vibration API 미지원이라 무반응이 정상)
- [ ] 다크 모드 시스템 따라가기, 첫 페인트 깜빡임 없음

## 7. 실기기용 주소 준비 방법

프로덕션은 `auth` 플래그가 `productionOff`라 로그인 화면이 404다. 플래그는 `VERCEL_ENV=production`에서만 꺼지므로 Preview 배포나 dev 서버에서는 켜진다.
주의: 빌드된 앱(NODE_ENV=production)은 OAuth `redirectTo`를 `NEXT_PUBLIC_SITE_URL`로 만든다(`src/features/auth/origin.ts`). 값이 없으면 프로덕션 주소로 돌아가 404가 된다. dev 서버는 요청 주소를 쓴다.
카카오, 네이버, 구글 로그인 콘솔의 Redirect URI는 모두 Supabase 콜백이라 **어느 방법이든 로그인 콘솔은 바꾸지 않는다.**

| 방법 | 장점 | 문제 | 필요한 등록 |
| --- | --- | --- | --- |
| A. `pnpm dev` + LAN IP(`http://192.168.x.y:3100`) | 바로 가능, 배포 없음 | **http라 보안 컨텍스트가 아님** → 위치 권한 팝업, 클립보드(링크 복사)를 확인할 수 없음. 휴대폰이 같은 Wi-Fi여야 함. Next dev의 `allowedDevOrigins`에 IP 추가 필요. IP가 바뀌면 등록을 다시 | Supabase Redirect URLs `http://<IP>:3100/auth/callback`, 카카오 플랫폼 Web 사이트 도메인 `http://<IP>:3100`, 네이버 클라우드 Maps Web 서비스 URL `http://<IP>:3100`, `next.config.ts` allowedDevOrigins |
| B. dev 서버 + HTTPS 터널(cloudflared, ngrok) | https, 배포 없음 | 무료 터널 주소가 실행마다 바뀌어 매번 등록. 프록시 Host 헤더에 따라 `request.nextUrl.origin`이 localhost가 될 수 있어 확인 필요. allowedDevOrigins 필요. dev 모드라 휴대폰에서 느림 | A와 같은 3곳(터널 주소) + allowedDevOrigins |
| **C. Vercel Preview 배포 + 고정 별칭 (추천)** | https(위치, 클립보드 확인 가능), 프로덕션 빌드와 같은 동작, `main` 푸시 없음(`vercel deploy` CLI는 Preview), 별칭이 고정이라 등록 한 번 | Preview 환경변수가 없음(`env:sync`는 production, development만). Preview는 기본으로 Vercel Authentication 보호라 카카오톡 인앱에서 Vercel 로그인 벽이 뜸 | 아래 |

C 준비 순서 (별칭 예: `lunchmate-kr-qa.vercel.app`)

1. Vercel 환경변수(Preview): Supabase URL, publishable 키, secret 키, 카카오 JS 키, 네이버 지도 Client ID, PostHog, Sentry DSN(선택). `NEXT_PUBLIC_SITE_URL=https://lunchmate-kr-qa.vercel.app`, `NEXT_PUBLIC_DESIGN_LAB=false`. (`scripts/env-sync-vercel.mjs`의 ENVIRONMENTS에 preview를 더하거나 대시보드에서 입력)
2. `vercel deploy`(prod 옵션 없이) → `vercel alias set <배포 URL> lunchmate-kr-qa.vercel.app`
3. Vercel Settings > Deployment Protection: 테스트 동안 Preview의 Vercel Authentication 끄기(끝나면 다시 켬). 공유 링크 방식은 인앱 → 외부 브라우저로 넘어갈 때 쿠키가 없어 막힘
4. Supabase > Authentication > URL Configuration > Redirect URLs: `https://lunchmate-kr-qa.vercel.app/auth/callback`
5. 카카오 디벨로퍼스 > 앱 > 플랫폼 > Web 사이트 도메인: `https://lunchmate-kr-qa.vercel.app` (JS SDK, 온보딩 주소 검색)
6. 네이버 클라우드 플랫폼 > Maps Application > Web 서비스 URL: `https://lunchmate-kr-qa.vercel.app`
7. 네이버 개발자센터 로그인 앱의 서비스 URL은 로그인 동작에 영향이 없는 것으로 보이나 [확인 필요]. Callback URL은 Supabase 그대로
8. 테스트 뒤: 보호 다시 켜기. 별칭과 등록은 베타 전까지 두어도 됨(클로즈드 베타의 PR 미리보기 전환 검토와 이어짐)
