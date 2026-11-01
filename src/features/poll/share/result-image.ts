// 결과 공유 이미지 그리기 (T7.20, POLL-09S, D-17 B 그림 포스터). 공유 시트가 열릴 때 동적 import한다.
// - 1080 x 1080 canvas 2D. 위 가운데 카테고리 일러스트 400, caption 제목, 마루 부리 식당명 124(두 줄이면 한 단계 작게,
//   넘치면 말줄임), "5명 중 3표" + 짧은 올리브 바, 맨 아래 브랜드 글자 (DESIGN.md 5장 "공유 이미지").
// - 식당 이름은 세션의 실시간 이름(T5.12a)만 쓰고, 이미지는 서버와 CDN에 보내지 않는다(Blob으로만 다룬다, T0.16-4).
//   카카오톡으로 보낼 때만 카카오 이미지 서버에 올라간다(Kakao.Share.uploadImage, 100일 보관, D-17 안건 9).
// - 색은 생성 상수(sharePalette, 늘 라이트), 글꼴은 앱 웹 글꼴(public/fonts/v1/faces.css)을 document.fonts.load로 기다린다.
// 새 의존성 없이 canvas만 쓴다(html-to-image류는 DOM 복제와 글꼴 인라인 비용이 커서 g7-comparison-share.md 2절에서 뺐다).
import type { CategorySlug } from "@/features/place/categories";
import { WEB_FONTS_HREF, WEB_FONTS_LINK_ID } from "@/lib/fonts/web-fonts";
import { sharePalette as P } from "@/lib/design/share-palette.generated";

export const SHARE_IMAGE_SIZE = 1080;

export type ResultImageData = {
  title: string;
  placeName: string;
  category: CategorySlug | null;
  voters: number;
  votes: number;
  texts: { brand: string; votesOf: string };
};

const SERIF = "MaruBuri";
const SANS = '"Pretendard Variable"';
const serif = (px: number) => `300 ${px}px ${SERIF}`;
const sans = (px: number) => `500 ${px}px ${SANS}`;

/** 웹 글꼴 목록이 아직 없으면(첫 방문) 붙이고, 이미지에 쓸 글자가 든 조각을 받을 때까지 기다린다. */
export async function ensureShareFonts(text: string): Promise<void> {
  if (!document.getElementById(WEB_FONTS_LINK_ID)) {
    const link = document.createElement("link");
    link.id = WEB_FONTS_LINK_ID;
    link.rel = "stylesheet";
    link.href = WEB_FONTS_HREF;
    const loaded = new Promise<void>((resolve) => {
      link.onload = () => resolve();
      link.onerror = () => resolve();
    });
    document.head.appendChild(link);
    await loaded;
  }
  await Promise.all([
    document.fonts.load(serif(100), text),
    document.fonts.load(sans(40), text),
  ]);
}

/** 띄어쓰기 단위로 줄을 나누고(keep-all), 한 낱말이 폭을 넘으면 글자 단위로 자른다. */
export function wrapText(
  measure: (s: string) => number,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next) <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    for (const ch of word) {
      if (measure(line + ch) > maxWidth && line) {
        lines.push(line);
        line = "";
      }
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** 큰 크기부터 줄여 가며 maxLines 안에 들어가는 크기를 찾는다. 끝까지 안 들어가면 마지막 줄을 말줄임. */
function fit(
  ctx: CanvasRenderingContext2D,
  text: string,
  sizes: readonly number[],
  maxWidth: number,
  maxLines: number,
) {
  const measure = (s: string) => ctx.measureText(s).width;
  for (const px of sizes) {
    ctx.font = serif(px);
    const lines = wrapText(measure, text, maxWidth);
    if (lines.length <= maxLines) return { px, lines };
  }
  const px = sizes[sizes.length - 1] ?? 64;
  ctx.font = serif(px);
  const lines = wrapText(measure, text, maxWidth).slice(0, maxLines);
  let last = lines[maxLines - 1] ?? "";
  while (last && measure(`${last}…`) > maxWidth) last = last.slice(0, -1);
  lines[maxLines - 1] = `${last}…`;
  return { px, lines };
}

/** 이름은 한 줄이면 크게, 두 줄이 되면 한 단계 작게 (두 줄 큰 세리프는 아래 숫자 자리를 먹는다) */
function fitName(
  ctx: CanvasRenderingContext2D,
  name: string,
  maxWidth: number,
) {
  const one = fit(ctx, name, [124, 108], maxWidth, 1);
  if (!one.lines[0]?.endsWith("…")) return one;
  return fit(ctx, name, [92, 80, 72], maxWidth, 2);
}

function centerText(
  ctx: CanvasRenderingContext2D,
  value: string,
  y: number,
  font: string,
  color: string,
) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(value, SHARE_IMAGE_SIZE / 2, y);
}

/** 1위 득표 바 (DESIGN.md 5장 득표 바: 트랙 알약, 1위만 올리브). 이미지의 올리브는 여기 한 군데 */
function bar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  ratio: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, 14, 7);
  ctx.fillStyle = P.track;
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(14, w * Math.min(1, ratio)), 14, 7);
  ctx.fillStyle = P.primary;
  ctx.fill();
}

export function drawResultImage(
  canvas: HTMLCanvasElement,
  d: ResultImageData,
  illo: HTMLImageElement | null,
): void {
  const S = SHARE_IMAGE_SIZE;
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d를 쓸 수 없습니다");
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = P.background;
  ctx.fillRect(0, 0, S, S);

  const size = 400;
  // 일러스트의 원 중심(40/96)이 가운데 오도록 오른쪽으로 민다
  if (illo) ctx.drawImage(illo, S / 2 - size * (40 / 96), 96, size, size);
  centerText(ctx, d.title, 586, sans(34), P.mutedForeground);

  const name = fitName(ctx, d.placeName, S - 192);
  ctx.font = serif(name.px);
  ctx.fillStyle = P.foreground;
  ctx.textAlign = "center";
  name.lines.forEach((l, i) =>
    ctx.fillText(l, S / 2, 616 + name.px * (0.92 + i * 1.18)),
  );
  const nameBottom = 616 + name.px * (1.12 + (name.lines.length - 1) * 1.18);

  centerText(ctx, d.texts.votesOf, nameBottom + 76, sans(40), P.foreground);
  const bw = 320;
  bar(
    ctx,
    (S - bw) / 2,
    nameBottom + 112,
    bw,
    d.voters > 0 ? d.votes / d.voters : 0,
  );
  centerText(ctx, d.texts.brand, S - 60, sans(30), P.mutedForeground);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 읽지 못했습니다"));
    img.src = src;
  });
}

/** 화면에 그려진 일러스트 svg를 색 변수 없이(라이트 값으로) data URI로 만든다. */
export function svgToDataUri(svg: SVGSVGElement, slug: CategorySlug): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const cat = P.category[slug];
  const markup = new XMLSerializer()
    .serializeToString(clone)
    .replaceAll(`var(--cat-${slug}-ink)`, cat.ink)
    .replaceAll(`var(--cat-${slug}-surface)`, cat.surface)
    .replaceAll("currentColor", cat.ink);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

/** 그린 이미지를 PNG Blob으로 */
export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob"))),
      "image/png",
    ),
  );
}
