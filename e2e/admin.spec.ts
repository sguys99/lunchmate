// 관리자 화면 E2E (T8.5, MOD-06, D-19). 신고 후기 숨김과 되돌리기, 같은 작성자 일괄 숨김, 폐업 확인, 사용자 정지, 처리 이력, 4상태, 비관리자 404.
//
// 실행
//   PLAYWRIGHT_BASE_URL=http://localhost:3102 pnpm test:e2e:admin  (한 작업자: 테스트 사용자 세션 발급 속도 제한)
//   (.env.local의 Supabase 값이 있을 때만 돈다. ADMIN_SHOTS=1이면 캡처, ADMIN_DARK=1 다크, ADMIN_360=1 최소 폭)
// - 클라우드 개발 DB에 test_rls_ 사용자를 만들고 끝나면 지운다. 관리자 지정은 SQL 편집기 대신 secret 키(adminPatch)로
//   테스트 관리자 계정에만 한다(준비 전용). 사용자 본인 계정은 건드리지 않는다.
// - 작성자, 신고자의 준비는 그 사용자 세션의 REST로 한다(RLS 적용). 화면 단언은 관리자 세션으로 한다(CLAUDE.md 7.1).
// - 개발 DB에 다른 검토 대기 항목이 있을 수 있어 "건너뛰기"로 이 실행의 항목을 찾아간다.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  adminPatch,
  createTestUserSession,
  deleteAuthUser,
  rest,
  rpc,
} from "../src/lib/supabase/rls/harness";
import { expectNoA11yViolations } from "./helpers/axe";
import { loadDbE2eEnv, readOwn, signInContext } from "./helpers/session";

const env = loadDbE2eEnv();
const SHOTS = process.env.ADMIN_SHOTS === "1";
const SHOT_DIR = join(process.cwd(), "docs/design/shots/2026-11-01");

test.use({ colorScheme: process.env.ADMIN_DARK === "1" ? "dark" : "light" });
if (process.env.ADMIN_360 === "1")
  test.use({ viewport: { width: 360, height: 780 } });

async function shot(page: Page, name: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  if (!SHOTS) return;
  mkdirSync(SHOT_DIR, { recursive: true });
  const project =
    process.env.ADMIN_360 === "1"
      ? "360"
      : test.info().project.name === "mobile"
        ? "390"
        : "1280";
  const scheme = await page.evaluate(() =>
    matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );
  await page.waitForTimeout(450);
  await page.screenshot({
    path: join(SHOT_DIR, `admin-live__${name}__${project}-${scheme}.png`),
  });
}

async function axe(page: Page) {
  await page.waitForTimeout(400);
  await expectNoA11yViolations(page);
}

const run = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** 약관에 동의한 테스트 사용자(REST 준비용). 닉네임 test_ 접두 */
async function user(label: string) {
  const { user: u, session } = await createTestUserSession(env!, run(), label);
  const token = session.access_token;
  await rest(env!, `profiles?user_id=eq.${u.id}`, {
    method: "PATCH",
    token,
    body: {
      terms_agreed_at: new Date().toISOString(),
      birth_confirmed_at: new Date().toISOString(),
    },
  });
  return {
    id: u.id,
    nickname: u.nickname,
    token,
    cleanup: () => deleteAuthUser(env!, u.id),
  };
}
type U = Awaited<ReturnType<typeof user>>;

async function review(author: U, placeId: string, body: string) {
  const v = await rest<{ id: string }[]>(env!, "visits", {
    method: "POST",
    token: author.token,
    body: { place_id: placeId, meal: "lunch", source: "rec" },
  });
  expect(v.error).toBeNull();
  const r = await rest<{ id: string }[]>(env!, "reviews", {
    method: "POST",
    token: author.token,
    body: { visit_id: v.data![0]!.id, rating: "down", body, is_public: true },
  });
  expect(r.error).toBeNull();
  return r.data![0]!.id;
}

async function reportReview(by: U, reviewId: string, reason = "spam") {
  const r = await rest(env!, "review_reports", {
    method: "POST",
    token: by.token,
    body: { target_type: "review", review_id: reviewId, reason },
  });
  expect(r.error).toBeNull();
}

