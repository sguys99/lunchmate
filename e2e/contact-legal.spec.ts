// 문의하기(T8.6, MOD-07)와 약관 문서(T8.14 초안 → T10.3 최종본, APP-05) E2E.
//
// 실행: PLAYWRIGHT_BASE_URL=http://localhost:3102 pnpm exec playwright test --project=mobile --project=desktop e2e/contact-legal.spec.ts
// - 약관 문서는 로그인 없이 연다(flags.auth가 켜진 개발 환경).
// - 문의하기는 로그인 필요라 RUN_DB_E2E=1일 때만 test_rls_ 사용자를 만들고 끝나면 지운다(me.spec.ts와 같은 준비).
// - 문의 주소(NEXT_PUBLIC_CONTACT_EMAIL)가 있으면 복사와 메일 링크를, 없으면 "준비하고 있습니다" 안내를 확인한다.
// - T8_SHOTS_DIR을 주면 캡처를 남긴다(확인용, 기준 이미지 아님): t8-6-*, t8-14-*.
import { expect, test, type Page } from "@playwright/test";
import { rest } from "../src/lib/supabase/rls/harness";
import { expectNoA11yViolations } from "./helpers/axe";
import { loadDbE2eEnv, signInContext } from "./helpers/session";

const env = loadDbE2eEnv();
const shotsDir = process.env.T8_SHOTS_DIR;

async function shot(page: Page, name: string, scheme: "light" | "dark") {
  if (!shotsDir) return;
  const width = page.viewportSize()?.width ?? 0;
  await page.screenshot({
    path: `${shotsDir}/${name}__${width}-${scheme}.png`,
    fullPage: true,
  });
}

const DOCS = [
  { path: "/terms", title: "이용약관", slug: "terms" },
  { path: "/privacy", title: "개인정보 처리방침", slug: "privacy" },
  { path: "/location", title: "위치정보 처리 안내", slug: "location" },
] as const;

test.describe("약관 문서 (T8.14, T10.3)", () => {
  for (const doc of DOCS) {
    test(`${doc.path} 시행일 표시, 초안 띠 없음, 색인 허용, 문의 연락처, 접근성`, async ({
      page,
    }) => {
      for (const scheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(doc.path);
        await expect(
          page.getByRole("heading", { level: 1, name: doc.title }),
        ).toBeVisible();
        await expect(
          page.getByText("2026년 11월 16일 시행", { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText("2026년 11월 16일부터 시행합니다", { exact: false }),
        ).toBeVisible();
        await expect(page.getByText("확정 전 초안")).toHaveCount(0);
        await expect(page.getByText("초안", { exact: false })).toHaveCount(0);
        await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
        // 문의 이메일 줄(주소 또는 준비 중 문구)
        await expect(page.getByText("문의 이메일").last()).toBeVisible();
        const text = await page.locator("main").innerText();
        expect(text).not.toMatch(/[—–―·]/);
        await expectNoA11yViolations(page);
        await shot(page, `t8-14-${doc.slug}`, scheme);
      }
    });
  }

  test("개인정보 처리방침에 보호책임자 실명과 연락처가 있다 (법 제30조 제1항 제6호)", async ({
    page,
  }) => {
    await page.goto("/privacy");
    const section = page.locator("section", {
      has: page.getByRole("heading", { name: "14. 개인정보 보호책임자" }),
    });
    await expect(
      section.getByText("개인정보 보호책임자: 유기홍(운영자)"),
    ).toBeVisible();
    await expect(section.getByText("문의 이메일")).toBeVisible();
  });

  test("사이트맵에 약관 3종이 있다", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    for (const doc of DOCS) {
      expect(xml, doc.path).toMatch(new RegExp(`<loc>[^<]*${doc.path}</loc>`));
    }
  });

  test("개인정보 처리방침에서 위치정보 처리 안내로 간다", async ({ page }) => {
    await page.goto("/privacy");
    await page.getByRole("link", { name: "위치정보 처리 안내 보기" }).click();
    await expect(page).toHaveURL(/\/location$/);
  });

  test("360px에서 가로 넘침이 없다", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    for (const doc of DOCS) {
      await page.goto(doc.path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, doc.path).toBeLessThanOrEqual(0);
    }
    await shot(page, "t8-14-location", "light");
  });
});

test.describe("문의하기 (T8.6)", () => {
  test.skip(!env, "RUN_DB_E2E=1과 Supabase 값(.env.local)이 있어야 실행합니다");

  test("설정의 문의하기 줄 → 주소 복사 또는 준비 중 안내", async ({
    page,
    context,
    baseURL,
    browserName,
  }) => {
    const signed = await signInContext(context, env!, baseURL!, "contact");
    try {
      const token = signed.session.access_token;
      const agreed = await rest(env!, `profiles?user_id=eq.${signed.user.id}`, {
        method: "PATCH",
        token,
        body: {
          terms_agreed_at: new Date().toISOString(),
          birth_confirmed_at: new Date().toISOString(),
          nickname: "test_문의",
        },
      });
      expect(agreed.status).toBe(200);
      const office = await rest(env!, "offices", {
        method: "POST",
        token,
        body: {
          user_id: signed.user.id,
          name: "회사",
          lat: 37.5665,
          lng: 126.978,
        },
      });
      expect(office.status).toBe(201);
      if (browserName === "chromium") {
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      }

      await page.goto("/me/settings");
      await expect(page.getByText("문의와 정책")).toBeVisible();
      await page.getByRole("link", { name: "문의하기" }).click();
      await expect(page).toHaveURL(/\/me\/contact$/);
      await expect(
        page.getByRole("heading", { level: 1, name: "문의하기" }),
      ).toBeVisible();

      const copyButton = page.getByRole("button", { name: "주소 복사" });
      const hasEmail = (await copyButton.count()) > 0;
      if (hasEmail) {
        const mail = page.getByRole("link", { name: "메일 앱 열기" });
        await expect(mail).toHaveAttribute(
          "href",
          /^mailto:[^?]+@[^?]+\?subject=/,
        );
        await copyButton.click();
        await expect(
          page.getByRole("status").filter({ hasText: "복사" }),
        ).toBeVisible();
      } else {
        await expect(
          page.getByRole("heading", { name: "문의 주소를 준비하고 있습니다" }),
        ).toBeVisible();
      }
      const state = hasEmail ? "" : "-pending";

      for (const scheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme: scheme });
        await page.reload();
        await expect(
          page.getByRole("heading", { level: 1, name: "문의하기" }),
        ).toBeVisible();
        await expectNoA11yViolations(page);
        await shot(page, `t8-6-contact${state}`, scheme);
      }

      await page.emulateMedia({ colorScheme: "light" });
      await page.goto("/me/settings");
      await expect(
        page.getByRole("link", { name: "위치정보 처리 안내" }),
      ).toBeVisible();
      await shot(page, "t8-6-settings", "light");

      await page.setViewportSize({ width: 360, height: 780 });
      await page.goto("/me/contact");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      await shot(page, `t8-6-contact${state}`, "light");
    } finally {
      await signed.cleanup();
    }
  });
});
