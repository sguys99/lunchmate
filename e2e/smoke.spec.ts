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
  // og:title, twitter:title은 사이트 이름(D-29). 이미지 안 제목과 겹치지 않게
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "런치메이트",
  );
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    "content",
    "런치메이트",
  );
  await expect(page.locator('meta[name="theme-color"]').first()).toBeAttached();
});

test("랜딩 OG 이미지, Twitter 카드, JSON-LD (T10.11, APP-04)", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const og = page.locator('meta[property="og:image"]');
  await expect(og).toHaveAttribute("content", /\/opengraph-image(\?|$)/);
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
    "content",
    "1200",
  );
  await expect(
    page.locator('meta[property="og:image:height"]'),
  ).toHaveAttribute("content", "600");
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
    "content",
    /\S/,
  );
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
    "content",
    "ko_KR",
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

  // 이미지가 실제로 PNG로 나온다(주소의 해시는 무시하고 경로만)
  const src = new URL((await og.getAttribute("content")) ?? "");
  const img = await request.get(src.pathname + src.search);
  expect(img.status()).toBe(200);
  expect(img.headers()["content-type"]).toContain("image/png");

  // JSON-LD: WebApplication 하나, 가격과 평점 같은 값 없음
  const scripts = page.locator('script[type="application/ld+json"]');
  await expect(scripts).toHaveCount(1);
  const ld = JSON.parse((await scripts.textContent()) ?? "{}") as Record<
    string,
    unknown
  >;
  expect(ld["@type"]).toBe("WebApplication");
  expect(ld.name).toBe("런치메이트");
  expect(ld.url).toMatch(/^https?:\/\/[^/]+\/$/);
  for (const k of ["offers", "aggregateRating", "isAccessibleForFree"]) {
    expect(ld, k).not.toHaveProperty(k);
  }
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
