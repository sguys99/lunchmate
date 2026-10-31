// 식후 피드백 E2E (T6.8~T6.10, T6.12, T6.14). FB-01~07, AC-FB-1, D-11.
//
// 실행
//   PLAYWRIGHT_BASE_URL=http://localhost:3100 pnpm test:e2e:feedback
//   (스크립트가 RUN_DB_E2E=1을 켠다. .env.local의 Supabase 값이 있을 때만 돈다. FEEDBACK_SHOTS=1이면 캡처를 남긴다)
// - 클라우드 개발 DB에 test_rls_ 사용자를 만들고(약관 동의, 사무실 1곳, 어제 방문 후보 1곳) 끝나면 지운다(cascade).
//   방문일(visited_on)은 서버가 오늘로 정하므로 준비 단계에서만 secret 키로 어제로 옮긴다(RLS 테스트 adminPatch와 같은 방식).
//   화면과 단언은 사용자 세션(RLS 적용)으로 한다(CLAUDE.md 7.1).
// - 카카오 SDK는 가짜(음식점 45곳)라 띠의 이름은 세션 메모리에서 찾는다(T5.12a 1단계).
// - "피드백 제출 후 다음 추천 변화"(T6.30)는 이 파일 범위 밖이다.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { adminPatch, rest } from "../src/lib/supabase/rls/harness";
import { expectNoA11yViolations } from "./helpers/axe";
import { fakePlaceId, mockRecommendSdks } from "./helpers/kakao-places-fake";
import { loadDbE2eEnv, readOwn, signInContext } from "./helpers/session";

const env = loadDbE2eEnv();
const OFFICE = { lat: 37.5665, lng: 126.978 };
const SHOTS = process.env.FEEDBACK_SHOTS === "1";
const SHOT_DIR = join(process.cwd(), "docs/design/shots/2026-11-01");

// FEEDBACK_DARK=1이면 다크 모드로(캡처용)
test.use({ colorScheme: process.env.FEEDBACK_DARK === "1" ? "dark" : "light" });
// FEEDBACK_360=1이면 최소 폭 360에서(캡처용, 가로 넘침 확인)
if (process.env.FEEDBACK_360 === "1") test.use({ viewport: { width: 360, height: 780 } });

/** KST 날짜 키(오늘에서 days만큼) */
function kstDate(days: number): string {
  const d = new Date(Date.now() + 9 * 3_600_000 + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  mkdirSync(SHOT_DIR, { recursive: true });
  const project =
    process.env.FEEDBACK_360 === "1"
      ? "360"
      : test.info().project.name === "mobile"
        ? "390"
        : "1280";
  // 가로 넘침이 없어야 한다(최소 360)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const scheme = await page.evaluate(() =>
    matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );
  // 움직임이 끝난 뒤 찍는다(시트 slow 300, 띠 높이 base 260)
  await page.waitForTimeout(450);
  await page.screenshot({
    path: join(SHOT_DIR, `feedback-live__${name}__${project}-${scheme}.png`),
  });
}

/** 시트, 띠 전환이 끝난 뒤 axe를 돌린다(전환 중 반투명 면에서 대비를 잘못 재지 않게) */
async function axe(page: Page, include: string) {
  await page.waitForTimeout(400);
  await expectNoA11yViolations(page, { include });
}

async function stubNaverWeb(context: BrowserContext) {
  await context.route("https://map.naver.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>naver map stub</title>",
    }),
  );
}

/** 로그인 사용자 + 약관 + 사무실 + 어제 점심 방문 후보(답 없음) */
async function setup(
  page: Page,
  context: BrowserContext,
  baseURL: string,
  label: string,
  opts: { yesterdayVisit: boolean },
) {
  await mockRecommendSdks(page);
  // dev 서버의 Next 개발 도구 배지가 좁은 화면에서 아래 왼쪽 버튼을 가린다(프로덕션에는 없음)
  await page.addInitScript(() => {
    addEventListener("DOMContentLoaded", () => {
      const st = document.createElement("style");
      st.textContent = "nextjs-portal{display:none!important}";
      document.head.append(st);
    });
  });
  const signed = await signInContext(context, env!, baseURL, label);
  const token = signed.session.access_token;
  const userId = signed.user.id;
  const agreed = await rest(env!, `profiles?user_id=eq.${userId}`, {
    method: "PATCH",
    token,
    body: {
      terms_agreed_at: new Date().toISOString(),
      birth_confirmed_at: new Date().toISOString(),
      nickname: `test_${label}`,
    },
  });
  expect(agreed.status).toBe(200);
  const office = await rest(env!, "offices", {
    method: "POST",
    token,
    body: { user_id: userId, name: "회사", lat: OFFICE.lat, lng: OFFICE.lng },
  });
  expect(office.status).toBe(201);

  let visitId: string | null = null;
  if (opts.yesterdayVisit) {
    const placeId = fakePlaceId(7);
    const v = await rest<{ id: string }[]>(env!, "visits", {
      method: "POST",
      token,
      body: {
        user_id: userId,
        place_id: placeId,
        place_url: `https://place.map.kakao.com/${placeId}`,
        meal: "lunch",
        source: "rec",
      },
    });
    expect(v.status).toBe(201);
    visitId = v.data![0]!.id;
    const y = kstDate(-1);
    await adminPatch(env!, "visits", `id=eq.${visitId}`, {
      visited_on: y,
      created_at: `${y}T03:10:00Z`,
    });
  }
  return { token, userId, visitId, cleanup: signed.cleanup };
}

