// axe 접근성 검사 (T2.17). WCAG 2.1 AA + best-practice, 위반 0 (helpers/axe.ts).
// 실행: pnpm test:e2e:a11y (디자인 랩 켜고 mobile, desktop 두 뷰포트). pnpm test:e2e에서는 갤러리와 PoC를 건너뛴다.
import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./helpers/axe";
import { designLabOn, openGallery, type GalleryTheme } from "./helpers/gallery";

/** 시안 단독 화면을 열고 하이드레이션, 글꼴, 지연 일러스트까지 기다린다 */
async function openLabRoute(page: Page, path: string) {
  const res = await page.goto(path);
  expect(res?.status()).toBe(200);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}

for (const theme of ["light", "dark"] as GalleryTheme[]) {
  test.describe(`테마 ${theme}`, () => {
    test.use({ colorScheme: theme, reducedMotion: "reduce" });

    test("컴포넌트 갤러리", async ({ page }) => {
      test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
      await openGallery(page, theme);
      await expectNoA11yViolations(page);
    });

    // axe는 포커스 링이 보이는지 판정하지 않는다. Tab으로 갤러리를 돌며 링(outline 또는 box-shadow)을 직접 확인한다.
    // T2.22 G2 확인에서 Tailwind v4 outline-none 때문에 모든 링이 사라진 것을 찾아 추가했다.
    test("키보드 포커스 링이 보인다", async ({ page }) => {
      test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
      await openGallery(page, theme);
      const missing: string[] = [];
      for (let i = 0; i < 70; i++) {
        await page.keyboard.press("Tab");
        const r = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body || !el.closest("main")) return null;
          if (!el.matches(":focus-visible")) return null;
          const cs = getComputedStyle(el);
          const outline =
            cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
          const shadow = cs.boxShadow !== "none";
          const label = (el.getAttribute("aria-label") ?? el.textContent ?? "")
            .trim()
            .slice(0, 24);
          return outline || shadow ? null : `${el.tagName} ${label}`;
        });
        if (r) missing.push(r);
      }
      expect(missing).toEqual([]);
    });

    // 앱 탭 화면 (appShell 플래그는 개발 환경에서 켜져 있다)
    // 비로그인 둘러보기 탭 (AUTH-07). 투표와 나는 로그인 필요라 /login으로 간다(T4.8, features/auth/routes.ts)
    for (const path of ["/today", "/map"]) {
      test(`앱 탭 ${path}`, async ({ page }) => {
        const res = await page.goto(path);
        expect(res?.status()).toBe(200);
        await expect(page.getByRole("navigation").first()).toBeVisible();
        await expectNoA11yViolations(page);
      });
    }

    for (const path of ["/poll", "/me"]) {
      test(`로그인 필요 ${path} → /login`, async ({ page }) => {
        const res = await page.goto(path);
        expect(res?.status()).toBe(200);
        const url = new URL(page.url());
        expect(url.pathname).toBe("/login");
        expect(url.searchParams.get("next")).toBe(path);
        // /login의 네이버 버튼은 브랜드 예외(랜딩 / 검사와 같은 이유, G3 안건 7). 대비 검사에서만 뺀다
        await expectNoA11yViolations(page, {
          exclude: ['[data-provider="naver"]'],
        });
      });
    }

    test("404 (셸 밖)", async ({ page }) => {
      const res = await page.goto("/__a11y-not-found");
      expect(res?.status()).toBe(404);
      await expectNoA11yViolations(page);
    });

    test("404 (셸 안)", async ({ page }) => {
      const res = await page.goto("/today/__a11y-not-found");
      expect(res?.status()).toBe(404);
      await expectNoA11yViolations(page);
    });

    // G3 선택안 (design-decisions D-05, D-06): 홈 D1 x (정상 + 4상태 + 배지 넘침 + 어제 피드백 없는 날). 랜딩은 아래 실제 / 와 확인 화면
    for (const query of [
      "",
      "?state=loading",
      "?state=empty",
      "?state=error",
      "?state=offline",
      "?deck=overflow",
      "?feedback=none",
    ]) {
      test(`홈 D1${query}`, async ({ page }) => {
        test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
        await openLabRoute(page, `/design-lab/home/d1${query}`);
        await expectNoA11yViolations(page);
      });
    }
    test("홈 D1 어제 피드백 답한 뒤", async ({ page }) => {
      test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
      await openLabRoute(page, "/design-lab/home/d1");
      await page.getByRole("button", { name: "좋았어요" }).first().click();
      await expect(
        page.getByText("알려 줘서 고마워요", { exact: false }).first(),
      ).toBeAttached();
      await expectNoA11yViolations(page);
    });
    // 실제 랜딩 / (T4.28). 디자인 랩 없이도 돈다. 개발 환경은 appShell, auth 플래그가 켜져 체험과 로그인이 보인다.
    // 네이버 로그인 버튼은 네이버 가이드 색(초록 면 + 흰 글자, 대비 약 2.3:1)을 그대로 쓴다.
    // 브랜드 예외로 기록(G3 안건 7, DESIGN.md 5장 소셜 로그인 버튼)하고 대비 검사에서만 뺀다.
    test("랜딩 /", async ({ page }) => {
      await openLabRoute(page, "/");
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "오늘 점심, 세 곳이면 충분해요",
        }),
      ).toBeVisible();
      await expectNoA11yViolations(page, {
        exclude: ['[data-provider="naver"]'],
      });
    });
    test("랜딩 / 다시 뽑기 뒤", async ({ page }) => {
      await openLabRoute(page, "/");
      await page.getByRole("button", { name: "다시 뽑기" }).click();
      await expect(page.getByText("2/3")).toBeVisible();
      await expectNoA11yViolations(page, {
        exclude: ['[data-provider="naver"]'],
      });
    });
    // 랜딩 확인 화면(같은 컴포넌트, 상태 흉내). ?flags=off는 운영(플래그 꺼짐) 화면
    for (const query of [
      "?state=loading",
      "?state=offline",
      "?inapp=kakao",
      "?flags=off",
    ]) {
      test(`랜딩 확인 화면${query}`, async ({ page }) => {
        test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
        await openLabRoute(page, `/design-lab/landing/b${query}`);
        await expectNoA11yViolations(page, {
          exclude: ['[data-provider="naver"]'],
        });
      });
    }

    // T4.1 온보딩 시안. T4.3(D-07)에서 B만 남김
    for (const id of ["b"]) {
      for (const query of [
        "",
        "?state=loading",
        "?state=empty",
        "?state=error",
        "?state=offline",
        "?perm=denied",
        "?step=2",
        "?step=3",
        "?step=done",
      ]) {
        test(`온보딩 ${id}${query}`, async ({ page }) => {
          test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
          await openLabRoute(page, `/design-lab/onboarding/${id}${query}`);
          await expectNoA11yViolations(page);
        });
      }
    }

    // T4.2 로그인, 약관, 인앱 안내 시안. T4.3(D-08)에서 B와 A(시트) 남김. 네이버 버튼은 랜딩 B와 같은 브랜드 예외
    for (const id of ["a", "b"]) {
      for (const query of [
        "",
        "?view=terms",
        "?view=inapp",
        "?view=inapp&os=android",
        "?state=loading",
        "?state=error",
        "?state=offline",
      ]) {
        test(`로그인 ${id}${query}`, async ({ page }) => {
          test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
          await openLabRoute(page, `/design-lab/auth/${id}${query}`);
          await expectNoA11yViolations(page, {
            exclude: ['[data-provider="naver"]'],
          });
        });
      }
    }

    // T5.2 식당 상세 시안. D-10에서 C안을 골라 A, B는 지웠다(캡처와 비교 문서만 남김)
    for (const id of ["c"]) {
      for (const query of [
        "",
        "?state=loading",
        "?state=empty",
        "?state=error",
        "?state=error&fail=name",
        "?state=offline",
        "?data=sparse",
        "?from=home",
        "?snap=full",
      ]) {
        test(`식당 상세 ${id}${query}`, async ({ page }) => {
          test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
          await openLabRoute(page, `/design-lab/place/${id}${query}`);
          await expectNoA11yViolations(page);
        });
      }
    }

    // T5.1 지도와 바텀시트 시안. D-09에서 B안(도보 분 알약과 2단 시트)을 골라 A, C는 지웠다
    for (const id of ["b"]) {
      for (const query of [
        "",
        "?state=loading",
        "?state=empty",
        "?state=error",
        "?state=offline",
        "?select=mock-gukbap",
        "?select=mock-gukbap&snap=full",
        "?filter=open",
        "?moved=1",
      ]) {
        test(`지도 ${id}${query}`, async ({ page }) => {
          test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
          await openLabRoute(page, `/design-lab/map/${id}${query}`);
          await expectNoA11yViolations(page);
        });
      }
    }

    test("PoC 목록", async ({ page }) => {
      test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
      const res = await page.goto("/design-lab/poc");
      expect(res?.status()).toBe(200);
      await expectNoA11yViolations(page);
    });
  });
}
