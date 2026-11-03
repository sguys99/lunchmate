// 투표방 E2E (T7.15~T7.19, T7.22, T7.24). POLL-05, POLL-06, POLL-08, POLL-09, POLL-11, POLL-12, AC-POLL-1, AC-POLL-2, AC-POLL-5.
//
// 실행
//   PLAYWRIGHT_BASE_URL=http://localhost:3102 RUN_DB_E2E=1 NEXT_PUBLIC_DESIGN_LAB=true \
//     pnpm exec playwright test --project=mobile --project=desktop --workers=1 e2e/poll-room.spec.ts
//   (POLL_SHOTS=1이면 docs/design/shots/2026-11-01/poll-live__*.png 캡처, 다크는 POLL_DARK=1)
// - 클라우드 개발 DB에 test_rls_ 사용자(방장, 참여자)를 만들고 끝나면 지운다. 투표방 제목은 test_ 접두(rls-cleanup이 지운다).
// - 투표방은 방장 세션 REST(create_poll)로 준비한다. 화면과 단언은 사용자 세션(RLS 적용, CLAUDE.md 7.1).
// - 마감 시각을 과거로 옮기는 준비(AC-POLL-2)만 secret 키(adminPatch)를 쓴다.
// - 카카오 SDK는 가짜(음식점 45곳, id는 워커마다 fakePlaceId 범위, 이름 "테스트식당N"). 후보 이름은 기준점 주변 매칭(T5.12a)으로 붙는다.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { adminPatch, rest, rpc } from "../src/lib/supabase/rls/harness";
import { expectNoA11yViolations } from "./helpers/axe";
import { fakePlaceId, mockRecommendSdks } from "./helpers/kakao-places-fake";
import { loadDbE2eEnv, readOwn, signInContext } from "./helpers/session";

const env = loadDbE2eEnv();
const OFFICE = { lat: 37.5665, lng: 126.978 };
const SHOTS = process.env.POLL_SHOTS === "1";
const SHOT_DIR = join(process.cwd(), "docs/design/shots/2026-11-01");
const PLACES = [0, 1, 2].map(fakePlaceId);
const NAMES = ["테스트식당1", "테스트식당2", "테스트식당3"];

test.use({ colorScheme: process.env.POLL_DARK === "1" ? "dark" : "light" });

async function shot(page: Page, name: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  if (!SHOTS) return;
  mkdirSync(SHOT_DIR, { recursive: true });
  const width = test.info().project.name === "mobile" ? "390" : "1280";
  const scheme = await page.evaluate(() =>
    matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );
  await page.waitForTimeout(500);
  await page.screenshot({
    path: join(SHOT_DIR, `poll-live__${name}__${width}-${scheme}.png`),
  });
}

async function prepPage(page: Page) {
  await mockRecommendSdks(page);
  await page.addInitScript(() => {
    addEventListener("DOMContentLoaded", () => {
      const st = document.createElement("style");
      st.textContent = "nextjs-portal{display:none!important}";
      document.head.append(st);
    });
  });
}

/** 로그인한 사용자 컨텍스트(약관 동의 끝) */
async function member(browser: Browser, baseURL: string, label: string) {
  const context = await browser.newContext({
    ...test.info().project.use,
    colorScheme: process.env.POLL_DARK === "1" ? "dark" : "light",
  });
  const signed = await signInContext(context, env!, baseURL, label);
  const token = signed.session.access_token;
  const agreed = await rest(env!, `profiles?user_id=eq.${signed.user.id}`, {
    method: "PATCH",
    token,
    body: {
      terms_agreed_at: new Date().toISOString(),
      birth_confirmed_at: new Date().toISOString(),
      nickname: `test_${label}`,
    },
  });
  expect(agreed.status).toBe(200);
  const page = await context.newPage();
  await prepPage(page);
  return {
    context,
    page,
    token,
    userId: signed.user.id,
    cleanup: signed.cleanup,
  };
}

type Created = { poll_id: string; invite_code: string };

