/**
 * DESIGN.md 프런트매터 → JS 토큰 모듈 변환 (T2.11). 순수 함수만 둔다(파일 IO는 scripts/build-tokens.ts).
 *
 * CSS 변수로는 넘길 수 없는 값(Motion의 spring, cubic-bezier 배열)을 클라이언트 번들에서 쓰도록
 * TS 상수 파일로 만든다. 브라우저는 DESIGN.md를 읽을 수 없고(node:fs), 값을 손으로 옮기면 정본과 어긋나므로
 * `pnpm tokens`가 tokens.css와 함께 이 파일을 만든다. 출력은 Prettier가 한 번 더 정리한다.
 *
 * Node type stripping으로도 읽히도록 erasable 문법만 쓰고, schema에서는 타입만 가져온다.
 */
import type { DesignFrontmatter } from "./schema";

/** 생성 경로 (저장소 루트 기준). */
export const MOTION_TOKENS_OUT = "src/lib/motion/tokens.generated.ts";

function metaLine(tokens: DesignFrontmatter): string {
  const { id, name, status } = tokens.meta;
  return `${id} "${name}" (${status})`;
}

/** 확정본 motion 토큰 → src/lib/motion/tokens.generated.ts 전체. 키 순서는 zod 스키마 순서라 결정적이다. */
export function motionTokensFile(tokens: DesignFrontmatter): string {
  const header = [
    "/*",
    " * 생성물, 직접 수정 금지. 원본: DESIGN.md (루트) 프런트매터 motion",
    " * 다시 만들기: pnpm tokens (scripts/build-tokens.ts, 변환: src/lib/design/to-ts.ts)",
    ` * ${metaLine(tokens)}`,
    " * 단위: duration, stagger는 ms. easing은 cubic-bezier(x1, y1, x2, y2).",
    " */",
  ].join("\n");
  return [
    header,
    'import type { DesignFrontmatter } from "@/lib/design/schema";',
    "",
    `export const motionTokens: DesignFrontmatter["motion"] = ${JSON.stringify(tokens.motion)};`,
    "",
  ].join("\n");
}

/** 생성 경로 (저장소 루트 기준). 루트 layout의 viewport.themeColor가 읽는다(T4.28). */
export const THEME_COLOR_OUT = "src/lib/design/theme-color.generated.ts";

/**
 * 확정본 background 색 → <meta name="theme-color"> 값 (라이트, 다크).
 * 메타 태그는 CSS 변수를 읽지 못해 값을 그대로 옮긴다. 브라우저 주소 표시줄이 화면 바탕과 이어지게 한다.
 */
export function themeColorFile(tokens: DesignFrontmatter): string {
  const header = [
    "/*",
    " * 생성물, 직접 수정 금지. 원본: DESIGN.md (루트) 프런트매터 color.{light,dark}.shadcn.background",
    " * 다시 만들기: pnpm tokens (scripts/build-tokens.ts, 변환: src/lib/design/to-ts.ts)",
    ` * ${metaLine(tokens)}`,
    " */",
  ].join("\n");
  const value = {
    light: tokens.color.light.shadcn.background,
    dark: tokens.color.dark.shadcn.background,
  };
  return [
    header,
    "",
    `export const themeColor = ${JSON.stringify(value)} as const;`,
    "",
  ].join("\n");
}

/** 생성 경로 (저장소 루트 기준). 서버 OG(next/og)와 브라우저 canvas 공유 이미지가 읽는다(T7.14, T7.20, D-17 안건 5). */
export const SHARE_PALETTE_OUT = "src/lib/design/share-palette.generated.ts";

/**
 * 확정본 라이트 색 → 공유 이미지용 6자리 16진 sRGB.
 * Satori와 canvas는 CSS 변수도 oklch도 확실히 읽지 못해 값을 넘겨야 한다. 이미지는 테마와 무관하게 늘 라이트다
 * (og:image에는 prefers-color-scheme이 없고, 저장한 이미지는 어디서 열릴지 모른다).
 * 이 파일은 상대 모듈에서 타입만 가져오므로 oklch → 16진 변환은 호출하는 쪽(scripts/build-tokens.ts)이 넘긴다.
 */
export function sharePaletteFile(
  tokens: DesignFrontmatter,
  toHex: (oklch: string) => string,
): string {
  const header = [
    "/*",
    " * 생성물, 직접 수정 금지. 원본: DESIGN.md (루트) 프런트매터 color.light",
    " * 다시 만들기: pnpm tokens (scripts/build-tokens.ts, 변환: src/lib/design/to-ts.ts)",
    ` * ${metaLine(tokens)}`,
    " */",
  ].join("\n");
  const { shadcn, app, category } = tokens.color.light;
  const value = {
    background: toHex(shadcn.background),
    card: toHex(shadcn.card),
    foreground: toHex(shadcn.foreground),
    muted: toHex(shadcn.muted),
    mutedForeground: toHex(shadcn["muted-foreground"]),
    border: toHex(shadcn.border),
    primary: toHex(shadcn.primary),
    primaryForeground: toHex(shadcn["primary-foreground"]),
    track: toHex(app["vote-bar-track"]),
    chart3: toHex(shadcn["chart-3"]),
    category: Object.fromEntries(
      Object.entries(category).map(([slug, v]) => [
        slug,
        { surface: toHex(v.surface), ink: toHex(v.ink) },
      ]),
    ),
  };
  return [
    header,
    "",
    `export const sharePalette = ${JSON.stringify(value)} as const;`,
    "",
    "export type SharePalette = typeof sharePalette;",
    "",
  ].join("\n");
}

/** 생성 경로 (저장소 루트 기준). 매니페스트(src/app/manifest.ts)와 PWA 산출물 스크립트가 읽는다(T8.2, D-18 안건 7, 9). */
export const PWA_COLORS_OUT = "src/lib/design/pwa-colors.generated.ts";

/**
 * 확정본 배경색 → 매니페스트와 시작 이미지용 6자리 16진 sRGB.
 * 매니페스트 background_color, theme_color는 CSS 색 문자열이지만 oklch를 읽지 못하는 파서가 있어 16진으로 넘긴다.
 * 값이 하나뿐인 매니페스트는 라이트 샌드(light), iOS 다크 시작 이미지는 다크 차콜(dark)을 쓴다.
 */
export function pwaColorsFile(
  tokens: DesignFrontmatter,
  toHex: (oklch: string) => string,
): string {
  const header = [
    "/*",
    " * 생성물, 직접 수정 금지. 원본: DESIGN.md (루트) 프런트매터 color.{light,dark}.shadcn.background",
    " * 다시 만들기: pnpm tokens (scripts/build-tokens.ts, 변환: src/lib/design/to-ts.ts)",
    ` * ${metaLine(tokens)}`,
    " */",
  ].join("\n");
  const value = {
    light: toHex(tokens.color.light.shadcn.background),
    dark: toHex(tokens.color.dark.shadcn.background),
  };
  return [
    header,
    "",
    `export const pwaColors = ${JSON.stringify(value)} as const;`,
    "",
  ].join("\n");
}
