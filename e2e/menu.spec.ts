// 메뉴 제보 E2E (T10.16d, T10.16e, PRD MENU-01~04, AC-MENU-3, AC-MENU-4, D-35 조합 A + C).
//
// 실행
//   PLAYWRIGHT_BASE_URL=http://localhost:3102 pnpm test:e2e:menu
//   (RUN_DB_E2E=1. .env.local의 Supabase 값이 있을 때만 돈다. MENU_SHOTS=1이면 캡처를 남긴다. menuReports 플래그는 pnpm dev에서만 켜진다)
// - 클라우드 개발 DB에 test_ 사용자를 만들고 끝나면 지운다(cascade로 메뉴 제보도 지워진다).
// - 카카오 SDK는 가짜(음식점 45곳, "테스트식당{i+1}" = place_id 9100000+i). 첫 카드가 어느 곳이 되어도 대표 메뉴가 보이게
//   제보용 사용자 5명이 45곳 모두에 "돼지국밥"을 2건씩 남긴다(사용자당 하루 20건 안: 18건씩).
// - 화면과 단언은 사용자 세션(RLS 적용)으로 한다(CLAUDE.md 7.1).
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  adminPatch,
  createTestUser,
  deleteAuthUser,
  newRunId,
  rest,
  type TestUser,
} from "../src/lib/supabase/rls/harness";
import { expectNoA11yViolations } from "./helpers/axe";
import { fakePlaceId, mockRecommendSdks } from "./helpers/kakao-places-fake";
import { loadDbE2eEnv, readOwn, signInContext } from "./helpers/session";

const env = loadDbE2eEnv();
const OFFICE = { lat: 37.5665, lng: 126.978 };
const SHOTS = process.env.MENU_SHOTS === "1";
const SHOT_DIR = join(process.cwd(), "docs/design/shots/2026-11-03");
const PLACES = 45;

test.use({ colorScheme: process.env.MENU_DARK === "1" ? "dark" : "light" });

