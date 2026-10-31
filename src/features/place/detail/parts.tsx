"use client";
// 식당 상세 본문 조각 (T5.33, T5.34, D-10 C 결정 집중형 + A 가격 점 분포와 예산 선 + B 이유 한 줄).
// 접힘 행(Fold), 숫자 3칸, 가격 눈금, 10칸 미터, 태그, 후기, 지금, 정보. 컨테이너(시트, 지도 시트)와 무관하다.
// 모션: 접힘 높이 base(grid-rows), 미터와 점은 행을 펼칠 때 CSS 전환. 축소 모드면 motion-reduce로 즉시.
import {
  ChevronDown,
  CircleAlert,
  CircleCheck,
  ExternalLink,
  Phone,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { EstimateMark } from "@/components/badges/estimate-mark";
import { focusRing, hitArea48 } from "@/components/ui/interaction";
import { badgeCopy } from "@/copy/badges";
import { placeCopy } from "@/copy/place";
import { formatShortWon, formatWon, priceBandParts } from "@/lib/format";
import type { Meal } from "@/lib/time";
import { cn } from "@/lib/utils";
import {
  priceScale,
  type DetailPrice,
  type DetailThumbs,
  type PlaceDetailStats,
  type PlaceReview,
} from "../detail-model";

const copy = placeCopy;

/** 밑줄 글자 버튼, 링크 (터치 44) */
export const textAction = cn(
  "relative inline-flex min-h-11 items-center gap-1.5 type-caption text-foreground underline decoration-border decoration-1 underline-offset-[3px] hover:decoration-foreground",
  focusRing,
);

/* ---------- 접힘 행 ---------- */

export function Fold({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary: ReactNode;
  defaultOpen?: boolean;
  children: (open: boolean) => ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="border-b border-border">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex min-h-14 w-full items-center gap-3 py-2 text-left",
            focusRing,
          )}
        >
          <span className="w-16 shrink-0 type-label">{title}</span>
          <span className="min-w-0 flex-1 truncate text-right type-caption text-muted-foreground tabular-nums">
            {summary}
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
              open && "rotate-180",
            )}
            strokeWidth={1.5}
          />
        </button>
      </h3>
      <div
        id={id}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows] duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pt-1 pb-5">{children(open)}</div>
        </div>
      </div>
    </section>
  );
}

/** 행이 열린 다음 프레임에 true. 막대, 점 전환을 0에서 시작하게 한다 */
function useShown(active: boolean): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!active) return;
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [active]);
  return active && shown;
}

/* ---------- 숫자 3칸 + 예산 판정 ---------- */

