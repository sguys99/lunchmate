/*
 * 생성물, 직접 수정 금지. 원본: DESIGN.md (루트) 프런트매터 color.light
 * 다시 만들기: pnpm tokens (scripts/build-tokens.ts, 변환: src/lib/design/to-ts.ts)
 * final "Quiet Stone" (final)
 */

export const sharePalette = {
  background: "#f4eee6",
  card: "#f7f3ec",
  foreground: "#302d2a",
  muted: "#ece6de",
  mutedForeground: "#5a5c53",
  border: "#d9d3cb",
  primary: "#4d5430",
  primaryForeground: "#f9f6f1",
  track: "#e6e0d7",
  chart3: "#98977b",
  category: {
    hansik: { surface: "#f4e4dc", ink: "#6e442c" },
    jungsik: { surface: "#f6e3e2", ink: "#714040" },
    ilsik: { surface: "#dceaf5", ink: "#295571" },
    yangsik: { surface: "#eee7d8", ink: "#5f4d1f" },
    bunsik: { surface: "#f4e2e8", ink: "#6d3f52" },
    gukbap: { surface: "#f0e6d9", ink: "#664a21" },
    gogi: { surface: "#f5e3df", ink: "#704236" },
    asian: { surface: "#dcede4", ink: "#255c46" },
    fastfood: { surface: "#ebe8d9", ink: "#585120" },
    salad: { surface: "#e4ebdc", ink: "#45572d" },
    cafe: { surface: "#f3e5da", ink: "#6a4726" },
    pub: { surface: "#ece4f3", ink: "#5b456c" },
  },
} as const;

export type SharePalette = typeof sharePalette;
