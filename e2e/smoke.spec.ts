import { expect, test } from "@playwright/test";

test("랜딩이 뜨고 제목과 메타가 있다 (T4.28, APP-04)", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "오늘 점심, 세 곳이면 충분해요",
    }),
  ).toBeVisible();
  await expect(page).toHaveTitle("런치메이트");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /^https?:\/\/[^/]+\/?$/,
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "오늘 뭐 먹지, 10초 안에 정합니다",
  );
  await expect(page.locator('meta[name="theme-color"]').first()).toBeAttached();
});

test("robots.txt와 sitemap.xml (T4.28)", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /design-lab");
  expect(robots).toContain("Disallow: /poll");
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("<loc>");
  expect(sitemap).not.toContain("/design-lab");
});