/** 이 실행의 데이터: 작성자 후기 셋(신고 3건 둘, 신고 1건 뒤 비공개 전환 하나), 폐업 제보 3명 */
async function seed() {
  const id = run();
  const placeBase = `6${String(Date.now()).slice(-9)}`;
  const author = await user("aa");
  const reporters = [await user("r1"), await user("r2"), await user("r3")];
  const bodies = {
    first: `test_광고글 오픈채팅 ${id}`,
    second: `test_두번째글 ${id}`,
    secret: `test_비공개전환 ${id}`,
  };
  const rv1 = await review(author, `${placeBase}1`, bodies.first);
  const rv2 = await review(author, `${placeBase}2`, bodies.second);
  const rv3 = await review(author, `${placeBase}3`, bodies.secret);
  for (const r of reporters) {
    await reportReview(r, rv1);
    await reportReview(r, rv2);
  }
  await reportReview(reporters[0]!, rv3, "abuse");
  const p = await rest(env!, `reviews?id=eq.${rv3}`, {
    method: "PATCH",
    token: author.token,
    body: { is_public: false },
  });
  expect(p.error).toBeNull();
  const closedPlace = `${placeBase}9`;
  for (const r of reporters) {
    const c = await rest(env!, "place_reports", {
      method: "POST",
      token: r.token,
      body: { place_id: closedPlace, kind: "closed", detail: { closed: "gone" } },
    });
    expect(c.error).toBeNull();
  }
  return {
    author,
    bodies,
    reviews: { rv1, rv2, rv3 },
    closedPlace,
    cleanup: async () => {
      for (const u of [author, ...reporters]) await u.cleanup();
    },
  };
}

async function signInAdmin(
  page: Page,
  baseURL: string,
): Promise<{ token: string; cleanup: () => Promise<void> }> {
  await page.addInitScript(() => {
    addEventListener("DOMContentLoaded", () => {
      const st = document.createElement("style");
      st.textContent = "nextjs-portal{display:none!important}";
      document.head.append(st);
    });
  });
  const signed = await signInContext(page.context(), env!, baseURL, "adm");
  await adminPatch(env!, "profiles", `user_id=eq.${signed.user.id}`, {
    role: "admin",
    nickname: "test_관리",
    terms_agreed_at: new Date().toISOString(),
    birth_confirmed_at: new Date().toISOString(),
  });
  return { token: signed.session.access_token, cleanup: signed.cleanup };
}

/** 건너뛰기로 그 글이 보이는 카드까지 */
async function seek(page: Page, text: string | RegExp) {
  const main = page.getByRole("main");
  for (let i = 0; i < 40; i++) {
    if (await main.getByText(text).first().isVisible()) return;
    const skip = main.getByRole("button", { name: "건너뛰기" });
    await expect(skip).toBeEnabled();
    await skip.click();
    await page.waitForTimeout(350);
  }
  throw new Error(`[e2e] 카드를 찾지 못했습니다: ${String(text)}`);
}

async function hiddenReason(author: U, id: string) {
  const rows = await readOwn<{ hidden_reason: string | null }[]>(
    env!,
    author.token,
    `reviews?id=eq.${id}&select=hidden_reason`,
  );
  return rows[0]?.hidden_reason ?? null;
}

