# G5 확인 (T5.40, T5.41, T5.42)

> 2026-10-31. 대상: 5단계 오늘(홈) `/today` 추천 → 길찾기 흐름(REC, NAV)과 홈 성능(AC-REC-4), 홈 번들.
> T5.42 G5 확인(REC, MAP, PLACE, NAV P0 AC 전체와 실기기)은 이 문서에 이어서 적는다.

## 1. 추천 → 길찾기 E2E (T5.40)

스펙 `e2e/recommend.spec.ts`, 가짜 카카오 `e2e/helpers/kakao-places-fake.ts`(지도 E2E도 재사용 가능).

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3100 pnpm test:e2e:recommend   # RUN_DB_E2E=1을 스크립트가 켬
```

| 테스트 | 확인 내용 | mobile 390 | desktop 1280 |
| --- | --- | --- | --- |
| 비로그인 둘러보기: 현위치 기준 카드 3장 → 길찾기 | 측위 허용 → 기준 칩 "현위치" → 카드 3장(서로 다름) → 길찾기. 데스크톱은 새 탭 `https://map.naver.com/p/directions/-/{경도},{위도},{식당명}/-/walk`(NAV-03). 모바일은 `nmap://route/walk?dlat&dlng&dname&appname` 요청 1건(출발지 slat 없음) → 1.5초 넘어 같은 탭이 위 웹 주소로 이동(NAV-01, NAV-02). 현위치 좌표(7자리, 5자리 모두)가 앱, 웹 URL 어디에도 없음 | 통과 | 통과 |
| AC-REC-2: 다시 뽑기 5번 연속 | 가짜 45곳에서 첫 묶음 + 5번 = 18곳이 모두 다름 | 통과 | 통과 |
| NAV-04: 로그인 사용자 길찾기 → 방문 후보 | test_rls_ 사용자(약관 동의, 사무실 "회사" 1곳은 본인 세션 REST) → 기준 칩 "회사" → 카드 3장 → 길찾기. 웹 URL 출발지가 사무실 핀(`126.978,37.5665,회사`), 모바일 앱 URL `slat=37.5665&sname=회사` → `visits`에 1행(`source=rec`, `status=candidate`, `place_url=http://place.map.kakao.com/{id}`). 읽기는 publishable 키 + 사용자 토큰(RLS). 끝나면 사용자 삭제 | 통과 | 통과 |

- 결과: **6건 통과**(mobile 3, desktop 3). 같은 명령 5회 반복 모두 통과. 정리 확인 `pnpm test:rls:cleanup` → "지울 테스트 사용자가 없습니다".
- 가짜 카카오: 음식점 45곳(15건 x 3페이지), 거리 30~500m, 업종 10종 순환(술집, 카페 제외). 장소 id는 숫자(visits 형식 검사).
- 모바일 프로젝트는 Desktop Chrome UA라 첫 스크립트로 iPhone UA와 터치 지점을 보이게 해 앱 분기를 탄다. Chromium에서 `nmap://` 이동은 `request` 이벤트로 잡히고 페이지는 그대로 남는다(앱 없음과 같음).
- **실기기 확인 필요**(T5.42): 실제 네이버 지도 앱 실행, iOS Safari "주소가 유효하지 않음" 경고 뒤 웹 폴백, 카카오톡 인앱 브라우저. 네이버 지도 웹 주소 형식은 비공식이라 실제로 열어 봐야 한다(`src/lib/naver/directions.ts` [확인 필요]).

## 2. AC-REC-4 성능 (T5.41)

> AC-REC-4: 3G 수준 네트워크에서도 홈 진입 후 3초 안에 카드 스켈레톤, 5초 안에 카드가 보인다.

### 2.1 방법

- 스펙 `e2e/perf-today.spec.ts`. 프로덕션 빌드에서만 돈다(`RUN_PERF=1`).

  ```bash
  pnpm build && pnpm start -p 3200
  RUN_PERF=1 PLAYWRIGHT_BASE_URL=http://localhost:3200 pnpm exec playwright test --project=mobile --project=desktop e2e/perf-today.spec.ts --workers=1
  ```

- 대상: 비로그인 둘러보기 `/today`(현위치 허용, 측위 즉시). 조건마다 3회, 아래 값은 중앙값(ms, navigation 시작 기준).
- 스로틀: CDP `Network.emulateNetworkConditions` + `Emulation.setCPUThrottlingRate` **4x**, 캐시 끔(첫 방문).

  | 프로필 | RTT | 내려받기 | 올리기 | 출처 |
  | --- | --- | --- | --- | --- |
  | Regular 3G | 100ms | 750 kbps | 250 kbps | 예전 Chrome DevTools 프리셋(Playwright, Puppeteer 예시 값) |
  | Slow 3G | 2000ms | 400 kbps | 400 kbps | 지금 DevTools 프리셋(500kbps x 0.8, 400ms x 5) |
  | Fast 4G | 165ms | 8.1 Mbps | 1.35 Mbps | 지금 DevTools 프리셋(LCP 4G 기준용) |

- 카카오는 가짜 SDK(45곳 = 3페이지). Playwright가 가로채 채운 응답에는 스로틀이 걸리지 않아 **SDK 응답 500ms, 검색 페이지마다 300~800ms**를 직접 넣었다(3페이지가 차례로 와 검색만 약 1.1초).
- PostHog, Sentry 요청은 막았다(둘 다 첫 렌더 뒤 지연 로딩, 개발 키로 측정 이벤트가 쌓이지 않게).
- 스켈레톤, 카드: 첫 스크립트의 MutationObserver가 `[data-slot=loading-region]`, `.lm-today-deck article h2`가 처음 생긴 때를 적고 다음 프레임(rAF)을 "보인 때"로 본다. LCP는 PerformanceObserver의 마지막 항목.

### 2.2 결과 (mobile 390 기준, desktop 1280은 ±0.1초 안에서 같음)

| 조건 | FCP | 스켈레톤 (기준 3초) | 카드 (기준 5초) | LCP | 판정 |
| --- | --- | --- | --- | --- | --- |
| Regular 3G, 첫 방문 | 0.99초 | **0.97초** 통과 | **7.43초** 실패 | 0.99초 (h1 제목) | 스켈레톤만 통과 |
| Slow 3G, 첫 방문 | 5.16초 | 5.11초 실패 | 25.0초 실패 | 5.16초 | 실패(RTT 2초라 HTML 첫 바이트부터 늦음) |
| Fast 4G, 첫 방문 | 0.53초 | 0.51초 | 3.24초 | **0.53초** (기준 2.5초 통과) | 통과 |
| Regular 3G, 재방문(캐시 있음) | 0.19초 | 0.19초 | **1.66초** 통과 | 0.50초 | 통과 |

