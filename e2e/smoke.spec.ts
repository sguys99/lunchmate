import { expect, test } from "@playwright/test";

test("홈이 뜨고 제목이 보인다", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(
    page.getByRole("heading", { level: 1, name: "런치메이트" }),
  ).toBeVisible();
});
