// 식후 피드백 E2E (T6.8~T6.10, T6.12, T6.14). FB-01~07, AC-FB-1, D-11.
//
// 실행
//   PLAYWRIGHT_BASE_URL=http://localhost:3100 pnpm test:e2e:feedback
//   (스크립트가 RUN_DB_E2E=1을 켠다. .env.local의 Supabase 값이 있을 때만 돈다. FEEDBACK_SHOTS=1이면 캡처를 남긴다)
// - 클라우드 개발 DB에 test_rls_ 사용자를 만들고(약관 동의, 사무실 1곳, 어제 방문 후보 1곳) 끝나면 지운다(cascade).
//   방문일(visited_on)은 서버가 오늘로 정하므로 준비 단계에서만 secret 키로 어제로 옮긴다(RLS 테스트 adminPatch와 같은 방식).
//   화면과 단언은 사용자 세션(RLS 적용)으로 한다(CLAUDE.md 7.1).
// - 카카오 SDK는 가짜(음식점 45곳)라 띠의 이름은 세션 메모리에서 찾는다(T5.12a 1단계).
// - "피드백 제출 후 다음 추천 변화"(T6.30)는 e2e/feedback-reco.spec.ts가 맡는다.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { adminPatch, rest } from "../src/lib/supabase/rls/harness";
import { expectNoA11yViolations } from "./helpers/axe";
import { fakePlaceId, mockRecommendSdks } from "./helpers/kakao-places-fake";
import { capturePostHog, type CapturedEvent } from "./helpers/posthog-events";
import { loadDbE2eEnv, readOwn, signInContext } from "./helpers/session";

const env = loadDbE2eEnv();
const OFFICE = { lat: 37.5665, lng: 126.978 };
const SHOTS = process.env.FEEDBACK_SHOTS === "1";
const SHOT_DIR = join(process.cwd(), "docs/design/shots/2026-11-01");

// posthog-js는 HeadlessChrome 사용자 에이전트를 봇으로 보고 이벤트를 버린다. 이벤트 속성(stage, source)을 보려고 보통 Chrome 값으로 둔다
test.use({
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
});
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

/** 모은 PostHog 이벤트 중 feedback_submitted 속성(stage 확인, 2026-11-01) */
const submitted = (events: CapturedEvent[]) =>
  events
    .filter((e) => e.event === "feedback_submitted")
    .map((e) => ({
      rating: e.properties.rating,
      stage: e.properties.stage,
      has_price: e.properties.has_price,
      tag_count: e.properties.tag_count,
      has_review: e.properties.has_review,
    }));

/**
 * T6.9, D-11 6절: 390 × 844에서 스크롤 없이 공개 범위 고지 한 줄까지 보인다(고지 아래 끝이 고정 바닥 "남기기" 줄 위).
 * 모바일 프로젝트(390 × 844)에서만 본다. 시트가 다 올라온 뒤 잰다.
 */
async function expectNoticeAboveFold(page: Page) {
  const size = page.viewportSize();
  if (!size || size.width !== 390 || size.height !== 844) return;
  await page.waitForTimeout(450);
  const sheet = page.getByRole("dialog");
  const notice = await sheet
    .getByText(/식당 집계에 들어갑니다\.$/)
    .boundingBox();
  const footer = await sheet
    .getByRole("button", { name: /^(남기기|고친 내용 저장)$/ })
    .locator("..")
    .boundingBox();
  expect(notice).not.toBeNull();
  expect(footer).not.toBeNull();
  expect(notice!.y + notice!.height).toBeLessThanOrEqual(footer!.y);
}