- 재방문은 Playwright 라우트가 HTTP 캐시를 끄기 때문에 카카오 가짜를 첫 스크립트로 넣어(SDK 요청 없음) 쟀다. 스로틀 없이 한 번 열어 캐시를 채운 뒤 Regular 3G + CPU 4x로 다시 열었다.
- LCP 요소는 머리 제목(h1)이다. 카드가 늦게 와도 LCP는 바뀌지 않으므로 홈의 체감 지표는 "카드" 열이다.
- **AC-REC-4는 첫 방문 Regular 3G에서 카드 기준(5초)을 넘지 못한다.** 스켈레톤 3초, 4G LCP 2.5초, 재방문은 통과.

### 2.3 원인 분석 (Regular 3G, 첫 방문)

리소스 타이밍(mobile, CPU 4x):

| 구간 | 시각 |
| --- | --- |
| HTML 응답 끝 | 0.39초 |
| 스켈레톤(서버 HTML의 Suspense 대체 화면) | 0.97초 |
| 첫 로드 JS 18개(약 198KB gzip) 다 받음 | 4.85초 |
| 하이드레이션 뒤 탭 미리 받기(RSC), 카카오 검색 모듈 | 5.0~5.7초 |
| 카카오 SDK 요청 → 응답(가짜 500ms) | 5.69 → 6.19초 |
| 검색 3페이지(가짜, 차례로) → 엔진 계산 → 카드 | 6.19 → 7.33초 |

같은 조건에서 하나씩 빼 본 값(각 2회, 카드 시각):

| 변형 | 카드 | 줄어든 시간 |
| --- | --- | --- |
| 그대로 | 7.33초 | |
| Pretendard 글꼴(539KB, Link 헤더 preload) 막음 | 5.87초 | -1.46초 |
| 마루 부리 Light(141KB) 막음 | 6.41초 | -0.92초 |
| 글꼴 둘 다 막음 | 5.00초 | -2.33초 |
| 글꼴 둘 다 + 탭 미리 받기(RSC) 막음 | 5.03초 | 0 |
| 글꼴 둘 다 + 카카오 1페이지(15곳) | 4.23초 | -0.8초(페이지 2번 왕복) |
| CPU 스로틀 없음(1x) | 7.32초 | 0 |

- **가장 큰 원인은 글꼴 대역폭 경쟁이다.** 750kbps(약 94KB/s)에서 글꼴 680KB가 첫 로드 JS 198KB와 같은 회선을 나눠 쓴다. JS만이면 약 2.5초에 끝날 다운로드가 4.85초까지 늘어난다. 글꼴은 `display: swap`이라 화면을 막지는 않지만 JS를 늦춰 카드가 늦다.
- 두 번째는 카카오 검색의 직렬 3페이지(`src/lib/kakao/local.ts` `categoryPages`가 `pagination.nextPage()`로 차례로 받음). 페이지마다 왕복이 붙는다.
- CPU(4x)와 탭 미리 받기는 거의 영향이 없다. 네트워크가 병목이다.
- Slow 3G(RTT 2초)는 HTML과 CSS 왕복만으로 스켈레톤이 5초를 넘어 앱 쪽 수정으로 맞출 수 없다. AC의 "3G 수준"은 Regular 3G로 판정하자고 제안한다.

### 2.4 개선안 (측정 당시 제안, 2.5에서 1, 2, 3, 4 적용)

| 우선 | 안 | 예상 효과(Regular 3G 첫 방문 카드) | 범위 |
| --- | --- | --- | --- |
| 1 | Pretendard를 KS X 1001 가변 한 파일(539KB) 대신 **동적 서브셋(unicode-range로 쪼갠 woff2)**으로 바꾸고 Link 헤더 preload를 끈다. 화면에 쓰인 글자 묶음만 받는다(보통 수십~150KB) | -1.0~1.4초 | `src/app/fonts`, 루트 layout, DESIGN.md 타이포(디자인 결정이라 사용자 확인 필요) |
| 2 | 마루 부리 Light를 제목 글자에 필요한 범위로 줄이거나(서브셋), 홈 제목을 대체 서체로 그린 뒤 늦게 받게 한다(`preload: false`는 이미 적용) | -0.5~0.9초 | 위와 같음 |
| 3 | 카카오 검색 2, 3페이지를 1페이지 응답(totalCount) 뒤 **나란히** 요청(`page: 2`, `page: 3` 옵션)하거나, 1페이지(가까운 15곳)로 먼저 묶음을 그리고 나머지를 이어 붙인다(다만 묶음이 바뀌지 않게 시드, 후보 확정 규칙 필요) | -0.4~0.8초 | `src/lib/kakao/local.ts`(래퍼), rec는 그대로 |
| 4 | 카카오 SDK 스크립트를 하이드레이션 직후(측위와 동시에) 미리 넣는다. 지금은 검색 모듈 청크를 받은 뒤 넣는다 | -0.2~0.4초 | `src/features/rec/today-screen.tsx` 한 줄(`loadKakaoSdk` 미리 부르기) |

- 1+3이면 측정 변형("글꼴 둘 다 막음 + 1페이지" 4.23초)에 가까워져 5초 기준을 넘길 수 있다. 1만으로는 경계(약 5.9초)다.
- 실제 카카오 SDK와 검색 응답 시간은 가짜 값(500ms, 300~800ms)을 가정했다. 실기기 3G에서 다시 재 본다(T5.42).

### 2.5 개선 적용 후 재측정 (2026-10-31, 사용자 결정 1, 2)

사용자 결정(2026-10-31): 글꼴 동적 서브셋 + 카카오 병렬 적용, AC-REC-4 판정 조건은 **Regular 3G 첫 방문**(PRD v0.2.4).

적용한 것

