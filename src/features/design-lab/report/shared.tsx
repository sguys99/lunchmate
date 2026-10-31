"use client";
// 제보와 신고 시안 공용 조각 (T6.3). 세 안이 같은 상세 배경(D-10)과 같은 입력 부품을 쓰고, 담는 그릇과 흐름만 다르다.
//
// 배경: D-10 식당 상세를 줄여 그린다(요약 + 가격, 만족도, 후기, 지금 접힘 행 + 하단 고정 줄). 실제 부품
//       (features/place/detail/parts의 Fold, CompactNumbers, PriceScale, TenMeter, 더 보기 메뉴)을 그대로 쓴다.
// 틀: 모바일은 홈 위 상세 시트를 끝까지 연 모양(닫기 줄 + 본문 + 하단 고정 줄 + 하단 탭), 데스크톱은 좌 상세 + 우 지도.
// 입력 부품: 할인 유형 칩, 내용 60자, 종료일 칩, 요일과 시간대 칩, 아직 해요/끝났어요, 웨이팅 3버튼, 사유 라디오, 오류 줄.
// 원칙 6: 할인 블록에는 항상 고지 두 줄(출처, 추천 미반영)을 붙인다.
import {
  Check,
  CircleAlert,
  ExternalLink,
  Flag,
  MoreHorizontal,
  Share2,
  Star,
  Tag,
  ThumbsDown,
  ThumbsUp,
  WifiOff,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MapPane, ShellSplit, TabBarView } from "@/components/app-shell";
import { PlaceBadges } from "@/components/badges/place-badges";
import type { PlaceBadge } from "@/components/badges/pick-badges";
import { LoadingRegion, SkeletonLine } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button-classes";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { focusRing, hitArea44, hitArea48 } from "@/components/ui/interaction";
import { Skeleton } from "@/components/ui/skeleton";
import { badgeCopy } from "@/copy/badges";
import { reportLabCopy as copy } from "@/copy/design-lab-report";
import { placeCopy } from "@/copy/place";
import { MapLines, MapPin } from "@/features/design-lab/system/b/parts";
import { categoryLabel } from "@/features/place/categories";
import { CATEGORY_INK } from "@/features/place/category-ink";
import {
  detailPrice,
  detailThumbs,
  type PlaceDetailStats,
  type PlaceReview,
} from "@/features/place/detail-model";
import { PlaceMoreMenu } from "@/features/place/detail/more-menu";
import {
  CompactNumbers,
  Fold,
  PriceScale,
  TenMeter,
} from "@/features/place/detail/parts";
import { CategoryIllustration } from "@/features/place/illustrations";
import { reasonWithoutWalk } from "@/features/rec/reason";
import { cn } from "@/lib/utils";
import {
  BUDGET_KRW,
  DEAL_TYPES,
  PLACE,
  UNTIL_OPTIONS,
  dateAfter,
  type DealItem,
  type DealType,
} from "./mock";
import type { PlaceReportKind, ReportFlow } from "./params";

export type WaitLevel = "walkIn" | "short" | "long";
export const WAIT_LEVELS: readonly WaitLevel[] = ["walkIn", "short", "long"];

/** 펼쳐 나타나는 조각: base 페이드 + 4px 위로. 축소 모드면 즉시 */
export const enterClass =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:[animation-duration:var(--lm-duration-base)] motion-safe:[animation-timing-function:var(--lm-ease-enter)]";

/* ---------- 버튼 클래스 ---------- */

export const cls = {
  /** 작은 테두리 버튼(높이 40, 터치 48). 웨이팅 3버튼, 아직 해요/끝났어요 */
  pill: cn(
    "inline-flex h-10 items-center justify-center gap-1.5 rounded-chip border border-border px-4 type-label text-foreground transition-[border-color,color,background-color,opacity] duration-(--lm-duration-fast) ease-standard hover:bg-muted active:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-50 motion-reduce:transition-none",
    "aria-pressed:border-primary aria-pressed:text-primary aria-pressed:ring-[0.5px] aria-pressed:ring-primary aria-pressed:ring-inset aria-pressed:hover:bg-transparent",
    hitArea48,
    focusRing,
  ),
  /** 밑줄 글자 버튼 (터치 44) */
  text: cn(
    "relative inline-flex min-h-11 items-center gap-1.5 type-caption text-foreground underline decoration-border decoration-1 underline-offset-[3px] hover:decoration-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50",
    focusRing,
  ),
  icon: cn(buttonClass("secondary", "icon"), "rounded-button"),
  ghostIcon: cn(
    "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
    focusRing,
  ),
};