async function createPoll(
  token: string,
  opts: { closesInMin?: number; multi?: boolean } = {},
) {
  const r = await rpc<Created[]>(
    env!,
    "create_poll",
    {
      p_kind: "lunch",
      p_title: `test_점심${Date.now().toString(36).slice(-4)}`,
      p_closes_at: new Date(
        Date.now() + (opts.closesInMin ?? 30) * 60_000,
      ).toISOString(),
      p_multi: opts.multi ?? false,
      p_place_ids: PLACES,
      p_place_urls: PLACES.map((p) => `https://place.map.kakao.com/${p}`),
      p_anchor_lat: OFFICE.lat,
      p_anchor_lng: OFFICE.lng,
      p_radius_m: 600,
    },
    token,
  );
  expect(r.error).toBeNull();
  return r.data![0]!;
}

const row = (page: Page, name: string) =>
  page.getByRole("radio", { name: new RegExp(`^${name}, `) });

test.describe("투표방 (실제 DB)", () => {
  test.skip(!env, "RUN_DB_E2E=1과 .env.local Supabase 값이 있을 때만");
  test.describe.configure({ mode: "serial" });

  const cleanups: (() => Promise<void>)[] = [];
  test.afterAll(async () => {
    for (const c of cleanups) await c().catch(() => undefined);
  });

  test("비로그인 미리보기 → 참여 → 실시간 득표 → 방장 결정 → 결과와 방문 후보", async ({
    browser,
    baseURL,
    page: guest,
  }) => {
    test.setTimeout(120_000);
    const host = await member(browser, baseURL!, "ph");
    const friend = await member(browser, baseURL!, "pf");
    cleanups.push(host.cleanup, friend.cleanup);
    const poll = await createPoll(host.token);

    // POLL-05: 비로그인 미리보기. 후보 이름, 참여 인원, 카운트다운, 득표 숨김, 로그인 유도
    await prepPage(guest);
    await guest.goto(`/poll/${poll.invite_code}`);
    await expect(guest.getByRole("heading", { level: 1 })).toContainText(
      "어디로 갈까요?",
    );
    for (const n of NAMES)
      await expect(guest.getByText(n, { exact: true })).toBeVisible();
    await expect(guest.getByText("1명 참여, 최대 30명")).toBeVisible();
    await expect(guest.getByText("득표는 참여한 뒤에 보입니다.")).toBeVisible();
    await expect(guest.getByRole("timer")).toBeVisible();
    await expect(guest.getByText(/^\d+표$/)).toHaveCount(0);
    const login = guest.getByRole("link", { name: "로그인하고 투표하기" });
    await expect(login).toHaveAttribute(
      "href",
      new RegExp(`next=%2Fpoll%2F${poll.invite_code}`),
    );
    await shot(guest, "guest");
    await expectNoA11yViolations(guest);

    // 방장 화면
    await host.page.goto(`/poll/${poll.invite_code}`);
    await expect(row(host.page, NAMES[0]!)).toBeVisible({ timeout: 20_000 });
    await expect(host.page.getByText("1명 중 0명 골랐습니다")).toBeVisible();
    await expect(host.page.getByText("내가 연 투표입니다")).toBeVisible();
    // "실시간"은 구독이 실제로 붙은(SUBSCRIBED) 뒤에만 보인다. 이후 친구의 표는 브로드캐스트로 온다
    await expect(host.page.getByText("실시간", { exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await shot(host.page, "host-empty");

    // 로그인한 참여자는 링크를 열면 바로 참여한다
    await friend.page.goto(`/poll/${poll.invite_code}`);
    await expect(row(friend.page, NAMES[1]!)).toBeVisible({ timeout: 20_000 });
    await expect(
      friend.page.getByText("test_ph 님이 열었습니다"),
    ).toBeVisible();
    await row(friend.page, NAMES[1]!).click();
    await expect(row(friend.page, NAMES[1]!)).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await shot(friend.page, "member-picked");
    await friend.page.getByRole("button", { name: "투표하기" }).click();
    await expect(
      friend.page.getByRole("button", { name: "선택 바꾸기" }),
    ).toBeVisible();
    await expect(
      friend.page.getByText("투표했어요. 마감 전까지 바꿀 수 있습니다."),
    ).toBeVisible();
    await expect(row(friend.page, NAMES[1]!)).toHaveAccessibleName(
      `${NAMES[1]}, 1표`,
    );
    await shot(friend.page, "member-voted");
    await expectNoA11yViolations(friend.page);

    // AC-POLL-1: 방장 화면이 2초 안에 갱신(실시간 집계, 새로 고치지 않음)
    await expect(row(host.page, NAMES[1]!)).toHaveAccessibleName(
      `${NAMES[1]}, 1표`,
      {
        timeout: 2_000,
      },
    );
    await expect(host.page.getByText("2명 중 1명 골랐습니다")).toBeVisible({
      timeout: 4_000,
    });
    await shot(host.page, "host-live");

    // 방장 투표 후 결정 (확인 한 번)
    await row(host.page, NAMES[1]!).click();
    await host.page.getByRole("button", { name: "투표하기" }).click();
    const decide = host.page.getByRole("button", { name: "지금 결정하기" });
    // 표가 저장되기 전에는 결정 버튼이 잠겨 있다(보내는 중 aria-disabled)
    await expect(decide).not.toHaveAttribute("aria-disabled", "true");
    await decide.click();
    await expect(host.page.getByText("지금 마감할까요?")).toBeVisible();
    await expect(
      host.page.getByRole("button", { name: "마감하고 정하기" }),
    ).toBeFocused();
    await shot(host.page, "host-decide");
    await host.page.getByRole("button", { name: "마감하고 정하기" }).click();

    // POLL-09: 결과(축하 한 줄, 확정 카드, 득표순, 길찾기 하나)
    await expect(
      host.page.getByRole("heading", { name: "오늘 점심은 여기로 정했어요." }),
    ).toBeVisible({
      timeout: 10_000,
    });
    await expect(host.page.getByText("방장이 마감했습니다.")).toBeVisible();
    await expect(
      host.page.getByRole("heading", { level: 2, name: NAMES[1] }),
    ).toBeVisible();
    await expect(
      host.page.getByRole("button", { name: "길찾기" }),
    ).toBeVisible();
    await expect(
      host.page.getByRole("button", { name: "결과 공유" }),
    ).toBeVisible();
    await shot(host.page, "result");
    await expectNoA11yViolations(host.page);

    // 참여자 화면도 결과로 바뀐다(실시간 상태 변경 → 다시 읽기)
    await expect(
      friend.page.getByRole("heading", {
        name: "오늘 점심은 여기로 정했어요.",
      }),
    ).toBeVisible({ timeout: 6_000 });

    // AC-POLL-5: 참여자 전원의 방문 후보
    for (const u of [host, friend]) {
      const visits = await readOwn<
        { place_id: string; source: string; status: string }[]
      >(
        env!,
        u.token,
        `visits?select=place_id,source,status&place_id=eq.${PLACES[1]}`,
      );
      expect(
        visits.some((v) => v.source === "poll" && v.status === "candidate"),
      ).toBe(true);
    }

    // 공개 결과 링크: 참여자는 투표방으로, 비로그인은 식당 이름 없이 안내
    await guest.goto(`/poll/${poll.invite_code}/result`);
    await expect(guest.getByRole("heading", { level: 1 })).toContainText(
      "정해졌어요",
    );
    await expect(guest.getByText(NAMES[1]!)).toHaveCount(0);
    await shot(guest, "public-result");
    await expectNoA11yViolations(guest);

    await host.context.close();
    await friend.context.close();
  });

  test("AC-POLL-2: 아무도 열지 않은 만료 투표가 다음 조회 때 확정된다, 동점과 취소", async ({
    browser,
    baseURL,
  }) => {
    test.setTimeout(120_000);
    const host = await member(browser, baseURL!, "qh");
    const a = await member(browser, baseURL!, "qa");
    cleanups.push(host.cleanup, a.cleanup);

    // 1) 표 하나, 마감을 과거로 옮김(크론보다 먼저 조회가 확정해야 한다)
    const p1 = await createPoll(host.token);
    await rpc(env!, "join_poll", { p_code: p1.invite_code }, a.token);
    const got = await rpc<{ candidates: { id: string; place_id: string }[] }>(
      env!,
      "get_poll",
      { p_poll_id: p1.poll_id },
      a.token,
    );
    const target = got.data!.candidates.find((c) => c.place_id === PLACES[2])!;
    await rpc(
      env!,
      "cast_vote",
      { p_poll_id: p1.poll_id, p_candidate_ids: [target.id] },
      a.token,
    );
    await adminPatch(env!, "polls", `id=eq.${p1.poll_id}`, {
      closes_at: new Date(Date.now() - 60_000).toISOString(),
    });
    await a.page.goto(`/poll/${p1.invite_code}`);
    await expect(
      a.page.getByRole("heading", { name: "오늘 점심은 여기로 정했어요." }),
    ).toBeVisible({
      timeout: 20_000,
    });
    await expect(a.page.getByText("마감 시각에 정해졌습니다.")).toBeVisible();
    await expect(
      a.page.getByRole("heading", { level: 2, name: NAMES[2] }),
    ).toBeVisible();

    // 2) 동점: 두 사람이 다른 곳, 방장이 지금 결정 → 동점 대기 → 방장이 직접 고름
    const p2 = await createPoll(host.token);
    await rpc(env!, "join_poll", { p_code: p2.invite_code }, a.token);
    const g2 = await rpc<{ candidates: { id: string; place_id: string }[] }>(
      env!,
      "get_poll",
      { p_poll_id: p2.poll_id },
      host.token,
    );
    const c0 = g2.data!.candidates.find((c) => c.place_id === PLACES[0])!;
    const c1 = g2.data!.candidates.find((c) => c.place_id === PLACES[1])!;
    await rpc(
      env!,
      "cast_vote",
      { p_poll_id: p2.poll_id, p_candidate_ids: [c0.id] },
      host.token,
    );
    await rpc(
      env!,
      "cast_vote",
      { p_poll_id: p2.poll_id, p_candidate_ids: [c1.id] },
      a.token,
    );
    await rpc(env!, "close_poll_now", { p_poll_id: p2.poll_id }, host.token);

    await a.page.goto(`/poll/${p2.invite_code}`);
    await expect(a.page.getByText("방장이 동점을 정하는 중입니다")).toBeVisible(
      { timeout: 20_000 },
    );
    await expect(
      a.page.getByText("30분 안에 정하지 않으면 룰렛으로 정합니다."),
    ).toBeVisible();
    await shot(a.page, "tie-member");

    await host.page.goto(`/poll/${p2.invite_code}`);
    await expect(host.page.getByText("2곳이 동점입니다")).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      host.page.getByRole("button", { name: "룰렛에 맡기기" }),
    ).toBeVisible();
    await row(host.page, NAMES[0]!).click();
    await shot(host.page, "tie-host");
    await expectNoA11yViolations(host.page);
    await host.page
      .getByRole("button", { name: `${NAMES[0]}로 정하기` })
      .click();
    await expect(
      host.page.getByText("동점이라 방장이 정했습니다."),
    ).toBeVisible({ timeout: 10_000 });

    // 3) 방장 취소(POLL-12) → 참여자에게 취소 안내
    const p3 = await createPoll(host.token);
    await rpc(env!, "join_poll", { p_code: p3.invite_code }, a.token);
    await host.page.goto(`/poll/${p3.invite_code}`);
    await expect(row(host.page, NAMES[0]!)).toBeVisible({ timeout: 20_000 });
    await host.page.getByRole("button", { name: "투표 관리 더 보기" }).click();
    await host.page.getByRole("menuitem", { name: "투표 취소하기" }).click();
    await expect(
      host.page.getByRole("button", { name: "취소하기" }),
    ).toBeFocused();
    await host.page.getByRole("button", { name: "취소하기" }).click();
    await expect(
      host.page.getByRole("heading", { name: "방장이 투표를 취소했습니다" }),
    ).toBeVisible({
      timeout: 10_000,
    });
    await a.page.goto(`/poll/${p3.invite_code}`);
    await expect(
      a.page.getByRole("heading", { name: "방장이 투표를 취소했습니다" }),
    ).toBeVisible({
      timeout: 20_000,
    });
    await shot(a.page, "canceled");

    // 없는 코드
    await a.page.goto("/poll/zzzzzzzzzzzz");
    await expect(
      a.page.getByRole("heading", { name: "투표를 찾을 수 없습니다" }),
    ).toBeVisible();

    await host.context.close();
    await a.context.close();
  });

  test("T9.10: 참여자 얼굴과 나 탭 머리에 프로필 사진, 받지 못하면 이니셜", async ({
    browser,
    baseURL,
  }) => {
    test.setTimeout(90_000);
    const host = await member(browser, baseURL!, "pv");
    const friend = await member(browser, baseURL!, "pw");
    cleanups.push(host.cleanup, friend.cleanup);
    // 허용 CDN(profiles_avatar_url_host) 주소를 본인 세션으로 넣는다. 사진은 가로채 1px PNG로 돌려준다(외부 요청 없음).
    // 친구 사진은 404로 돌려 실패 대체(이니셜)를 본다.
    const OK = "https://lh3.googleusercontent.com/a/test_ok=s96-c";
    const BROKEN = "https://lh3.googleusercontent.com/a/test_broken=s96-c";
    for (const [who, url] of [
      [host, OK],
      [friend, BROKEN],
    ] as const) {
      const r = await rest(env!, `profiles?user_id=eq.${who.userId}`, {
        method: "PATCH",
        token: who.token,
        body: { avatar_url: url },
      });
      expect(r.status).toBe(200);
    }
    const PNG = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );
    const referers: (string | undefined)[] = [];
    for (const ctx of [host.context, friend.context]) {
      await ctx.route("https://lh3.googleusercontent.com/**", (route) => {
        referers.push(route.request().headers()["referer"]);
        return route.request().url().includes("test_ok")
          ? route.fulfill({ status: 200, contentType: "image/png", body: PNG })
          : route.fulfill({ status: 404, body: "" });
      });
    }

    const poll = await createPoll(host.token);
    await friend.page.goto(`/poll/${poll.invite_code}`);
    await expect(row(friend.page, NAMES[0]!)).toBeVisible({ timeout: 20_000 });

    // 친구 화면: 방장 사진은 이미지로, 친구 본인은 사진을 받지 못해 이니셜(같은 32px 자리)
    const faces = friend.page.locator("[data-slot=avatar]");
    await expect(faces).toHaveCount(2);
    const hostImg = friend.page.locator(
      `[data-slot=avatar-image][src="${OK}"]`,
    );
    await expect(hostImg).toBeVisible({ timeout: 10_000 });
    await expect(hostImg).toHaveAttribute("alt", "");
    await expect(hostImg).toHaveAttribute("referrerpolicy", "no-referrer");
    await expect(friend.page.locator(`img[src="${BROKEN}"]`)).toHaveCount(0);
    await expect(
      friend.page.locator("[data-slot=avatar-fallback]"),
    ).toHaveCount(1);
    for (const box of [
      await faces.nth(0).boundingBox(),
      await faces.nth(1).boundingBox(),
    ]) {
      expect(Math.round(box!.width)).toBe(32);
      expect(Math.round(box!.height)).toBe(32);
    }
    await expectNoA11yViolations(friend.page);

    // 방장 화면도 친구가 참여한 뒤 두 얼굴
    await host.page.goto(`/poll/${poll.invite_code}`);
    await expect(row(host.page, NAMES[0]!)).toBeVisible({ timeout: 20_000 });
    await expect(
      host.page.locator(`[data-slot=avatar-image][src="${OK}"]`),
    ).toBeVisible({ timeout: 10_000 });
    await shot(host.page, "avatars");

    // 나 탭 머리: 인사 앞 24px 얼굴
    await host.page.goto("/me");
    const meImg = host.page.locator(`header [data-slot=avatar-image]`);
    await expect(meImg).toBeVisible({ timeout: 20_000 });
    await expect(meImg).toHaveAttribute("src", OK);
    const meBox = await host.page
      .locator("header [data-slot=avatar]")
      .boundingBox();
    expect(Math.round(meBox!.width)).toBe(24);
    await expect(host.page.getByText("test_pv님")).toBeVisible();
    await expectNoA11yViolations(host.page);

    // 사진 요청에 Referer를 싣지 않는다
    expect(referers.length).toBeGreaterThan(0);
    expect(referers.every((r) => !r)).toBe(true);

    await host.context.close();
    await friend.context.close();
  });
});
