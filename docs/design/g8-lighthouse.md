# G8 Lighthouse 모바일 측정 (T8.10)

목표: Lighthouse 모바일 **성능 85 이상, 접근성 90 이상**. 측정일 2026-11-02(KST).

## 1. 측정 조건

| 항목 | 값 |
| --- | --- |
| Lighthouse | 13.5.0 (`npx -y lighthouse@13.5.0`, 프로젝트 의존성 아님) |
| 브라우저 | 로컬 Google Chrome 156 headless(`--headless=new`), `CHROME_PATH` 지정 |
| 프리셋 | 기본 모바일(Moto G Power 412x823 에뮬레이션), simulate 스로틀링 RTT 150ms, 1.6Mbps, CPU 4x |
| 서버 | `pnpm build` 후 `next start -p 3199`(프로덕션 빌드, 로컬호스트) |
| 상태 | 비로그인, 캐시 빈 첫 방문. 위치 권한 없음(headless는 권한 요청을 거절) |
| 차단 | `*posthog*`, `*sentry*`, `*ingest*` 요청(개발 키로 측정 이벤트가 쌓이지 않게) |
| 집계 | 페이지마다 3회, 점수와 지표 각각 중앙값 |
| 리포트 JSON | git 밖(스크래치 폴더). 이 문서에는 요약만 둔다 |

`/today`, `/map`은 위치 권한이 없어 "위치 권한을 허용하면..." 안내 상태가 LCP 요소다(카드는 카카오 응답 뒤라 측정 범위 밖).
카드 상태의 LCP는 `e2e/perf-today.spec.ts`(가짜 카카오, Fast 4G)로 따로 잰다.

## 2. 결과 (고친 뒤, 중앙값)

