// 피드백 제출 후 다음 추천 변화 E2E (T6.30). AC-REC-5, FB-01, FB-05, HIS-01, G6 "피드백이 다음 추천에 반영".
//
// 실행
//   PLAYWRIGHT_BASE_URL=http://localhost:3100 pnpm test:e2e:feedback-reco
//   (스크립트가 RUN_DB_E2E=1, --workers=1을 켠다. .env.local의 Supabase 값이 있을 때만 돈다)
// - 클라우드 개발 DB에 test_rls_ 사용자를 만들고(약관 동의, 사무실 1곳, 방문 후보) 끝나면 지운다(cascade).
//   방문일(visited_on)은 서버가 오늘로 정하므로 준비 단계에서만 secret 키로 지난 날로 옮긴다(feedback.spec과 같은 방식).
//   답(👍, 👎, 안 갔어요)은 화면에서 누르고, 확인은 본인 세션(RLS 적용)으로 읽는다(CLAUDE.md 7.1).
// - 카카오 SDK는 가짜(음식점 45곳, kakao-places-fake.ts)라 후보 집합이 매번 같다.
//
// 결정성
// - 묶음은 drawDeck(입력, seed)이고 seed는 today-store randomSeed() = floor(Math.random() × 2^31)이다.
//   첫 스크립트로 Math.random을 상수로 바꿔 seed를 고정한다(앱 코드에 테스트 훅을 두지 않는다).
//   같은 후보, 같은 설정, 같은 기록이면 새로 고쳐도 같은 묶음이다(기준 묶음을 두 번 읽어 먼저 확인한다).
// - 아래 seed는 가짜 45곳 + 기본 설정(점심 1만, 저녁 2만, 도보 10분)에서 엔진(src/features/rec/deck.ts)을 직접 돌려 골랐다.
//   하루 중 어느 시각이든, 점심과 저녁 모두 같은 결과임을 확인했다(감쇠가 시각에 따라 조금 달라도 순위가 바뀌지 않는 폭).
//   - 👎: 4일 전 방문(반복 창 3일 밖)인 테스트식당8(샐러드, 점수 7위)에 👎를 남기면 P가 0.5 → 약 0.27로 내려
//     점수 17위가 된다. 추첨은 상위 10곳에서만 하므로 seed와 상관없이 첫 묶음에 다시 나오지 않는다.
//   - 안 갔어요(FB-05): 반복 창 밖 방문의 "안 갔어요"는 선호와 반복 어디에도 쓰지 않으므로 점수가 그대로다 → 같은 seed면 같은 묶음.
//     어제 방문(반복 창 안)의 "안 갔어요"는 반복 감점을 거둔다(부정 신호가 아니다) → 빠져 있던 곳이 후보로 돌아온다.
//   - 👍: P가 약 0.73으로 올라 1위가 되고, 카드 이유가 "최근 👍한 샐러드"가 된다.
// - 이 전제는 src/features/rec/feedback-reco.test.ts가 엔진으로 묶어 둔다(점심, 저녁, 하루 다섯 시각).
// - 엔진 가중치나 가짜 후보가 바뀌면 seed를 다시 골라야 한다. 기준 묶음 확인(전제)이 먼저 실패하므로 원인을 바로 알 수 있다.
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { adminPatch, rest } from "../src/lib/supabase/rls/harness";
import { fakePlaceId, mockRecommendSdks } from "./helpers/kakao-places-fake";
import { loadDbE2eEnv, readOwn, signInContext } from "./helpers/session";

const env = loadDbE2eEnv();
const OFFICE = { lat: 37.5665, lng: 126.978 };

/** 묶음 seed. 2^30 + n */
const SEED_DOWN = 2 ** 30 + 2; // 기준 묶음에 테스트식당8이 있다
const SEED_UP = 2 ** 30 + 5; // 기준 묶음에 테스트식당8이 없고, 👍 뒤 큰 카드가 테스트식당8

/** 가짜 i번째 곳의 이름(kakao-places-fake.ts: "테스트식당" + (i + 1)) */
const fakeName = (i: number) => `테스트식당${i + 1}`;
const SALAD = 7; // 7 % 10 = 샐러드
const PASTA = 3; // 3 % 10 = 양식