export function CompactNumbers({
  walkMinutes,
  price,
  thumbs,
  className,
}: {
  walkMinutes: number | null;
  price: DetailPrice;
  thumbs: DetailThumbs;
  className?: string;
}) {
  const band = priceBandParts(price.value);
  return (
    <dl
      className={cn(
        "grid grid-cols-[0.8fr_1.3fr_0.9fr] divide-x divide-border",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1.5 pr-4">
        <dt className="type-caption text-muted-foreground">
          {copy.numbers.walk}
        </dt>
        <dd className="flex min-h-[1.35rem] items-end gap-0.5 whitespace-nowrap">
          {walkMinutes === null ? (
            <span className="type-caption text-muted-foreground">
              {copy.numbers.walkUnknown}
            </span>
          ) : (
            <>
              <span className="type-numeric-md">{walkMinutes}</span>
              <span className="type-caption text-muted-foreground">
                {copy.numbers.walkUnit}
              </span>
            </>
          )}
        </dd>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5 px-4 max-[23.75rem]:px-3">
        <dt className="flex items-baseline gap-1.5 type-caption text-muted-foreground">
          {copy.numbers.price}
          {price.estimate ? <EstimateMark /> : null}
        </dt>
        <dd className="flex min-h-[1.35rem] flex-wrap items-baseline gap-x-2 whitespace-nowrap">
          <span className="inline-flex items-baseline gap-0.5">
            <span className="type-numeric-md">{band.amount}</span>
            <span className="type-caption text-muted-foreground">
              {band.unit}
            </span>
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 type-caption",
              price.withinBudget ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {price.withinBudget ? (
              <CircleCheck
                aria-hidden
                className="size-3.5 text-success"
                strokeWidth={1.75}
              />
            ) : (
              <CircleAlert
                aria-hidden
                className="size-3.5"
                strokeWidth={1.75}
              />
            )}
            {price.withinBudget
              ? copy.numbers.inBudget
              : copy.numbers.overBudget}
          </span>
        </dd>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5 pl-4">
        <dt className="type-caption text-muted-foreground">
          {copy.numbers.thumbs}
        </dt>
        <dd className="flex min-h-[1.35rem] items-end gap-0.5 whitespace-nowrap">
          {thumbs.percent === null ? (
            <span className="type-caption text-muted-foreground">
              {copy.numbers.thumbsEmpty}
            </span>
          ) : (
            <>
              <span className="type-numeric-md">{thumbs.percent}</span>
              <span className="type-caption text-muted-foreground">
                {copy.numbers.thumbsUnit}
              </span>
            </>
          )}
        </dd>
      </div>
    </dl>
  );
}

/* ---------- 가격: 제보 점 분포 + 범위 + 예산 선 ---------- */

/** 같은 값(500원 단위)이 여러 번이면 위로 쌓는다. 쌓는 높이는 4단까지 */
function stackDots(values: readonly number[]) {
  const seen = new Map<number, number>();
  return values.map((v) => {
    const key = Math.round(v / 500) * 500;
    const stack = seen.get(key) ?? 0;
    seen.set(key, stack + 1);
    return { v, stack: Math.min(stack, 3) };
  });
}

export function PriceScale({
  price,
  budgetKRW,
  meal,
  categoryLabel,
  active,
}: {
  price: DetailPrice;
  budgetKRW: number;
  meal: Meal;
  categoryLabel: string;
  active: boolean;
}) {
  const shown = useShown(active);
  const scale = priceScale(price, budgetKRW);
  const span = Math.max(1, scale.max - scale.min);
  const pct = (v: number) =>
    Math.min(100, Math.max(0, ((v - scale.min) / span) * 100));
  const budgetPct = pct(budgetKRW);
  const valuePct = pct(price.value);
  const range = price.range;
  const dots = stackDots(price.reports);
  const budgetLabel = copy.price.budget(meal, formatShortWon(budgetKRW));

  return (
    <div className="flex flex-col gap-3">
      <div
        role="img"
        aria-label={copy.price.scaleLabel(
          price.reportCount,
          formatWon(price.value),
          formatShortWon(budgetKRW),
        )}
        className="relative mx-1.5 mt-7 h-14"
      >
        {/* 내 예산 선과 라벨 */}
        <span
          aria-hidden
          className={cn(
            "absolute -top-6 bottom-0 flex flex-col",
            budgetPct < 15 || budgetPct > 85 ? "" : "-translate-x-1/2",
            budgetPct < 15
              ? "items-start"
              : budgetPct > 85
                ? "items-end"
                : "items-center",
          )}
          style={
            budgetPct > 85
              ? { right: `${100 - budgetPct}%` }
              : { left: `${budgetPct}%` }
          }
        >
          <span className="type-caption whitespace-nowrap text-muted-foreground">
            {budgetLabel}
          </span>
          <span className="w-px flex-1 border-l border-dashed border-muted-foreground" />
        </span>

        {/* 바닥 눈금선 */}
        <span className="absolute inset-x-0 bottom-1 h-1.5 rounded-full bg-vote-bar-track" />
        {range ? (
          <span
            className="absolute bottom-1 h-1.5 rounded-full bg-chart-3 transition-opacity duration-(--lm-duration-base) ease-enter motion-reduce:transition-none"
            style={{
              left: `${pct(range.low)}%`,
              width: `${pct(range.high) - pct(range.low)}%`,
              opacity: shown ? 1 : 0,
            }}
          />
        ) : null}

        {/* 제보 하나하나 (A 점 분포) */}
        {dots.map(({ v, stack }, i) => (
          <span
            key={`${v}-${i}`}
            className="absolute size-2 -translate-x-1/2 rounded-full bg-muted-foreground transition-opacity duration-(--lm-duration-base) ease-enter motion-reduce:transition-none"
            style={{
              left: `${pct(v)}%`,
              bottom: `${14 + stack * 10}px`,
              opacity: shown ? 1 : 0,
              transitionDelay: `${Math.min(i, 12) * 30}ms`,
            }}
          />
        ))}

        {/* 대표값: 제보면 가운데 값 눈금, 추정이면 빈 원 */}
        {price.estimate ? (
          <span
            className="absolute bottom-0 size-3.5 -translate-x-1/2 rounded-full border-2 border-muted-foreground bg-background"
            style={{ left: `${valuePct}%` }}
          />
        ) : (
          <span
            className="absolute bottom-0 h-full w-0.5 -translate-x-1/2 rounded-full bg-foreground"
            style={{ left: `${valuePct}%` }}
          />
        )}
      </div>
      <div
        aria-hidden
        className="flex justify-between type-caption text-muted-foreground tabular-nums"
      >
        <span>{formatShortWon(scale.min)}</span>
        <span>{formatShortWon(scale.max)}</span>
      </div>
      <p className="type-body-sm break-keep">
        {price.estimate ? (
          copy.price.estimateBody(categoryLabel)
        ) : (
          <>
            {copy.price.sentenceReport(
              price.reportCount,
              formatWon(price.value),
            )}
            {range ? (
              <>
                {" "}
                <span className="whitespace-nowrap">
                  {copy.price.sentenceRange(
                    formatWon(range.low),
                    formatWon(range.high),
                    range.kind === "quartile",
                  )}
                </span>
              </>
            ) : null}
          </>
        )}
      </p>
    </div>
  );
}

/* ---------- 만족도: 10칸 미터 ---------- */

export function TenMeter({
  thumbs,
  active,
}: {
  thumbs: DetailThumbs;
  active: boolean;
}) {
  const shown = useShown(active);
  if (thumbs.total === 0) {
    return (
      <p className="type-body-sm text-muted-foreground">{copy.thumbs.none}</p>
    );
  }
  const hidden = thumbs.percent === null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div
          role="img"
          aria-label={
            thumbs.percent === null
              ? copy.thumbs.reviewsOf(thumbs.total)
              : copy.thumbs.meterLabel(thumbs.percent, thumbs.total)
          }
          className="grid flex-1 grid-cols-10 gap-1"
        >
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-5 rounded-[3px] transition-colors duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
                hidden
                  ? "border border-dashed border-input"
                  : shown && i < thumbs.filledCells
                    ? "bg-muted-foreground"
                    : "bg-vote-bar-track",
              )}
              style={{ transitionDelay: `${i * 30}ms` }}
            />
          ))}
        </div>
        {thumbs.percent !== null ? (
          <span className="shrink-0 type-numeric-md">
            {thumbs.percent}
            <span className="type-caption text-muted-foreground">
              {copy.numbers.thumbsUnit}
            </span>
          </span>
        ) : null}
      </div>
      {hidden ? (
        <p className="type-caption text-muted-foreground">
          {copy.thumbs.few(thumbs.total)}
        </p>
      ) : (
        <p className="flex gap-4 type-caption text-muted-foreground tabular-nums">
          <span>{copy.thumbs.up(thumbs.up)}</span>
          <span>{copy.thumbs.down(thumbs.down)}</span>
        </p>
      )}
    </div>
  );
}