| 안 | 내용 | 파일 |
| --- | --- | --- |
| 1 | Pretendard를 공식 배포(pretendard 1.3.9) dynamic-subset woff2 92조각(unicode-range)으로 교체, Link preload 없음(next/font 대신 CSS `@font-face`). 글자 모양 그대로, 한글 11,172자 전체 | `src/app/fonts/fonts.css`, `src/app/fonts/pretendard/`, `src/app/layout.tsx`, `src/app/global-error.tsx` |
| 2 | 마루 부리 Light, Regular KS X 1001 서브셋을 Pretendard와 같은 unicode-range 경계로 85조각씩 나눔. **식당명(홈 큰 카드 h2, 상세 제목, 그냥 골라줘 결과)이 마루 부리 title/heading으로 그려지는 동적 텍스트라** "제목 문구 글자만" 남기는 대신 KS X 1001 전체를 유지하고 조각으로 나눴다. 화면에 나온 글자가 든 조각만 받는다 | `src/app/fonts/maruburi/`, 생성 `scripts/fonts/build-font-subsets.py`(Python fontTools, 프로젝트 의존성 아님) |
| 3 | 카카오 FD6 검색: 1페이지 응답의 pagination(REST meta pageable_count, is_end)으로 더 받을 페이지를 정하고 2, 3페이지를 `page` 옵션으로 **나란히** 요청. 페이지 순서 유지, id 중복 제거, 45곳 상한, 한 페이지라도 실패하면 전체 1회 재시도 | `src/lib/kakao/local.ts`, 테스트 `local.test.ts`(+3) |
| 4 | 홈 진입 때 카카오 검색 모듈과 SDK를 측위와 나란히 미리 받음(`prefetchKakaoSearch`, 실패는 무시하고 실제 검색이 재시도) | `src/lib/kakao/queries.ts`, `src/features/rec/today-screen.tsx` |

결과 (조건마다 3회 중앙값, 2.1과 같은 방법. 서버 `next start`(HTTP/1.1, gzip))

| 조건 | 지표 | 전 | 후 | 차이 |
| --- | --- | --- | --- | --- |
| Regular 3G 첫 방문 (mobile) | 스켈레톤 (기준 3초) | 0.97초 | **0.81초** 통과 | -0.16초 |
| | 카드 (기준 5초) | 7.43초 | **7.02초** 실패 | -0.41초 |
| | FCP / LCP | 0.99 / 0.99초 (h1) | 0.85 / 0.85초 (h1) | -0.14초 |
| | 카드까지 받은 글꼴 | 2개, 679,672 B (Pretendard 539,268 + 마루 부리 Light 140,404) | 13개, **281,796 B** (Pretendard 6조각 약 157KB, 마루 부리 Light 4조각 약 46KB 등) | **-397,876 B (-59%)** |
| Regular 3G 첫 방문 (desktop) | 스켈레톤 / 카드 | (mobile과 같음) | 0.81 / 7.02초 | |
| Slow 3G 첫 방문 (mobile) | 스켈레톤 / 카드 / LCP | 5.11 / 25.0 / 5.16초 | 5.02 / 21.6 / 5.06초 | 판정 조건 아님 |
| Fast 4G 첫 방문 (mobile) | 카드 / LCP (기준 2.5초) | 3.24 / 0.53초 | 2.85 / **0.45초** 통과 | |
| Fast 4G 첫 방문 (desktop) | 카드 / LCP | | 2.85 / 3.12초 (3회 중 2회 LCP 요소가 카드 h2 식당명) | 아래 메모 |
| Regular 3G 재방문 (mobile) | 카드 | 1.66초 | **1.29초** 통과 | -0.37초 |

- 원본 JSON: 측정 로그(`PERF_OUT`)는 리포에 넣지 않았다. 스펙에 글꼴 파일 수와 바이트(`fontFiles`, `fontBytes`) 열을 더했다.
- desktop Fast 4G LCP: 1280에서는 큰 카드 식당명(title 30)이 머리 제목보다 넓어, 식당명 글자 조각이 아직 오지 않아 대체 서체(size-adjust 114.71%)로 먼저 그려진 경우 카드 h2가 LCP가 된다. 카드 자체가 2.85초(가짜 카카오 지연 SDK 500ms + 검색 2회 왕복)에 오므로 LCP도 그 뒤다. CLAUDE.md 9장 LCP 2.5초(4G)는 홈 첫 화면 기준이라 mobile 값(0.45초)으로 판정했다. 실제 카카오 응답 시간으로 다시 볼 항목.
- **AC-REC-4는 여전히 카드 기준(5초)을 넘지 못한다(7.02초).** 스켈레톤 3초, 4G LCP, 재방문은 통과.

남은 원인 (Regular 3G, 같은 빌드에서 하나씩 빼 본 값, 각 2회)

| 변형 | 카드(toBeVisible 기준) |
| --- | --- |
| 그대로 | 7.19, 7.50초 |
| PostHog 지연 청크(약 104KB) 막음 | 7.50, 7.49초 (영향 없음) |
| 글꼴 전부 막음 | **4.98, 4.98초** |
| HTTP/2 + brotli 앞단(Vercel과 비슷한 다중화, 측정용 로컬 프록시) 그대로 | 7.12, 7.00초 |
| HTTP/2 + brotli, 글꼴 전부 막음 | 5.00, 5.00초 |

- **남은 원인은 여전히 글꼴 대역폭이다.** 첫 화면 글자가 든 조각만 받아도 약 280KB이고, 글꼴은 우선순위가 높아 첫 로드 JS(약 198KB)와 회선(약 94KB/s)을 나눠 JS 완료가 약 5.4초까지 밀린다. 글꼴을 빼면 JS가 약 3.0초에 끝나고 SDK(가짜 500ms) + 검색 2회 왕복 뒤 약 4.9초에 카드가 보인다. HTTP/1.1 연결 수 제한(조각 파일이 많아짐)은 원인이 아니다(HTTP/2에서도 같음).
- 카카오 병렬화와 SDK 미리 받기의 몫은 이번 측정에서 분명히 갈라 보이지 않았다. 글꼴을 막은 조건끼리 비교하면 이전 5.00초(3페이지 차례로), 지금 4.98초(3페이지 나란히)다. 타임라인(HTTP/2, 글꼴 막음)에서는 JS 완료 2.99초 → SDK 요청 3.41초 → 응답 3.91초 → 카드 4.99초로, SDK 응답 뒤 검색과 계산이 약 1.0초다(가짜 페이지 지연이 300~800ms 무작위라 2회 측정으로는 차례로 받을 때와의 차이가 흔들림 안에 든다). 단위 테스트는 2, 3페이지가 1페이지 직후 함께 나가는 것을 확인한다.
- 다음 수단(이번에는 적용하지 않음, 사용자 결정 필요):
  1. **글꼴을 카드 뒤로 미루기**: `@font-face`는 그대로 두고 `--font-pretendard`, `--font-maruburi`가 `html[data-fonts]`일 때만 웹 글꼴을 가리키게 한다. 첫 방문은 카드가 보인 뒤(또는 `load` 뒤) 속성을 달아 글꼴을 받고, 재방문은 첫 페인트 스크립트가 "받은 적 있음" 표시(localStorage, 화면 편의 값)를 보고 바로 단다. 예상 카드 약 4.9~5.0초(위 "글꼴 전부 막음"). 첫 방문에서 대체 서체 → 웹 글꼴 교체가 한 번 보인다(보정 @font-face로 흔들림은 줄어 있음).
  2. 1과 함께 첫 화면 조각만 미리 받는 대신 Pretendard 정적 굵기(400, 500) 서브셋으로 바꾸는 안은 글자 모양(가변 축)이 달라지므로 제외.
  3. 카카오 실제 응답이 가짜 값(SDK 500ms, 페이지 300~800ms)보다 빠른지 실기기 3G에서 재기(T4.14와 함께, 사용자 결정 4).