function kstDate(days: number): string {
  const d = new Date(Date.now() + 9 * 3_600_000 + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

async function shot(page: Page, name: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  if (!SHOTS) return;
  mkdirSync(SHOT_DIR, { recursive: true });
  const w = test.info().project.name === "mobile" ? "390" : "1280";
  const scheme = await page.evaluate(() =>
    matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );
  await page.waitForTimeout(450);
  await page.screenshot({ path: join(SHOT_DIR, `menu-impl-${name}__${w}__${scheme}.png`) });
}

/** 제보용 사용자 5명이 45곳에 2건씩(곳 i는 사용자 i%5와 (i+1)%5) */
async function seedMenus(): Promise<TestUser[]> {
  const runId = newRunId();
  const users = await Promise.all([0, 1, 2, 3, 4].map((k) => createTestUser(env!, runId, `m${k}`)));
  const jobs: Promise<unknown>[] = [];
  for (let i = 0; i < PLACES; i++) {
    const placeId = fakePlaceId(i);
    for (const k of [i % 5, (i + 1) % 5]) {
      const u = users[k]!;
      jobs.push(
        rest(env!, "menu_reports", {
          method: "POST",
          token: u.token,
          body: {
            user_id: u.id,
            place_id: placeId,
            place_url: `https://place.map.kakao.com/${placeId}`,
            menu_name: "돼지국밥",
            price_krw: k % 2 === 0 ? 9000 : 10000,
            source: "detail",
          },
        }).then((r) => expect(r.error, `${placeId}`).toBeNull()),
      );
    }
  }
  await Promise.all(jobs);
  return users;
}

async function setup(page: Page, context: BrowserContext, baseURL: string, label: string, yesterdayVisit: boolean) {
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
  await rest(env!, `profiles?user_id=eq.${userId}`, {
    method: "PATCH",
    token,
    body: {
      terms_agreed_at: new Date().toISOString(),
      birth_confirmed_at: new Date().toISOString(),
      nickname: `test_${label}`,
    },
  });
  await rest(env!, "offices", {
    method: "POST",
    token,
    body: { user_id: userId, name: "회사", lat: OFFICE.lat, lng: OFFICE.lng },
  });
  let visitId: string | null = null;
  if (yesterdayVisit) {
    const placeId = fakePlaceId(7);
    const v = await rest<{ id: string }[]>(env!, "visits", {
      method: "POST",
      token,
      body: { user_id: userId, place_id: placeId, place_url: `https://place.map.kakao.com/${placeId}`, meal: "lunch", source: "rec" },
    });
    visitId = v.data![0]!.id;
    const y = kstDate(-1);
    await adminPatch(env!, "visits", `id=eq.${visitId}`, { visited_on: y, created_at: `${y}T03:10:00Z` });
  }
  return { token, userId, visitId, cleanup: signed.cleanup };
}

test.describe("메뉴 제보", () => {
  test.skip(!env, "RUN_DB_E2E=1과 Supabase 값(.env.local)이 있어야 실행합니다");
  test.describe.configure({ mode: "serial" });

  let seeders: TestUser[] = [];
  test.beforeAll(async () => {
    seeders = await seedMenus();
  });
  test.afterAll(async () => {
    await Promise.all(seeders.map((u) => deleteAuthUser(env!, u.id)));
  });

  test("MENU-04: 큰 카드 가운데 칸에 대표 메뉴와 가격, MENU-03: 상세 메뉴판과 한 줄 더하기", async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await setup(page, context, baseURL!, "menu1", false);
    try {
      await page.goto("/today");
      const hero = page.locator(".lm-today-deck article").first();
      await expect(hero.locator("h2")).toBeVisible({ timeout: 20_000 });
      // 가운데 칸: 라벨이 메뉴 이름, 숫자는 중앙값. 제보 짝(사용자 i%5, (i+1)%5)에 따라 9,500(9천과 1만) 또는 9,000(둘 다 9천)
      await expect(hero.locator("dt", { hasText: "돼지국밥" })).toBeVisible({ timeout: 15_000 });
      await expect(hero.getByText(/^9,[05]00$/)).toBeVisible();
      await shot(page, "home");
      const heroName = (await hero.locator("h2").innerText()).trim();

      await page.getByRole("button", { name: `${heroName} 상세` }).click();
      const detail = page.getByRole("dialog");
      const board = detail.getByRole("region", { name: "메뉴판" });
      await expect(board).toBeVisible({ timeout: 15_000 });
      await expect(board.getByText("제보 2건 기준")).toBeVisible();
      await expect(board.getByText(/^9,[05]00원$/)).toBeVisible();
      await board.scrollIntoViewIfNeeded();
      await shot(page, "detail");
      await expectNoA11yViolations(page, { include: '[role="dialog"]' });

      // 한 줄 더하기: 이름 칸은 빈 칸에서 시작(AC-MENU-3), 쓰는 동안 기존 메뉴 제안
      await board.getByRole("button", { name: /메뉴판 한 줄 더하기$/ }).click();
      const input = board.getByLabel("메뉴 이름");
      await expect(input).toHaveValue("");
      await input.fill("돼지");
      await expect(board.getByRole("button", { name: "돼지국밥로 쓰기" })).toBeVisible();
      await input.fill("콩나물국밥");
      await board.getByRole("button", { name: "500원 내리기" }).click();
      await shot(page, "detail-add");
      await board.getByRole("button", { name: "알려주기" }).click();
      await expect(board.getByText("메뉴를 알려 주셔서 고맙습니다.")).toBeVisible();
      await expect(board.getByText("콩나물국밥")).toBeVisible({ timeout: 15_000 });

      const mine = await readOwn<{ menu_name: string; source: string; review_id: string | null }[]>(
        env!,
        s.token,
        `menu_reports?select=menu_name,source,review_id`,
      );
      expect(mine).toEqual([{ menu_name: "콩나물국밥", source: "detail", review_id: null }]);
    } finally {
      await s.cleanup();
    }
  });

  test("MENU-01, AC-MENU-4: 피드백 시트에서 칩 한 번 + 저장으로 메뉴와 가격이 후기와 함께 남는다", async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await setup(page, context, baseURL!, "menu2", true);
    try {
      await page.goto("/today");
      const band = page.getByRole("region", { name: "어제 식사" });
      await expect(band.getByRole("heading", { level: 2 })).toBeVisible({ timeout: 20_000 });
      await band.getByRole("button", { name: "좋았어요" }).click();
      await band.getByRole("button", { name: "가격, 태그, 한 줄 후기 남기기" }).click();
      const sheet = page.getByRole("dialog");
      await expect(sheet.getByRole("heading", { name: "뭐 드셨어요?" })).toBeVisible();
      const chip = sheet.getByRole("button", { name: /^돼지국밥/ });
      await expect(chip).toBeVisible({ timeout: 15_000 });
      // 탭 1: 칩(가격이 그 메뉴 값으로), 탭 2: 저장
      await chip.click();
      await expect(sheet.getByText("9,500", { exact: true })).toBeVisible();
      await shot(page, "feedback");
      await expectNoA11yViolations(page, { include: '[role="dialog"]' });
      await sheet.getByRole("button", { name: "남기기" }).click();
      await expect(sheet).toHaveCount(0);

      await expect
        .poll(
          () =>
            readOwn<{ menu_name: string; price_krw: number; source: string; has_review: boolean }[]>(
              env!,
              s.token,
              `menu_reports?select=menu_name,price_krw,source,review_id`,
            ).then((rows) =>
              rows.map((r) => ({
                menu_name: r.menu_name,
                price_krw: r.price_krw,
                source: r.source,
                has_review: (r as unknown as { review_id: string | null }).review_id !== null,
              })),
            ),
          { timeout: 15_000 },
        )
        .toEqual([{ menu_name: "돼지국밥", price_krw: 9500, source: "feedback", has_review: true }]);
    } finally {
      await s.cleanup();
    }
  });
});
