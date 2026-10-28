/**
 * 디자인 토큰 대비 검사 (T1.15). 순수 함수만 둔다(파일 IO는 scripts/build-tokens.ts, scripts/contrast-report.ts).
 *
 * 규칙 정본: docs/design/candidates/FORMAT.md 2.4절.
 * - 계산: oklch → OKLab → 선형 sRGB → 상대 휘도(선형 값에서 바로) → WCAG 2.x 대비비 (L1 + 0.05) / (L2 + 0.05).
 * - sRGB 밖(gamut 밖) 색은 채널을 0~1로 클램프해서 계산하고 경고로 돌려준다(브라우저도 클램프하거나 매핑해 그린다).
 * - 알파가 1 미만인 색은 계산하지 않고 실패로 본다(바탕에 따라 대비가 달라짐). 스키마도 이미 막는다.
 * - 실패 조건은 ratio < min 하나뿐이다. 필수 쌍과 min 하한은 스키마(schema.ts superRefine)가 강제한다.
 *
 * Node type stripping으로도 읽히도록 erasable 문법만 쓰고, 상대 모듈에서는 타입만 가져온다.
 * 그래서 oklch 파싱과 색 참조 풀이를 schema.ts와 같은 규칙으로 여기에 작게 다시 둔다
 * (contrast.test.ts가 schema.ts의 parseOklch, resolveColorRef와 결과가 같은지 확인한다).
 */
import type { ColorTheme, DesignFrontmatter } from "./schema";

export type ThemeName = "light" | "dark";

export type OklchValue = { l: number; c: number; h: number; alpha: number };

export type LinearRgb = readonly [r: number, g: number, b: number];

/* ------------------------------------------------------------------ */
/* 색 변환                                                              */
/* ------------------------------------------------------------------ */

const OKLCH_RE =
  /^oklch\(\s*(\d*\.?\d+)\s+(\d*\.?\d+)\s+(\d*\.?\d+)\s*(?:\/\s*(\d*\.?\d+)(%?)\s*)?\)$/;

/** schema.ts parseOklch와 같은 형식만 받는다. 범위 검사는 스키마 몫이라 여기서는 형식만 본다. */
export function parseOklchValue(value: string): OklchValue | null {
  const m = OKLCH_RE.exec(value.trim());
  if (!m) return null;
  let alpha = 1;
  if (m[4] !== undefined) {
    alpha = m[5] === "%" ? Number(m[4]) / 100 : Number(m[4]);
  }
  return { l: Number(m[1]), c: Number(m[2]), h: Number(m[3]), alpha };
}

/**
 * oklch → 선형 sRGB (클램프 전). 행렬은 Björn Ottosson, "A perceptual color space for image processing"
 * (https://bottosson.github.io/posts/oklab/) 의 OKLab → linear sRGB 변환을 그대로 쓴다.
 */
export function oklchToLinearSrgb(color: {
  l: number;
  c: number;
  h: number;
}): LinearRgb {
  const hr = (color.h * Math.PI) / 180;
  const a = color.c * Math.cos(hr);
  const b = color.c * Math.sin(hr);
  const L = color.l;

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  return [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];
}

/** 변환 오차(부동소수)로 생기는 아주 작은 이탈은 gamut 밖으로 보지 않는다. */
const GAMUT_EPSILON = 1e-4;

export type Luminance = {
  /** WCAG 상대 휘도 0~1 (클램프 후). */
  y: number;
  /** 클램프 전 선형 sRGB. */
  linear: LinearRgb;
  /** 0~1을 GAMUT_EPSILON 넘게 벗어난 채널이 있는지. */
  outOfGamut: boolean;
};

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/**
 * WCAG 2.x 상대 휘도. 선형 sRGB를 바로 쓰므로 감마 인코딩, 디코딩 왕복이 없다
 * (WCAG 정의의 sRGB 디코딩 임계값 0.03928과 IEC 0.04045 차이도 생기지 않음).
 */