### 2.6 첫 방문 글꼴 지연 적용 후 재측정 (2026-10-31, 사용자 결정: 2.5 다음 수단 1)

적용한 것

| 내용 | 파일 |
| --- | --- |
| 웹 글꼴 `@font-face` 목록(262개, raw 122,048 B, `next start` gzip 전송 27.3 KB, 빌드 CSS일 때는 21.2 KB)을 루트 layout의 렌더링 차단 CSS에서 빼서 `public/fonts/v1/faces.css`로 옮김. 조각 woff2 262개도 `public/fonts/v1/`로. 버전 경로라 1년 immutable 캐시(`next.config.ts` headers) | `public/fonts/v1/`, `next.config.ts`, `scripts/fonts/build-font-subsets.py` |
| 루트 layout이 불러오는 `src/app/fonts/fonts.css`는 서체 변수 + 크기 보정 대체 글꼴 2개만(raw 1,063 B, 빌드 CSS gzip 0.3 KB). 변수의 첫 이름("Pretendard Variable", "MaruBuri")은 목록이 붙기 전에는 없는 글꼴이라 보정된 대체 글꼴로 그린다 | `src/app/fonts/fonts.css` |
| 첫 페인트 전 인라인 스크립트(테마 스크립트 다음): "글꼴 받음" 표시(localStorage `lm-fonts` = `v1`, try/catch)가 있으면 `<link rel=stylesheet blocking=render>`를 바로 붙인다(재방문). 없으면 `load` 뒤 화면의 로딩 영역(`[data-slot=loading-region]`, 홈 카드 스켈레톤 등)이 모두 사라질 때까지(최대 8초) 기다렸다가 유휴 시간에 링크를 붙이고, 목록과 글꼴을 다 받으면 표시를 남긴다. 앱 전체 공통(랜딩은 로딩 영역이 없어 `load` 직후) | `src/lib/fonts/web-fonts.ts`(+ 테스트 8개), `src/app/layout.tsx`, `src/app/global-error.tsx`(오류 화면은 링크를 바로 붙임) |
| 캡처, 시각 회귀, axe 헬퍼는 재방문 표시를 미리 남겨 최종 서체로 찍는다 | `scripts/shots.mjs`, `e2e/helpers/fonts.ts`, `e2e/helpers/gallery.ts`, `e2e/a11y.spec.ts` |
| 측정 스펙에 CLS(layout-shift 합, 글꼴 교체 뒤까지)와 글꼴 목록 요청 시각 열 추가, 재방문 측정은 "받음" 표시가 생긴 뒤 시작 | `e2e/perf-today.spec.ts` |

결과 (2.1과 같은 방법과 프로필, 조건마다 3회 중앙값, `pnpm build` + `next start`, mobile 390 / desktop 1280)

| 조건 | 지표 | 2.5 (전) | 2.6 (후) mobile | 2.6 (후) desktop | 판정 |
| --- | --- | --- | --- | --- | --- |
| Regular 3G 첫 방문 | 스켈레톤 (기준 3초) | 0.81초 | **0.71초** | **0.70초** | 통과 |
| | 카드 (기준 5초) | 7.02초 | **4.64초** | **4.64초** | **통과** (3회 모두 4.60~4.66초) |
| | FCP | 0.85초 | 0.75초 | 0.75초 | |
| | 카드까지 받은 글꼴 | 13개, 281,796 B | **0개, 0 B** (목록 요청 4.68초, 카드 뒤) | 같음 | |
| | LCP | 0.85초 (h1) | 5.48초 (카드 h2, 아래 메모) | 5.49초 (카드 h2) | 아래 메모 |
| | CLS (글꼴 교체 뒤까지) | 측정 안 함 | **0.0001** | 0.0000 | 통과 |
| Slow 3G 첫 방문 | 스켈레톤 / 카드 / LCP | 5.02 / 21.6 / 5.06초 | 4.64 / 16.17 / 4.68초 | 4.63 / 16.20 / 4.68초 | 판정 조건 아님 |
| Fast 4G 첫 방문 | 카드 | 2.85초 | 2.49초 | 2.50초 | |
| | LCP (기준 2.5초) | 0.45초 (mobile h1), 3.12초 (desktop 카드 h2) | **2.75초** (카드 h2) | 2.76초 (카드 h2) | **측정값 초과**, 아래 메모 |
| | CLS | | 0.0001 | 0.0000 | 통과 |
| Regular 3G 재방문 | 스켈레톤 / 카드 | 기록 없음(2.2는 0.19) / 1.29초 | **0.16 / 1.29초** | 0.17 / 1.31초 | 통과 (지금과 같은 체감) |
| | LCP | 0.50초 | 0.52초 (h1) | 0.60초 (일러스트 img) | 통과 |