function kstDate(days: number): string {
  const d = new Date(Date.now() + 9 * 3_600_000 + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/**
 * seed가 정확히 나오도록 randomSeed()가 부를 때만 Math.random을 상수로(randomSeed = floor(r × 2^31)).
 * 다른 호출(서버 액션, SDK 내부 id 등)은 원래 난수를 쓴다. 모든 호출을 상수로 두면 답 버튼 저장이 멈춘다.
 * dev 서버(E2E 대상)는 함수 이름을 지우지 않아 호출 스택에 randomSeed가 남는다.
 */
async function fixSeed(page: Page, seed: number) {
  await page.addInitScript(
    (r) => {
      const real = Math.random.bind(Math);
      Math.random = () =>
        (new Error().stack ?? "").includes("randomSeed") ? r : real();
    },
    (seed + 0.5) / 2 ** 31,
  );
}

async function setup(
  page: Page,
  context: BrowserContext,
  baseURL: string,
  label: string,
  seed: number,
  visits: { index: number; daysAgo: number }[],
) {
  await mockRecommendSdks(page);
  await fixSeed(page, seed);
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
  const ids: string[] = [];
  for (const v of visits) {
    const placeId = fakePlaceId(v.index);
    const r = await rest<{ id: string }[]>(env!, "visits", {
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
    expect(r.status).toBe(201);
    const id = r.data![0]!.id;
    ids.push(id);
    const day = kstDate(-v.daysAgo);
    await adminPatch(env!, "visits", `id=eq.${id}`, {
      visited_on: day,
      created_at: `${day}T03:10:00Z`,
    });
  }
  return { token, visitIds: ids, cleanup: signed.cleanup };
}

/** 지금 보이는 카드 이름(큰 카드 + 대안 2장). 첫 묶음이 다 그려진 뒤 읽는다 */
async function deckNames(page: Page): Promise<string[]> {
  const deck = page.locator(".lm-today-deck");
  await expect(deck.locator("article h2")).toBeVisible({ timeout: 20_000 });
  await expect(deck.locator("#today-alt + ul li")).toHaveCount(2);
  await expect(page.locator('[data-slot="loading-region"]')).toHaveCount(0);
  const hero = (await deck.locator("article h2").innerText()).trim();
  const alts = await deck
    .locator("#today-alt + ul li button span.type-label")
    .allInnerTexts();
  const names = [hero, ...alts.map((s) => s.trim())];
  expect(names).toHaveLength(3);
  return names;
}

/** 새로 들어온 오늘 화면의 첫 묶음(세션 메모리가 비어 seed가 다시 고정값으로 정해진다) */
async function freshDeck(page: Page): Promise<string[]> {
  await page.goto("/today");
  return deckNames(page);
}

/** 나 탭 기록의 "○○, 다녀오셨나요?" 한 줄에서 답한다(HIS-01 늦은 답) */
async function answerInMe(
  page: Page,
  index: number,
  answer: "좋았어요" | "별로였어요" | "안 갔어요",
) {
  await page.goto("/me");
  const ask = page.getByRole("group", {
    name: `${fakeName(index)}, 다녀오셨나요?`,
  });
  await expect(ask).toBeVisible({ timeout: 15_000 });
  await ask.getByRole("button", { name: answer, exact: true }).click();
  await expect(
    page.getByText(
      answer === "안 갔어요"
        ? "안 간 곳으로 기록했습니다. 추천 점수에는 쓰지 않습니다."
        : "기록했습니다.",
    ),
  ).toBeVisible();
}

test.describe("피드백 → 다음 추천 (T6.30)", () => {
  test.skip(!env, "RUN_DB_E2E=1과 Supabase 값(.env.local)이 있어야 실행합니다");

  test("나 탭 늦은 답: 안 갔어요는 묶음을 바꾸지 않고(FB-05), 👎 뒤에는 그곳이 첫 묶음에서 빠진다", async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await setup(page, context, baseURL!, "fbr1", SEED_DOWN, [
      { index: SALAD, daysAgo: 4 },
      { index: PASTA, daysAgo: 4 },
    ]);
    try {
      // 기준: 같은 seed면 새로 고쳐도 같은 묶음이고, 테스트식당8(4일 전 방문, 답 없음)이 들어 있다
      const base = await freshDeck(page);
      expect(await freshDeck(page)).toEqual(base);
      expect(base).toContain(fakeName(SALAD));

      // 안 갔어요(테스트식당4): 부정 신호가 아니다 → 다음 묶음이 그대로
      await answerInMe(page, PASTA, "안 갔어요");
      await expect
        .poll(() =>
          readOwn<{ status: string }[]>(
            env!,
            s.token,
            `visits?id=eq.${s.visitIds[1]}&select=status`,
          ),
        )
        .toEqual([{ status: "not_visited" }]);
      expect(await freshDeck(page)).toEqual(base);

      // 👎(테스트식당8): 선호가 내려가 상위 10곳 밖 → 다음 묶음에 없다
      await answerInMe(page, SALAD, "별로였어요");
      await expect
        .poll(() =>
          readOwn<{ rating: string }[]>(
            env!,
            s.token,
            `reviews?visit_id=eq.${s.visitIds[0]}&select=rating`,
          ),
        )
        .toEqual([{ rating: "down" }]);
      const after = await freshDeck(page);
      expect(after).not.toContain(fakeName(SALAD));
      expect(after).not.toEqual(base);
      // 다시 뽑기 뒤에도 바로 돌아오지 않는다(남은 상위 후보가 먼저)
      await page.getByRole("button", { name: "다시 뽑기" }).click();
      await expect
        .poll(async () => {
          const now = await deckNames(page).catch(() => after);
          return now.every((n) => !after.includes(n)) ? now : null;
        })
        .not.toBeNull();
      expect(await deckNames(page)).not.toContain(fakeName(SALAD));
    } finally {
      await s.cleanup();
    }
  });

  test("나 탭 늦은 답: 👍 뒤에는 그곳이 큰 카드로 올라오고 이유에 👍가 보인다", async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await setup(page, context, baseURL!, "fbr2", SEED_UP, [
      { index: SALAD, daysAgo: 4 },
    ]);
    try {
      const base = await freshDeck(page);
      expect(await freshDeck(page)).toEqual(base);
      expect(base).not.toContain(fakeName(SALAD));

      await answerInMe(page, SALAD, "좋았어요");
      await expect
        .poll(() =>
          readOwn<{ rating: string }[]>(
            env!,
            s.token,
            `reviews?visit_id=eq.${s.visitIds[0]}&select=rating`,
          ),
        )
        .toEqual([{ rating: "up" }]);
      const after = await freshDeck(page);
      expect(after[0]).toBe(fakeName(SALAD));
      const hero = page.locator(".lm-today-deck article");
      // 👍 뒤에 숨김 글자 "좋아요"가 붙는다(T8.9 F6, EmojiText). 보이는 글자는 그대로
      await expect(hero).toContainText("최근 👍좋아요한 샐러드");
      // 왜 추천했나요? 펼치기에도 같은 근거
      await hero.getByRole("button", { name: "왜 추천했나요?" }).click();
      await expect(hero).toContainText("최근 이 집에 👍좋아요를 남겼습니다.");
    } finally {
      await s.cleanup();
    }
  });

  test("홈 띠: 어제 간 곳에 안 갔어요라고 답하면 반복 감점이 풀려 다음 묶음 후보로 돌아온다(FB-01, FB-05)", async ({
    page,
    context,
    baseURL,
  }) => {
    const s = await setup(page, context, baseURL!, "fbr3", SEED_DOWN, [
      { index: SALAD, daysAgo: 1 },
    ]);
    try {
      // 어제 길찾기만 누른 곳(답 없음)은 최근 3일 반복 감점으로 첫 묶음에 없다
      const base = await freshDeck(page);
      expect(base).not.toContain(fakeName(SALAD));
      const band = page.getByRole("region", { name: "어제 식사" });
      await expect(band.getByRole("heading", { level: 2 })).toContainText(
        fakeName(SALAD),
        { timeout: 15_000 },
      );
      await band
        .getByRole("button", { name: "안 갔어요", exact: true })
        .click();
      await expect(
        band.getByText("추천 점수에는 쓰지 않습니다."),
      ).toBeVisible();
      await expect
        .poll(() =>
          readOwn<{ status: string }[]>(
            env!,
            s.token,
            `visits?id=eq.${s.visitIds[0]}&select=status`,
          ),
        )
        .toEqual([{ status: "not_visited" }]);
      // 다음 묶음(같은 seed): 기록이 없는 사용자와 같은 점수라 테스트식당8이 들어온다. 👎처럼 내려가지 않는다
      const after = await freshDeck(page);
      expect(after).toContain(fakeName(SALAD));
    } finally {
      await s.cleanup();
    }
  });
});
