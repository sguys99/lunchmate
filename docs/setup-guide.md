# 외부 서비스 등록 가이드 (setup-guide.md)

> tasks.md 0.2절(T0.5~T0.13)의 외부 등록을 사용자가 콘솔에서 직접 따라 할 수 있게 정리한 문서입니다.
> 작성일 2026-10-28. 콘솔 화면은 자주 바뀌므로 각 절 끝의 공식 문서를 함께 보십시오. 확신이 없는 세부는 **[콘솔에서 확인]**으로 표시했습니다.

## 0. 먼저 알아둘 것

### 0.1 확정 값

| 항목 | 값 |
| --- | --- |
| 개발 도메인 (프로덕션) | `https://lunchmate-kr.vercel.app` (`lunchmate.vercel.app`은 타인이 사용 중이라 변경) |
| 로컬 개발 주소 | `http://localhost:3000` |
| Supabase 리전 | 서울 `ap-northeast-2` |
| Supabase Auth 콜백 (카카오, 네이버, 구글 공통) | `https://shgpenqvdlvbpynzgfes.supabase.co/auth/v1/callback` (2026-10-28 확정) |
| 로그인 provider | 구글은 Supabase 내장, 카카오(`custom:kakao`)와 네이버(`custom:naver`)는 Supabase 커스텀 OIDC provider (T0.14, T0.20, 2026-10-28 확정) |

- 모든 콘솔에 위 두 주소(`https://lunchmate-kr.vercel.app`, `http://localhost:3000`)를 **정확한 주소로** 등록합니다. `*.vercel.app` 같은 와일드카드는 쓰지 않습니다(PRD 14.1, tasks T0.5).
- 세 로그인 모두 콘솔의 Callback(Redirect) URL에는 우리 도메인이 아니라 **Supabase Auth 콜백**을 넣습니다. 네이버도 같습니다(T0.14). 우리 도메인 콜백(`/api/auth/naver/callback`)은 커스텀 provider 실측이 실패해 대안 설계로 갈 때만 씁니다.
- **로그인 Client ID와 Secret은 앱 환경변수가 아닙니다.** 앱 코드가 쓰지 않으므로 `.env.local`과 Vercel에 넣지 않고, 사용자가 Supabase 대시보드에 직접 입력합니다(2.1절).
- 자체 도메인은 베타 전에 연결하고(T9.2), 그때 PRD 14.1절 전환 체크리스트대로 모든 콘솔을 다시 고칩니다.

### 0.2 역할 분담

| 서비스 | 누가 | 사용자가 할 일 |
| --- | --- | --- |
| Vercel | Claude (CLI) | 터미널에서 로그인만 |
| Supabase | Claude (CLI) | 터미널에서 로그인만 |
| 카카오 디벨로퍼스 | 사용자 | 콘솔 등록, JS 키는 `.env.local`, 로그인 키와 시크릿은 Supabase 대시보드에 직접 입력 |
| 네이버 개발자센터 (로그인) | 사용자 | 콘솔 등록, Client ID/Secret은 Supabase 대시보드에 직접 입력 |
| 네이버 클라우드 Maps | 사용자 | 콘솔 등록, 한도와 알림 설정, 키 입력 |
| Google Cloud OAuth | 사용자 | 콘솔 등록, 클라이언트 ID와 보안 비밀번호는 Supabase 대시보드에 직접 입력 |
| PostHog, Sentry | 사용자 | 프로젝트 생성, 키 입력 |

### 0.3 비밀키 다루는 법

- **키를 채팅에 붙여넣지 마십시오.** 프로젝트 루트의 `.env.example`을 `.env.local`로 복사한 뒤 값을 직접 채웁니다.
  ```bash
  cp .env.example .env.local
  ```
- `.env.local`과 `.env`는 `.gitignore`로 커밋되지 않습니다. `.env.example`(값 없음)만 커밋합니다.
- 키 종류
  - **브라우저 공개용** (`NEXT_PUBLIC_` 접두): 번들에 그대로 노출됩니다. 그래서 반드시 콘솔에서 도메인 제한을 겁니다.
  - **서버 전용**: 서버 함수에서만 씁니다. `NEXT_PUBLIC_`을 붙이면 안 됩니다.
- Vercel 환경변수 등록은 Claude가 `.env.local`을 읽어 CLI로 처리합니다(T0.13).