/* ---------- 틀 ---------- */

/** 상세 배경 틀. footer는 하단 탭 바로 위에 붙고, overlay(시트)는 틀 밖에 그린다 */
export function ReportFrame({
  footer,
  children,
  overlay,
}: {
  footer: ReactNode;
  children: ReactNode;
  overlay?: ReactNode;
}) {
  return (
    <>
      <ShellSplit
        className="min-h-dvh"
        list={
          <main className="flex flex-1 flex-col bg-popover desktop:bg-background">
            <div className="flex h-12 shrink-0 items-center justify-end px-3 desktop:h-16 desktop:px-8">
              <button
                type="button"
                aria-label={copy.frame.close}
                className={cls.ghostIcon}
              >
                <X aria-hidden className="size-5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-10">
              {children}
              <div className="sticky bottom-[calc(var(--lm-layout-tab-bar-height)+env(safe-area-inset-bottom,0px))] z-[5] -mx-(--lm-layout-gutter) mt-auto border-t border-border bg-popover px-(--lm-layout-gutter) py-3 desktop:mx-0 desktop:bg-background desktop:px-0">
                {footer}
              </div>
            </div>
          </main>
        }
        tabBar={<TabBarView activeId="today" preview />}
        map={
          <MapPane>
            <MapLines />
            <MapPin
              label={PLACE.name ?? ""}
              active
              position={{ left: "46%", top: "48%" }}
            />
          </MapPane>
        }
      />
      {overlay}
    </>
  );
}

/* ---------- 상세 배경 ---------- */

function badgesOf(stats: PlaceDetailStats): PlaceBadge[] {
  const list: PlaceBadge[] = [];
  if (stats.waiting) {
    list.push({
      kind: "waiting",
      level: stats.waiting.level,
      minutesAgo: stats.waiting.minutesAgo,
    });
  }
  if (stats.deal) list.push({ kind: "deal" });
  return list;
}

export function DetailHead({ stats }: { stats: PlaceDetailStats }) {
  const price = detailPrice(stats, PLACE.category, "lunch", BUDGET_KRW);
  const thumbs = detailThumbs(stats.thumbs);
  const reason = PLACE.reason ? reasonWithoutWalk(PLACE.reason) : null;
  return (
    <div className="flex flex-col">
      <header className="flex items-center gap-3">
        <CategoryIllustration
          slug={PLACE.category}
          size={56}
          className="-ml-1 shrink-0"
        />
        <div className="flex min-w-0 flex-col">
          <span className={cn("type-caption", CATEGORY_INK[PLACE.category])}>
            {categoryLabel(PLACE.category)}
          </span>
          <h1 className="type-title text-balance break-keep">{PLACE.name}</h1>
        </div>
      </header>
      {reason ? (
        <p className="mt-4 type-body-sm break-keep text-muted-foreground">
          {reason}
        </p>
      ) : null}
      <CompactNumbers
        walkMinutes={PLACE.walkMinutes}
        price={price}
        thumbs={thumbs}
        className="mt-5"
      />
      <PlaceBadges badges={badgesOf(stats)} className="mt-4" />
    </div>
  );
}

/**
 * 접힘 행 넷: 가격, 만족도, 후기, 지금. 흐름이 바뀌면 key로 다시 마운트해 기본 펼침을 바꾼다.
 * 행 내용은 relative로 감싼다: sr-only(position absolute)의 기준 상자가 접힘 칸(overflow hidden) 밖이면
 * 접힌 상태에서도 문서 높이를 늘린다(T6.3에서 발견. 실제 Fold 내용에도 sr-only가 있으면 같은 일이 생긴다).
 */
