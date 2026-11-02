// 랜딩 링크 미리보기 이미지 /opengraph-image (T10.11, PRD APP-04). 그림은 features/landing/og-art.tsx(D-29 B 큰 그릇).
// 요청 값을 읽지 않아 빌드 때 한 번 그려 정적으로 둔다(Next.js 16 file-conventions/01-metadata/opengraph-image.md).
// 경로가 /api/ 밖이라 robots.txt에 막히지 않는다(트위터 같은 크롤러가 이미지를 가져갈 수 있다).
// 하위 경로 중 openGraph를 직접 정하는 페이지(약관 3종, 투표)는 자기 값이 우선한다.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { landingOgCopy } from "@/copy/landing-og";
import {
  LandingOgArt,
  OG_SANS,
  OG_SERIF,
  OG_SIZE,
} from "@/features/landing/og-art";

export const alt = landingOgCopy.imageAlt;
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * 투표 OG와 같은 KS X 1001 woff 두 개. 경로를 글자 그대로 둬야 Turbopack이 이 폴더만 함수 번들에 싣는다
 * (변수 경로면 프로젝트 전체를 싣는다는 빌드 경고). "use cache"로 감싸 Cache Components에서도 빌드 때 정적으로 그린다.
 */
async function loadFonts(): Promise<[Uint8Array, Uint8Array]> {
  "use cache";
  const dir = join(process.cwd(), "src/features/poll/share/og-fonts");
  const [serif, sans] = await Promise.all([
    readFile(join(dir, "MaruBuri-Light-KSX1001.woff")),
    readFile(join(dir, "Pretendard-Medium-KSX1001.woff")),
  ]);
  return [new Uint8Array(serif), new Uint8Array(sans)];
}

export default async function Image() {
  const [serif, sans] = await loadFonts();
  return new ImageResponse(<LandingOgArt />, {
    ...OG_SIZE,
    fonts: [
      {
        name: OG_SERIF,
        data: Buffer.from(serif),
        weight: 300,
        style: "normal",
      },
      { name: OG_SANS, data: Buffer.from(sans), weight: 500, style: "normal" },
    ],
  });
}
