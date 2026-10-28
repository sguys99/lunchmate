// axe 접근성 검사 (T2.17). WCAG 2.1 AA + best-practice, 위반 0 (helpers/axe.ts).
// 실행: pnpm test:e2e:a11y (디자인 랩 켜고 mobile, desktop 두 뷰포트). pnpm test:e2e에서는 갤러리와 PoC를 건너뛴다.
import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./helpers/axe";
import { designLabOn, openGallery, type GalleryTheme } from "./helpers/gallery";

for (const theme of ["light", "dark"] as GalleryTheme[]) {
  test.describe(`테마 ${theme}`, () => {
    test.use({ colorScheme: theme, reducedMotion: "reduce" });

    test("컴포넌트 갤러리", async ({ page }) => {
      test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
      await openGallery(page, theme);
      await expectNoA11yViolations(page);
    });

    // 앱 탭 화면 (appShell 플래그는 개발 환경에서 켜져 있다)
    for (const path of ["/today", "/map", "/poll", "/me"]) {
      test(`앱 탭 ${path}`, async ({ page }) => {
        const res = await page.goto(path);
        expect(res?.status()).toBe(200);
        await expect(page.getByRole("navigation").first()).toBeVisible();
        await expectNoA11yViolations(page);
      });
    }

    test("404 (셸 밖)", async ({ page }) => {
      const res = await page.goto("/__a11y-not-found");
      expect(res?.status()).toBe(404);
      await expectNoA11yViolations(page);
    });

    test("404 (셸 안)", async ({ page }) => {
      const res = await page.goto("/today/__a11y-not-found");
      expect(res?.status()).toBe(404);
      await expectNoA11yViolations(page);
    });

    test("PoC 목록", async ({ page }) => {
      test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
      const res = await page.goto("/design-lab/poc");
      expect(res?.status()).toBe(200);
      await expectNoA11yViolations(page);
    });
  });
}
