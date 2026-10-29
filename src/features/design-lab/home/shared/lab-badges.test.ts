// 홈 시안 배지 두 체계의 글자 대비 (T3.2). 루트 DESIGN.md 토큰을 src/lib/design/contrast로 계산한다.
// 카드(bg-card)와 C안 줄처럼 면 없이 바탕(background)에 놓이는 경우를 모두 본다. 글자 4.5:1, 아이콘 3:1.
// 배지 테두리는 장식이라(라벨 글자가 뜻을 전한다) 계산하지 않는다. 다크 border, input은 알파라 계산 대상도 아니다.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrastOf, resolveRef, type ThemeName } from "@/lib/design/contrast";
import { parseDesignDoc } from "@/lib/design/schema";

const doc = parseDesignDoc(
  readFileSync(path.resolve(__dirname, "../../../../../DESIGN.md"), "utf8"),
).tokens;

type Pair = { palette: string; use: string; fg: string; min: number };

const PAIRS: Pair[] = [
  // current: 공용 배지(T2.9) 글자와 가격 옆 추정 표시
  {
    palette: "current",
    use: "웨이팅, 기피, 추정 글자",
    fg: "warning-foreground",
    min: 4.5,
  },
  { palette: "current", use: "할인 글자", fg: "info-foreground", min: 4.5 },
  {
    palette: "current",
    use: "바로 입장 글자",
    fg: "success-foreground",
    min: 4.5,
  },
  // calm: 기피만 warning, 나머지 중립
  {
    palette: "calm",
    use: "기피 경고 글자",
    fg: "warning-foreground",
    min: 4.5,
  },
  { palette: "calm", use: "웨이팅, 할인 글자", fg: "foreground", min: 4.5 },
  { palette: "calm", use: "추정 표시 글자", fg: "muted-foreground", min: 4.5 },
  {
    palette: "calm",
    use: "웨이팅, 할인 아이콘",
    fg: "muted-foreground",
    min: 3,
  },
];

const SURFACES = ["card", "background"] as const;
const THEMES: ThemeName[] = ["light", "dark"];

function ratio(theme: ThemeName, fg: string, bg: string): number {
  const f = resolveRef(doc.color[theme], fg);
  const b = resolveRef(doc.color[theme], bg);
  if (!f || !b) throw new Error(`색 참조를 풀 수 없습니다: ${fg} / ${bg}`);
  return contrastOf(f, b);
}

describe("홈 시안 배지 색 대비", () => {
  for (const theme of THEMES)
    for (const bg of SURFACES)
      it.each(PAIRS)(
        `${theme} ${bg}: $palette $use ($fg) >= $min`,
        ({ fg, min }) => {
          expect(ratio(theme, fg, bg)).toBeGreaterThanOrEqual(min);
        },
      );
});
