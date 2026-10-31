// T6.1 식후 피드백 시안 axe 검사 (e2e/a11y.spec.ts와 같은 방식). 게이트(T6.4) 뒤 고른 안만 a11y.spec.ts로 옮긴다.
// 실행: NEXT_PUBLIC_DESIGN_LAB=true PLAYWRIGHT_BASE_URL=<dev> pnpm exec playwright test e2e/a11y-g6-feedback.spec.ts --project=mobile --project=desktop
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

const QUERIES = [
  "",
  "?flow=thanks",
  "?flow=compose",
  "?flow=saved",
  "?flow=later",
  "?state=loading",
  "?state=empty",
  "?state=error",
  "?state=error&fail=name",
  "?state=offline",
  "?view=detail",
  "?view=detail&mine=on",
  "?view=detail&flow=compose",
  "?view=detail&mine=on&flow=edit",
  "?view=detail&mine=on&flow=delete",
  "?view=detail&state=empty",
  "?view=detail&state=offline&mine=on",
];

for (const theme of ["light", "dark"] as GalleryTheme[]) {
  test.describe(`테마 ${theme}`, () => {
    test.use({ colorScheme: theme, reducedMotion: "reduce" });

    for (const id of ["a", "b", "c"]) {
      for (const query of QUERIES) {
        test(`식후 피드백 ${id}${query}`, async ({ page }) => {
          test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
          await openLabRoute(page, `/design-lab/feedback/${id}${query}`);
          await expectNoA11yViolations(page);
        });
      }

      // 한 탭 뒤 화면(A, B 고마움 줄, C 첫 질문)
      test(`식후 피드백 ${id} 좋았어요 누른 뒤`, async ({ page }) => {
        test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
        await openLabRoute(page, `/design-lab/feedback/${id}`);
        await page.getByRole("button", { name: "좋았어요", exact: true }).click();
        await expectNoA11yViolations(page);
      });
    }
  });
}