### 0.4 권장 순서

검수나 승인 대기가 있는 것부터 시작하고, 기다리는 동안 나머지를 합니다.

1. **Vercel 로그인** (1분): 개발 도메인 `lunchmate-kr` 확정이 모든 콘솔의 전제입니다.
2. **Supabase 로그인** (1분): 프로젝트 ref가 나와야 카카오, 구글 콜백을 채울 수 있습니다.
3. **네이버 개발자센터 (로그인)**: 앱은 지금 등록하고(개발 중 상태), 검수는 4단계 구현 후 요청합니다. 검수 기준을 미리 읽어 두는 게 좋습니다.
4. **Google Cloud OAuth**: 브랜딩 확인(verification)에 영업일 며칠이 걸릴 수 있습니다.
5. **카카오 디벨로퍼스**: 닉네임, 프로필 사진만 쓰므로 별도 심사와 비즈 앱 전환이 없습니다(커스텀 OIDC로 이메일을 요청하지 않음, T0.20).
6. **네이버 클라우드 Maps**: 가입과 이용 신청, 한도 설정.
7. **PostHog, Sentry**: 즉시 발급.

---

## 1. Vercel (T0.5) (Claude가 처리)

사용자가 할 일은 로그인뿐입니다. Vercel CLI가 아직 설치되어 있지 않으므로 먼저 설치합니다. Claude Code 입력창에서 `!`로 시작하면 터미널 명령으로 실행됩니다.

```bash
! pnpm add -g vercel
! vercel login
```

- 로그인 방식(GitHub 등)을 고르고 브라우저에서 승인하면 끝입니다.
- 이후 Claude가 할 일: `lunchmate-kr` 프로젝트 생성과 연결, 도메인 `lunchmate-kr.vercel.app` 확인, 환경변수 등록(T0.13), GitHub 연결(T0.33).
- 확인 결과(2026-10-28): `https://lunchmate-kr.vercel.app`은 현재 `DEPLOYMENT_NOT_FOUND`로 응답해 비어 있는 것으로 보입니다. 실제 할당은 프로젝트 생성 시 확정됩니다.
- 주의: Hobby 플랜은 상업적 이용이 불가합니다. 수익화 전 Pro 전환이 필요합니다(T0.19에서 조사).

## 2. Supabase (T0.10) (Claude가 처리)

```bash
! supabase login
```

- 브라우저에서 액세스 토큰 발급을 승인하면 끝입니다. Supabase CLI가 없다면 `! brew install supabase/tap/supabase`로 설치합니다.
- 이후 Claude가 할 일
  - 개발 프로젝트 생성 (리전 서울 `ap-northeast-2`), DB 비밀번호는 Claude가 만들어 사용자에게 보관을 요청
  - `SUPABASE_PROJECT_REF`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`를 `.env.local`에 기록
  - Auth 설정: Site URL `https://lunchmate-kr.vercel.app`, Redirect URLs에 `https://lunchmate-kr.vercel.app`과 `http://localhost:3000`의 로그인 복귀 경로(정확한 경로는 4단계 인증 구현에서 확정, 와일드카드 미사용)
  - provider 등록 자리 준비와 값 안내(비밀값 입력은 사용자가 2.1절대로 직접)
- Supabase 개발 프로젝트 `lunchmate-dev`(ref `shgpenqvdlvbpynzgfes`, 서울)를 만들었습니다. **콜백 URL** `https://shgpenqvdlvbpynzgfes.supabase.co/auth/v1/callback`을 카카오(3.3), 네이버(4.1), 구글(5.3)에 넣습니다.

### 2.1 로그인 provider 등록 (사용자가 대시보드에서 직접, T0.14, T0.20)

비밀값이 채팅이나 `.env.local`을 거치지 않도록 Supabase 대시보드 **Authentication > Sign In / Providers**에서 직접 입력합니다. 메뉴 이름은 [콘솔에서 확인]. 커스텀 provider는 2026-04 출시 기능이라 화면이 바뀔 수 있습니다.

