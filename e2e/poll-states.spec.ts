// 투표 화면 4상태와 다크 점검 (T7.34). 투표 탭, 투표방의 로딩, 오류, 빈 상태, 오프라인과 결과 공유 시트를
// 라이트, 다크, 360px에서 본다. 회식(e2e/party.spec.ts)과 투표 만들기(e2e/poll-create.spec.ts)의 4상태는 그 spec이 맡는다.
//
// 실행
//   PLAYWRIGHT_BASE_URL=http://localhost:3102 RUN_DB_E2E=1 pnpm exec playwright test --project=mobile --project=desktop --workers=1 e2e/poll-states.spec.ts
//   (POLL_SHOTS=1이면 docs/design/shots/2026-11-01/poll-states-live__*.png 캡처)
// - 로딩과 오류는 서버 액션 요청(next-action 머리)을 늦추거나 끊어서 만든다. 오프라인은 데이터를 받은 뒤 context.setOffline.
// - 클라우드 개발 DB에 test_rls_ 사용자를 만들고 끝나면 지운다. 투표방 제목은 test_ 접두(rls-cleanup이 지운다).
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { rest, rpc } from "../src/lib/supabase/rls/harness";
import { FLAGS } from "../src/lib/flags";
import { expectNoA11yViolations } from "./helpers/axe";
import { fakePlaceId, mockRecommendSdks } from "./helpers/kakao-places-fake";
import { loadDbE2eEnv, signInContext } from "./helpers/session";

const env = loadDbE2eEnv();
const SHOTS = process.env.POLL_SHOTS === "1";
const SHOT_DIR = join(process.cwd(), "docs/design/shots/2026-11-01");
const OFFICE = { lat: 37.5665, lng: 126.978 };
const PLACES = [0, 1, 2].map(fakePlaceId);
const pollEntryOn =
  FLAGS.pollEntry.source.type === "const" && FLAGS.pollEntry.source.value;
const SCHEMES = ["light", "dark"] as const;

/** 가로 넘침 없음 + (POLL_SHOTS=1이면) 캡처. 360px도 같은 자리에서 한 번 본다 */
async function check(page: Page, name: string) {
  for (const scheme of SCHEMES) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await expectNoA11yViolations(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `${name} ${scheme}`).toBeLessThanOrEqual(0);
    if (SHOTS) {
      mkdirSync(SHOT_DIR, { recursive: true });
      const width = test.info().project.name === "mobile" ? "390" : "1280";
      await page.screenshot({
        path: join(
          SHOT_DIR,
          `poll-states-live__${name}__${width}-${scheme}.png`,
        ),
      });
    }
  }
  if (test.info().project.name === "mobile") {
    const size = page.viewportSize()!;
    await page.setViewportSize({ width: 360, height: 780 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `${name} 360`).toBeLessThanOrEqual(0);
    if (SHOTS)
      await page.screenshot({
        path: join(SHOT_DIR, `poll-states-live__${name}__360-light.png`),
      });
    await page.setViewportSize(size);
  }
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
}

