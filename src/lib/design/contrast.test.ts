import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkContrast,
  contrastOf,
  contrastRatio,
  describeFailure,
  formatRatio,
  lowestByTheme,
  oklchToLinearSrgb,
  parseOklchValue,
  relativeLuminance,
  resolveRef,
} from "./contrast";
import {
  APP_COLOR_KEYS,
  CATEGORY_SLUGS,
  SHADCN_COLOR_KEYS,
  parseDesignDoc,
  parseOklch,
  resolveColorRef,
  type DesignFrontmatter,
} from "./schema";

const TEMPLATE = path.resolve(
  __dirname,
  "../../../docs/design/candidates/_template.DESIGN.md",
);

function template(): DesignFrontmatter {
  return parseDesignDoc(readFileSync(TEMPLATE, "utf8")).tokens;
}

describe("대비비 계산", () => {
  it("흰색과 검은색은 21:1 (WCAG 2.x 정의상 최대값)", () => {
    expect(contrastOf("oklch(1 0 0)", "oklch(0 0 0)")).toBeCloseTo(21, 2);
    expect(contrastOf("oklch(0 0 0)", "oklch(1 0 0)")).toBeCloseTo(21, 2);
  });

  it("같은 색은 1:1", () => {
    expect(contrastOf("oklch(0.6 0.1 40)", "oklch(0.6 0.1 40)")).toBe(1);
    expect(contrastRatio(0.3, 0.3)).toBe(1);
  });

  it("흰색 휘도 1, 검은색 0", () => {
    expect(relativeLuminance({ l: 1, c: 0, h: 0 }).y).toBeCloseTo(1, 4);
    expect(relativeLuminance({ l: 0, c: 0, h: 0 }).y).toBe(0);
  });

  /*
   * 기준값 출처
   * - #767676 on #fff = 4.54:1: WebAIM Contrast Checker(https://webaim.org/resources/contrastchecker/)에서
   *   흰 바탕 4.5:1을 넘는 가장 밝은 회색으로 널리 쓰는 값. #767676의 oklch(0.565836 0 0)는 culori 4.0.1 `oklch("#767676")`.
   * - 그 밖의 값: culori 4.0.1 `wcagContrast(a, b)` (https://culorijs.org/api/#wcagContrast) 실행 결과.
   *   culori는 W3C CSS Color 4 변환 행렬과 WCAG 2.x 상대 휘도 공식을 쓴다.
   * - #ff0000 on 흰색 4.00:1, #0000ff on 흰색 8.59:1은 WebAIM 결과와도 같다.
   */
  it.each([
    ["oklch(0.565836 0 0)", "oklch(1 0 0)", 4.5422],
    ["oklch(0.5693 0 0)", "oklch(1 0 0)", 4.4774],
    ["oklch(0.6279 0.2577 29.23)", "oklch(1 0 0)", 3.9994],
    ["oklch(0.452 0.3132 264.05)", "oklch(1 0 0)", 8.5928],
    ["oklch(0.55 0.15 40)", "oklch(0.97 0.02 80)", 4.7493],
    ["oklch(0.3 0.05 60)", "oklch(0.92 0.03 85)", 10.8871],
    ["oklch(0.85 0.08 150)", "oklch(0.2 0.02 60)", 11.8228],
  ])("%s on %s = %f (culori 기준, 소수 둘째 자리)", (fg, bg, expected) => {
    expect(contrastOf(fg, bg)).toBeCloseTo(expected, 2);
  });

  it("선형 sRGB 변환이 culori와 같다 (oklch(0.55 0.15 40) → culori rgb 후 선형화)", () => {
    // culori 4.0.1 rgb("oklch(0.55 0.15 40)") = r 0.71785, g 0.29521, b 0.13086 (감마 인코딩 값)
    const toLinear = (v: number) =>
      v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    const [r, g, b] = oklchToLinearSrgb({ l: 0.55, c: 0.15, h: 40 });
    expect(r).toBeCloseTo(toLinear(0.7178544700738744), 4);
    expect(g).toBeCloseTo(toLinear(0.29520774314922194), 4);
    expect(b).toBeCloseTo(toLinear(0.13086016440900744), 4);
  });

  it("sRGB 밖 색은 클램프해서 계산하고 outOfGamut로 알린다", () => {
    // culori 4.0.1: wcagContrast(clampRgb(rgb("oklch(0.7 0.35 145)")), "white") = 2.1516
    const lum = relativeLuminance({ l: 0.7, c: 0.35, h: 145 });
    expect(lum.outOfGamut).toBe(true);
    expect(contrastOf("oklch(0.7 0.35 145)", "oklch(1 0 0)")).toBeCloseTo(
      2.1516,
      2,
    );
  });

  it("sRGB 경계의 원색(부동소수 오차 수준 이탈)은 gamut 경고를 내지 않는다", () => {
    expect(relativeLuminance({ l: 1, c: 0, h: 0 }).outOfGamut).toBe(false);
    expect(
      relativeLuminance({ l: 0.627955, c: 0.257683, h: 29.2339 }).outOfGamut,
    ).toBe(false);
  });

  it("formatRatio는 내림이라 4.496을 4.50으로 보이지 않는다", () => {
    expect(formatRatio(4.4969)).toBe("4.49");
    expect(formatRatio(21)).toBe("21.00");
  });
});

