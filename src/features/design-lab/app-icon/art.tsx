// 앱 아이콘 시안 원본 (T8.1). 서버 컴포넌트에서도 그대로 쓴다(훅 없음).
//
//   <AppIconArt variant="a" size={180} />              정사각 원본(풀 블리드). 마스크는 감싸는 요소가 건다.
//   <AppIconArt variant="c" size={16} favicon />        파비콘: 모서리를 둥글게 자른 작은 그림
//   <AppIconArt variant="b" size={24} mono />           단색 기호(바탕 없음, currentColor). OG 왼쪽 위, monochrome 아이콘 후보
//
// - viewBox 100. 그림은 모두 중심 (50,50) 지름 80 안전 원 안에 든다(maskable 규격, 안드로이드 런처가 어떤 모양으로 잘라도 남는다).
// - 색은 생성 상수 sharePalette(DESIGN.md color.light, `pnpm tokens`)만 쓴다. 앱 아이콘은 기기 테마와 무관하게 늘 같은 색이어야 해서
//   CSS 변수(다크에서 바뀜)를 쓰지 않는다. T8.2 PNG 생성 스크립트도 같은 상수를 읽게 된다.
// - 크기에 따라 세부가 바뀐다: full(96 이상) 잔선 포함, small(40~95) 잔선 빼고 선 굵게, tiny(40 미만) 파비콘용 최소 형태.
import { appIconLabCopy } from "@/copy/design-lab-app-icon";
import { sharePalette as P } from "@/lib/design/share-palette.generated";

export const ICON_VARIANTS = ["a", "b", "c", "d"] as const;
export type IconVariant = (typeof ICON_VARIANTS)[number];
export type IconTone = "sand" | "olive";
export type IconLevel = "full" | "small" | "tiny";

/** 시안마다 기본 바탕. ?tone=으로 바꿔 볼 수 있다 */
export const DEFAULT_TONE: Record<IconVariant, IconTone> = {
  a: "sand",
  b: "olive",
  c: "sand",
  d: "olive",
};

export function levelFor(size: number): IconLevel {
  if (size >= 96) return "full";
  if (size >= 40) return "small";
  return "tiny";
}

type Ink = {
  bg: string;
  ink: string;
  soft: string;
  softOpacity: number;
};

function inkFor(tone: IconTone, mono: boolean): Ink {
  if (mono)
    return {
      bg: "none",
      ink: "currentColor",
      soft: "currentColor",
      softOpacity: 0.28,
    };
  return tone === "sand"
    ? { bg: P.background, ink: P.primary, soft: P.chart3, softOpacity: 0.32 }
    : {
        bg: P.primary,
        ink: P.primaryForeground,
        soft: P.primaryForeground,
        softOpacity: 0.22,
      };
}

/** 선 굵기(viewBox 단위). 512에서 약 16px, 작은 크기에서는 상대적으로 굵게 */
const STROKE: Record<IconLevel, number> = { full: 3.2, small: 4.4, tiny: 6.5 };

type DrawProps = { c: Ink; level: IconLevel };

/** A 그릇 한 점: 일러스트 국밥 그릇의 문법(옅은 원 + 1색 선 + 국물 한 면) */
function Bowl({ c, level }: DrawProps) {
  const sw = STROKE[level];
  return (
    <>
      {level !== "tiny" ? (
        <circle
          cx="43"
          cy="44"
          r="21"
          fill={c.soft}
          fillOpacity={c.softOpacity}
        />
      ) : null}
      <g
        fill="none"
        stroke={c.ink}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {level === "tiny" ? (
          <>
            <path d="M20 46h60c0 18-12 28-30 28S20 64 20 46Z" />
            <path d="M38 82h24" />
          </>
        ) : (
          <>
            <ellipse cx="50" cy="51" rx="25" ry="5.5" />
            <path d="M25 51v3c0 14 11 21 25 21s25-7 25-21v-3" />
            <path d="M41 75.5l-1.5 4h21l-1.5-4" />
            <path
              d="M30 51.4c0-2 9-3.6 20-3.6s20 1.6 20 3.6-9 3.6-20 3.6-20-1.6-20-3.6Z"
              fill={c.ink}
              fillOpacity={0.16}
              stroke="none"
            />
            {level === "full" ? (
              <path d="M41 41c-3-3.5 3-6 0-10M50 39c-3-3.5 3-6 0-10M59 41c-3-3.5 3-6 0-10" />
            ) : null}
          </>
        )}
      </g>
    </>
  );
}

