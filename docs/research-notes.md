# 확인 필요 항목 조사 기록 (research-notes.md)

> PRD와 tasks.md의 [확인 필요] 항목을 공식 문서로 조사한 결과를 출처와 함께 남깁니다(tasks.md 0.3절).
> 결론이 바뀌면 기존 내용을 지우지 말고 "갱신 YYYY-MM-DD" 줄을 덧붙입니다. 결론이 다른 문서를 바꾸면 그 문서와 작업도 함께 고칩니다.

## 기록 양식

```markdown
### T0.NN 제목

- 작업 ID: T0.NN (관련 PRD ID)
- 질문: 무엇을 확인하려 했는지 한두 문장
- 결론: 가능 / 불가 / 조건부 + 한 줄 요약
- 근거와 출처:
  - <근거 요약> (출처 URL, 문서 제목)
- 확인일: YYYY-MM-DD
- 영향받는 문서/작업: prd.md 절, tasks.md 작업 ID, CLAUDE.md 절
- 남은 불확실성: 공식 문의가 필요한 점, 실기기 확인이 필요한 점
```

## 조사 항목

### T0.14 네이버 로그인을 Supabase 커스텀 OAuth/OIDC provider로 붙일 수 있는가 (AUTH-01N)

**질문**: Supabase Auth가 네이버 로그인을 커스텀 OAuth/OIDC provider로 지원하는가(플랜 제한 포함)? 네이버가 OIDC discovery를 제공하고 응답 구조가 호환되는가? 불가하거나 위험하면 서버 함수 + Admin API 대안은 어떻게 설계하는가?

**결론: 가능하다. Supabase 커스텀 provider(`provider_type: oidc`, issuer `https://nid.naver.com`, `email_optional: true`)로 로그인과 세션은 Supabase가 처리하고, 닉네임과 프로필 사진만 콜백 Route Handler에서 `provider_token`으로 네이버 프로필 API를 한 번 호출해 `profiles`에 채운다. `oauth2` 타입(구 API)은 네이버 응답이 `response` 아래 중첩되어 사용자 ID를 읽지 못하므로 쓰지 않는다.**

#### 근거

1. Supabase 커스텀 OAuth/OIDC provider 기능 존재와 플랜 제한
   - https://supabase.com/docs/guides/auth/custom-oauth-providers : `custom:` 접두 식별자, OAuth2(엔드포인트 직접 입력)와 OIDC(issuer만 입력, discovery로 자동 해석) 두 종류. "Free plan projects can add up to 3 custom providers. Pro plan and above have unlimited custom providers." "By default, providers must return an email address." `email_optional: true`로 이메일 없는 로그인 허용. PKCE 기본 사용(`pkce_enabled: true`). `state`, `nonce`, `code_challenge` 등은 Auth 서버가 관리하는 예약 파라미터.
   - https://supabase.com/blog/custom-oauth-oidc-providers : 2026-04-08 발표. 클라이언트는 기존과 같이 `signInWithOAuth({ provider: 'custom:...' })`.
   - https://supabase.com/docs/guides/self-hosting/self-hosted-custom-oauth-providers : 콜백 URL은 `https://<project-ref>.supabase.co/auth/v1/callback`, "The `sub` claim is the stable identifier that Auth uses to match the user on later sign-ins."
   - Context7 `/supabase/supabase`: `supabase.auth.admin.customProviders.createProvider({ provider_type: 'oidc', identifier, client_id, client_secret, issuer, scopes, email_optional })` 예시(Telegram, 이메일 미제공 provider 사례).
2. 네이버가 OIDC를 공식 제공함
   - 네이버 로그인 개발가이드 3.5절 https://developers.naver.com/docs/login/devguide/devguide.md : "Open ID Connect로 네이버 로그인 연동하기", "기존에 제공하고 있는 OAuth2.0 API와 별도로 분리하여 기능을 제공", 인증 `https://nid.naver.com/oauth2/authorize`(scope `openid` 필수, `code_challenge` S256, `nonce` 지원), 토큰 `https://nid.naver.com/oauth2/token`(`code_verifier` 지원). id_token은 RS256 JWT, 클레임은 iss, sub, aud, exp, iat, jti, azp, nonce. "이름, 이메일 같은 회원 프로필 정보는 id_token에 담기지 않습니다. 프로필 정보가 필요하면 접근 토큰으로 프로필 API(3.4.5)를 호출합니다."
   - discovery 실측 `https://nid.naver.com/.well-known/openid-configuration` (2026-10-28 curl): issuer `https://nid.naver.com`, jwks `https://nid.naver.com/oauth2/jwks`, userinfo `https://openapi.naver.com/v1/nid/me`, `token_endpoint_auth_methods_supported: ["client_secret_post","none"]`, `code_challenge_methods_supported: ["S256"]`, `subject_types_supported: ["pairwise"]`, `claims_supported`에 프로필 클레임 없음.
