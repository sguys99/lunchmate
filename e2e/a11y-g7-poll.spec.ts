// 7단계 투표방 시안 axe 검사 (T7.1). WCAG 2.1 AA + best-practice, 위반 0 (helpers/axe.ts).
// 실행: NEXT_PUBLIC_DESIGN_LAB=true PLAYWRIGHT_BASE_URL=http://localhost:3102 pnpm exec playwright test --project=mobile --project=desktop e2e/a11y-g7-poll.spec.ts
// 게이트(T7.5) 뒤 고른 안만 e2e/a11y.spec.ts 루프로 옮기고 이 파일은 지운다(6단계와 같은 방식).
import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./helpers/axe";
import { markWebFontsSeen } from "./helpers/fonts";
import { designLabOn, type GalleryTheme } from "./helpers/gallery";

const QUERIES = [
  "",
  "?flow=voted",
  "?role=host&suggest=on",
  "?role=host&flow=voted",
  "?role=guest",
  "?role=host&flow=tie",
  "?flow=tie",
  "?flow=result",
  "?multi=on",
  "?live=lost",
  "?state=error&fail=vote&flow=voted",
  "?state=error&fail=name",
  "?flow=expired",
  "?flow=canceled",
  "?state=loading",
  "?state=empty",
  "?state=error",
  "?state=offline",
] as const;

async function openLabRoute(page: Page, path: string) {
  await markWebFontsSeen(page);
  const res = await page.goto(path);
  expect(res?.status()).toBe(200);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}

for (const theme of ["light", "dark"] as GalleryTheme[]) {
  test.describe(`투표방 시안 테마 ${theme}`, () => {
    test.use({ colorScheme: theme, reducedMotion: "reduce" });

    for (const v of ["a", "b", "c"] as const) {
      for (const q of QUERIES) {
        test(`poll/${v}${q}`, async ({ page }) => {
          test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
          await openLabRoute(page, `/design-lab/poll/${v}${q}`);
          await expectNoA11yViolations(page);
        });
      }

      test(`poll/${v} 투표한 뒤`, async ({ page }) => {
        test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
        await openLabRoute(page, `/design-lab/poll/${v}`);
        // B는 보고 있는 카드가 곧 고른 곳이라 고르기 단계가 없다
        if (v !== "b") await page.getByRole("radio").first().click();
        await page.getByRole("button", { name: /투표하기/ }).click();
        await expect(
          page.getByRole("button", { name: "선택 바꾸기" }),
        ).toBeVisible();
        await expectNoA11yViolations(page);
      });

      test(`poll/${v} 방장 투표 취소 확인`, async ({ page }) => {
        test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
        await openLabRoute(page, `/design-lab/poll/${v}?role=host`);
        await page.getByRole("button", { name: "투표 관리 더 보기" }).click();
        await page.getByRole("button", { name: "투표 취소하기" }).click();
        await expect(
          page.getByRole("button", { name: "취소하기" }),
        ).toBeFocused();
        await expectNoA11yViolations(page);
      });
    }
  });
}
