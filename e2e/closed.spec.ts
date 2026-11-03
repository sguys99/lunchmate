// 문 닫힌 식당 제보 E2E (T9.18, D-40): 큰 카드 더 보기 → "문이 닫혀 있어요" → 카드가 다른 곳으로 바뀌고
// 이번 끼니 "오늘만 쉬어요" 제보가 남는다. 토스트 되돌리기는 카드를 되돌리고 제보를 지운다(2분 안).
// RUN_DB_E2E=1일 때만 동작한다(클라우드 개발 DB, test_ 계정, 끝나면 정리).
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { rest } from "../src/lib/supabase/rls/harness";
import { mockRecommendSdks } from "./helpers/kakao-places-fake";
import { loadDbE2eEnv, readOwn, signInContext } from "./helpers/session";

const env = loadDbE2eEnv();
const OFFICE = { lat: 37.5665, lng: 126.978 };
/** CLOSED_SHOTS=1이면 구현 캡처(CLOSED_DARK=1이면 다크) */
const SHOTS = process.env.CLOSED_SHOTS === "1";
const SHOT_DIR = join(process.cwd(), "docs/design/shots/t9-18-impl");
test.use({ colorScheme: process.env.CLOSED_DARK === "1" ? "dark" : "light" });

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  mkdirSync(SHOT_DIR, { recursive: true });
  const size = test.info().project.name === "mobile" ? "390" : "1280";
  const scheme = process.env.CLOSED_DARK === "1" ? "dark" : "light";
  await page.waitForTimeout(450);
  await page.screenshot({
    path: join(SHOT_DIR, `closed-impl__${name}__${size}__${scheme}.png`),
  });
}

async function setup(
  page: Page,
  context: BrowserContext,
  baseURL: string,
  label: string,
) {
  await mockRecommendSdks(page);
  await page.addInitScript(() => {
    addEventListener("DOMContentLoaded", () => {
      const st = document.createElement("style");
      st.textContent = "nextjs-portal{display:none!important}";
      document.head.append(st);
    });
  });
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
  // 설정을 마친 사용자(취향 띠 없이 홈만 보이게)
  await rest(env!, `preferences?user_id=eq.${userId}`, {
    method: "PATCH",
    token,
    body: { taste_prompt_dismissed_at: new Date().toISOString() },
  });
  const office = await rest(env!, "offices", {
    method: "POST",
    token,
    body: { user_id: userId, name: "회사", lat: OFFICE.lat, lng: OFFICE.lng },
  });
  expect(office.status).toBe(201);
  return { token, cleanup: signed.cleanup };
}

async function heroName(page: Page): Promise<string> {
  const deck = page.locator(".lm-today-deck");
  await expect(deck.locator("article h2")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-slot="loading-region"]')).toHaveCount(0);
  return (await deck.locator("article h2").innerText()).trim();
}

type Row = { place_id: string; kind: string; detail: { closed?: string } };

test.describe("문 닫힌 식당 제보 (T9.18)", () => {
  test.skip(!env, "RUN_DB_E2E=1과 Supabase 키가 있어야 합니다");

  test("문이 닫혀 있어요: 카드가 바뀌고 제보가 남으며, 되돌리기는 둘 다 되돌린다", async ({
    page,
    context,
    baseURL,
  }) => {
    const { token, cleanup } = await setup(page, context, baseURL!, "closed1");
    try {
      await page.goto("/today");
      const first = await heroName(page);
      await page
        .getByRole("button", { name: `${first} 다른 행동 더 보기` })
        .click();
      const closed = page.getByRole("menuitem", { name: "문이 닫혀 있어요" });
      await expect(closed).toBeVisible();
      await expect(
        page.getByRole("menuitem", { name: /영업시간과 메뉴 보기/ }),
      ).toBeVisible();
      await shot(page, "menu");
      await closed.click();

      await expect(
        page.getByText("닫혀 있다고 알렸습니다. 다른 곳을 골랐습니다."),
      ).toBeVisible();
      await expect
        .poll(() => heroName(page), { timeout: 10_000 })
        .not.toBe(first);
      await shot(page, "done");
      await expect
        .poll(() =>
          readOwn<Row[]>(
            env!,
            token,
            "place_reports?select=place_id,kind,detail",
          ),
        )
        .toEqual([
          expect.objectContaining({
            kind: "closed",
            detail: { closed: "today" },
          }),
        ]);

      await page.getByRole("button", { name: "되돌리기" }).click();
      await expect.poll(() => heroName(page), { timeout: 10_000 }).toBe(first);
      await expect
        .poll(() =>
          readOwn<Row[]>(env!, token, "place_reports?select=place_id"),
        )
        .toEqual([]);
    } finally {
      await cleanup();
    }
  });
});