3. 네이버 응답 구조와 Supabase 호환성 (Supabase Auth 소스 확인)
   - 네이버 프로필 API 응답은 `{ resultcode, message, response: { id, nickname, profile_image, email, ... } }`로 중첩(개발가이드 3.4.5, https://developers.naver.com/docs/login/profile/profile.md).
   - https://github.com/supabase/auth/blob/master/internal/api/provider/custom_oauth.go : OAuth2 타입은 userinfo JSON 최상위를 OIDC 표준 `Claims`(sub, name, nickname, picture, email ...)로 그대로 언마셜하고, `attribute_mapping`도 최상위 키만 복사한다(중첩 경로 미지원). 따라서 `oauth2` 타입 + 구 API로는 `sub`가 비어 사용자를 식별할 수 없다.
   - 같은 파일의 OIDC 타입은 토큰 응답에 `id_token`이 있으면 discovery JWKS로 검증하고 aud를 client_id와 대조한 뒤 id_token 클레임만 사용한다(userinfo 호출 안 함). 네이버 id_token에는 sub만 있으므로 로그인은 되지만 `user_metadata`에 닉네임과 사진이 들어오지 않는다.
   - https://supabase.com/docs/guides/auth/social-login (Provider tokens): 세션에 `provider_token`이 담겨 PKCE 흐름의 `exchangeCodeForSession` 결과로 받을 수 있고, "Provider tokens are intentionally not stored in your project's database."

**확인일**: 2026-10-28

#### 영향받는 문서와 작업

- PRD AUTH-01N: 구현 방식 [확인 필요] 해소. "Supabase 커스텀 OIDC provider(`custom:naver`) + 콜백에서 프로필 API 1회 호출"로 갱신. 괄호 안 "Vercel 서버 함수에서 네이버 인증 → Supabase 사용자 생성·세션 발급" 서술은 대안 설계로 내린다.
- tasks T0.6: 네이버 개발자센터 Callback URL에 우리 도메인이 아니라 **Supabase 콜백 `https://<project-ref>.supabase.co/auth/v1/callback`** 을 등록한다(서비스 URL은 T0.5 도메인과 localhost 유지). 수집 항목은 닉네임, 프로필 사진만. 검수 전에는 등록된 테스트 아이디만 로그인 가능하므로 검수 일정을 G4 이전에 잡는다.
- tasks T0.10: Supabase 대시보드 Authentication > Sign In / Providers에서 커스텀 provider 추가 작업을 포함(무료 플랜 3개 한도 중 1개 사용, T0.20 결과에 따라 2개).
- tasks T4.7: "state 검증, 비밀키 서버 전용"은 Supabase가 처리. 대신 `/auth/callback` Route Handler에서 provider가 `custom:naver`일 때 프로필 동기화를 구현한다.
- CLAUDE.md 12장 환경변수: 권장안에서는 `NAVER_LOGIN_CLIENT_ID / NAVER_LOGIN_CLIENT_SECRET`이 Vercel에 필요 없다(Supabase 대시보드에만 입력). 대안 설계로 갈 때만 유지. CLAUDE.md 2장 "네이버 커스텀 OAuth" 표기와 4장 `src/app/api/` 설명(네이버 OAuth)도 함께 정정 대상.
- docs/setup-guide.md(작성 시): 네이버 Callback URL = Supabase 콜백, 커스텀 provider 등록 절차와 값(issuer, scopes, email_optional) 기록.

#### 권장 설계 (커스텀 OIDC)

1. 네이버 개발자센터: 애플리케이션 등록, 제공 정보 닉네임과 프로필 사진만, Callback URL에 Supabase 콜백 등록.
2. Supabase: 대시보드 또는 Admin API로 등록
   `provider_type: 'oidc'`, `identifier: 'custom:naver'`, `name: '네이버'`, `issuer: 'https://nid.naver.com'`, `scopes: ['openid']`, `email_optional: true`, PKCE 기본값 유지.
3. 클라이언트: `signInWithOAuth({ provider: 'custom:naver', options: { redirectTo: `${SITE_URL}/auth/callback?next=<내부 경로>` } })`. 카카오, 구글과 같은 콜백과 복귀 로직(AUTH-03)을 공유한다.
4. `/auth/callback` Route Handler: `exchangeCodeForSession(code)` 후 `session.user.app_metadata.provider === 'custom:naver'`이고 `profiles`에 닉네임이 없으면, `session.provider_token`으로 `GET https://openapi.naver.com/v1/nid/me`(Authorization: Bearer) 호출, `resultcode === '00'`일 때 `response.nickname`, `response.profile_image`만 `profiles`에 저장. `provider_token`은 저장하지 않고 로그에도 남기지 않는다. 실패하면 닉네임 없이 진행하고 온보딩에서 입력받는다.
5. 계정 연결(AUTH-08, P2): 이메일을 받지 않으므로 자동 연결은 일어나지 않는다. MVP에서는 provider별 별도 계정. 2단계에서 로그인 상태의 수동 연결(`linkIdentity`, 수동 연결 설정 필요)로 검토.
6. 탈퇴(AUTH-05, AC-AUTH-3): `auth.users` 삭제 시 identity도 함께 삭제되므로 같은 네이버 계정 재로그인은 새 사용자가 된다. 네이버 연동 해제(토큰 revoke)는 선택 사항으로 둔다.

#### 대안 설계 (커스텀 provider가 실측에서 실패할 때만)

`src/app/api/auth/naver/{start,callback}/route.ts`, 서버 전용 `NAVER_LOGIN_CLIENT_ID/SECRET`, `SUPABASE_SERVICE_ROLE_KEY` 사용.

1. start: `next`를 내부 경로만 허용으로 검증. `state`(32바이트 난수), PKCE `code_verifier`, `nonce`를 만들어 HttpOnly, Secure, SameSite=Lax, 10분 쿠키에 저장. `https://nid.naver.com/oauth2/authorize?response_type=code&scope=openid&client_id&redirect_uri&state&code_challenge(S256)&nonce`로 리다이렉트. 네이버 Callback URL은 이 경우 우리 도메인 `/api/auth/naver/callback`.
2. callback: `error` 파라미터 처리(동의 취소 시 로그인 화면으로). 쿼리 `state`와 쿠키 값을 상수 시간 비교, 쿠키 즉시 삭제(CSRF 방지). `POST https://nid.naver.com/oauth2/token`에 `client_secret_post` 방식으로 code, redirect_uri, code_verifier 전송.
3. id_token 검증: `jose`의 `createRemoteJWKSet('https://nid.naver.com/oauth2/jwks')`로 서명, iss, aud(client_id), exp, nonce 확인. `sub`가 사용자 키.
4. 프로필: 접근 토큰으로 `openapi.naver.com/v1/nid/me` 호출, 닉네임과 사진만 사용.
5. 사용자 조회/생성: RLS 활성화 + 정책 없음(서비스 롤 전용) 매핑 테이블 `auth_naver_identities(naver_sub text pk, user_id uuid references auth.users on delete cascade)`. 없으면 `auth.admin.createUser({ email: 'naver_<sha256(sub) 앞 32자>@<자체 도메인의 수신 불가 서브도메인>', email_confirm: true, app_metadata: { provider: 'naver' }, user_metadata: { nickname, avatar_url } })` 후 매핑 저장. `app_metadata`는 서비스 롤만 쓸 수 있어 provider 판정에 신뢰 가능.
6. 세션 발급: `auth.admin.generateLink({ type: 'magiclink', email })`로 `properties.hashed_token`을 받고, 쿠키 기반 SSR 클라이언트에서 `auth.verifyOtp({ type: 'magiclink', token_hash })`를 호출하면 세션 쿠키가 설정된다. 이메일은 발송되지 않는다. 이후 `next`로 리다이렉트.
   - 출처: https://supabase.com/docs/reference/javascript/auth-admin-generatelink , https://supabase.com/docs/reference/javascript/auth-verifyotp
7. 이메일 미제공: 가짜 이메일은 내부 식별용일 뿐 화면, 알림, 계정 연결에 쓰지 않는다. 같은 이메일 자동 연결은 하지 않는다(네이버 이메일은 소유 확인 보장이 불명확하고 PRD도 미수집).
8. 단점: 비밀키와 토큰 처리, 매핑 테이블, rate limit을 직접 유지해야 하고, 나중에 커스텀 provider로 옮기면 identity 이전 스크립트가 필요하다.

#### 남은 불확실성 (T4.7에서 실측)

- 토큰 교환 인증 방식: Supabase는 Go `oauth2` 기본(AutoDetect: Basic 헤더 먼저, 실패 시 본문 재시도)을 쓰는 것으로 보이고 네이버는 `client_secret_post`만 공시한다. 재시도로 성공할 가능성이 높지만 개발 프로젝트에서 실제 로그인으로 확인해야 한다.
- 네이버 OIDC 인증 화면이 `scope=openid`만으로 콘솔에 설정한 닉네임, 사진 동의를 함께 받는지, 프로필 API가 OIDC 접근 토큰으로 정상 응답하는지.
- 커스텀 provider 세션에 `provider_token`이 실제로 담기는지(내장 provider와 같은 경로로 예상).
- 네이버 OIDC 앱 등록이 기존 네이버 로그인 앱과 같은 절차인지, 검수 기간.
- 카카오톡 인앱 브라우저에서 네이버 로그인 동작은 실기기 확인 항목(T4.14).
- 커스텀 provider는 2026-04 출시 기능이라 대시보드 UI나 제한이 바뀔 수 있다. 구현 직전에 문서 재확인.

---

### T0.15 카카오 장소 데이터를 네이버 지도 위에 표시하는 것의 약관 허용 여부

조사 중

### T0.16 장소명, 좌표가 필요한 화면의 처리 방식

조사 중

### T0.17 카카오톡 인앱 브라우저의 외부 브라우저 열기 스킴 동작 (AUTH-04)

조사 중

### T0.18 위치기반서비스사업 신고 대상 여부

조사 중

### T0.19 Vercel Hobby 플랜 제약, Supabase 무료 플랜 일시 정지와 백업 범위

조사 중

### T0.20 카카오 provider의 이메일 필수 여부와 비즈 앱 전환 필요성

조사 중

### T0.27 동적 라이브러리 사전 조사 (버전, 유지보수 상태, 라이선스, 호환성)

조사 중