/** B 마루 부리 한 글자. 웹 글꼴로 그린다(T8.2 PNG는 브라우저 렌더, SVG 파비콘은 글자를 패스로 바꿔야 함) */
function Monogram({ c, level }: DrawProps) {
  const size = level === "tiny" ? 74 : level === "small" ? 62 : 58;
  return (
    <text
      x="50"
      y="52"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={size}
      fill={c.ink}
      style={{
        fontFamily: "var(--lm-font-heading)",
        fontWeight: 400,
        letterSpacing: "-0.02em",
      }}
    >
      {appIconLabCopy.monogram}
    </text>
  );
}

/** C 세 장 중 한 장: 부채꼴 카드 세 장, 가운데만 채움 */
function ThreeCards({ c, level }: DrawProps) {
  const sw = STROKE[level] * 0.8;
  const card = { x: 37, y: 31, width: 26, height: 40, rx: 6 };
  const side =
    level === "tiny"
      ? { fill: c.soft, fillOpacity: Math.min(1, c.softOpacity * 2.4) }
      : {
          fill: c.bg === "none" ? "none" : c.bg,
          stroke: c.ink,
          strokeWidth: sw,
        };
  const angle = level === "tiny" ? 20 : 16;
  return (
    <>
      <rect {...card} {...side} transform={`rotate(-${angle} 50 78)`} />
      <rect {...card} {...side} transform={`rotate(${angle} 50 78)`} />
      <rect
        {...card}
        fill={c.ink}
        stroke={c.bg === "none" ? "none" : c.bg}
        strokeWidth={level === "tiny" ? 0 : sw * 0.9}
      />
    </>
  );
}

/** D 숟가락 핀: 핀 머리 = 숟가락 머리, 핀 꼬리 = 손잡이. 머리 구멍은 evenodd로 뚫는다 */
function SpoonPin({ c, level }: DrawProps) {
  const hole =
    level === "tiny"
      ? "M43 36a7 9 0 1 0 14 0a7 9 0 1 0-14 0Z"
      : "M42.5 36a7.5 9.5 0 1 0 15 0a7.5 9.5 0 1 0-15 0Z";
  return (
    <>
      {level !== "tiny" ? (
        <ellipse
          cx="50"
          cy="84"
          rx="11"
          ry="2.4"
          fill={c.soft}
          fillOpacity={c.softOpacity * 1.6}
        />
      ) : null}
      <path
        fillRule="evenodd"
        fill={c.ink}
        d={`M50 17C61.5 17 69 25.5 69 36c0 10.5-10 18.5-15 24v18.5a4 4 0 0 1-8 0V60c-5-5.5-15-13.5-15-24 0-10.5 7.5-19 19-19Z${hole}`}
      />
    </>
  );
}

const DRAW: Record<IconVariant, (p: DrawProps) => React.ReactNode> = {
  a: Bowl,
  b: Monogram,
  c: ThreeCards,
  d: SpoonPin,
};

export type AppIconArtProps = {
  variant: IconVariant;
  /** 표시 크기(px). 세부 단계(level)도 이 값으로 정한다 */
  size: number;
  tone?: IconTone;
  /** 바탕 없이 currentColor 한 가지 */
  mono?: boolean;
  /** 파비콘: 바탕 모서리를 둥글게(브라우저는 마스크를 걸지 않는다) */
  favicon?: boolean;
  level?: IconLevel;
  /** 있으면 role="img" + 이름, 없으면 장식 */
  label?: string;
  className?: string;
};

export function AppIconArt({
  variant,
  size,
  tone,
  mono = false,
  favicon = false,
  level,
  label,
  className,
}: AppIconArtProps) {
  const c = inkFor(tone ?? DEFAULT_TONE[variant], mono);
  const lv = level ?? levelFor(size);
  const a11y = label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true } as const);
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      focusable="false"
      data-variant={variant}
      data-level={lv}
      {...a11y}
    >
      {c.bg !== "none" ? (
        <rect width="100" height="100" rx={favicon ? 20 : 0} fill={c.bg} />
      ) : null}
      {DRAW[variant]({ c, level: lv })}
    </svg>
  );
}
