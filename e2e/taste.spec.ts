// 홈 취향 띠 E2E (T9.17, D-39): 설정을 건너뛴 사용자(못 먹는 음식, 좋아하는 음식 없음)에게 가입 7일 안 띠가 보이고,
// 시트에서 못 먹는 음식 → 좋아하는 음식을 저장하면 띠가 사라지고 DB에 남는다. 닫기는 닫은 시각을 남긴다.
// RUN_DB_E2E=1일 때만 동작한다(클라우드 개발 DB, test_ 계정, 끝나면 정리).
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { rest } from "../src/lib/supabase/rls/harness";
import { expectNoA11yViolations } from "./helpers/axe";
import { mockRecommendSdks } from "./helpers/kakao-places-fake";
import { loadDbE2eEnv, readOwn, signInContext } from "./helpers/session";

const env = loadDbE2eEnv();
const OFFICE = { lat: 37.5665, lng: 126.978 };
/** TASTE_SHOTS=1이면 구현 캡처를 남긴다(TASTE_DARK=1이면 다크) */
const SHOTS = process.env.TASTE_SHOTS === "1";
const SHOT_DIR = join(process.cwd(), "docs/design/shots/t9-17-impl");
test.use({ colorScheme: process.env.TASTE_DARK === "1" ? "dark" : "light" });

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  mkdirSync(SHOT_DIR, { recursive: true });
  const size = test.info().project.name === "mobile" ? "390" : "1280";
  const scheme = process.env.TASTE_DARK === "1" ? "dark" : "light";
  await page.waitForTimeout(450);
  await page.screenshot({
    path: join(SHOT_DIR, `taste-impl__${name}__${size}__${scheme}.png`),
  });
}

/** 로그인 사용자 + 약관 + 사무실. 못 먹는 음식과 좋아하는 음식은 비어 있다(온보딩을 건너뛴 상태) */
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
  const office = await rest(env!, "offices", {
    method: "POST",
    token,
    body: { user_id: userId, name: "회사", lat: OFFICE.lat, lng: OFFICE.lng },
  });
  expect(office.status).toBe(201);
  return { token, cleanup: signed.cleanup };
}

const tasteBand = (page: Page) =>
  page.getByRole("region", { name: "못 먹는 음식이 있나요?" });

test.describe("홈 취향 띠 (T9.17)", () => {
  test.skip(!env, "RUN_DB_E2E=1과 Supabase 키가 있어야 합니다");

  test("알려 주기: 못 먹는 음식 → 좋아하는 음식 저장 뒤 띠가 사라진다", async ({
    page,
    context,
    baseURL,
  }) => {
    const { token, cleanup } = await setup(page, context, baseURL!, "taste1");
    try {
      await page.goto("/today");
      await expect(tasteBand(page)).toBeVisible({ timeout: 15_000 });
      await shot(page, "band");
      await tasteBand(page).getByRole("button", { name: "알려 주기" }).click();

      const sheet = page.getByRole("dialog");
      await expect(
        sheet.getByRole("heading", { name: "못 먹는 음식이 있나요?" }),
      ).toBeVisible();
      await sheet.getByRole("button", { name: "회", exact: true }).click();
      await shot(page, "sheet-avoid");
      await sheet.getByRole("button", { name: "다음" }).click();
      await expect(
        sheet.getByRole("heading", { name: "자주 끌리는 음식을 골라 주세요" }),
      ).toBeVisible();
      await sheet.getByRole("button", { name: "국밥", exact: true }).click();
      await shot(page, "sheet-liked");
      await page.waitForTimeout(400);
      await expectNoA11yViolations(page, { include: '[role="dialog"]' });
      await sheet.getByRole("button", { name: "저장" }).click();

      await expect(sheet).toBeHidden();
      await expect(tasteBand(page)).toBeHidden();
      const avoid = await readOwn<{ kind: string; value: string }[]>(
        env!,
        token,
        "avoid_rules?select=kind,value",
      );
      expect(avoid).toEqual([{ kind: "food", value: "회" }]);
      const prefs = await readOwn<{ liked_categories: string[] }[]>(
        env!,
        token,
        "preferences?select=liked_categories",
      );
      expect(prefs[0]?.liked_categories).toEqual(["gukbap"]);

      // 다시 와도 띠가 없다(기피와 좋아하는 음식이 생김)
      await page.reload();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForTimeout(1500);
      await expect(tasteBand(page)).toHaveCount(0);
    } finally {
      await cleanup();
    }
  });

  test("닫기: 띠가 바로 사라지고 닫은 시각이 남는다", async ({
    page,
    context,
    baseURL,
  }) => {
    const { token, cleanup } = await setup(page, context, baseURL!, "taste2");
    try {
      await page.goto("/today");
      await expect(tasteBand(page)).toBeVisible({ timeout: 15_000 });
      await tasteBand(page).getByRole("button", { name: "닫기" }).click();
      await expect(tasteBand(page)).toHaveCount(0);
      await expect
        .poll(async () => {
          const rows = await readOwn<
            { taste_prompt_dismissed_at: string | null }[]
          >(env!, token, "preferences?select=taste_prompt_dismissed_at");
          return rows[0]?.taste_prompt_dismissed_at ?? null;
        })
        .not.toBeNull();
      await page.reload();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForTimeout(1500);
      await expect(tasteBand(page)).toHaveCount(0);
    } finally {
      await cleanup();
    }
  });
});
