// 제보와 신고 E2E (T6.15, T6.16, T6.19~T6.22, T6.24). DEAL-01~04, AC-DEAL-1, AC-DEAL-3, PLACE-05, PLACE-07, MOD-01, D-13.
//
// 실행
//   PLAYWRIGHT_BASE_URL=http://localhost:3102 pnpm test:e2e:report  (한 작업자: 테스트 사용자 세션 발급 속도 제한)
//   (.env.local의 Supabase 값이 있을 때만 돈다. REPORT_SHOTS=1이면 캡처, REPORT_DARK=1 다크, REPORT_360=1 최소 폭)
// - 클라우드 개발 DB에 test_rls_ 사용자를 만들고(약관 동의, 사무실 1곳) 끝나면 지운다(cascade: 할인, 확인, 웨이팅, 신고, 후기).
//   다른 사용자(제보자, 끝났어요 2명, 후기 작성자)는 그 사용자 세션의 REST로 준비한다(RLS 적용).
//   adminPatch(secret 키)는 웨이팅 제보 시각을 과거로 옮길 때만 쓴다(feedback.spec.ts와 같은 방식).
// - 화면과 단언은 사용자 세션으로 한다(CLAUDE.md 7.1). 카카오 SDK는 가짜(음식점 45곳, id 9100000부터).
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";
import {
  adminPatch,
  createTestUserSession,
  deleteAuthUser,
  rest,
  rpc,
} from "../src/lib/supabase/rls/harness";
import { expectNoA11yViolations } from "./helpers/axe";
import { mockRecommendSdks } from "./helpers/kakao-places-fake";
import { loadDbE2eEnv, readOwn, signInContext } from "./helpers/session";

const env = loadDbE2eEnv();
const OFFICE = { lat: 37.5665, lng: 126.978 };
const SHOTS = process.env.REPORT_SHOTS === "1";
const SHOT_DIR = join(process.cwd(), "docs/design/shots/2026-11-01");

test.use({ colorScheme: process.env.REPORT_DARK === "1" ? "dark" : "light" });
if (process.env.REPORT_360 === "1")
  test.use({ viewport: { width: 360, height: 780 } });

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  mkdirSync(SHOT_DIR, { recursive: true });
  const project =
    process.env.REPORT_360 === "1"
      ? "360"
      : test.info().project.name === "mobile"
        ? "390"
        : "1280";
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const scheme = await page.evaluate(() =>
    matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );
  await page.waitForTimeout(450);
  await page.screenshot({
    path: join(SHOT_DIR, `report-live__${name}__${project}-${scheme}.png`),
  });
}

async function axe(page: Page, include: string) {
  await page.waitForTimeout(400);
  await expectNoA11yViolations(page, { include });
}

/** 다른 사용자(REST 준비용). 닉네임 test_ 접두 */
async function otherUser(label: string) {
  const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const { user, session } = await createTestUserSession(env!, runId, label);
  const token = session.access_token;
  await rest(env!, `profiles?user_id=eq.${user.id}`, {
    method: "PATCH",
    token,
    body: {
      terms_agreed_at: new Date().toISOString(),
      birth_confirmed_at: new Date().toISOString(),
    },
  });
  return { id: user.id, token, cleanup: () => deleteAuthUser(env!, user.id) };
}

async function setup(
  page: Page,
  context: BrowserContext,
  baseURL: string,
  label: string,
) {
  await mockRecommendSdks(page);
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
  return { token, userId, cleanup: signed.cleanup };
}

/** 홈 첫 카드 식당. 가짜 이름 "테스트식당N"에서 place_id를 얻는다(추천은 무작위라 다시 이동하면 바뀔 수 있다) */
async function heroOf(page: Page) {
  await page.goto("/today");
  const name = (
    await page
      .locator(".lm-today-deck article h2")
      .innerText({ timeout: 20_000 })
  ).trim();
  const n = Number(/테스트식당(\d+)/.exec(name)?.[1]);
  expect(Number.isFinite(n)).toBe(true);
  return { name, placeId: String(9_100_000 + n - 1) };
}

