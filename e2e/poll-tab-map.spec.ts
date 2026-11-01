// 투표 탭 데스크톱 우측 지도 (T8.11b, g7-qa.md 7절). 진행 중 내 투표의 기준점과 후보 핀, 없으면 기본 사무실 주변.
// 지도 로딩, SDK 오류, 오프라인은 빈 지도 자리. 390, 360 모바일은 지도 칸이 없고 지도 SDK도 받지 않는다(회귀).
//
// 실행
//   PLAYWRIGHT_BASE_URL=http://localhost:3102 RUN_DB_E2E=1 pnpm exec playwright test --project=desktop --project=mobile --workers=1 e2e/poll-tab-map.spec.ts
//   (MAP_SHOTS=1이면 docs/design/shots/2026-11-01/t8-11b-*.png 캡처)
// - 지도와 카카오는 가짜 SDK(e2e/helpers)라 마커가 지도 가운데에 겹쳐 보인다. 실제 타일과 핀 배치는 등록된 도메인에서 본다.
// - 클라우드 개발 DB에 test_rls_ 사용자를 만들고 끝나면 지운다. 투표방 제목은 test_ 접두(rls-cleanup이 지운다).
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { FLAGS } from "../src/lib/flags";
import { rest, rpc } from "../src/lib/supabase/rls/harness";
import { fakePlaceId, mockRecommendSdks } from "./helpers/kakao-places-fake";
import { loadDbE2eEnv, signInContext } from "./helpers/session";

const env = loadDbE2eEnv();
const SHOTS = process.env.MAP_SHOTS === "1";
const SHOT_DIR = join(process.cwd(), "docs/design/shots/2026-11-01");
const OFFICE = { lat: 37.5665, lng: 126.978 };
const pollEntryOn =
  FLAGS.pollEntry.source.type === "const" && FLAGS.pollEntry.source.value;
const NAVER_SDK = "https://oapi.map.naver.com/openapi/v3/maps.js**";

async function shot(page: Page, name: string) {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `${name} ${scheme}`).toBeLessThanOrEqual(0);
    if (!SHOTS) continue;
    mkdirSync(SHOT_DIR, { recursive: true });
    const width = page.viewportSize()!.width;
    await page.screenshot({
      path: join(SHOT_DIR, `t8-11b-${name}__${width}-${scheme}.png`),
    });
  }
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
}

