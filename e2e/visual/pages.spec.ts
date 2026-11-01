// 시각 회귀 스냅샷: 8단계 화면 (T8.20). 갤러리(gallery.spec.ts)가 덮지 않는 확정 화면을 전체 페이지로 찍는다.
// 실행: pnpm test:e2e:visual   갱신: pnpm test:e2e:visual --update-snapshots (docs/e2e.md)
// 프로젝트(visual-mobile 390px, visual-desktop 1280px) x 테마(라이트, 다크) x 화면.
// 기준 이미지는 e2e/__screenshots__/pages.spec.ts/<프로젝트>/<테마>-<화면>-<platform>.png (darwin만 커밋).
// - 시안 화면은 목업 데이터로만 그린다. 시계는 고정 시각, Math.random은 시드 고정 함수로 바꿔 결정적으로 만든다.
// - 문의하기(/me/contact)는 로그인 필요 경로라 여기서 찍지 않는다(contact-legal.spec.ts가 RUN_DB_E2E로 기능 확인).
import { expect, test, type Page } from "@playwright/test";
import { designLabOn } from "../helpers/gallery";
import { markWebFontsSeen } from "../helpers/fonts";

test.skip(
  !designLabOn,
  "NEXT_PUBLIC_DESIGN_LAB=true일 때만 (pnpm test:e2e:visual)",
);

type Theme = "light" | "dark";
const THEMES: Theme[] = ["light", "dark"];

/** 2026-11-02 12:00 KST. 끼니 판정이 점심으로 고정된다 */
const FIXED_TIME = new Date("2026-11-02T03:00:00.000Z");

// fullPage: 관리자 C는 아래 고정 처리 줄이 전체 페이지 캡처에서 중간에 찍히므로 첫 화면(뷰포트)만 찍는다.
// 약관 3종의 문의 이메일 줄은 NEXT_PUBLIC_CONTACT_EMAIL에 따라 바뀐다. 지금 기준은 값이 없는 "준비하고 있습니다" 상태다.
const PAGES = [
  { name: "admin-c", path: "/design-lab/admin/c?state=ready", fullPage: false },
  { name: "app-icon-a", path: "/design-lab/app-icon/a", fullPage: true },
  { name: "offline", path: "/offline", fullPage: true },
  { name: "terms", path: "/terms", fullPage: true },
  { name: "privacy", path: "/privacy", fullPage: true },
  { name: "location", path: "/location", fullPage: true },
] as const;

async function freeze(page: Page, theme: Theme) {
  await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
  await markWebFontsSeen(page);
  await page.clock.setFixedTime(FIXED_TIME);
  await page.addInitScript(() => {
    // mulberry32, 시드 고정
    let s = 0x5eed;
    Math.random = () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  });
}

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() =>
    Promise.all(
      Array.from(document.images).map((img) =>
        img.complete ? null : img.decode().catch(() => null),
      ),
    ),
  );
}

for (const theme of THEMES) {
  test.describe(`8단계 화면 ${theme}`, () => {
    test.use({ colorScheme: theme, reducedMotion: "reduce" });

    for (const p of PAGES) {
      test(p.name, async ({ page }) => {
        await freeze(page, theme);
        const res = await page.goto(p.path);
        expect(res?.status()).toBe(200);
        await expect(page.locator("h1").first()).toBeVisible();
        await settle(page);
        await expect(page).toHaveScreenshot(`${theme}-${p.name}.png`, {
          fullPage: p.fullPage,
        });
      });
    }
  });
}
