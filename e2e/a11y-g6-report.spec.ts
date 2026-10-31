// T6.3 제보와 신고 입력 시안 axe 검사 (e2e/a11y.spec.ts와 같은 방식). 게이트(T6.4) 뒤 고른 안만 a11y.spec.ts로 옮긴다.
// 실행: NEXT_PUBLIC_DESIGN_LAB=true PLAYWRIGHT_BASE_URL=<dev> pnpm exec playwright test e2e/a11y-g6-report.spec.ts --project=mobile --project=desktop
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

// ?menu=open(더 보기 메뉴 펼침)은 캡처만 한다. 실제 PlaceMoreMenu(Base UI Menu, D-10 구현)가 모달이라 바깥을 aria-hidden으로 가린다
const QUERIES = [
  "",
  "?flow=deal",
  "?flow=deal&phase=dup",
  "?flow=deal&phase=done",
  "?flow=deal&error=banned-word",
  "?flow=deal&error=limit",
  "?flow=deal&state=loading",
  "?flow=deal&state=empty",
  "?flow=deal&state=error",
  "?flow=deal&state=offline",
  "?flow=deal-check&phase=done",
  "?flow=deal-check&phase=ended",
  "?flow=wait&phase=done",
  "?flow=wait&phase=cooldown",
  "?flow=place&kind=price",
  "?flow=place&phase=done",
  "?flow=review-report",
  "?flow=review-report&target=deal",
  "?flow=review-report&phase=done",
  "?flow=review-report&error=limit",
  "?flow=review-report&error=banned-word",
];

/** C안 질문 단계 */
const C_STEPS = ["?flow=deal&step=2", "?flow=deal&step=3", "?flow=deal&step=4"];

for (const theme of ["light", "dark"] as GalleryTheme[]) {
  test.describe(`테마 ${theme}`, () => {
    test.use({ colorScheme: theme, reducedMotion: "reduce" });

    for (const id of ["a", "b", "c"]) {
      for (const query of id === "c" ? [...QUERIES, ...C_STEPS] : QUERIES) {
        test(`제보와 신고 ${id}${query}`, async ({ page }) => {
          test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
          await openLabRoute(page, `/design-lab/report/${id}${query}`);
          await expectNoA11yViolations(page);
        });
      }
    }
  });
}
