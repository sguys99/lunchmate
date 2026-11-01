// 투표 만들기와 투표 탭 E2E (T7.11~T7.13, T7.21). POLL-01~03, POLL-10, MOD-05, D-15.
//
// 실행
//   PLAYWRIGHT_BASE_URL=http://localhost:3102 RUN_DB_E2E=1 pnpm exec playwright test --project=mobile --project=desktop --workers=1 e2e/poll-create.spec.ts
//   (.env.local의 Supabase 값이 있을 때만 돈다. 진입점은 flags.pollEntry(T7.35 해제) 뒤에 보이므로 그 전에는 건너뛴다)
// - 클라우드 개발 DB에 test_rls_ 사용자를 만들고(약관 동의, 사무실 1곳) 끝나면 지운다(cascade: 투표방, 참여, 후보).
// - 화면과 단언은 사용자 세션으로 한다(CLAUDE.md 7.1). 카카오 SDK는 가짜(음식점 45곳).
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { rest, rpc } from "../src/lib/supabase/rls/harness";
import { FLAGS } from "../src/lib/flags";
import { expectNoA11yViolations } from "./helpers/axe";
import { mockRecommendSdks } from "./helpers/kakao-places-fake";
import { loadDbE2eEnv, signInContext } from "./helpers/session";

const env = loadDbE2eEnv();
const SHOTS = process.env.POLL_SHOTS === "1";
const SHOT_DIR = join(process.cwd(), "docs/design/shots/2026-11-01");

test.use({ colorScheme: process.env.POLL_DARK === "1" ? "dark" : "light" });
if (process.env.POLL_360 === "1")
  test.use({ viewport: { width: 360, height: 780 } });

/** POLL_SHOTS=1이면 캡처(가로 넘침 없음 확인 포함) */
async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  mkdirSync(SHOT_DIR, { recursive: true });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const width =
    process.env.POLL_360 === "1"
      ? "360"
      : test.info().project.name === "mobile"
        ? "390"
        : "1280";
  const scheme = process.env.POLL_DARK === "1" ? "dark" : "light";
  await page.waitForTimeout(450);
  await page.screenshot({
    path: join(SHOT_DIR, `poll-create-live__${name}__${width}-${scheme}.png`),
  });
}
const OFFICE = { lat: 37.5665, lng: 126.978 };
const pollEntryOn =
  FLAGS.pollEntry.source.type === "const" && FLAGS.pollEntry.source.value;

type MyPoll = {
  poll_id: string;
  title: string;
  status: string;
  closes_at: string;
  candidate_count: number;
  is_host: boolean;
};

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
  return { token, cleanup: signed.cleanup };
}

async function myPolls(token: string): Promise<MyPoll[]> {
  const r = await rpc<MyPoll[]>(env!, "my_polls", {}, token);
  expect(r.status).toBe(200);
  return r.data ?? [];
}

async function pollsUsed(token: string): Promise<number> {
  const r = await rpc<{ bucket: string; used: number }[]>(
    env!,
    "my_daily_limits",
    {},
    token,
  );
  return r.data?.find((x) => x.bucket === "polls")?.used ?? -1;
}

function sheet(page: Page) {
  return page.getByRole("dialog");
}

async function startFriends(page: Page) {
  await page.goto("/today");
  await expect(page.locator(".lm-today-deck article h2")).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "친구랑 정하기" }).click();
  await expect(
    sheet(page).getByRole("heading", { name: "투표방을 만들었어요" }),
  ).toBeVisible({ timeout: 15_000 });
}