/* ---------- 태그 ---------- */

export function TagChips({ tags }: { tags: PlaceDetailStats["tags"] }) {
  if (tags.length === 0) {
    return (
      <p className="type-body-sm text-muted-foreground">{copy.tags.none}</p>
    );
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {tags.slice(0, 5).map((t) => (
        <li
          key={t.label}
          aria-label={copy.tags.count(t.label, t.count)}
          className="inline-flex h-8 items-center gap-1.5 rounded-chip border border-border px-3"
        >
          <span aria-hidden className="type-caption text-foreground">
            {t.label}
          </span>
          <span
            aria-hidden
            className="type-caption text-muted-foreground tabular-nums"
          >
            {t.count}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- 후기 (목록은 6단계) ---------- */

function ReviewByline({ review }: { review: PlaceReview }) {
  const Thumb = review.thumb === "up" ? ThumbsUp : ThumbsDown;
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted type-caption text-muted-foreground"
      >
        {review.nickname.slice(0, 1)}
      </span>
      <span className="min-w-0 truncate type-label">{review.nickname}</span>
      <span className="shrink-0 type-caption text-muted-foreground">
        {copy.reviews.visitMonth(review.visitMonth)}
      </span>
      <span className="ml-auto inline-flex shrink-0 items-center text-muted-foreground">
        <Thumb aria-hidden className="size-4" strokeWidth={1.5} />
        <span className="sr-only">
          {review.thumb === "up"
            ? copy.reviews.thumbUp
            : copy.reviews.thumbDown}
        </span>
      </span>
    </div>
  );
}

export function ReviewsBlock({
  reviews,
  total,
  onMore,
}: {
  reviews: PlaceDetailStats["reviews"];
  total: number;
  onMore?: () => void;
}) {
  if (reviews === null) {
    return (
      <p className="type-body-sm text-muted-foreground">
        {copy.reviews.offline}
      </p>
    );
  }
  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <p className="type-body-sm">{copy.reviews.emptyTitle}</p>
        <p className="type-caption break-keep text-muted-foreground">
          {copy.reviews.emptyBody}
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4">
        {reviews.slice(0, 3).map((r) => (
          <li key={r.id} className="flex flex-col gap-1.5">
            <ReviewByline review={r} />
            <p className="line-clamp-2 type-body-sm break-keep">{r.text}</p>
          </li>
        ))}
      </ul>
      {onMore && total > reviews.length ? (
        <button
          type="button"
          onClick={onMore}
          className={cn(textAction, "self-start")}
        >
          {copy.reviews.more(total)}
        </button>
      ) : null}
    </div>
  );
}

/* ---------- 지금: 웨이팅 + 할인 ---------- */

export function nowSummary(stats: PlaceDetailStats): string {
  const w = stats.waiting;
  if (w)
    return badgeCopy.waitingReport(
      w.minutesAgo,
      badgeCopy.waitingLevels[w.level],
    );
  if (stats.deal) return stats.deal.title;
  return copy.now.waitingNone;
}

export function NowBlock({
  stats,
  onReportWaiting,
  disabled,
}: {
  stats: PlaceDetailStats;
  /** 웨이팅 한 탭 제보 (PLACE-07, 6단계). 없으면 버튼을 "곧 열립니다" 안내로 둔다 */
  onReportWaiting?: (level: "walkIn" | "short" | "long") => void;
  disabled: boolean;
}) {
  const w = stats.waiting;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        <p className="type-body-sm">
          {w
            ? badgeCopy.waitingReport(
                w.minutesAgo,
                badgeCopy.waitingLevels[w.level],
              )
            : copy.now.waitingNone}
        </p>
        <p className="type-caption text-muted-foreground">
          {copy.now.waitingAsk}
        </p>
        <div className="flex flex-wrap gap-2">
          {(["walkIn", "short", "long"] as const).map((level) => (
            <button
              key={level}
              type="button"
              aria-disabled={disabled || !onReportWaiting || undefined}
              onClick={() => onReportWaiting?.(level)}
              className={cn(
                "inline-flex h-10 items-center rounded-chip border border-border px-4 type-label text-foreground transition-colors duration-(--lm-duration-fast) ease-standard hover:bg-muted active:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-50 motion-reduce:transition-none",
                hitArea48,
                focusRing,
              )}
            >
              {badgeCopy.waitingLevels[level]}
            </button>
          ))}
        </div>
        {!onReportWaiting ? (
          <p className="type-caption text-muted-foreground">
            {copy.now.waitingSoon}
          </p>
        ) : null}
      </div>
      {stats.deal ? (
        <div className="flex flex-col gap-1 border-t border-border pt-4">
          <p className="type-body-sm">{stats.deal.title}</p>
          <p className="type-caption text-muted-foreground tabular-nums">
            {copy.now.dealMeta(stats.deal.daysAgo, stats.deal.untilLabel)}
          </p>
          <p className="type-caption break-keep text-muted-foreground">
            {copy.now.dealNotice}
          </p>
          <p className="type-caption break-keep text-muted-foreground">
            {copy.now.dealNoScore}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- 정보 ---------- */

export function InfoBlock({
  address,
  phone,
  naverUrl,
}: {
  address: string | null;
  phone: string | null;
  naverUrl: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <dl className="flex flex-col gap-2">
        {address ? (
          <div className="grid grid-cols-[3.5rem_1fr] gap-3">
            <dt className="type-caption leading-6 text-muted-foreground">
              {copy.info.address}
            </dt>
            <dd className="type-body-sm break-keep">{address}</dd>
          </div>
        ) : null}
        <div className="grid grid-cols-[3.5rem_1fr] items-center gap-3">
          <dt className="type-caption leading-6 text-muted-foreground">
            {copy.info.phone}
          </dt>
          <dd className="type-body-sm tabular-nums">
            {phone ? (
              <a
                href={`tel:${phone.replace(/[^0-9+]/g, "")}`}
                className={cn(textAction, "type-body-sm")}
              >
                <Phone aria-hidden className="size-3.5" strokeWidth={1.75} />
                {phone}
              </a>
            ) : (
              <span className="text-muted-foreground">{copy.info.noPhone}</span>
            )}
          </dd>
        </div>
      </dl>
      <p className="pt-1 type-caption break-keep text-muted-foreground">
        {copy.info.naverNote}
      </p>
      <a
        href={naverUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(textAction, "self-start")}
      >
        {copy.actions.naver}
        <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.75} />
      </a>
    </div>
  );
}