- **AC-REC-4(Regular 3G 첫 방문, 스켈레톤 3초, 카드 5초)는 통과한다.** 2.5의 "글꼴 전부 막음" 4.98초보다 조금 빠른 것은 렌더링 차단 글꼴 CSS(21.2 KB gzip)까지 빠졌기 때문이다.
- **LCP 메모(남은 원인)**: 첫 방문에서 카드 식당명(h2, title 30px)이 대체 서체로 먼저 보이고, 카드 뒤 글꼴이 오면 웹 글꼴로 다시 그려진다. Chrome은 이 다시 그리기를 새 LCP 후보로 보고하고, 식당명 글자 상자(이번 가짜 데이터 "테스트식당N" 약 4,800~5,400 px²)가 머리 제목 h1("오늘의 추천" 약 4,500~4,700 px²)보다 커서 LCP가 "글꼴 교체 시각"이 된다. 카드는 등장 효과(투명도) 중에 처음 그려져 그때는 후보가 되지 않는다. 같은 빌드, Fast 4G에서 글꼴 목록만 막으면 LCP는 h1 **0.42~0.43초**(LCP 항목은 h1 하나), 막지 않으면 h1 0.43초 → h2 2.75초 두 항목이다(임시 스펙 2회씩). 즉 화면이 늦게 뜬 것이 아니라 글꼴 교체가 기록된 값이다. 2.5의 desktop 3.12초도 같은 현상이었다.
  - 이 값을 2.5초 안으로 넣으려면 (가) 빠른 회선(`navigator.connection.downlink` 5 Mbps 이상 등)에서는 카드를 기다리지 않고 `load` 직후 붙여 카드 전에 글꼴이 오게 하거나, (나) LCP 판정을 실기기 필드 값(PostHog 웹 바이탈)으로 보거나를 정해야 한다. 이번에는 바꾸지 않았다(큰 추가 변경 금지, 사용자 결정 필요). (가)는 Regular 3G(750 kbps)를 늦게 받는 쪽에 그대로 두므로 AC-REC-4에는 영향이 없다.
- CLS: 대체 글꼴 보정(Arial 101.55%, Times New Roman 114.71%)을 그대로 두었고, 홈과 지도에서 글꼴 교체가 레이아웃을 거의 움직이지 않아(0.0001 이하) 한글 대체 글꼴용 보정은 더하지 않았다. 식당명 폭은 교체 전후 약 2~3% 차이(390에서 164 → 160 px).
- **랜딩 `/` 첫인상 (Regular 3G 첫 방문, 임시 스펙 3회)**: FCP 0.67초, `load` 2.71초 → 글꼴 목록 2.77초 → 마루 부리 조각 완료 **8.57초**, 전체 글꼴 9.11초(랜딩은 글자 종류가 많아 Pretendard 10조각 259 KB + 마루 부리 12조각 145 KB). 전에는 글꼴이 첫 로드 JS와 함께 0.7초쯤 요청되어 세리프가 더 일찍(추정 6~7초) 바뀌었다. 첫 페인트의 제목은 대체 세리프(macOS와 iOS AppleMyungjo, Windows Batang)로 보이고 캡처 비교(1280 라이트, 대체 서체 → 최종)에서 줄바꿈과 위치가 같아 인상은 크게 다르지 않다. **Android는 한글 세리프 시스템 글꼴이 없는 기기가 많아 글꼴이 올 때까지 제목이 고딕으로 보일 수 있다**(실기기 확인 항목). 4G에서는 글꼴 완료가 약 1초 안이다. 재방문은 지금과 같다.
- 서체 최종 적용 확인(Playwright, `pnpm start` 3200): `/`, `/today`, `/map` x 390, 1280 x 라이트, 다크 x 첫 방문, 재방문 24개 조합 모두 본문 `Pretendard Variable`, 제목 `MaruBuri`(지도 탭 제목은 설계대로 Pretendard)가 로드 완료 상태, 링크 1개, 콘솔 오류와 하이드레이션 경고 0. 첫 방문은 링크가 처음에 없고(`/today`, `/map`), 재방문은 첫 스크립트 시점에 `blocking=render` 링크가 있음. `/today` → `/map` 클라이언트 이동 뒤에도 링크 1개 유지.
- 검사(2.6 변경 뒤, 같은 빌드 `pnpm start -p 3200`): `pnpm lint`, `pnpm typecheck`, `pnpm test`(127 파일 1342건, DB 필요 3 파일 건너뜀), `pnpm lint:copy`(금지 문자 0) 통과. `NEXT_PUBLIC_DESIGN_LAB=true` + 지도 키를 넘긴 `pnpm test:e2e`(mobile, desktop) 266 통과, 38 건너뜀. `pnpm test:e2e:recommend` 6 통과. 시각 회귀(`visual-mobile`, `visual-desktop`) 4 통과(헬퍼가 재방문 표시를 남겨 기준 이미지 그대로). 같은 폴더의 다른 dev 서버(3150)는 건드리지 않았다.
- 접근성: 글꼴 교체는 서체 모양만 바꾸고 크기, 굵기, 색 토큰은 같아 대비와 터치 영역이 그대로다. `prefers-reduced-motion`, 앱 모션 설정과 무관하다.

## 3. 홈 번들 (T5.41)

`pnpm build`(postbuild `bundle-report`, 파일 gzip level 9). 기록은 `docs/design/bundle-log.md` 2026-10-31 행.

| 라우트 | 첫 로드 JS (gzip) | 예산 200KB |
| --- | --- | --- |
| `/today` (홈) | **198.3 KB** (18개 청크, raw 627.4 KB) → 개선 후 **198.1 KB** (raw 627.0 KB) | 통과, 여유 1.9 KB |
| `/` (랜딩) | 177.8 KB → 177.5 KB | 통과 |
| `/map` | 281.1 KB → 282.7 KB (병렬 요청 코드와 T5.28 커밋 차이 포함) | 홈 예산 대상 아님(참고값). 지도 필터 작업이 진행 중인 트리에서 잼 |

- 개선 후(2.5): JS는 거의 그대로(next/font 클래스 제거 -0.2~0.3KB, 카카오 미리 받기 함수 +0.1KB 미만). 대신 글꼴 `@font-face` CSS가 렌더링 차단 CSS 한 파일로 붙는다(raw 111,951 B, gzip 21.2 KB, Pretendard 공식 unicode-range 목록이 대부분). 스켈레톤은 오히려 0.16초 빨라졌다(Pretendard preload 제거).

- 첫 방문 글꼴 지연 적용 후(2.6, 2026-10-31): `/today` 198.2 KB, `/` 177.6 KB(인라인 스크립트는 HTML 안이라 JS 청크 변화 거의 없음, `global-error`의 상수 import +0.1 KB). 렌더링 차단 글꼴 CSS 21.2 KB gzip은 첫 로드에서 빠지고 루트 CSS에는 대체 글꼴 2개(0.3 KB gzip)만 남는다.
- `/today` 여유가 1.7KB뿐이다. 6단계 홈 추가 요소(어제 피드백 띠 T6.8)는 첫 로드에 넣기 전에 지연 로딩부터 검토한다.

