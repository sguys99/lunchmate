// 투표 한 흐름 E2E (T7.31): 홈 "친구랑 정하기"로 만들기 → 링크 복사 → 친구가 링크로 참여해 투표 → 방장 투표 → 결정 → 두 화면 모두 결과.
// poll-create.spec.ts(만들기와 고치기)와 poll-room.spec.ts(REST로 만든 방의 투표, 실시간, 동점)가 나눠 보는 것을
// 사용자 화면만으로 처음부터 끝까지 잇는다. Playwright 브라우저 컨텍스트 두 개(방장, 친구).
//
// 실행
//   PLAYWRIGHT_BASE_URL=http://localhost:3102 RUN_DB_E2E=1 pnpm test:e2e:poll
//   (.env.local의 Supabase 값이 있을 때만 돈다. 진입점은 flags.pollEntry(T7.35 해제) 뒤에 보이므로 그 전에는 건너뛴다)
// - 클라우드 개발 DB에 test_rls_ 사용자를 만들고 끝나면 지운다. 방 제목은 test_로 바꿔 rls-cleanup이 지우게 한다. 카카오 SDK는 가짜(음식점 45곳).
// - 초대 코드는 방장 세션으로 polls를 읽어 얻는다(RLS: 참여자 읽기). 화면 단언은 모두 사용자 세션.
import { expect, test, type Browser, type Page } from "@playwright/test";
import { rest, rpc } from "../src/lib/supabase/rls/harness";
import { FLAGS } from "../src/lib/flags";
import { expectNoA11yViolations } from "./helpers/axe";
import { mockRecommendSdks } from "./helpers/kakao-places-fake";
import { loadDbE2eEnv, readOwn, signInContext } from "./helpers/session";

const env = loadDbE2eEnv();
const OFFICE = { lat: 37.5665, lng: 126.978 };
const pollEntryOn =
  FLAGS.pollEntry.source.type === "const" && FLAGS.pollEntry.source.value;

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

/** 로그인, 약관 동의, 사무실 1곳까지 마친 사용자 컨텍스트 */
async function user(browser: Browser, baseURL: string, label: string) {
  const context = await browser.newContext({ ...test.info().project.use });
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
  const page = await context.newPage();
  await prepPage(page);
  return { context, page, token, cleanup: signed.cleanup };
}

/** 후보 줄(라디오) 첫 번째 */
const firstRow = (page: Page) =>
  page.getByRole("radiogroup").getByRole("radio").first();

test.describe("투표 한 흐름 (실제 DB, T7.31)", () => {
  test.skip(!env, "RUN_DB_E2E=1과 Supabase 값(.env.local)이 있어야 실행합니다");
  test.skip(!pollEntryOn, "flags.pollEntry가 꺼져 있습니다(T7.35에서 해제)");

  test("홈에서 만들기 → 링크 복사 → 친구 참여와 투표 → 방장 투표와 결정 → 두 화면 결과, 방문 후보", async ({
    browser,
    baseURL,
  }) => {
    test.setTimeout(150_000);
    const host = await user(browser, baseURL!, "pw_host");
    const friend = await user(browser, baseURL!, "pw_friend");
    try {
      // 1. 방장: 홈 "친구랑 정하기" 한 번에 오늘 세 곳으로 방이 생긴다(POLL-02)
      await host.page.goto("/today");
      await expect(host.page.locator(".lm-today-deck article h2")).toBeVisible({
        timeout: 20_000,
      });
      await host.page.getByRole("button", { name: "친구랑 정하기" }).click();
      const dlg = host.page.getByRole("dialog");
      await expect(
        dlg.getByRole("heading", { name: "투표방을 만들었어요" }),
      ).toBeVisible({ timeout: 15_000 });

      // 2. 링크 복사로 보낸다(POLL-03). 보낸 뒤에는 만들기 취소가 사라진다
      await host.context.grantPermissions([
        "clipboard-read",
        "clipboard-write",
      ]);
      await dlg.getByRole("button", { name: "링크 복사" }).click();
      await expect(
        dlg.getByRole("button", { name: "만들기 취소" }),
      ).toHaveCount(0, { timeout: 10_000 });

      const polls = await readOwn<{ id: string; invite_code: string }[]>(
        env!,
        host.token,
        "polls?select=id,invite_code&order=created_at.desc&limit=1",
      );
      const code = polls[0]!.invite_code;
      expect(code.length).toBeGreaterThanOrEqual(10);
      // 사용자를 지워도 끝난 방은 방장 없이 남으므로 rls-cleanup이 찾도록 test_ 제목으로 바꿔 둔다
      const renamed = await rpc(
        env!,
        "update_poll",
        {
          p_poll_id: polls[0]!.id,
          p_title: `test_흐름${Date.now().toString(36).slice(-4)}`,
        },
        host.token,
      );
      expect(renamed.error).toBeNull();
      await host.page.keyboard.press("Escape");

      // 3. 방장은 투표방에서 실시간 구독이 붙을 때까지 기다린다
      await host.page.goto(`/poll/${code}`);
      await expect(firstRow(host.page)).toBeVisible({ timeout: 20_000 });
      await expect(host.page.getByText("실시간", { exact: true })).toBeVisible({
        timeout: 10_000,
      });

      // 4. 친구: 링크를 열면 바로 참여하고 첫 후보에 투표한다
      await friend.page.goto(`/poll/${code}`);
      await expect(firstRow(friend.page)).toBeVisible({ timeout: 20_000 });
      await firstRow(friend.page).click();
      await friend.page.getByRole("button", { name: "투표하기" }).click();
      await expect(
        friend.page.getByRole("button", { name: "선택 바꾸기" }),
      ).toBeVisible();

      // AC-POLL-1: 방장 화면이 2초 안에 친구의 표를 보인다
      await expect(firstRow(host.page)).toHaveAccessibleName(/, 1표$/, {
        timeout: 2_000,
      });
      await expect(host.page.getByText("2명 중 1명 골랐습니다")).toBeVisible({
        timeout: 4_000,
      });

      // 5. 방장도 같은 곳에 투표하고 결정한다(확인 한 번)
      await firstRow(host.page).click();
      await host.page.getByRole("button", { name: "투표하기" }).click();
      const decide = host.page.getByRole("button", { name: "지금 결정하기" });
      await expect(decide).not.toHaveAttribute("aria-disabled", "true");
      await decide.click();
      await host.page.getByRole("button", { name: "마감하고 정하기" }).click();

      // 6. 두 화면 모두 결과(POLL-08, POLL-09)
      for (const p of [host.page, friend.page]) {
        await expect(
          p.getByRole("heading", {
            // 홈 끼니를 따르므로 15시(KST) 뒤에는 저녁 투표가 된다
            name: /^오늘 (점심|저녁)은 여기로 정했어요\.$/,
          }),
        ).toBeVisible({ timeout: 10_000 });
        await expect(p.getByRole("button", { name: "길찾기" })).toBeVisible();
      }
      await expectNoA11yViolations(friend.page);

      // AC-POLL-5: 두 사람 모두 방문 후보(source poll)
      for (const u of [host, friend]) {
        const visits = await readOwn<{ source: string; status: string }[]>(
          env!,
          u.token,
          "visits?select=source,status&source=eq.poll",
        );
        expect(visits.some((v) => v.status === "candidate")).toBe(true);
      }
    } finally {
      await host.context.close().catch(() => undefined);
      await friend.context.close().catch(() => undefined);
      await host.cleanup();
      await friend.cleanup();
    }
  });
});