export function DetailFolds({
  stats,
  open,
  reviews,
  now,
  nowSummary,
  after,
}: {
  stats: PlaceDetailStats;
  open: "thumbs" | "reviews" | "now";
  reviews: ReactNode;
  now: ReactNode;
  nowSummary: string;
  /** 접힘 행 아래 본문 끝(B의 "정보가 다른가요?") */
  after?: ReactNode;
}) {
  const price = detailPrice(stats, PLACE.category, "lunch", BUDGET_KRW);
  const thumbs = detailThumbs(stats.thumbs);
  const catLabel = categoryLabel(PLACE.category);
  return (
    <div className="mt-6 flex flex-col border-t border-border pb-6">
      <h2 className="sr-only">{copy.frame.foldsHeading}</h2>
      <Fold
        title={copy.frame.priceTitle}
        summary={copy.frame.priceMedian(price.reportCount)}
      >
        {(o) => (
          <PriceScale
            price={price}
            budgetKRW={BUDGET_KRW}
            meal="lunch"
            categoryLabel={catLabel}
            active={o}
          />
        )}
      </Fold>
      <Fold
        title={copy.frame.thumbsTitle}
        summary={placeCopy.thumbs.reviewsOf(thumbs.total)}
        defaultOpen={open === "thumbs"}
      >
        {(o) => <TenMeter thumbs={thumbs} active={o} />}
      </Fold>
      <Fold
        title={copy.frame.reviewsTitle}
        summary={copy.frame.reviewsCount(stats.reviewTotal)}
        defaultOpen={open === "reviews"}
      >
        {() => <div className="relative">{reviews}</div>}
      </Fold>
      <Fold
        title={copy.frame.nowTitle}
        summary={nowSummary}
        defaultOpen={open === "now"}
      >
        {() => <div className="relative">{now}</div>}
      </Fold>
      {after}
    </div>
  );
}

export function nowSummaryOf(
  waiting: { level: WaitLevel; minutesAgo: number } | null,
  justNow: WaitLevel | null,
  deals: number,
): string {
  if (justNow) return copy.wait.justNow(badgeCopy.waitingLevels[justNow]);
  if (waiting)
    return badgeCopy.waitingReport(
      waiting.minutesAgo,
      badgeCopy.waitingLevels[waiting.level],
    );
  if (deals > 0) return copy.frame.nowSummaryDeals(deals);
  return placeCopy.now.waitingNone;
}

/* ---------- 후기 ---------- */

export function ReviewByline({ review }: { review: PlaceReview }) {
  const Thumb = review.thumb === "up" ? ThumbsUp : ThumbsDown;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <span
        aria-hidden
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted type-caption text-muted-foreground"
      >
        {review.nickname.slice(0, 1)}
      </span>
      <span className="min-w-0 truncate type-label">{review.nickname}</span>
      <span className="shrink-0 type-caption text-muted-foreground">
        {placeCopy.reviews.visitMonth(review.visitMonth)}
      </span>
      <span className="inline-flex shrink-0 items-center text-muted-foreground">
        <Thumb aria-hidden className="size-4" strokeWidth={1.5} />
        <span className="sr-only">
          {review.thumb === "up"
            ? placeCopy.reviews.thumbUp
            : placeCopy.reviews.thumbDown}
        </span>
      </span>
    </div>
  );
}

/** 후기 머리줄 오른쪽 신고 버튼 (D-10 안건 11 기본안: 작은 더 보기, 이름 "후기 신고") */
export function ReviewReportButton({
  review,
  onClick,
  expanded,
  controls,
  disabled,
}: {
  review: PlaceReview;
  onClick: () => void;
  expanded?: boolean;
  controls?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={copy.reportReview.reviewMenu(review.nickname)}
      aria-expanded={expanded}
      aria-controls={controls}
      aria-disabled={disabled || undefined}
      onClick={onClick}
      className={cn(
        cls.ghostIcon,
        "-mr-2.5 size-10 aria-disabled:opacity-50",
        hitArea44,
      )}
    >
      <MoreHorizontal aria-hidden className="size-4" strokeWidth={1.5} />
    </button>
  );
}

/** 후기 목록. 각 후기 아래 slot(B는 그 자리에서 신고 사유를 펼친다) */
export function ReviewList({
  reviews,
  renderMenu,
  renderBelow,
  renderBody,
}: {
  reviews: readonly PlaceReview[];
  renderMenu: (r: PlaceReview) => ReactNode;
  renderBelow?: (r: PlaceReview) => ReactNode;
  /** 본문 대신 그릴 것(신고 뒤 가림) */
  renderBody?: (r: PlaceReview) => ReactNode;
}) {
  return (
    <ul className="flex flex-col gap-5">
      {reviews.map((r) => (
        <li key={r.id} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1">
            <ReviewByline review={r} />
            {renderMenu(r)}
          </div>
          {renderBody?.(r) ?? (
            <p className="line-clamp-2 type-body-sm break-keep">{r.text}</p>
          )}
          {renderBelow?.(r)}
        </li>
      ))}
    </ul>
  );
}