| provider | 종류 | 입력값 |
| --- | --- | --- |
| 구글 | 내장 Google | Client ID, Client Secret (5.3절) |
| 카카오 | 커스텀, OIDC | 식별자 `custom:kakao`, 이름 `카카오`, issuer `https://kauth.kakao.com`, Client ID = REST API 키, Client Secret = 카카오 로그인 클라이언트 시크릿(3.3절), scopes `openid profile_nickname profile_image`, 이메일 없이 허용(`email_optional`) 켬, PKCE 기본값 유지 |
| 네이버 | 커스텀, OIDC | 식별자 `custom:naver`, 이름 `네이버`, issuer `https://nid.naver.com`, Client ID/Secret(4.2절), scopes `openid`, 이메일 없이 허용 켬, PKCE 기본값 유지 |

- 내장 카카오 provider는 쓰지 않습니다. `account_email`을 항상 요청해 비즈 앱이 아니면 KOE205로 막힙니다(T0.20).
- **처음 정한 식별자를 바꾸지 않습니다.** `custom:kakao`를 나중에 내장 `kakao`로 바꾸면 기존 사용자가 새 계정이 됩니다.
- 무료 플랜은 커스텀 provider 3개까지라 2개를 씁니다.
- Supabase CLI의 `config.toml` + `env(SUPABASE_AUTH_EXTERNAL_*)` 방식은 내장 provider용 로컬 설정이고, 이 프로젝트는 로컬 Supabase를 쓰지 않으므로 사용하지 않습니다.
- 주의: 무료 플랜은 장기간 비활성 시 일시 정지됩니다(CLAUDE.md 13장).

## 3. 카카오 디벨로퍼스 (T0.7)

- 접속: https://developers.kakao.com → 우측 상단 로그인 → 앱 관리 페이지 https://developers.kakao.com/console/app
- 콘솔 개편으로 "플랫폼 > Web > 사이트 도메인" 메뉴가 **앱 > 플랫폼 키**와 **앱 > 제품 링크 관리**로 나뉘었습니다. 예전 블로그 글과 메뉴가 다릅니다.

### 3.1 앱 생성

1. 앱 관리 페이지에서 **앱 생성**. 앱 이름 `런치메이트`, 회사명(개인이면 본인 이름), 카테고리 입력 후 저장.
2. **앱 > 일반 > 앱 기본 정보**에서 앱 아이콘 등록(로그인 동의 화면에 노출, 정식 아이콘은 8단계에서 교체).

### 3.2 JavaScript 키와 도메인 (지도 검색, 공유용)

1. **앱 > 플랫폼 키 > JavaScript 키**를 엽니다.
2. **JavaScript SDK 도메인**에 아래 두 개를 등록합니다. (와일드카드도 허용되지만 쓰지 않습니다.)
   - `https://lunchmate-kr.vercel.app`
   - `http://localhost:3000`
3. **앱 > 제품 링크 관리 > 웹 도메인**에도 같은 두 주소를 등록합니다. 카카오톡 공유 메시지의 링크가 이 도메인으로만 열립니다.
4. JavaScript 키 값 → `NEXT_PUBLIC_KAKAO_JS_KEY` (**브라우저 공개용**, 위 도메인 제한이 보호 장치)

### 3.3 카카오 로그인 (Supabase provider용)

1. **카카오 로그인 > 사용 설정**에서 상태를 **ON**. (OFF면 `KOE004` 오류) 같은 화면의 **OpenID Connect**도 **ON**으로 둡니다(커스텀 OIDC provider 전제, T0.20). [콘솔에서 확인: 메뉴 위치]
2. **앱 > 플랫폼 키 > REST API 키**를 엽니다.
   - **리다이렉트 URI**: `https://shgpenqvdlvbpynzgfes.supabase.co/auth/v1/callback` (2026-10-28 확정). (틀리면 `KOE006` 오류)
   - **클라이언트 시크릿**: 코드를 생성하고 활성화 상태를 **사용함**으로 둡니다.
3. **카카오 로그인 > 동의항목 > 개인정보**에서 아래 두 개만 설정합니다.
   - 닉네임(`profile_nickname`): 필수 동의
   - 프로필 사진(`profile_image`): 선택 동의 (필수/선택 구분은 [콘솔에서 확인], 기본안은 선택)
   - 카카오계정(이메일)은 설정하지 않습니다. 비즈 앱 전환도 하지 않습니다. 커스텀 OIDC provider는 scopes에 이메일을 넣지 않으므로 KOE205가 나지 않습니다(T0.20).
