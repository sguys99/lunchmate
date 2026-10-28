"use client";
// 시안 C "Clay Grid" 공용 조각: 숫자 표, 배지, 일러스트 칸, 스켈레톤, 상태 안내, 지도 면.
// 규칙 원본: docs/design/candidates/c.DESIGN.md 5절(카드 해부도), 7절(모션).
import NumberFlow from "@number-flow/react";
import * as m from "motion/react-m";
import type { CSSProperties, ReactNode } from "react";
import { clayGridCopy } from "@/copy/design-lab-c";
import { homeCopy } from "@/copy/home";
import { IllustrationC } from "@/features/design-lab/illustrations/c";
import type { MockPlace, StatusBadge } from "@/features/design-lab/mock";
import { categoryLabel, type CategorySlug } from "@/features/place/categories";
import { cn } from "@/lib/utils";
import { MapPlaceholder } from "../desktop-split";
import { usePrefersReducedMotion } from "../motion";
import type { DesignMotionTokens } from "../types";

const metricCopy = clayGridCopy.metrics;

/** 카테고리 라벨 글자색(cat ink). 동적 클래스 대신 CSS 변수를 직접 가리킨다. */
export function catInk(slug: CategorySlug): CSSProperties {
  return { color: `var(--cat-${slug}-ink)` };
}

/**
 * 일러스트 칸. 다크에서 밝은 그릇이 숫자보다 먼저 보이지 않도록 칸 위에 카드 면을 살짝 덮는다
 * (c.DESIGN.md 6절 "음화" 약점 완화, 라이트에서는 덮지 않는다).
 */
export function IllustrationCell({
  category,
  className,
}: {
  category: CategorySlug;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-md",
        className,
      )}
    >
      <IllustrationC category={category} className="block size-full" />
      <span
        aria-hidden
        className="absolute inset-0 hidden bg-card opacity-25 dark:block"
      />
    </span>
  );
}

const BADGE_TONE: Record<StatusBadge, string> = {
  estimate: "bg-warning-surface text-warning-foreground",
  waiting: "bg-warning-surface text-warning-foreground",
  avoidWarning: "bg-warning-surface text-warning-foreground",
  deal: "bg-info-surface text-info-foreground",
};

export function Badge({ kind }: { kind: StatusBadge }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-badge px-1.5 type-caption whitespace-nowrap",
        BADGE_TONE[kind],
      )}
    >
      {homeCopy.badges[kind]}
    </span>
  );
}

/** 가격 → 숫자 + 단위. 9,000 → 9 천 원대, 13,000 → 1.3 만 원대 (formatPriceBand와 같은 내림 규칙) */
export function priceParts(priceKRW: number): { value: number; unit: string } {
  const thousands = Math.floor(priceKRW / 1000);
  if (thousands < 10) {
    return { value: thousands, unit: metricCopy.priceUnitThousand };
  }
  return { value: thousands / 10, unit: metricCopy.priceUnitTenThousand };
}

