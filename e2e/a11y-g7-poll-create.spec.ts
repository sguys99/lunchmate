// axe 접근성 검사: T7.2 투표 만들기 시안 3안 (A 한 장 시트, B 한 질문씩, C 먼저 만들고 고치기).
// 실행: NEXT_PUBLIC_DESIGN_LAB=true pnpm exec playwright test --project=mobile --project=desktop e2e/a11y-g7-poll-create.spec.ts
// 게이트(T7.5) 뒤 고른 안만 남기고 e2e/a11y.spec.ts 루프로 옮긴다.
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
  "?flow=compose",
  "?flow=share",
  "?state=loading",
  "?state=empty",
  "?state=error",
  "?state=error&fail=limit",
  "?state=error&fail=share",
  "?state=offline",
  "?flow=compose&entry=detail",
  "?flow=compose&entry=party",
  "?flow=compose&clock=late",
];

const EXTRA: Record<string, string[]> = {
  a: ["?flow=pick"],
  b: ["?flow=compose&step=2", "?flow=compose&step=2&entry=party"],
  c: [
    "?flow=edit&field=deadline",
    "?flow=edit&field=candidates",
    "?flow=edit&field=title",
  ],
};

for (const theme of ["light", "dark"] as GalleryTheme[]) {
  test.describe(`테마 ${theme}`, () => {
    test.use({ colorScheme: theme, reducedMotion: "reduce" });

    for (const id of ["a", "b", "c"]) {
      for (const query of [...COMMON, ...(EXTRA[id] ?? [])]) {
        test(`투표 만들기 ${id}${query}`, async ({ page }) => {
          test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
          await openLabRoute(page, `/design-lab/poll-create/${id}${query}`);
          await expectNoA11yViolations(page);
        });
      }
    }

    // 진입점을 눌러 시트가 열리면 제목으로 포커스가 가고, Esc로 닫으면 진입점으로 돌아온다
    for (const id of ["a", "b", "c"]) {
      test(`투표 만들기 ${id} 열고 닫기 포커스`, async ({ page }) => {
        test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
        await openLabRoute(page, `/design-lab/poll-create/${id}`);
        const entry = page.getByRole("button", { name: "친구랑 정하기" });
        await entry.click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole("heading", { level: 2 })).toBeFocused();
        await expectNoA11yViolations(page);
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await expect(entry).toBeFocused();
      });
    }
  });
}
