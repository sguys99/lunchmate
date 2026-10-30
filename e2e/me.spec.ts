// 나 탭 설정 E2E (T4.23~T4.27, SET-01~05). 클라우드 개발 DB에 test_rls_ 사용자를 만들고 끝나면 지운다.
//
// 실행: RUN_DB_E2E=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 pnpm exec playwright test --project=mobile --project=desktop e2e/me.spec.ts
// - RUN_DB_E2E가 없거나 Supabase 값이 없으면 건너뛴다(평소 pnpm test:e2e는 클라우드 DB를 건드리지 않음).
// - 약관 동의와 첫 사무실은 본인 세션 REST로 미리 만든다(온보딩은 onboarding.spec.ts 범위).
// - 지도 SDK는 가짜(map-sdk-mocks.ts). ME_SHOTS_DIR을 주면 화면 캡처를 그 폴더에 남긴다(확인용, 기준 이미지 아님).
import { expect, test, type Page } from "@playwright/test";
import { rest } from "../src/lib/supabase/rls/harness";
import { expectNoA11yViolations } from "./helpers/axe";
import { FAKE_PX_DEG, mockMapSdks } from "./helpers/map-sdk-mocks";
import { loadDbE2eEnv, readOwn, signInContext } from "./helpers/session";

const env = loadDbE2eEnv();
const shotsDir = process.env.ME_SHOTS_DIR;

async function shot(page: Page, name: string) {
  if (!shotsDir) return;
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== "running"),
  );
  const project = test.info().project.name;
  await page.screenshot({
    path: `${shotsDir}/${name}__${project}.png`,
    fullPage: true,
  });
}

