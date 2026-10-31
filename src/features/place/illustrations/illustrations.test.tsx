import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  CATEGORY_SLUGS,
  type CategorySlug,
  categoryLabel,
} from "@/features/place/categories";
import { DRAWINGS } from "./drawings";
import { ICON_VIEWBOX, strokeWidthFor } from "./frame";
import { CategoryIllustration } from "./index";

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

describe("CategoryIllustration", () => {
  it("12종 slug마다 그림이 있고 남는 그림도 없다", () => {
    expect(Object.keys(DRAWINGS).sort()).toEqual([...CATEGORY_SLUGS].sort());
    expectTypeOf<keyof typeof DRAWINGS>().toEqualTypeOf<CategorySlug>();
  });

  it.each(CATEGORY_SLUGS)("%s: card와 icon 모두 그린다", (slug) => {
    for (const size of [32, 40, 96, 144]) {
      const out = html(<CategoryIllustration slug={slug} size={size} />);
      expect(out).toMatch(/^<svg /);
      expect(out).toContain(`data-category="${slug}"`);
      expect(out).toContain(`width="${size}"`);
      // 원 하나 + 선 여러 개
      expect(out.match(/<circle /g)?.length).toBeGreaterThanOrEqual(1);
      expect(out.match(/<(path|rect|ellipse) /g)?.length).toBeGreaterThan(2);
    }
  });

  it.each(CATEGORY_SLUGS)(
    "%s: 하드코딩 색 없이 토큰과 currentColor만 쓴다",
    (slug) => {
      const out = html(<CategoryIllustration slug={slug} />);
      expect(out).not.toMatch(
        /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(|oklab\(/i,
      );
      const paints = [
        ...out.matchAll(/\b(?:fill|stroke|color)(?:=|:)"?\s*([^";]+)/g),
      ].map((m) => m[1]?.trim());
      for (const p of paints) {
        expect(p).toMatch(
          new RegExp(
            `^(none|currentColor|var\\(--cat-${slug}-(ink|surface)\\))$`,
          ),
        );
      }
      expect(out).toContain(`var(--cat-${slug}-ink)`);
      expect(out).toContain(`var(--cat-${slug}-surface)`);
    },
  );

  it("기본은 장식(aria-hidden), decorative=false면 role=img와 카테고리 라벨", () => {
    const deco = html(<CategoryIllustration slug="gukbap" />);
    expect(deco).toContain('aria-hidden="true"');
    expect(deco).not.toContain("role=");

    const labelled = html(
      <CategoryIllustration slug="gukbap" decorative={false} />,
    );
    expect(labelled).toContain('role="img"');
    expect(labelled).toContain(`aria-label="${categoryLabel("gukbap")}"`);
    expect(labelled).not.toContain("aria-hidden");
  });

  it("64px 미만은 icon 변형: 여백을 자른 viewBox와 잔선 제거", () => {
    const icon = html(<CategoryIllustration slug="fastfood" size={40} />);
    const card = html(<CategoryIllustration slug="fastfood" size={96} />);
    expect(icon).toContain('data-variant="icon"');
    expect(icon).toContain(
      `viewBox="${ICON_VIEWBOX.x} ${ICON_VIEWBOX.y} ${ICON_VIEWBOX.size} ${ICON_VIEWBOX.size}"`,
    );
    expect(card).toContain('data-variant="card"');
    expect(card).toContain('viewBox="0 0 96 96"');
    expect(icon.length).toBeLessThan(card.length);

    const forced = html(
      <CategoryIllustration slug="fastfood" size={40} variant="card" />,
    );
    expect(forced).toContain('data-variant="card"');
  });

  it("선 굵기: card 96px에서 1.4(DESIGN.md), 크기가 커지면 화면 굵기가 완만하게 는다", () => {
    expect(strokeWidthFor(96, "card")).toBe(1.4);
    const px = (size: number) => (strokeWidthFor(size, "card") * size) / 96;
    expect(px(144)).toBeGreaterThan(1.4);
    expect(px(144)).toBeLessThan(1.9);
    const iconPx = (strokeWidthFor(32, "icon") * 32) / ICON_VIEWBOX.size;
    expect(iconPx).toBeCloseTo(1.25, 1);
  });

  it("그림 하나는 가볍다 (card 마크업 1.8KB 이하)", () => {
    for (const slug of CATEGORY_SLUGS) {
      expect(html(<CategoryIllustration slug={slug} />).length).toBeLessThan(
        1800,
      );
    }
  });
});