4. 받을 값 (`.env.local`에 넣지 않고 Supabase 대시보드 2.1절에 직접 입력)
   - REST API 키 → 커스텀 provider `custom:kakao`의 Client ID
   - 클라이언트 시크릿 → `custom:kakao`의 Client Secret

### 3.4 주의

- **카카오 로그인 > 동의항목 > 개인정보 국외이전** 항목이 있습니다. Supabase 서울 리전을 쓰므로 해당 없을 것으로 보지만, Vercel 서버 함수 리전과 함께 T0.18 즈음 확인합니다. [콘솔에서 확인]
- 카카오 로컬 API(음식점 검색)는 JavaScript 키로 호출합니다. 일 사용량 한도는 **앱 > 쿼터**(또는 비슷한 이름) 화면에서 확인합니다. [콘솔에서 확인]
- 서버 OG 이미지에는 식당 이름을 넣지 않고 결과 공유 이미지는 브라우저에서 만들기로 해서, 서버용 카카오 REST 키(`KAKAO_REST_API_KEY`)는 MVP에서 필요 없습니다(T0.16-4). 필요해지면 그때 서버 전용으로 추가하고 호출 허용 IP를 검토합니다.

출처 (2026-10-28 확인)
- 앱 설정(플랫폼 키, JavaScript SDK 도메인, 제품 링크 관리 웹 도메인): https://developers.kakao.com/docs/ko/app-setting/app
- 카카오 로그인 사전 설정(사용 설정, 동의항목, 클라이언트 시크릿, 비즈 앱 심사 3~5일): https://developers.kakao.com/docs/ko/kakaologin/prerequisite
- Supabase 카카오 provider: https://supabase.com/docs/guides/auth/social-login/auth-kakao

## 4. 네이버 개발자센터: 네이버 로그인 (T0.6)

- 접속: https://developers.naver.com → 로그인 → **Application > 애플리케이션 등록**
- 등록 후 확인과 수정: **Application > 내 애플리케이션**

### 4.1 등록 입력값

| 항목 | 입력 |
| --- | --- |
| 애플리케이션 이름 | `런치메이트` (동의 화면에 노출. 의미 없는 이름은 검수 반려 사유) |
| 사용 API | **네이버 로그인** |
| 제공 정보 선택 | **별명**, **프로필 사진**만. 이름, 이메일, 성별, 생일, 연령대, 휴대전화번호는 선택하지 않음. 필수/추가 구분은 별명 필수, 프로필 사진 추가를 기본안으로 [콘솔에서 확인] |
| 로그인 오픈 API 서비스 환경 | **PC 웹** (모바일 웹 별도 항목이 있으면 함께 추가) [콘솔에서 확인] |
| 서비스 URL | `https://lunchmate-kr.vercel.app` (대표 URL. 여러 개를 받으면 `http://localhost:3000`도 추가) [콘솔에서 확인] |
| 네이버 로그인 Callback URL | **Supabase 콜백** `https://shgpenqvdlvbpynzgfes.supabase.co/auth/v1/callback` (2026-10-28 확정) (커스텀 OIDC provider 방식, T0.14) |
| 로고 이미지 | 서비스를 대표하는 아이콘 (검수 항목) |

### 4.2 받을 값

- Client ID, Client Secret → `.env.local`에 넣지 않고 Supabase 대시보드 `custom:naver` provider에 직접 입력(2.1절).
- `NAVER_LOGIN_CLIENT_ID`, `NAVER_LOGIN_CLIENT_SECRET`(서버 전용) 환경변수는 커스텀 provider 실측이 실패해 research-notes T0.14 대안 설계로 갈 때만 만듭니다. 그때는 Callback URL도 `https://lunchmate-kr.vercel.app/api/auth/naver/callback`과 `http://localhost:3000/api/auth/naver/callback`으로 바꿉니다.

### 4.3 개발 중 상태와 검수

