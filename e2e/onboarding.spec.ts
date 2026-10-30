// 온보딩 E2E (T4.22): AC-ONB-1(기본값으로 60초 안에 홈), AC-ONB-2(위치 권한 거부 뒤 검색으로 완료), AC-ONB-3 보강.
//
// 실행: RUN_DB_E2E=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 pnpm test:e2e:onboarding
// - 클라우드 개발 DB에 test_rls_ 사용자를 만들고 끝나면 지운다(e2e/helpers/session.ts). RUN_DB_E2E가 없거나
//   Supabase 값이 없으면 건너뛴다.
// - 네이버, 카카오 SDK는 가짜로 응답한다(e2e/helpers/map-sdk-mocks.ts). 실제 지도 인증은 이 테스트 범위 밖이다.
// - 홈(/today)은 5단계 전까지 자리 표시 화면이다. "홈 추천 카드가 보인다"는 지금은 /today 도착과 탭 제목으로 대신 확인하고,
//   T5에서 카드 단언으로 바꾼다.
import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./helpers/axe";
import {
  FAKE_PX_DEG,
  FAKE_SEARCH_RESULT,
  mockMapSdks,
} from "./helpers/map-sdk-mocks";
import { loadDbE2eEnv, readOwn, signInContext } from "./helpers/session";

const env = loadDbE2eEnv();