const band = (page: Page) => page.getByRole("region", { name: "어제 식사" });

test.describe("식후 피드백: 홈 띠와 시트", () => {
  test.skip(!env, "RUN_DB_E2E=1과 Supabase 값(.env.local)이 있어야 실행합니다");

  test("FB-01, AC-FB-1: 띠가 추천을 막지 않고 한 탭으로 답한 뒤 시트에서 세부를 남긴다", async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await setup(page, context, baseURL!, "fb1", {
      yesterdayVisit: true,
    });
    try {
      await page.goto("/today");
      // 추천 카드와 띠가 함께 보인다(띠는 따로 불러온다)
      await expect(page.locator(".lm-today-deck article h2")).toBeVisible({
        timeout: 20_000,
      });
      const ask = band(page).getByRole("heading", { level: 2 });
      await expect(ask).toContainText(/어제 간 .+, 어땠어요\?/, {
        timeout: 15_000,
      });
      await shot(page, "home-ask");
      await axe(page, '[aria-label="어제 식사"]');

      // AC-FB-1: 3초 안에 답할 수 있다(버튼이 바로 눌린다)
      const started = Date.now();
      await band(page).getByRole("button", { name: "좋았어요" }).click();
      await expect(band(page).getByText("알려 줘서 고마워요")).toBeVisible();
      expect(Date.now() - started).toBeLessThan(3_000);
      // 누른 버튼이 사라지므로 초점은 고마움 줄로
      await expect(page.locator(":focus")).toContainText("알려 줘서 고마워요");
      const more = band(page).getByRole("button", {
        name: "가격, 태그, 한 줄 후기 남기기",
      });
      await expect(more).not.toHaveAttribute("aria-disabled", "true");
      await shot(page, "home-thanks");

      // 서버에 👍가 남았다(본인 세션으로 확인)
      await expect
        .poll(async () =>
          readOwn<{ status: string }[]>(
            env!,
            s.token,
            `visits?id=eq.${s.visitId}&select=status`,
          ),
        )
        .toEqual([{ status: "visited" }]);

      await more.click();
      const sheet = page.getByRole("dialog");
      await expect(sheet.getByRole("heading", { name: /후기$/ })).toBeVisible();
      await expect(
        sheet.getByText(
          "나만 보기를 골라도 가격, 만족 여부, 태그는 이름 없이 식당 집계에 들어갑니다.",
        ),
      ).toBeVisible();
      const save = sheet.getByRole("button", { name: "남기기" });
      await expect(save).toHaveAttribute("aria-disabled", "true");
      await shot(page, "sheet-empty");

      await sheet.getByRole("button", { name: "500원 올리기" }).click();
      await sheet.getByRole("button", { name: "혼밥 OK" }).click();
      await sheet.getByRole("button", { name: "15분 컷" }).click();
      await sheet.getByLabel("한 줄 후기").fill("국물이 진하고 회전이 빠릅니다");
      await shot(page, "sheet-filled");
      await axe(page, '[role="dialog"]');
      await save.click();
      await expect(sheet).toHaveCount(0);
      await expect(
        band(page).getByText("남겼습니다. 다음 추천에 반영합니다."),
      ).toBeVisible();
      await shot(page, "home-saved");

      const reviews = await readOwn<
        { rating: string; price_krw: number | null; tags: string[]; body: string | null }[]
      >(env!, s.token, "reviews?select=rating,price_krw,tags,body");
      expect(reviews).toHaveLength(1);
      expect(reviews[0]).toMatchObject({
        rating: "up",
        body: "국물이 진하고 회전이 빠릅니다",
      });
      expect([...reviews[0]!.tags].sort()).toEqual(["quick_15", "solo_ok"]);
      expect(reviews[0]!.price_krw).not.toBeNull();
    } finally {
      await s.cleanup();
    }
  });

  test("D-11 안건 2: 답하지 않고 길찾기를 누르면 띠가 한 줄로 접힌다", async ({
    page,
    context,
    baseURL,
  }) => {
    await stubNaverWeb(context);
    const s = await setup(page, context, baseURL!, "fb2", {
      yesterdayVisit: true,
    });
    try {
      await page.goto("/today");
      await expect(band(page).getByRole("heading", { level: 2 })).toBeVisible({
        timeout: 20_000,
      });
      const hero = (
        await page.locator(".lm-today-deck article h2").innerText()
      ).trim();
      const popup = context.waitForEvent("page").catch(() => null);
      await page.getByRole("button", { name: `${hero} 길찾기` }).click();
      const p = await popup;
      await p?.close();
      const folded = band(page).getByRole("button", {
        name: "어제 식사 피드백 남기기",
      });
      await expect(folded).toBeVisible();
      await shot(page, "home-collapsed");

      // 접힌 줄에서 열면 한 탭 답부터
      await folded.click();
      const sheet = page.getByRole("dialog");
      await expect(sheet.getByRole("heading", { name: "어땠어요?" })).toBeVisible();
      await shot(page, "sheet-rate");
      await sheet.getByRole("button", { name: "별로였어요" }).click();
      await sheet.getByRole("button", { name: "남기기" }).click();
      await expect(sheet).toHaveCount(0);
      await expect(band(page).getByText("알려 줘서 고마워요")).toBeVisible();
    } finally {
      await s.cleanup();
    }
  });
});

