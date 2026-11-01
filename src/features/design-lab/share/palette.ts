// 공유 이미지 색 (T7.4 시안). 서버 전용: DESIGN.md 프런트매터를 읽어 sRGB 16진 값으로 바꾼다.
// 서버 OG(next/og, Satori)와 브라우저 canvas는 CSS 변수를 읽지 못해 값을 넘겨야 한다. 값을 손으로 옮기면 정본과 어긋나므로
// 시안에서는 요청 때 DESIGN.md를 읽고, 실제 구현(T7.14, T7.20)에서는 `pnpm tokens`가 만드는 생성 상수로 바꾼다(비교 문서 5절 안건).
// 이미지는 테마와 무관하게 늘 라이트 팔레트다. og:image에는 prefers-color-scheme이 없고, 저장한 이미지는 어디서 열릴지 모른다.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { oklchToLinearSrgb, parseOklchValue } from "@/lib/design/contrast";
import { parseDesignDoc } from "@/lib/design/schema";
import type { CategorySlug } from "@/features/place/categories";

export type SharePalette = {
  background: string;
  card: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  primary: string;
  primaryForeground: string;
  track: string;
  chart3: string;
  category: Record<CategorySlug, { surface: string; ink: string }>;
};

function channel(linear: number): string {
  const c = Math.min(1, Math.max(0, linear));
  const s = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(s * 255)
    .toString(16)
    .padStart(2, "0");
}

/** oklch 문자열 → 6자리 16진 sRGB (알파는 버린다. 공유 이미지에서 알파 색은 쓰지 않는다) */
export function oklchToHex(value: string): string {
  const v = parseOklchValue(value);
  if (!v) throw new Error(`oklch 형식이 아닙니다: ${value}`);
  const [r, g, b] = oklchToLinearSrgb(v);
  return "#" + channel(r) + channel(g) + channel(b);
}

let cached: Promise<SharePalette> | null = null;

export function loadSharePalette(): Promise<SharePalette> {
  cached ??= (async () => {
    const source = await readFile(
      path.join(process.cwd(), "DESIGN.md"),
      "utf8",
    );
    const { tokens } = parseDesignDoc(source);
    const { shadcn, app, category } = tokens.color.light;
    const cat = Object.fromEntries(
      Object.entries(category).map(([slug, v]) => [
        slug,
        { surface: oklchToHex(v.surface), ink: oklchToHex(v.ink) },
      ]),
    ) as SharePalette["category"];
    return {
      background: oklchToHex(shadcn.background),
      card: oklchToHex(shadcn.card),
      foreground: oklchToHex(shadcn.foreground),
      muted: oklchToHex(shadcn.muted),
      mutedForeground: oklchToHex(shadcn["muted-foreground"]),
      border: oklchToHex(shadcn.border),
      primary: oklchToHex(shadcn.primary),
      primaryForeground: oklchToHex(shadcn["primary-foreground"]),
      track: oklchToHex(app["vote-bar-track"]),
      chart3: oklchToHex(shadcn["chart-3"]),
      category: cat,
    };
  })();
  return cached;
}
