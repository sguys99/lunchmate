// AC-REC-4 성능 측정 (T5.41): 3G 수준 네트워크에서 홈(/today) 진입 후 3초 안에 스켈레톤, 5초 안에 카드.
// LCP(4G 2.5초, CLAUDE.md 9장)도 함께 잰다. 결과는 docs/design/g5-qa.md에 기록한다.
//
// 실행 (프로덕션 빌드에서만 의미가 있다. dev 서버는 번들이 크고 느리다)
//   pnpm build && pnpm start -p 3200
//   RUN_PERF=1 PLAYWRIGHT_BASE_URL=http://localhost:3200 pnpm exec playwright test --project=mobile --project=desktop e2e/perf-today.spec.ts
//   PERF_RUNS(기본 3)로 조건마다 반복 횟수, PERF_OUT으로 결과 JSON 파일 경로를 줄 수 있다.
//
// 측정 방법
// - 비로그인 둘러보기(현위치 허용, 측위 즉시). 새 컨텍스트마다 캐시가 빈 첫 방문(콜드)이다.
// - 네트워크: CDP Network.emulateNetworkConditions(아래 PROFILES, Chrome DevTools 프리셋 값). CPU: Emulation.setCPUThrottlingRate 4x.
// - 카카오는 가짜 SDK(음식점 45곳 = 3페이지). Playwright가 가로채 채운 응답에는 CDP 스로틀이 걸리지 않으므로
//   SDK 응답 500ms, 검색 페이지마다 300~800ms 지연을 직접 넣는다(3페이지가 차례로 오므로 검색만 약 1.1~2.4초).
// - PostHog, Sentry 요청은 막는다(개발 키로 측정 이벤트가 쌓이지 않게). 둘 다 첫 렌더 뒤 지연 로딩이라 첫 화면 수치에는 영향이 없다.
// - 시각은 navigation 시작(performance.timeOrigin) 기준 ms. 첫 스크립트(addInitScript)의 MutationObserver가
//   스켈레톤([data-slot=loading-region])과 카드(.lm-today-deck article h2)가 DOM에 처음 생긴 때를 적고, 다음 프레임(rAF)을
//   "보인 때"로 본다. LCP는 PerformanceObserver(largest-contentful-paint)의 마지막 항목.
// - 웹 글꼴(2026-10-31, src/lib/fonts/web-fonts.ts): 첫 방문은 화면이 뜬 뒤 글꼴 목록을 붙인다. 카드 뒤 1.5초에 LCP를 읽고,
//   이어서 글꼴 교체가 끝날 때까지 기다려 CLS(layout-shift 합, 입력 직후 제외)와 글꼴 목록 요청 시각(fontCssStart)을 적는다.
import { writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import {
  kakaoFakeInitSource,
  mockRecommendSdks,
} from "./helpers/kakao-places-fake";

const RUN = process.env.RUN_PERF === "1";
const RUNS = Number(process.env.PERF_RUNS ?? 3);

type Profile = {
  name: string;
  latency: number;
  downloadKbps: number;
  uploadKbps: number;
};

/** Chrome DevTools 네트워크 프리셋 값. 처리량은 kbps(1000 bit), CDP에는 바이트/초로 넘긴다 */
const PROFILES: Profile[] = [
  // 예전 DevTools "Regular 3G"(Playwright, Puppeteer 예시에 널리 쓰인 값)
  { name: "Regular 3G", latency: 100, downloadKbps: 750, uploadKbps: 250 },
  // 지금 DevTools "Slow 3G" (500kbps x 0.8, RTT 400ms x 5)
  { name: "Slow 3G", latency: 2000, downloadKbps: 400, uploadKbps: 400 },
  // 지금 DevTools "Fast 4G" (9Mbps x 0.9, 1.5Mbps x 0.9, RTT 60ms x 2.75). LCP 2.5초 기준용
  { name: "Fast 4G", latency: 165, downloadKbps: 8100, uploadKbps: 1350 },
];

type Marks = {
  fcp: number | null;
  skeletonDom: number | null;
  skeletonPaint: number | null;
  cardsDom: number | null;
  cardsPaint: number | null;
  lcp: number | null;
  lcpElement: string | null;
  /** layout-shift 값 합(hadRecentInput 제외). 측정 창 전체 */
  cls: number;
};

declare global {
  interface Window {
    __lmPerf?: Marks;
  }
}

const INIT = () => {
  const m: Marks = {
    fcp: null,
    skeletonDom: null,
    skeletonPaint: null,
    cardsDom: null,
    cardsPaint: null,
    lcp: null,
    lcpElement: null,
    cls: 0,
  };
  window.__lmPerf = m;
  const check = () => {
    if (
      m.skeletonDom === null &&
      document.querySelector('[data-slot="loading-region"]')
    ) {
      m.skeletonDom = performance.now();
      requestAnimationFrame(() => (m.skeletonPaint = performance.now()));
    }
    if (
      m.cardsDom === null &&
      document.querySelector(".lm-today-deck article h2")
    ) {
      m.cardsDom = performance.now();
      requestAnimationFrame(() => (m.cardsPaint = performance.now()));
    }
  };
  new MutationObserver(check).observe(document, {
    childList: true,
    subtree: true,
  });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.name === "first-contentful-paint") m.fcp = e.startTime;
    }
  }).observe({ type: "paint", buffered: true });
  new PerformanceObserver((list) => {
    const last = list.getEntries().at(-1) as
      (PerformanceEntry & { element?: Element | null }) | undefined;
    if (!last) return;
    m.lcp = last.startTime;
    const el = last.element;
    m.lcpElement = el
      ? `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.split(" ").slice(0, 2).join(".") : ""}`
      : null;
  }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries() as (PerformanceEntry & {
      value: number;
      hadRecentInput: boolean;
    })[]) {
      if (!e.hadRecentInput) m.cls += e.value;
    }
  }).observe({ type: "layout-shift", buffered: true });
};

