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
    for (const path of ["/today", "/map", "/poll", "/me"]) {
      test(`앱 탭 ${path}`, async ({ page }) => {
        const res = await page.goto(path);
        expect(res?.status()).toBe(200);
        await expect(page.getByRole("navigation").first()).toBeVisible();
        await expectNoA11yViolations(page);
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

    // G3 시안 단독 화면 (T3.5): 홈 4안 x (정상 + 4상태), 랜딩 3안 x (정상 + 상태 + 카카오톡 인앱)
    // D 수정 시안 D1~D3 (2026-10-30)은 어제 피드백이 없는 날(?feedback=none)도 본다.
    for (const variant of ["a", "b", "c", "d", "d1", "d2", "d3"]) {
      for (const query of [
        "",
        "?state=loading",
        "?state=empty",
        "?state=error",
        "?state=offline",
        "?deck=overflow",
        ...(variant.length > 1 ? ["?feedback=none"] : []),
      ]) {
        test(`홈 시안 ${variant}${query}`, async ({ page }) => {
          test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
          await openLabRoute(page, `/design-lab/home/${variant}${query}`);
          await expectNoA11yViolations(page);
        });
      }
    }
    // D1~D3 어제 피드백에 답한 뒤(고마움 줄, D2는 카드가 사라진 뒤, D3는 오늘의 추천으로 넘어간 뒤)
    for (const variant of ["d1", "d2", "d3"]) {
      test(`홈 시안 ${variant} 어제 피드백 답한 뒤`, async ({ page }) => {
        test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
        await openLabRoute(page, `/design-lab/home/${variant}`);
        await page.getByRole("button", { name: "좋았어요" }).first().click();
        await expect(
          page.getByText("알려 줘서 고마워요", { exact: false }).first(),
        ).toBeAttached();
        if (variant === "d2") await page.waitForTimeout(1700);
        await expectNoA11yViolations(page);
      });
    }
    for (const variant of ["a", "b", "c"]) {
      for (const query of [
        "",
        "?state=loading",
        "?state=error",
        "?state=offline",
        "?inapp=kakao",
      ]) {
        test(`랜딩 시안 ${variant}${query}`, async ({ page }) => {
          test.skip(!designLabOn, "NEXT_PUBLIC_DESIGN_LAB=true일 때만");
          await openLabRoute(page, `/design-lab/landing/${variant}${query}`);
          // 네이버 로그인 버튼은 네이버 가이드 색(초록 면 + 흰 글자, 대비 약 2.3:1)을 그대로 쓴다.
          // 브랜드 가이드가 정한 색이라 대비 검사에서만 뺀다. 결정 대기: docs/design/g3-qa.md "남은 문제"
          await expectNoA11yViolations(page, {
            exclude: ['[data-provider="naver"]'],
          });
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
