// 결과 공유 이미지를 브라우저 canvas 2D로 그린다 (T7.4 시안, POLL-09S, T0.16-4).
// 확정 식당 이름은 세션 메모리에 있는 값만 쓰고, 이미지는 서버와 CDN에 보내지 않는다(Blob URL로만 보여 준다).
// 새 의존성 없이 canvas만 쓴다(html-to-image류는 DOM 복제와 글꼴 인라인 비용이 커서 비교 문서 2절에서 뺐다).
// 글꼴은 앱이 이미 쓰는 웹 글꼴(public/fonts/v1/faces.css)을 그대로 쓰고, 그리기 전에 document.fonts.load로 기다린다.
import { WEB_FONTS_HREF, WEB_FONTS_LINK_ID } from "@/lib/fonts/web-fonts";
import type { CategorySlug } from "@/features/place/categories";
import type { ShareVariant } from "./params";

export const SHARE_IMAGE_SIZE = 1080;

export type SharePaletteHex = {
  background: string;
  card: string;
  foreground: string;
  mutedForeground: string;
  border: string;
  primary: string;
  track: string;
  catSurface: string;
  catInk: string;
};

export type ShareImageData = {
  variant: ShareVariant;
  kind: "lunch" | "party";
  title: string;
  placeName: string;
  category: CategorySlug;
  voters: number;
  votes: number;
  dateLabel: string;
  texts: {
    brand: string;
    celebrate: string;
    votesOf: string;
    resultCaption: string;
    final: string;
    votersLabel: string;
    topLabel: string;
    unitVote: string;
    unitPerson: string;
  };
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
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    for (const ch of word) {
      if (ctx.measureText(line + ch).width > maxWidth && line) {
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
  font: (px: number) => string,
  sizes: readonly number[],
  maxWidth: number,
  maxLines: number,
) {
  for (const px of sizes) {
    ctx.font = font(px);
    const lines = wrap(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { px, lines };
  }
  const px = sizes[sizes.length - 1] ?? 64;
  ctx.font = font(px);
  const lines = wrap(ctx, text, maxWidth).slice(0, maxLines);
  let last = lines[maxLines - 1] ?? "";
  while (last && ctx.measureText(`${last}…`).width > maxWidth)
    last = last.slice(0, -1);
  lines[maxLines - 1] = `${last}…`;
  return { px, lines };
}

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = "left",
) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
  return ctx.measureText(value).width;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** 1위 득표 바 (DESIGN.md 5장 득표 바: 트랙 알약, 1위만 올리브) */
function bar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  ratio: number,
  pal: SharePaletteHex,
) {
  roundRect(ctx, x, y, w, 14, 7);
  ctx.fillStyle = pal.track;
  ctx.fill();
  roundRect(ctx, x, y, Math.max(14, w * ratio), 14, 7);
  ctx.fillStyle = pal.primary;
  ctx.fill();
}

/** 숫자(크게) + 단위(작게, 흐리게)를 기준선에 맞춰 잇는다. 반환은 끝 x */
function numberWithUnit(
  ctx: CanvasRenderingContext2D,
  value: string,
  unit: string,
  x: number,
  y: number,
  px: number,
  color: string,
  pal: SharePaletteHex,
) {
  ctx.textAlign = "left";
  const w = text(ctx, value, x, y, sans(px), color);
  const u = text(
    ctx,
    unit,
    x + w + 8,
    y,
    sans(Math.round(px * 0.38)),
    pal.mutedForeground,
  );
  return x + w + 8 + u;
}

/** 이름은 한 줄이면 크게, 두 줄이 되면 한 단계 작게 (두 줄 큰 세리프는 아래 숫자 자리를 먹는다) */
function fitName(
  ctx: CanvasRenderingContext2D,
  name: string,
  maxWidth: number,
  oneLine: readonly number[],
  twoLines: readonly number[],
) {
  const one = fit(ctx, name, serif, oneLine, maxWidth, 1);
  if (!one.lines[0]?.endsWith("…")) return one;
  return fit(ctx, name, serif, twoLines, maxWidth, 2);
}

/** 여러 줄 이름을 위(top)에서부터 행간 1.18로 그린다. 반환은 마지막 줄 글자 아래 끝 y */
function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: readonly string[],
  x: number,
  top: number,
  px: number,
) {
  lines.forEach((l, i) => ctx.fillText(l, x, top + px * (0.92 + i * 1.18)));
  return top + px * (1.12 + (lines.length - 1) * 1.18);
}

