// 프로덕션 조합(appShell 켜짐 + auth 꺼짐) 둘러보기 (5단계 마무리, 2026-10-31).
// 로그인이 닫힌 환경에서 하단 탭 4개가 404나 자리 문구로 가지 않고, 로그인 유도 행동이 "곧 열립니다" 토스트로 끝나는지 본다.
//
// 실행: auth가 꺼진 서버가 필요하다(flags.auth는 VERCEL_ENV=production에서 꺼진다, src/lib/flags.ts).
//   VERCEL_ENV=production pnpm build && VERCEL_ENV=production pnpm start --port 3300
//   PLAYWRIGHT_BASE_URL=http://localhost:3300 pnpm test:e2e:auth-off
// 서버를 따로 띄우지 않으면 playwright.config의 webServer가 VERCEL_ENV=production으로 dev 서버를 띄운다.
// 기본 pnpm test:e2e(auth 켜짐)에서는 건너뛴다.
import { expect, test } from "@playwright/test";
import { mockRecommendSdks } from "./helpers/kakao-places-fake";

test.skip(
  process.env.E2E_AUTH_OFF !== "1",
  "auth가 꺼진 서버에서만(pnpm test:e2e:auth-off)",
);

const HERE = { latitude: 37.5701234, longitude: 126.9812345 };
const SOON_TOAST = "로그인은 곧 열립니다";

test("랜딩: 체험만 있고 로그인 버튼이 없다", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "추천 먼저 받아 보기" }),
  ).toHaveAttribute("href", /\/today/);
  await expect(page.locator('form[action="/auth/sign-in"]')).toHaveCount(0);
  expect((await page.request.get("/login")).status()).toBe(404);
});

for (const [path, title] of [
  ["/poll", "투표는 곧 열립니다"],
  ["/me", "로그인은 곧 열립니다"],
  ["/me/offices/new", "로그인은 곧 열립니다"],
  ["/me/avoid", "로그인은 곧 열립니다"],
] as const) {
  test(`${path}: 404 대신 곧 열립니다 안내`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 2, name: title }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "오늘 추천 보기" }),
    ).toHaveAttribute("href", "/today");
    // 하단 탭(데스크톱은 옆 내비)은 4개 그대로
    await expect(
      page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link"),
    ).toHaveCount(4);
  });
}

test.describe("둘러보기 행동", () => {
  test.use({ geolocation: HERE, permissions: ["geolocation"] });
  test.beforeEach(async ({ page }) => {
    await mockRecommendSdks(page);
  });

  test("오늘: 즐겨찾기를 누르면 로그인 시트 대신 곧 열립니다 토스트", async ({
    page,
  }) => {
    await page.goto("/today");
    const deck = page.locator(".lm-today-deck");
    const hero = deck.locator("article h2");
    await expect(hero).toBeVisible({ timeout: 20_000 });
    const name = (await hero.innerText()).trim();
    await page
      .getByRole("button", { name: `${name} 다른 행동 더 보기` })
      .click();
    await page.getByRole("menuitem", { name: "즐겨찾기에 담기" }).click();
    await expect(page.getByText(SOON_TOAST)).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/\/today/);
  });

  test("지도: 즐겨찾기 칩이 없다", async ({ page }) => {
    await page.goto("/map");
    const filters = page.getByRole("group", { name: "식당 거르기" });
    await expect(filters).toBeVisible({ timeout: 20_000 });
    await expect(
      filters.getByRole("button", { name: "도보 5분 안" }),
    ).toBeVisible();
    await expect(filters.getByRole("button", { name: "즐겨찾기" })).toHaveCount(
      0,
    );
  });
});
