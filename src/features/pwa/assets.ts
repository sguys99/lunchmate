// PWA 산출물 목록 (T8.2, PRD APP-01, design-decisions D-18 안건 3, 4, 5).
// 생성 스크립트(scripts/build-pwa-assets.mjs)와 앱(manifest.ts, 루트 layout의 iOS 시작 이미지 링크, public/sw.js 허용 목록 테스트)이
// 같은 목록을 읽는다. 값 import가 없어 Node(type stripping)로 스크립트가 바로 읽는다.
//
// iOS 시작 이미지(apple-touch-startup-image)
// - iOS는 기기 화면과 픽셀 크기가 정확히 같은 이미지만 쓴다. 그래서 기기 크기마다 한 장씩, 세로만 만든다.
// - 크기 목록은 Apple Human Interface Guidelines "Layout"의 기기 사양(포인트 x 배율)을 따랐다. iPhone 17 계열과 iPhone Air까지
//   (HIG 2025-09-09 개정). 새 기기가 나오면 이 목록에 더하고 `pnpm pwa:assets`를 다시 돌린다.
// - 라이트/다크는 media의 prefers-color-scheme으로 고른다. Apple 문서에는 이 조합의 언급이 없다([실기기] 확인 필요,
//   맞지 않으면 iOS는 라이트 또는 흰 화면을 보여 줄 뿐 앱 동작에는 영향이 없다).

export const PWA_DIR = "/pwa";

/** 매니페스트 아이콘(D-18 안건 3, 10): any와 maskable은 같은 그림, 항목만 둘 */
export const PWA_ICONS = {
  any192: `${PWA_DIR}/icon-192.png`,
  any512: `${PWA_DIR}/icon-512.png`,
  maskable192: `${PWA_DIR}/icon-maskable-192.png`,
  maskable512: `${PWA_DIR}/icon-maskable-512.png`,
  monochrome512: `${PWA_DIR}/icon-monochrome-512.png`,
} as const;

/** Next 파일 규칙으로 두는 아이콘(src/app 아래, D-18 안건 5). 주소는 Next가 정한다 */
export const APP_FILE_ICONS = {
  svg: "/icon.svg",
  apple: "/apple-icon.png",
  favicon: "/favicon.ico",
} as const;

export type StartupDevice = {
  /** 세로 포인트 폭, 높이, 배율 */
  w: number;
  h: number;
  dpr: number;
  /** 사람이 읽는 이름(주석용) */
  name: string;
};

export const STARTUP_DEVICES: readonly StartupDevice[] = [
  { w: 440, h: 956, dpr: 3, name: "iPhone 16 Pro Max, 17 Pro Max" },
  {
    w: 430,
    h: 932,
    dpr: 3,
    name: "iPhone 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus",
  },
  { w: 428, h: 926, dpr: 3, name: "iPhone 12 Pro Max, 13 Pro Max, 14 Plus" },
  { w: 420, h: 912, dpr: 3, name: "iPhone Air" },
  { w: 414, h: 896, dpr: 3, name: "iPhone XS Max, 11 Pro Max" },
  { w: 414, h: 896, dpr: 2, name: "iPhone XR, 11" },
  { w: 414, h: 736, dpr: 3, name: "iPhone 8 Plus" },
  { w: 402, h: 874, dpr: 3, name: "iPhone 16 Pro, 17, 17 Pro" },
  { w: 393, h: 852, dpr: 3, name: "iPhone 14 Pro, 15, 15 Pro, 16" },
  { w: 390, h: 844, dpr: 3, name: "iPhone 12, 13, 14, 16e" },
  { w: 375, h: 812, dpr: 3, name: "iPhone X, XS, 11 Pro, 12 mini, 13 mini" },
  { w: 375, h: 667, dpr: 2, name: "iPhone 8, SE 2, SE 3" },
  { w: 1032, h: 1376, dpr: 2, name: "iPad Pro 13 (M4)" },
  { w: 1024, h: 1366, dpr: 2, name: "iPad Pro 12.9, iPad Air 13" },
  { w: 834, h: 1210, dpr: 2, name: "iPad Pro 11 (M4)" },
  { w: 834, h: 1194, dpr: 2, name: "iPad Pro 11" },
  { w: 820, h: 1180, dpr: 2, name: "iPad Air 10.9, iPad 10.9, iPad Air 11" },
  { w: 810, h: 1080, dpr: 2, name: "iPad 10.2" },
  { w: 768, h: 1024, dpr: 2, name: "iPad mini 5, iPad 9.7" },
  { w: 744, h: 1133, dpr: 2, name: "iPad mini 6, iPad mini (A17 Pro)" },
];

export type StartupScheme = "light" | "dark";
export const STARTUP_SCHEMES: readonly StartupScheme[] = ["light", "dark"];

/** 시작 이미지 한 장의 픽셀 크기 */
export function startupPixels(d: StartupDevice): {
  width: number;
  height: number;
} {
  return { width: d.w * d.dpr, height: d.h * d.dpr };
}

export function startupImagePath(
  d: StartupDevice,
  scheme: StartupScheme,
): string {
  const { width, height } = startupPixels(d);
  return `${PWA_DIR}/startup-${width}x${height}-${scheme}.png`;
}

export function startupImageMedia(
  d: StartupDevice,
  scheme: StartupScheme,
): string {
  return `screen and (device-width: ${d.w}px) and (device-height: ${d.h}px) and (-webkit-device-pixel-ratio: ${d.dpr}) and (orientation: portrait) and (prefers-color-scheme: ${scheme})`;
}

/** 루트 metadata.appleWebApp.startupImage에 넣는 목록(라이트 먼저) */
export function startupImageLinks(): { url: string; media: string }[] {
  return STARTUP_SCHEMES.flatMap((scheme) =>
    STARTUP_DEVICES.map((d) => ({
      url: startupImagePath(d, scheme),
      media: startupImageMedia(d, scheme),
    })),
  );
}

/** 시작 이미지 안 아이콘 크기(포인트). 확인 화면의 iOS 스플래시(폭 390에 112)와 같은 비율 */
export const STARTUP_ICON_PT = 112;