async function member(browser: Browser, baseURL: string, label: string) {
  const context = await browser.newContext({ ...test.info().project.use });
  const signed = await signInContext(context, env!, baseURL, label);
  const token = signed.session.access_token;
  const userId = signed.user.id;
  const agreed = await rest(env!, `profiles?user_id=eq.${userId}`, {
    method: "PATCH",
    token,
    body: {
      terms_agreed_at: new Date().toISOString(),
      birth_confirmed_at: new Date().toISOString(),
      nickname: `test_${label}`,
    },
  });
  expect(agreed.status).toBe(200);
  const office = await rest(env!, "offices", {
    method: "POST",
    token,
    body: { user_id: userId, name: "회사", lat: OFFICE.lat, lng: OFFICE.lng },
  });
  expect(office.status).toBe(201);
  const page = await context.newPage();
  await mockRecommendSdks(page);
  await page.addInitScript(() => {
    addEventListener("DOMContentLoaded", () => {
      const st = document.createElement("style");
      st.textContent = "nextjs-portal{display:none!important}";
      document.head.append(st);
    });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  return { context, page, token, cleanup: signed.cleanup };
}

async function createPoll(
  token: string,
  title: string,
  minutes: number,
  places: readonly string[],
) {
  const r = await rpc<{ poll_id: string; invite_code: string }[]>(
    env!,
    "create_poll",
    {
      p_kind: "lunch",
      p_title: title,
      p_closes_at: new Date(Date.now() + minutes * 60_000).toISOString(),
      p_multi: false,
      p_place_ids: places,
      p_place_urls: places.map((p) => `https://place.map.kakao.com/${p}`),
      p_anchor_lat: OFFICE.lat,
      p_anchor_lng: OFFICE.lng,
      p_radius_m: 600,
    },
    token,
  );
  expect(r.error).toBeNull();
  return r.data![0]!;
}

const mapPane = (p: Page) => p.locator("[data-slot='map-pane']");
const liveMap = (p: Page) => p.locator("[data-fake-map]");
const pinLabels = (p: Page) => p.locator("[data-fake-map] .lm-today-pin-label");

test.describe("투표 탭 데스크톱 지도 (T8.11b)", () => {
  test.skip(!env, "RUN_DB_E2E=1과 Supabase 값(.env.local)이 있어야 실행합니다");
  test.skip(!pollEntryOn, "flags.pollEntry가 꺼져 있습니다");

  test("진행 중 투표 없음: 기본 사무실 주변, 핀 없음", async ({
    browser,
    baseURL,
  }) => {
    test.skip(test.info().project.name !== "desktop", "데스크톱 2단만");
    test.setTimeout(90_000);
    const u = await member(browser, baseURL!, "tm_office");
    try {
      const p = u.page;
      await p.goto("/poll");
      await expect(liveMap(p)).toBeVisible({ timeout: 20_000 });
      // 오늘 지도와 같은 사무실 기준점(건물 원)
      await expect(
        p.locator("[data-fake-map] .lm-today-base[data-kind='office'] svg"),
      ).toBeVisible();
      await expect(pinLabels(p)).toHaveCount(0);
      await shot(p, "office");
    } finally {
      await u.context.close().catch(() => undefined);
      await u.cleanup();
    }
  });

  test("진행 중 투표: 마감이 가까운 방의 후보 핀, 줄에 올리면 그 방으로", async ({
    browser,
    baseURL,
  }) => {
    test.skip(test.info().project.name !== "desktop", "데스크톱 2단만");
    test.setTimeout(120_000);
    const u = await member(browser, baseURL!, "tm_pins");
    try {
      const p = u.page;
      const tag = Date.now().toString(36).slice(-4);
      const soon = await createPoll(
        u.token,
        `test_가까운${tag}`,
        30,
        [0, 1, 2].map(fakePlaceId),
      );
      await createPoll(u.token, `test_나중${tag}`, 120, [
        fakePlaceId(5),
        fakePlaceId(6),
      ]);
      // 가까운 방에 한 표: 1위(단독) 핀만 올리브
      const room = await rpc<{ candidates: { id: string }[] }>(
        env!,
        "get_poll",
        { p_poll_id: soon.poll_id },
        u.token,
      );
      const first = room.data!.candidates[1]!.id;
      const voted = await rpc(
        env!,
        "cast_vote",
        { p_poll_id: soon.poll_id, p_candidate_ids: [first] },
        u.token,
      );
      expect(voted.error).toBeNull();

      await p.goto("/poll");
      await expect(liveMap(p)).toBeVisible({ timeout: 20_000 });
      await expect(pinLabels(p)).toHaveCount(3, { timeout: 20_000 });
      await expect(pinLabels(p)).toContainText([
        "테스트식당1",
        "테스트식당2",
        "테스트식당3",
      ]);
      await expect(
        p.locator("[data-fake-map] .lm-today-pin[data-active='true']"),
      ).toHaveCount(1);
      await expect(
        p.locator("[data-fake-map] .lm-today-base[data-kind='here']"),
      ).toBeVisible();
      await shot(p, "pins");

      // 나중 방 줄에 올리면 지도가 그 방 후보로 바뀐다(지도는 다시 만들지 않는다)
      await p
        .getByRole("link", { name: new RegExp(`test_나중${tag}`) })
        .hover();
      await expect(pinLabels(p)).toHaveCount(2, { timeout: 20_000 });
      await expect(pinLabels(p)).toContainText(["테스트식당6", "테스트식당7"]);
      await expect(liveMap(p)).toHaveCount(1);
      await shot(p, "hover");
    } finally {
      await u.context.close().catch(() => undefined);
      await u.cleanup();
    }
  });

  test("지도 로딩, SDK 오류, 오프라인: 빈 지도 자리", async ({
    browser,
    baseURL,
  }) => {
    test.skip(test.info().project.name !== "desktop", "데스크톱 2단만");
    test.setTimeout(120_000);
    const u = await member(browser, baseURL!, "tm_states");
    try {
      const p = u.page;
      await createPoll(
        u.token,
        `test_상태${Date.now().toString(36).slice(-4)}`,
        30,
        [0, 1].map(fakePlaceId),
      );

      // 지도 로딩: SDK가 늦으면 지도 자리 면만(목록은 먼저 보인다)
      await p.route(NAVER_SDK, async (route) => {
        await new Promise((r) => setTimeout(r, 15_000));
        await route.abort().catch(() => undefined);
      });
      await p.goto("/poll");
      await expect(p.getByRole("link", { name: /test_상태/ })).toBeVisible({
        timeout: 20_000,
      });
      await expect(liveMap(p)).toHaveCount(0);
      await shot(p, "loading");

      // SDK 오류: 조용한 빈 지도 자리(MapPane)
      await p.unroute(NAVER_SDK);
      await p.route(NAVER_SDK, (route) => route.abort());
      await p.goto("/poll");
      await expect(mapPane(p)).toBeVisible({ timeout: 20_000 });
      await expect(liveMap(p)).toHaveCount(0);
      await shot(p, "sdk-error");

      // 오프라인: 목록을 받기 전에 끊기면 목록은 오프라인 안내, 지도는 빈 자리
      await p.unroute(NAVER_SDK);
      await p.route("**/*", async (route) => {
        if (!route.request().headers()["next-action"]) return route.fallback();
        await new Promise((r) => setTimeout(r, 8_000));
        return route.fallback().catch(() => undefined);
      });
      await p.goto("/poll");
      await u.context.setOffline(true);
      await expect(p.getByText("인터넷", { exact: false }).first()).toBeVisible(
        { timeout: 15_000 },
      );
      await expect(mapPane(p)).toBeVisible();
      await shot(p, "offline");
      await u.context.setOffline(false);
    } finally {
      await u.context.close().catch(() => undefined);
      await u.cleanup();
    }
  });

  test("모바일 390, 360: 지도 칸 없음, 지도 SDK 받지 않음 (회귀)", async ({
    browser,
    baseURL,
  }) => {
    test.skip(test.info().project.name !== "mobile", "모바일만");
    test.setTimeout(90_000);
    const u = await member(browser, baseURL!, "tm_mobile");
    try {
      const p = u.page;
      await createPoll(
        u.token,
        `test_모바일${Date.now().toString(36).slice(-4)}`,
        30,
        [0, 1].map(fakePlaceId),
      );
      let sdkRequests = 0;
      p.on("request", (r) => {
        if (r.url().startsWith("https://oapi.map.naver.com/")) sdkRequests++;
      });
      await p.goto("/poll");
      await expect(p.getByRole("link", { name: /test_모바일/ })).toBeVisible({
        timeout: 20_000,
      });
      await shot(p, "mobile");
      await p.setViewportSize({ width: 360, height: 780 });
      await shot(p, "mobile");
      expect(sdkRequests).toBe(0);
      await expect(liveMap(p)).toHaveCount(0);
    } finally {
      await u.context.close().catch(() => undefined);
      await u.cleanup();
    }
  });
});