- 등록 직후는 **개발 중** 상태라 로그인 가능한 아이디가 제한됩니다. **멤버관리**(테스트 ID 등록) 메뉴에 본인과 테스트 계정을 추가합니다. [콘솔에서 확인: 메뉴 이름과 최대 인원]
- 실제 서비스에 열려면 **검수 요청**을 해야 하고, 승인되어야 아이디 제한이 풀립니다. 검수는 로그인 버튼, 가입 흐름 화면 캡처 등을 요구하므로 **4단계(인증 구현) 이후, 베타 전**에 요청합니다. 검수 기간은 공식 문서에 명시가 없습니다. 클로즈드 베타(9단계) 최소 2주 전에 요청하는 것을 권장합니다.
- 검수 대비 메모
  - "서비스 약관정보" 메뉴의 약관이 실제 서비스 약관과 다르면 반려될 수 있습니다(8단계 약관 초안 이후 등록).
  - "만 14세 이상만 가입 가능" 설정이 있습니다. AUTH-06(만 14세 확인)과 맞추어 켜는 것을 검토합니다.
  - 정보는 최소한으로 수집하라는 것이 가이드의 원칙이라 별명, 프로필 사진만 받는 구성은 유리합니다.
- 연결 끊기 알림(**API 설정 > 연결끊기 Callback URL**)은 탈퇴 처리(AUTH-05)와 관련 있으나 MVP에서는 비워 둡니다.

출처 (2026-10-28 확인)
- 네이버 로그인 개발가이드(3.1.2 애플리케이션 등록, 3.1.3 필수 항목, 3.1.4 사전 검수 요청, 서비스 약관정보, 만 14세 설정, 연결 끊기): https://developers.naver.com/docs/login/devguide/devguide.md
- 검수 가이드는 위 문서의 "검수 가이드 바로가기" 링크. 상세 절차는 [콘솔에서 확인]

## 5. Google Cloud OAuth (T0.9)

- 접속: https://console.cloud.google.com → 프로젝트 생성(`lunchmate`) → 왼쪽 메뉴 **Google Auth Platform** (https://console.cloud.google.com/auth/overview)
- 예전 메뉴 이름 "API 및 서비스 > OAuth 동의 화면 / 사용자 인증 정보"는 **Google Auth Platform**의 Branding, Audience, Data Access, Clients로 바뀌었습니다.

### 5.1 Branding (동의 화면)

- 앱 이름 `런치메이트`, 사용자 지원 이메일, 개발자 연락처.
- 앱 홈페이지 `https://lunchmate-kr.vercel.app`, 개인정보처리방침 URL은 8단계에서 채웁니다.
- 승인된 도메인: `lunchmate-kr.vercel.app` (`vercel.app`은 공개 접미사라 하위 도메인 단위로 등록될 것으로 예상) [콘솔에서 확인]. Supabase 콜백 도메인 `supabase.co`도 요구되면 추가합니다. [콘솔에서 확인]
- 로고를 올리면 브랜드 확인(verification)이 필요하고 영업일 며칠이 걸릴 수 있습니다. 로고 없이 시작해도 됩니다.

### 5.2 Audience, Data Access

- 사용자 유형: **외부(External)**.
- 게시 상태가 **테스트**면 등록한 테스트 사용자만 로그인됩니다. 개발 중에는 본인 계정을 테스트 사용자로 추가하고, 베타 전 **프로덕션으로 게시**합니다.
- Data Access(범위): `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`만. 민감 범위를 추가하면 긴 심사가 붙으므로 추가하지 않습니다. 구글은 이메일이 기본 범위라 함께 받지만, 앱에서는 닉네임, 프로필 사진만 씁니다.

### 5.3 Clients (OAuth 클라이언트)

1. **Clients > Create client**, 애플리케이션 유형 **웹 애플리케이션**, 이름 `lunchmate-web`.
2. **승인된 JavaScript 원본**: `https://lunchmate-kr.vercel.app`, `http://localhost:3000` (경로 없이)
3. **승인된 리디렉션 URI**: `https://shgpenqvdlvbpynzgfes.supabase.co/auth/v1/callback` (2026-10-28 확정)
4. 받을 값
   - 클라이언트 ID, 클라이언트 보안 비밀번호 → `.env.local`에 넣지 않고 Supabase 대시보드 내장 Google provider에 직접 입력(2.1절).
   - 비밀번호는 생성 직후에만 전체가 보일 수 있으니 바로 Supabase에 입력합니다.

### 5.4 주의

- 카카오톡 인앱 브라우저는 구글 OAuth를 차단합니다(AUTH-04). 콘솔 설정으로 풀리는 문제가 아닙니다.
- Supabase 문서는 `http://localhost:<port>` 원본을 프로덕션 전에 지우라고 권합니다. 공개 출시 체크리스트(14.2)에서 정리합니다.

