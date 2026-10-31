// T6.2 나 탭과 기록 시안 axe 검사. e2e/a11y.spec.ts와 같은 규칙(WCAG 2.1 AA + best-practice, 위반 0).
// 실행: NEXT_PUBLIC_DESIGN_LAB=true PLAYWRIGHT_BASE_URL=http://localhost:3102 pnpm exec playwright test e2e/a11y-g6-me.spec.ts --project=mobile --project=desktop
// T6.4 선택 뒤 고른 안만 a11y.spec.ts로 옮기고 이 파일은 지운다.
import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./helpers/axe";
import { markWebFontsSeen } from "./helpers/fonts";
import { designLabOn, type GalleryTheme } from "./helpers/gallery";

async function openLabRoute(page: Page, path: string) {
  await markWebFontsSeen(page);
  const res = await page.goto(path);
  expect(res?.status()).toBe(200);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}

const COMMON = [
  "",
  "?state=loading",
  "?state=empty",
  "?state=error",
  "?state=offline",
  "?names=fail",
  "?auth=off",
];
const VIEWS: Record<string, string[]> = {
  a: ["?view=places", "?view=reviews", "?view=settings", "?more=on"],
  b: ["?view=favorites", "?view=blocklist", "?view=reviews", "?day=26"],
  c: ["?view=history", "?view=favorites", "?view=blocklist", "?view=reviews"],
};

for (const theme of ["light", "dark"] as GalleryTheme[]) {
  test.describe(`테마 ${theme}`, () => {
    test.use({ colorScheme: theme, reducedMotion: "reduce" });
    for (const id of ["a", "b", "c"]) {
      for (const query of [...COMMON, ...VIEWS[id]!]) {
        test(`나 탭 ${id}${query}`, async ({ page }) => {
          test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
          await openLabRoute(page, `/design-lab/me/${id}${query}`);
          await expectNoA11yViolations(page);
        });
      }
    }
  });
}