describe("schema.ts와 같은 규칙", () => {
  it.each([
    "oklch(0.5 0.1 40)",
    "oklch(1 0 0)",
    "oklch(0.2 0.02 60 / 50%)",
    "oklch(.3 .05 60 / 0.4)",
  ])("parseOklchValue(%s) = parseOklch", (v) => {
    expect(parseOklchValue(v)).toEqual(parseOklch(v));
  });

  it("resolveRef가 모든 색 키에서 resolveColorRef와 같다", () => {
    const t = template();
    const refs = [
      ...SHADCN_COLOR_KEYS,
      ...APP_COLOR_KEYS,
      ...CATEGORY_SLUGS.flatMap((s) => [`cat-${s}-surface`, `cat-${s}-ink`]),
      "no-such-color",
    ];
    for (const theme of ["light", "dark"] as const) {
      for (const ref of refs) {
        expect(resolveRef(t.color[theme], ref)).toBe(
          resolveColorRef(t.color[theme], ref),
        );
      }
    }
  });
});

describe("checkContrast", () => {
  it("both 쌍은 라이트와 다크를 따로, 한 테마 쌍은 그 테마만 계산한다", () => {
    const t = template();
    const doc: DesignFrontmatter = {
      ...t,
      contrastPairs: [
        { fg: "foreground", bg: "background", min: 4.5 },
        { fg: "primary", bg: "card", min: 3, theme: "dark" },
      ],
    };
    const res = checkContrast(doc);
    expect(res.map((r) => [r.pair.fg, r.theme])).toEqual([
      ["foreground", "light"],
      ["foreground", "dark"],
      ["primary", "dark"],
    ]);
    expect(res[0]?.fgValue).toBe(t.color.light.shadcn.foreground);
    expect(res[1]?.fgValue).toBe(t.color.dark.shadcn.foreground);
  });

  it("ratio < min이면 실패하고 실패 문구에 테마, 쌍, 실측값, 기준값이 들어간다", () => {
    const t = template();
    const doc: DesignFrontmatter = {
      ...t,
      color: {
        ...t.color,
        light: {
          ...t.color.light,
          shadcn: {
            ...t.color.light.shadcn,
            foreground: "oklch(0.5693 0 0)",
            background: "oklch(1 0 0)",
          },
        },
      },
      contrastPairs: [{ fg: "foreground", bg: "background", min: 4.5 }],
    };
    const [light] = checkContrast(doc);
    expect(light?.pass).toBe(false);
    expect(light?.ratio).toBeCloseTo(4.4774, 2);
    const msg = describeFailure(light!);
    expect(msg).toContain("라이트");
    expect(msg).toContain("foreground on background");
    expect(msg).toContain("4.47");
    expect(msg).toContain("4.5");
  });

  it("같은 색 쌍은 1:1이라 min 3에서도 실패한다", () => {
    const t = template();
    const res = checkContrast({
      ...t,
      contrastPairs: [{ fg: "background", bg: "background", min: 3 }],
    });
    expect(res).toHaveLength(2);
    expect(res.every((r) => r.ratio === 1 && !r.pass)).toBe(true);
  });

  it("알파가 있는 색은 계산하지 않고 실패로 본다 (스키마를 우회한 입력 방어)", () => {
    const t = template();
    const res = checkContrast({
      ...t,
      contrastPairs: [{ fg: "foreground", bg: "overlay", min: 3 }],
    });
    // 템플릿의 overlay는 알파가 있다
    expect(parseOklch(t.color.light.app.overlay)?.alpha).toBeLessThan(1);
    expect(res.every((r) => !r.pass && r.error !== null)).toBe(true);
  });

  it("lowestByTheme는 테마별 최저 대비 쌍을 고른다", () => {
    const res = checkContrast(template());
    const lo = lowestByTheme(res);
    for (const theme of ["light", "dark"] as const) {
      const min = Math.min(
        ...res.filter((r) => r.theme === theme).map((r) => r.ratio),
      );
      expect(lo[theme]?.ratio).toBe(min);
    }
  });
});
