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

- 작업 ID: T0.15 (MAP-01~03, PLACE-04, 관련 작업 T10.2)
- 질문: 카카오 로컬 API(키워드/카테고리 검색 FD6) 결과를 네이버 클라우드 Maps Web Dynamic Map 위에 마커로 표시해도 양사 약관상 문제가 없는지. 타사 지도 혼용 금지, 출처 표기 의무, 데이터 저장 제한을 함께 확인한다.
- 결론: **허용(조건부).** 카카오는 타사 지도와의 조합을 제한하지 않는다고 운영진이 반복 답변했고(카카오 지도 사용은 "권장"일 뿐), 네이버 Maps 이용약관에는 제3자 데이터를 지도 위에 표시하는 것을 막는 조항이 없다. 조건은 (1) 카카오 결과를 실시간 호출로만 쓰고 어디에도 저장하지 않을 것, (2) 네이버 Maps API 결과(지오코딩 좌표 포함)도 저장하지 않을 것, (3) 네이버가 요청하면 로고나 지정 표시를 넣을 것. 출처 문구를 따로 넣어야 할 의무는 확인되지 않았다.
- 근거와 출처:
  - 카카오 운영진(2026-05-27): "당사가 제공하는 API를 타사의 API와 함께 사용하시는 것을 별도로 제한하지는 않습니다." "가급적이면 당사의 지도와 로컬 기능을 같이 사용하시는 것을 추천드립니다." 네이버 지도 위 마커/리스트 표시를 직접 물은 질문에 대한 답이다. (https://devtalk.kakao.com/t/local-api-sdk/149943)
  - 카카오 운영진(2026-08-18): "다른 지도 API 와 조합하여 사용하시는 것을 제한하지는 않습니다만 기본 지도 역시 카카오맵 SDK 를 사용하시는 것을 권장합니다." (https://devtalk.kakao.com/t/local-api/151190)
  - 카카오 운영진(2026-09-15): "타사 지도SDK의 활용하시는 것은 무방합니다." (https://devtalk.kakao.com/t/local-api/151645)
  - 카카오 운영진(2026-07-23): 출처 표기(출처 문구, 로고 등)는 "하지 않으셔도 됩니다." 같은 답변에서 서버 1시간 캐시는 "임시 DB 역할"이라 운영정책 위반, "로컬API의 실시간 호출로만 이용 가능합니다. (Live call only)" (https://devtalk.kakao.com/t/api/150800)
  - Kakao Developers 운영정책(2026-04-20 적용) 제5조 금지행위: 제20호 "앱에서 사용자 환경을 개선하기 위한 목적 외 다른 목적으로 카카오에서 받은 데이터를 캐시하거나 캐시 후 최신 데이터로 유지하지 않는 행위", 제30호 카카오에서 얻은 데이터를 사전 승낙 없이 복사, 복제 등으로 사용하거나 타인에게 제공하는 행위, 제19호 카카오 서비스나 제휴 서비스로 오인되게 하는 행위, 제13호 저작권, 상표 등 소유권 고지를 삭제하는 행위. 타 지도 혼용이나 출처 표기 의무를 직접 정한 조항은 없다. (https://developers.kakao.com/terms/ko/site-policies)
  - 네이버 클라우드 플랫폼 Maps 서비스 이용약관(2025-03-20 적용, 원문 PDF v0.4): 제7조 ⑨ 결과 데이터를 허용 범위를 넘어 "무단으로 복제, 저장, 가공, 배포하거나 제3자에게 제공해서는 안됩니다." ⑩ 회사는 결과 데이터나 애플리케이션에 "회사의 로고 또는 회사가 지정한 표시의 게재를 요청할 수 있으며" 고객은 따라야 한다. ⑪ "모든 Maps API의 결과 데이터는 값을 리턴 받는 즉시 1회 자신의 서비스에서 사용하는 것만 허용되며, 그렇지 않고 그 결과 값들을 별도로 저장, DB화, 재사용하는 것은 금지됩니다." ⑫ API, SDK 재판매 금지. 타사 데이터 표시나 타 지도 혼용을 제한하는 조항은 없다. (https://www.ncloud.com/policy/terms/maps 페이지에 임베드된 PDF: https://xv-ncloud.pstatic.net/images/provision/%5B%EB%AF%BC%EA%B0%84%5DMaps%EC%84%9C%EB%B9%84%EC%8A%A4%EC%9D%B4%EC%9A%A9%EC%95%BD%EA%B4%80_v0.4_(CLEAN)_1742433558704.pdf)
  - 네이버 Maps 사용 가이드: 네이버 Maps의 기능, 서비스 명칭(거리뷰, 길찾기 등)을 임의로 바꿔 표기할 수 없다. 사용량 한도와 초과 통보 설정 권장. (https://guide.ncloud-docs.com/docs/application-maps-procedure)
  - 비용 비교(카카오맵 전환 시): 카카오 공식 FAQ "현재 Kakao Developers에서는 지도 30만/일, 로컬 10만/일까지 무료로 제공하고 있습니다." 지도는 `kakao.maps.Map()` 생성 1회가 1건이며 패닝, 확대는 추가 집계되지 않는다. (https://devtalk.kakao.com/t/faq-api/60356, https://devtalk.kakao.com/t/topic/148977) 네이버 Dynamic Map은 대표 계정 1개에만 무료 이용량이 있고(대표 계정이 아니면 첫 호출부터 과금), 검색으로 확인한 요금 페이지 기준 월 6,000,000건 무료다. (https://guide.ncloud-docs.com/docs/application-maps-overview, https://www.ncloud.com/product/applicationService/maps)
- 확인일: 2026-10-28
- 영향받는 문서/작업:
  - CLAUDE.md 13장 "네이버 지도 위에 카카오 장소 표시 허용 여부 [확인 필요]" 줄을 다음으로 교체 제안: "네이버 지도 위 카카오 장소 표시는 허용된다(카카오 운영진 답변 2026-05-27, 09-15, research-notes T0.15). 카카오는 카카오맵 사용을 권장하므로 지도 레이어는 계속 `MapProvider` 인터페이스로 감싼다."
  - CLAUDE.md 7장에 네이버 쪽 저장 금지도 추가 제안: "네이버 Maps API 결과(지오코딩, 역지오코딩 좌표와 주소 포함)도 저장하지 않는다(Maps 이용약관 제7조 ⑪). 사무실 좌표는 사용자가 지도에서 직접 찍거나 옮긴 핀 좌표만 저장한다." (근거와 세부는 T0.16-1 참고)
  - PRD 13장 카카오 로컬 API 행, 네이버 Web Dynamic Map 행의 [확인 필요] 해소. tasks T10.2는 "확인 결과 반영 완료"로 처리 가능.
  - tasks T0.8: 대표 계정 여부 확인을 체크 항목에 추가.
- 권장안: **네이버 Web Dynamic Map 유지 + 카카오 로컬 실시간 호출.** 전환 비용 대비 이득이 작다. 다만 아래 두 경우에는 카카오맵 JS SDK로 바꾼다. (1) 카카오가 정책을 바꿔 타 지도 결합을 제한할 때, (2) 네이버 대표 계정 문제로 무료 이용량을 받을 수 없을 때. 전환 비용은 `MapProvider` 구현체 1개(마커, 클러스터, 바텀시트 연동, 현위치 표시)와 카카오 JS 키 도메인 등록 정도이며, 지도 무료 한도는 카카오 30만 로드/일로 MVP 규모에서 충분하다. 카카오맵으로 바꾸면 키가 하나로 줄고 카카오 권장 구성에 맞는 장점이 있다. 길찾기(`nmap://`)와 "네이버 플레이스에서 보기"는 지도 레이어와 무관하게 유지한다.
- 남은 불확실성:
  - 근거가 DevTalk 운영진(작성자 "C.L", "Map") 답변이며 약관 조항 자체는 아니다. 출시 전(T10.2) 런치메이트 구성(네이버 지도 + 카카오 FD6 + 장소 ID 저장)을 그대로 적어 DevTalk "지도/로컬" 카테고리(https://devtalk.kakao.com/c/map-api/101)에 [이용정책 문의]로 한 번 더 받아 두기를 권장한다.
  - 네이버 Maps 사용 가이드(Usage 가이드)의 로고, 저작권 표기 세부 규칙은 콘솔 이용 신청 화면에서만 보인다는 안내가 있어 원문을 확인하지 못했다. T0.8 콘솔 등록 때 확인한다. 문의처: 네이버 클라우드 고객지원 온라인 문의(https://www.ncloud.com/support/question), 1544-5876.
  - 네이버 Dynamic Map 무료 이용량 수치(월 6,000,000건)는 검색 요약으로만 확인했다. T0.8에서 요금 페이지와 콘솔 한도를 직접 확인한다.

### T0.16 장소명, 좌표가 필요한 화면의 처리 방식

- 작업 ID: T0.16 (HIS-01~03, FB-01~04, POLL-04, POLL-09S, APP-02, PRD 12장, 13장)
- 질문: `place_id`만 저장하는 규칙 아래에서 투표 후보, 즐겨찾기, 기록, 피드백 요청, 오프라인, OG 이미지에 필요한 장소명과 좌표를 어떻게 얻고 보여줄지.
- 결론: **장소 ID와 장소 URL(place_url)만 저장할 수 있고, 장소명, 주소, 좌표, 카테고리는 기간이나 목적과 무관하게 저장할 수 없다. 장소 ID 단건 조회 API는 없다.** 따라서 이름이 필요한 화면은 (a) 실시간 검색 결과와 ID를 맞춰 보여주고, (b) 맞추지 못하면 카카오맵 상세 링크(저장된 place_url)로 대신하며, (c) 서버 OG 이미지에는 식당 이름을 넣지 않는 쪽으로 설계를 바꾼다. 하위 4개 결과는 아래와 같다.
- 확인일: 2026-10-28

#### T0.16-1 투표 후보의 장소명, 좌표 스냅샷 DB 저장

- 질문: 투표 후보(최대 5곳)의 장소명, 좌표를 투표 기간(마감 후 24시간 만료) 동안만 DB에 저장해도 되는지.
- 결론: **불가.** 저장 기간이 짧아도, 사용자가 고르고 확정한 값이어도 로컬 API 결과 기반 데이터의 저장은 허용되지 않는다. 저장 가능한 것은 `place_id`와 `place_url`뿐이다.
- 근거와 출처:
  - 카카오 운영진(2026-08-26): 기존 저장 데이터는 "즉각 삭제해 주셔야 합니다." 마이그레이션 기간 한시 표시도 "정책 상 한시적 활용 또한 허용하진 않으나", 내부 기록용 보관도 "어떠한 경우에도 실시간 호출이 아닌 형태로는 이용할 수 없습니다." 별도 계약 경로도 "해당 데이터는 별도 제휴 검토를 진행하지 않습니다." 어뷰징 판단 시 제재 가능. (https://devtalk.kakao.com/t/api/151343)
  - 카카오 운영진(2026-09-15): "장소ID 및 URL의 저장 사용은 가능하나, 장소명, 주소, 좌표 정보의 저장 활용은 허용하지 않습니다." 주기적 갱신 조건부 저장도 "허용하지 않으며, 실시간 호출로만 사용할 수 있습니다." 사내 맛집 공유 앱 사례로 런치메이트와 구조가 가장 비슷하다. (https://devtalk.kakao.com/t/local-api/151645)
  - 카카오 운영진(2026-09-17): "사용자가 일부 확인, 수정 과정을 거치더라도 로컬API 결과를 기반으로 한 데이터이므로 정책 상 API 결과값의 DB저장에 해당하는 것으로 판단됩니다." (https://devtalk.kakao.com/t/id/151727)
  - 카카오 운영진(2026-08-24): "로컬 API 검색 결과를 기반으로 한 좌표는 사용자가 화면에서 확인하거나 확정하는 절차를 거치더라도 별도로 저장하여 활용할 수 없습니다." 반대로 사용자가 지도에서 직접 옮겨 찍은 핀 좌표는 저장 가능하다는 전제가 질문에 깔려 있고 이를 부정하지 않았다. (https://devtalk.kakao.com/t/sdk-poi/151294)
  - 카카오 운영진(2026-08-20): "응답 데이터 원본 및 기반한 가공 데이터를 기기나 서버에 저장하여 사용하는 구조는 허용하지 않습니다." "실시간 호출하여 화면에 일시적으로 표시하는 구조는 허용됩니다." (https://devtalk.kakao.com/t/local-api/151263)
  - 카카오 운영진(2026-10-19): 좌표, 주소 저장 불가, 정적 JSON 공개도 불가, "장소ID, URL은 저장하여 카카오맵으로 랜딩하는 구조로 활용할 수 있습니다." (https://devtalk.kakao.com/t/api-id/152228)
- 영향받는 문서/작업:
  - tasks T7.6: `poll_candidates`는 `place_id`, `place_url`, 추가한 사람, 순서만 둔다. 이름, 좌표, 카테고리, 거리 컬럼을 만들지 않는다. 투표방에는 후보 이름 확인용 기준점 `anchor_lat/anchor_lng`(방장 사무실 좌표 또는 방장이 지도에서 찍은 점, 현위치 금지)과 반경 `radius_m`을 저장한다.
  - CLAUDE.md 7장 첫 항목 문장 교체 제안: "**카카오 장소 데이터 저장, 캐싱 금지.** DB에 저장할 수 있는 카카오 값은 `place_id`와 `place_url`뿐이다. 장소명, 주소, 좌표, 카테고리, 전화번호는 기간이 짧아도, 사용자가 확정했어도 저장하지 않는다(투표 후보 스냅샷 포함). 캐시는 세션 메모리(TanStack Query)만, localStorage, DB, 서버 캐시, 서비스 워커 캐시 금지. 처리 방식은 research-notes T0.16."
  - CLAUDE.md 7장 "저장은 사용자가 지정한 사무실 좌표만" 보강 제안: "사무실 좌표는 사용자가 지도에서 직접 찍거나 끌어 놓은 핀 좌표만 저장한다. 주소 검색, 지오코딩(카카오, 네이버) 결과 좌표와 주소 문자열은 지도를 이동시키는 데만 쓰고 저장하지 않는다." 온보딩(사무실 설정) 시안에 "핀을 직접 놓기" 단계가 필요하다.
  - PRD 6장 POLL 요구사항과 9장 데이터 모델의 poll_candidates 설명, 13장 "출시 전 확인" 문단 갱신.
- 권장안: 투표방 화면은 참여자 브라우저가 투표방 기준점 주변을 카테고리 검색(FD6)해 후보 `place_id`와 맞춰 이름, 거리를 그때그때 표시한다(T0.16-2의 매칭 방식). 맞추지 못한 후보는 "후보 2" 같은 순번과 "카카오맵에서 보기" 링크로 표시한다. 방장이 후보를 추가할 때는 방장 화면에 이미 이름이 있으므로 문제없다.
- 남은 불확실성: 투표방 기준점을 방장 사무실 좌표로 저장하는 것 자체는 사용자 생성 데이터라 문제없다고 판단하지만, 기준점이 "후보 위치를 다시 찾기 위한 좌표"로 쓰이는 점을 카카오가 우회 저장으로 볼지는 문의 권장(문의처는 T0.15와 같은 DevTalk 지도/로컬 카테고리).

#### T0.16-2 `place_id` 단건 조회 수단과 이름 표시 대안

- 질문: 카카오 로컬 API에 `place_id`로 장소 1곳을 조회하는 공식 수단이 있는지. 없다면 즐겨찾기, 기록, "어제 ○○ 어땠어요?", 투표 결과에서 이름을 어떻게 보여줄지.
- 결론: **공식 단건 조회 API는 없다.** 로컬 API는 주소 검색, 좌표 변환 4종과 키워드 검색, 카테고리 검색뿐이다. 카카오는 "서비스에서 직접 구현해야 하는 영역"이라고 답했다. `place.map.kakao.com` 내부 JSON 등 비공식 엔드포인트 호출은 **사용 금지**로 판정한다(공개 API가 아니고 운영정책 제5조의 데이터 수집, 무단 복제 금지와 어뷰징 제재 대상). 사용자가 지정한 표시명은 사용자가 처음부터 직접 입력한 텍스트일 때만 저장을 검토할 수 있고, API 장소명을 미리 채워 넣거나 복사한 값은 저장할 수 없다.
- 근거와 출처:
  - Kakao Developers 로컬 API 개발 가이드: 제공 기능은 주소로 좌표 변환, 좌표로 행정구역정보 변환, 좌표로 주소 변환, 좌표계 변환, 키워드로 장소 검색, 카테고리로 장소 검색. 응답에 `id`, `place_name`, `x`, `y`, `place_url` 포함. 인증은 `Authorization: KakaoAK ${REST_API_KEY}`. ID 단건 조회 API 없음. (https://developers.kakao.com/docs/ko/local/dev-guide)
  - 카카오 운영진(2026-09-15): 장소 ID 단건 조회 API는 없으며 "서비스에서 직접 구현해 주셔야하는 영역입니다." 권장 구조는 "해당 장소 상세 랜딩(아웃링크)으로 구현해 보시는 방향으로 의견드립니다." (https://devtalk.kakao.com/t/local-api/151645)
  - 장소명 저장에 관한 답변이 엇갈린다. 2026-07-28에는 사용자가 자기 게시물에 입력한 콘텐츠로서 "설명하신 사용 범위 내 장소명 텍스트를 저장하여 활용하는 것은 가능합니다."(https://devtalk.kakao.com/t/api/150888) 그러나 가장 최근인 2026-10-19에는 장소 ID와 장소명을 함께 저장하게 해 달라는 맛집 기록 서비스 요청에 "로컬 API에서 제공하는 장소명은 저장하여 활용할 수 없으며 실시간 호출로만 이용 가능합니다."(https://devtalk.kakao.com/t/1-id/152223) 9-17 답변("확인, 수정 과정을 거치더라도 ... DB저장에 해당")과 함께 보면 최신 기준은 "API에서 온 장소명은 저장 불가"다.
  - 장소 ID 매칭 방식 자체는 허용: "실시간 호출 기반이라면 허용되며, 장소ID는 저장하여 사용 가능합니다."(2026-10-01, https://devtalk.kakao.com/t/topic/151916) 브라우저에서 `services.Places`로 실시간 조회해 보여주는 구조는 "실시간 호출에 해당합니다."(2026-10-20, https://devtalk.kakao.com/t/api-id/152228)
  - 키워드, 카테고리 검색은 페이지당 최대 15건, 한 검색어당 최대 45건이라 반경 안에 음식점이 많으면 한 번의 검색으로 모든 ID를 덮지 못한다. (로컬 API 개발 가이드, 위 URL)
- 영향받는 문서/작업: tasks T5.20(즐겨찾기), T6.13(히스토리), 피드백 요청 작업(FB-01~04), T7.x 투표 결과 화면, PRD HIS-01~03, FB-01. `favorites`, `visits`, `blocked_places` 등은 `place_id`(+ 선택 `place_url`)만 둔다. 공통 모듈 `src/features/place/resolve-place-names.ts`(가칭) 작업을 5단계에 추가 제안.
- 권장안(이름 표시 순서):
  1. **세션 메모리 우선**: 이번 세션에서 이미 받은 추천, 지도 결과(TanStack Query 메모리)에 같은 `place_id`가 있으면 그 이름을 쓴다.
  2. **기준점 주변 실시간 매칭**: 사무실 좌표(사용자가 찍은 핀)나 브라우저 현위치를 중심으로 FD6 카테고리 검색을 거리순으로 돌려 ID를 맞춘다. 45건 한계는 반경을 사분면 `rect`로 나눠 추가 검색해 보완하되, 화면당 추가 호출 상한(예: 4회)을 둔다. 즐겨찾기, 기록은 대부분 사무실 반경 안이라 적중률이 높을 것으로 예상하지만, 실제 적중률은 5단계에서 로그(이름 미해결 비율, 좌표 없이 집계)로 확인한다.
  3. **미해결 시 대체 표시**: 이름 대신 "이름을 불러오지 못했습니다" + "카카오맵에서 보기"(저장된 `place_url` 또는 `https://place.map.kakao.com/{id}`) 링크. 화면 목록은 깨지지 않게 순번이나 날짜로 구분한다.
  4. **선택 메모(사용자 생성)**: 즐겨찾기에 사용자가 직접 타이핑하는 짧은 메모(예: "회사 앞 김치찌개")를 선택 입력으로 둘 수 있다. 장소명을 미리 채우거나 붙여 넣기 버튼을 두지 않는다. 한 탭 피드백 원칙상 필수로 만들지 않는다. 이 메모 저장은 카카오 확인 전까지 플래그로 숨긴다.
  - "어제 ○○ 어땠어요?"는 피드백 요청 시점에 2단계 매칭으로 이름을 찾고, 못 찾으면 "어제 가신 곳은 어땠어요?" + 카카오맵 링크 문구로 바꾼다. 문구는 `src/copy/feedback.ts`에 두 버전을 둔다.
  - 투표 결과 화면도 같은 순서(세션 메모리, 투표방 기준점 매칭, 대체 표시)를 쓴다.
- 대안 검토(2단계 후보): 공공데이터(행정안전부 일반음식점 인허가 데이터 등)를 자체 장소 DB로 적재하고, 카카오 `place_id`를 실시간 매칭 결과로 옆에 저장하는 구조는 카카오가 "가능합니다"라고 답했다(2026-10-01, 10-20). 이 경우 이름, 좌표를 공공데이터 쪽 값으로 저장할 수 있어 즐겨찾기, 투표, 오프라인, OG 이미지 문제를 한 번에 풀 수 있다. 다만 공공데이터의 이용허락범위, 좌표계(EPSG:5174 등) 변환, 갱신 주기, 폐업 반영, 매칭 정확도를 따로 조사해야 하므로 MVP 범위 밖으로 둔다. (https://www.data.go.kr/data/15154921/openapi.do 등 공공데이터포털 항목, 이용허락범위는 미확인)
- 남은 불확실성: 사용자가 직접 타이핑한 메모(API 값을 미리 채우지 않은 자유 텍스트)를 `place_id`와 함께 저장하는 것이 허용되는지 카카오 확인이 필요하다. 7-28 답변과 10-19 답변이 엇갈리므로 DevTalk에 "API 장소명은 저장하지 않고, 사용자가 빈 입력란에 직접 쓴 메모만 저장"이라는 조건으로 문의한다.

#### T0.16-3 오프라인 즐겨찾기 화면(APP-02)과 카카오 장애 시 대체 추천(PRD 12장)

- 질문: 저장 금지 규칙 안에서 오프라인 즐겨찾기 목록과 카카오 API 장애 시 "즐겨찾기, 최근 👍 식당 기반 대체 추천"이 가능한지.
- 결론: **원래 설계대로는 불가.** 오프라인이나 카카오 장애 상태에서는 이름, 좌표를 새로 받을 수 없고, 기기 저장(localStorage, IndexedDB, 서비스 워커 캐시)도 금지라서 즐겨찾기 이름 목록과 거리 기반 대체 추천을 만들 수 없다. 가능한 것은 (1) 아직 열려 있는 탭의 세션 메모리에 남은 결과를 계속 보여주기, (2) 사용자 메모와 개수만 보여주기, (3) 외부 지도 앱으로 넘기기다.
- 근거와 출처:
  - "응답 데이터 원본 및 기반한 가공 데이터를 기기나 서버에 저장하여 사용하는 구조는 허용하지 않습니다."(2026-08-20, https://devtalk.kakao.com/t/local-api/151263)
  - 운영정책 제5조 제20호: 사용자 환경 개선 목적 외의 캐시, 캐시 후 최신으로 유지하지 않는 행위 금지(https://developers.kakao.com/terms/ko/site-policies). 같은 탭 안 메모리 보존은 사용자 환경 개선 목적의 일시 표시로 볼 여지가 있으나, 카카오는 메모리 캐시를 명시적으로 답하지 않았다.
  - 서버 1시간 캐시도 "임시 DB 역할"로 위반 판정(2026-07-23, https://devtalk.kakao.com/t/api/150800).
- 영향받는 문서/작업: PRD APP-02, 12장 "카카오 API 오류, 한도 초과"와 "오프라인" 행, 14장 가용성 행. tasks T5.24, T8.3. 서비스 워커는 앱 셸(HTML, JS, CSS, 일러스트)만 캐시하고 카카오 응답 URL(`dapi.kakao.com`)은 캐시 제외 규칙을 명시한다.
- 권장안(대체 동작):
  - **오프라인(APP-02 수정안)**: 앱 셸만 캐시된 오프라인 화면에 마지막 설정(끼니, 허용 도보 분, 예산 등 사용자 데이터)과 "연결되면 바로 추천해 드립니다." 안내를 보여준다. 탭이 열린 채 연결이 끊긴 경우에는 세션 메모리에 있던 오늘 추천 카드를 "연결 전 결과" 표시와 함께 그대로 둔다. 즐겨찾기는 이름 대신 개수와 사용자 메모(T0.16-2의 4번, 허용 확인 시)만 보여준다. 재연결 시 자동 새로고침은 유지.
  - **카카오 장애, 한도 초과(PRD 12장 수정안)**: 재시도 1회 후 오류 안내 + "네이버 지도에서 주변 식당 보기"(네이버 지도 웹/앱 검색 링크, 검색어 "음식점")와 "다시 시도" 버튼. 즐겨찾기 대체 추천은 이름, 거리를 알 수 없어 제공하지 않는다. 사용자 메모가 있는 즐겨찾기가 있으면 "즐겨찾기에서 고르기"(메모 + 카카오맵 링크) 보조 동작만 둔다.
  - PRD 12장 표 문구 교체 제안: "카카오 API 오류, 한도 초과 | 재시도 1회 후 오류 안내 + 네이버 지도에서 주변 식당 보기 + 다시 시도. 장소 데이터 저장 금지로 즐겨찾기 기반 대체 추천은 제공하지 않음(research-notes T0.16-3)". "오프라인 | 마지막 설정 + 세션 중 받은 결과(탭이 열려 있을 때만) + 재연결 시 자동 새로고침".
- 남은 불확실성: 같은 탭 안 메모리 보존(TanStack Query `gcTime` 동안)이 운영정책 제5조 제20호의 "사용자 환경 개선 목적" 캐시로 인정되는지 카카오에 문의 권장. 인정되지 않으면 `staleTime`, `gcTime`을 짧게(예: 화면 이탈 즉시 폐기) 잡는다.

#### T0.16-4 서버 OG 이미지(POLL-04, POLL-09S)의 식당 이름과 카카오 REST 키

- 질문: 서버에서 만드는 OG 이미지에 식당 이름이 필요할 때 카카오 REST API 키가 필요한지, JS 키를 서버에서 쓸 수 없는지. 필요하면 서버 전용 환경변수 이름.
- 결론: **서버에서 카카오를 부르려면 REST API 키가 필요하다. 그러나 이름을 저장할 수 없고 단건 조회도 없어서 REST 키가 있어도 서버가 `place_id`만으로 이름을 얻을 방법이 없다(기준점 주변 검색 매칭만 가능).** 그래서 POLL-04 OG 이미지에는 이름을 넣지 않고(PRD 요구도 제목, 후보 수, 마감 시각뿐), POLL-09S 결과 이미지는 이름을 이미 가진 브라우저에서 만들도록 설계를 바꾸는 것을 권장한다. 이 경우 REST 키는 MVP에서 필요 없다.
- 근거와 출처:
  - 로컬 API REST 호출은 `Authorization: KakaoAK ${REST_API_KEY}` 헤더를 쓴다(https://developers.kakao.com/docs/ko/local/dev-guide). 앱 키 개편 후 JavaScript 키는 JavaScript SDK 도메인으로, REST API 키는 서버용으로 허용 IP, 클라이언트 시크릿 등을 키별로 설정한다(https://developers.kakao.com/docs/ko/app-setting/app, https://developers.kakao.com/docs/ko/getting-started/app-key-migration). JS 키를 서버에서 쓰려면 등록 도메인을 흉내 내야 하므로 키 용도 위반이 되며 권장하지 않는다.
  - 이름 저장 불가(T0.16-1, T0.16-2 근거)와 단건 조회 부재(2026-09-15 답변).
  - 카카오 운영정책 제5조 제30호: 카카오에서 얻은 데이터를 사전 승낙 없이 복사, 복제해 타인에게 제공하는 행위 금지(https://developers.kakao.com/terms/ko/site-policies). 서버나 CDN이 이름이 들어간 이미지를 캐시하면 저장으로 볼 수 있다.
- 영향받는 문서/작업: PRD POLL-04(변경 없음, 이름 미포함을 명시), POLL-09S(생성 위치를 클라이언트로 변경), tasks T7.14, T7.20. CLAUDE.md 4장 `src/app/api/` 설명의 "OG 이미지"는 유지하되 "식당 이름 미포함" 주석 추가 제안.
- 권장안:
  - **POLL-04 투표방 OG**: 서버(`next/og`)에서 투표 제목, 후보 수, 마감 시각, 서비스 브랜딩만 그린다. 카카오 호출 없음.
  - **POLL-09S 결과 공유 이미지**: 확정 화면에서 브라우저가 세션의 실시간 이름으로 이미지를 그린다(클라이언트 canvas, 또는 이름을 요청 본문으로 넘겨 `Cache-Control: no-store`로 즉시 렌더해 돌려주는 서버 함수, 서버와 CDN 어디에도 보관하지 않음). 공유는 Web Share API(파일)나 이미지 저장, 카카오톡 공유는 Kakao JS SDK `Kakao.Share.uploadImage` 후 `sendDefault`. 링크 미리보기용 공개 OG에는 확정 식당 이름 없이 "투표가 끝났습니다" + 득표 수만 넣는다.
  - 서버에서 이름이 꼭 필요해지는 경우(예: 결과 OG에 이름 필수로 바뀜)에만 서버 전용 환경변수 **`KAKAO_REST_API_KEY`**를 추가하고, 투표방 기준점 주변 FD6 검색 매칭으로 이름을 찾되 응답 이미지 캐시를 끈다. Vercel 서버 함수는 출구 IP가 고정되지 않아 REST 키 허용 IP를 걸기 어렵다는 점을 함께 기록한다.
- 남은 불확실성: 사용자가 공유한 결과 이미지(식당 이름 포함)가 카카오톡 대화방에 남는 것을 카카오가 "저장, 재배포"로 볼지는 확인되지 않았다. 사용자 행위로 생성, 공유되는 화면 캡처 수준이라 위험은 낮다고 판단하지만, T0.15 문의 때 함께 묻기를 권장한다.

#### 참고: 네이버 지역 검색 API 등 대체 데이터 소스 비교

- 결론: **저장 정책상 더 유리한 대체 소스는 없다.** 네이버 쪽도 저장을 금지하는 방향이고, 장소 ID가 없어 오히려 불리하다.
- 근거와 출처:
  - 네이버 클라우드 Maps 이용약관 제7조 ⑪: Maps API(지오코딩 포함) 결과는 받은 즉시 1회 사용만 허용, 저장, DB화, 재사용 금지(위 T0.15 PDF).
  - 네이버 검색 API(지역 포함)는 2026-09-07부터 네이버 클라우드 API HUB로 이관됐고, 개발자센터 신규 신청은 7월 31일부터 막혔으며 기존 이용자는 2027-06-30까지 유예라는 보도가 있다. 이용 목적은 "애플리케이션에서 네이버 검색 결과를 그대로 보여주는 목적"으로 제한된다(2차 출처: https://brunch.co.kr/@ainote/123). API HUB의 NAVER 검색 API에 지역 검색이 포함된다(https://guide.ncloud-docs.com/docs/apihub-use). 저장, 캐싱 조항 원문은 확인하지 못했다(developers.naver.com 접근 불가).
  - 네이버 지역 검색은 한 번에 받을 수 있는 결과 수가 적고(5건으로 알려짐, 원문 미확인) 응답에 고유 장소 ID 필드가 없어 `place_id` 기반 설계 자체가 어렵다.
  - 공공데이터(인허가 데이터)는 저장 가능성이 가장 높은 소스지만 추천 품질(카테고리, 영업 상태 반영)과 매칭 비용이 있어 2단계 검토(T0.16-2 대안 참고).
- 권장안: MVP는 카카오 로컬(실시간) 유지. 네이버 지역 검색으로 바꾸지 않는다.
- 남은 불확실성: API HUB 이관 후 네이버 검색 API 약관 원문과 지역 검색 표시 건수는 https://api.ncloud-docs.com/docs/naver-api-hub-overview 에서 직접 확인 필요.

#### T0.16 공통: 문서 반영 요약

- CLAUDE.md 7장: 첫 항목 문장 교체(T0.16-1 제안 문장), 사무실 좌표 문장 보강(핀 좌표만, 지오코딩 결과 저장 금지), 서비스 워커 캐시 제외 대상에 `dapi.kakao.com` 명시.
- CLAUDE.md 13장: "`place_id` 단건 조회 가능 여부는 [확인 필요](T0.16)" 줄을 "`place_id` 단건 조회 API는 없다. 이름은 세션 메모리, 기준점 주변 FD6 매칭, 카카오맵 링크 순으로 보여준다(research-notes T0.16-2)."로 교체.
- PRD: APP-02, 12장 두 행, 13장 카카오 로컬 행과 "출시 전 확인" 문단, POLL-09S 생성 위치, poll_candidates 데이터 모델.
- tasks: T5.24, T7.6, T7.14, T7.20, T8.3 설명 수정, 5단계에 이름 해석 공통 모듈 작업 추가, 온보딩 사무실 설정에 "핀 직접 놓기" 반영.
- 출시 전 카카오 DevTalk 일괄 문의 항목(T10.2와 묶기): (1) 런치메이트 전체 구성 확인, (2) 사용자가 직접 쓴 메모 저장, (3) 같은 탭 메모리 보존, (4) 투표방 기준점 좌표 저장, (5) 사용자가 공유한 결과 이미지. 문의처: https://devtalk.kakao.com/c/map-api/101 ([이용정책 문의] 머리말).

### T0.17 카카오톡 인앱 브라우저의 외부 브라우저 열기 (AUTH-04)

**질문**: 카카오톡 인앱 브라우저에서 구글 로그인이 왜 막히는가, `kakaotalk://web/openExternal?url=` 스킴은 Android와 iOS에서 동작하는가, 인앱 감지와 iOS 대응은 어떻게 하는가. 라인, 인스타그램, 네이버 앱 인앱은 어떤가.

**결론**: **구글 OAuth는 임베디드 웹뷰를 정책으로 차단하므로(`disallowed_useragent`, 2021-09-30 시행) 카카오톡 인앱에서 구글 로그인은 불가능하다고 보고 설계한다. `kakaotalk://web/openExternal?url=`은 카카오 공식 문서에 없는 비공식 스킴이며, 커뮤니티에서 널리 쓰이지만 동작 보장이 없다. 구현은 "카카오 로그인 기본 노출 + 구글 탭 시 스킴 시도 + 실패하면 수동 안내" 3단으로 하고, Android와 iOS 모두 실기기에서 확인한다. 라인은 공식 파라미터 `openExternalBrowser=1`이 있다.**

**근거**
- Google Developers Blog, "Upcoming security changes to Google's OAuth 2.0 authorization endpoint in embedded webviews" (https://developers.googleblog.com/2021/06/upcoming-security-changes-to-googles-oauth-2.0-authorization-endpoint.html): 임베디드 웹뷰의 OAuth 요청을 2021-09-30부터 `disallowed_useragent` 오류로 거부한다. Android WebView, iOS WKWebView/UIWebView는 비준수, Android Custom Tabs와 iOS SFSafariViewController, 기본 브라우저는 허용. 테스트용 `disallow_webview=true` 파라미터 안내.
- Google OAuth 2.0 Policies, "Use secure browsers" (https://developers.google.com/identity/protocols/oauth2/policies): "A developer must not direct a Google OAuth 2.0 authorization request to an embedded user-agent under the developer's control."
- 카카오 데브톡 "인앱 브라우저 구글 OAuth 403 에러" (https://devtalk.kakao.com/t/oauth-403/117012): 카카오 운영진 답변(2021-07-20) "구글이 카카오 인앱 브라우저 요청을 차단하는 문제로 카카오 측 대응 불가", (2022-08-24) "카카오톡은 안드로이드 인앱 브라우저(WebView)를 사용해 제한을 받는다. 네이버는 자체 브라우저라 정상 동작하는 것으로 보인다".
- 카카오 데브톡 "disallowed-useragent" 관련 글 (https://devtalk.kakao.com/t/disallowed-useragent/30703): 카카오톡 인앱 브라우저 UA에 `KAKAOTALK` 문자열이 붙는다는 설명.
- 카카오 데브톡 "카카오톡 인앱 브라우저에서 Branch 딥링크로 앱 열기" (https://devtalk.kakao.com/t/branch/151358, 2026-08-26): `kakaotalk://web/openExternal`의 공식 지원 여부와 iOS/Android 차이를 질문했으나 운영진은 "인앱 브라우저 관련은 데브톡 범위 밖, 고객센터 문의"로만 답했다. 즉 공식 확인 불가. 같은 글에 "비동기 처리 후 사용자 제스처 없이 호출하면 전환이 안 되는가"라는 문의도 있음(답 없음).
- 카카오 JavaScript 하이브리드 앱 문서 (https://developers.kakao.com/docs/ko/javascript/hybrid): 웹뷰 관련 설명만 있고 `openExternal` 스킴이나 UA 언급 없음.
- 공개 코드 예 (https://gist.github.com/hongggyelim/934a94c8c61f3e893347f8be12f259cd): UA에 `kakaotalk` 포함 시 `window.location.replace('kakaotalk://web/openExternal?url=' + encodeURIComponent(url))`. OS 분기 없음.
- LINE Developers, "Using LINE features with the LINE URL scheme" (https://developers.line.biz/en/docs/line-login/using-line-url-scheme/): URL에 `?openExternalBrowser=1`을 붙이면 외부 브라우저로 연다. LIFF 앱을 제외한 LINE 앱 내 모든 URL에 적용.
- Chrome for Developers, "Android Intents with Chrome" (https://developer.chrome.com/docs/android/intents): `intent://<host><path>#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=...;end` 구문. 앱이 없으면 fallback URL로 이동.
- iOS: 웹 페이지가 WKWebView 밖의 Safari를 강제로 여는 공개 API는 없다. `x-safari-https://` 스킴이 Safari Info.plist에 등록되어 있다는 개인 블로그 보고(https://christiantietze.de/posts/2023/05/safari-for-mac-url-scheme/)가 있으나 Apple 비문서화 스킴이라 사용하지 않는다.

**인앱 UA 감지 문자열 (대소문자 무시)**

| 앱 | UA 토큰 | 구글 OAuth | 외부 열기 수단 |
| --- | --- | --- | --- |
| 카카오톡 | `KAKAOTALK` | 차단 | `kakaotalk://web/openExternal?url=` (비공식), 수동: 우측 하단/상단 메뉴 → 다른 브라우저로 열기 |
| 라인 | `Line/` | 차단 | `?openExternalBrowser=1` (공식) |
| 인스타그램 | `Instagram` | 차단 | 공식 스킴 없음. Android는 `intent://` 시도, iOS는 수동 안내(··· → 외부 브라우저에서 열기) |
| 페이스북 | `FBAN` 또는 `FBAV` | 차단 | 인스타그램과 같음 |
| 네이버 앱 | `NAVER(inapp` | 데브톡 운영진은 "자체 브라우저라 정상 동작하는 것으로 보인다"고 했으나 미검증 | 우선 그대로 시도, 실패 시 안내 |
| 기타 웹뷰 | Android `; wv)`, iOS에서 `Safari/` 토큰 없음 | 차단 가능성 | 수동 안내 |

UA 문자열은 앱 업데이트로 바뀔 수 있으므로 감지 목록은 `src/lib/inapp.ts` 한 곳에 상수로 둔다.

**구현 의사코드**

```ts
// src/lib/inapp.ts (클라이언트 전용)
type InApp = 'kakaotalk' | 'line' | 'instagram' | 'facebook' | 'naver' | 'webview' | null

export function detectInApp(ua = navigator.userAgent): InApp {
  const s = ua.toLowerCase()
  if (s.includes('kakaotalk')) return 'kakaotalk'
  if (/\bline\//.test(s)) return 'line'
  if (s.includes('instagram')) return 'instagram'
  if (s.includes('fban') || s.includes('fbav')) return 'facebook'
  if (s.includes('naver(inapp')) return 'naver'
  if (/android.*; wv\)/.test(s)) return 'webview'
  return null
}

// 구글 버튼 onClick (반드시 사용자 탭 이벤트 안에서 동기 호출)
function onGoogleClick() {
  const app = detectInApp()
  if (!app || app === 'naver') return startGoogleOAuth()   // 네이버는 실기기 확인 후 결정
  const url = location.href                                // 현재 /poll/{code} 등 내부 경로 유지
  if (app === 'kakaotalk') {
    location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url)
  } else if (app === 'line') {
    location.href = withParam(url, 'openExternalBrowser', '1')
  } else if (isAndroid()) {
    const u = new URL(url)
    location.href = `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;` +
      `package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`
  }
  // 전환이 안 되면 페이지가 그대로 보인다: 1.5초 뒤 visibilityState가 여전히 visible이면 안내 시트
  setTimeout(() => {
    if (document.visibilityState === 'visible') openExternalGuideSheet(app, isIOS())
  }, 1500)
}
```

- 안내 시트: OS와 앱별 이미지(카카오톡 iOS/Android, 인스타그램)와 "링크 복사" 버튼. 문구는 `src/copy/auth.ts`.
- 자동 리다이렉트(페이지 진입 즉시 스킴 호출)는 하지 않는다. 투표방 미리보기와 카카오 로그인은 인앱에서 정상 동작하므로 사용자가 구글을 고를 때만 시도한다.
- 서버에서도 같은 판정을 한 번 더 한다: `/auth/google` 시작 라우트에서 UA가 인앱이면 OAuth로 보내지 않고 안내 페이지로 보낸다(AC-AUTH-2의 이중 안전장치).
- 외부 브라우저로 넘어가면 인앱의 쿠키와 세션이 없으므로 로그인은 처음부터 진행된다. `redirect` 파라미터는 URL에 그대로 실어 보낸다(내부 경로만 허용 규칙 유지).

**확인일**: 2026-10-28

**영향받는 문서/작업**: PRD AUTH-04 (iOS는 "안내 이미지만"이 아니라 "스킴 시도 후 안내"로 수정 제안), AC-AUTH-2, tasks T4.10, CLAUDE.md 13장 첫 항목(변경 불필요).

**권장안**
1. 인앱에서는 카카오 로그인을 기본 버튼으로 크게, 네이버는 함께, 구글은 보조로 둔다(PRD 그대로).
2. 구글 탭 시 앱별 스킴을 사용자 제스처 안에서 시도하고, 1.5초 뒤에도 화면이 보이면 수동 안내 시트를 띄운다. Android와 iOS 모두 같은 흐름이다.
3. 감지 문자열과 스킴은 한 파일 상수로 관리하고, 분기 결과를 PostHog 이벤트 속성(`inapp: kakaotalk` 등, 좌표나 UA 원문은 넣지 않음)으로 기록해 실패율을 본다.
4. 4단계 착수 시 실기기 체크리스트: 카카오톡 iOS/Android에서 스킴 전환 여부, 전환 후 `/poll/{code}` 복귀, 네이버 앱 인앱 구글 로그인 가능 여부, 인스타그램 Android `intent://` 동작.

**남은 불확실성**
- `kakaotalk://web/openExternal`은 비공식이며 카카오가 공식 답변을 거부했다. iOS 동작, 버전별 차이, 향후 차단 여부를 문서로 확인할 수 없다. 실기기 확인 필요(Claude가 대신 확인할 수 없음).
- 네이버 앱 인앱의 구글 로그인 허용 여부는 2022년 운영진 추정 발언뿐이다.
- UA 토큰은 앱 업데이트로 바뀔 수 있다.

---

### T0.18 위치기반서비스사업 신고 대상 여부

> 이 절은 공개 자료를 정리한 것이며 **법률 자문이 아니다**. 공개 출시 전 KISA 위치정보지원센터(02-588-0185, LBS@kcup.or.kr, https://www.lbsc.kr)에 아래 구조를 그대로 설명하고 서면 회신을 받아 둔다.

**질문**: 브라우저 Geolocation 현위치를 서버로 보내지 않고 클라이언트에서 추천 계산에만 쓰고, 서버에는 사용자가 지정한 사무실 좌표만 저장하는 구조가 위치정보법상 위치기반서비스사업 신고 대상인가. 위치정보 이용약관과 만 14세 미만 처리는 어떻게 하는가.

**결론**: **현위치를 단말 안에서만 쓰고 사업자 서버로 보내지 않는 한 신고 대상에서 제외된다는 것이 KISA 위치정보지원센터의 공식 안내다. 단, ONB-01의 "현위치 버튼"으로 측위한 좌표를 사무실 좌표로 서버에 저장하면 측위된 개인위치정보를 수집하는 것이 되어 신고 대상이 될 수 있다. 주소 검색이나 지도 핀으로 사용자가 지정한 좌표만 저장하도록 바꾸면 신고 비대상 구조를 유지할 수 있다. 의뢰서의 "2024년 신고제 개정"은 확인되지 않았고, 현행 조문은 2025-10-01 시행본(소관 기관 명칭만 방송미디어통신위원회로 변경)이다.**

**근거**
- KISA 위치정보지원센터, "위치기반서비스 사업신고" (https://www.lbsc.kr/front/content/contentViewer.do?contentId=CONTENT_0000081): 개인위치정보를 다루지 않는 위치기반서비스사업은 신고 대상에서 제외. 개인위치정보가 스마트폰 등 이용자 단말기 안에서만 활용되고 "사업자의 위치정보시스템으로 전송하지 않는 경우에는 신고 대상에서 제외". 신고는 사업자등록증이 있는 사업자가 전자민원센터(www.emsit.go.kr)로 하고, 사업계획서, 주요 설비 서류, 위치정보 보호조치 증명 서류가 필요.
- 위치정보법 제9조 제1항 (국가법령정보센터, https://www.law.go.kr/LSW//lsSideInfoP.do?lsiSeq=277359&joNo=0009&joBrNo=00&docCls=jo&urlMode=lsScJoRltInfoR): "위치기반서비스사업(개인위치정보를 대상으로 하지 아니하는 위치기반서비스사업은 제외한다)을 하려는 자는 ... 방송미디어통신위원회에 신고하여야 한다". 현행 시행 2025-10-01(법률 제21066호, 타법개정). ①항 개정 이력: 2007, 2008, 2015, 2018-04-17, 2025-10-01. 개인위치정보 제외 문구는 2018년 개정분으로 보이며 2024년 변경 이력은 없다.
- 위치정보법 제2조 (CaseNote 현행본, https://casenote.kr/법령/위치정보의_보호_및_이용_등에_관한_법률): 위치정보는 "이동성이 있는 물건 또는 개인이 특정한 시간에 존재하거나 존재하였던 장소에 관한 정보로서" 전기통신설비 등을 이용하여 측위된 것. 개인위치정보는 특정 개인의 위치정보(다른 정보와 쉽게 결합해 알 수 있는 것 포함).
- 법무법인 세종(신김) 뉴스레터 (https://www.shinkim.com/kor/media/newsletter/1789): 2022-04-20 시행 개정으로 위치정보 개념을 "측위"된 것으로 한정, 개인위치정보처리방침 공개(제21조의2), 보유목적과 기간 동의, 개인위치정보사업 허가제의 등록제 전환.
- 위치정보법 제9조의2: 소상공인, 1인 창조기업은 신고 없이 시작할 수 있으나 1개월 넘게 계속하면 1개월 이내 신고.
- 위치정보법 제19조 제1항: 위치기반서비스사업자가 개인위치정보를 이용해 서비스를 제공하려면 미리 이용약관에 명시하고 동의를 받아야 한다. 제25조: 14세 미만 아동의 개인위치정보 수집, 이용, 제공은 법정대리인 동의 필요. 제26조: 8세 이하 아동 등의 보호의무자 동의 특례.

**구조별 판단 (해석, 확정 아님)**

| 데이터 흐름 | 판단 | 근거 |
| --- | --- | --- |
| 현위치(Geolocation)를 브라우저 메모리에서 거리 계산에만 사용 | 신고 비대상 | KISA "단말기 안에서만 활용, 사업자 서버 미전송" |
| 사용자가 주소 검색 또는 지도 핀으로 지정한 사무실 좌표를 DB 저장 | 위치정보(측위된 것)가 아니라 사용자 입력 주소로 볼 여지가 큼 | 제2조 "측위" 요건 |
| 온보딩 "현위치 버튼"으로 측위한 좌표를 그대로 사무실로 저장 | **개인위치정보 수집으로 볼 위험 있음 → 신고, 약관, 동의 필요** | 측위 + 서버 전송 |
| 현위치 좌표를 카카오 로컬 API(`x`, `y`)에 직접 전달 | 우리 서버가 아니라 제3자 API로 전송. KISA 안내 문구로는 판단 불가 | 문의 필요 |
| PostHog, Sentry로 좌표 미전송 | 현 규칙 유지 | CLAUDE.md 7장 |

**확인일**: 2026-10-28

**영향받는 문서/작업**: PRD ONB-01(현위치 버튼), 11.3절, APP-05(위치정보 이용약관), 14.2절 체크리스트, AUTH-06; tasks T4.x 온보딩 1단계, T10.1, T10.3; CLAUDE.md 7장 "현위치는 서버로 보내지 않는다" 항목(사무실 저장 경로까지 명시하도록 보강 제안).

**권장안**
1. 신고 비대상 구조를 기본안으로 한다. ONB-01의 현위치 버튼은 **지도 중심만 이동**시키고, 사무실 저장은 사용자가 주소 검색 결과를 고르거나 핀을 직접 옮겨 "이 위치로 저장"을 누를 때만 한다. 현위치 좌표가 그대로 저장 API로 가지 않도록 코드 경로를 분리하고 테스트로 막는다.
2. Sentry breadcrumb와 오류 컨텍스트, PostHog autocapture에 좌표가 섞이지 않도록 `beforeSend` 필터를 둔다.
3. 위치정보법상 이용약관(제19조)은 비대상 구조라면 법적 의무가 아니다. 다만 APP-05는 유지하되 "위치정보 처리 안내"로 성격을 바꿔 현위치 미전송, 사무실 좌표 저장 목적과 보유기간, 탈퇴 시 삭제를 적는다(개인정보처리방침에도 같은 내용).
4. 만 14세 미만: AUTH-06의 가입 제한으로 개인정보보호법과 위치정보법 제25조를 함께 충족한다. 비로그인 둘러보기의 현위치도 서버 미전송이므로 추가 조치 불필요.
5. 공개 출시 전(T10.1) KISA에 위 표를 보내 서면 확인을 받는다. 신고가 필요하다는 회신이면 사업자등록 후 전자민원센터 신고, 위치정보 이용약관, 개인위치정보처리방침(제21조의2), 동의 화면을 추가한다(약 2주 여유).

**남은 불확실성**
- 사용자가 지정한 사무실 좌표가 "측위된 위치정보"가 아니라는 해석, 그리고 현위치를 제3자 API(카카오)로 직접 보내는 것이 "사업자 위치정보시스템 전송"에 해당하지 않는다는 해석은 공식 회신이 없다.
- 의뢰서의 "2024년 개정(신고제 변경)"에 해당하는 조문 변경은 찾지 못했다. 시행령이나 고시 수준 변경이 있었는지 KISA 문의 시 함께 확인.
- 신고는 사업자등록증이 전제다. 개인 개발자가 사업자등록 없이 운영할 때의 처리도 함께 문의.

---

### T0.19 Vercel Hobby와 Supabase 무료 플랜 제약

**질문**: Vercel Hobby의 상업적 이용 금지 범위, Cron 빈도, 함수 실행 시간, 대역폭 한도와 Pro 가격. Supabase 무료 플랜의 비활성 일시 정지 조건, 백업 범위, DB, 스토리지, Realtime, pg_cron, Auth MAU 한도. 개발 중 정지 방지용 주기 요청이 약관 위반인지.

**결론**: **Vercel Hobby는 Cron이 하루 1회(±59분)로 제한되어 투표 마감에 쓸 수 없으므로 pg_cron 설계가 맞다. 광고, 제휴 링크, 결제가 없는 MVP는 Hobby의 비상업 정의에 걸리지 않지만, 할인 제휴나 광고를 붙이는 순간 Pro($20/월)가 필요하다. Supabase 무료 플랜은 7일간 사용자 DB 활동이 적으면 일시 정지되고(1년 내 복구 가능), 자동 백업이 없으므로 T8.17 주간 `supabase db dump`는 필요하다. 정지 방지용 주기 요청을 금지하는 조항은 약관에 없지만 공식 권장 방식도 아니다.**

**근거 (Vercel)**
- Fair Use Guidelines, Commercial usage (https://vercel.com/docs/limits/fair-use-guidelines, 문서 갱신 2026-09-14): "Hobby teams are restricted to non-commercial personal use only." 상업적 이용은 제작에 관여한 누구든 금전적 이익을 얻는 배포로 정의. 예: 방문자 결제 요청, 상품이나 서비스 판매 광고, 사이트 제작 대가 수령, 제휴 링크가 주목적인 사이트, AdSense 등 광고 포함. 기부 요청은 상업적 이용 아님.
- Hobby Plan (https://vercel.com/docs/plans/hobby, 갱신 2026-09-14): 월 Fast Data Transfer 100GB, Fast Origin Transfer 10GB, CDN 요청 100만, 함수 호출 100만, Active CPU 4시간, Provisioned Memory 360GB-hrs, 이미지 변환 5,000, Web Analytics 5만 이벤트. 함수 최대 실행 시간 300초. 런타임 로그 1시간. 배포 하루 100회. 한도 초과 시 대부분 30일 대기.
- Cron Jobs Usage & Pricing (https://vercel.com/docs/cron-jobs/usage-and-pricing, 갱신 2026-07-15): Hobby는 프로젝트당 100개, **최소 간격 하루 1회, 정밀도 시간 단위(±59분)**. 더 잦은 식은 배포 실패. Pro는 분 단위.
- Pricing (https://vercel.com/pricing): Pro $20/월(개발자 좌석당), $20 사용량 크레딧 포함. 함수 실행 시간 기본 300초, 최대 800초.

**근거 (Supabase)**
- Pricing (https://supabase.com/pricing): Free는 활성 프로젝트 2개, MAU 5만, DB 500MB/프로젝트, Egress 5GB, 파일 스토리지 1GB, Realtime 동시 접속 200, Realtime 메시지 월 200만, Edge Function 호출 50만, 로그 보존 1일, **백업 미포함**, **1주 비활성 시 일시 정지**. Pro는 $25/월부터, MAU 10만, 디스크 8GB, Egress 250GB, 스토리지 100GB, Realtime 동시 500, 일일 백업 7일 보존, 컴퓨트 크레딧 $10.
- Billing on Supabase (https://supabase.com/docs/guides/platform/billing-on-supabase): 무료 프로젝트 2개 한도는 본인이 Owner/Admin인 모든 조직 합산, 일시 정지된 프로젝트는 제외. 서드파티 Auth MAU 5만.
- Project Pausing (https://supabase.com/docs/guides/platform/free-project-pausing.md): 7일간 사용자 DB 활동이 낮으면 정지. "하루 몇 건의 사용자 요청"이면 보통 충분. 정지 약 1주 전 경고 메일. 경고 후 대시보드 방문이나 API 호출로 방지 가능. 정지 후 1년 안에 대시보드 "Resume project"로 데이터와 설정 그대로 복구. 유료 프로젝트는 정지되지 않음.
- Backups (https://supabase.com/docs/guides/platform/backups): 일일 자동 백업은 Pro, Team, Enterprise만. 무료 플랜은 "Supabase CLI `db dump`로 정기 내보내기와 외부 보관"을 권장.
- Supabase Cron (https://supabase.com/docs/guides/cron): pg_cron 기반, 초 단위부터 설정 가능, 동시 실행 8개 이하와 작업당 10분 이내 권장. 무료 플랜 사용 제한 문구는 없음.
- Terms of Service (https://supabase.com/terms): 보안 장치 우회 금지, 부여 범위 밖 사용 금지, 사용량 상한과 스로틀 적용 가능 조항은 있으나 무료 플랜 정지 회피용 자동 요청을 직접 다루는 조항은 없음.

**확인일**: 2026-10-28

**영향받는 문서/작업**: CLAUDE.md 13장(Vercel Hobby, Supabase 정지 항목: 수치 보강), PRD 14장(수익화 전 Pro 전환 시점), tasks T7.x 투표 마감(pg_cron 유지), T8.17(백업 스크립트 "필요"로 확정), T0.10, T9.x(베타 전 플랜 재검토).

**권장안**
1. 투표 마감은 계획대로 pg_cron 1분 + 조회 시 판정. Vercel Cron은 쓰지 않는다(필요하면 하루 1회 정리 작업만).
2. Vercel Hobby는 광고, 제휴 링크, 결제가 없는 동안만 쓴다. 할인 제휴(DEAL)나 광고, 후원 슬롯을 켜기 전, 또는 회사 업무로 개발하는 것으로 볼 여지가 있으면 Pro로 전환한다.
3. Supabase 백업: T8.17을 필수로 바꿔 GitHub Actions 주 1회 `supabase db dump`(스키마 + 데이터) → 비공개 저장소나 암호화 스토리지에 보관. 클로즈드 베타 시작 시 Pro($25/월, 일일 백업, 정지 없음) 전환을 검토한다.
4. 정지 방지: 개발 기간에는 실제 개발 사용과 경고 메일 수신 시 대시보드 방문으로 충분하다. 자동화가 필요하면 GitHub Actions로 주 2회 anon 키로 공개 테이블 1건 조회하는 정도에 그친다. 약관상 금지 조항은 없지만 공식 권장도 아니므로 베타 이후에는 Pro 전환으로 해결한다.
5. 무료 한도 중 가장 먼저 닿을 항목은 Egress 5GB와 Realtime 동시 접속 200이다. 투표방 Realtime 채널은 투표방 화면에서만 구독하고 이탈 시 해제한다.

**남은 불확실성**
- pg_cron 작업(DB 내부 실행)이 "사용자 DB 활동"으로 집계되는지 공식 문서에 없다. 집계된다면 정지가 사실상 일어나지 않지만 확인 필요(대시보드 경고 메일 수신 여부로 판단).
- 무료 플랜에서 pg_cron 확장 사용 가능 여부는 문서에 제한 문구가 없다는 것만 확인했다. T0.10 프로젝트 생성 후 Database → Extensions에서 직접 확인.
- Vercel의 "commercial" 판단은 사례별이며 불명확하면 Vercel Support 문의가 공식 경로다.
- Vercel과 Supabase 한도 수치는 자주 바뀐다. 베타 직전에 다시 확인한다.

### T0.20 카카오 provider의 이메일 필수 여부와 비즈 앱 전환 필요성

조사 중

### T0.27 동적 라이브러리 사전 조사 (버전, 유지보수 상태, 라이선스, 호환성)

조사 중