export function relativeLuminance(color: {
  l: number;
  c: number;
  h: number;
}): Luminance {
  const linear = oklchToLinearSrgb(color);
  const outOfGamut = linear.some(
    (v) => v < -GAMUT_EPSILON || v > 1 + GAMUT_EPSILON,
  );
  const [r, g, b] = linear.map(clamp01) as unknown as LinearRgb;
  return { y: 0.2126 * r + 0.7152 * g + 0.0722 * b, linear, outOfGamut };
}

/** WCAG 2.x 대비비 (1~21). 순서와 무관하다. */
export function contrastRatio(y1: number, y2: number): number {
  const hi = Math.max(y1, y2);
  const lo = Math.min(y1, y2);
  return (hi + 0.05) / (lo + 0.05);
}

/** oklch 문자열 두 개의 대비비. 형식이 틀리면 throw. 알파는 무시한다(호출자가 거른다). */
export function contrastOf(fg: string, bg: string): number {
  const a = parseOklchValue(fg);
  const b = parseOklchValue(bg);
  if (!a || !b) throw new Error(`oklch 형식이 아닙니다: ${a ? bg : fg}`);
  return contrastRatio(relativeLuminance(a).y, relativeLuminance(b).y);
}

/* ------------------------------------------------------------------ */
/* 문서 검사                                                            */
/* ------------------------------------------------------------------ */

/** schema.ts resolveColorRef와 같은 규칙(테스트로 확인). */
export function resolveRef(theme: ColorTheme, ref: string): string | undefined {
  const cat = /^cat-([a-z]+)-(surface|ink)$/.exec(ref);
  if (cat) {
    const category: Record<string, { surface: string; ink: string }> =
      theme.category;
    return category[cat[1] ?? ""]?.[cat[2] as "surface" | "ink"];
  }
  const shadcn: Record<string, string> = theme.shadcn;
  const app: Record<string, string> = theme.app;
  return shadcn[ref] ?? app[ref];
}

export type ContrastPair = DesignFrontmatter["contrastPairs"][number];

export type ContrastResult = {
  pair: ContrastPair;
  theme: ThemeName;
  /** 풀린 oklch 값. 참조를 못 풀면 null. */
  fgValue: string | null;
  bgValue: string | null;
  /** 대비비. 계산할 수 없으면 0. */
  ratio: number;
  min: number;
  pass: boolean;
  /** gamut 밖이라 클램프한 쪽 (경고, 실패 아님). */
  clamped: ("fg" | "bg")[];
  /** 계산 자체를 못 한 이유 (참조 없음, 형식 오류, 알파). 있으면 pass는 false. */
  error: string | null;
};

function themesOf(pair: ContrastPair): ThemeName[] {
  const t = pair.theme ?? "both";
  return t === "both" ? ["light", "dark"] : [t];
}

/** 문서의 모든 contrastPairs를 쌍에 지정된 테마별로 계산한다. 순서는 쌍 순서, 그 안에서 light → dark. */
export function checkContrast(doc: DesignFrontmatter): ContrastResult[] {
  const out: ContrastResult[] = [];
  for (const pair of doc.contrastPairs) {
    for (const theme of themesOf(pair)) {
      const fgValue = resolveRef(doc.color[theme], pair.fg) ?? null;
      const bgValue = resolveRef(doc.color[theme], pair.bg) ?? null;
      const base = { pair, theme, fgValue, bgValue, min: pair.min };

      const fg = fgValue === null ? null : parseOklchValue(fgValue);
      const bg = bgValue === null ? null : parseOklchValue(bgValue);
      let error: string | null = null;
      if (fgValue === null || bgValue === null) {
        error = `색 참조를 풀 수 없습니다: ${fgValue === null ? pair.fg : pair.bg}`;
      } else if (!fg || !bg) {
        error = `oklch 형식이 아닙니다: ${fg ? bgValue : fgValue}`;
      } else if (fg.alpha < 1 || bg.alpha < 1) {
        error = `알파가 있는 색은 대비를 계산하지 않습니다: ${fg.alpha < 1 ? pair.fg : pair.bg}`;
      }
      if (error !== null || !fg || !bg) {
        out.push({ ...base, ratio: 0, pass: false, clamped: [], error });
        continue;
      }

      const lf = relativeLuminance(fg);
      const lb = relativeLuminance(bg);
      const ratio = contrastRatio(lf.y, lb.y);
      const clamped: ("fg" | "bg")[] = [];
      if (lf.outOfGamut) clamped.push("fg");
      if (lb.outOfGamut) clamped.push("bg");
      out.push({
        ...base,
        ratio,
        pass: ratio >= pair.min,
        clamped,
        error: null,
      });
    }
  }
  return out;
}

