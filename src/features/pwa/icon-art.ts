// 앱 아이콘 원본 그림 (T8.2, PRD APP-01, design-decisions D-18: 시안 A "그릇 한 점", 샌드 바탕 + 올리브 그릇).
//
// 한 곳에서 SVG 문자열을 만들어 모든 산출물이 같은 그림을 쓴다.
// - scripts/build-pwa-assets.mjs: 매니페스트 PNG(any, maskable, monochrome), apple-icon, favicon.ico, src/app/icon.svg, iOS 시작 이미지
// - 서버 OG(features/poll/share/og-art.tsx): 왼쪽 위 24px 단색 기호(data URL)
// - 확인 화면 /design-lab/app-icon/a(features/design-lab/app-icon/art.tsx)
//
// 규칙
// - viewBox 100. 그림은 중심 (50,50) 지름 80 안전 원 안에 든다(W3C maskable 규격). 그래서 any와 maskable이 같은 그림이다(D-18 안건 3).
// - 색은 호출하는 쪽이 넘긴다(sharePalette, `pnpm tokens` 생성 상수). 이 파일은 값 import가 없어서
//   Node(type stripping)로 스크립트가 바로 읽을 수 있다. 하드코딩 색 0.
// - 크기별 세부 3단계: full(96 이상) 김 세 줄 포함, small(40~95) 잔선 빼고 선 굵게, tiny(40 미만) 파비콘과 OG 기호용 최소 형태.

export type IconLevel = "full" | "small" | "tiny";

/** 그림 색. mono는 ink 한 가지(soft는 같은 색을 옅게) */
export type IconInk = {
  /** 바탕. 없으면 투명 */
  bg?: string;
  ink: string;
  soft: string;
  softOpacity: number;
};

/** sharePalette 가운데 아이콘이 쓰는 색 */
export type IconPalette = {
  /** 아이콘 타일 바탕(D-18 후속: 샌드 계열에서 명도만 낮춘 track, 사용자 선택 2026-11-01) */
  track: string;
  primary: string;
  chart3: string;
  foreground: string;
};

export function levelFor(size: number): IconLevel {
  if (size >= 96) return "full";
  if (size >= 40) return "small";
  return "tiny";
}

/** 선 굵기(viewBox 단위). 512에서 약 16px, 작은 크기에서는 상대적으로 굵게 */
export const ICON_STROKE: Record<IconLevel, number> = {
  full: 3.2,
  small: 4.4,
  tiny: 6.5,
};

/**
 * D-18 결정: 샌드 바탕, 올리브 그릇, 옅은 원은 chart-3.
 * 바탕은 앱 배경(background)보다 한 단계 짙은 샌드(track)다. 밝은 배경화면과 브라우저 탭에서 타일 경계가 사라지는 약점 때문에
 * T8.2 실제 크기 확인 뒤 같은 샌드 계열에서 명도만 낮춘 대안2를 사용자가 골랐다(2026-11-01). 매니페스트 색과 스플래시 바탕은 앱 배경 그대로.
 */
export function sandInk(p: IconPalette): IconInk {
  return {
    bg: p.track,
    ink: p.primary,
    soft: p.chart3,
    softOpacity: 0.32,
  };
}

/** 단색 기호(바탕 없음). OG는 글자색, monochrome 아이콘은 아무 색이나(안드로이드는 알파만 쓴다) */
export function monoInk(color: string): IconInk {
  return { ink: color, soft: color, softOpacity: 0.28 };
}

function esc(v: string | number): string {
  return String(v).replace(/[&<>"]/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

/**
 * 그릇 그림(바탕 제외)의 SVG 조각. 일러스트 국밥 그릇의 문법(옅은 원 + 1색 선 + 국물 한 면).
 * 단색 기호(mono)의 tiny는 옅은 원이 없어 선 하나만 남는다.
 */
export function bowlMarkup(c: IconInk, level: IconLevel): string {
  const sw = ICON_STROKE[level];
  const soft =
    level !== "tiny"
      ? `<circle cx="43" cy="44" r="21" fill="${esc(c.soft)}" fill-opacity="${c.softOpacity}"/>`
      : "";
  const lines =
    level === "tiny"
      ? `<path d="M20 46h60c0 18-12 28-30 28S20 64 20 46Z"/><path d="M38 82h24"/>`
      : [
          `<ellipse cx="50" cy="51" rx="25" ry="5.5"/>`,
          `<path d="M25 51v3c0 14 11 21 25 21s25-7 25-21v-3"/>`,
          `<path d="M41 75.5l-1.5 4h21l-1.5-4"/>`,
          `<path d="M30 51.4c0-2 9-3.6 20-3.6s20 1.6 20 3.6-9 3.6-20 3.6-20-1.6-20-3.6Z" fill="${esc(c.ink)}" fill-opacity="0.16" stroke="none"/>`,
          level === "full"
            ? `<path d="M41 41c-3-3.5 3-6 0-10M50 39c-3-3.5 3-6 0-10M59 41c-3-3.5 3-6 0-10"/>`
            : "",
        ].join("");
  return `${soft}<g fill="none" stroke="${esc(c.ink)}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${lines}</g>`;
}

export type AppIconSvgOptions = {
  ink: IconInk;
  level: IconLevel;
  /** 출력 width/height(px). 없으면 viewBox만 */
  size?: number;
  /** 바탕 모서리 반경(viewBox 단위). 파비콘은 20(브라우저는 마스크를 걸지 않는다), 앱 아이콘은 0(풀 블리드) */
  radius?: number;
  /**
   * 그림 배율(1 = 원본). 그림은 이미 지름 80 안전 원 안이라 maskable도 1이다.
   * 스플래시처럼 바탕 없이 그림만 쓸 때 조정할 수 있게 둔다.
   */
  scale?: number;
};

/** 완전한 SVG 문서 문자열(xmlns 포함). 파일, data URL, <img>에 그대로 쓴다 */
export function appIconSvg({
  ink,
  level,
  size,
  radius = 0,
  scale = 1,
}: AppIconSvgOptions): string {
  const dims = size ? ` width="${size}" height="${size}"` : "";
  const bg = ink.bg
    ? `<rect width="100" height="100"${radius ? ` rx="${radius}"` : ""} fill="${esc(ink.bg)}"/>`
    : "";
  const art = bowlMarkup(ink, level);
  const body =
    scale === 1
      ? art
      : `<g transform="translate(50 50) scale(${scale}) translate(-50 -50)">${art}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"${dims}>${bg}${body}</svg>`;
}

/** data:image/svg+xml URL (Satori <img>, 브라우저 렌더) */
export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
