import { expect, test } from "@playwright/test";

// playwright.config 의 webServer 가 NEXT_PUBLIC_DESIGN_LAB(기본 "false")으로 dev 서버를 띄운다.
// 켠 상태 검증: NEXT_PUBLIC_DESIGN_LAB=true pnpm test:e2e e2e/design-lab.spec.ts
const labOn = process.env.NEXT_PUBLIC_DESIGN_LAB === "true";

test(
  labOn
    ? "플래그 on 이면 /design-lab 이 열린다"
    : "플래그 off 이면 /design-lab 은 404",
  async ({ page }) => {
    const res = await page.goto("/design-lab");
    if (labOn) {
      expect(res?.status()).toBe(200);
      await expect(
        page.getByRole("heading", { level: 1, name: "디자인 랩" }),
      ).toBeVisible();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        /noindex/,
      );
    } else {
      expect(res?.status()).toBe(404);
    }
  },
);
