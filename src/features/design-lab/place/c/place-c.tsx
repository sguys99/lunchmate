"use client";
// 식당 상세 시안 C "결정 집중형" (T5.2).
//
// 의도: 상세를 열어도 할 일은 "갈까, 말까" 하나. 첫 높이(시트 절반)에는 이름, 숫자 3개, 예산 안인지, 지금 웨이팅만 두고
//       하단 고정 줄에 길찾기 + 즐겨찾기 + 더 보기(전화, 공유, 네이버, 투표에 추가, 제보)를 모은다.
//       근거(가격, 만족도, 태그, 후기, 지금, 정보)는 한 줄 요약이 붙은 접힘 행으로, 펼쳐야 자세히 보인다.
// 기본 컨테이너: 지도 바텀시트(from=map). 처음엔 절반 높이(snap=half, 지도가 넓게 보임), "자세히 보기"나 ?snap=full이면 끝까지.
//               홈 "상세"에서 열면(from=home) 절반 단계 없이 요약 + 접힘 행.
// 데스크톱: 좌 상세 + 우 지도(이 식당 핀 강조). 접힘 행은 그대로.
// 👍 시각화: 10칸 미터(한 칸 10%) + 👍 👎 개수. 3건 미만이면 점선 칸과 "3건부터" 안내.
// 가격: 5천~2만 원 눈금 위에 제보 범위 띠, 가운데 값 눈금, 내 점심 예산 선. "예산 안" 판정을 요약 줄에.
// 모션: 시트 높이(지도 띠 높이) 전환 slow, 접힘 행 높이 전환 base(grid-rows), 더 보기 메뉴 페이드 fast. 축소 모드면 즉시.
import {
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CircleAlert,
  MoreHorizontal,
  Flag,
} from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { EstimateMark } from "@/components/badges/estimate-mark";
import { LoadingRegion, SkeletonLine } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { focusRing } from "@/components/ui/interaction";
import { badgeCopy } from "@/copy/badges";
import { placeLabCopy as copy } from "@/copy/design-lab-place";
import { CardBadges } from "@/features/design-lab/home/shared/card-bits";
import { CATEGORY_INK } from "@/features/design-lab/system/b/parts";
import { categoryLabel } from "@/features/place/categories";
import { CategoryIllustration } from "@/features/place/illustrations";
import { formatShortWon, formatWon } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MOCK_PLACE_URL, type PlaceDetail } from "../detail-mock";
import { detailNumbers, type DetailNumbers } from "../numbers";
import type { PlaceParams } from "../params";
import {
  ActionElement,
  DetailError,
  DetailScreen,
  FavoriteIcon,
  FavoriteStatus,
  NameUnresolved,
  OfflineNote,
  PrimaryAction,
  ReviewByline,
  ReviewsOffline,
  btn,
  getDetailContent,
  placeName,
  secondaryActions,
  useFavorite,
  useMounted,
  type DetailMode,
} from "../shared";

export function PlaceC({ params }: { params: PlaceParams }) {
  const content = getDetailContent(params);
  const from = params.from ?? "map";
  const name = placeName(content);
  const [expanded, setExpanded] = useState(
    from === "home" || params.snap === "full",
  );
  const half = from === "map" && !expanded;

  if (content.kind === "loading") {
    return (
      <DetailScreen
        from={from}
        pinLabel={null}
        tallMap={half}
        footer={
          <div className="flex gap-2">
            <Skeleton className="h-12 flex-1 rounded-button" />
            <Skeleton className="size-12 rounded-button" />
            <Skeleton className="size-12 rounded-button" />
          </div>
        }
      >
        <SkeletonC />
      </DetailScreen>
    );
  }
  if (content.kind === "error") {
    return (
      <DetailScreen from={from} pinLabel={null} tallMap={half}>
        <DetailError className="pb-8" />
      </DetailScreen>
    );
  }
  const { detail, mode } = content;
  return (
    <DetailScreen
      from={from}
      pinLabel={name}
      tallMap={half}
      footer={<FooterC detail={detail} mode={mode} poll={params.poll} />}
    >
      <BodyC
        detail={detail}
        mode={mode}
        half={half}
        onExpand={() => setExpanded(true)}
        onCollapse={from === "map" ? () => setExpanded(false) : undefined}
      />
    </DetailScreen>
  );
}