test.describe("투표 만들기 (D-15 C)", () => {
  test.skip(!env, "RUN_DB_E2E=1과 Supabase 값(.env.local)이 있어야 실행합니다");
  test.skip(!pollEntryOn, "flags.pollEntry가 꺼져 있습니다(T7.35에서 해제)");

  test("친구랑 정하기 한 번에 오늘 세 곳으로 만들고, 줄을 고치면 방에 반영된다 (POLL-02)", async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await setup(page, context, baseURL!, "pc_quick");
    try {
      await startFriends(page);
      const dlg = sheet(page);
      // 항목 줄 4개와 후보 3곳
      await expect(dlg.getByRole("button", { name: /^제목/ })).toBeVisible();
      await expect(
        dlg.getByRole("button", { name: /^후보\s*3곳/ }),
      ).toBeVisible();
      await expect(
        dlg.getByRole("button", { name: "카카오톡으로 보내기" }),
      ).toBeVisible();
      await expect(
        dlg.getByText("미리보기에는 식당 이름이 나오지 않습니다."),
      ).toBeVisible();
      await expectNoA11yViolations(page, { include: '[role="dialog"]' });
      await shot(page, "created");

      let polls = await myPolls(s.token);
      expect(polls).toHaveLength(1);
      expect(polls[0]?.candidate_count).toBe(3);
      expect(polls[0]?.is_host).toBe(true);
      const before = polls[0]!.closes_at;

      // 마감 줄: 큰 칸 2 x 2에서 1시간 뒤 또는 10분 뒤로
      await dlg.getByRole("button", { name: /^마감/ }).click();
      const radios = dlg.getByRole("radiogroup").getByRole("radio");
      await expect(radios).toHaveCount(4);
      await shot(page, "edit-deadline");
      await radios.nth(0).click();
      await expect
        .poll(async () => (await myPolls(s.token))[0]?.closes_at)
        .not.toBe(before);

      // 방식: 여러 곳
      await dlg.getByRole("button", { name: "다 고쳤어요" }).click();
      await dlg.getByRole("button", { name: /^방식/ }).click();
      await dlg
        .getByRole("radio", { name: "여러 곳" })
        .or(dlg.getByRole("button", { name: "여러 곳" }))
        .first()
        .click();
      await expect(
        dlg.getByText("한 사람이 여러 곳에 표를 낼 수 있습니다.", {
          exact: false,
        }),
      ).toBeVisible();

      // 투표 탭에 진행 중으로 보인다 (POLL-10)
      await page.keyboard.press("Escape");
      await page.goto("/poll");
      await expect(
        page.getByRole("heading", { name: "진행 중" }),
      ).toBeVisible();
      polls = await myPolls(s.token);
      await expect(page.getByText(polls[0]!.title).first()).toBeVisible();
      await expectNoA11yViolations(page);
      await shot(page, "tab");
    } finally {
      await s.cleanup();
    }
  });

  test("보내기 전 만들기 취소는 방을 지우고 하루 한도를 돌려준다 (D-15 안건 2)", async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await setup(page, context, baseURL!, "pc_undo");
    try {
      await startFriends(page);
      expect(await pollsUsed(s.token)).toBe(1);
      await sheet(page).getByRole("button", { name: "만들기 취소" }).click();
      await expect(sheet(page)).toHaveCount(0);
      await expect(
        page.getByText("투표방을 지웠습니다.", { exact: false }),
      ).toBeVisible();
      expect(await myPolls(s.token)).toHaveLength(0);
      expect(await pollsUsed(s.token)).toBe(0);
    } finally {
      await s.cleanup();
    }
  });

  test("링크 복사로 보내면 만들기 취소가 사라진다 (POLL-03, mark_poll_shared)", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const s = await setup(page, context, baseURL!, "pc_share");
    try {
      await startFriends(page);
      const dlg = sheet(page);
      await dlg.getByRole("button", { name: "링크 복사" }).click();
      await expect(dlg.getByRole("button", { name: "복사함" })).toBeVisible();
      await expect(
        dlg.getByRole("button", { name: "만들기 취소" }),
      ).toHaveCount(0);
      await expect
        .poll(async () => {
          const r = await rest<{ shared_at: string | null }[]>(
            env!,
            "polls?select=shared_at",
            { token: s.token },
          );
          return r.data?.[0]?.shared_at ?? null;
        })
        .not.toBeNull();
    } finally {
      await s.cleanup();
    }
  });

  test("빈 투표 탭은 오늘 추천으로 안내한다", async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await setup(page, context, baseURL!, "pc_empty");
    try {
      await page.goto("/poll");
      await expect(
        page.getByRole("heading", { name: "아직 투표가 없습니다" }),
      ).toBeVisible();
      await shot(page, "tab-empty");
      await expect(
        page.getByRole("link", { name: "회식 후보 찾기" }),
      ).toBeVisible();
      await expectNoA11yViolations(page);
    } finally {
      await s.cleanup();
    }
  });
});