test.describe("식후 피드백: 상세에서 쓰고 고치기", () => {
  test.skip(!env, "RUN_DB_E2E=1과 Supabase 값(.env.local)이 있어야 실행합니다");

  test("FB-06, FB-07: 상세에서 한 탭 답 필수로 쓰고, 항목 줄로 그 항목을 고친다", async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await setup(page, context, baseURL!, "fb3", {
      yesterdayVisit: false,
    });
    try {
      await page.goto("/today");
      const heroName = (
        await page
          .locator(".lm-today-deck article h2")
          .innerText({ timeout: 20_000 })
      ).trim();
      await page.getByRole("button", { name: `${heroName} 상세` }).click();
      const detail = page.getByRole("dialog");
      await detail.getByRole("button", { name: /^후기 후기/ }).click();
      const write = detail.getByRole("button", { name: "후기 쓰기" });
      await expect(write).toBeVisible({ timeout: 10_000 });
      await expect(detail.getByText("아직 다른 사람 후기가 없습니다.")).toBeVisible();
      await shot(page, "detail-empty");

      await write.click();
      const sheet = page.getByRole("dialog", { name: `${heroName} 후기` });
      const save = sheet.getByRole("button", { name: "남기기" });
      await expect(save).toHaveAttribute("aria-disabled", "true");
      await shot(page, "sheet-write");
      await sheet.getByRole("button", { name: "좋았어요" }).click();
      await sheet.getByRole("button", { name: "가성비" }).click();
      await sheet.getByRole("button", { name: "나만 보기" }).click();
      await save.click();
      await expect(sheet).toHaveCount(0);
      await expect(
        detail.getByText("후기를 남겼습니다. 다음 추천에 반영합니다."),
      ).toBeVisible();
      const priceRow = detail.getByRole("button", { name: /^1인 가격\s*비어 있음\s*,\s*고치기$/ });
      await expect(priceRow).toBeVisible({ timeout: 10_000 });
      await expect(detail.getByText(/월 방문, 나만 보기/)).toBeVisible();
      await shot(page, "detail-mine");
      await axe(page, '[role="dialog"]');

      await priceRow.click();
      const edit = page.getByRole("dialog", { name: "내 후기 수정" });
      await expect(edit.getByRole("button", { name: "500원 내리기" })).toBeFocused();
      await shot(page, "sheet-edit-price");
      await edit.getByRole("button", { name: "내 후기 삭제" }).click();
      await expect(edit.getByRole("heading", { name: "후기를 지울까요?" })).toBeVisible();
      await shot(page, "sheet-delete");
      await edit.getByRole("button", { name: "지우기" }).click();
      await expect(edit).toHaveCount(0);
      await expect(detail.getByText("후기를 지웠습니다.")).toBeVisible();
      const left = await readOwn<unknown[]>(env!, s.token, "reviews?select=id");
      expect(left).toHaveLength(0);
    } finally {
      await s.cleanup();
    }
  });
});
