# G5 확인 (T5.40, T5.41)

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

### 2.4 개선안 (코드 수정은 하지 않았다)

| 우선 | 안 | 예상 효과(Regular 3G 첫 방문 카드) | 범위 |
| --- | --- | --- | --- |
| 1 | Pretendard를 KS X 1001 가변 한 파일(539KB) 대신 **동적 서브셋(unicode-range로 쪼갠 woff2)**으로 바꾸고 Link 헤더 preload를 끈다. 화면에 쓰인 글자 묶음만 받는다(보통 수십~150KB) | -1.0~1.4초 | `src/app/fonts`, 루트 layout, DESIGN.md 타이포(디자인 결정이라 사용자 확인 필요) |
| 2 | 마루 부리 Light를 제목 글자에 필요한 범위로 줄이거나(서브셋), 홈 제목을 대체 서체로 그린 뒤 늦게 받게 한다(`preload: false`는 이미 적용) | -0.5~0.9초 | 위와 같음 |
| 3 | 카카오 검색 2, 3페이지를 1페이지 응답(totalCount) 뒤 **나란히** 요청(`page: 2`, `page: 3` 옵션)하거나, 1페이지(가까운 15곳)로 먼저 묶음을 그리고 나머지를 이어 붙인다(다만 묶음이 바뀌지 않게 시드, 후보 확정 규칙 필요) | -0.4~0.8초 | `src/lib/kakao/local.ts`(래퍼), rec는 그대로 |
| 4 | 카카오 SDK 스크립트를 하이드레이션 직후(측위와 동시에) 미리 넣는다. 지금은 검색 모듈 청크를 받은 뒤 넣는다 | -0.2~0.4초 | `src/features/rec/today-screen.tsx` 한 줄(`loadKakaoSdk` 미리 부르기) |

- 1+3이면 측정 변형("글꼴 둘 다 막음 + 1페이지" 4.23초)에 가까워져 5초 기준을 넘길 수 있다. 1만으로는 경계(약 5.9초)다.
- 실제 카카오 SDK와 검색 응답 시간은 가짜 값(500ms, 300~800ms)을 가정했다. 실기기 3G에서 다시 재 본다(T5.42).

## 3. 홈 번들 (T5.41)

`pnpm build`(postbuild `bundle-report`, 파일 gzip level 9). 기록은 `docs/design/bundle-log.md` 2026-10-31 행.

| 라우트 | 첫 로드 JS (gzip) | 예산 200KB |
| --- | --- | --- |
| `/today` (홈) | **198.3 KB** (18개 청크, raw 627.4 KB) | 통과, 여유 1.7 KB |
| `/` (랜딩) | 177.8 KB | 통과 |
| `/map` | 281.1 KB | 홈 예산 대상 아님(참고값). 지도 필터 작업이 진행 중인 트리에서 잼 |

- `/today` 여유가 1.7KB뿐이다. 6단계 홈 추가 요소(어제 피드백 띠 T6.8)는 첫 로드에 넣기 전에 지연 로딩부터 검토한다.
