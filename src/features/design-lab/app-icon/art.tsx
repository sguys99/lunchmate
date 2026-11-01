// 앱 아이콘 확인 화면 원본 (T8.1 시안, T8.2 구현 후 A만 남김, design-decisions D-18). 서버 컴포넌트에서도 그대로 쓴다(훅 없음).
//
//   <AppIconArt variant="a" size={180} />              정사각 원본(풀 블리드). 마스크는 감싸는 요소가 건다.
//   <AppIconArt variant="a" size={16} favicon />        파비콘: 모서리를 둥글게 자른 작은 그림
//   <AppIconArt variant="a" size={24} mono />           단색 기호(바탕 없음, currentColor). OG 왼쪽 위, monochrome 아이콘
//
// - 그림 경로는 features/pwa/icon-art.ts 한 곳에 있다(PNG 생성 스크립트, OG 기호와 같은 원본).
// - 색은 생성 상수 sharePalette(DESIGN.md color.light, `pnpm tokens`)만 쓴다. 앱 아이콘은 기기 테마와 무관하게 늘 같은 색이어야 해서
//   CSS 변수(다크에서 바뀜)를 쓰지 않는다. ?tone=olive는 게이트에서 비교한 올리브 바탕 변형(확인용)이다.
// - B, C, D 시안 코드는 T8.2에서 지웠다(캡처와 비교 문서 docs/design/g8-comparison-icon.md는 남김).
import {
  bowlMarkup,
  levelFor,
  sandInk,
  type IconLevel,
} from "@/features/pwa/icon-art";
import { sharePalette as P } from "@/lib/design/share-palette.generated";

export { levelFor };

/** 샌드 바탕 색은 앱 산출물과 같은 원본(sandInk, 바탕 track)에서 가져온다 */
const SAND = sandInk(P);
export type { IconLevel };

export const ICON_VARIANTS = ["a"] as const;
export type IconVariant = (typeof ICON_VARIANTS)[number];
export type IconTone = "sand" | "olive";

/** 기본 바탕(D-18: 샌드). ?tone=으로 바꿔 볼 수 있다 */
export const DEFAULT_TONE: Record<IconVariant, IconTone> = {
  a: "sand",
};

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
    ? {
        bg: SAND.bg ?? "none",
        ink: SAND.ink,
        soft: SAND.soft,
        softOpacity: SAND.softOpacity,
      }
    : {
        bg: P.primary,
        ink: P.primaryForeground,
        soft: P.primaryForeground,
        softOpacity: 0.22,
      };
}

type DrawProps = { c: Ink; level: IconLevel };

/** A 그릇 한 점. 그림은 앱 산출물과 같은 원본(features/pwa/icon-art.ts)에서 그린다 */
function Bowl({ c, level }: DrawProps) {
  return (
    <g
      dangerouslySetInnerHTML={{
        __html: bowlMarkup(
          {
            ink: c.ink,
            soft: c.soft,
            softOpacity: c.softOpacity,
          },
          level,
        ),
      }}
    />
  );
}

const DRAW: Record<IconVariant, (p: DrawProps) => React.ReactNode> = {
  a: Bowl,
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