/** 표시용: 소수 둘째 자리 내림(반올림하면 4.496이 4.50으로 보여 통과처럼 읽힘). */
export function formatRatio(ratio: number): string {
  return (Math.floor(ratio * 100) / 100).toFixed(2);
}

const THEME_LABEL: Record<ThemeName, string> = {
  light: "라이트",
  dark: "다크",
};

export function themeLabel(theme: ThemeName): string {
  return THEME_LABEL[theme];
}

/** 실패 한 줄 (한국어). 예: "다크 muted-foreground on muted: 4.21:1 < 기준 4.5:1". */
export function describeFailure(r: ContrastResult): string {
  const head = `${THEME_LABEL[r.theme]} ${r.pair.fg} on ${r.pair.bg}`;
  if (r.error !== null) return `${head}: ${r.error}`;
  return `${head}: 실측 ${formatRatio(r.ratio)}:1 < 기준 ${r.min}:1 (${r.fgValue} on ${r.bgValue})`;
}

/** gamut 경고 한 줄 (한국어). */
export function describeClamp(r: ContrastResult): string {
  const parts = r.clamped.map((side) =>
    side === "fg" ? `${r.pair.fg} ${r.fgValue}` : `${r.pair.bg} ${r.bgValue}`,
  );
  return `${THEME_LABEL[r.theme]} ${parts.join(", ")}: sRGB 밖이라 클램프해서 계산했습니다`;
}

/** 테마별 최저 대비 결과 (계산된 것만, minAtLeast 이상 기준인 쌍만). 해당 테마 쌍이 없으면 null. */
export function lowestByTheme(
  results: readonly ContrastResult[],
  minAtLeast = 0,
): Record<ThemeName, ContrastResult | null> {
  const pick = (t: ThemeName) =>
    results
      .filter((r) => r.theme === t && r.error === null && r.min >= minAtLeast)
      .reduce<ContrastResult | null>(
        (lo, r) => (lo === null || r.ratio < lo.ratio ? r : lo),
        null,
      );
  return { light: pick("light"), dark: pick("dark") };
}

/**
 * 통과 요약 한 줄. 전체 최저와 본문 글자(기준 4.5 이상) 쌍 최저를 테마별로 보여준다.
 * 예: "a 대비 통과 98건 | 전체 최저 라이트 3.97 (warning on card, 기준 3), 다크 4.70 (...) | 본문 최저 라이트 4.61 (...), 다크 5.02 (...)"
 */
export function summarize(
  id: string,
  results: readonly ContrastResult[],
): string {
  const fmt = (lo: Record<ThemeName, ContrastResult | null>) =>
    (["light", "dark"] as const)
      .map((t) => {
        const r = lo[t];
        return r === null
          ? `${THEME_LABEL[t]} 없음`
          : `${THEME_LABEL[t]} ${formatRatio(r.ratio)} (${r.pair.fg} on ${r.pair.bg}, 기준 ${r.min})`;
      })
      .join(", ");
  return `${id} 대비 통과 ${results.length}건 | 전체 최저 ${fmt(lowestByTheme(results))} | 본문 최저 ${fmt(lowestByTheme(results, 4.5))}`;
}
