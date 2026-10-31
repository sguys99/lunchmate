// 컴포넌트 갤러리(/design-lab/components, T2.10)를 결정적으로 여는 헬퍼. 시각 회귀(T2.16)와 axe(T2.17)가 함께 쓴다.
import { expect, type Page } from "@playwright/test";
import { markWebFontsSeen } from "./fonts";

export type GalleryTheme = "light" | "dark";

/** 섹션 id. src/features/design-lab/components/sections.tsx의 GALLERY_SECTIONS 순서와 같다 */
export const GALLERY_SECTION_IDS = [
  "foundations",
  "button",
  "chip",
  "badge",
  "input",
  "tabs",
  "overlay",
  "avatar",
  "states",
  "placeBadges",
  "illustrations",
  "appShell",
] as const;

export type GallerySectionId = (typeof GALLERY_SECTION_IDS)[number];

/** 디자인 랩 플래그. 꺼져 있으면 갤러리는 404라 관련 테스트를 건너뛴다 */
export const designLabOn = process.env.NEXT_PUBLIC_DESIGN_LAB === "true";

/**
 * 갤러리를 테마 고정, 모션 정지 상태로 연다.
 * 호출 전에 page의 colorScheme을 theme과 맞춰 둔다(test.use 또는 page.emulateMedia).
 * ?theme=light라도 OS가 다크면 하이드레이션 전에 잠깐 다크로 그려지기 때문이다.
 */
export async function openGallery(page: Page, theme: GalleryTheme) {
  await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
  await markWebFontsSeen(page);
  const res = await page.goto(
    `/design-lab/components?theme=${theme}&motion=reduce&static=1`,
  );
  expect(res?.status()).toBe(200);
  // 하이드레이션 신호: useRootTheme, useRootMotion 효과가 <html>에 클래스와 속성을 건다
  await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
  await expect(page.locator("html")).toHaveAttribute(
    "data-gallery-motion",
    "static",
  );
  await page.evaluate(() => document.fonts.ready);
  // 지연 로딩되는 일러스트, 이미지가 모두 디코드될 때까지
  await page.waitForLoadState("networkidle");
  await page.evaluate(() =>
    Promise.all(
      Array.from(document.images).map((img) =>
        img.complete ? null : img.decode().catch(() => null),
      ),
    ),
  );
}

export function gallerySection(page: Page, id: GallerySectionId) {
  return page.locator(`[data-gallery-section="${id}"]`);
}
