import { expect, test } from "@playwright/test";

// 기본 실행(designLab off)에서는 404 만 확인한다.
// 켠 상태 검증: NEXT_PUBLIC_DESIGN_LAB=true pnpm test:e2e e2e/map-smoke.spec.ts
// 지도 키가 없는 환경에서만 "키 없음 오류 상태"를 검증한다(키가 있으면 실지도가 뜨므로 건너뜀).
const labOn = process.env.NEXT_PUBLIC_DESIGN_LAB === "true";
const keyPresent = !!process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

test(
  labOn
    ? "지도 키가 없으면 키 없음 오류 상태가 보인다"
    : "플래그 off 이면 /design-lab/map-smoke 는 404",
  async ({ page }) => {
    test.skip(labOn && keyPresent, "키가 있으면 실지도가 표시된다");
    const res = await page.goto("/design-lab/map-smoke");
    if (!labOn) {
      expect(res?.status()).toBe(404);
      return;
    }
    expect(res?.status()).toBe(200);
    const region = page.getByRole("region", { name: "식당 지도" });
    await expect(region).toBeVisible();
    await expect(region.getByRole("alert")).toContainText(
      "지도 키가 설정되지 않았습니다",
    );
  },
);