test.describe("온보딩", () => {
  test.skip(!env, "RUN_DB_E2E=1과 Supabase 값(.env.local)이 있어야 실행합니다");

  async function agreeTerms(page: Page) {
    await expect(page).toHaveURL(/\/welcome\/terms/);
    await page.getByText("모두 동의합니다").click();
    await page.getByRole("button", { name: "동의하고 시작하기" }).click();
    await expect(page).toHaveURL(/\/welcome\/onboarding/);
  }

  /** 단계 전환 모션(ob-rise, 300ms)이 끝난 뒤 axe를 돌린다. 도중이면 투명도 때문에 대비가 낮게 잡힌다 */
  async function axeAfterMotion(page: Page) {
    await page.waitForFunction(() =>
      document.getAnimations().every((a) => a.playState !== "running"),
    );
    await expectNoA11yViolations(page);
  }

  /** 지도 가운데에서 (dx, dy) 떨어진 곳을 누른다 */
  async function tapMap(page: Page, dx: number, dy: number) {
    const map = page.getByTestId("onboarding-map").locator("[data-fake-map]");
    await expect(map).toBeVisible();
    const box = (await map.boundingBox())!;
    await map.click({
      position: { x: box.width / 2 + dx, y: box.height / 2 + dy },
    });
  }

  test("AC-ONB-1: 처음 가입한 사용자가 기본값으로 넘기면 60초 안에 홈에 닿는다", async ({
    page,
    context,
    baseURL,
  }) => {
    await mockMapSdks(page);
    const { session, cleanup } = await signInContext(
      context,
      env!,
      baseURL!,
      "onb1",
    );
    try {
      const started = Date.now();
      await page.goto("/today");
      await agreeTerms(page);

      const save = page.getByRole("button", { name: "이 위치로 저장" });
      await expect(save).toHaveAttribute("aria-disabled", "true");
      await tapMap(page, 0, 0);
      await expect(page.getByTestId("pin-status")).toContainText(
        "핀을 놓았습니다",
      );
      await expect(save).not.toHaveAttribute("aria-disabled", "true");
      await save.click();

      await expect(
        page.getByRole("heading", { name: "예산과 걷는 거리" }),
      ).toBeVisible();
      await expect(page.getByTestId("nearby-count")).toContainText("곳");
      await page.getByRole("button", { name: "건너뛰기" }).click();
      await expect(
        page.getByRole("heading", { name: "못 먹는 음식이 있나요?" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "건너뛰기" }).click();

      await expect(page).toHaveURL(/\/today$/);
      await expect(page.getByRole("heading", { name: "오늘" })).toBeVisible();
      const elapsed = Date.now() - started;
      expect(elapsed).toBeLessThan(60_000);
      test
        .info()
        .annotations.push({ type: "elapsed-ms", description: String(elapsed) });

      // 저장 값: 핀 좌표와 이름만, 설정은 기본값, 기피 음식 없음 (본인 세션으로 읽음)
      const offices = await readOwn<Record<string, unknown>[]>(
        env!,
        session.access_token,
        "offices?select=*",
      );
      expect(offices).toHaveLength(1);
      expect(offices[0]).toMatchObject({ name: "회사", is_default: true });
      const prefs = await readOwn<Record<string, unknown>[]>(
        env!,
        session.access_token,
        "preferences?select=lunch_budget,dinner_budget,walk_minutes",
      );
      expect(prefs[0]).toEqual({
        lunch_budget: 10000,
        dinner_budget: 20000,
        walk_minutes: 10,
      });
      const avoid = await readOwn<unknown[]>(
        env!,
        session.access_token,
        "avoid_rules?select=id",
      );
      expect(avoid).toHaveLength(0);

      // 다시 오면 온보딩을 건너뛴다
      await page.goto("/welcome/onboarding?next=%2Fme");
      await expect(page).toHaveURL(/\/me$/);
    } finally {
      await cleanup();
    }
  });

  test("AC-ONB-2: 위치 권한을 거부해도 주소 검색으로 마칠 수 있다(검색 좌표는 저장하지 않음)", async ({
    page,
    context,
    baseURL,
  }) => {
    await mockMapSdks(page);
    // 권한은 처음에 "묻기 전", 현위치를 누르면 거부
    await page.addInitScript(() => {
      const denied = {
        code: 1,
        message: "denied",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: {
          getCurrentPosition: (_ok: unknown, fail: (e: unknown) => void) =>
            setTimeout(() => fail(denied), 20),
          watchPosition: () => 0,
          clearWatch: () => {},
        },
      });
      const query = navigator.permissions.query.bind(navigator.permissions);
      navigator.permissions.query = ((d: PermissionDescriptor) =>
        d.name === "geolocation"
          ? Promise.resolve({ state: "prompt" } as PermissionStatus)
          : query(d)) as typeof navigator.permissions.query;
    });
    const { session, cleanup } = await signInContext(
      context,
      env!,
      baseURL!,
      "onb2",
    );
    try {
      await page.goto("/today");
      await agreeTerms(page);

      const locate = page.getByRole("button", { name: "현위치로 지도 옮기기" });
      await locate.click();
      await expect(page.getByText("위치 권한이 꺼져 있습니다")).toBeVisible();
      await expect(locate).toBeHidden();

      await page
        .getByRole("searchbox", { name: "회사 주소나 건물명 검색" })
        .fill("소담빌딩");
      await page.getByRole("button", { name: /소담빌딩/ }).click();
      // 검색은 지도만 옮기고 핀은 비어 있다
      await expect(page.getByTestId("pin-status")).toContainText(
        "눌러 핀을 놓아",
      );
      await expect(
        page.getByRole("button", { name: "이 위치로 저장" }),
      ).toHaveAttribute("aria-disabled", "true");

      await axeAfterMotion(page);

      await tapMap(page, 40, -30);
      await page.getByRole("button", { name: "이 위치로 저장" }).click();
      await expect(page.getByTestId("nearby-count")).toBeVisible();
      await axeAfterMotion(page);
      await page.getByRole("button", { name: "여기까지 하고 시작" }).click();
      await expect(page).toHaveURL(/\/today$/);

      const offices = await readOwn<{ lat: number; lng: number }[]>(
        env!,
        session.access_token,
        "offices?select=lat,lng",
      );
      expect(offices).toHaveLength(1);
      const saved = offices[0]!;
      // 저장 좌표는 검색 좌표가 아니라 누른 자리(가운데에서 오른쪽 40px, 위 30px)
      expect(saved.lat).not.toBe(FAKE_SEARCH_RESULT.lat);
      expect(saved.lat).toBeCloseTo(
        FAKE_SEARCH_RESULT.lat + 30 * FAKE_PX_DEG,
        4,
      );
      expect(saved.lng).toBeCloseTo(
        FAKE_SEARCH_RESULT.lng + 40 * FAKE_PX_DEG,
        4,
      );
    } finally {
      await cleanup();
    }
  });
});