---

# G5 확인 (T5.42)

> 2026-10-31. 대상: 5단계 REC, MAP, PLACE, NAV의 P0 요구사항과 AC, 전체 검사, 캡처, 프로덕션, 실기기 체크리스트.
> 방법: T5.41 개선을 넣은 `pnpm build` + `pnpm start -p 3200`(`.env.local`의 `NEXT_PUBLIC_DESIGN_LAB=true`가 빌드에 들어감)에서 E2E를 돌렸다.
> 같은 디렉터리에 이미 떠 있던 dev 서버(3150, 11:57 시작, `/login` 404인 프로덕션 흉내 환경)는 건드리지 않았고, 그래서 새 dev 서버를 띄울 수 없어 프로덕션 빌드로 돌렸다.
> 캡처와 360px 검사는 임시 스펙으로 돌린 뒤 스펙은 지웠다. 테스트 사용자는 `pnpm test:rls:cleanup`으로 0명 확인.

## 4. 자동 검사 결과

| 명령 | 결과 |
| --- | --- |
| `pnpm lint` | 통과 (경고 0, CSS 하드코딩 색 없음, 9개 CSS 파일) |
| `pnpm typecheck` | 통과 |
| `pnpm test` | 통과, 126 파일 1333건 (3 파일 55건은 DB 필요라 건너뜀, 아래 test:rls로 실행) |
| `pnpm lint:copy` | 통과, 금지 문자 0 (424 파일). 문체 경고 2건(경고만): `landing.ts` 해요체 22%, `rec.ts` 22% (허용 25~40%) |
| `pnpm test:rls` | 처음 1 파일 실패 → **고친 뒤 3 파일 54건 통과 (2회 연속)** |
| `NEXT_PUBLIC_DESIGN_LAB=true PLAYWRIGHT_BASE_URL=http://localhost:3200 pnpm test:e2e` (mobile + desktop) | 266 통과, 36 건너뜀, 2 실패 → 실패 2건은 환경 차이(아래), 키를 넘기면 건너뜀 |
| `pnpm test:e2e:a11y` (3200, 디자인 랩 켬) | 통과, 256건 (`/today`, `/map` 비로그인 둘러보기 포함, 라이트와 다크, 390과 1280) |
| `pnpm test:e2e:recommend` (RUN_DB_E2E) | 통과, 6건 (AC-REC-2, 비로그인 길찾기 좌표 없음, 로그인 NAV-04 visits) |
| `pnpm test:e2e:onboarding` | 통과, 4건 (회귀) |
| `pnpm test:e2e:me` | 통과, 6건 (회귀) |

### 고친 것