test.describe("나 탭 설정", () => {
  test.skip(!env, "RUN_DB_E2E=1과 Supabase 값(.env.local)이 있어야 실행합니다");

  async function setup(
    context: Parameters<typeof signInContext>[0],
    baseURL: string,
    label: string,
  ) {
    const signed = await signInContext(context, env!, baseURL, label);
    const token = signed.session.access_token;
    const user = signed.user.id;
    const agreed = await rest(env!, `profiles?user_id=eq.${user}`, {
      method: "PATCH",
      token,
      body: {
        terms_agreed_at: new Date().toISOString(),
        birth_confirmed_at: new Date().toISOString(),
        nickname: "test_점심",
      },
    });
    expect(agreed.status).toBe(200);
    const office = await rest(env!, "offices", {
      method: "POST",
      token,
      body: { user_id: user, name: "회사", lat: 37.5665, lng: 126.978 },
    });
    expect(office.status).toBe(201);
    return { ...signed, token };
  }

  test("첫 화면, 화면 모드(첫 페인트 적용), 이름 수정", async ({
    page,
    context,
    baseURL,
  }) => {
    const { cleanup, token } = await setup(context, baseURL!, "me1");
    try {
      await page.goto("/me");
      await expect(page.getByRole("heading", { name: "나" })).toBeVisible();
      await expect(
        page.getByRole("link", { name: /사무실\s*회사/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /예산과 거리.*점심 1만/ }),
      ).toBeVisible();
      await expectNoA11yViolations(page);
      await shot(page, "me-light");

      // 다크를 고르면 바로 적용되고, 새로 고침해도 첫 페인트부터 다크다
      await page.getByRole("button", { name: "다크" }).click();
      await expect(page.locator("html")).toHaveClass(/\bdark\b/);
      await page.reload();
      await expect(page.locator("html")).toHaveClass(/\bdark\b/);
      await expect(page.getByRole("button", { name: "다크" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await shot(page, "me-dark");

      // 모션 줄이기는 data-motion, 진동은 별도(D-04)
      await page.getByText("모션 줄이기").click();
      await expect(page.locator("html")).toHaveAttribute(
        "data-motion",
        "reduce",
      );
      await page.getByRole("button", { name: "시스템" }).click();
      await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);

      // 이름 수정
      await page.getByRole("link", { name: /이름/ }).click();
      await expect(page).toHaveURL(/\/me\/account$/);
      await expect(
        page.getByText("다른 사람에게 보일 이름입니다.", { exact: false }),
      ).toBeVisible();
      const input = page.getByRole("textbox", { name: "이름" });
      await input.fill("  test_새이름 ");
      await page.getByRole("button", { name: "이름 저장" }).click();
      await expect(input).toHaveValue("test_새이름");
      await shot(page, "me-account");
      const profile = await readOwn<{ nickname: string }[]>(
        env!,
        token,
        "profiles?select=nickname",
      );
      expect(profile[0]?.nickname).toBe("test_새이름");
    } finally {
      await cleanup();
    }
  });

  test("사무실: 핀으로 추가(검색 좌표 저장 안 함), 기본 지정, 기본 지우면 대체", async ({
    page,
    context,
    baseURL,
  }) => {
    await mockMapSdks(page);
    const { cleanup, token } = await setup(context, baseURL!, "me2");
    try {
      await page.goto("/me/offices");
      await expect(page.getByText("1/5곳")).toBeVisible();
      await expect(page.getByRole("button", { name: "삭제" })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
      await shot(page, "me-offices");

      await page.getByRole("link", { name: "사무실 추가" }).click();
      await expect(page).toHaveURL(/\/me\/offices\/new$/);
      const save = page.getByRole("button", { name: "이 위치로 저장" });
      await expect(save).toHaveAttribute("aria-disabled", "true");
      const map = page.getByTestId("onboarding-map").locator("[data-fake-map]");
      await expect(map).toBeVisible();
      const box = (await map.boundingBox())!;
      await map.click({
        position: { x: box.width / 2 + 40, y: box.height / 2 - 30 },
      });
      await expect(page.getByTestId("pin-status")).toContainText(
        "핀을 놓았습니다",
      );
      await page.getByRole("textbox", { name: "사무실 이름" }).fill("판교");
      await shot(page, "me-office-new");
      await save.click();
      await expect(page).toHaveURL(/\/me\/offices$/);
      await expect(page.getByText("2/5곳")).toBeVisible();

      const rows = await readOwn<
        { name: string; lat: number; lng: number; is_default: boolean }[]
      >(env!, token, "offices?select=name,lat,lng,is_default&order=created_at");
      expect(rows).toHaveLength(2);
      expect(rows[1]).toMatchObject({ name: "판교", is_default: false });
      // 가짜 지도 1px = FAKE_PX_DEG도. 누른 자리 좌표만 저장된다
      // 클릭 위치 반올림(1px 이내)만 허용
      expect(
        Math.abs(rows[1]!.lng - (126.978 + 40 * FAKE_PX_DEG)),
      ).toBeLessThanOrEqual(FAKE_PX_DEG);
      expect(
        Math.abs(rows[1]!.lat - (37.5665 + 30 * FAKE_PX_DEG)),
      ).toBeLessThanOrEqual(FAKE_PX_DEG);
      expect(Object.keys(rows[1]!).sort()).toEqual(
        ["is_default", "lat", "lng", "name"].sort(),
      );

      // 판교를 기본으로
      await page
        .getByRole("group", { name: "판교 관리" })
        .getByRole("button", { name: "기본으로" })
        .click();
      await expect(
        page.getByRole("group", { name: "회사 관리" }).getByRole("button", {
          name: "기본으로",
        }),
      ).toBeVisible();

      // 기본(판교)을 지우면 회사가 다시 기본
      await page
        .getByRole("group", { name: "판교 관리" })
        .getByRole("button", { name: "삭제" })
        .click();
      await expect(page.getByRole("dialog")).toContainText("기본 사무실입니다");
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "삭제" })
        .click();
      await expect(page.getByText("1/5곳")).toBeVisible();
      const after = await readOwn<{ name: string; is_default: boolean }[]>(
        env!,
        token,
        "offices?select=name,is_default",
      );
      expect(after).toEqual([{ name: "회사", is_default: true }]);
    } finally {
      await cleanup();
    }
  });

  test("예산, 못 먹는 음식, 요즘 이게 땡겨요 저장", async ({
    page,
    context,
    baseURL,
  }) => {
    const { cleanup, token } = await setup(context, baseURL!, "me3");
    try {
      await page.goto("/me/budget");
      const save = page.getByRole("button", { name: "저장" });
      await expect(save).toHaveAttribute("aria-disabled", "true");
      await page.getByRole("slider", { name: "걷는 거리" }).focus();
      await page.keyboard.press("ArrowRight");
      await expect(save).not.toHaveAttribute("aria-disabled", "true");
      await shot(page, "me-budget");
      await save.click();
      await expect(page.getByText("예산과 거리를 저장했습니다")).toBeVisible();
      await expect(save).toHaveAttribute("aria-disabled", "true");
      const prefs = await readOwn<{ walk_minutes: number }[]>(
        env!,
        token,
        "preferences?select=walk_minutes",
      );
      expect(prefs[0]?.walk_minutes).toBe(15);

      await page.goto("/me/avoid");
      await page.getByRole("button", { name: "땅콩" }).click();
      await page.getByRole("textbox", { name: "직접 입력" }).fill("고수");
      await page.getByRole("button", { name: "추가" }).click();
      await shot(page, "me-avoid");
      await page.getByRole("button", { name: "저장" }).click();
      await expect(page.getByText("못 먹는 음식을 저장했습니다")).toBeVisible();
      const avoid = await readOwn<{ kind: string; value: string }[]>(
        env!,
        token,
        "avoid_rules?select=kind,value&order=kind",
      );
      expect(avoid).toEqual([
        { kind: "allergy", value: "땅콩" },
        { kind: "custom", value: "고수" },
      ]);

      await page.goto("/me/craving");
      await expect(page.getByTestId("craving-status")).toContainText(
        "고른 종류가 없습니다",
      );
      for (const name of ["한식", "일식", "중식", "양식"]) {
        await page.getByRole("button", { name, exact: true }).click();
      }
      await expect(
        page.getByText("3개까지 고를 수 있어요", { exact: false }),
      ).toHaveAttribute("role", "alert");
      await expect(page.getByRole("button", { name: "양식" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      await page.getByRole("button", { name: "저장" }).click();
      await expect(page.getByTestId("craving-status")).toContainText(
        "7일 남았습니다",
      );
      await shot(page, "me-craving");
      const craving = await readOwn<
        { craving_categories: string[]; craving_until: string | null }[]
      >(env!, token, "preferences?select=craving_categories,craving_until");
      expect(craving[0]?.craving_categories).toEqual([
        "hansik",
        "ilsik",
        "jungsik",
      ]);
      expect(craving[0]?.craving_until).not.toBeNull();
    } finally {
      await cleanup();
    }
  });
});