/** 같은 화면에서 그 카드의 상세를 연다(페이지 이동 없음) */
async function openDetail(page: Page, name: string) {
  await page.getByRole("button", { name: `${name} 상세` }).click();
  const detail = page.getByRole("dialog").first();
  await expect(
    detail.getByRole("banner").getByRole("heading", { name }),
  ).toBeVisible();
  return detail;
}

async function closeDetail(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

async function openHeroDetail(page: Page) {
  const hero = await heroOf(page);
  return { ...hero, detail: await openDetail(page, hero.name) };
}

async function openNow(detail: Locator) {
  const row = detail.getByRole("button", { name: /^지금/ });
  if ((await row.getAttribute("aria-expanded")) !== "true") await row.click();
}

/** 질문 시트(제목에 data-question-title) */
function sheetOf(page: Page) {
  return page
    .getByRole("dialog")
    .filter({ has: page.locator("[data-question-title]") });
}

async function expectQuestion(page: Page, title: string | RegExp) {
  const heading = sheetOf(page).locator("[data-question-title]");
  await expect(heading).toHaveText(title);
  return heading;
}

test.describe("제보와 신고: 할인", () => {
  test.skip(!env, "RUN_DB_E2E=1과 Supabase 값(.env.local)이 있어야 실행합니다");

  test("DEAL-01, DEAL-02, DEAL-04: 3단계 등록, 상세 목록과 배지, 중복 단계와 바꿔 넣기", async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await setup(page, context, baseURL!, "rp1");
    try {
      const { placeId, detail } = await openHeroDetail(page);
      await openNow(detail);
      await expect(
        detail.getByText("아직 알려진 할인 정보가 없습니다."),
      ).toBeVisible();
      await expect(
        detail.getByText("할인 정보는 추천 순서에 쓰지 않습니다.").first(),
      ).toBeVisible();
      await detail.getByText("아직 알려진 할인 정보가 없습니다.").scrollIntoViewIfNeeded();
      await shot(page, "detail-now-empty");

      // 1 유형
      await detail.getByRole("button", { name: "할인 정보 알리기" }).click();
      const sheet = sheetOf(page);
      await expectQuestion(page, "어떤 정보인가요?");
      await expect(
        sheet.getByRole("progressbar", { name: "3단계 중 1단계" }),
      ).toBeVisible();
      await shot(page, "deal-type");
      await axe(page, '[role="dialog"]:has([data-question-title])');
      await sheet.getByRole("button", { name: "점심특선" }).click();

      // 2 내용: 초점이 새 질문 제목으로
      const q2 = await expectQuestion(page, "무엇을 하나요?");
      await expect(q2).toBeFocused();
      const next = sheet.getByRole("button", { name: "다음" });
      await expect(next).toHaveAttribute("aria-disabled", "true");
      await sheet.getByRole("textbox").fill("순대국 정식 9천 원");
      await expect(sheet.getByText("60자 중 11자")).toBeAttached();
      await shot(page, "deal-text");
      await next.click();

      // 3 확인 카드: 기본 7일, 언제든. 바꾸기를 눌렀을 때만 펼친다
      await expectQuestion(page, "이대로 알릴까요?");
      await expect(sheet.getByText(/까지, 언제든$/)).toBeVisible();
      await shot(page, "deal-confirm");
      await sheet
        .getByRole("button", { name: "언제까지와 요일, 시간대 바꾸기" })
        .click();
      await sheet.getByRole("button", { name: "2주" }).click();
      await sheet.getByRole("button", { name: "월", exact: true }).click();
      await sheet.getByRole("button", { name: /^점심/ }).click();
      await expect(sheet.getByText(/까지, 월 점심$/)).toBeVisible();
      await shot(page, "deal-confirm-edit");
      await axe(page, '[role="dialog"]:has([data-question-title])');
      await sheet.getByRole("button", { name: "제보하기" }).click();
      await expect(
        sheet.getByRole("heading", { name: "할인 정보를 남겼습니다" }),
      ).toBeVisible();
      await shot(page, "deal-done");
      await sheet.getByRole("button", { name: "닫기" }).last().click();
      await expect(sheet).toHaveCount(0);

      // 상세 목록: 출처 배지, 내용, 메타, 고지 두 줄. 머리 배지 "할인"
      await expect(detail.getByText("순대국 정식 9천 원")).toBeVisible();
      await expect(detail.getByText("사용자 제보").first()).toBeAttached();
      await expect(
        detail.getByText(/오늘 제보, \d+월 \d+일까지/),
      ).toBeVisible();
      await expect(detail.getByText("월 점심")).toBeVisible();
      await expect(detail.getByText(/^내가 남긴 제보입니다/)).toBeVisible();
      await expect(
        detail
          .getByRole("img", { name: "할인 정보 있음" })
          .or(detail.getByText("할인", { exact: true }))
          .first(),
      ).toBeVisible();
      await detail.getByText("순대국 정식 9천 원").scrollIntoViewIfNeeded();
      await shot(page, "detail-deal-mine");

      const own = await readOwn<
        { id: string; ends_on: string; days: number; slots: string[] }[]
      >(
        env!,
        s.token,
        `place_deals?place_id=eq.${placeId}&status=eq.active&select=id,ends_on,days,slots`,
      );
      expect(own).toHaveLength(1);
      expect(own[0]!.days).toBe(1);
      expect(own[0]!.slots).toEqual(["lunch"]);

      // 중복: 같은 유형을 고르면 중복 단계(4칸)
      await detail.getByRole("button", { name: "할인 정보 알리기" }).click();
      await sheet.getByRole("button", { name: "점심특선" }).click();
      await expectQuestion(page, "이미 제보된 정보가 있습니다");
      await expect(
        sheet.getByRole("progressbar", { name: "4단계 중 2단계" }),
      ).toBeVisible();
      await expect(
        sheet.getByRole("button", { name: "아직 해요로 확인" }),
      ).toBeVisible();
      await shot(page, "deal-dup");
      await axe(page, '[role="dialog"]:has([data-question-title])');
      await sheet
        .getByRole("button", { name: "다른 내용이라 새로 남기기" })
        .click();
      await expectQuestion(page, "무엇을 하나요?");
      await sheet.getByRole("textbox").fill("순대국 정식 8천 원");
      await sheet.getByRole("button", { name: "다음" }).click();
      await sheet.getByRole("button", { name: "제보하기" }).click();
      await expect(
        sheet.getByRole("heading", { name: "할인 정보를 남겼습니다" }),
      ).toBeVisible();
      await sheet.getByRole("button", { name: "닫기" }).last().click();
      // 바꿔 넣기: 기존 제보는 숨겨지고 새 제보만 보인다
      await expect(detail.getByText("순대국 정식 8천 원")).toBeVisible();
      await expect(detail.getByText("순대국 정식 9천 원")).toHaveCount(0);
      const after = await readOwn<
        { id: string; status: string; hidden_reason: string | null }[]
      >(
        env!,
        s.token,
        `place_deals?place_id=eq.${placeId}&select=id,status,hidden_reason&order=created_at`,
      );
      expect(after.map((d) => d.status)).toEqual(["hidden", "active"]);
      expect(after[0]!.hidden_reason).toBe("superseded");
    } finally {
      await s.cleanup();
    }
  });

  test("DEAL-03, AC-DEAL-3, DEAL-04 신고: 아직 해요와 되돌리기, 할인 신고, 끝났어요 3명이면 숨김", async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await setup(page, context, baseURL!, "rp2");
    const others: { cleanup: () => Promise<void> }[] = [];
    try {
      // 첫 카드 식당을 알아낸 뒤, 다른 사용자가 그 식당에 할인을 남긴다
      const first = await heroOf(page);
      const reporter = await otherUser("rp2a");
      others.push(reporter);
      const reg = await rpc<{ deal_id: string }[]>(
        env!,
        "register_deal",
        {
          p_place_id: first.placeId,
          p_place_url: `https://place.map.kakao.com/${first.placeId}`,
          p_type: "discount",
          p_content: "포장하면 1천 원 할인",
          p_days: 0,
          p_slots: [],
          p_replace: false,
        },
        reporter.token,
      );
      expect(reg.status).toBe(200);
      const dealId = reg.data![0]!.deal_id;
      // 끝났어요 2명: 제보자 본인과 다른 한 명(서로 다른 사용자면 된다). 세 번째는 화면에서 누른다
      const second = await otherUser("rp2b");
      others.push(second);
      for (const u of [reporter, second]) {
        const c = await rest(env!, "place_deal_checks", {
          method: "POST",
          token: u.token,
          body: { deal_id: dealId, user_id: u.id, answer: "ended" },
        });
        expect(c.status).toBe(201);
      }

      const detail = await openDetail(page, first.name);
      await openNow(detail);
      await expect(detail.getByText("포장하면 1천 원 할인")).toBeVisible();
      await expect(
        detail.getByRole("img", { name: "끝났어요 3명 중 2명" }),
      ).toBeVisible();
      await detail.getByText("포장하면 1천 원 할인").scrollIntoViewIfNeeded();
      await shot(page, "detail-deal-check");
      await axe(page, '[role="dialog"]');

      // 아직 해요 → 그 자리 결과 줄 + 되돌리기(토스트 없음)
      await detail.getByRole("button", { name: "아직 해요" }).click();
      const result = detail.getByText(
        /아직 한다고 알렸습니다\. 나를 포함해 1명이/,
      );
      await expect(result).toBeVisible();
      await expect(page.locator(":focus")).toContainText(
        "아직 한다고 알렸습니다",
      );
      await detail.getByText("포장하면 1천 원 할인").scrollIntoViewIfNeeded();
      await shot(page, "detail-deal-still");
      await expect
        .poll(() =>
          readOwn<{ answer: string }[]>(
            env!,
            s.token,
            `place_deal_checks?deal_id=eq.${dealId}&select=answer`,
          ),
        )
        .toEqual([{ answer: "still" }]);
      await detail.getByRole("button", { name: "되돌리기" }).click();
      await expect(
        detail.getByRole("button", { name: "아직 해요" }),
      ).toBeFocused();
      await expect
        .poll(() =>
          readOwn<unknown[]>(
            env!,
            s.token,
            `place_deal_checks?deal_id=eq.${dealId}&select=answer`,
          ),
        )
        .toEqual([]);

      // 할인 신고: 할인용 사유 4개(광고성, 허위 포함)
      await detail.getByRole("button", { name: "이 할인 정보 신고" }).click();
      const sheet = sheetOf(page);
      await expectQuestion(page, "어떤 문제인가요?");
      await expect(sheet.getByRole("radio")).toHaveCount(4);
      await shot(page, "flag-deal-reason");
      await sheet.getByRole("radio", { name: /광고성, 허위/ }).check();
      await expectQuestion(page, "광고성, 허위 사유로 신고합니다");
      await shot(page, "flag-deal-confirm");
      await sheet.getByRole("button", { name: "신고하기" }).click();
      await expect(
        sheet.getByRole("heading", { name: "신고를 받았습니다" }),
      ).toBeVisible();
      await sheet.getByRole("button", { name: "닫기" }).last().click();
      const flagged = await readOwn<{ reason: string; target_type: string }[]>(
        env!,
        s.token,
        `review_reports?deal_id=eq.${dealId}&select=reason,target_type`,
      );
      expect(flagged).toEqual([{ reason: "ad_false", target_type: "deal" }]);

      // 세 번째 끝났어요 → 결과 줄, 집계가 다시 오면 숨김(AC-DEAL-3)
      await detail.getByRole("button", { name: "끝났어요" }).click();
      await expect(
        detail.getByText("끝났다고 알렸습니다. 3명이 알리면 숨겨집니다."),
      ).toBeVisible();
      await expect(detail.getByText("포장하면 1천 원 할인")).toHaveCount(0, {
        timeout: 10_000,
      });
      await expect(
        detail.getByText("아직 알려진 할인 정보가 없습니다."),
      ).toBeVisible();
      const hidden = await rpc<unknown[]>(
        env!,
        "place_deals_list",
        { p_place_id: first.placeId },
        s.token,
      );
      expect(hidden.data).toEqual([]);
    } finally {
      for (const o of others) await o.cleanup();
      await s.cleanup();
    }
  });
});

