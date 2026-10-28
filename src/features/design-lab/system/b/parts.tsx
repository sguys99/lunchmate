"use client";
// 시안 B "Quiet Stone" 화면 공용 조각 (T1.11~T1.13).
// 원칙: 깊이는 1px 선과 면 톤 한 단계, 올리브 면은 화면당 주 버튼 1개와 1위 득표 바에만.
import * as m from "motion/react-m";
import { CloudOff, WifiOff, type LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { quietStoneScreenCopy as copy } from "@/copy/design-lab-b";
import { homeCopy } from "@/copy/home";
import { IllustrationB } from "@/features/design-lab/illustrations/b";
import type { MockPlace, StatusBadge } from "@/features/design-lab/mock";
import type { CategorySlug } from "@/features/place/categories";
import { formatPriceBand } from "@/lib/format";
import { getKstParts, getMeal } from "@/lib/time";
import { cn } from "@/lib/utils";
import { springOf, usePrefersReducedMotion } from "../motion";
import { ACTIVE_TAB_BY_SCREEN, DESIGN_TABS } from "../tabs";
import type { DesignMotionTokens } from "../types";

/* ---------- 버튼 ---------- */

const focusRing =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export const buttonClass = {
  primary: cn(
    "inline-flex h-12 items-center justify-center gap-2 rounded-button bg-primary px-6 type-label text-primary-foreground transition-[filter] duration-(--lm-duration-fast) ease-standard active:brightness-95",
    focusRing,
  ),
  outline: cn(
    "inline-flex h-12 items-center justify-center gap-2 rounded-button border border-border px-5 type-label text-foreground transition-colors duration-(--lm-duration-fast) ease-standard hover:bg-muted active:bg-muted",
    focusRing,
  ),
  icon: cn(
    "inline-flex size-12 shrink-0 items-center justify-center rounded-button border border-border text-foreground transition-[background-color,opacity] duration-(--lm-duration-fast) ease-standard hover:bg-muted active:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-35",
    focusRing,
  ),
  focusRing,
};

/** 눌림만 반응하는 버튼 (press 스프링, scale 0.98). */
export function PressButton({
  motion,
  className,
  ...props
}: ComponentProps<typeof m.button> & { motion: DesignMotionTokens }) {
  return (
    <m.button
      type="button"
      whileTap={{ scale: 0.98 }}
      transition={springOf(motion, "press")}
      className={className}
      {...props}
    />
  );
}

/* ---------- 날짜 맥락 ---------- */

/** 시연 기준 시각(목업 고정값)의 "10월 28일 수요일 점심" */
export function dateLine(iso: string): string {
  const now = new Date(iso);
  const { month, day, weekday } = getKstParts(now);
  return copy.dateLine(
    month,
    day,
    copy.weekdays[weekday] ?? "",
    copy.meals[getMeal(now)],
  );
}

/* ---------- 카테고리 색 ---------- */

/** Tailwind가 클래스 이름을 찾도록 12종을 그대로 적는다 */
export const CATEGORY_INK: Record<CategorySlug, string> = {
  hansik: "text-cat-hansik-ink",
  jungsik: "text-cat-jungsik-ink",
  ilsik: "text-cat-ilsik-ink",
  yangsik: "text-cat-yangsik-ink",
  bunsik: "text-cat-bunsik-ink",
  gukbap: "text-cat-gukbap-ink",
  gogi: "text-cat-gogi-ink",
  asian: "text-cat-asian-ink",
  fastfood: "text-cat-fastfood-ink",
  salad: "text-cat-salad-ink",
  cafe: "text-cat-cafe-ink",
  pub: "text-cat-pub-ink",
};

/* ---------- 배지 ---------- */

const BADGE_TONE: Record<StatusBadge, string> = {
  estimate: "border-warning text-warning-foreground",
  waiting: "border-warning text-warning-foreground",
  avoidWarning: "border-warning text-warning-foreground",
  deal: "border-info text-info-foreground",
};

export function Badge({
  kind,
  className,
}: {
  kind: StatusBadge;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-badge border px-2 type-caption whitespace-nowrap",
        BADGE_TONE[kind],
        className,
      )}
    >
      {homeCopy.badges[kind]}
    </span>
  );
}

export function Badges({ place }: { place: MockPlace }) {
  if (place.statusBadges.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {place.statusBadges.map((b) => (
        <li key={b}>
          <Badge kind={b} />
        </li>
      ))}
    </ul>
  );
}

