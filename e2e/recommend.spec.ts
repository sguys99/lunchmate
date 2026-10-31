// 추천 → 길찾기 E2E (T5.40). REC-01~05, REC-08, NAV-01~04, AC-REC-2.
//
// 실행
//   PLAYWRIGHT_BASE_URL=http://localhost:3100 pnpm test:e2e:recommend
//   (스크립트가 RUN_DB_E2E=1을 켠다. 로그인 사용자 테스트는 .env.local의 Supabase 값이 있을 때만 돈다)
// - 카카오, 네이버 SDK는 가짜다(e2e/helpers/kakao-places-fake.ts, 음식점 45곳). 실제 SDK 인증은 범위 밖이다.
// - 네이버 지도 웹(map.naver.com)은 가로채 빈 페이지로 응답한다. 주소 모양만 확인한다.
// - 모바일(390) 프로젝트는 Desktop Chrome UA라 앱 시도 분기를 타지 않는다. 그래서 첫 스크립트로 iPhone UA를 보이게 해
//   nmap:// 시도 → 1.5초 안에 페이지가 가려지지 않음(앱 없음) → 같은 탭에서 네이버 지도 웹으로 가는 흐름을 확인한다.
//   실제 앱 실행과 iOS Safari 경고 동작은 실기기 확인 항목이다(T5.42).
// - 로그인 사용자: 클라우드 개발 DB에 test_rls_ 사용자를 만들고(약관 동의, 사무실 1곳은 본인 세션 REST) 끝나면 지운다.
//   visits 확인은 본인 세션(publishable 키 + 사용자 토큰, RLS 적용)으로만 읽는다. service role은 사용자 생성과 삭제에만 쓴다.
import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type Request,
} from "@playwright/test";
import { rest } from "../src/lib/supabase/rls/harness";
import { mockRecommendSdks } from "./helpers/kakao-places-fake";
import { loadDbE2eEnv, readOwn, signInContext } from "./helpers/session";

const env = loadDbE2eEnv();

/** 비로그인 둘러보기의 현위치(브라우저 측위 흉내). 길찾기 URL 어디에도 나오면 안 된다 */
const HERE = { latitude: 37.5701234, longitude: 126.9812345 };
const OFFICE = { lat: 37.5665, lng: 126.978 };
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

const isMobileProject = () => test.info().project.name === "mobile";

/** 네이버 지도 웹은 빈 페이지로 응답(새 탭, 같은 탭 모두 컨텍스트에서 가로챔) */
async function stubNaverWeb(context: BrowserContext) {
  await context.route("https://map.naver.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>naver map stub</title>",
    }),
  );
}

/** 모바일 프로젝트에서 앱 시도 분기를 타게 iPhone UA와 터치를 보이게 한다 */
async function asPhone(page: Page) {
  await page.addInitScript((ua) => {
    Object.defineProperty(Navigator.prototype, "userAgent", { get: () => ua });
    Object.defineProperty(Navigator.prototype, "maxTouchPoints", {
      get: () => 5,
    });
  }, IPHONE_UA);
}

/** 지금 보이는 카드 이름(큰 카드 + 대안). 셔플 중이 아닐 때 읽는다 */
async function cardNames(page: Page): Promise<string[]> {
  const deck = page.locator(".lm-today-deck");
  const hero = await deck.locator("article h2").innerText();
  const alts = await deck
    .locator("#today-alt + ul li button span.type-label")
    .allInnerTexts();
  return [hero.trim(), ...alts.map((s) => s.trim())];
}

async function expectThreeCards(page: Page) {
  const deck = page.locator(".lm-today-deck");
  await expect(deck.locator("article h2")).toBeVisible({ timeout: 20_000 });
  await expect(deck.locator("#today-alt + ul li")).toHaveCount(2);
  await expect(page.locator('[data-slot="loading-region"]')).toHaveCount(0);
  const names = await cardNames(page);
  expect(names).toHaveLength(3);
  expect(new Set(names).size).toBe(3);
  return names;
}

/**
 * 길찾기를 누르고 열린 네이버 지도 웹 주소를 돌려준다.
 * 데스크톱: 새 탭(NAV-03). 모바일: nmap:// 시도 뒤 같은 탭이 웹으로 바뀐다(NAV-01, NAV-02).
 */