test.describe("관리자 화면 (T8.5, MOD-06)", () => {
  test.skip(!env, "RUN_DB_E2E=1과 Supabase 값이 있을 때만");
  test.describe.configure({ mode: "serial", timeout: 180_000 });

  test("신고 후기 숨김과 되돌리기, 같은 작성자 일괄 숨김, 폐업 확인, 정지, 처리 이력", async ({
    page,
    baseURL,
  }) => {
    const data = await seed();
    const admin = await signInAdmin(page, baseURL!);
    try {
      await page.goto("/admin");
      await expect(page.getByText("런치메이트 관리")).toBeVisible();
      await expect(
        page.getByRole("tab", { name: /신고된 후기/ }),
      ).toBeVisible({ timeout: 20_000 });

      // 1. 자동 숨김된 이 실행의 글
      await seek(page, data.bodies.first);
      const main = page.getByRole("main");
      await expect(main.getByText("자동 숨김")).toBeVisible();
      await expect(main.getByText("광고, 스팸 3")).toBeVisible();
      await shot(page, "reviews");
      await axe(page);

      // 2. 숨김 확정 → 사유 단계(가장 많은 사유를 미리 고름) → 토스트 되돌리기
      await main.getByRole("button", { name: "숨김 확정" }).click();
      await expect(main.getByRole("radio", { name: /광고, 스팸/ })).toBeChecked();
      await expect(main.getByRole("radio", { name: /광고, 스팸/ })).toBeFocused();
      await expect(
        main.getByText("같은 작성자의 다른 신고 글 2건도 함께 숨기기"),
      ).toBeVisible();
      await shot(page, "reason");
      await axe(page);
      await page.getByRole("button", { name: "광고, 스팸 사유로 숨기기" }).click();
      const done = page.getByText("숨김을 확정했습니다.");
      await expect(done).toBeVisible();
      await expect.poll(() => hiddenReason(data.author, data.reviews.rv1)).toBe(
        "admin",
      );
      await page
        .locator("[data-sonner-toast]")
        .filter({ has: done })
        .getByRole("button", { name: "되돌리기" })
        .click();
      await expect(page.getByText("되돌렸습니다.")).toBeVisible();
      await expect.poll(() => hiddenReason(data.author, data.reviews.rv1)).toBe(
        "reports",
      );

      // 3. 같은 작성자 일괄 숨김(B 조각, 확인 상자). 비공개로 바뀐 글은 글 없이 표시된다
      await page.reload();
      await seek(page, data.bodies.first);
      await expect(main.getByText(data.bodies.secret)).toHaveCount(0);
      await main.getByRole("button", { name: "숨김 확정" }).click();
      await main.getByText("같은 작성자의 다른 신고 글 2건도 함께 숨기기").click();
      await page.getByRole("button", { name: "광고, 스팸 사유로 숨기기" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText("3건을 함께 숨길까요?")).toBeVisible();
      await expect(dialog.getByRole("button", { name: "취소" })).toBeFocused();
      await shot(page, "bulk-confirm");
      await dialog.getByRole("button", { name: "3건 숨기기" }).click();
      await expect(page.getByText("3건을 숨겼습니다.")).toBeVisible();
      for (const id of Object.values(data.reviews)) {
        await expect.poll(() => hiddenReason(data.author, id)).toBe("admin");
      }
      if (
        await main
          .getByRole("heading", { name: "검토할 것을 모두 마쳤습니다" })
          .isVisible()
      )
        await shot(page, "empty");

      // 4. 폐업 확인(확인 상자) → place_stats.closed
      await page.getByRole("tab", { name: /폐업 제보/ }).click();
      await seek(page, `장소 ${data.closedPlace}`);
      await expect(main.getByText("추천 제외 중")).toBeVisible();
      await shot(page, "closures");
      await axe(page);
      await main.getByRole("button", { name: "폐업 확인" }).click();
      await shot(page, "closed-confirm");
      await page.getByRole("dialog").getByRole("button", { name: "폐업 확인" }).click();
      await expect(page.getByText(/폐업으로 확인했습니다/)).toBeVisible();
      const stats = await rpc<{ closed: boolean }[]>(env!, "place_stats", {
        p_place_ids: [data.closedPlace],
      });
      expect(stats.data?.[0]?.closed).toBe(true);

      // 5. 사용자: 닉네임으로 찾아 7일 정지(확인 상자) → 정지 중 목록
      await page.getByRole("tab", { name: /사용자/ }).click();
      await page.getByLabel("닉네임으로 찾기").fill(data.author.nickname);
      await page.getByRole("button", { name: "찾기" }).click();
      const found = page
        .getByRole("listitem")
        .filter({ hasText: data.author.nickname })
        .first();
      await found.getByRole("button", { name: "정지" }).click();
      const suspend = page.getByRole("dialog");
      await expect(
        suspend.getByText(`${data.author.nickname} 님을 정지할까요?`),
      ).toBeVisible();
      await expect(suspend.getByRole("radio", { name: "7일" })).toBeChecked();
      await shot(page, "suspend");
      await axe(page);
      await suspend.getByRole("button", { name: "정지하기" }).click();
      await expect(
        page.getByText(`${data.author.nickname} 님을 정지했습니다.`),
      ).toBeVisible();
      const me = await readOwn<{ status: string }[]>(
        env!,
        data.author.token,
        `profiles?user_id=eq.${data.author.id}&select=status`,
      );
      expect(me[0]?.status).toBe("suspended");
      await page.reload();
      await page.getByRole("tab", { name: /사용자/ }).click();
      await expect(
        main
          .getByRole("listitem")
          .filter({ hasText: data.author.nickname })
          .getByRole("button", { name: "정지 해제" }),
      ).toBeVisible();
      await shot(page, "users");

      // 6. 처리 이력(A 조각: 목록 형태)
      await page.getByRole("tab", { name: /처리 이력/ }).click();
      await expect(main.getByText("사용자 정지").first()).toBeVisible();
      await expect(main.getByText("폐업 확인").first()).toBeVisible();
      await expect(main.getByText("처리 이력은 1년 동안 보관합니다.")).toBeVisible();
      await shot(page, "log");
      await axe(page);
    } finally {
      await data.cleanup();
      await admin.cleanup();
    }
  });

  test("4상태: 로딩, 오류, 오프라인", async ({ page, baseURL }) => {
    const admin = await signInAdmin(page, baseURL!);
    try {
      // 로딩: 목록 서버 액션을 늦춘다
      let mode: "slow" | "fail" | "pass" = "slow";
      await page.route(
        (url) => url.pathname === "/admin",
        async (route) => {
          if (route.request().method() !== "POST") return route.continue();
          if (mode === "fail") return route.abort();
          if (mode === "slow") await new Promise((r) => setTimeout(r, 4000));
          return route.continue();
        },
      );
      await page.goto("/admin");
      await expect(
        page.getByRole("status").filter({ hasText: "관리 목록을 불러오는 중입니다" }),
      ).toBeAttached({ timeout: 20_000 });
      await shot(page, "loading");

      // 오류: 목록 요청이 실패하면(한 번 다시 시도한 뒤) 다시 시도 버튼
      mode = "fail";
      await page.reload();
      await expect(page.getByText("관리 목록을 불러오지 못했습니다")).toBeVisible({
        timeout: 30_000,
      });
      await shot(page, "error");
      await axe(page);

      // 오프라인: 마지막 목록을 둔 채 처리 버튼을 막는다
      mode = "pass";
      await page.getByRole("button", { name: "다시 시도" }).click();
      await expect(page.getByRole("tab", { name: /처리 이력/ })).toBeVisible();
      await expect(page.getByText("관리 목록을 불러오지 못했습니다")).toHaveCount(0, {
        timeout: 20_000,
      });
      await page.context().setOffline(true);
      await expect(page.getByText("인터넷에 연결되어 있지 않습니다.")).toBeVisible();
      const primary = page
        .getByRole("main")
        .getByRole("button", { name: /숨김 확정|숨기기/ });
      if (await primary.count()) await expect(primary.first()).toBeDisabled();
      await shot(page, "offline");
      await page.context().setOffline(false);
    } finally {
      await admin.cleanup();
    }
  });

  test("비관리자와 비로그인은 /admin을 볼 수 없다", async ({ page, baseURL }) => {
    const signed = await signInContext(page.context(), env!, baseURL!, "nadm");
    try {
      await adminPatch(env!, "profiles", `user_id=eq.${signed.user.id}`, {
        terms_agreed_at: new Date().toISOString(),
        birth_confirmed_at: new Date().toISOString(),
      });
      await page.goto("/admin");
      await expect(page.getByText("찾는 페이지가 없습니다")).toBeVisible({
        timeout: 20_000,
      });
      await expect(page.getByText("런치메이트 관리")).toHaveCount(0);
      await page.context().clearCookies();
      await page.goto("/admin");
      await expect(page).toHaveURL(/\/login/);
    } finally {
      await signed.cleanup();
    }
  });
});
