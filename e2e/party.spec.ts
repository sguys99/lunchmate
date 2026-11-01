// 회식 모드 /poll/party E2E (T7.25~T7.28, D-16). 로그인 테스트 사용자(test_ 접두) + 가짜 카카오, 네이버 SDK.
// - 첫 사용: 질문 2개(인원, 예산) → 결과 5곳, 근거 줄, 조건 기기 저장. 두 번째 방문은 질문 없이 바로 결과.
// - 조건 문장 낱말로 하나만 고치기(주류 켬 → 카페, 분식, 샐러드, 패스트푸드 제외), 체크 해제와 2곳 미만 안내.
// - 4상태(로딩 뼈대는 지연 검색으로, 오류는 SDK 실패, 오프라인은 연결 끊김), 라이트, 다크 axe.
// 실행: RUN_DB_E2E=1 NEXT_PUBLIC_DESIGN_LAB=true pnpm exec playwright test e2e/party.spec.ts (dev 서버에 디자인 랩 플래그 필요)
// 캡처: PARTY_SHOTS=<폴더>를 주면 화면을 남긴다.
import { expect, test, type Page } from "@playwright/test";
import { rest } from "../src/lib/supabase/rls/harness";
import { expectNoA11yViolations } from "./helpers/axe";
import { mockRecommendSdks } from "./helpers/kakao-places-fake";
import { loadDbE2eEnv, signInContext } from "./helpers/session";

const env = loadDbE2eEnv();
const OFFICE = { lat: 37.5665, lng: 126.978 };
const shotsDir = process.env.PARTY_SHOTS;
const isMobileProject = () => test.info().project.name === "mobile";

async function shot(page: Page, name: string) {
  if (!shotsDir) return;
  const width = isMobileProject() ? 390 : 1280;
  await page.screenshot({
    path: `${shotsDir}/poll-party__${width}__${name}.png`,
  });
}

async function setUp(
  page: Page,
  context: Parameters<typeof signInContext>[0],
  baseURL: string,
  label: string,
) {
  const signed = await signInContext(context, env!, baseURL, label);
  const token = signed.session.access_token;
  const userId = signed.user.id;
  const agreed = await rest(env!, `profiles?user_id=eq.${userId}`, {
    method: "PATCH",
    token,
    body: {
      terms_agreed_at: new Date().toISOString(),
      birth_confirmed_at: new Date().toISOString(),
      nickname: "test_회식",
    },
  });
  expect(agreed.status).toBe(200);
  const office = await rest(env!, "offices", {
    method: "POST",
    token,
    body: { user_id: userId, name: "회사", lat: OFFICE.lat, lng: OFFICE.lng },
  });
  expect(office.status).toBe(201);
  return signed;
}

