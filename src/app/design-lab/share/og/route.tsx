// /design-lab/share/og 확인용 서버 OG (T7.14 실제 그림 PollOgArt를 목업 값으로). 쿼리 규약은 features/design-lab/share/params.ts.
// 실제 라우트는 /api/og/poll/<code>(투표 행을 읽음). 라우트 핸들러는 design-lab/layout.tsx의 플래그 차단을 받지 않아 여기서 다시 막는다.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { isEnabled } from "@/lib/flags";
import {
  OG_SANS,
  OG_SERIF,
  OG_SIZE,
  PollOgArt,
} from "@/features/poll/share/og-art";
import {
  labPollOg,
  parseImageKind,
  parseShareParams,
} from "@/features/design-lab/share/params";

const FONT_DIR = join(process.cwd(), "src/features/poll/share/og-fonts");

export async function GET(request: Request) {
  if (!isEnabled("designLab")) notFound();
  const raw = Object.fromEntries(new URL(request.url).searchParams.entries());
  const p = parseShareParams(raw);
  const [serif, sans] = await Promise.all([
    readFile(join(FONT_DIR, "MaruBuri-Light-KSX1001.woff")),
    readFile(join(FONT_DIR, "Pretendard-Medium-KSX1001.woff")),
  ]);
  const img = parseImageKind(raw.img);
  return new ImageResponse(<PollOgArt og={labPollOg(p, img)} img={img} />, {
    ...OG_SIZE,
    fonts: [
      { name: OG_SERIF, data: serif, weight: 300, style: "normal" },
      { name: OG_SANS, data: sans, weight: 500, style: "normal" },
    ],
    headers: { "Cache-Control": "no-store" },
  });
}
