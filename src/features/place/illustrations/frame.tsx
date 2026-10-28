// 카테고리 일러스트 공통 틀과 그리기 도구 (T2.8, DESIGN.md 6장).
// - viewBox 96. 모든 그림은 바닥선 y 78에 앉고, 가로 12~88 안에 든다. 시점은 "약간 위에서 본 정면"(그릇 입구는 납작한 타원).
// - 같은 자리(중심 40,42, 반지름 25)의 옅은 원 하나가 12종을 한 가족으로 묶는다.
// - 면은 음식 한 군데에만 선 색의 옅은 톤(TONE_OPACITY)으로 깐다.
// - 색은 CSS 변수만: 선 var(--cat-<slug>-ink)(currentColor로 전달), 원 var(--cat-<slug>-surface). 하드코딩 색 금지.
//   다크 모드는 tokens.css가 두 변수를 바꿔 자동으로 따라온다.
import type { CategorySlug } from "@/features/place/categories";

export const VIEWBOX = 96;
/**
 * icon 변형은 바깥 여백을 잘라 그림을 키운다. 그림이 드는 영역(가로 12~88, 세로 14~78)과
 * 원(40,42 반지름 25)을 모두 담는 76 정사각형이다.
 */
export const ICON_VIEWBOX = { x: 12, y: 8, size: 76 } as const;
/** 바닥선. 그릇 굽, 받침, 다리가 모두 여기서 끝난다. */
export const BASE = 78;
/** 음식 톤 면의 불투명도. 선 색(currentColor)에 곱해지므로 라이트와 다크에서 같은 비율로 보인다. */
export const TONE_OPACITY = 0.16;

export type IllustrationVariant = "card" | "icon";

/** 그림 함수가 받는 값. detail이 false면 결, 김, 깨 같은 잔선을 뺀다(icon 변형). */
export type DrawOptions = { detail: boolean };

/**
 * 화면에 보이는 선 굵기(px)를 표시 크기에 맞춰 정한다.
 * card는 96px에서 1.4px(DESIGN.md 기준)이고 크기에 따라 완만하게 늘어난다(160px에서 약 1.8px).
 * icon은 잔선을 뺀 대신 1.3~1.5px로 또렷하게 둔다.
 * 반환값은 viewBox 단위라서 vector-effect 없이도 크기와 무관하게 의도한 굵기가 나온다.
 */
export function strokeWidthFor(size: number, variant: IllustrationVariant) {
  const px =
    variant === "icon"
      ? clamp(1.25 + (size - 32) * 0.01, 1.25, 1.5)
      : clamp(1.4 * Math.sqrt(size / 96), 1.2, 1.9);
  const units = variant === "icon" ? ICON_VIEWBOX.size : VIEWBOX;
  return round((px * units) / size);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

/* ---------- 경로 도구 (그릇 모양을 12종에서 같게 맞추려고 쓴다) ---------- */

/** 그릇 몸통: 입구(rim) 양 끝에서 둥글게 내려와 bottom에서 만난다. */
export function bowlBody(cx: number, rim: number, rx: number, bottom: number) {
  const h = bottom - rim;
  const sy = round(rim + h * 0.8);
  return `M${cx - rx} ${rim}C${cx - rx} ${sy} ${round(cx - rx * 0.55)} ${bottom} ${cx} ${bottom}S${cx + rx} ${sy} ${cx + rx} ${rim}`;
}

/** 그릇 굽: 몸통 바닥에서 바닥선까지 살짝 벌어지는 사다리꼴. */
export function foot(cx: number, halfWidth: number, top: number) {
  return `M${cx - halfWidth} ${top - 0.4}L${cx - halfWidth - 1} ${BASE}H${cx + halfWidth + 1}L${cx + halfWidth} ${top - 0.4}`;
}

/** 타원의 앞쪽 절반(아래 호). 음식이 쌓여 뒤쪽 테두리가 가려질 때 쓴다. */
export function frontArc(cx: number, cy: number, rx: number, ry: number) {
  return `M${cx - rx} ${cy}A${rx} ${ry} 0 0 0 ${cx + rx} ${cy}`;
}

/** 음식 톤 면. outline이면 같은 모양의 선도 함께 긋는다. */
export function Tone({ d, outline = false }: { d: string; outline?: boolean }) {
  return (
    <>
      <path
        d={d}
        fill="currentColor"
        fillOpacity={TONE_OPACITY}
        stroke="none"
      />
      {outline ? <path d={d} /> : null}
    </>
  );
}

/* ---------- 틀 ---------- */

export function Frame({
  category,
  size,
  variant,
  className,
  label,
  children,
}: {
  category: CategorySlug;
  size: number;
  variant: IllustrationVariant;
  className?: string;
  /** 없으면 장식(aria-hidden), 있으면 role="img" + aria-label */
  label?: string;
  children: React.ReactNode;
}) {
  const a11y = label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true } as const);
  return (
    <svg
      viewBox={
        variant === "icon"
          ? `${ICON_VIEWBOX.x} ${ICON_VIEWBOX.y} ${ICON_VIEWBOX.size} ${ICON_VIEWBOX.size}`
          : `0 0 ${VIEWBOX} ${VIEWBOX}`
      }
      width={size}
      height={size}
      className={className}
      focusable="false"
      data-category={category}
      data-variant={variant}
      style={{ color: `var(--cat-${category}-ink)` }}
      {...a11y}
    >
      <circle
        cx="40"
        cy="42"
        r="25"
        style={{ fill: `var(--cat-${category}-surface)` }}
      />
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidthFor(size, variant)}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
    </svg>
  );
}