async function member(browser: Browser, baseURL: string, label: string) {
  const context = await browser.newContext({ ...test.info().project.use });
  const signed = await signInContext(context, env!, baseURL, label);
  const token = signed.session.access_token;
  const agreed = await rest(env!, `profiles?user_id=eq.${signed.user.id}`, {
    method: "PATCH",
    token,
    body: {
      terms_agreed_at: new Date().toISOString(),
      birth_confirmed_at: new Date().toISOString(),
      nickname: `test_${label}`,
    },
  });
  expect(agreed.status).toBe(200);
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

async function createPoll(token: string) {
  const r = await rpc<{ poll_id: string; invite_code: string }[]>(
    env!,
    "create_poll",
    {
      p_kind: "lunch",
      p_title: `test_상태${Date.now().toString(36).slice(-4)}`,
      p_closes_at: new Date(Date.now() + 30 * 60_000).toISOString(),
      p_multi: false,
      p_place_ids: PLACES,
      p_place_urls: PLACES.map((p) => `https://place.map.kakao.com/${p}`),
      p_anchor_lat: OFFICE.lat,
      p_anchor_lng: OFFICE.lng,
      p_radius_m: 600,
    },
    token,
  );
  expect(r.error).toBeNull();
  return r.data![0]!;
}

/** 서버 액션(next-action 머리가 있는 POST)만 늦추거나 끊는다 */
async function actions(page: Page, mode: "slow" | "fail" | "pass") {
  await page.unroute("**/*");
  if (mode === "pass") return;
  await page.route("**/*", async (route) => {
    if (!route.request().headers()["next-action"]) return route.continue();
    if (mode === "fail") return route.abort();
    await new Promise((r) => setTimeout(r, 8_000));
    return route.continue().catch(() => undefined);
  });
}

test.describe("투표 화면 4상태와 다크 (T7.34)", () => {
  test.skip(!env, "RUN_DB_E2E=1과 Supabase 값(.env.local)이 있어야 실행합니다");
  test.skip(!pollEntryOn, "flags.pollEntry가 꺼져 있습니다(T7.35에서 해제)");

  test("투표 탭: 로딩, 오류, 빈 상태, 오프라인", async ({
    browser,
    baseURL,
  }) => {
    test.setTimeout(120_000);
    const u = await member(browser, baseURL!, "ps_tab");
    try {
      const p = u.page;
      await actions(p, "slow");
      await p.goto("/poll");
      await expect(p.getByRole("status").first()).toBeVisible();
      await check(p, "tab-loading");

      await actions(p, "fail");
      await p.goto("/poll");
      await expect(p.getByRole("button", { name: /다시/ }).first()).toBeVisible(
        { timeout: 15_000 },
      );
      await check(p, "tab-error");

      await actions(p, "pass");
      await p.goto("/poll");
      await expect(p.getByRole("main")).toContainText(/투표/, {
        timeout: 15_000,
      });
      await check(p, "tab-empty");

      // 오프라인: 데이터를 받기 전에 끊기면 오프라인 안내
      await actions(p, "slow");
      await p.goto("/poll");
      await u.context.setOffline(true);
      await expect(p.getByText("인터넷", { exact: false }).first()).toBeVisible(
        { timeout: 10_000 },
      );
      await check(p, "tab-offline");
      await u.context.setOffline(false);
    } finally {
      await u.context.close().catch(() => undefined);
      await u.cleanup();
    }
  });

  test("투표방: 로딩, 오류, 빈 득표, 오프라인, 결과 공유 시트", async ({
    browser,
    baseURL,
  }) => {
    test.setTimeout(150_000);
    const u = await member(browser, baseURL!, "ps_room");
    try {
      const p = u.page;
      const poll = await createPoll(u.token);
      const room = `/poll/${poll.invite_code}`;

      await actions(p, "slow");
      await p.goto(room);
      await expect(p.getByRole("status").first()).toBeVisible();
      await check(p, "room-loading");

      await actions(p, "fail");
      await p.goto(room);
      await expect(
        p.getByRole("heading", { name: "투표방을 불러오지 못했습니다" }),
      ).toBeVisible({ timeout: 15_000 });
      await check(p, "room-error");

      // 빈 득표(아무도 안 고름)
      await actions(p, "pass");
      await p.goto(room);
      const rows = p.getByRole("radiogroup").getByRole("radio");
      await expect(rows.first()).toBeVisible({ timeout: 20_000 });
      await expect(p.getByText("1명 중 0명 골랐습니다")).toBeVisible();
      await check(p, "room-empty");

      // 오프라인: 받은 득표는 남고, 투표는 꺼지고, 실시간 표시는 사라진다
      await u.context.setOffline(true);
      await expect(
        p.getByText("마지막으로 받은 득표입니다.", { exact: false }),
      ).toBeVisible({ timeout: 10_000 });
      await expect(p.getByText("실시간", { exact: true })).toHaveCount(0);
      const vote = p.getByRole("button", {
        name: "연결되면 투표할 수 있습니다",
      });
      await expect(vote).toBeVisible();
      await check(p, "room-offline");
      await u.context.setOffline(false);

      // 결과와 결과 공유 시트(POLL-09S)
      await p.reload();
      await expect(rows.first()).toBeVisible({ timeout: 20_000 });
      await rows.first().click();
      await p.getByRole("button", { name: "투표하기" }).click();
      await expect(
        p.getByRole("button", { name: "선택 바꾸기" }),
      ).toBeVisible();
      // 화면은 낙관적으로 먼저 바뀌므로 서버에 표가 저장된 뒤 마감한다(마감이 먼저면 "정해진 곳이 없습니다")
      await expect
        .poll(async () => {
          const r = await rpc<{ candidates: { votes: number }[] }>(
            env!,
            "get_poll",
            { p_poll_id: poll.poll_id },
            u.token,
          );
          return (r.data?.candidates ?? []).reduce((a, c) => a + c.votes, 0);
        })
        .toBe(1);
      await rpc(env!, "close_poll_now", { p_poll_id: poll.poll_id }, u.token);
      await p.reload();
      await expect(
        p.getByRole("heading", { name: "오늘 점심은 여기로 정했어요." }),
      ).toBeVisible({ timeout: 15_000 });
      await check(p, "room-result");
      await p.getByRole("button", { name: "결과 공유" }).click();
      await expect(p.getByRole("dialog")).toBeVisible({ timeout: 15_000 });
      await expect(
        p
          .getByRole("dialog")
          .getByRole("button", { name: "카카오톡으로 보내기" }),
      ).toBeVisible({ timeout: 15_000 });
      await check(p, "share-sheet");
    } finally {
      await u.context.close().catch(() => undefined);
      await u.cleanup();
    }
  });
});