export function HiddenReview({ onShow }: { onShow?: () => void }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 type-caption text-muted-foreground">
      {copy.reportReview.hiddenForMe}
      {onShow ? (
        <button type="button" onClick={onShow} className={cls.text}>
          {copy.reportReview.show}
        </button>
      ) : null}
    </p>
  );
}

/* ---------- 할인 표시 (DEAL-02) ---------- */

/** 출처 배지. 지금은 "제보" 하나, 사장님 등록(DEAL-07)은 2단계 */
export function SourceBadge() {
  return (
    <Badge variant="neutral">
      <Tag aria-hidden strokeWidth={1.75} />
      <span aria-hidden>{copy.deal.sourceBadge}</span>
      <span className="sr-only">{copy.deal.sourceBadgeSr}</span>
    </Badge>
  );
}

export function DealRow({
  deal,
  children,
  highlight,
  dim,
  menu,
  className,
}: {
  deal: DealItem;
  /** 확인 버튼이나 결과 줄 */
  children?: ReactNode;
  /** 중복 병합 대상(B) */
  highlight?: boolean;
  /** 끝났어요를 누른 뒤 */
  dim?: boolean;
  /** 오른쪽 위 더 보기(신고) */
  menu?: ReactNode;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "flex flex-col gap-2 border-b border-border py-4 transition-[background-color,box-shadow] duration-(--lm-duration-base) ease-standard last:border-b-0 motion-reduce:transition-none",
        highlight &&
          "-mx-3 rounded-lg border-transparent bg-accent px-3 ring-1 ring-primary",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="type-caption text-muted-foreground">
              {copy.deal.types[deal.type]}
            </span>
            <SourceBadge />
          </div>
          <p
            className={cn(
              "type-body-sm break-keep",
              dim && "text-muted-foreground",
            )}
          >
            {deal.text}
          </p>
          <p className="type-caption text-muted-foreground tabular-nums">
            {copy.deal.meta(deal.reported, deal.until)}
            {deal.when ? (
              <span className="ml-2 border-l border-border pl-2">
                {deal.when}
              </span>
            ) : null}
          </p>
        </div>
        {menu}
      </div>
      {children}
    </li>
  );
}

/** 할인 고지 두 줄 (DEAL-02, D-10 안건 12, 원칙 6) */
export function DealNotice({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <p className="type-caption break-keep text-muted-foreground">
        {copy.deal.notice}
      </p>
      <p className="type-caption break-keep text-muted-foreground">
        {copy.deal.noScore}
      </p>
    </div>
  );
}

/** 할인 하나에 붙는 신고 버튼 (DEAL-04 "광고성, 허위") */
export function DealReportButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={copy.check.reportDeal}
      aria-disabled={disabled || undefined}
      onClick={onClick}
      className={cn(
        cls.ghostIcon,
        "-mt-1 -mr-2.5 size-10 aria-disabled:opacity-50",
        hitArea44,
      )}
    >
      <Flag aria-hidden className="size-4" strokeWidth={1.5} />
    </button>
  );
}

export type CheckValue = "still" | "ended" | null;

/** 아직 해요 / 끝났어요 한 탭 (DEAL-03). 누른 쪽은 aria-pressed */
export function CheckPair({
  value,
  onPick,
  disabled,
  label,
}: {
  value: CheckValue;
  onPick: (v: Exclude<CheckValue, null>) => void;
  disabled?: boolean;
  /** 그룹 이름(할인 내용) */
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {(["still", "ended"] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          aria-disabled={disabled || undefined}
          onClick={() => onPick(v)}
          className={cn(cls.pill, "h-9 px-3.5")}
        >
          {value === v ? (
            <Check aria-hidden className="size-4" strokeWidth={1.75} />
          ) : null}
          {v === "still" ? copy.check.still : copy.check.ended}
        </button>
      ))}
    </div>
  );
}

/* ---------- 웨이팅 (PLACE-07) ---------- */