test.describe("회식 모드 (T7.25~T7.28)", () => {
  test.skip(!env, "RUN_DB_E2E=1과 Supabase 값(.env.local)이 있어야 실행합니다");

  for (const scheme of ["light", "dark"] as const) {
    test(`첫 사용 질문 2개 → 결과 5곳, 다시 오면 바로 결과 (${scheme})`, async ({
      page,
      context,
      baseURL,
    }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await mockRecommendSdks(page);
      const signed = await setUp(page, context, baseURL!, `pt${scheme[0]}`);
      try {
        await page.goto("/poll/party");
        await expect(
          page.getByRole("heading", { name: "몇 명이 가나요?" }),
        ).toBeVisible();
        await expectNoA11yViolations(page);
        await shot(page, `${scheme}__q1`);
        await page.getByRole("button", { name: "10명" }).click();
        await page.getByRole("button", { name: "다음" }).click();
        await expect(
          page.getByRole("heading", { name: "1인 예산은 얼마쯤인가요?" }),
        ).toBeVisible();
        await shot(page, `${scheme}__q2`);
        await page.getByRole("button", { name: "4만 원" }).click();
        await page.getByRole("button", { name: "후보 찾기" }).click();

        await expect(
          page.getByRole("heading", { name: "회식 후보 5곳" }),
        ).toBeVisible();
        const list = page.getByRole("list", { name: "회식 후보" });
        await expect(list.locator(":scope > li")).toHaveCount(5);
        await expect(
          page.getByRole("button", { name: "5곳으로 투표 만들기" }),
        ).toBeEnabled();
        await expectNoA11yViolations(page);
        await shot(page, `${scheme}__results`);

        // 360px에서 가로 넘침이 없다(CLAUDE.md 6.2)
        if (isMobileProject()) {
          await page.setViewportSize({ width: 360, height: 780 });
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
          );
          expect(overflow).toBeLessThanOrEqual(0);
          await shot(page, `${scheme}__360`);
          await page.setViewportSize({ width: 390, height: 844 });
        }

        // 조건은 기기에만, 4개만
        const saved = await page.evaluate(() =>
          localStorage.getItem("lm.party.conditions.v1"),
        );
        expect(JSON.parse(saved!)).toEqual({
          headcount: 10,
          budget: 40_000,
          room: false,
          alcohol: false,
        });

        // 주류 켜기: 고치기 칸 → 적용 → 근거 줄에 주류
        await page.getByRole("button", { name: /^주류 바꾸기/ }).click();
        await expect(
          page.getByRole("heading", { name: "주류", level: 2 }),
        ).toBeFocused();
        await page
          .getByRole("button", { name: "술도 함께", exact: true })
          .click();
        await shot(page, `${scheme}__edit-alcohol`);
        await page.getByRole("button", { name: "적용" }).click();
        await expect(
          page.getByRole("button", { name: /^주류 바꾸기, 주류$/ }),
        ).toBeFocused();
        await expect(list.getByText(/^주류/).first()).toBeVisible();
        for (const word of ["분식", "샐러드", "패스트푸드"]) {
          await expect(list.getByText(word, { exact: true })).toHaveCount(0);
        }

        // 기준 위치를 지도에서 찍는다(D-16 안건 9). 사용자가 놓은 핀만 기준이 되고, 닫히면 바꾸기로 초점이 돌아온다
        const change = page.getByRole("button", { name: "기준 위치 바꾸기" });
        await change.click();
        await page.getByRole("button", { name: "지도에서 찍기" }).click();
        const picker = page.getByRole("region", { name: "지도에서 기준 찍기" });
        await expect(picker.getByTestId("onboarding-map")).toBeVisible();
        const confirm = picker.getByRole("button", { name: "이 위치로" });
        await expect(confirm).toHaveAttribute("aria-disabled", "true");
        await picker.getByTestId("onboarding-map").click({
          position: { x: 60, y: 40 },
        });
        await expect(picker.getByTestId("anchor-pin-status")).toHaveText(
          /핀을 놓았습니다/,
        );
        await expectNoA11yViolations(page);
        await confirm.click();
        await expect(picker).toHaveCount(0);
        await expect(change).toBeFocused();
        await expect(page.getByText("지도에서 찍은 곳 기준")).toBeVisible();
        await expect(list.locator(":scope > li").first()).toBeVisible();

        // "N곳으로 투표 만들기"는 투표 묶음 레이아웃의 시트 자리 하나로 열린다(T7.28). 만든 방은 만들기 취소로 지운다
        await page
          .getByRole("button", { name: /^\d곳으로 투표 만들기$/ })
          .click();
        await expect(
          page.getByRole("heading", { name: "투표방을 만들었어요" }),
        ).toBeVisible({ timeout: 15_000 });
        await expect(page.getByRole("dialog")).toHaveCount(1);
        await page.getByRole("button", { name: "만들기 취소" }).click();
        await expect(page.getByRole("dialog")).toHaveCount(0);

        // 체크를 3곳 빼면 2곳, 4곳 빼면 안내
        const boxes = list.getByRole("checkbox");
        for (let i = 0; i < 4; i++) await boxes.nth(i).click();
        await expect(page.getByText("2곳 이상 골라 주세요.")).toBeVisible();
        await expect(
          page.getByRole("button", { name: "1곳으로 투표 만들기" }),
        ).toHaveAttribute("aria-disabled", "true");

        // 다시 오면 질문 없이 결과
        await page.reload();
        await expect(
          page.getByRole("heading", { name: /^회식 후보 \d곳$/ }),
        ).toBeVisible();
        await expect(
          page.getByRole("heading", { name: "몇 명이 가나요?" }),
        ).toHaveCount(0);
      } finally {
        await signed.cleanup();
      }
    });
  }

  test("로딩 뼈대, 카카오 오류, 오프라인", async ({
    page,
    context,
    baseURL,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockRecommendSdks(page, { searchDelayMs: 2_500 });
    const signed = await setUp(page, context, baseURL!, "pts");
    try {
      await page.addInitScript(() =>
        localStorage.setItem(
          "lm.party.conditions.v1",
          JSON.stringify({
            headcount: 8,
            budget: 40000,
            room: true,
            alcohol: true,
          }),
        ),
      );
      await page.goto("/poll/party");
      await expect(page.locator("[aria-busy=true]")).toBeVisible();
      await shot(page, "light__loading");
      await expect(
        page.getByRole("heading", { name: /^회식 후보 \d곳$/ }),
      ).toBeVisible({ timeout: 15_000 });
      await shot(page, "light__results-room");

      // 오프라인: 받은 결과는 그대로 둔다. 새로 열면 오프라인 안내
      await context.setOffline(true);
      await page.reload().catch(() => undefined);
      await context.setOffline(false);

      // 카카오 SDK 실패 → 재시도 1회 뒤 오류 + 네이버 지도
      await page.unroute("https://dapi.kakao.com/v2/maps/sdk.js**");
      await page.route("https://dapi.kakao.com/v2/maps/sdk.js**", (r) =>
        r.abort(),
      );
      await page.goto("/poll/party");
      await expect(
        page.getByText("식당 정보를 불러오지 못했습니다"),
      ).toBeVisible({ timeout: 20_000 });
      await expect(
        page.getByRole("link", { name: "네이버 지도에서 주변 식당 보기" }),
      ).toBeVisible();
      await expectNoA11yViolations(page);
      await shot(page, "light__error");
    } finally {
      await signed.cleanup();
    }
  });

  test("오프라인으로 열면 안내", async ({ page, context, baseURL }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockRecommendSdks(page);
    const signed = await setUp(page, context, baseURL!, "pto");
    try {
      await page.addInitScript(() =>
        localStorage.setItem(
          "lm.party.conditions.v1",
          JSON.stringify({
            headcount: 8,
            budget: 40000,
            room: false,
            alcohol: false,
          }),
        ),
      );
      await page.goto("/poll/party");
      await expect(
        page.getByRole("heading", { name: /^회식 후보 \d곳$/ }),
      ).toBeVisible();
      await context.setOffline(true);
      await page.evaluate(() => window.dispatchEvent(new Event("offline")));
      // 받은 결과는 그대로(오프라인 안내는 결과가 없을 때만)
      await expect(page.getByRole("list", { name: "회식 후보" })).toBeVisible();
      await context.setOffline(false);
    } finally {
      await signed.cleanup();
    }
  });
});