test.describe("식후 피드백: 홈 띠와 시트", () => {
  test.skip(!env, "RUN_DB_E2E=1과 Supabase 값(.env.local)이 있어야 실행합니다");

  test("FB-01, AC-FB-1: 띠가 추천을 막지 않고 한 탭으로 답한 뒤 시트에서 세부를 남긴다", async ({
    page,
    context,
    baseURL,
  }) => {
    const events = await capturePostHog(context);
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
      // 한 탭 답은 stage tap(응답률, North Star에 센다)
      await expect
        .poll(() => submitted(events), { timeout: 20_000 })
        .toEqual([
          { rating: "up", stage: "tap", has_price: false, tag_count: 0, has_review: false },
        ]);

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
      await expectNoticeAboveFold(page);
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
      // 시트의 세부 저장은 stage detail 하나(한 탭 답을 다시 세지 않는다)
      await expect
        .poll(() => submitted(events).slice(1), { timeout: 20_000 })
        .toEqual([
          { rating: "up", stage: "detail", has_price: true, tag_count: 2, has_review: true },
        ]);

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

test.describe("식후 피드백: 나 탭에서 연 상세 (2026-11-01 결정)", () => {
  test.skip(!env, "RUN_DB_E2E=1과 Supabase 값(.env.local)이 있어야 실행합니다");

  /** 3일 전 남긴 후기 하나(이 식당의 마지막 후기) */
  async function seedOldReview(token: string) {
    const placeId = fakePlaceId(7);
    const v = await rest<{ id: string }[]>(env!, "visits", {
      method: "POST",
      token,
      body: {
        place_id: placeId,
        place_url: `https://place.map.kakao.com/${placeId}`,
        meal: "lunch",
        source: "rec",
      },
    });
    expect(v.status).toBe(201);
    const visitId = v.data![0]!.id;
    const r = await rest<{ id: string }[]>(env!, "reviews", {
      method: "POST",
      token,
      body: { visit_id: visitId, rating: "up" },
    });
    expect(r.status).toBe(201);
    const d = kstDate(-3);
    await adminPatch(env!, "visits", `id=eq.${visitId}`, {
      visited_on: d,
      created_at: `${d}T03:10:00Z`,
    });
    await adminPatch(env!, "reviews", `id=eq.${r.data![0]!.id}`, {
      created_at: `${d}T04:00:00Z`,
    });
    return placeId;
  }

  test("길찾기 출처는 detail이고 나 탭에 상세에서로 남는다", async ({
    page,
    context,
    baseURL,
  }) => {
    await stubNaverWeb(context);
    const events = await capturePostHog(context);
    const s = await setup(page, context, baseURL!, "fb4", {
      yesterdayVisit: false,
    });
    try {
      const placeId = await seedOldReview(s.token);
      await page.goto("/me");
      await page
        .getByRole("button", { name: /상세 보기$/ })
        .first()
        .click({ timeout: 20_000 });
      const detail = page.getByRole("dialog");
      const go = detail.getByRole("button", { name: /길찾기$/ });
      await expect(go).toBeVisible();
      const popup = context.waitForEvent("page").catch(() => null);
      await go.click();
      const p = await popup;
      await p?.close();
      await expect
        .poll(() =>
          readOwn<{ source: string; status: string }[]>(
            env!,
            s.token,
            `visits?place_id=eq.${placeId}&visited_on=eq.${kstDate(0)}&select=source,status`,
          ),
        )
        .toEqual([{ source: "detail", status: "candidate" }]);
      await expect
        .poll(
          () =>
            events
              .filter((e) => e.event === "directions_clicked")
              .map((e) => e.properties.source),
          { timeout: 20_000 },
        )
        .toEqual(["detail"]);
      await page.keyboard.press("Escape");
      await page.reload();
      await expect(page.getByText(/상세에서/).first()).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      await s.cleanup();
    }
  });

  // place-detail.tsx(다른 작업 소유)의 MyReviewBlock에 onWriteToday={write}를 연결해야 버튼이 보인다.
  test("내 후기가 있어도 다시 다녀오면 오늘 후기 쓰기, 그 방문 후보를 평가한다", async ({
    page,
    context,
    baseURL,
  }) => {
    await stubNaverWeb(context);
    const s = await setup(page, context, baseURL!, "fb5", {
      yesterdayVisit: false,
    });
    try {
      const placeId = await seedOldReview(s.token);
      // 오늘 길찾기로 생긴 방문 후보(나 탭 상세, source detail)
      const v = await rest(env!, "visits", {
        method: "POST",
        token: s.token,
        body: {
          place_id: placeId,
          place_url: `https://place.map.kakao.com/${placeId}`,
          meal: "lunch",
          source: "detail",
        },
      });
      expect(v.status).toBe(201);
      await page.goto("/me");
      await page
        .getByRole("button", { name: /상세 보기$/ })
        .first()
        .click({ timeout: 20_000 });
      const detail = page.getByRole("dialog");
      await expect(detail.getByRole("heading", { name: "내 후기" })).toBeVisible({
        timeout: 10_000,
      });
      const again = detail.getByRole("button", { name: "오늘 후기 쓰기" });
      await expect(again).toBeVisible({ timeout: 10_000 });
      await again.scrollIntoViewIfNeeded();
      await shot(page, "detail-write-again");
      await again.click();
      const sheet = page.getByRole("dialog", { name: /후기$/ }).last();
      await sheet.getByRole("button", { name: "별로였어요" }).click();
      await sheet.getByRole("button", { name: "남기기" }).click();
      await expect(sheet).toHaveCount(0);
      await expect(
        detail.getByText("후기를 남겼습니다. 다음 추천에 반영합니다."),
      ).toBeVisible();
      // 새 방문을 만들지 않고 오늘 후보를 평가했다: 방문 2건, 후기 2건
      const visits = await readOwn<{ source: string; status: string }[]>(
        env!,
        s.token,
        `visits?place_id=eq.${placeId}&select=source,status&order=created_at.asc`,
      );
      expect(visits).toEqual([
        { source: "rec", status: "visited" },
        { source: "detail", status: "visited" },
      ]);
      const reviews = await readOwn<{ rating: string }[]>(
        env!,
        s.token,
        `reviews?place_id=eq.${placeId}&select=rating&order=created_at.asc`,
      );
      expect(reviews).toEqual([{ rating: "up" }, { rating: "down" }]);
      // 마지막 후기가 오늘 방문이고 새 후보가 없으니 버튼은 사라진다
      await expect(again).toHaveCount(0);
    } finally {
      await s.cleanup();
    }
  });
});
