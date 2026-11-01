// 실제 화면 접근성 회귀 (T8.9, docs/design/g8-a11y-audit.md). axe가 판정하지 않는 규칙을 실제 경로에서 잰다.
// - 제목 h1 하나, 단계 건너뛰기 없음, main 하나 / 터치 영역 44(가상 요소로 넓힌 칸 포함) / 360px, 640px(1280의 200% 확대) 가로 넘침 0
//   / Tab 초점 링 / 모바일 지도 "목록으로 건너뛰기" / 대안 카드 이름의 "도보" / 지도 시트 손잡이 누르는 칸 44
// 실행: pnpm test:e2e:a11y (공개 화면). 로그인 화면까지: RUN_DB_E2E=1 PLAYWRIGHT_BASE_URL=http://localhost:3102 pnpm exec playwright test
//   --project=mobile --project=desktop e2e/a11y-pages.spec.ts (클라우드 개발 DB에 test_rls_ 사용자를 만들고 끝나면 지운다)
// A11Y_REPORT 폴더를 주면 화면마다 탐침 결과를 JSON으로 남긴다(이모지 읽기처럼 실패 조건이 아닌 항목 확인용).
import { writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { adminPatch, rest, rpc } from "../src/lib/supabase/rls/harness";
import { probeA11y, probeFocus } from "./helpers/a11y-probe";
import { fakePlaceId, mockRecommendSdks } from "./helpers/kakao-places-fake";
import { loadDbE2eEnv, signInContext } from "./helpers/session";

const env = loadDbE2eEnv();
const REPORT = process.env.A11Y_REPORT;
const HERE = { latitude: 37.5665, longitude: 126.978 };

async function overflowAt(page: Page, width: number) {
  const vp = page.viewportSize()!;
  await page.setViewportSize({ width, height: 780 });
  await page.waitForTimeout(250);
  const px = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  await page.setViewportSize(vp);
  return px;
}

/** 경로 하나를 열고 규칙을 모두 확인한다 */
async function checkPage(page: Page, path: string, name: string) {
  const res = await page.goto(path);
  expect(res?.status(), path).toBeLessThan(500);
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.evaluate(() => document.fonts.ready);
  const probe = await probeA11y(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  const focus = await probeFocus(page, 30);
  const o360 = await overflowAt(page, 360);
  const o640 = await overflowAt(page, 640);
  if (REPORT)
    writeFileSync(
      `${REPORT}/${name}-${test.info().project.name}.json`,
      JSON.stringify({ path: page.url(), probe, focus, o360, o640 }, null, 2),
    );
  expect.soft(probe.h1, `${path} h1 개수`).toBe(1);
  expect.soft(probe.mains, `${path} main 개수`).toBe(1);
  expect.soft(probe.headingSkips, `${path} 제목 단계`).toEqual([]);
  expect.soft(probe.smallTargets, `${path} 터치 영역 44`).toEqual([]);
  expect.soft(probe.namelessSvg, `${path} 이름 없는 svg`).toEqual([]);
  expect.soft(focus.missingRing, `${path} 초점 링`).toEqual([]);
  expect.soft(o360, `${path} 360px 가로 넘침`).toBe(0);
  expect.soft(o640, `${path} 200% 확대 가로 넘침`).toBe(0);
}

test.describe("실제 화면: 공개", () => {
  test.use({ reducedMotion: "reduce" });
  for (const [path, name] of [
    ["/", "landing"],
    ["/login", "login"],
    ["/terms", "terms"],
    ["/privacy", "privacy"],
    ["/location", "location"],
    ["/today", "today-guest"],
    ["/map", "map-guest"],
    ["/offline", "offline"],
    ["/__a11y-nope", "not-found"],
  ] as const) {
    test(name, async ({ page }) => {
      await mockRecommendSdks(page);
      await checkPage(page, path, name);
    });
  }
});

// 👍는 보이는 모양 그대로, 읽기는 "좋아요"(T8.9 F6, src/components/a11y/emoji-text.tsx)
test.describe("이모지 읽기: 👍 → 좋아요", () => {
  test.use({
    reducedMotion: "reduce",
    geolocation: HERE,
    permissions: ["geolocation"],
  });

  test("랜딩 데모 이유 줄", async ({ page }) => {
    await page.goto("/");
    const reason = page
      .locator("p")
      .filter({ hasText: /지난주 👍/ })
      .first();
    await expect(reason).toBeVisible();
    // Chrome은 숨김 글자(sr-only, absolute) 뒤에 띄어쓰기를 넣어 "좋아요 한"으로 만든다. 읽기에는 지장 없다
    expect(await reason.ariaSnapshot()).toMatch(/지난주 좋아요 ?한 국밥/);
    // 이모지 글자는 접근성 트리에 없다
    expect(await page.locator("main").ariaSnapshot()).not.toContain("👍");
  });

  test("지도 필터 칩과 안내", async ({ page }) => {
    await mockRecommendSdks(page);
    await page.goto("/map");
    const chip = page.getByRole("button", { name: "좋아요 상위" });
    await expect(chip).toBeVisible();
    await expect(chip).toContainText("👍");
    await expect(chip).toHaveAccessibleDescription(
      "후기 3건 이상인 곳 중 좋아요 80% 이상입니다.",
    );
  });
});

test.describe("실제 화면: 둘러보기 추천과 지도", () => {
  test.use({
    reducedMotion: "reduce",
    geolocation: HERE,
    permissions: ["geolocation"],
  });

  test("오늘: 카드 규칙과 대안 카드 이름", async ({ page }) => {
    await mockRecommendSdks(page);
    await checkPage(page, "/today", "today-located");
    // 대안 카드 이름은 "도보 N 분"으로 읽힌다(숫자만 읽히면 무슨 분인지 모른다)
    const alts = page
      .getByRole("region", { name: "또는 이 두 곳" })
      .getByRole("button");
    await expect(alts).toHaveCount(2);
    await expect(alts.first()).toHaveAccessibleName(/도보 \d+ 분/);
  });

  test("지도: 마커를 건너뛰는 링크와 시트 손잡이", async ({ page }) => {
    await mockRecommendSdks(page);
    await checkPage(page, "/map", "map-located");
    await expect(
      page.getByRole("button", { name: /테스트식당1,/ }),
    ).toBeVisible();
    const mobile = test.info().project.name === "mobile";
    // 새로 연 화면의 첫 Tab
    await page.goto("/map");
    await expect(
      page.getByRole("button", { name: /테스트식당1,/ }),
    ).toBeVisible();
    await page.keyboard.press("Tab");
    const skip = page.getByRole("button", { name: "목록으로 건너뛰기" });
    if (!mobile) {
      // 데스크톱은 목록이 지도보다 앞이라 건너뛰기가 없다
      await expect(skip).toHaveCount(0);
      return;
    }
    await expect(skip).toBeFocused();
    const box = await skip.boundingBox();
    expect(box && box.width > 1 && box.height >= 44).toBeTruthy();
    await page.keyboard.press("Enter");
    const sheet = page.getByRole("region", { name: "주변 식당" });
    await expect(sheet).toBeFocused();
    // 다음 Tab은 마커가 아니라 시트 안
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(
        () =>
          !!document.activeElement?.closest("#lm-map-sheet") &&
          !document.activeElement?.closest("[role=application]"),
      ),
    ).toBe(true);
    // 손잡이(보이는 28)는 위아래 8씩 넓힌 칸까지 눌린다
    const handle = sheet.getByRole("button", { name: /시트 (올리기|내리기)/ });
    const hb = (await handle.boundingBox())!;
    const hit = await page.evaluate(
      ([x, y1, y2]) => {
        const h = document.querySelector("#lm-map-sheet button");
        const a = document.elementFromPoint(x!, y1!);
        const b = document.elementFromPoint(x!, y2!);
        return !!h && !!a && !!b && h.contains(a) && h.contains(b);
      },
      [hb.x + hb.width / 2, hb.y - 7, hb.y + hb.height + 7],
    );
    expect(hit).toBe(true);
  });
});

test.describe("실제 화면: 로그인 (실제 DB)", () => {
  test.skip(!env, "RUN_DB_E2E=1과 .env.local Supabase 값이 있을 때만");
  test.use({ reducedMotion: "reduce" });

  test("나, 설정, 투표, 회식, 투표방, 관리자", async ({
    page,
    context,
    baseURL,
  }) => {
    test.setTimeout(600_000);
    const signed = await signInContext(context, env!, baseURL!, "a11y");
    try {
      const token = signed.session.access_token;
      // 관리자 지정은 준비 전용(secret 키, admin.spec.ts와 같은 방법). 화면은 사용자 세션으로 본다
      await adminPatch(env!, "profiles", `user_id=eq.${signed.user.id}`, {
        role: "admin",
        nickname: "test_접근성",
        terms_agreed_at: new Date().toISOString(),
        birth_confirmed_at: new Date().toISOString(),
      });
      const office = await rest(env!, "offices", {
        method: "POST",
        token,
        body: {
          user_id: signed.user.id,
          name: "회사",
          lat: HERE.latitude,
          lng: HERE.longitude,
        },
      });
      expect(office.status).toBe(201);
      await mockRecommendSdks(page);
      for (const [path, name] of [
        ["/today", "today"],
        ["/map", "map"],
        ["/me", "me"],
        ["/me/settings", "me-settings"],
        ["/me/account", "me-account"],
        ["/me/avoid", "me-avoid"],
        ["/me/budget", "me-budget"],
        ["/me/contact", "me-contact"],
        ["/me/craving", "me-craving"],
        ["/me/display", "me-display"],
        ["/me/offices", "me-offices"],
        ["/me/offices/new", "me-offices-new"],
        ["/poll", "poll"],
        ["/poll/party", "party"],
        ["/admin", "admin"],
      ] as const)
        await checkPage(page, path, name);

      const places = [0, 1, 2].map(fakePlaceId);
      const created = await rpc<{ poll_id: string; invite_code: string }[]>(
        env!,
        "create_poll",
        {
          p_kind: "lunch",
          p_title: "test_접근성",
          p_closes_at: new Date(Date.now() + 30 * 60_000).toISOString(),
          p_multi: false,
          p_place_ids: places,
          p_place_urls: places.map((p) => `https://place.map.kakao.com/${p}`),
          p_anchor_lat: HERE.latitude,
          p_anchor_lng: HERE.longitude,
          p_radius_m: 600,
        },
        token,
      );
      expect(created.error).toBeNull();
      const code = created.data![0]!.invite_code;
      await checkPage(page, `/poll/${code}`, "poll-room");
      await context.clearCookies();
      await checkPage(page, `/poll/${code}`, "poll-preview");
    } finally {
      await signed.cleanup();
    }
  });

  test("약관 동의와 온보딩", async ({ page, context, baseURL }) => {
    test.setTimeout(180_000);
    const signed = await signInContext(context, env!, baseURL!, "a11y2");
    try {
      await mockRecommendSdks(page);
      await checkPage(page, "/welcome/terms", "welcome-terms");
      await adminPatch(env!, "profiles", `user_id=eq.${signed.user.id}`, {
        terms_agreed_at: new Date().toISOString(),
        birth_confirmed_at: new Date().toISOString(),
      });
      await checkPage(page, "/welcome/onboarding", "onboarding");
    } finally {
      await signed.cleanup();
    }
  });
});