| 페이지 | 성능 | 접근성 | 권장사항 | SEO | FCP | LCP | TBT | CLS | LCP 요소 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` 랜딩 | **97** | **96** | 100 | 100 | 1.1초 | 2.6초 | 3ms | 0 | 첫 화면 제목 |
| `/today` 둘러보기 | **86** | **100** | 96 | 63 | 1.2초 | 4.2초 | 11ms | 0 | 위치 권한 안내 문단 |
| `/login` | **97** | **96** | 100 | 63 | 1.2초 | 2.5초 | 4ms | 0 | 로그인 제목 |
| `/terms` | **98** | **100** | 100 | 63 | 0.9초 | 2.3초 | 2ms | 0.018 | 약관 본문 문단 |
| `/offline` | **99** | **100** | 100 | 63 | 0.9초 | 2.2초 | 2ms | 0 | 오프라인 제목 |
| `/map` 둘러보기 | 81 (미달, 2차) | **100** | 96 | 63 | 1.2초 | 5.2초 | 10ms | 0 | 위치 권한 안내 문단 |

3회 점수 편차는 페이지마다 0~2점.

### 고치기 전 (같은 조건, 중앙값)

| 페이지 | 성능 | LCP | TBT |
| --- | --- | --- | --- |
| `/today` | 78 | 5.9초 | 27ms |
| `/map` | 76 | 6.9초 | 61ms |
| `/`, `/login`, `/terms`, `/offline` | 97~99 | 2.2~2.5초 | 3~12ms |

## 3. 원인과 고친 것

- **원인 (`/today`, `/map`)**: PostHog SDK(약 104KB gzip)와 Sentry SDK(약 60KB gzip) 청크가 load 직후 유휴 시점에 받아져
  첫 화면 렌더링과 같은 시간대에 대역폭을 나눠 썼다. Lighthouse "사용하지 않는 JS" 진단이 LCP 1,050ms 절감을 가리켰고,
  두 청크만 막고 재 보니 `/today` LCP 5.9초 → 4.2초, 성능 78 → 86.
- **고침**: 두 SDK 시작 시점을 "load 뒤 3초 + 유휴(최대 4초 더)"로 늦췄다. PostHog는 첫 상호작용(pointerdown, keydown)이 먼저 오면 그때 바로 시작한다(기존과 같음).
  - `src/lib/analytics/index.ts` `scheduleAnalytics()`: 시작 전 이벤트는 기존 큐(최대 50건)에 쌓였다가 초기화 뒤 보낸다. 데이터 손실 없음.
  - `src/instrumentation-client.ts` `whenIdle()`: 트레이드오프로 load 뒤 약 3~4초 안에 난 브라우저 오류는 Sentry에 잡히지 않는다(기존에도 SDK 로드 전 오류는 미수집).
- 디자인, 문구, 화면 동작 변화 없음. 홈 첫 로드 JS 영향은 약 +0.05KB(gzip, 지연 타이머 코드).

## 4. 남은 것

- **`/map` 2차 (2026-11-02)**: 식당 상세 본문(`place-detail.tsx`: 더보기 Base UI Menu와 floating-ui, 제보, 후기 의존)을 지도 탭 첫 로드에서 뺐다.
  - `src/features/map/place-detail-lazy.tsx`: 상세 본문, 하단 행동 줄, 목록 보기 상세를 `React.lazy`로 감싸고, 식당 목록이 뜨면 유휴 시점에 미리 받는다.
    받기 전에 마커를 누르면 같은 자리에 상세 스켈레톤이 보이고, 제목 초점 이동은 제목이 생길 때 한다(`map-screen.tsx` MutationObserver).
  - `place-detail-skeleton.tsx`(스켈레톤), `user-state-key.ts`(즐겨찾기 쿼리 키)를 떼어 지도 탭이 상세 본문 없이 쓰게 했다. 기존 import 경로는 그대로 다시 내보낸다.
  - 결과: `/map` 첫 로드 JS 297.9 → **228.6KB**(gzip), 성능 79 → **81**, LCP 5.6 → 5.2초, CLS 0 유지. `/today` 199.6 → 199.2KB, 성능 86 그대로, `/` 179.1KB 그대로.
- **`/map` 85에 못 미친 이유 (2차 뒤 81)**: 남은 차이는 동작을 바꾸지 않고는 줄이기 어렵다.
  - 네이버 지도 SDK(`maps.js` 약 92KB)가 위치를 찾는 동안 지도 칸에 기본 위치 지도를 그리려고 먼저 받아진다. 이 요청만 막고 재 봐도 83점이었다(1회 측정).
  - 그 밖에 하단 탭 링크 프리페치(`/today` 청크와 RSC 약 35KB)와 지도 화면 자체 코드(화면, 목록 줄, 시트, 필터 칩 ToggleGroup, TanStack Query)가 첫 화면 전에 받아진다.
  - 85로 가는 후보(모두 동작이 바뀜, 결정 필요): (1) 기준 위치가 정해진 뒤 SDK 받기(위치를 찾는 동안 기본 위치 지도 대신 빈 지도 칸), (2) 하단 탭 프리페치를 누르기 직전(pointerenter, touchstart)으로 미루기(탭 전환이 조금 느려질 수 있음, 홈에도 영향).
- **SEO 63 (앱 화면, `/login`, `/terms`)**: `robots: { index: false }`로 일부러 막은 페이지라 `is-crawlable`만 실패한다. 의도된 결과.
- **권장사항 96 (`/today`, `/map`)**: `geolocation-on-start`(페이지 진입 때 위치 권한 요청). 10초 원칙에 따른 제품 결정이라 유지.
- **접근성 96 (`/`, `/login`)**: 네이버 로그인 버튼 흰 글자 대비 2.25:1. 브랜드 예외(design-decisions G3 안건 7, g8-a11y-audit I3).
- 실기기, 실제 4G 확인 필요: Lighthouse는 로컬호스트 + 시뮬레이션 스로틀링이다. Vercel 배포 URL에서 PageSpeed Insights(실제 CDN, TLS)와
  실기기 Android 중급기 4G, iOS Safari, 카카오톡 인앱 브라우저에서 LCP와 첫 카드까지의 시간을 다시 봐야 한다.