async function clickDirections(
  page: Page,
  heroName: string,
): Promise<{ web: string; app: string | null }> {
  const button = page.getByRole("button", { name: `${heroName} 길찾기` });
  await expect(button).toBeVisible();
  if (!isMobileProject()) {
    const [popup] = await Promise.all([
      page.context().waitForEvent("page"),
      button.click(),
    ]);
    await popup.waitForLoadState("domcontentloaded");
    const web = popup.url();
    await popup.close();
    return { web, app: null };
  }
  const appRequests: string[] = [];
  const onRequest = (r: Request) => {
    if (r.url().startsWith("nmap://")) appRequests.push(r.url());
  };
  page.on("request", onRequest);
  const started = Date.now();
  await button.click();
  await page.waitForURL(/^https:\/\/map\.naver\.com\//, { timeout: 10_000 });
  const elapsed = Date.now() - started;
  page.off("request", onRequest);
  // 앱을 먼저 시도하고, 감지 시간(1.5초)이 지나서야 웹으로 간다
  expect(appRequests).toHaveLength(1);
  expect(elapsed).toBeGreaterThanOrEqual(1400);
  return { web: page.url(), app: appRequests[0] ?? null };
}

function expectNoCoords(url: string, lat: number, lng: number) {
  const decoded = decodeURIComponent(url);
  for (const n of [lat, lng]) {
    expect(decoded).not.toContain(String(n));
    expect(decoded).not.toContain(n.toFixed(5));
  }
}

test.describe("비로그인 둘러보기: 추천 → 길찾기", () => {
  test.use({ geolocation: HERE, permissions: ["geolocation"] });

  test.beforeEach(async ({ page, context }) => {
    await stubNaverWeb(context);
    await mockRecommendSdks(page);
    if (isMobileProject()) await asPhone(page);
  });

  test("현위치 기준 카드 3장 → 길찾기(현위치 좌표는 URL에 없음)", async ({
    page,
  }) => {
    await page.goto("/today");
    const [heroName] = await expectThreeCards(page);
    // 기준 위치 칩이 현위치다(둘러보기는 사무실이 없다)
    await expect(
      page.getByRole("button", { name: /^기준 위치 현위치/ }),
    ).toBeVisible();

    const { web, app } = await clickDirections(page, heroName!);
    // 웹: 출발지를 비운 도보 길찾기(현위치는 URL에 넣지 않는다)
    expect(web).toMatch(
      /^https:\/\/map\.naver\.com\/p\/directions\/-\/[\d.]+,[\d.]+,[^/]+\/-\/walk$/,
    );
    expect(decodeURIComponent(web)).toContain(heroName!);
    expectNoCoords(web, HERE.latitude, HERE.longitude);

    if (app) {
      // 앱: 도보 길찾기, 출발지 생략(앱이 기기 위치 사용), appname 필수
      const u = new URL(app);
      expect(app).toMatch(/^nmap:\/\/route\/walk\?/);
      expect(u.searchParams.get("dname")).toBe(heroName);
      expect(u.searchParams.has("slat")).toBe(false);
      expect(u.searchParams.get("appname")).toMatch(/^https?:\/\//);
      expectNoCoords(app, HERE.latitude, HERE.longitude);
    }
  });

  test("AC-REC-2: 다시 뽑기 5번 연속, 같은 식당이 다시 나오지 않는다", async ({
    page,
  }) => {
    await page.goto("/today");
    const seen = new Set(await expectThreeCards(page));
    const reroll = page.getByRole("button", { name: "다시 뽑기" });
    for (let i = 1; i <= 5; i++) {
      const before = await cardNames(page);
      await reroll.click();
      // 셔플(퇴장 → 새 묶음)이 끝나 이름이 모두 바뀔 때까지
      await expect
        .poll(async () => {
          const now = await cardNames(page).catch(() => before);
          return now.every((n) => !before.includes(n)) ? now : null;
        })
        .not.toBeNull();
      await expect(reroll).not.toHaveAttribute("aria-disabled", "true");
      const names = await expectThreeCards(page);
      for (const n of names) {
        expect(seen.has(n), `${i}번째 다시 뽑기에 ${n}이 다시 나왔다`).toBe(
          false,
        );
        seen.add(n);
      }
    }
    expect(seen.size).toBe(18);
  });
});

test.describe("로그인 사용자: 기본 사무실 기준 추천 → 길찾기 → 방문 후보", () => {
  test.skip(!env, "RUN_DB_E2E=1과 Supabase 값(.env.local)이 있어야 실행합니다");

  test("NAV-04: 길찾기를 누르면 visits에 source rec 행이 생긴다", async ({
    page,
    context,
    baseURL,
  }) => {
    await stubNaverWeb(context);
    await mockRecommendSdks(page);
    if (isMobileProject()) await asPhone(page);
    const signed = await signInContext(context, env!, baseURL!, "rec1");
    const token = signed.session.access_token;
    const userId = signed.user.id;
    try {
      const agreed = await rest(env!, `profiles?user_id=eq.${userId}`, {
        method: "PATCH",
        token,
        body: {
          terms_agreed_at: new Date().toISOString(),
          birth_confirmed_at: new Date().toISOString(),
          nickname: "test_추천",
        },
      });
      expect(agreed.status).toBe(200);
      const office = await rest(env!, "offices", {
        method: "POST",
        token,
        body: {
          user_id: userId,
          name: "회사",
          lat: OFFICE.lat,
          lng: OFFICE.lng,
        },
      });
      expect(office.status).toBe(201);

      await page.goto("/today");
      await expect(
        page.getByRole("button", { name: /^기준 위치 회사/ }),
      ).toBeVisible();
      const [heroName] = await expectThreeCards(page);

      const { web, app } = await clickDirections(page, heroName!);
      // 출발지는 사무실 핀(사용자가 놓은 저장 값)
      expect(web).toMatch(
        /^https:\/\/map\.naver\.com\/p\/directions\/126\.978,37\.5665,[^/]+\/[\d.]+,[\d.]+,[^/]+\/-\/walk$/,
      );
      if (app) {
        const u = new URL(app);
        expect(u.searchParams.get("slat")).toBe("37.5665");
        expect(u.searchParams.get("sname")).toBe("회사");
      }

      // 방문 후보 저장은 길찾기와 나란히 간다(기다리지 않음). 본인 세션으로 읽어 확인
      await expect
        .poll(
          async () =>
            readOwn<
              { place_id: string; place_url: string | null; source: string }[]
            >(env!, token, "visits?select=place_id,place_url,source,status"),
          { timeout: 10_000 },
        )
        .toHaveLength(1);
      const rows = await readOwn<
        {
          place_id: string;
          place_url: string | null;
          source: string;
          status: string;
        }[]
      >(env!, token, "visits?select=place_id,place_url,source,status");
      expect(rows[0]).toMatchObject({ source: "rec", status: "candidate" });
      expect(rows[0]!.place_id).toMatch(/^\d+$/);
      expect(rows[0]!.place_url).toBe(
        `http://place.map.kakao.com/${rows[0]!.place_id}`,
      );
    } finally {
      await signed.cleanup();
    }
  });
});