출처 (2026-10-28 확인)
- Supabase 구글 로그인(Google Auth Platform의 Audience, Data Access, Branding, Clients 절차, 범위): https://supabase.com/docs/guides/auth/social-login/auth-google
- Google Auth Platform 콘솔: https://console.cloud.google.com/auth/overview

## 6. 네이버 클라우드 플랫폼 Maps (T0.8)

- 접속: https://www.ncloud.com → 회원가입, 로그인 → 콘솔 https://console.ncloud.com
- 신규 등록은 **새 Maps**(Application Services > Maps, console.ncloud.com/maps/subscription)에서 합니다. 옛 블로그 글의 메뉴와 다릅니다.
- 결제수단이 없으면 콘솔 전체가 "서비스 이용이 불가능한 계정입니다"로 막힙니다. 마이페이지 > 결제수단에서 먼저 등록합니다(2026-10-28 확인).

### 6.1 Application 등록

1. 콘솔 우측 상단 **리전 & 플랫폼**을 확인합니다(기본값 유지, [콘솔에서 확인]).
2. **https://console.ncloud.com/maps/subscription** 으로 이동(Menu > All Services > Application Services > Maps)하고 **이용 신청하기**를 누릅니다.
   - 갱신 2026-10-28: 새로 가입한 계정에서는 AI·NAVER API > Application의 Service 선택에 CLOVA만 보이고 Maps가 나오지 않았습니다. 새 Maps 메뉴에서 등록합니다.
3. 처음이면 **Application 등록**에서 AI·NAVER API 이용약관에 동의합니다.
4. Application 이름: `lunchmate` (최대 20자)
5. Service 선택: **Maps > Web Dynamic Map**만 체크. (주소 검색이 필요해지면 Geocoding을 나중에 추가. 체크하지 않은 API를 부르면 429 오류)
6. **Web 서비스 URL** (최대 10개, http/https 구분 없음, 포트와 경로는 넣지 않음)
   - `https://lunchmate-kr.vercel.app`
   - `http://localhost` (포트 `:3000`을 빼고 등록하라는 것이 공식 문제 해결 문서의 안내)
   - 공식 가이드에 "서브 도메인이 있으면 대표 도메인만 입력"이라는 문구가 있습니다. 그대로 따르면 `vercel.app` 전체가 허용되어 와일드카드와 같아지므로 **정확한 주소(`lunchmate-kr.vercel.app`)로 먼저 등록**하고, 인증 오류가 날 때만 Claude와 상의합니다. [콘솔에서 확인]
7. **등록**.

### 6.2 받을 값

- 목록의 **인증 정보** 버튼 → **Client ID** → `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` (**브라우저 공개용**, Web 서비스 URL 제한이 보호 장치)
- Client Secret은 Web Dynamic Map에는 쓰지 않습니다. `.env.local`에 넣지 않습니다(Geocoding 등 REST API를 서버에서 쓰게 되면 그때 서버 전용으로 추가).
- 지도 스크립트 URL의 파라미터 이름(`ncpClientId` 등)은 새 Maps 기준으로 T0.34 구현 때 Claude가 공식 문서로 확인합니다.

### 6.3 한도와 알림 (필수)

1. 목록에서 Application 선택 → **한도 및 알림 설정**.
2. **한도 설정** 탭: Web Dynamic Map의 **일별, 월별 한도**를 무료 이용량 이하로 입력하고, 임계치 알림(예: 80%)을 체크한 뒤 저장.
3. **통보대상 설정** 탭: 담당자(본인)와 통보 방법(이메일/SMS)을 추가하고 저장. 통보 대상이 없으면 알림이 오지 않습니다. 담당자는 **Cloud Insight > Notification Recipient**에서 먼저 등록해야 할 수 있습니다.
4. 무료 이용량은 **대표 계정**에만 제공됩니다. Application 화면의 **대표 계정 확인**으로 확인합니다.
5. 무료 이용량 수치와 초과 요금은 요금 페이지에서 확인합니다. [콘솔에서 확인]