/* ---------- 숫자 3개 ---------- */

/** "9천 원대" → ["9천", "원대"], "1.1만 원대" → ["1.1만", "원대"] */
function splitPrice(priceKRW: number): [string, string] {
  const band = formatPriceBand(priceKRW);
  const match = /^([\d.]+[천만])\s*(.*)$/.exec(band);
  return match ? [match[1] ?? band, match[2] ?? ""] : [band, ""];
}

export function NumberRow({
  place,
  size = "lg",
}: {
  place: MockPlace;
  size?: "lg" | "md";
}) {
  const [priceNum, priceUnit] = splitPrice(place.priceKRW);
  const cells: {
    key: string;
    label: string;
    num: string | null;
    unit: string;
  }[] = [
    {
      key: "walk",
      label: copy.numbers.walk,
      num: String(place.walkMinutes),
      unit: copy.numbers.walkUnit,
    },
    { key: "price", label: copy.numbers.price, num: priceNum, unit: priceUnit },
    {
      key: "thumbs",
      label: copy.numbers.thumbs,
      num: place.thumbsUpRate === null ? null : String(place.thumbsUpRate),
      unit: copy.numbers.thumbsUnit,
    },
  ];
  return (
    <dl className="grid grid-cols-[0.8fr_1.3fr_0.9fr] divide-x divide-border">
      {cells.map((c) => (
        <div
          key={c.key}
          className="flex min-w-0 flex-col gap-1.5 px-4 first:pl-0 last:pr-0 @max-[23.75rem]/screen:px-3"
        >
          <dt className="type-caption text-muted-foreground">{c.label}</dt>
          <dd
            className={cn(
              "flex items-baseline gap-0.5 whitespace-nowrap",
              size === "lg" ? "min-h-[1.84rem]" : "min-h-[1.35rem]",
            )}
          >
            {c.num === null ? (
              <span className="self-end type-body-sm leading-[1.2] text-muted-foreground">
                {homeCopy.thumbsUpEmpty}
              </span>
            ) : (
              <>
                <span
                  className={
                    size === "lg" ? "type-numeric-lg" : "type-numeric-md"
                  }
                >
                  {c.num}
                </span>
                <span className="type-body-sm text-muted-foreground">
                  {c.unit}
                </span>
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------- 카드 머리 (카테고리, 식당명, 일러스트) ---------- */

export function PlaceHeading({
  place,
  as: Heading = "h2",
  categoryLabel,
  illustrationClassName,
  title,
  children,
}: {
  place: MockPlace;
  as?: "h2" | "h3";
  /** 식당명 대신 그릴 제목 요소 (시트 제목 등) */
  title?: ReactNode;
  categoryLabel: string;
  illustrationClassName?: string;
  /** 식당명 아래 (배지 등) */
  children?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-2 pt-1">
        <span className={cn("type-caption", CATEGORY_INK[place.category])}>
          {categoryLabel}
        </span>
        {title ?? (
          <Heading className="type-heading text-balance break-keep">
            {place.name}
          </Heading>
        )}
        {children ? <div className="pt-1">{children}</div> : null}
      </div>
      <IllustrationB
        category={place.category}
        className={cn("-mt-2 -mr-2 size-24 shrink-0", illustrationClassName)}
      />
    </div>
  );
}

/* ---------- 스켈레톤 (느린 호흡) ---------- */

/**
 * skeleton 면 위에 skeleton-highlight 막을 1.6초 왕복으로 겹친다(쉬머 대신 호흡).
 * 모든 막대가 같은 박자라 한 개의 효과로 읽힌다. reduced motion이면 정지.
 */
export function SkeletonBlock({ className }: { className?: string }) {
  const reduced = usePrefersReducedMotion();
  return (
    <div
      aria-hidden
      className={cn("relative overflow-hidden bg-skeleton", className)}
    >
      {reduced ? null : (
        <m.div
          className="absolute inset-0 bg-skeleton-highlight"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{
            duration: 3.2,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      )}
    </div>
  );
}

/* ---------- 상태 메시지 (빈, 오류, 오프라인) ---------- */

const STATE_ICON: Record<"error" | "offline", LucideIcon> = {
  error: CloudOff,
  offline: WifiOff,
};

/**
 * 상태 화면. 그림은 일러스트와 같은 서명(옅은 원 + 1.4 선)으로 맞춘다.
 * 빈 상태는 카테고리 선화, 오류와 오프라인은 같은 굵기의 아이콘.
 */
export function StateMessage({
  kind,
  title,
  body,
  action,
  category = "hansik",
  motion,
  headingLevel = "h2",
}: {
  kind: "empty" | "error" | "offline";
  title: string;
  body: string;
  action: string;
  category?: CategorySlug;
  motion: DesignMotionTokens;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <div
      role={kind === "empty" ? undefined : "alert"}
      className="flex flex-col items-start"
    >
      {kind === "empty" ? (
        <IllustrationB category={category} className="-ml-2 size-24" />
      ) : (
        <StateGlyph Icon={STATE_ICON[kind]} />
      )}
      <Heading className="mt-3 type-heading text-balance break-keep">
        {title}
      </Heading>
      <p className="mt-3 type-body-sm text-muted-foreground">{body}</p>
      <PressButton
        motion={motion}
        className={cn(
          "mt-7",
          kind === "empty" ? buttonClass.primary : buttonClass.outline,
        )}
      >
        {action}
      </PressButton>
    </div>
  );
}

function StateGlyph({ Icon }: { Icon: LucideIcon }) {
  return (
    <span aria-hidden className="relative -ml-2 block size-24">
      {/* 일러스트와 같은 자리: 중심 (40, 42), 반지름 25 */}
      <span className="absolute top-[17px] left-[15px] size-[50px] rounded-full bg-muted" />
      <Icon
        className="absolute top-[24px] left-[22px] size-9 text-muted-foreground"
        strokeWidth={1.4}
      />
    </span>
  );
}

/* ---------- 하단 탭 ---------- */

export function TabBarB({ screen }: { screen: "home" | "sheet" }) {
  const active = ACTIVE_TAB_BY_SCREEN[screen];
  return (
    <nav
      aria-label={homeCopy.tabBarLabel}
      className="sticky bottom-0 z-10 shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom,0px)]"
    >
      <ul className="mx-auto grid h-(--lm-layout-tab-bar-height) max-w-(--lm-layout-max-width) grid-cols-4">
        {DESIGN_TABS.map(({ id, label, Icon }) => {
          const isActive = id === active;
          return (
            <li key={id} className="relative flex">
              {isActive ? (
                <span
                  aria-hidden
                  className="absolute top-0 left-1/2 h-0.5 w-5 -translate-x-1/2 bg-primary"
                />
              ) : null}
              <a
                href={`#${id}`}
                aria-current={isActive ? "page" : undefined}
                onClick={(e) => e.preventDefault()}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 type-caption transition-colors duration-(--lm-duration-fast)",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                  focusRing,
                  "focus-visible:-outline-offset-4",
                )}
              >
                <Icon
                  aria-hidden
                  className="size-[1.375rem]"
                  strokeWidth={1.5}
                />
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ---------- 지도 자리 위 핀 ---------- */

/** 지도 자리 위에 놓을 조용한 길과 핀. 위치는 장식용 고정값이다. */
export const PIN_POSITIONS = [
  { left: "42%", top: "38%" },
  { left: "63%", top: "57%" },
  { left: "28%", top: "66%" },
] as const;

export function MapLines() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <span className="absolute top-[30%] -left-1/4 h-px w-[150%] rotate-[-8deg] bg-border" />
      <span className="absolute top-[62%] -left-1/4 h-px w-[150%] rotate-[4deg] bg-border" />
      <span className="absolute top-0 left-[55%] h-full w-px rotate-[10deg] bg-border" />
      <span className="absolute top-0 left-[22%] h-full w-px rotate-[-3deg] bg-border" />
    </div>
  );
}

export function MapPin({
  label,
  active,
  position,
  className,
  ...props
}: {
  label: string;
  active: boolean;
  position: { left: string; top: string };
} & Omit<ComponentProps<"span">, "children">) {
  return (
    <span
      className={cn(
        "absolute flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1.5",
        className,
      )}
      style={position}
      {...props}
    >
      <span
        className={cn(
          "rounded-chip border bg-card px-3 py-1 type-caption whitespace-nowrap transition-colors duration-(--lm-duration-base)",
          active
            ? "border-primary text-foreground"
            : "border-border text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "size-2 rounded-full ring-4 ring-background",
          active ? "bg-primary" : "bg-muted-foreground",
        )}
      />
    </span>
  );
}
