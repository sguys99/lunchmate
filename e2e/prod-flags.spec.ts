// 프로덕션 플래그 스모크 (T9.2, D-22, 2026-11-02). auth-off.spec.ts(로그인이 닫힌 프로덕션 확인)를 대신한다.
// 프로덕션 빌드에서 로그인, 투표, 관리자, 베타 의견이 열리고(productionOff 제거), 디자인 랩은 여전히 404인지 본다.
// 비로그인으로만 본다(DB에 쓰지 않는다). 로그인 뒤 흐름은 test:e2e:onboarding, poll, admin(RUN_DB_E2E)과 실기기 S1~S4(T9.0)가 맡는다.
//
// 실행: 프로덕션 빌드 서버가 필요하다(flags.designLab은 VERCEL_ENV=production에서 꺼진다, src/lib/flags.ts).
//   VERCEL_ENV=production pnpm build && VERCEL_ENV=production pnpm start --port 3300
//   PLAYWRIGHT_BASE_URL=http://localhost:3300 pnpm test:e2e:prod-flags
// 서버를 따로 띄우지 않으면 playwright.config의 webServer가 VERCEL_ENV=production으로 dev 서버를 띄운다.
// 기본 pnpm test:e2e에서는 건너뛴다.
import { expect, test } from "@playwright/test";

test.skip(
  process.env.E2E_PROD_FLAGS !== "1",
  "프로덕션 조합 서버에서만(pnpm test:e2e:prod-flags)",
);

test("/login: 로그인 화면이 열린다(404 아님), noindex", async ({ page }) => {
  const res = await page.goto("/login");
  expect(res?.status()).toBe(200);
  await expect(
    page.locator('form[action="/auth/sign-in"]').first(),
  ).toBeAttached();
  await expect(
    page.getByRole("button", { name: "Google 계정으로 로그인" }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

test("/beta: 환영 페이지가 열리고 noindex", async ({ page }) => {
  const res = await page.goto("/beta");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "오늘 뭐 먹지를 10초 안에 정해 드립니다.",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});

for (const path of ["/poll", "/poll/party", "/me", "/admin"]) {
  test(`${path}: 비로그인은 로그인 화면으로 보낸다(곧 열립니다 안내 아님)`, async ({
    page,
  }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(
      new RegExp(`/login\\?next=${encodeURIComponent(path)}$`),
    );
    await expect(
      page.getByRole("button", { name: "Google 계정으로 로그인" }),
    ).toBeVisible();
    await expect(page.getByText("곧 열립니다")).toHaveCount(0);
  });
}

for (const path of ["/terms", "/privacy", "/location"]) {
  test(`${path}: 약관 최종본이 열리고 색인을 막지 않는다 (T10.3)`, async ({
    page,
  }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(
      page.getByText("2026년 11월 16일 시행", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("확정 전 초안")).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    // 메타(T10.11): 절대 canonical, 설명, og:image(랜딩 OG)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`^https?://[^/]+${path}$`),
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /2026년 11월 16일부터 시행합니다\.$/,
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/opengraph-image$/,
    );
  });
}

test("/sitemap.xml: 랜딩과 약관 3종", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();
  for (const path of ["/terms", "/privacy", "/location"]) {
    expect(xml, path).toMatch(new RegExp(`<loc>[^<]*${path}</loc>`));
  }
  expect(xml).not.toMatch(/\/beta<\/loc>/);
});

test("/design-lab: 프로덕션에서는 404", async ({ page }) => {
  for (const path of ["/design-lab", "/design-lab/beta/a"]) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(404);
  }
});

test("robots.txt: 로그인, 투표, 관리자는 막고 /beta는 막지 않는다(noindex 메타를 읽게)", async ({
  request,
}) => {
  const robots = await (await request.get("/robots.txt")).text();
  for (const p of ["/login", "/poll", "/admin", "/design-lab"]) {
    expect(robots).toContain(`Disallow: ${p}`);
  }
  expect(robots).not.toContain("Disallow: /beta");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain("/beta");
  expect(sitemap).not.toContain("/login");
});
