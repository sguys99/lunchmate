// 오프라인 기본 화면 (T8.3, PRD APP-02, research-notes T0.16-3).
// - 탭이 열린 채 연결이 끊기면 세션 메모리의 오늘 카드를 그대로 두고 "연결 전 결과" 한 줄을 보여 준다. 재연결 시 줄이 사라진다.
// - /offline(서비스 워커 폴백 HTML)은 정적 안내와 다시 시도 버튼만 있다. 서비스 워커는 프로덕션 빌드에서만 켜지므로
//   폴백 동작 자체는 pnpm build && pnpm start로 확인한다(DevTools Application > Service Workers, Network Offline).
import { expect, test } from "@playwright/test";
import { mockRecommendSdks } from "./helpers/kakao-places-fake";

test.use({
  geolocation: { latitude: 37.5665, longitude: 126.978 },
  permissions: ["geolocation"],
});

test("오늘: 연결이 끊기면 받은 카드를 두고 연결 전 결과를 표시, 재연결 시 사라진다", async ({
  page,
  context,
}) => {
  await mockRecommendSdks(page);
  await page.goto("/today");
  const hero = page.locator(".lm-today-deck article h2").first();
  await expect(hero).toBeVisible({ timeout: 30_000 });
  const name = await hero.innerText();

  await context.setOffline(true);
  const stale = page.getByText("연결 전 결과입니다", { exact: false });
  await expect(stale).toBeVisible();
  await expect(hero).toHaveText(name);

  await context.setOffline(false);
  await expect(stale).toBeHidden();
});

test("/offline: 장소 데이터 없는 정적 안내와 다시 시도", async ({ page }) => {
  await page.goto("/offline");
  await expect(page).toHaveTitle("오프라인 | 런치메이트");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "인터넷에 연결되어 있지 않습니다",
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
});