/** NumberFlow 타이밍: 토큰 slow(200ms) 기준, 숫자 회전만 두 배로 해 굴러가는 것이 보이게 한다 */
export function useFlowTiming(motion: DesignMotionTokens) {
  const reduced = usePrefersReducedMotion();
  const [x1, y1, x2, y2] = motion.easing.emphasized;
  const easing = `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
  return {
    animated: !reduced,
    transformTiming: { duration: motion.duration.slow, easing },
    spinTiming: { duration: motion.duration.slow * 2, easing },
    opacityTiming: { duration: motion.duration.fast, easing: "ease-out" },
  } as const;
}

/** 숫자 + 작은 단위 (2:1 크기비, 기준선 정렬) */
export function Figure({
  value,
  unit,
  motion,
  size = "lg",
  fractionDigits = 0,
}: {
  value: number;
  unit: string;
  motion: DesignMotionTokens;
  size?: "lg" | "md";
  fractionDigits?: number;
}) {
  const timing = useFlowTiming(motion);
  return (
    <span className="flex items-baseline gap-0.5 whitespace-nowrap">
      <NumberFlow
        value={value}
        format={{
          maximumFractionDigits: fractionDigits,
          minimumFractionDigits: 0,
        }}
        locales="ko-KR"
        className={cn(
          "text-foreground",
          size === "lg" ? "type-numeric-lg" : "type-numeric-md",
        )}
        {...timing}
      />
      <span className="type-caption text-muted-foreground">{unit}</span>
    </span>
  );
}

/** 카드와 시트가 함께 쓰는 숫자 표: 3칸 1fr, 칸 사이 1px 세로 헤어라인, 왼쪽 정렬 */
export function MetricGrid({
  place,
  motion,
  className,
}: {
  place: MockPlace;
  motion: DesignMotionTokens;
  className?: string;
}) {
  const price = priceParts(place.priceKRW);
  return (
    <dl className={cn("grid grid-cols-3", className)}>
      <MetricCell label={metricCopy.walk} first>
        <Figure
          value={place.walkMinutes}
          unit={metricCopy.walkUnit}
          motion={motion}
        />
      </MetricCell>
      <MetricCell label={metricCopy.price}>
        <Figure
          value={price.value}
          unit={price.unit}
          motion={motion}
          fractionDigits={1}
        />
      </MetricCell>
      <MetricCell label={metricCopy.thumbs}>
        {place.thumbsUpRate === null ? (
          <span className="flex h-6 items-end type-caption text-muted-foreground">
            {homeCopy.thumbsUpEmpty}
          </span>
        ) : (
          <Figure
            value={place.thumbsUpRate}
            unit={metricCopy.thumbsUnit}
            motion={motion}
          />
        )}
      </MetricCell>
    </dl>
  );
}

function MetricCell({
  label,
  first = false,
  children,
}: {
  label: string;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col-reverse gap-0.5",
        first ? "pr-3" : "border-l border-border px-3",
      )}
    >
      <dt className="type-caption text-muted-foreground">{label}</dt>
      <dd className="flex h-6 items-end">{children}</dd>
    </div>
  );
}

/** 스켈레톤 조각. 같은 주기로 함께 지나가는 은은한 쉬머, reduced motion이면 정지 */
export function Bone({ className }: { className?: string }) {
  const reduced = usePrefersReducedMotion();
  if (reduced) {
    return <span className={cn("block rounded-sm bg-skeleton", className)} />;
  }
  return (
    <m.span
      aria-hidden
      className={cn(
        "block rounded-sm bg-skeleton bg-[linear-gradient(90deg,var(--color-skeleton)_40%,var(--color-skeleton-highlight)_50%,var(--color-skeleton)_60%)] bg-size-[300%_100%]",
        className,
      )}
      initial={{ backgroundPositionX: "100%" }}
      animate={{ backgroundPositionX: "0%" }}
      transition={{ duration: 1.6, ease: "linear", repeat: Infinity }}
    />
  );
}

/** 빈 상태, 오류, 오프라인 본문: 왼쪽 정렬, 시각 요소 + 제목 + 설명. 행동 버튼은 하단 액션 영역이 맡는다 */
export function StateNotice({
  visual,
  title,
  body,
  titleNode,
  children,
}: {
  visual: ReactNode;
  title: string;
  body: string;
  /** 제목 요소를 바꿀 때 (시트에서는 DrawerTitle) */
  titleNode?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      {visual}
      <div className="flex flex-col gap-2">
        {titleNode ?? <h2 className="type-heading text-balance">{title}</h2>}
        <p className="max-w-[36ch] type-body text-pretty text-muted-foreground">
          {body}
        </p>
      </div>
      {children}
    </div>
  );
}

/** 상태 아이콘 칸: 56x56 muted 면 + 22px 선 아이콘 */
export function StateGlyph({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-14 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground [&_svg]:size-6 [&_svg]:stroke-[1.75]">
      {children}
    </span>
  );
}

/** 지도 자리: 32px 헤어라인 격자(4px 그리드의 8배) 위에 사무실 표시와 식당 핀 */
export type MapPin = { id: string; name: string; walkMinutes: number };

const PIN_SPOTS = [
  { left: "58%", top: "30%" },
  { left: "26%", top: "56%" },
  { left: "66%", top: "68%" },
  { left: "36%", top: "24%" },
] as const;

export function MapSurfaceC({
  pins,
  selectedId,
  className,
}: {
  pins: readonly MapPin[];
  selectedId?: string | null;
  className?: string;
}) {
  return (
    <MapPlaceholder
      className={cn(
        "overflow-hidden bg-muted bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-size-[2rem_2rem]",
        className,
      )}
    >
      {/* 큰 길 두 줄: 격자보다 한 단계 진한 면 */}
      <span className="absolute inset-x-0 top-[44%] h-3 bg-card" />
      <span className="absolute inset-y-0 left-[46%] w-3 bg-card" />
      {/* 사무실 기준점 */}
      <span className="absolute top-[44%] left-[46%] size-3 translate-x-0 rounded-[2px] bg-foreground ring-4 ring-card" />
      {pins.slice(0, PIN_SPOTS.length).map((pin, i) => {
        const selected = pin.id === selectedId;
        return (
          <span
            key={pin.id}
            className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center"
            style={PIN_SPOTS[i]}
          >
            <span
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-md border bg-card px-2 type-caption whitespace-nowrap shadow-sm transition-colors duration-(--lm-duration-fast)",
                selected
                  ? "border-primary text-foreground"
                  : "border-input text-muted-foreground",
              )}
            >
              {pin.name}
              <span className="tabular-nums">
                {pin.walkMinutes}
                {metricCopy.walkUnit}
              </span>
            </span>
            <span
              className={cn(
                "mt-0.5 size-2 rounded-full ring-2 ring-card",
                selected ? "bg-primary" : "bg-muted-foreground",
              )}
            />
          </span>
        );
      })}
    </MapPlaceholder>
  );
}

export function categoryText(slug: CategorySlug): string {
  return categoryLabel(slug);
}
