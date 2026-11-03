// 탭 스와이프 이동 E2E (T9.14, D-36 시안 A "따라오는 페이지").
//
// - 모바일(390, 터치) 프로젝트만. 손가락은 CDP Input.dispatchTouchEvent로 흉내 낸다(Playwright touchscreen은 탭만 있다).
// - 비로그인 둘러보기(오늘, 지도). 카카오, 네이버 SDK는 가짜(e2e/helpers/kakao-places-fake.ts).
// - 제어기는 첫 화면 뒤 지연 로드라 본문 [data-swipe-ready]를 기다린 뒤 민다.
// - iOS Safari 가장자리 뒤로 가기, Android 제스처 내비게이션과의 충돌은 실기기 확인 항목이다.
import { expect, test, type CDPSession, type Page } from "@playwright/test";
import { mockRecommendSdks } from "./helpers/kakao-places-fake";

const HERE = { latitude: 37.5701234, longitude: 126.9812345 };

test.use({ geolocation: HERE, permissions: ["geolocation"] });

test.beforeEach(() => {
  test.skip(
    test.info().project.name !== "mobile",
    "탭 스와이프는 모바일 터치 배치에서만 동작합니다",
  );
});

type Touch = {
  start(x: number, y: number): Promise<void>;
  move(x: number, y: number): Promise<void>;
  end(): Promise<void>;
  swipe(x0: number, y0: number, x1: number, y1: number): Promise<void>;
};

async function touch(page: Page): Promise<Touch> {
  const cdp: CDPSession = await page.context().newCDPSession(page);
  let last = { x: 0, y: 0 };
  const send = (
    type: "touchStart" | "touchMove" | "touchEnd",
    points: { x: number; y: number }[],
  ) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
  const t: Touch = {
    async start(x, y) {
      last = { x, y };
      await send("touchStart", [{ x, y }]);
    },
    async move(x, y) {
      const steps = 10;
      const from = last;
      for (let i = 1; i <= steps; i++) {
        await send("touchMove", [
          {
            x: from.x + ((x - from.x) * i) / steps,
            y: from.y + ((y - from.y) * i) / steps,
          },
        ]);
        await page.waitForTimeout(16);
      }
      last = { x, y };
    },
    async end() {
      await send("touchEnd", []);
    },
    async swipe(x0, y0, x1, y1) {
      await t.start(x0, y0);
      await t.move(x1, y1);
      await t.end();
    },
  };
  return t;
}

async function openToday(page: Page) {
  await mockRecommendSdks(page);
  await page.goto("/today");
  await expect(page.locator(".lm-today-deck article h2")).toBeVisible();
  await expect(
    page.locator("[data-slot=swipe-main][data-swipe-ready]"),
  ).toBeAttached({
    timeout: 10_000,
  });
}

const activeTab = (page: Page) =>
  page
    .getByRole("navigation", { name: "주요 메뉴" })
    .locator("[aria-current=page]");

test("오늘에서 왼쪽으로 밀면 지도, 지도 목록에서 오른쪽으로 밀면 오늘", async ({
  page,
}) => {
  await openToday(page);
  const t = await touch(page);
  await t.swipe(300, 420, 100, 425);
  await expect(page).toHaveURL(/\/map$/);
  await expect(activeTab(page)).toHaveText("지도");

  await expect(
    page.locator("[data-slot=swipe-main][data-swipe-ready]"),
  ).toBeAttached();
  // 지도 캔버스에서 시작하면 받지 않는다(지도 끌기)
  await t.swipe(300, 150, 100, 150);
  await page.waitForTimeout(600);
  await expect(page).toHaveURL(/\/map$/);
  // 지도 아래 목록 시트에서 오른쪽으로 밀면 이전 탭(오늘).
  // 목록이 그려지기 전에는 그 자리가 지도 스켈레톤(받지 않는 자리)이라 목록이 뜰 때까지 기다린다(dev 서버가 느릴 때)
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const el = document.elementFromPoint(100, 700);
          return Boolean(el && !el.closest("[data-swipe-ignore]"));
        }),
      { timeout: 15_000 },
    )
    .toBe(true);
  await t.swipe(100, 700, 320, 702);
  await expect(page).toHaveURL(/\/today$/);
  await expect(activeTab(page)).toHaveText("오늘");
});

test("세로 스크롤, 가장자리 시작, 짧게 민 손가락은 탭을 옮기지 않는다", async ({
  page,
}) => {
  await openToday(page);
  const t = await touch(page);
  await t.swipe(250, 600, 240, 300); // 세로
  await t.swipe(385, 420, 150, 420); // 오른쪽 가장자리(iOS 뒤로 가기 자리)
  await t.swipe(250, 420, 220, 420); // 30px
  await page.waitForTimeout(600);
  await expect(page).toHaveURL(/\/today$/);
  // 첫 탭에서 오른쪽(이전)으로 밀면 버티고 제자리
  await t.swipe(100, 420, 330, 420);
  await page.waitForTimeout(600);
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.locator("[data-slot=swipe-main]")).not.toHaveAttribute(
    "style",
    /transform|left/,
  );
});

test("미는 동안 본문과 오늘 행동 줄이 같이 밀리고, 행동 줄은 화면 아래 자리를 지킨다", async ({
  page,
}) => {
  await openToday(page);
  const dock = page.locator("[data-slot=bottom-dock]");
  const before = await dock.boundingBox();
  const t = await touch(page);
  await t.start(300, 420);
  await t.move(200, 422);
  await page.waitForTimeout(100);
  const mainLeft = await page
    .locator("[data-slot=swipe-main]")
    .evaluate((el) => el.getBoundingClientRect().left);
  const during = await dock.boundingBox();
  expect(mainLeft).toBeLessThan(-60);
  // 세로 자리는 그대로(본문 transform 기준으로 바뀌어도 pinDock이 화면 자리로 되돌린다), 가로는 본문과 같이
  expect(during!.y).toBeCloseTo(before!.y, 0);
  expect(during!.x - before!.x).toBeCloseTo(mainLeft, 0);
  // 옆 탭 표시
  await expect(page.locator("[data-slot=swipe-peek]")).toContainText("지도");
  await t.end();
});

test("상세 시트가 열려 있으면 밀어도 탭을 옮기지 않는다", async ({ page }) => {
  await openToday(page);
  await page
    .locator(".lm-today-deck")
    .getByRole("button", { name: /상세/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const t = await touch(page);
  await t.swipe(300, 300, 80, 300);
  await page.waitForTimeout(600);
  await expect(page).toHaveURL(/\/today$/);
});