test.describe("제보와 신고: 웨이팅, 정보 제보, 후기 신고", () => {
  test.skip(!env, "RUN_DB_E2E=1과 Supabase 값(.env.local)이 있어야 실행합니다");

  test("PLACE-07: 한 탭 제보, 2분 취소, 30분 1회", async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await setup(page, context, baseURL!, "rp3");
    try {
      const { detail, placeId, name } = await openHeroDetail(page);
      await openNow(detail);
      await expect(
        detail.getByText("줄 길어요는 점심 피크에 추천 순서를 조금 낮춥니다."),
      ).toBeVisible();
      await detail.getByRole("button", { name: "줄 길어요" }).click();
      const line = detail.getByText(
        /\d+시 \d+분에 알렸습니다\. 30분 동안 다른 분들께 보입니다\./,
      );
      await expect(line).toBeVisible();
      await expect(
        detail.getByRole("button", { name: "바로 입장" }),
      ).toHaveCount(0);
      await expect(
        detail.getByRole("button", { name: "줄 길어요", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(detail.getByText("방금, 줄 길어요").first()).toBeVisible();
      await shot(page, "wait-sent");
      await axe(page, '[role="dialog"]');

      // 취소(2분 안): 행을 지우고 세 버튼이 돌아온다
      await detail.getByRole("button", { name: "취소" }).click();
      await expect(
        detail.getByRole("button", { name: "바로 입장" }),
      ).toBeVisible();
      await expect
        .poll(() =>
          readOwn<unknown[]>(
            env!,
            s.token,
            `wait_reports?place_id=eq.${placeId}&select=id`,
          ),
        )
        .toEqual([]);

      // 다시 알리고, 3분 전으로 옮긴 뒤(준비만 secret 키) 새로 열면 30분 제한
      await detail.getByRole("button", { name: "바로 입장" }).click();
      await expect(line).toBeVisible();
      const past = new Date(Date.now() - 3 * 60_000).toISOString();
      const moved = await adminPatch(
        env!,
        "wait_reports",
        `user_id=eq.${s.userId}`,
        { created_at: past },
      );
      expect(moved).toBe(1);
      // 상세를 닫았다 다시 열면 화면 상태는 없다. 서버가 30분 1회를 판정해 제한 줄을 띄운다
      await closeDetail(page);
      const again = await openDetail(page, name);
      await openNow(again);
      await again
        .getByRole("button", { name: "조금 기다려요", exact: true })
        .click();
      await expect(
        again.getByText(/\d+시 \d+분부터 다시 알릴 수 있습니다\./),
      ).toBeVisible();
      await expect(
        again.getByRole("button", { name: "조금 기다려요", exact: true }),
      ).toHaveAttribute("aria-disabled", "true");
      await shot(page, "wait-cooldown");
      const rows = await readOwn<unknown[]>(
        env!,
        s.token,
        `wait_reports?place_id=eq.${placeId}&select=id`,
      );
      expect(rows).toHaveLength(1);
    } finally {
      await s.cleanup();
    }
  });

  test("PLACE-05, MOD-01: 정보 제보와 후기 신고(신고한 후기는 나에게서 가림)", async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await setup(page, context, baseURL!, "rp4");
    const others: { cleanup: () => Promise<void> }[] = [];
    try {
      const first = await heroOf(page);
      // 다른 사용자의 공개 후기
      const writer = await otherUser("rp4a");
      others.push(writer);
      const v = await rest<{ id: string }[]>(env!, "visits", {
        method: "POST",
        token: writer.token,
        body: {
          user_id: writer.id,
          place_id: first.placeId,
          place_url: `https://place.map.kakao.com/${first.placeId}`,
          meal: "lunch",
          source: "rec",
        },
      });
      expect(v.status).toBe(201);
      const r = await rest<{ id: string }[]>(env!, "reviews", {
        method: "POST",
        token: writer.token,
        body: {
          user_id: writer.id,
          visit_id: v.data![0]!.id,
          rating: "up",
          body: "국물이 진하고 회전이 빠릅니다",
          is_public: true,
        },
      });
      expect(r.status).toBe(201);
      const reviewId = r.data![0]!.id;

      // 정보 제보: 더 보기 → 문 닫았어요 → 세부 선택 → 보내기
      const detail = await openDetail(page, first.name);
      await detail.getByRole("button", { name: "다른 행동 더 보기" }).click();
      await expect(
        page.getByRole("menuitem", { name: "할인 정보 알리기" }),
      ).toBeVisible();
      await shot(page, "menu");
      await page.getByRole("menuitem", { name: "문 닫았어요" }).click();
      const sheet = sheetOf(page);
      await expectQuestion(page, "어떻게 닫았나요?");
      await expect(
        sheet.getByRole("button", { name: "건너뛰고 보내기" }),
      ).toBeVisible();
      await sheet.getByRole("button", { name: "다른 곳으로 옮겼어요" }).click();
      await expect(
        sheet.getByText("서로 다른 세 분이 알리면 추천에서 뺍니다."),
      ).toBeVisible();
      await shot(page, "place-closed");
      await axe(page, '[role="dialog"]:has([data-question-title])');
      await sheet.getByRole("button", { name: "보내기" }).click();
      await expect(
        sheet.getByRole("heading", { name: "제보를 받았습니다" }),
      ).toBeVisible();
      await sheet.getByRole("button", { name: "닫기" }).last().click();
      const placeRows = await readOwn<
        { kind: string; detail: { closed?: string } }[]
      >(
        env!,
        s.token,
        `place_reports?place_id=eq.${first.placeId}&select=kind,detail`,
      );
      expect(placeRows).toEqual([
        { kind: "closed", detail: { closed: "moved" } },
      ]);

      // 가격 제보: 범위 밖이면 보낼 수 없다
      await detail.getByRole("button", { name: "다른 행동 더 보기" }).click();
      await page.getByRole("menuitem", { name: "가격이 달라요" }).click();
      await expectQuestion(page, "1인 얼마였나요?");
      await sheet.getByRole("textbox").fill("500");
      await expect(
        sheet.getByText("1,000원에서 100,000원 사이로 적어 주세요."),
      ).toBeVisible();
      await expect(
        sheet.getByRole("button", { name: "보내기" }),
      ).toHaveAttribute("aria-disabled", "true");
      await shot(page, "place-price-invalid");
      await sheet.getByRole("textbox").fill("11000");
      await sheet.getByRole("button", { name: "보내기" }).click();
      await expect(
        sheet.getByRole("heading", { name: "제보를 받았습니다" }),
      ).toBeVisible();
      await sheet.getByRole("button", { name: "닫기" }).last().click();

      // 후기 신고: ⋯ → 신고 → 사유 → 확인 → 신고하기
      await detail.getByRole("button", { name: /^후기 후기/ }).click();
      await expect(
        detail.getByText("국물이 진하고 회전이 빠릅니다"),
      ).toBeVisible({ timeout: 10_000 });
      await detail.getByRole("button", { name: /후기 더 보기$/ }).click();
      await page.getByRole("menuitem", { name: "신고" }).click();
      await expectQuestion(page, "어떤 문제인가요?");
      await expect(sheet.getByRole("radio")).toHaveCount(5);
      await shot(page, "flag-review-reason");
      await axe(page, '[role="dialog"]:has([data-question-title])');
      await sheet.getByRole("radio", { name: /기타/ }).check();
      await expectQuestion(page, "기타 사유로 신고합니다");
      await sheet.getByRole("textbox").fill("다른 가게 이야기입니다");
      await shot(page, "flag-review-confirm");
      await sheet.getByRole("button", { name: "신고하기" }).click();
      await expect(
        sheet.getByRole("heading", { name: "신고를 받았습니다" }),
      ).toBeVisible();
      await sheet.getByRole("button", { name: "닫기" }).last().click();
      await expect(
        detail.getByText("국물이 진하고 회전이 빠릅니다"),
      ).toHaveCount(0, { timeout: 10_000 });
      const reports = await readOwn<{ reason: string; note: string | null }[]>(
        env!,
        s.token,
        `review_reports?review_id=eq.${reviewId}&select=reason,note`,
      );
      expect(reports).toEqual([
        { reason: "other", note: "다른 가게 이야기입니다" },
      ]);
    } finally {
      for (const o of others) await o.cleanup();
      await s.cleanup();
    }
  });
});
