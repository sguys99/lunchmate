// 투표 링크 미리보기 이미지 /api/og/poll/<code>?img=invite|result&v=<버전> (T7.14, POLL-04, POLL-09S, AC-POLL-4, D-17).
// - 1200 x 600 PNG, 식당 이름 없음, 서버에서 카카오를 부르지 않는다(T0.16-4). 읽기는 anon poll_preview 하나.
// - 캐시: ?v=가 있으면 그 버전 주소 기준 public, max-age=86400, immutable(D-17 안건 8). 버전은 og:image 메타가 붙이고,
//   투표 상태가 바뀌면 주소가 바뀌어 카카오 스크랩 캐시도 새로 읽는다(안건 7). 버전 없는 요청과 열 수 없는 방은 짧게(5분).
// - 글꼴은 KS X 1001 woff 두 개를 함수 번들에 싣는다(next.config outputFileTracingIncludes, 안건 4).
//   읽기 방식은 Next.js 공식 문서 image-response.md "Using custom fonts"(readFile + join(process.cwd(), ...)).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import {
  OG_SANS,
  OG_SERIF,
  OG_SIZE,
  PollOgArt,
} from "@/features/poll/share/og-art";
import {
  loadPollOg,
  type OgImageKind,
  type PollOg,
} from "@/features/poll/share/og-data";

const FONT_DIR = join(process.cwd(), "src/features/poll/share/og-fonts");

let fonts: Promise<[Buffer, Buffer]> | null = null;
function loadFonts() {
  fonts ??= Promise.all([
    readFile(join(FONT_DIR, "MaruBuri-Light-KSX1001.woff")),
    readFile(join(FONT_DIR, "Pretendard-Medium-KSX1001.woff")),
  ]).catch((e: unknown) => {
    fonts = null;
    throw e;
  });
  return fonts;
}

const LONG = "public, max-age=86400, immutable";
const SHORT = "public, max-age=300";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const sp = new URL(request.url).searchParams;
  const img: OgImageKind = sp.get("img") === "result" ? "result" : "invite";
  const version = sp.get("v");

  let og: PollOg;
  try {
    og = await loadPollOg(code);
  } catch {
    // DB 오류는 그림 대신 빈 응답으로 두면 미리보기가 깨진다. 열 수 없는 방 그림을 짧게 캐시한다
    og = { state: "unavailable" };
  }
  const [serif, sans] = await loadFonts();
  const stable =
    og.state !== "unavailable" && version !== null && version === og.version;

  return new ImageResponse(<PollOgArt og={og} img={img} />, {
    ...OG_SIZE,
    fonts: [
      { name: OG_SERIF, data: serif, weight: 300, style: "normal" },
      { name: OG_SANS, data: sans, weight: 500, style: "normal" },
    ],
    headers: { "Cache-Control": stable ? LONG : SHORT },
  });
}