| 문제 | 원인 | 고친 내용 |
| --- | --- | --- |
| `test:rls` 첫 실행에서 `t4-account` 실패 `users_email_partial_key` 중복 | 세 RLS 파일이 나란히 돌며 `runId = Date.now().toString(36).slice(-6)`이 같은 밀리초에 겹쳐 같은 테스트 이메일을 만들었다(T5.14에서 파일이 셋이 된 뒤 생긴 경합) | `harness.ts`에 `newRunId()`(시각 + 난수 2자)를 두고 세 파일이 쓰게 함. 제품 코드 변경 없음 |
| 지도 캡처에서 `/map`이 오류 화면("화면을 표시하지 못했습니다"), `TypeError: setZIndex is not a function` | E2E 가짜 네이버 지도(`e2e/helpers/map-sdk-mocks.ts`)에 지도 탭이 쓰는 `Marker.setZIndex`, `Map.getBounds`, `LatLngBounds.getSW/getNE`가 없었다(T5.26~T5.30에서 provider가 쓰기 시작). 실제 SDK에는 있다 | 가짜에 세 메서드 추가. 제품 코드 변경 없음 |
| `e2e/map-smoke.spec.ts` 2건 실패(디자인 랩 켬) | 테스트 프로세스는 `.env.local`을 읽지 않아 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`가 없다고 보고 "키 없음" 화면을 기대하는데, 서버 빌드에는 키가 있다 | 고치지 않음(환경 차이). 키를 환경으로 넘기면 2건 건너뜀 확인 |

## 5. AC 매트릭스 (REC, MAP, PLACE, NAV의 P0)

MAP, PLACE, NAV에는 AC-* 문장이 없어 P0 요구사항 자체를 판정했다. 표기: **자동** 자동 테스트로 증명, **캡처** 6절 캡처로 확인, **실기기 대기** 9절 체크리스트.

| ID | 내용 | 상태 | 근거 |
| --- | --- | --- | --- |
| REC-01 | 끼니 자동 전환(KST 15:00), 수동 토글 | 자동 | `src/lib/time/meal.test.ts`, `kst.test.ts`, 홈 1분 타이머(T5.15) |
| REC-02 | 기준 위치 칩, 권한 거부 시 기본 사무실 | 자동 | `src/features/rec/base-location.test.ts` |
| REC-03 | 후보 → 하드 필터 → 점수 → 다양성 샘플링 | 자동 | `src/lib/reco/recommend.test.ts`, `filter.test.ts`, `score.test.ts`, `sample.test.ts`, `diversity.test.ts`, `src/features/rec/candidates.test.ts` |
| REC-04 | 큰 카드 1 + 대안 2, 데스크톱 좌 세로 + 우 지도 | 자동 + 캡처 | `e2e/recommend.spec.ts`(390, 1280), `card-model.test.ts`, 캡처 `g5-today-*` |
| REC-05 | 다시 뽑기, 세션 제외, 셔플 | 자동 | `src/features/rec/deck.test.ts` |
| REC-06 | 카드 내용(일러스트, 이름, 숫자 3, 배지 최대 2, 이유 1줄) | 자동 + 캡처 | `card-model.test.ts`, `reason.test.ts`, `explain.test.ts`, 캡처 `g5-today-*`. 👍, 태그 집계 값은 6단계 데이터 |
| REC-08 | 카드 행동: 길찾기, 상세, 즐겨찾기, 다시 안 갈래요, 투표에 추가 | **부분** | 길찾기, 상세, 즐겨찾기, 다시 안 갈래요는 자동(`place-requests.test.ts`, `deck.test.ts` refill, `events.test.ts`, E2E). **투표에 추가는 `pollEntry` 플래그로 숨김(해제 T7.35)** |
| REC-09 | 후보 부족, 0곳 빈 상태와 완화 제안 | 자동 + 캡처 | `deck.test.ts` "후보 부족 (REC-09)", 캡처 `g5-today-empty-*`(15분까지 넓히기) |
| REC-10 | 홈 하단 진입점 친구랑 정하기, 회식 모드 | **부분** | 자리는 구현(T5.23), **`pollEntry` 플래그로 숨김**. 투표, 회식 화면이 7단계라 해제는 T7.35 |
| REC-11 | 추천 계산은 브라우저, 순수 함수, 단위 테스트 | 자동 | `src/lib/reco/*.test.ts` 10 파일, 엔진은 홈에서 지연 로딩 |
| AC-REC-1 | 기피 카테고리는 카드에 안 나옴 | 자동 | `filter.test.ts`, `avoid-match.test.ts` |
| AC-REC-2 | 다시 뽑기 5회 같은 곳 없음 | 자동 | `deck.test.ts`, `e2e/recommend.spec.ts`(18곳 모두 다름) |
| AC-REC-3 | 상위 3장이 모두 같은 카테고리 아님 | 자동 | `diversity.test.ts`, `sample.test.ts` |
| AC-REC-4 | Regular 3G 첫 방문 스켈레톤 3초, 카드 5초 | **통과** (2026-10-31 2.6절) | 2.5절 카드 7.02초 실패 → 첫 방문 글꼴 지연 적용 뒤 스켈레톤 0.71초, **카드 4.64초**(mobile, desktop 같음). 4G LCP 측정값은 글꼴 교체로 2.75초(2.6절 메모) |
| AC-REC-5 | 어제 👎한 곳은 다음 날 점수가 낮아짐 | 자동 | `score.test.ts` |
| MAP-01 | 네이버 지도 전체 화면, 기준 마커와 반경 원 | 자동 + 캡처 | `naver-map-provider.test.ts`, `map-loader.test.ts`, `fit.test.ts`, 캡처 `g5-map-*`. 실제 타일은 실기기(가짜 SDK라 캡처에 타일 없음) |
| MAP-02 | 도보 분 알약, 고른 마커만 그림, 클러스터 | 자동 + 캡처 | `cluster.test.ts`, `places.test.ts`, 캡처 `g5-map-selected-1280-*`(고른 알약에 그림과 이름) |
| MAP-03 | 필터 칩(카테고리, 1만 원 이하, 5분, 👍 상위, 즐겨찾기) | 자동 + 캡처 | `filters.test.ts`, 캡처 `g5-map-390-*` |
| MAP-04 | 마커 탭 → 2단 시트, 손잡이 버튼 대체 | 자동(부분) + 캡처 | `view-state.test.ts`, `map-view.test.tsx`, a11y `/map`, 캡처 `g5-map-selected-390-*`(반쯤), `g5-map-full-390-*`(끝까지, "시트 올리기" 버튼으로). **끌기 손맛, 지도 끌기와의 충돌은 실기기 대기** |
| PLACE-01 | 상세 기본 정보, 전화, 도보 분, 홈은 끝까지 연 시트 | 자동 + 캡처 | `detail-model.test.ts`, 캡처 `g5-today-detail-*`, `g5-map-full-*`. tel: 동작은 실기기 |
| PLACE-02 | 가격(제보 중앙값 또는 추정), 분포와 예산 선 | 자동 | `detail-model.test.ts` 가격 범위, `price-estimate.test.ts`. 제보 데이터는 6단계 |
| PLACE-03 | 👍 비율 10칸 미터, 태그 상위 5, 공개 후기 | **부분** | 화면 자리와 3건 미만 숨김은 자동(`detail-model.test.ts`), **후기, 태그 데이터는 6단계**(`EMPTY_PLACE_STATS`) |
| PLACE-04 | 길찾기, 네이버 플레이스, 즐겨찾기, 투표에 추가, 공유 | **부분** | 즐겨찾기 자동(`place-requests.test.ts` setFavorite), 공유와 더 보기 메뉴 구현. **네이버 웹 URL 형식 [확인 필요](공식 문서 없음)**, 투표에 추가는 플래그 |
| PLACE-05 | 제보(문 닫았어요, 가격, 정보 틀림) | **5단계 범위 밖** | 6단계 제보 작업. 더 보기 메뉴 자리만 |
| NAV-01 | `nmap://route/walk` + appname | 자동 + 실기기 대기 | `src/lib/naver/directions.test.ts`, `launch-directions.test.ts` |
| NAV-02 | 미설치 시 웹 길찾기 | 자동 + 실기기 대기 | `launch-directions.test.ts`(1500ms 안 가려지지 않으면 웹) |
| NAV-03 | 데스크톱은 웹으로 바로 | 자동 | `launch-directions.test.ts`, `e2e/recommend.spec.ts` desktop |
| NAV-04 | 길찾기 클릭 시 방문 후보 저장 | 자동 | `place-requests.test.ts`, `e2e/recommend.spec.ts`(visits source rec, RLS 세션 조회), `t5-places.rls.test.ts` |

요약: 28행 중 **통과 22**(자동 또는 자동 + 캡처, 이 가운데 NAV-01, NAV-02, MAP-04는 실기기 확인 남음), **부분 4**(REC-08, REC-10 투표 플래그, PLACE-03 데이터 6단계, PLACE-04 네이버 URL 확인 필요), **미충족 1**(AC-REC-4, 2.6절에서 통과로 바뀜), **5단계 범위 밖 1**(PLACE-05).

## 6. 캡처와 360px

`docs/design/shots/2026-10-31/g5-*` 26장, 프로덕션 빌드 + 가짜 카카오(`e2e/helpers/kakao-places-fake.ts`, 45곳) + 가짜 네이버 지도, 모션 줄임.

| 화면 | 파일 (390, 1280 x 라이트, 다크) |
| --- | --- |
| 오늘(홈) | `g5-today-{390,1280}-{light,dark}.png` |
| 홈 상세 시트(카드 "상세") | `g5-today-detail-{390,1280}-{light,dark}.png` |
| 빈 상태(0곳, 15분까지 넓히기) | `g5-today-empty-{390,1280}-{light,dark}.png` |
| 오류 상태(카카오 SDK 실패, 다시 시도 + 네이버 지도 링크) | `g5-today-error-{390,1280}-{light,dark}.png` |
| 지도 첫 화면(시트 반쯤, 필터 칩, 목록) | `g5-map-{390,1280}-{light,dark}.png` |
| 지도 마커 고름(모바일 시트 요약, 데스크톱 좌 칸 상세 + 고른 알약) | `g5-map-selected-{390,1280}-{light,dark}.png` |
| 지도 시트 끝까지(모바일, "시트 올리기") | `g5-map-full-390-{light,dark}.png` (데스크톱은 좌 칸이 곧 상세라 같은 화면이어서 뺌) |

- 가짜 네이버 지도는 타일이 없고 마커를 모두 가운데에 겹쳐 둔다. 지도 모양, 마커 배치는 실기기에서 본다.
- **360px 가로 넘침: 전부 통과**(`scrollWidth = 360`): 홈, 홈 상세, 빈 상태, 오류, 지도, 지도 고름, 지도 끝까지. 390, 1280 캡처도 모두 scrollWidth = 화면 폭.
- 글꼴(T5.41 변경) 확인: `/`, `/today`, `/map`, `/login`(`/me` → `/login`)을 390, 1280 라이트, 다크로 열어 `document.fonts`에서 Pretendard Variable(45~920)과 마루 부리 300/400 조각이 `loaded`, 제목은 MaruBuri, 본문은 Pretendard로 계산되는 것을 확인했다. 글자 깨짐 없음.

## 7. 프로덕션 확인 (https://lunchmate-kr.vercel.app, origin/main = d58391f)

T5.41 개선은 아직 푸시 전이라 프로덕션은 이전 코드다. 읽기 전용 curl GET.

| 경로 | 결과 |
| --- | --- |
| `/` | 200 |
| `/today`, `/map` | **404** (`appShell` 플래그 `productionOff: true`, `src/lib/flags.ts`. 소유 작업 "T2.6, 해제: 오늘 탭 실제 화면 T5") |
| `/design-lab`, `/design-lab/map/b` | 404 (기대대로) |
| `/login`, `/me` | 404 (`auth` 플래그 `productionOff`, T4.14 뒤 해제) |
| `/robots.txt` | 200 |

- 2026-10-31 사용자 결정 2로 `appShell`의 `productionOff`를 뺐다(아래 원래 메모는 당시 기록). 푸시 뒤 `/today`, `/map` 200을 다시 확인한다.
- **`/today`, `/map`이 프로덕션에서 200이 되려면 `appShell` 플래그를 풀어야 한다.** 플래그 소유 작업 메모가 "해제: 오늘 탭 실제 화면 T5"라 5단계 마무리에서 풀 대상이지만, 로그인(`auth`)은 아직 꺼져 있어 비로그인 둘러보기만 열리게 된다. 공개 범위 결정이라 이번에는 바꾸지 않았다(메인 판단 필요).

## 8. 남은 일

- ~~AC-REC-4 카드 5초~~: 2.6절 첫 방문 글꼴 지연 적용으로 통과(4.64초). 남은 것: 4G LCP 측정값이 글꼴 교체로 2.75초(2.6절 메모의 (가), (나) 결정), Android 랜딩 첫 방문 제목 대체 서체 실기기 확인.
- ~~`appShell` 프로덕션 해제 여부(7절)~~: 2026-10-31 해제(사용자 결정 2, `src/lib/flags.ts`). 푸시 뒤 프로덕션 `/today`, `/map` 200 확인 필요.
- 투표 진입점(REC-08, REC-10, PLACE-04)은 T7.35, 후기와 제보 데이터(PLACE-03, PLACE-05)는 6단계.

## 9. 실기기 체크리스트 (T4.14와 함께, 7단계 투표 링크 뒤 또는 9단계 베타 전)

Claude가 대신 확인하지 않았다. `appShell` 플래그가 켜진 배포(또는 g4-qa.md 7장의 실기기용 주소)에서 본다.

### 길찾기 (NAV)
- [ ] iOS Safari: 네이버 지도 앱 설치 상태에서 홈 "길찾기" → 앱이 열리고 도보 경로, 목적지 이름이 맞다(NAV-01). 사무실 출발이면 출발지가 사무실 핀
- [ ] Android Chrome: 같은 확인(NAV-01)
- [ ] iOS, Android: 앱 미설치 상태에서 1.5초 안에 네이버 지도 웹 길찾기로 넘어간다(NAV-02). 앱 설치 안내 팝업이 겹치지 않는지
- [ ] 카카오톡 인앱 브라우저(iOS, Android): `nmap://`가 열리는지, 막히면 웹으로 넘어가는지(NAV-01, NAV-02)
- [ ] 네이버 웹 길찾기, 검색 URL 형식 **[확인 필요]**: 데스크톱과 미설치 대체 URL이 실제로 목적지를 찍는지, 현위치 출발일 때 좌표가 URL에 없는지(T0.18)
- [ ] 길찾기 뒤 앱에서 돌아왔을 때 웹 탭이 추가로 열리지 않는다(타이머 늦게 불림 처리)

### 지도와 시트 (MAP)
- [ ] 실제 네이버 지도 타일, 기준 마커, 반경 원, 알약 마커와 클러스터("3곳")가 겹치지 않게 보인다(MAP-01, MAP-02)
- [ ] 시트 손잡이 끌기와 지도 끌기가 충돌하지 않는다: 시트 위에서 끌면 시트만, 지도에서 끌면 지도만(MAP-04). 목록 스크롤과 시트 끌기 구분
- [ ] 다크 모드 지도 타일 밝기 필터(T5.28)가 과하지 않고 마커 대비가 남는다
- [ ] "이 지역에서 다시 찾기"가 지도를 충분히 옮겼을 때만 나온다(MAP-05)

### 상세와 공유 (PLACE)
- [ ] `tel:` 전화 걸기 링크(iOS 확인 창, Android 다이얼러)
- [ ] 공유: iOS, Android Web Share 시트가 열리고 카카오맵 `place_url` + 앱 이름이 들어간다. Web Share 없는 브라우저는 복사 안내
- [ ] 네이버 플레이스에서 보기 링크가 해당 식당 근처 검색으로 열린다 **[확인 필요]**

### 위치와 화면
- [ ] 위치 권한 거부(iOS 설정, Android 사이트 권한) → 기본 사무실 기준 + PRD 12장 안내, 사무실이 없으면 로그인 유도 또는 사무실 추가(REC-02)
- [ ] safe-area: iPhone 노치, 홈 인디케이터에서 하단 행동 줄, 하단 탭, 지도 시트 끝이 가려지지 않는다
- [ ] 실제 3G 또는 느린 회선에서 홈 첫 방문 카드 시간(AC-REC-4, 가짜 카카오 지연 가정 재검증)