function drawA(
  ctx: CanvasRenderingContext2D,
  d: ShareImageData,
  pal: SharePaletteHex,
) {
  const S = SHARE_IMAGE_SIZE;
  const pad = 96;
  ctx.fillStyle = pal.background;
  ctx.fillRect(0, 0, S, S);
  text(ctx, d.texts.brand, pad, pad + 30, sans(32), pal.foreground);
  text(
    ctx,
    d.dateLabel,
    S - pad,
    pad + 30,
    sans(30),
    pal.mutedForeground,
    "right",
  );

  text(ctx, d.title, pad, 330, sans(36), pal.mutedForeground);
  const name = fitName(
    ctx,
    d.placeName,
    S - pad * 2,
    [140, 124],
    [104, 92, 80],
  );
  ctx.font = serif(name.px);
  ctx.fillStyle = pal.foreground;
  const nameBottom = drawLines(ctx, name.lines, pad, 372, name.px);
  ctx.fillStyle = pal.primary;
  roundRect(ctx, pad, nameBottom + 36, 72, 5, 2.5);
  ctx.fill();
  text(
    ctx,
    d.texts.celebrate,
    pad,
    nameBottom + 120,
    sans(36),
    pal.mutedForeground,
  );

  // 아래: 참여 | 1위 표 + 득표 바
  const baseY = S - pad - 60;
  text(
    ctx,
    d.texts.votersLabel,
    pad,
    baseY - 104,
    sans(30),
    pal.mutedForeground,
  );
  numberWithUnit(
    ctx,
    String(d.voters),
    d.texts.unitPerson,
    pad,
    baseY,
    96,
    pal.foreground,
    pal,
  );
  ctx.fillStyle = pal.border;
  ctx.fillRect(pad + 200, baseY - 130, 2, 140);
  text(
    ctx,
    d.texts.topLabel,
    pad + 248,
    baseY - 104,
    sans(30),
    pal.mutedForeground,
  );
  numberWithUnit(
    ctx,
    String(d.votes),
    d.texts.unitVote,
    pad + 248,
    baseY,
    96,
    pal.foreground,
    pal,
  );
  bar(ctx, pad, S - pad - 14, S - pad * 2, d.votes / d.voters, pal);
}

function drawB(
  ctx: CanvasRenderingContext2D,
  d: ShareImageData,
  pal: SharePaletteHex,
  illo: HTMLImageElement | null,
) {
  const S = SHARE_IMAGE_SIZE;
  ctx.fillStyle = pal.background;
  ctx.fillRect(0, 0, S, S);
  const size = 400;
  // 일러스트의 원 중심(40/96)이 가운데 오도록 오른쪽으로 민다
  if (illo) ctx.drawImage(illo, S / 2 - size * (40 / 96), 96, size, size);
  text(ctx, d.title, S / 2, 586, sans(34), pal.mutedForeground, "center");
  const name = fitName(ctx, d.placeName, S - 192, [124, 108], [92, 80, 72]);
  ctx.font = serif(name.px);
  ctx.fillStyle = pal.foreground;
  ctx.textAlign = "center";
  const nameBottom = drawLines(ctx, name.lines, S / 2, 616, name.px);
  text(
    ctx,
    d.texts.votesOf,
    S / 2,
    nameBottom + 76,
    sans(40),
    pal.foreground,
    "center",
  );
  // 바닥: 한 줄 바 + 브랜드
  const bw = 320;
  bar(ctx, (S - bw) / 2, nameBottom + 112, bw, d.votes / d.voters, pal);
  text(
    ctx,
    d.texts.brand,
    S / 2,
    S - 60,
    sans(30),
    pal.mutedForeground,
    "center",
  );
}

