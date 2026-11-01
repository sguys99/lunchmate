// /design-lab/share/og (T7.4 서버 OG 시안). 쿼리 규약은 features/design-lab/share/params.ts 머리 주석.
// 라우트 핸들러는 design-lab/layout.tsx의 플래그 차단을 받지 않으므로 여기서 다시 막는다.
// 실제 OG(T7.14)는 /poll/[code]/opengraph-image에서 같은 그림을 쓰되 투표 행을 읽어 제목, 후보 수, 마감 시각만 넣는다.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { isEnabled } from "@/lib/flags";
import { OG_SIZE, OgArt } from "@/features/design-lab/share/og-art";
import { loadSharePalette } from "@/features/design-lab/share/palette";
import {
  parseImageKind,
  parseShareParams,
  parseVariant,
} from "@/features/design-lab/share/params";

const FONT_DIR = path.join(
  process.cwd(),
  "src/features/design-lab/share/fonts",
);

let fonts: Promise<[Buffer, Buffer]> | null = null;
function loadFonts() {
  fonts ??= Promise.all([
    readFile(path.join(FONT_DIR, "MaruBuri-Light-KSX1001.woff")),
    readFile(path.join(FONT_DIR, "Pretendard-Medium-KSX1001.woff")),
  ]);
  return fonts;
}

export async function GET(request: Request) {
  if (!isEnabled("designLab")) notFound();
  const sp = new URL(request.url).searchParams;
  const raw = Object.fromEntries(sp.entries());
  const p = parseShareParams(raw);
  const [palette, [serif, sans]] = await Promise.all([
    loadSharePalette(),
    loadFonts(),
  ]);
  return new ImageResponse(
    <OgArt
      variant={parseVariant(raw.v)}
      img={parseImageKind(raw.img)}
      p={p}
      palette={palette}
    />,
    {
      ...OG_SIZE,
      fonts: [
        { name: "MaruBuri", data: serif, weight: 300, style: "normal" },
        { name: "Pretendard", data: sans, weight: 500, style: "normal" },
      ],
      headers: { "Cache-Control": "no-store" },
    },
  );
}