/* ---------- 본문 ---------- */

function BodyC({
  detail,
  mode,
  half,
  onExpand,
  onCollapse,
}: {
  detail: PlaceDetail;
  mode: DetailMode;
  half: boolean;
  onExpand: () => void;
  onCollapse?: () => void;
}) {
  const named = mode !== "name";
  const n = detailNumbers(detail, named);
  const { place } = detail;
  const detailsId = useId();
  const w = place.waiting;

  return (
    <div className="flex flex-col pt-3 pb-6 desktop:pt-0">
      {mode === "offline" ? <OfflineNote className="mb-5" /> : null}

      {/* 요약 */}
      {named ? (
        <header className="flex items-center gap-3 pr-10 desktop:pr-0">
          <CategoryIllustration
            slug={place.category}
            size={56}
            className="-ml-1 shrink-0"
          />
          <div className="flex min-w-0 flex-col">
            <span className={cn("type-caption", CATEGORY_INK[place.category])}>
              {categoryLabel(place.category)}
            </span>
            <h1 className="truncate type-title">{place.name}</h1>
          </div>
        </header>
      ) : (
        <NameUnresolved className="pr-10" />
      )}

      <CompactNumbers n={n} budget={detail.budgetKRW} className="mt-5" />
      <CardBadges place={place} className="mt-4" />

      {/* 펼치기 */}
      {half ? (
        <button
          type="button"
          aria-expanded={false}
          aria-controls={detailsId}
          onClick={onExpand}
          className={cn(btn.text, "mt-3 self-start")}
        >
          <ChevronUp aria-hidden className="size-4" strokeWidth={1.5} />
          {copy.container.expand}
        </button>
      ) : null}

      <div
        id={detailsId}
        inert={half}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-(--lm-duration-slow) ease-standard motion-reduce:transition-none",
          half ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mt-6 flex flex-col border-t border-border">
            <Fold
              title={copy.price.title}
              summary={
                n.price.estimate
                  ? copy.price.estimateOf(n.price.category)
                  : copy.price.medianOf(n.price.reportCount)
              }
            >
              <BudgetScale n={n} budget={detail.budgetKRW} />
            </Fold>
            <Fold
              title={copy.thumbs.title}
              summary={
                n.thumbs.percent === null
                  ? copy.numbers.thumbsEmpty
                  : copy.thumbs.reviewsOf(n.thumbs.total)
              }
              defaultOpen
            >
              <TenMeter n={n} />
            </Fold>
            <Fold
              title={copy.tags.titleShort}
              summary={
                detail.tags
                  .slice(0, 2)
                  .map((t) => t.label)
                  .join(", ") || copy.tags.none
              }
            >
              <TagChips detail={detail} />
            </Fold>
            <Fold
              title={copy.reviews.title}
              summary={copy.reviews.titleCount(detail.reviewTotal)}
            >
              <ReviewsC detail={detail} />
            </Fold>
            <Fold
              title={copy.now.title}
              summary={
                w
                  ? badgeCopy.waitingReport(
                      w.minutesAgo,
                      badgeCopy.waitingLevels[w.level],
                    )
                  : detail.deal
                    ? detail.deal.title
                    : copy.now.waitingNone
              }
            >
              <NowC detail={detail} offline={mode === "offline"} />
            </Fold>
            {named ? (
              <Fold title={copy.info.title} summary={place.address}>
                <InfoC detail={detail} />
              </Fold>
            ) : null}
          </div>
          {onCollapse ? (
            <button
              type="button"
              onClick={onCollapse}
              className={cn(btn.text, "mt-3 desktop:hidden")}
            >
              <ChevronDown aria-hidden className="size-4" strokeWidth={1.5} />
              {copy.container.collapse}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ---------- 숫자 + 예산 판정 ---------- */

function CompactNumbers({
  n,
  budget,
  className,
}: {
  n: DetailNumbers;
  budget: number;
  className?: string;
}) {
  const within = n.price.value <= budget;
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
          {n.walkMinutes === null ? (
            <span className="type-caption text-muted-foreground">
              {copy.states.name.walkUnknown}
            </span>
          ) : (
            <>
              <span className="type-numeric-md">{n.walkMinutes}</span>
              <span className="type-caption text-muted-foreground">
                {copy.numbers.walkUnit}
              </span>
            </>
          )}
        </dd>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5 px-4 @max-[23.75rem]/screen:px-3">
        <dt className="flex items-baseline gap-1.5 type-caption text-muted-foreground">
          {copy.numbers.price}
          {n.price.estimate ? <EstimateMark /> : null}
        </dt>
        <dd className="flex min-h-[1.35rem] flex-wrap items-baseline gap-x-2 whitespace-nowrap">
          <span className="inline-flex items-baseline gap-0.5">
            <span className="type-numeric-md">{n.price.amount}</span>
            <span className="type-caption text-muted-foreground">
              {n.price.unit}
            </span>
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 type-caption",
              within ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {within ? (
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
            {within ? copy.price.inBudget : copy.price.overBudget}
          </span>
        </dd>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5 pl-4">
        <dt className="type-caption text-muted-foreground">
          {copy.numbers.thumbs}
        </dt>
        <dd className="flex min-h-[1.35rem] items-end gap-0.5 whitespace-nowrap">
          {n.thumbs.percent === null ? (
            <span className="type-caption text-muted-foreground">
              {copy.numbers.thumbsEmpty}
            </span>
          ) : (
            <>
              <span className="type-numeric-md">{n.thumbs.percent}</span>
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

/* ---------- 접힘 행 ---------- */

function Fold({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="border-b border-border">
      <h2>
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
      </h2>
      <div
        id={id}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows] duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pt-1 pb-5">{children}</div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 가격: 예산 눈금 ---------- */

const SCALE_MIN = 5000;
const SCALE_MAX = 20000;

function BudgetScale({ n, budget }: { n: DetailNumbers; budget: number }) {
  const pos = (v: number) =>
    `${(Math.min(Math.max(v, SCALE_MIN), SCALE_MAX) - SCALE_MIN) / ((SCALE_MAX - SCALE_MIN) / 100)}%`;
  const range = n.price.range;
  return (
    <div className="flex flex-col gap-3">
      <div
        role="img"
        aria-label={copy.price.scaleLabel(n.price.won, formatShortWon(budget))}
        className="relative mx-1 mt-6 h-6"
      >
        <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-vote-bar-track" />
        {range ? (
          <span
            className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-chart-3"
            style={{
              left: pos(range.min),
              width: `calc(${pos(range.max)} - ${pos(range.min)})`,
            }}
          />
        ) : null}
        {/* 가운데 값(또는 추정값) */}
        <span
          className={cn(
            "absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background",
            n.price.estimate
              ? "bg-background ring-1 ring-muted-foreground"
              : "bg-foreground",
          )}
          style={{ left: pos(n.price.value) }}
        />
        {/* 내 예산 선 */}
        <span
          className="absolute -top-5 bottom-0 flex -translate-x-1/2 flex-col items-center"
          style={{ left: pos(budget) }}
        >
          <span className="type-caption whitespace-nowrap text-muted-foreground">
            {copy.price.budget(formatShortWon(budget))}
          </span>
          <span className="w-px flex-1 border-l border-dashed border-muted-foreground" />
        </span>
      </div>
      <div
        aria-hidden
        className="flex justify-between type-caption text-muted-foreground tabular-nums"
      >
        <span>{formatShortWon(SCALE_MIN)}</span>
        <span>{formatShortWon(SCALE_MAX)}</span>
      </div>
      <p className="type-body-sm break-keep">
        {n.price.estimate ? (
          copy.price.estimateBody(n.price.category)
        ) : (
          <>
            {copy.price.sentenceReport(n.price.reportCount, n.price.won)}{" "}
            {range
              ? copy.price.sentenceRange(
                  formatWon(range.min),
                  formatWon(range.max),
                )
              : null}
          </>
        )}
      </p>
    </div>
  );
}

/* ---------- 만족도: 10칸 미터 ---------- */

function TenMeter({ n }: { n: DetailNumbers }) {
  const mounted = useMounted();
  const { up, down, total, percent } = n.thumbs;
  if (total === 0) {
    return (
      <p className="type-body-sm text-muted-foreground">{copy.thumbs.none}</p>
    );
  }
  const filled = percent === null ? 0 : Math.round(percent / 10);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div
          role="img"
          aria-label={
            percent === null
              ? copy.thumbs.reviewsOf(total)
              : copy.thumbs.meterLabel(percent)
          }
          className="grid flex-1 grid-cols-10 gap-1"
        >
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-5 rounded-[3px] transition-colors duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
                percent === null
                  ? "border border-dashed border-input"
                  : mounted && i < filled
                    ? "bg-muted-foreground"
                    : "bg-vote-bar-track",
              )}
              style={{ transitionDelay: `${i * 30}ms` }}
            />
          ))}
        </div>
        {percent !== null ? (
          <span className="shrink-0 type-numeric-md">
            {percent}
            <span className="type-caption text-muted-foreground">
              {copy.numbers.thumbsUnit}
            </span>
          </span>
        ) : null}
      </div>
      {percent === null ? (
        <p className="type-caption text-muted-foreground">
          {copy.thumbs.few(total)}
        </p>
      ) : (
        <p className="flex gap-4 type-caption text-muted-foreground tabular-nums">
          <span>{copy.thumbs.up(up)}</span>
          <span>{copy.thumbs.down(down)}</span>
        </p>
      )}
    </div>
  );
}

/* ---------- 태그 ---------- */

function TagChips({ detail }: { detail: PlaceDetail }) {
  if (detail.tags.length === 0) {
    return (
      <p className="type-body-sm text-muted-foreground">{copy.tags.none}</p>
    );
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {detail.tags.map((t) => (
        <li
          key={t.label}
          className="inline-flex h-8 items-center gap-1.5 rounded-chip border border-border px-3"
        >
          <span className="type-caption text-foreground">{t.label}</span>
          <span className="type-caption text-muted-foreground tabular-nums">
            {t.count}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- 후기 ---------- */

function ReviewsC({ detail }: { detail: PlaceDetail }) {
  if (detail.reviews === null) return <ReviewsOffline />;
  if (detail.reviews.length === 0) {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <p className="type-body-sm">{copy.reviews.empty.title}</p>
        <p className="type-caption text-muted-foreground">
          {copy.reviews.empty.body}
        </p>
        <button type="button" className={cn(btn.outline, "mt-3")}>
          {copy.reviews.write}
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4">
        {detail.reviews.map((r) => (
          <li key={r.id} className="flex flex-col gap-1.5">
            <ReviewByline review={r} />
            <p className="line-clamp-2 type-body-sm break-keep">{r.text}</p>
          </li>
        ))}
      </ul>
      {detail.reviewTotal > detail.reviews.length ? (
        <button type="button" className={cn(btn.text, "self-start")}>
          {copy.reviews.more(detail.reviewTotal)}
        </button>
      ) : null}
    </div>
  );
}

/* ---------- 지금 ---------- */

function NowC({ detail, offline }: { detail: PlaceDetail; offline: boolean }) {
  const w = detail.place.waiting;
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
              aria-disabled={offline || undefined}
              className={cn(
                btn.chip,
                "aria-disabled:pointer-events-none aria-disabled:opacity-50",
              )}
            >
              {badgeCopy.waitingLevels[level]}
            </button>
          ))}
        </div>
      </div>
      {detail.deal ? (
        <div className="flex flex-col gap-1 border-t border-border pt-4">
          <p className="type-body-sm">{detail.deal.title}</p>
          <p className="type-caption text-muted-foreground tabular-nums">
            {copy.now.dealMeta(detail.deal.daysAgo, detail.deal.until)}
          </p>
          <p className="type-caption break-keep text-muted-foreground">
            {copy.now.dealNotice}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- 정보 ---------- */

function InfoC({ detail }: { detail: PlaceDetail }) {
  const { place } = detail;
  return (
    <div className="flex flex-col gap-2">
      <dl className="flex flex-col gap-2">
        <div className="grid grid-cols-[3.5rem_1fr] gap-3">
          <dt className="type-caption leading-6 text-muted-foreground">
            {copy.info.address}
          </dt>
          <dd className="type-body-sm break-keep">{place.address}</dd>
        </div>
        <div className="grid grid-cols-[3.5rem_1fr] gap-3">
          <dt className="type-caption leading-6 text-muted-foreground">
            {copy.info.phone}
          </dt>
          <dd className="type-body-sm tabular-nums">{place.phone}</dd>
        </div>
      </dl>
      <p className="pt-1 type-caption break-keep text-muted-foreground">
        {copy.info.naverNote}
      </p>
      <a
        href={MOCK_PLACE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(btn.text, "self-start")}
      >
        {copy.actions.kakaoMap}
      </a>
    </div>
  );
}

/* ---------- 하단 고정 줄 + 더 보기 ---------- */

function FooterC({
  detail,
  mode,
  poll,
}: {
  detail: PlaceDetail;
  mode: DetailMode;
  poll: boolean;
}) {
  const fav = useFavorite(false);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const actions = secondaryActions(detail, mode, poll);
  const item = cn(
    "flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left type-body-sm text-foreground hover:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-50",
    focusRing,
  );
  return (
    <div
      className="relative flex gap-2"
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <PrimaryAction detail={detail} mode={mode} className="flex-1" />
      <button
        type="button"
        aria-pressed={fav.on}
        aria-label={copy.actions.favorite}
        aria-disabled={mode === "offline" || undefined}
        onClick={fav.toggle}
        className={btn.icon}
      >
        <FavoriteIcon on={fav.on} />
      </button>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={copy.actions.moreLabel}
        onClick={() => setOpen((v) => !v)}
        className={btn.icon}
      >
        <MoreHorizontal aria-hidden className="size-5" strokeWidth={1.5} />
      </button>
      <div
        id={menuId}
        inert={!open}
        className={cn(
          "absolute right-0 bottom-full mb-2 w-64 rounded-card border border-border bg-popover p-2 transition-[opacity,translate] duration-(--lm-duration-fast) ease-enter motion-reduce:transition-none",
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-1 opacity-0",
        )}
      >
        <ul className="flex flex-col">
          {actions.map((a) => (
            <li key={a.key}>
              <ActionElement action={a} className={item}>
                <a.icon
                  aria-hidden
                  className="size-4 text-muted-foreground"
                  strokeWidth={1.5}
                />
                {a.longLabel}
              </ActionElement>
            </li>
          ))}
        </ul>
        <p className="mt-1 border-t border-border px-3 pt-3 pb-1 type-caption text-muted-foreground">
          {copy.report.title}
        </p>
        <ul className="flex flex-col">
          {[copy.report.closed, copy.report.price, copy.report.wrong].map(
            (label) => (
              <li key={label}>
                <button
                  type="button"
                  aria-disabled={mode === "offline" || undefined}
                  className={item}
                >
                  <Flag
                    aria-hidden
                    className="size-4 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  {label}
                </button>
              </li>
            ),
          )}
        </ul>
      </div>
      <FavoriteStatus fav={fav} />
    </div>
  );
}

/* ---------- 스켈레톤 ---------- */

function SkeletonC() {
  return (
    <LoadingRegion
      label={copy.states.loading.label}
      className="flex flex-col pt-3 pb-6 desktop:pt-0"
    >
      <h1 className="sr-only">{copy.container.sheetLabel}</h1>
      <div className="flex items-center gap-3 pr-10">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col">
          <SkeletonLine type="caption" className="w-10" />
          <SkeletonLine type="title" className="w-36" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-[0.8fr_1.3fr_0.9fr] divide-x divide-border">
        {["w-6", "w-20", "w-9"].map((w) => (
          <div
            key={w}
            className="flex flex-col gap-1.5 px-4 first:pl-0 last:pr-0"
          >
            <SkeletonLine type="caption" className="w-7" />
            <Skeleton className={cn("mt-1 h-3.5 rounded-badge", w)} />
          </div>
        ))}
      </div>
      <Skeleton className="mt-4 h-6 w-36 rounded-badge" />
    </LoadingRegion>
  );
}
