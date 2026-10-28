# 번들 증가량 기록 (bundle-log.md)

> 라이브러리를 추가할 때마다 홈 번들에 주는 영향을 기록합니다(tasks.md 2.4절, CLAUDE.md 9장).
> **홈(오늘) 화면 JS 예산: 200KB (gzip) 이하.** 측정은 `pnpm build` 후 `pnpm bundle:report`(홈 첫 로드 gzip 합계, 예산 초과 시 exit 1) 기준이며 원인 추적은 `pnpm analyze`로 하고, 예산에 가까워지면 추가 전에 사용자에게 묻습니다.

## 기록 방법

- 홈 번들 영향: 홈 첫 로드에 포함되는 gzip 증가량. 동적 import나 다른 라우트에만 들어가면 `0`으로 쓰고 비고에 실제 청크 크기를 적습니다.
- 누적: 이 항목까지 반영한 홈 첫 로드 JS 총량(gzip).
- 로딩 방식: 기본 포함 / 라우트 한정 / 동적 import / 소스 복사.

## 기록

| 날짜 | 패키지@버전 | 용도 | 로딩 방식 | 홈 번들 영향 (gzip) | 누적 (gzip, 예산 200KB) | 비고 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-28 | 기준선: Next 16.4.3 + React 19.3 + shadcn base 빈 홈 | 기준선 | 기본 포함 | 해당 없음 | 132.1 KB | `node scripts/bundle-report.mjs` 결과(5개 청크, raw 446.9KB). 예산 200KB의 66% |
| 2026-10-28 | @sentry/nextjs@11.9.0 | 오류 모니터링 (T0.35) | 동적 import (첫 렌더 후 requestIdleCallback, DSN 없으면 요청 없음) | +0.4 KB | 132.5 KB | 초기 번들에는 `instrumentation-client.ts` 스케줄러만 포함. SDK 지연 청크는 약 56.8KB gzip(홈 첫 로드 목록에 없음). `withSentryConfig`, Session Replay와 tunnelRoute는 미사용. 측정은 `pnpm build` 후 `pnpm bundle:report` |
| 2026-10-28 | posthog-js@1.438.24 | 제품 분석 (T0.35) | 동적 import (초기화 시점에만, 키 없으면 로드 안 함) | 0 | 132.5 KB | `src/lib/analytics/posthog.ts`만 설치하고 아직 어디에서도 마운트하지 않아 청크 자체가 빌드에 없음. 실제 청크 크기(조사값 약 104KB gzip)는 T2.13, T2.20에서 `next analyze export`로 측정 |
| 2026-10-28 | motion@14.7.1 | 시안 비교 화면 모션 (T1.11~T1.14): `m` + LazyMotion strict(domAnimation 동기), drag는 domMax 비동기 | 라우트 한정 (design-lab/system만) | 0 | 133.1 KB | 홈(`/`) 첫 로드 133.1KB로 변화 없음. design-lab/system 첫 로드 255.6KB 중 Motion 약 37KB gzip(전용 청크 30.1KB + 공용 청크 안 m, LazyMotion, AnimatePresence 모듈 약 6.8KB). domMax 비동기 청크 14.1KB gzip(시안 A, B 홈 스와이프). 측정: `pnpm build` 후 `pnpm bundle:report`, 청크를 모듈 단위로 나눠 gzip 계산 |
| 2026-10-28 | @number-flow/react@0.6.2 | 득표 수, 숫자 롤링 (시안 A, B, C 시트, 시안 C 홈) | 라우트 한정 (design-lab/system만) | 0 | 133.1 KB | 공용 청크 안 단일 모듈 약 5.6KB gzip(raw 17.4KB). 같은 라우트의 Base UI Drawer 묶음은 약 27KB gzip(시트 화면, 확정 시 지도 탭에만 들어감) |
| 2026-10-29 | 마루 부리 Light 300 + Regular 400 (KS X 1001 서브셋 woff2, 루트 layout, T1.19) | 제목 세리프 (DESIGN.md display, title 300 / heading 식당명 400) | 기본 포함 (next/font/local, CSS @font-face만) | 0 | 133.1 KB | JS 아님. 폰트 전송 Light 140,404 B + Regular 138,488 B = 278,892 B(약 272KB), 그 굵기 글자가 화면에 있을 때만 요청. 식당명 가독성 때문에 400을 유지해 두 굵기 모두 필요(300 하나로 줄이면 22px 식당명이 가늘어지고, 400 하나면 가는 제목 컨셉이 사라짐). `display: swap`, `preload: false`(첫 페인트는 대체 서체로 그려 LCP를 막지 않고, 4G에서 Pretendard 539,268 B preload, JS와 대역폭 경쟁을 피함), `adjustFontFallback: "Times New Roman"`(라틴 size-adjust 114.71%), 대체 스택 AppleMyungjo, Noto Serif KR, Batang. Pretendard는 기존대로 Link 헤더 preload. 측정: `pnpm build` 후 `pnpm bundle:report` |
