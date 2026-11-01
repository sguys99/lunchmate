// 공유 이미지 axe 검사와 동작 확인 (T7.14, T7.20, D-17). 확인 화면 /design-lab/share/<a|b>와 실제 OG 라우트 /api/og/poll/<code>.
// 실행: NEXT_PUBLIC_DESIGN_LAB=true PLAYWRIGHT_BASE_URL=http://localhost:3102 pnpm exec playwright test e2e/a11y-g7-share.spec.ts --project=mobile --project=desktop
// - a: 카카오톡 말풍선 모형과 서버 OG 원본(실제 PollOgArt). b: 실제 결과 공유 시트(브라우저 canvas 이미지, 카카오톡, 저장, 공유).
import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./helpers/axe";
import { markWebFontsSeen } from "./helpers/fonts";
import { designLabOn } from "./helpers/gallery";

const PAGES = [
  "a",
  "a?state=loading",
  "a?state=error",
  "a?kind=party&safe=on",
  "b",
  "b?kind=party",
  "b?state=error",
] as const;

for (const theme of ["light", "dark"] as const) {
  test.describe(`공유 확인 화면 ${theme}`, () => {
    test.use({ colorScheme: theme, reducedMotion: "reduce" });

    for (const q of PAGES) {
      test(q, async ({ page }) => {
        test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
        await markWebFontsSeen(page);
        const res = await page.goto(`/design-lab/share/${q}`);
        expect(res?.status()).toBe(200);
        await page.waitForLoadState("networkidle");
        if (q.startsWith("b")) {
          const dialog = page.getByRole("dialog", { name: "결과 공유" });
          await expect(dialog).toBeVisible();
          // 이미지가 그려지면 Blob 미리보기, 이름이 없으면(error) 대체 이름으로 그린다
          await expect(dialog.locator('img[src^="blob:"]')).toBeVisible({
            timeout: 15000,
          });
          // 올리브 면 버튼은 카카오톡 하나 (D-17 안건 10)
          await expect(
            dialog.getByRole("button", { name: "카카오톡으로 보내기" }),
          ).toBeVisible();
          await expect(
            dialog.getByRole("button", { name: "이미지 저장" }),
          ).toBeEnabled();
        }
        await expectNoA11yViolations(page);
      });
    }
  });
}

test("시트를 닫으면 연 버튼으로 포커스가 돌아온다", async ({ page }) => {
  test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
  await markWebFontsSeen(page);
  await page.goto("/design-lab/share/b?state=empty");
  const opener = page.getByRole("button", { name: "결과 공유 열기" });
  await opener.click();
  await expect(page.getByRole("dialog", { name: "결과 공유" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("이미지 저장은 PNG를 내려받고 상태를 알린다", async ({ page }) => {
  test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
  await markWebFontsSeen(page);
  await page.goto("/design-lab/share/b");
  const dialog = page.getByRole("dialog", { name: "결과 공유" });
  await expect(dialog.locator('img[src^="blob:"]')).toBeVisible({
    timeout: 15000,
  });
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "이미지 저장" }).click();
  expect((await download).suggestedFilename()).toBe("lunchmate-result.png");
  await expect(dialog.getByRole("status")).toHaveText("이미지를 저장했습니다.");
});

test("서버 OG: 확인 라우트와 실제 라우트는 1200 x 600 PNG", async ({
  request,
}) => {
  const png = async (url: string) => {
    const res = await request.get(url);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
    const buf = await res.body();
    // PNG IHDR: 너비 16~19바이트, 높이 20~23바이트
    expect(buf.readUInt32BE(16)).toBe(1200);
    expect(buf.readUInt32BE(20)).toBe(600);
    return res;
  };
  if (designLabOn) {
    for (const img of ["invite", "result"]) {
      await png(`/design-lab/share/og?img=${img}`);
    }
  }
  // 없는 코드는 "열 수 없는 투표" 그림을 짧게 캐시한다(D-17 안건 8)
  const res = await png("/api/og/poll/abcdefghjkmn?img=invite&v=x");
  expect(res.headers()["cache-control"]).toBe("public, max-age=300");
  // 형식이 틀린 코드도 DB를 부르지 않고 같은 그림
  await png("/api/og/poll/NOT-A-CODE");
});