function drawC(
  ctx: CanvasRenderingContext2D,
  d: ShareImageData,
  pal: SharePaletteHex,
  illo: HTMLImageElement | null,
) {
  const S = SHARE_IMAGE_SIZE;
  const m = 80;
  ctx.fillStyle = pal.background;
  ctx.fillRect(0, 0, S, S);
  roundRect(ctx, m, m, S - m * 2, S - m * 2, 44);
  ctx.fillStyle = pal.card;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = pal.border;
  ctx.stroke();

  const inner = m + 64;
  text(
    ctx,
    d.texts.resultCaption,
    inner,
    m + 104,
    sans(32),
    pal.mutedForeground,
  );
  if (illo) ctx.drawImage(illo, S - m - 56 - 176, m + 40, 176, 176);
  text(ctx, d.title, inner, m + 300, sans(36), pal.mutedForeground);
  const name = fitName(
    ctx,
    d.placeName,
    S - inner * 2,
    [112, 100],
    [88, 76, 68],
  );
  ctx.font = serif(name.px);
  ctx.fillStyle = pal.foreground;
  const nameBottom = drawLines(ctx, name.lines, inner, m + 340, name.px);
  text(ctx, d.dateLabel, inner, nameBottom + 64, sans(32), pal.mutedForeground);

  // 절취선과 펀치 구멍
  const cut = 760;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(m + 40, cut);
  ctx.lineTo(S - m - 40, cut);
  ctx.lineWidth = 3;
  ctx.strokeStyle = pal.border;
  ctx.stroke();
  ctx.setLineDash([]);
  for (const x of [m + 22, S - m - 22]) {
    ctx.beginPath();
    ctx.arc(x, cut, 14, 0, Math.PI * 2);
    ctx.fillStyle = pal.background;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 떼는 쪽: 확정 + 1위 표 수(올리브), 오른쪽에 참여와 브랜드
  text(ctx, d.texts.final, inner, cut + 74, sans(30), pal.mutedForeground);
  numberWithUnit(
    ctx,
    String(d.votes),
    d.texts.unitVote,
    inner,
    S - m - 56,
    120,
    pal.primary,
    pal,
  );
  text(
    ctx,
    d.texts.votesOf,
    S - inner,
    cut + 74,
    sans(30),
    pal.mutedForeground,
    "right",
  );
  text(
    ctx,
    d.texts.brand,
    S - inner,
    S - m - 60,
    sans(30),
    pal.foreground,
    "right",
  );
}

export function drawShareImage(
  canvas: HTMLCanvasElement,
  d: ShareImageData,
  pal: SharePaletteHex,
  illo: HTMLImageElement | null,
) {
  canvas.width = SHARE_IMAGE_SIZE;
  canvas.height = SHARE_IMAGE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d를 쓸 수 없습니다");
  ctx.textBaseline = "alphabetic";
  if (d.variant === "b") drawB(ctx, d, pal, illo);
  else if (d.variant === "c") drawC(ctx, d, pal, illo);
  else drawA(ctx, d, pal);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 읽지 못했습니다"));
    img.src = src;
  });
}

/** 화면에 그려진 일러스트 svg를 색 변수 없이 data URI로 만든다. */
export function svgToDataUri(
  svg: SVGSVGElement,
  pal: SharePaletteHex,
  slug: CategorySlug,
) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const markup = new XMLSerializer()
    .serializeToString(clone)
    .replaceAll(`var(--cat-${slug}-ink)`, pal.catInk)
    .replaceAll(`var(--cat-${slug}-surface)`, pal.catSurface)
    .replaceAll("currentColor", pal.catInk);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}
