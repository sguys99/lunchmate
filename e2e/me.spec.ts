// 나 탭 E2E (T4.23~T4.27 설정, SET-01~05, T6.13 기록 HIS-01~03). 클라우드 개발 DB에 test_rls_ 사용자를 만들고 끝나면 지운다.
// 설정은 T6.13부터 /me/settings(머리줄 톱니, 기록 탭 맨 아래 줄), 화면 설정은 /me/display(D-12 안건 1, 5).
//
// 실행: RUN_DB_E2E=1 PLAYWRIGHT_BASE_URL=http://localhost:3100 pnpm exec playwright test --project=mobile --project=desktop e2e/me.spec.ts
// - RUN_DB_E2E가 없거나 Supabase 값이 없으면 건너뛴다(평소 pnpm test:e2e는 클라우드 DB를 건드리지 않음).
// - 약관 동의와 첫 사무실은 본인 세션 REST로 미리 만든다(온보딩은 onboarding.spec.ts 범위).
// - 지도 SDK는 가짜(map-sdk-mocks.ts), 기록의 장소 이름은 가짜 카카오 검색(kakao-places-fake.ts) id로 맞춘다.
// - 기록 준비: 방문은 본인 세션으로 넣고(트리거가 오늘로 둔다) 후기도 본인 세션으로 남긴 뒤, 지난 날짜로 옮기는 것만
//   secret 키 REST로 한다(visited_on은 사용자 권한으로 바꿀 수 없다). 화면과 단언은 사용자 세션(RLS)으로 한다.
// - ME_SHOTS_DIR을 주면 화면 캡처를 그 폴더에 남긴다(확인용, 기준 이미지 아님).
import { expect, test, type Page } from "@playwright/test";
import { rest } from "../src/lib/supabase/rls/harness";
import { expectNoA11yViolations } from "./helpers/axe";
import { fakePlaceId, mockRecommendSdks } from "./helpers/kakao-places-fake";
import { FAKE_PX_DEG, mockMapSdks } from "./helpers/map-sdk-mocks";
import { loadDbE2eEnv, readOwn, signInContext } from "./helpers/session";

const env = loadDbE2eEnv();
const shotsDir = process.env.ME_SHOTS_DIR;

/** 패널 페이드(base)가 끝난 뒤 검사한다(중간 투명도에서 대비 검사가 틀리지 않게) */
async function settle(page: Page) {
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== "running"),
  );
}

async function shot(page: Page, name: string) {
  if (!shotsDir) return;
  await settle(page);
  const project = test.info().project.name;
  await page.screenshot({
    // 6단계 캡처 이름(feedback-live, report-live와 같은 꼴): me-live__<화면>__<프로젝트>.png
    path: `${shotsDir}/me-live__${name.replace(/^me-/, "")}__${project}.png`,
    fullPage: true,
  });
}

type Seed =
  | "candidate"
  | "not_visited"
  | {
      rating: "up" | "down";
      body?: string;
      price?: number;
      tags?: string[];
      isPublic?: boolean;
    };