출처 (2026-10-28 확인)
- 새 Maps 사용 가이드(Application 등록, Web 서비스 URL 규칙, 인증 정보, 한도 및 알림): https://guide.ncloud-docs.com/docs/maps-app
- Maps 문제 해결(서비스 URL에서 포트 제거, 429 오류, 새 Maps 대체 안내): https://guide.ncloud-docs.com/docs/maps-troubleshoot
- 기존 Application Maps 가이드(참고): https://guide.ncloud-docs.com/docs/application-maps-app-vpc

## 7. PostHog (T0.11)

- 접속: https://posthog.com → 가입 시 **데이터 리전**을 고릅니다: **US Cloud** 또는 **EU Cloud**. 나중에 바꾸기 어렵습니다. 한국 전용 리전은 없습니다. 기본안은 US(지연은 비슷, 개인정보는 보내지 않는 구조). 결정은 사용자에게 맡깁니다.
- 조직과 프로젝트 이름: `lunchmate`.
- **프로젝트 설정**(https://app.posthog.com/project/settings 또는 EU는 https://eu.posthog.com/project/settings)에서 값 확인
  - Project token(API key, `phc_`로 시작) → `NEXT_PUBLIC_POSTHOG_KEY` (**브라우저 공개용**)
  - 수집 호스트 → `NEXT_PUBLIC_POSTHOG_HOST`: US `https://us.i.posthog.com`, EU `https://eu.i.posthog.com` (CLAUDE.md 12장 등록 완료. PostHog 공식 예시는 `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` 이름을 쓰지만 이 프로젝트는 CLAUDE.md 12장의 `NEXT_PUBLIC_POSTHOG_KEY`를 따릅니다)
- 주의
  - 위치, 좌표, 개인 식별 정보는 보내지 않습니다(CLAUDE.md 7장). 프로젝트 설정의 IP 수집 끄기(Discard client IP data 같은 옵션)를 켜 두기를 권장합니다. [콘솔에서 확인]
  - 세션 리플레이는 기본으로 꺼 둡니다(입력값, 화면 노출 위험).
  - 무료 한도 초과에 대비해 **청구 한도(billing limit)**를 설정합니다. [콘솔에서 확인]

출처 (2026-10-28 확인)
- PostHog Next.js 가이드(프로젝트 설정 위치, 환경변수, 리전별 호스트): https://posthog.com/docs/libraries/next-js

## 8. Sentry (T0.11)

- 접속: https://sentry.io → 가입 시 **데이터 저장 위치**(US 또는 EU)를 고르는 단계가 있습니다. [콘솔에서 확인]
- **Projects > Create Project** → 플랫폼 **Next.js** → 이름 `lunchmate`.
- DSN 확인: **Settings > Projects > lunchmate > Client Keys (DSN)** [콘솔에서 확인]
  - DSN → `NEXT_PUBLIC_SENTRY_DSN` (**브라우저 공개용**, 서버와 브라우저가 함께 사용, T0.35에서 확정)
- 소스맵 업로드용 인증 토큰(`SENTRY_AUTH_TOKEN`, **서버 전용**, 선택): T0.35는 마법사 없이 수동으로 설정했고, 토큰이 없으면 업로드만 건너뜁니다. 필요해지면 Sentry Settings > Auth Tokens에서 만들어 **Vercel 환경변수에만** 등록합니다.
- 주의
  - 오류 이벤트에 현위치, 좌표가 들어가지 않게 `beforeSend`로 거릅니다(CLAUDE.md 7장, 구현 시 Claude 담당).
  - **Settings > Projects > lunchmate > Security & Privacy**(또는 Client Keys)에서 허용 도메인을 `lunchmate-kr.vercel.app`과 `localhost`로 제한할 수 있습니다. [콘솔에서 확인]
  - 무료 플랜 이벤트 한도를 넘으면 수집이 멈춥니다. 사용량 알림을 켭니다. [콘솔에서 확인]

출처 (2026-10-28 확인)
- Sentry Next.js 가이드(마법사, `SENTRY_AUTH_TOKEN`, DSN 형식): https://docs.sentry.io/platforms/javascript/guides/nextjs/

---

## 9. 다 끝나면 Claude에게 전달할 것

키 값은 보내지 말고 아래 체크 결과만 채팅에 적어 주십시오. 예: "3, 4, 5, 6, 7, 8 완료. .env.local에 KAKAO_JS, NAVER_MAP, POSTHOG 2개, NEXT_PUBLIC_SENTRY_DSN 넣음. Supabase에 구글, custom:kakao, custom:naver 등록. PostHog US."

- [ ] `! vercel login` 완료
- [ ] `! supabase login` 완료 (Supabase 리전 서울 `ap-northeast-2`로 Claude가 생성)
- [ ] Supabase 생성 후 받은 콜백 URL을 카카오 REST API 키 리다이렉트 URI, 네이버 Callback URL, 구글 리디렉션 URI에 넣음
- [ ] Supabase 대시보드에 provider 3개 등록 (2.1절): 구글 내장, `custom:kakao`, `custom:naver`
- [ ] `.env.local`에 넣은 키 (넣은 것만 표시)
  - [ ] `NEXT_PUBLIC_KAKAO_JS_KEY` (공개)
  - [ ] `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` (공개)
  - [ ] `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (공개)
  - [ ] `NEXT_PUBLIC_SENTRY_DSN` (공개)
  - [ ] PostHog 프로젝트 설정에서 "Discard client IP data" 켜기 (SDK 옵션으로는 IP 폐기 불가, T0.35)
  - Supabase 4개와 `NEXT_PUBLIC_SITE_URL`은 Claude가 채웁니다.
- [ ] 도메인 제한 확인: 카카오 JavaScript SDK 도메인, 카카오 웹 도메인, 네이버 Maps Web 서비스 URL, 구글 JavaScript 원본에 `https://lunchmate-kr.vercel.app`과 로컬 주소 등록
- [ ] 동의 항목: 카카오, 네이버 모두 닉네임(별명), 프로필 사진만
- [ ] 네이버 Maps 일/월 한도와 통보 대상 설정
- [ ] 네이버 로그인 멤버관리에 테스트 계정 추가 (검수는 4단계 이후)
- [ ] 구글 Audience 테스트 사용자에 본인 계정 추가
- [ ] PostHog 리전 선택 결과 (US/EU), Sentry 데이터 저장 위치
- [ ] 진행 중 막힌 곳, 화면이 이 문서와 달랐던 곳 (문서를 고치겠습니다)

정리(2026-10-28, T0.14, T0.20): 제안했던 `SUPABASE_AUTH_EXTERNAL_*` 4개는 앱 코드가 쓰지 않는 provider 비밀값이라 `.env.example`에서 뺐고, Supabase 대시보드에 직접 입력합니다. `NAVER_LOGIN_*`도 대안 설계 때만 씁니다. `NEXT_PUBLIC_POSTHOG_HOST`는 CLAUDE.md 12장에 추가했습니다.

---

## 부록 A. 자체 도메인 후보 가용성 (T0.12)

확인일 2026-10-28, whois(KISA `whois.kr`, `.com`/`.io` 기본 whois), 구글 레지스트리 RDAP, DNS NS 조회로 확인. **구매는 하지 않았습니다**(구매는 9단계 전, T9.2). 가용성은 언제든 바뀔 수 있으니 구매 직전 등록대행자에서 다시 확인합니다.

| 도메인 | 결과 | 근거 |
| --- | --- | --- |
| `lunchmate.kr` | **등록 가능** | whois.kr: "상기 도메인이름은 등록되어 있지 않습니다", NS 없음 |
| `lunchmate.co.kr` | 등록됨 (타인) | 2026-05-06 등록, 만료 2027-05-06 |
| `lunchmate.app` | 등록됨 (타인) | RDAP 응답 있음(등록대행 GoDaddy), NS `domaincontrol.com` |
| `lunchmate.com` | 등록됨 (타인) | 2004-09-12 등록, 만료 2027-09-12 |
| `lunchmate.io` | 등록 가능으로 보임 | whois: "Domain not found" |
| `런치메이트.kr` (한글) | 등록 가능 | whois.kr: 등록되어 있지 않음. 콘솔 등록 시 퓨니코드 변환 필요해 보조용 |

- 권장: **`lunchmate.kr`** (짧고 국내 서비스에 맞음). 보조로 `런치메이트.kr`을 함께 사서 301 리다이렉트하는 방안은 선택 사항입니다.
- `lunchmate.co.kr`이 2026년 5월에 새로 등록된 점은 비슷한 이름의 서비스가 있을 수 있다는 신호입니다. 상표, 서비스명 충돌 여부를 구매 전에 한 번 검색하는 것을 권장합니다.
