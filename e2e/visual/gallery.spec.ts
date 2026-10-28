// 시각 회귀 스냅샷: 컴포넌트 갤러리 기준 (T2.16).
// 실행: pnpm test:e2e:visual   갱신: pnpm test:e2e:visual --update-snapshots (docs/e2e.md)
// 프로젝트(visual-mobile 390px, visual-desktop 1280px) x 테마(라이트, 다크) x 섹션 12개.
// 기준 이미지는 e2e/__screenshots__/gallery.spec.ts/<프로젝트>/<테마>-<섹션>-<platform>.png (darwin만 커밋).
import { expect, test } from "@playwright/test";
import {
  GALLERY_SECTION_IDS,
  designLabOn,
  gallerySection,
  openGallery,
  type GalleryTheme,
} from "../helpers/gallery";

test.skip(
  !designLabOn,
  "NEXT_PUBLIC_DESIGN_LAB=true일 때만 (pnpm test:e2e:visual)",
);

const THEMES: GalleryTheme[] = ["light", "dark"];

for (const theme of THEMES) {
  test.describe(`갤러리 ${theme}`, () => {
    test.use({ colorScheme: theme, reducedMotion: "reduce" });

    test("섹션별 스냅샷", async ({ page }) => {
      test.setTimeout(120_000);
      await openGallery(page, theme);
      for (const id of GALLERY_SECTION_IDS) {
        const section = gallerySection(page, id);
        await section.scrollIntoViewIfNeeded();
        await expect.soft(section).toHaveScreenshot(`${theme}-${id}.png`);
      }
    });
  });
}
