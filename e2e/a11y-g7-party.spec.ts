// 회식 모드 시안 axe 검사 (T7.3). WCAG 2.1 AA + best-practice, 위반 0 (helpers/axe.ts).
// 실행: NEXT_PUBLIC_DESIGN_LAB=true pnpm exec playwright test --project=mobile --project=desktop e2e/a11y-g7-party.spec.ts
// 시안을 고른 뒤(T7.5) 남긴 안만 e2e/a11y.spec.ts 7단계 루프로 옮긴다.
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
  "?view=results",
  "?view=results&cold=on",
  "?view=results&few=on",
  "?state=loading",
  "?state=empty",
  "?state=error",
  "?state=offline",
  "?view=results&state=offline",
];
// G7(D-16)에서 C만 남겼다(A, B 화면 삭제)
const EXTRA: Record<"c", string[]> = {
  c: ["?edit=people", "?edit=budget", "?edit=room", "?active=2"],
};

for (const theme of ["light", "dark"] as GalleryTheme[]) {
  test.describe(`회식 모드 시안, 테마 ${theme}`, () => {
    test.use({ colorScheme: theme, reducedMotion: "reduce" });
    for (const v of ["c"] as const) {
      for (const q of [...QUERIES, ...EXTRA[v]]) {
        test(`party/${v}${q}`, async ({ page }) => {
          test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
          await openLabRoute(page, `/design-lab/party/${v}${q}`);
          await expectNoA11yViolations(page);
        });
      }
    }
  });
}