/** 글꼴 목록(faces.css) 요청 시각과 끝난 시각. 없으면 null */
const FONT_CSS_TIMING = () => {
  const e = performance
    .getEntriesByType("resource")
    .find((r) => r.name.includes("/fonts/") && r.name.endsWith(".css")) as
    PerformanceResourceTiming | undefined;
  return {
    fontCssStart: e ? e.startTime : null,
    fontCssEnd: e ? e.responseEnd : null,
  };
};

/** 웹 글꼴 목록이 붙고 글꼴 교체까지 끝나기를 기다린다(첫 방문은 카드 뒤에 붙는다) */
async function waitWebFonts(page: Page) {
  await page.waitForFunction(
    () => {
      const l = document.getElementById(
        "lm-font-faces",
      ) as HTMLLinkElement | null;
      return Boolean(l?.sheet);
    },
    undefined,
    { timeout: 60_000 },
  );
  await page.evaluate(async () => {
    await new Promise((r) => requestAnimationFrame(r));
    await document.fonts.ready;
  });
  await page.waitForTimeout(500);
}

type Measured = Marks & {
  /** 카드가 보인 뒤 1.5초까지 받은 글꼴 파일 수와 바이트(woff2 본문, 압축 그대로) */
  fontFiles: number;
  fontBytes: number;
  fontCssStart: number | null;
  fontCssEnd: number | null;
  /** 글꼴 교체까지 끝난 뒤의 CLS 합 */
  clsAfterFonts: number;
};

async function measure(page: Page, profile: Profile): Promise<Measured> {
  await page.context().route(/posthog|sentry|ingest/, (r) => r.abort());
  await mockRecommendSdks(page, {
    sdkDelayMs: 500,
    searchDelayMs: [300, 800],
  });
  await page.addInitScript(INIT);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: profile.latency,
    downloadThroughput: (profile.downloadKbps * 1000) / 8,
    uploadThroughput: (profile.uploadKbps * 1000) / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto("/today", { waitUntil: "commit", timeout: 60_000 });
  await expect(page.locator(".lm-today-deck article h2")).toBeVisible({
    timeout: 60_000,
  });
  // LCP 후보가 카드 뒤에 바뀔 수 있어 잠깐 더 둔다
  await page.waitForTimeout(1500);
  const marks = await page.evaluate(() => {
    const fonts = performance
      .getEntriesByType("resource")
      .filter((e) => e.name.includes(".woff2")) as PerformanceResourceTiming[];
    return {
      ...window.__lmPerf!,
      fontFiles: fonts.length,
      fontBytes: fonts.reduce((n, e) => n + e.encodedBodySize, 0),
    };
  });
  await waitWebFonts(page);
  const after = await page.evaluate(FONT_CSS_TIMING);
  const clsAfterFonts = await page.evaluate(() => window.__lmPerf!.cls);
  await cdp.detach();
  return { ...marks, ...after, clsAfterFonts };
}

