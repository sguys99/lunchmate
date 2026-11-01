// T7.4 OG 이미지와 결과 공유 이미지 시안 axe 검사 (/design-lab/share/<a|b|c>).
// 실행: NEXT_PUBLIC_DESIGN_LAB=true PLAYWRIGHT_BASE_URL=http://localhost:3102 pnpm exec playwright test e2e/a11y-g7-share.spec.ts --project=mobile --project=desktop
// 서버 OG 라우트(/design-lab/share/og)가 PNG를 돌려주는지와 결과 공유 이미지(브라우저 canvas)가 만들어지는지도 함께 본다.
import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./helpers/axe";
import { markWebFontsSeen } from "./helpers/fonts";
import { designLabOn } from "./helpers/gallery";

const VARIANTS = ["a", "b", "c"] as const;
const QUERIES = [
  "",
  "?state=loading",
  "?state=empty",
  "?state=error",
  "?state=offline",
  "?kind=party&safe=on",
] as const;

for (const theme of ["light", "dark"] as const) {
  test.describe(`공유 이미지 시안 ${theme}`, () => {
    test.use({ colorScheme: theme, reducedMotion: "reduce" });

    for (const v of VARIANTS) {
      for (const q of QUERIES) {
        test(`${v}${q}`, async ({ page }) => {
          test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
          await markWebFontsSeen(page);
          const res = await page.goto(`/design-lab/share/${v}${q}`);
          expect(res?.status()).toBe(200);
          await page.waitForLoadState("networkidle");
          if (q === "" || q.startsWith("?kind")) {
            await expect(page.locator('img[src^="blob:"]')).toBeVisible({
              timeout: 15000,
            });
          }
          await expectNoA11yViolations(page);
        });
      }
    }
  });
}

test("서버 OG 라우트는 1200 x 600 PNG를 돌려준다", async ({ request }) => {
  test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
  for (const v of VARIANTS) {
    for (const img of ["invite", "result"]) {
      const res = await request.get(`/design-lab/share/og?v=${v}&img=${img}`);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toContain("image/png");
      const buf = await res.body();
      // PNG IHDR: 너비 16~19바이트, 높이 20~23바이트
      expect(buf.readUInt32BE(16)).toBe(1200);
      expect(buf.readUInt32BE(20)).toBe(600);
    }
  }
});