/** 오늘(KST)부터 days일 뒤 날짜 키 */
function kstKey(days: number): string {
  const d = new Date(Date.now() + 9 * 3_600_000 + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** 준비 전용: 방문일을 지난 날로 옮긴다(사용자 권한 밖이라 secret 키). 단언에는 쓰지 않는다 */
async function adminPatch(path: string, body: unknown) {
  const res = await fetch(`${env!.url}/rest/v1/${path}`, {
    method: "PATCH",
    headers: {
      apikey: env!.secretKey,
      Authorization: `Bearer ${env!.secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  expect(res.status).toBeLessThan(300);
}

test.describe("나 탭", () => {
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

  test("설정 화면, 화면 모드(첫 페인트 적용), 이름 수정", async ({
    page,
    context,
    baseURL,
  }) => {
    const { cleanup, token } = await setup(context, baseURL!, "me1");
    try {
      // 나 탭 머리줄 톱니 → 설정
      await page.goto("/me");
      await expect(page.getByRole("heading", { name: "나" })).toBeVisible();
      await page.getByRole("link", { name: "설정", exact: true }).click();
      await expect(page).toHaveURL(/\/me\/settings$/);
      await expect(page.getByRole("heading", { name: "설정" })).toBeVisible();
      await expect(
        page.getByRole("link", { name: /사무실\s*회사/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /예산과 거리.*점심 1만/ }),
      ).toBeVisible();
      await expectNoA11yViolations(page);
      await shot(page, "me-settings");

      // 화면 줄 → /me/display. 다크를 고르면 바로 적용되고, 새로 고침해도 첫 페인트부터 다크다
      await page.getByRole("link", { name: /^화면/ }).click();
      await expect(page).toHaveURL(/\/me\/display$/);
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
      // 뒤로 → 설정, 줄 값에 고른 화면 모드
      await page.getByRole("link", { name: "뒤로" }).click();
      await expect(page).toHaveURL(/\/me\/settings$/);
      await expect(
        page.getByRole("link", { name: /화면\s*시스템, 모션 줄임/ }),
      ).toBeVisible();

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

  test("좋아하는 음식 저장, 5개까지 (SET-06, T9.17)", async ({
    page,
    context,
    baseURL,
  }) => {
    const { cleanup, token } = await setup(context, baseURL!, "me6");
    try {
      await page.goto("/me/settings");
      await expect(
        page.getByRole("link", { name: /좋아하는 음식/ }),
      ).toContainText("고르지 않음");
      await page.goto("/me/liked");
      const save = page.getByRole("button", { name: "저장" });
      await expect(save).toHaveAttribute("aria-disabled", "true");
      for (const name of ["한식", "국밥", "일식", "분식", "샐러드"]) {
        await page.getByRole("button", { name, exact: true }).click();
      }
      // 5개가 차면 나머지 타일은 비활성(aria-disabled)이고 안내 문장이 바뀐다
      const meat = page.getByRole("button", { name: "고기", exact: true });
      await expect(meat).toHaveAttribute("aria-disabled", "true");
      await expect(meat).toHaveAttribute("aria-pressed", "false");
      await expect(
        page.getByText("5개를 모두 골랐습니다", { exact: false }).first(),
      ).toBeVisible();
      await shot(page, "me-liked");
      await save.click();
      await expect(
        page.getByText("저장했습니다. 다음 추천부터 반영합니다"),
      ).toBeVisible();
      const prefs = await readOwn<{ liked_categories: string[] }[]>(
        env!,
        token,
        "preferences?select=liked_categories",
      );
      expect(prefs[0]?.liked_categories).toEqual([
        "bunsik",
        "gukbap",
        "hansik",
        "ilsik",
        "salad",
      ]);
    } finally {
      await cleanup();
    }
  });

  test("기록: 주 묶음, 이번 달 숫자, 늦은 답, 장소 해제, 후기 삭제 (T6.13)", async ({
    page,
    context,
    baseURL,
  }) => {
    await mockRecommendSdks(page);
    const { cleanup, token } = await setup(context, baseURL!, "me4");
    try {
      const today = kstKey(0);
      // [place, meal, source, 며칠 전, 답]
      const rows: [string, "lunch" | "dinner", string, number, Seed][] = [
        [fakePlaceId(0), "lunch", "rec", 0, { rating: "up" }],
        [fakePlaceId(1), "lunch", "rec", 0, { rating: "up" }],
        [fakePlaceId(2), "dinner", "poll", 0, { rating: "down" }],
        [
          fakePlaceId(3),
          "lunch",
          "rec",
          1,
          {
            rating: "up",
            body: "test_국물이 진합니다",
            price: 9000,
            tags: ["solo_ok", "quick_15"],
          },
        ],
        [fakePlaceId(4), "lunch", "map", 2, "candidate"],
        [fakePlaceId(5), "lunch", "rec", 9, "not_visited"],
        [
          "1234567",
          "lunch",
          "rec",
          10,
          { rating: "up", body: "test_비공개 메모", isPublic: false },
        ],
        [fakePlaceId(6), "dinner", "rec", 20, "candidate"],
      ];
      for (const [placeId, meal, source, ago, seed] of rows) {
        const v = await rest<{ id: string }[]>(env!, "visits", {
          method: "POST",
          token,
          body: {
            place_id: placeId,
            place_url: `https://place.map.kakao.com/${placeId}`,
            meal,
            source,
          },
        });
        expect(v.status).toBe(201);
        const id = v.data![0]!.id;
        if (seed === "not_visited") {
          await rest(env!, `visits?id=eq.${id}`, {
            method: "PATCH",
            token,
            body: { status: "not_visited" },
          });
        } else if (seed !== "candidate") {
          const r = await rest(env!, "reviews", {
            method: "POST",
            token,
            body: {
              visit_id: id,
              rating: seed.rating,
              body: seed.body ?? null,
              price_krw: seed.price ?? null,
              tags: seed.tags ?? [],
              is_public: seed.isPublic ?? true,
            },
          });
          expect(r.status).toBe(201);
        }
        if (ago > 0)
          await adminPatch(`visits?id=eq.${id}`, { visited_on: kstKey(-ago) });
      }
      for (const [table, ids] of [
        ["favorites", [fakePlaceId(3), "7654321"]],
        ["blocklist", [fakePlaceId(8)]],
      ] as const) {
        for (const placeId of ids) {
          const r = await rest(env!, table, {
            method: "POST",
            token,
            body: { place_id: placeId, place_url: null },
          });
          expect(r.status).toBe(201);
        }
      }

      await page.goto("/me");
      await expect(page.getByRole("tab", { name: "기록" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      // 이번 달 숫자: 오늘 다녀온 세 곳, 평가 3개라 % (11월 1일 기준이면 오늘만 이번 달)
      if (today.endsWith("-01")) {
        await expect(page.getByText("다녀온 횟수")).toBeVisible();
      }
      await expect(
        page.getByRole("heading", { name: /이번 주/ }),
      ).toBeVisible();
      // 이름 해석(가짜 카카오)과 미해결 대체
      await expect(
        page.getByRole("button", { name: /상세 보기$/ }).first(),
      ).toBeVisible();
      await expect(page.getByText(/에 간 곳$/).first()).toBeVisible();
      // 14일 지난 확인 전 방문은 답이 없고, 2일 전 방문은 세 답
      const ask = page.getByRole("group", { name: /다녀오셨나요/ });
      await expect(ask).toHaveCount(1);
      await settle(page);
      await expectNoA11yViolations(page);
      await shot(page, "me-history");
      // 이름을 누르면 상세 시트(D-12 안건 4)
      await page
        .getByRole("button", { name: /상세 보기$/ })
        .first()
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await settle(page);
      await shot(page, "me-detail");
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await ask.getByRole("button", { name: "좋았어요" }).click();
      await expect(page.getByText("기록했습니다.")).toBeVisible();
      const answered = await readOwn<{ status: string }[]>(
        env!,
        token,
        `visits?select=status&place_id=eq.${fakePlaceId(4)}`,
      );
      expect(answered[0]?.status).toBe("visited");
      // 지난 기록 더 보기(20일 전)
      await page.getByRole("button", { name: "지난 기록 더 보기" }).click();
      await expect(
        page.getByText("처음 기록까지 모두 봤습니다."),
      ).toBeVisible();
      await expect(
        page.getByRole("group", { name: /다녀오셨나요/ }),
      ).toHaveCount(0);

      // 장소: 즐겨찾기 끄면 흐리게 남고, 다시 안 갈 곳 해제 + 되돌리기
      await page.getByRole("tab", { name: "장소" }).click();
      await expect(page).toHaveURL(/tab=places/);
      const star = page.getByRole("button", { name: /즐겨찾기$/ }).first();
      await expect(star).toHaveAttribute("aria-pressed", "true");
      await settle(page);
      await expectNoA11yViolations(page);
      await shot(page, "me-places");
      await star.click();
      await expect(star).toHaveAttribute("aria-pressed", "false");
      await page.getByRole("button", { name: /다시 안 갈 곳 해제$/ }).click();
      await expect(page.getByText("다시 추천에 넣었습니다.")).toBeVisible();
      await page.getByRole("button", { name: /해제 되돌리기$/ }).click();
      await expect(
        page.getByRole("button", { name: /다시 안 갈 곳 해제$/ }),
      ).toBeVisible();
      const favs = await readOwn<{ place_id: string }[]>(
        env!,
        token,
        "favorites?select=place_id",
      );
      expect(favs).toHaveLength(1);
      const blocks = await readOwn<{ place_id: string }[]>(
        env!,
        token,
        "blocklist?select=place_id",
      );
      expect(blocks).toHaveLength(1);

      // 후기: 나만 보기 글도 본인에게는 보이고, 미해결은 순번, 삭제는 그 자리 확인
      await page.getByRole("tab", { name: "후기" }).click();
      await expect(page.getByText("test_비공개 메모")).toBeVisible();
      await expect(page.getByText(/^남긴 후기 \d+$/)).toBeVisible();
      await settle(page);
      await expectNoA11yViolations(page);
      await shot(page, "me-reviews");
      // 수정은 식후 피드백 시트(D-11)를 그 후기로 연다
      await page
        .getByRole("button", { name: /후기 수정$/ })
        .first()
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await settle(page);
      await shot(page, "me-review-edit");
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page
        .getByRole("button", { name: /후기 삭제$/ })
        .first()
        .click();
      await expect(
        page.getByRole("group", { name: "이 후기를 지울까요?" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "지우기" }).click();
      await expect(page.getByText("후기를 지웠습니다.")).toBeVisible();
      const left = await readOwn<{ id: string }[]>(
        env!,
        token,
        "reviews?select=id",
      );
      expect(left).toHaveLength(5);

      // 다크 + 기록 탭 맨 아래 설정 줄
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto("/me");
      await shot(page, "me-history-dark");
      await page.getByRole("link", { name: /^설정\s*사무실/ }).click();
      await expect(page).toHaveURL(/\/me\/settings$/);
    } finally {
      await cleanup();
    }
  });
  test("기록: 첫 방문 빈 상태, 360px, 오프라인 (T6.13)", async ({
    page,
    context,
    baseURL,
  }) => {
    const { cleanup } = await setup(context, baseURL!, "me5");
    try {
      await page.setViewportSize({ width: 360, height: 780 });
      await page.goto("/me");
      await expect(
        page.getByRole("heading", { name: "아직 다녀온 곳이 없습니다" }),
      ).toBeVisible();
      // 이번 달 숫자 줄은 숨김, 이 화면의 주 버튼은 오늘 추천 보기 하나
      await expect(page.getByText("다녀온 횟수")).toHaveCount(0);
      await expect(
        page.getByRole("link", { name: "오늘 추천 보기" }),
      ).toBeVisible();
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      await settle(page);
      await expectNoA11yViolations(page);
      await shot(page, "me-empty-360");

      await context.setOffline(true);
      await page.getByRole("tab", { name: "장소" }).click();
      await expect(
        page.getByText("인터넷에 연결되어 있지 않습니다"),
      ).toBeVisible();
      await shot(page, "me-offline-360");
      await context.setOffline(false);
    } finally {
      await cleanup();
    }
  });
});