const results: Record<string, unknown>[] = [];

test.describe("AC-REC-4 성능 (/today, 프로덕션 빌드)", () => {
  test.skip(
    !RUN,
    "RUN_PERF=1과 프로덕션 서버(PLAYWRIGHT_BASE_URL)가 필요합니다",
  );
  test.describe.configure({ mode: "serial" });
  test.use({
    geolocation: { latitude: 37.5665, longitude: 126.978 },
    permissions: ["geolocation"],
  });

  for (const profile of PROFILES) {
    for (let run = 1; run <= RUNS; run++) {
      test(`${profile.name} #${run}`, async ({ page }) => {
        test.setTimeout(120_000);
        const m = await measure(page, profile);
        const row = {
          project: test.info().project.name,
          profile: profile.name,
          run,
          ...m,
          // AC-REC-4 판정(3G 프로필만 의미), LCP 2.5초 판정(4G만 의미)
          skeletonWithin3s: (m.skeletonPaint ?? Infinity) <= 3000,
          cardsWithin5s: (m.cardsPaint ?? Infinity) <= 5000,
          lcpWithin2_5s: (m.lcp ?? Infinity) <= 2500,
        };
        results.push(row);
        console.log(JSON.stringify(row));
        expect(m.skeletonPaint).not.toBeNull();
        expect(m.cardsPaint).not.toBeNull();
      });
    }
  }

  // 재방문(캐시 있음): Playwright 라우트를 걸면 HTTP 캐시가 꺼지므로 카카오 가짜는 첫 스크립트로 넣고(sdk.js 요청 없음),
  // 분석 요청도 막지 않는다. 스로틀 없이 한 번 열어 캐시를 채운 뒤 Regular 3G + CPU 4x로 다시 연다.
  for (let run = 1; run <= RUNS; run++) {
    test(`Regular 3G 재방문 #${run}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.addInitScript({
        content: kakaoFakeInitSource({ searchDelayMs: [300, 800] }),
      });
      await page.addInitScript(INIT);
      await page.goto("/today");
      await expect(page.locator(".lm-today-deck article h2")).toBeVisible({
        timeout: 60_000,
      });
      // 첫 방문 글꼴 적용과 "받음" 표시(src/lib/fonts/web-fonts.ts)까지 기다린다
      await page.waitForFunction(
        () => localStorage.getItem("lm-fonts"),
        undefined,
        {
          timeout: 30_000,
        },
      );
      await page.waitForTimeout(1000);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Network.enable");
      const p = PROFILES[0]!;
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: p.latency,
        downloadThroughput: (p.downloadKbps * 1000) / 8,
        uploadThroughput: (p.uploadKbps * 1000) / 8,
      });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await page.goto("about:blank");
      await page.goto("/today", { waitUntil: "commit" });
      await expect(page.locator(".lm-today-deck article h2")).toBeVisible({
        timeout: 60_000,
      });
      await page.waitForTimeout(1500);
      const m = {
        ...(await page.evaluate(() => window.__lmPerf!)),
        ...(await page.evaluate(FONT_CSS_TIMING)),
      };
      const row = {
        project: test.info().project.name,
        profile: "Regular 3G 재방문",
        run,
        ...m,
        skeletonWithin3s: (m.skeletonPaint ?? Infinity) <= 3000,
        cardsWithin5s: (m.cardsPaint ?? Infinity) <= 5000,
        lcpWithin2_5s: (m.lcp ?? Infinity) <= 2500,
      };
      results.push(row);
      console.log(JSON.stringify(row));
      await cdp.detach();
    });
  }

  test.afterAll(() => {
    const out = process.env.PERF_OUT;
    if (!out || results.length === 0) return;
    const project = String(results[0]!.project);
    writeFileSync(
      out.replace(/\.json$/, `.${project}.json`),
      JSON.stringify(results, null, 2),
    );
  });
});
