"use client";
// 시안 A "Terracotta Table" 공통 조각: 하단 탭, 데스크톱 내비, 숫자 3개, 배지, 상태 패널, 지도 면, 버튼.
// 색은 토큰 유틸리티와 토큰 변수(var(--cat-*))만 쓴다.
import {
  Clock,
  CloudOff,
  RotateCw,
  Tag,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import * as m from "motion/react-m";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { designLabACopy as copy } from "@/copy/design-lab-a";
import { homeCopy } from "@/copy/home";
import type { MockPlace, StatusBadge } from "@/features/design-lab/mock";
import { s } from "@/features/design-lab/illustrations/a/cls";
import { blob, stick } from "@/features/design-lab/illustrations/a/shapes";
import type { CategorySlug } from "@/features/place/categories";
import { cn } from "@/lib/utils";
import { springOf } from "../motion";
import { DESIGN_TABS, type DesignTabId } from "../tabs";
import type { DesignMotionTokens } from "../types";
import { splitPercent, splitPrice } from "./format";
import "./skeleton-a.css";

/* ------------------------------------------------------------------ */
/* 공통 클래스                                                          */
/* ------------------------------------------------------------------ */

export const focusRing =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** 스켈레톤 조각. 쉬머는 skeleton-a.css가 화면 전체에 하나로 맞춘다 */
export const skel = "lma-skel";

export function catSurface(slug: CategorySlug): CSSProperties {
  return { backgroundColor: `var(--cat-${slug}-surface)` };
}

export function catInk(slug: CategorySlug): CSSProperties {
  return { color: `var(--cat-${slug}-ink)` };
}

/* ------------------------------------------------------------------ */
/* 버튼: 눌림은 press 스프링 scale 0.97                                  */
/* ------------------------------------------------------------------ */

type PressProps = Omit<ComponentProps<typeof m.button>, "className"> & {
  motion: DesignMotionTokens;
  variant: "primary" | "secondary" | "icon" | "ghost";
  className?: string;
};

const VARIANT: Record<PressProps["variant"], string> = {
  primary:
    "h-13 gap-2 rounded-button bg-primary px-6 type-label text-primary-foreground shadow-sm",
  secondary:
    "h-12 gap-2 rounded-button bg-secondary px-5 type-label text-secondary-foreground",
  icon: "size-12 rounded-full bg-secondary text-secondary-foreground",
  ghost:
    "h-11 gap-1.5 rounded-button px-3 type-label text-accent-foreground hover:bg-accent",
};

export function PressButton({
  motion,
  variant,
  className,
  type = "button",
  ...props
}: PressProps) {
  return (
    <m.button
      type={type}
      whileTap={{ scale: 0.97 }}
      transition={springOf(motion, "press")}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center transition-colors duration-(--lm-duration-fast) ease-standard select-none disabled:cursor-default",
        VARIANT[variant],
        focusRing,
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/* 하단 탭 (모바일), 데스크톱 상단 내비                                   */
/* ------------------------------------------------------------------ */

export function TabBar({
  active,
  className,
}: {
  active: DesignTabId;
  className?: string;
}) {
  return (
    <nav
      aria-label={homeCopy.tabBarLabel}
      className={cn(
        "sticky bottom-0 z-20 shrink-0 border-t-[0.5px] border-border bg-background/95 pb-[env(safe-area-inset-bottom,0px)]",
        className,
      )}
    >
      <ul className="mx-auto grid h-(--lm-layout-tab-bar-height) max-w-(--lm-layout-max-width) grid-cols-4">
        {DESIGN_TABS.map(({ id, label, Icon }) => {
          const on = id === active;
          return (
            <li key={id} className="flex">
              <button
                type="button"
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 text-[0.75rem] leading-none font-semibold tracking-[0.005em]",
                  on ? "text-primary" : "text-muted-foreground",
                  focusRing,
                  "focus-visible:-outline-offset-4",
                )}
              >
                <Icon
                  aria-hidden
                  className={cn("size-6", on && "fill-primary/18")}
                  strokeWidth={on ? 2.1 : 1.75}
                />
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function DesktopNav({ active }: { active: DesignTabId }) {
  return (
    <div className="hidden items-center justify-between gap-4 desktop:flex">
      <span className="type-label font-bold tracking-[-0.01em]">
        {copy.brand}
      </span>
      <nav aria-label={homeCopy.tabBarLabel}>
        <ul className="flex gap-1">
          {DESIGN_TABS.map(({ id, label, Icon }) => {
            const on = id === active;
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-button px-3.5 type-label text-[0.875rem]",
                    on
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground",
                    focusRing,
                  )}
                >
                  <Icon aria-hidden className="size-4" strokeWidth={2} />
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 숫자 3개: 도보 분, 가격대, 만족도. 문자 구분자 없이 0.5px 세로선        */
/* ------------------------------------------------------------------ */

function NumberCell({
  value,
  unit,
  label,
  size,
}: {
  value: ReactNode;
  unit?: string;
  label: string;
  size: "lg" | "md";
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 pl-4 first:pl-0">
      <span
        className={cn(
          "flex items-baseline gap-0.5 whitespace-nowrap",
          size === "lg" && "min-h-[1.75rem]",
        )}
      >
        <span
          className={cn(
            size === "lg"
              ? "type-numeric-lg @max-[23rem]/screen:text-2xl"
              : "type-numeric-md",
          )}
        >
          {value}
        </span>
        {unit ? (
          <span className="type-caption text-muted-foreground">{unit}</span>
        ) : null}
      </span>
      <span className="type-caption text-muted-foreground">{label}</span>
    </div>
  );
}

export function NumberRow({
  place,
  size = "lg",
  className,
}: {
  place: MockPlace;
  size?: "lg" | "md";
  className?: string;
}) {
  const price = splitPrice(place.priceKRW);
  const thumbs = splitPercent(place.thumbsUpRate);
  return (
    <div
      className={cn(
        "grid grid-cols-3 divide-x-[0.5px] divide-border [&>*]:pr-2",
        className,
      )}
    >
      <NumberCell
        size={size}
        value={place.walkMinutes}
        unit={copy.numbers.walkUnit}
        label={copy.numbers.walk}
      />
      <NumberCell
        size={size}
        value={price.value}
        unit={price.unit}
        label={copy.numbers.price}
      />
      {thumbs ? (
        <NumberCell
          size={size}
          value={thumbs.value}
          unit={thumbs.unit}
          label={copy.numbers.thumbs}
        />
      ) : (
        <div className="flex min-w-0 flex-col gap-1 pl-4">
          <span
            className={cn(
              "flex items-end pb-0.5 font-semibold whitespace-nowrap text-muted-foreground",
              size === "lg"
                ? "min-h-[1.75rem] type-body-sm"
                : "min-h-[1.35rem] type-caption",
            )}
          >
            {homeCopy.thumbsUpEmpty}
          </span>
          <span className="type-caption text-muted-foreground">
            {copy.numbers.thumbs}
          </span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 배지 (최대 2개)                                                      */
/* ------------------------------------------------------------------ */

const BADGE: Record<StatusBadge, { cls: string; Icon?: LucideIcon }> = {
  deal: { cls: "bg-info-surface text-info-foreground", Icon: Tag },
  waiting: { cls: "bg-warning-surface text-warning-foreground", Icon: Clock },
  estimate: { cls: "bg-card/92 text-muted-foreground" },
  avoidWarning: {
    cls: "bg-warning-surface text-warning-foreground",
    Icon: TriangleAlert,
  },
};

export function Badge({ kind }: { kind: StatusBadge }) {
  const { cls, Icon } = BADGE[kind];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-badge px-2 type-caption whitespace-nowrap shadow-sm",
        cls,
      )}
    >
      {Icon ? <Icon aria-hidden className="size-3.5" strokeWidth={2} /> : null}
      {homeCopy.badges[kind]}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 빈 접시 그림 (빈 상태). 시안 A 일러스트와 같은 역할 색과 형태 도우미      */
/* ------------------------------------------------------------------ */

const PLATE_VARS = {
  "--il-s": "var(--secondary)",
  "--il-i": "var(--muted-foreground)",
} as CSSProperties;

export function EmptyPlateArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={cn(s.root, className)}
      style={PLATE_VARS}
    >
      <rect className={s.bg} width={160} height={100} />
      <path className={s.wash} d={blob(80, 56, 62, 32, 21, 0.07, 12)} />
      <path className={s.drop} d={blob(82, 74, 42, 9, 22)} />
      <path className={s.vessel} d={blob(78, 64, 42, 14, 23, 0.03)} />
      <path className={s.vesselShade} d={blob(78, 63.5, 29, 8.5, 24, 0.04)} />
      <path className={s.hi} d={blob(62, 58, 6, 1.6, 25)} />
      <path className={s.sDeep} strokeWidth={2.2} d={stick(112, 49, 146, 38)} />
      <path
        className={s.sMid}
        strokeWidth={2.2}
        d={stick(115, 53.5, 148, 43.5)}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 상태 그림 영역: 빈 상태는 빈 접시, 오류와 오프라인은 아이콘              */
/* ------------------------------------------------------------------ */

export function StateArt({
  kind,
  className,
}: {
  kind: "empty" | "error" | "offline";
  className?: string;
}) {
  if (kind === "empty") {
    return <EmptyPlateArt className={cn("size-full", className)} />;
  }
  const Icon = kind === "offline" ? CloudOff : RotateCw;
  return (
    <div
      aria-hidden
      className={cn(
        "flex size-full items-center justify-center bg-secondary",
        className,
      )}
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm">
        <Icon className="size-7" strokeWidth={1.75} />
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 지도 면 (데스크톱 오른쪽, 시트 화면 뒤). 실제 지도 없이 토큰 색만         */
/* ------------------------------------------------------------------ */

export type MapPin = {
  id: string;
  name: string;
  /** 지도 면 기준 % 좌표 */
  x: number;
  y: number;
};

export function MapSurface({
  pins,
  selectedId,
  onPinClick,
  pinLabel,
  className,
}: {
  pins: readonly MapPin[];
  selectedId: string | null;
  onPinClick?: (id: string) => void;
  pinLabel?: (pin: MapPin) => string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative min-h-0 flex-1 overflow-hidden bg-muted",
        className,
      )}
    >
      {/* 장식: 길과 공원 */}
      <div aria-hidden className="absolute inset-0">
        <div className="absolute top-[34%] -left-[10%] h-3.5 w-[130%] -rotate-6 bg-background/85" />
        <div className="absolute -top-[10%] left-[58%] h-[130%] w-3 rotate-[8deg] bg-background/85" />
        <div className="absolute top-[72%] -left-[10%] h-2 w-[130%] rotate-[3deg] bg-background/70" />
        <div className="absolute -top-[10%] left-[22%] h-[130%] w-2 -rotate-[4deg] bg-background/70" />
        <div
          className="absolute top-[44%] left-[66%] h-[18%] w-[22%] rounded-[2rem] opacity-80 dark:opacity-45"
          style={catSurface("salad")}
        />
      </div>
      {/* 사무실 표시 */}
      <div
        aria-hidden
        className="absolute top-[56%] left-[46%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
      >
        <span className="size-3 rounded-full bg-foreground ring-[6px] ring-foreground/12" />
        <span className="type-caption text-muted-foreground">
          {copy.map.office}
        </span>
      </div>
      {pins.map((pin) => {
        const on = pin.id === selectedId;
        const body = (
          <>
            <span
              className={cn(
                "inline-flex h-8 items-center rounded-button px-3 type-caption font-semibold whitespace-nowrap",
                on
                  ? "bg-foreground text-background shadow-md"
                  : "bg-card text-foreground shadow-sm",
              )}
            >
              {pin.name}
            </span>
            <span
              aria-hidden
              className={cn(
                "-mt-1 size-2.5 rotate-45 rounded-[2px]",
                on ? "bg-foreground" : "bg-card",
              )}
            />
          </>
        );
        const style = { left: `${pin.x}%`, top: `${pin.y}%` };
        const cls = cn(
          "absolute flex -translate-x-1/2 -translate-y-full flex-col items-center transition-transform duration-(--lm-duration-base) ease-standard",
          on ? "z-10 scale-105" : "z-0",
        );
        return onPinClick ? (
          <button
            key={pin.id}
            type="button"
            style={style}
            aria-pressed={on}
            aria-label={pinLabel ? pinLabel(pin) : pin.name}
            onClick={() => onPinClick(pin.id)}
            className={cn(cls, "cursor-pointer rounded-button", focusRing)}
          >
            {body}
          </button>
        ) : (
          <span key={pin.id} style={style} aria-hidden className={cls}>
            {body}
          </span>
        );
      })}
    </div>
  );
}
