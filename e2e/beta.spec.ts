// 베타 E2E (T9.3 /beta 환영 페이지, T9.4 나 탭 베타 의견 시트, D-23).
//
// /beta (DB 없이): 개발 서버의 ?device= 흉내(features/beta/env.ts, 개발 환경에서만)와 UA 흉내로 기기별 화면을 본다.
//   pnpm exec playwright test --project=mobile --project=desktop e2e/beta.spec.ts
// 베타 의견 시트: 로그인한 나 탭이 필요하다. RUN_DB_E2E=1이면 클라우드 개발 DB에 test_rls_ 사용자를 만들고 끝나면 지운다.
//   보내기까지는 beta_feedback 마이그레이션(20261102120000)이 적용된 뒤에만 확인한다(적용 전에는 실패 안내까지만).
import { expect, test } from "@playwright/test";
import { rest, schemaReady } from "../src/lib/supabase/rls/harness";
import { expectNoA11yViolations } from "./helpers/axe";
import { loadDbE2eEnv, signInContext } from "./helpers/session";

const KAKAO_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; SM-S911N Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36;KAKAOTALK 2410800";

test.describe("/beta 환영 페이지", () => {
  test.use({ reducedMotion: "reduce" });

  test("카카오톡 아이폰: 외부 브라우저로 열기(주) + 카카오톡에서 바로 시작(글자), noindex, axe 0", async ({ page }) => {
    await page.goto("/beta?device=kakao-ios");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "오늘 뭐 먹지를 10초 안에 정해 드립니다.",
    );
    await expect(page.getByRole("button", { name: "외부 브라우저로 열기" })).toBeVisible();
    await expect(page.getByRole("link", { name: "카카오톡에서 바로 시작" })).toHaveAttribute(
      "href",
      "/login?next=%2Ftoday",
    );
    await expect(page.getByText(/화면 오른쪽 아래 메뉴/)).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expectNoA11yViolations(page);
  });

  test("외부 브라우저를 열지 못하면 메뉴 그림과 링크 복사(오류 상태)", async ({ page }) => {
    await page.goto("/beta?device=kakao-ios");
    await page.getByRole("button", { name: "외부 브라우저로 열기" }).click();
    const failed = page
      .getByRole("alert")
      .filter({ hasText: "외부 브라우저를 열지 못했습니다" });
    await expect(failed).toBeVisible({ timeout: 5_000 });
    await expect(failed).toContainText("/beta");
    await expect(page.getByRole("button", { name: "링크 복사" })).toBeVisible();
    // 실패 뒤에는 주 버튼이 로그인으로 바뀐다
    await expect(page.getByRole("link", { name: "로그인하고 시작" })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("아이폰 Safari: 공유 그림 없음 + 로그인하고 시작", async ({ page }) => {
    await page.goto("/beta?device=ios");
    // 아래 막대 가운데 공유 버튼 그림은 최신 iOS Safari와 달라 숨겼다(96be2c8, 실기기 캡처 11/03)
    await expect(page.getByRole("img", { name: /공유 버튼 위치 그림/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "로그인하고 시작" })).toHaveAttribute(
      "href",
      "/login?next=%2Ftoday",
    );
    await expect(page.getByRole("button", { name: "외부 브라우저로 열기" })).toHaveCount(0);
    await expectNoA11yViolations(page);
  });

  test("홈 화면 앱: 설치 단계 마침", async ({ page }) => {
    await page.goto("/beta?device=app");
    await expect(page.getByText("홈 화면 앱으로 열었습니다", { exact: true })).toBeVisible();
    await expect(page.locator('li[aria-current="step"]')).toContainText("로그인하고 시작");
  });

  test("기기를 모르면 기기 칩(빈 상태)", async ({ page }) => {
    await page.goto("/beta?device=unknown");
    await expect(page.getByText("쓰는 기기를 알아보지 못했습니다")).toBeVisible();
    await page.getByRole("button", { name: "안드로이드" }).click();
    await expect(page.getByText(/Chrome 메뉴에서/)).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("오프라인: 안내 한 줄 + 로그인 aria-disabled, 설치 방법은 그대로", async ({ page, context }) => {
    await page.goto("/beta?device=ios");
    await expect(page.getByRole("link", { name: "로그인하고 시작" })).toBeVisible();
    await context.setOffline(true);
    await expect(page.getByRole("status").filter({ hasText: "인터넷에 연결되어 있지 않습니다" })).toBeVisible();
    await expect(page.getByRole("link", { name: "로그인하고 시작" })).toHaveAttribute("aria-disabled", "true");
    // 설치 방법(단계 목록)은 오프라인에도 그대로 보인다
    await expect(page.locator("ol li").first()).toBeVisible();
    await context.setOffline(false);
  });

  test("360px에서 가로 넘침 없음", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    for (const d of ["kakao-ios", "ios", "android", "desktop", "unknown"]) {
      await page.goto(`/beta?device=${d}`);
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(over, d).toBe(0);
    }
  });

  test("데스크톱 1280은 오른쪽 칸에 휴대폰 안내와 나 탭 그림", async ({ page }) => {
    test.skip(test.info().project.name !== "desktop", "1280 전용");
    await page.goto("/beta?device=desktop");
    await expect(page.getByRole("heading", { name: "휴대폰에서도 열어 두세요" })).toBeVisible();
    await expect(page.getByRole("img", { name: /나 탭 그림/ })).toBeVisible();
    await expectNoA11yViolations(page);
  });
});

test.describe("/beta 실제 UA", () => {
  test.use({ userAgent: KAKAO_ANDROID, reducedMotion: "reduce" });
  test("카카오톡 안드로이드 UA면 서버가 첫 HTML부터 오른쪽 위 메뉴 안내", async ({ page }) => {
    await page.goto("/beta");
    await expect(page.getByText(/카카오톡 안에서 보고 있습니다 \(안드로이드\)/)).toBeVisible();
    await expect(page.getByText(/화면 오른쪽 위 메뉴/)).toBeVisible();
  });
});

const env = loadDbE2eEnv();

test.describe("나 탭 베타 의견 시트", () => {
  test.skip(!env, "RUN_DB_E2E=1과 Supabase 값(.env.local)이 있어야 실행합니다");
  test.use({ reducedMotion: "reduce" });

  test("진입 줄 → 시트, 종류별 예시와 첨부 기본값, 보내기", async ({ page, context, baseURL }) => {
    const signed = await signInContext(context, env!, baseURL!, "beta");
    try {
      const token = signed.session.access_token;
      const user = signed.user.id;
      await rest(env!, `profiles?user_id=eq.${user}`, {
        method: "PATCH",
        token,
        body: {
          terms_agreed_at: new Date().toISOString(),
          birth_confirmed_at: new Date().toISOString(),
        },
      });
      await rest(env!, "offices", {
        method: "POST",
        token,
        body: { user_id: user, name: "회사", lat: 37.5665, lng: 126.978 },
      });

      await page.goto("/me");
      const entry = page.getByRole("button", { name: /베타 의견 보내기/ });
      await expect(entry).toBeVisible();
      await entry.click();
      const dialog = page.getByRole("dialog", { name: "베타 의견 보내기" });
      await expect(dialog).toBeVisible();
      const attach = dialog.getByRole("checkbox", { name: "지금 보던 화면 함께 보내기" });
      await expect(attach).not.toBeChecked();
      await dialog.getByRole("button", { name: "버그" }).click();
      await expect(attach).toBeChecked();
      await expect(dialog.getByRole("textbox", { name: "내용" })).toHaveAttribute(
        "placeholder",
        "어떤 화면에서 무엇을 눌렀을 때 생겼는지 적어 주세요.",
      );
      await expect(dialog.getByTestId("beta-sent-info")).toContainText("화면 /me");
      await expectNoA11yViolations(page);

      await dialog.getByRole("textbox", { name: "내용" }).fill("E2E 베타 의견 확인용 글입니다.");
      await dialog.getByRole("button", { name: "보내기" }).click();
      if (await schemaReady(env!, "beta_feedback")) {
        await expect(dialog.getByText("고마워요, 잘 받았어요")).toBeVisible();
        const rows = await rest<{ route: string; body: string }[]>(
          env!,
          "beta_feedback?select=route,body",
          { token },
        );
        expect(rows.data).toEqual([{ route: "/me", body: "E2E 베타 의견 확인용 글입니다." }]);
      } else {
        // 마이그레이션 적용 전: 쓴 글을 지우지 않고 실패 안내
        await expect(
          dialog.getByRole("alert").filter({ hasText: "의견을 보내지 못했습니다" }),
        ).toBeVisible();
        await expect(dialog.getByRole("textbox", { name: "내용" })).toHaveValue(
          "E2E 베타 의견 확인용 글입니다.",
        );
      }
    } finally {
      await signed.cleanup();
    }
  });
});