export function WaitButtons({
  selected,
  disabled,
  onPick,
  hideOthers,
}: {
  selected: WaitLevel | null;
  disabled?: boolean;
  onPick: (level: WaitLevel) => void;
  /** 고른 것만 남기고 나머지를 접는다(B) */
  hideOthers?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={copy.wait.group}
      className="flex flex-wrap gap-2"
    >
      {WAIT_LEVELS.map((level) => {
        const on = selected === level;
        if (hideOthers && selected && !on) return null;
        return (
          <button
            key={level}
            type="button"
            aria-pressed={on}
            aria-disabled={disabled || undefined}
            onClick={() => onPick(level)}
            className={cn(
              cls.pill,
              // 쿨다운 중에도 내가 고른 칸은 또렷하게 둔다
              on && disabled && "aria-disabled:opacity-100",
            )}
          >
            {on ? (
              <Check aria-hidden className="size-4" strokeWidth={1.75} />
            ) : null}
            {badgeCopy.waitingLevels[level]}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- 입력 부품 ---------- */

export function FieldLabel({
  id,
  children,
  optional,
  className,
}: {
  id: string;
  children: ReactNode;
  optional?: boolean;
  className?: string;
}) {
  return (
    <p id={id} className={cn("flex items-baseline gap-2 type-label", className)}>
      {children}
      {optional ? (
        <span className="type-caption text-muted-foreground">
          {copy.deal.whenOptional}
        </span>
      ) : null}
    </p>
  );
}

export function DealTypeChips({
  value,
  onChange,
  disabled,
  labelId,
}: {
  value: DealType | null;
  onChange: (t: DealType) => void;
  disabled?: boolean;
  labelId: string;
}) {
  return (
    <ChipGroup
      aria-labelledby={labelId}
      value={value ? [value] : []}
      disabled={disabled}
      onValueChange={(v) => {
        const next = v[0] as DealType | undefined;
        if (next) onChange(next);
      }}
    >
      {DEAL_TYPES.map((t) => (
        <Chip key={t} value={t}>
          {copy.deal.types[t]}
        </Chip>
      ))}
    </ChipGroup>
  );
}

/** 내용 60자. 글자 수와 금칙어 오류를 함께 읽힌다 */
export function DealTextField({
  type,
  value,
  onChange,
  invalid,
  disabled,
  labelId,
  autoFocus,
}: {
  type: DealType | null;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  labelId: string;
  autoFocus?: boolean;
}) {
  const countId = useId();
  const errId = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Input
        aria-labelledby={labelId}
        aria-describedby={cn(countId, invalid && errId)}
        aria-invalid={invalid || undefined}
        maxLength={60}
        value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={
          type ? copy.deal.placeholders[type] : copy.deal.placeholders.lunchSpecial
        }
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="flex items-start gap-3">
        {invalid ? (
          <p
            id={errId}
            role="alert"
            className="flex min-w-0 flex-1 items-start gap-1.5 type-caption break-keep text-destructive"
          >
            <CircleAlert
              aria-hidden
              className="mt-0.5 size-3.5 shrink-0"
              strokeWidth={1.75}
            />
            {copy.errors.bannedWord}
          </p>
        ) : (
          <span className="flex-1" />
        )}
        <p
          id={countId}
          className="shrink-0 type-caption text-muted-foreground tabular-nums"
        >
          <span aria-hidden>{copy.deal.textCount(value.length)}</span>
          <span className="sr-only">{copy.deal.textCountSr(value.length)}</span>
        </p>
      </div>
    </div>
  );
}

export function UntilChips({
  value,
  onChange,
  labelId,
  disabled,
}: {
  value: number;
  onChange: (days: number) => void;
  labelId: string;
  disabled?: boolean;
}) {
  return (
    <ChipGroup
      aria-labelledby={labelId}
      value={[String(value)]}
      disabled={disabled}
      onValueChange={(v) => {
        const next = Number(v[0]);
        if (Number.isFinite(next) && next > 0) onChange(next);
      }}
    >
      {UNTIL_OPTIONS.map((o) => (
        <Chip key={o.days} value={String(o.days)}>
          {o.label}
        </Chip>
      ))}
    </ChipGroup>
  );
}

export type WhenValue = { days: string[]; slots: string[] };

export function whenLabel(w: WhenValue): string {
  const weekdays = ["월", "화", "수", "목", "금"];
  const isWeekdays =
    w.days.length === 5 && weekdays.every((d) => w.days.includes(d));
  const day = isWeekdays
    ? copy.deal.weekdays
    : copy.deal.days.filter((d) => w.days.includes(d)).join(", ");
  const slot = (["lunch", "afternoon", "dinner"] as const)
    .filter((s) => w.slots.includes(s))
    .map((s) => copy.deal.slots[s])
    .join(", ");
  const parts = [day, slot].filter(Boolean);
  return parts.length ? parts.join(" ") : copy.deal.whenAny;
}

/** 요일과 시간대 (선택). 시간은 직접 시각 대신 3구간 칩 */
export function WhenFields({
  value,
  onChange,
  disabled,
}: {
  value: WhenValue;
  onChange: (v: WhenValue) => void;
  disabled?: boolean;
}) {
  const daysId = useId();
  const slotsId = useId();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <FieldLabel id={daysId} className="type-caption text-muted-foreground">
          {copy.deal.daysLabel}
        </FieldLabel>
        <ChipGroup
          multiple
          aria-labelledby={daysId}
          value={value.days}
          disabled={disabled}
          onValueChange={(v) => onChange({ ...value, days: v as string[] })}
          className="gap-1"
        >
          {copy.deal.days.map((d) => (
            <Chip key={d} value={d} className="w-11 px-0">
              {d}
            </Chip>
          ))}
        </ChipGroup>
      </div>
      <div className="flex flex-col gap-2">
        <FieldLabel id={slotsId} className="type-caption text-muted-foreground">
          {copy.deal.slotsLabel}
        </FieldLabel>
        <ChipGroup
          multiple
          aria-labelledby={slotsId}
          value={value.slots}
          disabled={disabled}
          onValueChange={(v) => onChange({ ...value, slots: v as string[] })}
        >
          {(["lunch", "afternoon", "dinner"] as const).map((s) => (
            <Chip key={s} value={s}>
              {copy.deal.slots[s]}
              <span className="type-caption text-muted-foreground">
                {copy.deal.slotHints[s]}
              </span>
            </Chip>
          ))}
        </ChipGroup>
      </div>
    </div>
  );
}

export function untilText(days: number): string {
  return dateAfter(days);
}

/* ---------- 사유 라디오 (MOD-01, DEAL-04, PLACE-05) ---------- */

export type ReasonKey = keyof typeof copy.reportReview.reasons;

export function reviewReasons(target: "review" | "deal"): ReasonKey[] {
  return target === "deal"
    ? ["adFalse", "abuse", "privacy", "etc"]
    : ["adSpam", "abuse", "privacy", "false", "etc"];
}

/** 세로 라디오 행. 행 전체가 터치 영역(48) */
export function RadioRows<K extends string>({
  name,
  legend,
  legendClassName,
  options,
  value,
  onChange,
  disabled,
  below,
}: {
  name: string;
  legend: string;
  legendClassName?: string;
  options: readonly { key: K; label: string; hint?: string }[];
  value: K | null;
  onChange: (k: K) => void;
  disabled?: boolean;
  /** 고른 행 아래에 펼칠 내용 */
  below?: (k: K) => ReactNode;
}) {
  return (
    <fieldset disabled={disabled} className="flex flex-col">
      <legend className={cn("mb-2 type-label", legendClassName)}>{legend}</legend>
      <div className="flex flex-col border-t border-border">
        {options.map((o) => {
          const on = value === o.key;
          return (
            <div key={o.key} className="border-b border-border">
              <label
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-3 py-2.5 has-disabled:cursor-default has-disabled:opacity-50",
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={o.key}
                  checked={on}
                  onChange={() => onChange(o.key)}
                  className={cn(
                    "peer size-5 shrink-0 appearance-none rounded-full border border-input bg-card transition-[border-width,border-color] duration-(--lm-duration-fast) ease-standard checked:border-[6px] checked:border-primary motion-reduce:transition-none",
                    focusRing,
                  )}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="type-body-sm">{o.label}</span>
                  {o.hint ? (
                    <span className="type-caption break-keep text-muted-foreground">
                      {o.hint}
                    </span>
                  ) : null}
                </span>
              </label>
              {on && below ? <div className="pb-4 pl-8">{below(o.key)}</div> : null}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

export function reasonOptions(target: "review" | "deal") {
  return reviewReasons(target).map((key) => ({
    key,
    label: copy.reportReview.reasons[key],
    hint: copy.reportReview.reasonHints[key],
  }));
}

/** 기타 사유 자세히 (선택, 100자) */
export function EtcField({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  const labelId = useId();
  const errId = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label id={labelId} className="type-caption text-muted-foreground">
        {copy.reportReview.etcLabel}
      </label>
      <Input
        aria-labelledby={labelId}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errId : undefined}
        maxLength={100}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {invalid ? (
        <p id={errId} role="alert" className="type-caption text-destructive">
          {copy.errors.bannedWord}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- 식당 정보 제보 상세 (PLACE-05, 모두 선택) ---------- */

export const PLACE_KINDS: readonly PlaceReportKind[] = [
  "closed",
  "price",
  "wrong",
];

export function placeKindLabel(k: PlaceReportKind): string {
  return k === "closed"
    ? placeCopy.actions.reportClosed
    : k === "price"
      ? placeCopy.actions.reportPrice
      : placeCopy.actions.reportWrong;
}

export function PlaceKindDetail({
  kind,
  value,
  onChange,
  hideLabel,
}: {
  kind: PlaceReportKind;
  value: string[];
  onChange: (v: string[]) => void;
  /** 질문이 이미 제목이면(C) 라벨을 스크린 리더에만 */
  hideLabel?: boolean;
}) {
  const id = useId();
  if (kind === "price") {
    return (
      <div className="flex flex-col gap-2">
        <FieldLabel id={id} optional className="type-caption">
          {copy.place.priceLabel}
        </FieldLabel>
        <div className="flex items-center gap-2">
          <Input
            aria-labelledby={id}
            inputMode="numeric"
            placeholder={copy.place.pricePlaceholder}
            value={value[0] ?? ""}
            onChange={(e) => onChange([e.target.value.replace(/[^0-9]/g, "")])}
            className="max-w-40 tabular-nums"
          />
          <span className="type-body-sm text-muted-foreground">
            {copy.place.priceUnit}
          </span>
        </div>
      </div>
    );
  }
  const options =
    kind === "closed"
      ? (Object.keys(copy.place.closedOptions) as (keyof typeof copy.place.closedOptions)[]).map(
          (k) => ({ k, label: copy.place.closedOptions[k] }),
        )
      : (Object.keys(copy.place.wrongOptions) as (keyof typeof copy.place.wrongOptions)[]).map(
          (k) => ({ k, label: copy.place.wrongOptions[k] }),
        );
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel
        id={id}
        optional
        className={hideLabel ? "sr-only" : "type-caption"}
      >
        {copy.place.qDetail[kind]}
      </FieldLabel>
      <ChipGroup
        multiple={kind === "wrong"}
        aria-labelledby={id}
        value={value}
        onValueChange={(v) => onChange(v as string[])}
      >
        {options.map((o) => (
          <Chip key={o.k} value={o.k}>
            {o.label}
          </Chip>
        ))}
      </ChipGroup>
      {kind === "closed" ? (
        <p className="type-caption break-keep text-muted-foreground">
          {copy.place.closedNote}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- 상태 줄 ---------- */

/** 보내기 실패 (state=error). 버튼 위에 둔다 */
export function SendFailed({ className }: { className?: string }) {
  return (
    <div
      role="alert"
      className={cn("flex items-start gap-2.5 text-destructive", className)}
    >
      <CircleAlert
        aria-hidden
        className="mt-0.5 size-4 shrink-0"
        strokeWidth={1.75}
      />
      <p className="type-body-sm break-keep">
        {copy.errors.sendFailed}
        <span className="block type-caption text-muted-foreground">
          {copy.errors.sendFailedBody}
        </span>
      </p>
    </div>
  );
}

export function OfflineLine({ className }: { className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 border-y border-border py-3",
        className,
      )}
    >
      <WifiOff
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.5}
      />
      <p className="type-body-sm break-keep">
        {copy.errors.offlineTitle}
        <span className="block type-caption text-muted-foreground">
          {copy.errors.offlineBody}
        </span>
      </p>
    </div>
  );
}

type HeadingLevel = "h2" | "h3" | "h4" | "h5";

/** 하루 한도 (MOD-05, DEAL-04). 폼 대신 보인다 */
export function LimitBlock({
  kind,
  headingLevel = "h2",
  className,
}: {
  kind: "deal" | "report";
  headingLevel?: HeadingLevel;
  className?: string;
}) {
  const H = headingLevel;
  return (
    <section
      role="alert"
      className={cn("flex flex-col gap-2", className)}
    >
      <H className="type-heading break-keep">
        {kind === "deal"
          ? copy.errors.limitDealTitle
          : copy.errors.limitReportTitle}
      </H>
      <p className="type-body-sm break-keep text-muted-foreground">
        {kind === "deal" ? copy.errors.limitDealBody : copy.errors.limitReportBody}
      </p>
    </section>
  );
}

/** 완료 표시(체크 원 + 제목 + 설명). C의 마지막 단계, B의 펼침 자리 */
export function DoneMark({
  title,
  body,
  headingLevel = "h2",
}: {
  title: string;
  body: string;
  headingLevel?: HeadingLevel;
}) {
  const H = headingLevel;
  return (
    <div role="status" className="flex items-start gap-3">
      <span
        aria-hidden
        className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-primary text-primary motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-75 motion-safe:[animation-duration:var(--lm-duration-base)] motion-safe:[animation-timing-function:var(--lm-ease-enter)]"
      >
        <Check className="size-4" strokeWidth={1.75} />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <H className="type-label">{title}</H>
        <p className="type-caption break-keep text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

/* ---------- 하단 고정 줄 ---------- */

/** 쉬는 상태의 하단 줄: 길찾기 + 즐겨찾기 + 더 보기(제보 묶음에 할인 알리기 추가) */
export function RestFooter({
  onFlow,
  offline,
  menuOpen,
}: {
  onFlow: (flow: ReportFlow, kind?: PlaceReportKind) => void;
  offline?: boolean;
  menuOpen?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        className={cn(buttonClass("primary"), "min-w-0 flex-1")}
      >
        {copy.frame.directions}
      </button>
      <button
        type="button"
        aria-pressed={false}
        aria-label={copy.frame.favorite}
        className={cls.icon}
      >
        <Star aria-hidden className="size-5" strokeWidth={1.5} />
      </button>
      <PlaceMoreMenu
        defaultOpen={menuOpen}
        triggerClassName={cls.icon}
        actions={[
          {
            key: "share",
            label: placeCopy.actions.share,
            icon: Share2,
            onSelect: () => undefined,
          },
          {
            key: "naver",
            label: placeCopy.actions.naver,
            icon: ExternalLink,
            href: "https://map.naver.com/",
            external: true,
          },
        ]}
        reports={[
          {
            key: "deal",
            label: copy.menu.dealEntry,
            icon: Tag,
            onSelect: () => onFlow("deal"),
            disabled: offline,
          },
          ...PLACE_KINDS.map((k) => ({
            key: k,
            label: placeKindLabel(k),
            icon: Flag,
            onSelect: () => onFlow("place", k),
            disabled: offline,
          })),
        ]}
      />
    </div>
  );
}

/* ---------- 로딩 ---------- */

export function DetailSkeleton() {
  return (
    <LoadingRegion label={copy.frame.loading} className="flex flex-col pb-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col">
          <SkeletonLine type="caption" className="w-10" />
          <SkeletonLine type="title" className="w-40" />
        </div>
      </div>
      <SkeletonLine type="body" className="mt-4 w-56" />
      <div className="mt-6 flex flex-col border-t border-border">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex h-14 items-center justify-between border-b border-border"
          >
            <SkeletonLine type="label" className="w-12" />
            <SkeletonLine type="caption" className="w-24" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

/** 입력 자리 스켈레톤 (한도와 중복 확인을 불러오는 동안) */
export function FormSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <LoadingRegion label={copy.errors.loading} className="flex flex-col gap-5">
      <SkeletonLine type="title" className="w-44" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <SkeletonLine type="label" className="w-14" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20 rounded-chip" />
            <Skeleton className="h-10 w-16 rounded-chip" />
            <Skeleton className="h-10 w-24 rounded-chip" />
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}

/** 할인 목록 스켈레톤 */
export function DealListSkeleton() {
  return (
    <LoadingRegion label={copy.frame.loading} className="flex flex-col gap-4">
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <SkeletonLine type="caption" className="w-16" />
          <SkeletonLine type="body" className="w-52" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-chip" />
            <Skeleton className="h-9 w-20 rounded-chip" />
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}

/* ---------- 흐름 자리로 스크롤 ---------- */

/**
 * 쿼리로 연 흐름의 자리(웨이팅 줄, 할인 목록)를 처음 한 번 화면 위쪽으로 가져온다.
 * scrollIntoView 대신 창만 스크롤한다(접힘 칸의 overflow hidden까지 밀지 않게).
 */
export function useScrollOnMount<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 24;
    window.scrollTo({ top, behavior: "auto" });
  }, [enabled]);
  return ref;
}

/* ---------- 할인 폼 상태 ---------- */

export type DealForm = {
  type: DealType | null;
  text: string;
  untilDays: number;
  when: WhenValue;
};

export const EMPTY_WHEN: WhenValue = { days: [], slots: [] };

export function useDealForm(initial: DealForm) {
  const [form, setForm] = useState<DealForm>(initial);
  return {
    form,
    set: <K extends keyof DealForm>(key: K, v: DealForm[K]) =>
      setForm((f) => ({ ...f, [key]: v })),
  };
}
