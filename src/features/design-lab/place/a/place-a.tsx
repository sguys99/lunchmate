"use client";
// 식당 상세 시안 A "숫자 대시보드" (T5.2).
//
// 의도: 열자마자 숫자 3개(도보, 1인 가격, 만족)가 28px로 크게 굴러 들어오고, 그 아래 행동 4칸과
//       근거 블록(만족 막대, 가격 제보 점 분포, 태그 빈도 막대, 후기)이 대시보드처럼 쌓인다.
// 기본 컨테이너: 지도 바텀시트를 끝까지 연 상태(from=map). 홈 "상세"에서 열면 같은 본문을 뒤로 버튼 화면에 담는다.
// 데스크톱: 좌 상세 + 우 지도(이 식당 핀 강조), 앱 셸 2단 그대로.
// 👍 시각화: 👍와 👎 두 칸으로 나눈 가로 막대 + 양 끝 개수. 3건 미만이면 점선 빈 막대와 "3건부터" 안내.
// 가격: 제보 하나하나를 점으로 찍은 분포 + 가운데 값 눈금. 제보가 없으면 "추정" 표시와 추정 근거 한 줄.
// 액션: 하단 고정 줄에 길찾기 하나(primary), 즐겨찾기, 전화, 공유, 네이버 플레이스는 숫자 아래 아이콘 4칸.
// 모션: 숫자 NumberFlow 롤링(0에서), 만족 막대와 태그 막대 채움(CSS, base). 축소 모드면 바로 최종값.
import { BadgePercent, CircleCheck } from "lucide-react";
import type { ReactNode } from "react";
import { EstimateMark } from "@/components/badges/estimate-mark";
import { RollingNumber } from "@/components/numbers";
import { LoadingRegion, SkeletonLine } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { placeLabCopy as copy } from "@/copy/design-lab-place";
import { CardBadges } from "@/features/design-lab/home/shared/card-bits";
import { CATEGORY_INK } from "@/features/design-lab/system/b/parts";
import { categoryLabel } from "@/features/place/categories";
import { CategoryIllustration } from "@/features/place/illustrations";
import { formatWon } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PlaceDetail } from "../detail-mock";
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
  ReportEntry,
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

export function PlaceA({ params }: { params: PlaceParams }) {
  const content = getDetailContent(params);
  const from = params.from ?? "map";
  const name = placeName(content);

  if (content.kind === "loading") {
    return (
      <DetailScreen
        from={from}
        desktop="split"
        pinLabel={null}
        footer={<Skeleton className="h-12 w-full rounded-button" />}
      >
        <SkeletonA />
      </DetailScreen>
    );
  }
  if (content.kind === "error") {
    return (
      <DetailScreen from={from} desktop="split" pinLabel={null}>
        <DetailError className="pb-10" />
      </DetailScreen>
    );
  }
  const { detail, mode } = content;
  return (
    <DetailScreen
      from={from}
      desktop="split"
      pinLabel={name}
      footer={<PrimaryAction detail={detail} mode={mode} className="w-full" />}
    >
      <BodyA detail={detail} mode={mode} poll={params.poll} />
    </DetailScreen>
  );
}

/* ---------- 본문 ---------- */

function BodyA({
  detail,
  mode,
  poll,
}: {
  detail: PlaceDetail;
  mode: DetailMode;
  poll: boolean;
}) {
  const named = mode !== "name";
  const n = detailNumbers(detail, named);
  const { place } = detail;
  return (
    <div className="flex flex-col pt-4 pb-8 desktop:pt-0">
      {mode === "offline" ? <OfflineNote className="mb-6" /> : null}

      {/* 머리: 이름, 주소, 배지 */}
      {named ? (
        <header className="flex items-start gap-4 pr-8 desktop:pr-0">
          <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
            <span className={cn("type-caption", CATEGORY_INK[place.category])}>
              {categoryLabel(place.category)}
            </span>
            <h1 className="type-title text-balance break-keep">{place.name}</h1>
            <p className="type-caption break-keep text-muted-foreground">
              {place.address}
            </p>
          </div>
          <CategoryIllustration
            slug={place.category}
            size={72}
            className="-mt-1 -mr-2 shrink-0"
          />
        </header>
      ) : (
        <NameUnresolved className="pr-8" />
      )}
      <CardBadges place={place} className="mt-4" />
      {detail.myVisit ? (
        <p className="mt-3 flex items-center gap-1.5 type-caption text-muted-foreground">
          <CircleCheck aria-hidden className="size-3.5" strokeWidth={1.75} />
          {copy.myVisit.line(detail.myVisit.dateLabel)}
        </p>
      ) : null}

      {/* 숫자 3칸 */}
      <BigNumbers n={n} className="mt-7" />

      {/* 행동 4칸 */}
      <ActionTiles detail={detail} mode={mode} poll={poll} />

      <Section
        title={copy.thumbs.title}
        aside={copy.thumbs.reviewsOf(n.thumbs.total)}
      >
        <ThumbsSplitBar n={n} />
      </Section>

      <Section
        title={copy.price.title}
        aside={
          n.price.estimate
            ? copy.price.estimateOf(n.price.category)
            : copy.price.medianOf(n.price.reportCount)
        }
      >
        <PriceDots detail={detail} n={n} />
      </Section>

      <Section title={copy.tags.title}>
        <TagBars detail={detail} />
      </Section>

      {detail.deal ? (
        <Section title={copy.now.dealTitle}>
          <div className="flex flex-col gap-1.5">
            <p className="flex items-center gap-2 type-body">
              <BadgePercent
                aria-hidden
                className="size-4 text-muted-foreground"
                strokeWidth={1.75}
              />
              {detail.deal.title}
            </p>
            <p className="type-caption text-muted-foreground tabular-nums">
              {copy.now.dealMeta(detail.deal.daysAgo, detail.deal.until)}
            </p>
            <p className="type-caption break-keep text-muted-foreground">
              {copy.now.dealNotice}
            </p>
          </div>
        </Section>
      ) : null}

      <Section
        title={copy.reviews.titleCount(detail.reviewTotal)}
        aside={detail.reviewTotal > 0 ? copy.reviews.latest : undefined}
      >
        <ReviewsA detail={detail} />
      </Section>

      <ReportEntry
        className="mt-10 border-t border-border pt-7"
        disabled={mode === "offline"}
      />
    </div>
  );
}

function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8 flex flex-col gap-4 border-t border-border pt-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="type-label">{title}</h2>
        {aside ? (
          <span className="type-caption text-muted-foreground tabular-nums">
            {aside}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/* ---------- 숫자 ---------- */

function BigNumbers({
  n,
  className,
}: {
  n: DetailNumbers;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-[0.8fr_1.3fr_0.9fr] divide-x divide-border",
        className,
      )}
    >
      <Cell label={copy.numbers.walk}>
        {n.walkMinutes === null ? (
          <Muted>{copy.states.name.walkUnknown}</Muted>
        ) : (
          <Num value={n.walkMinutes} unit={copy.numbers.walkUnit} />
        )}
      </Cell>
      <Cell
        label={copy.numbers.price}
        mark={n.price.estimate ? <EstimateMark /> : null}
      >
        <Num value={n.price.amount} unit={n.price.unit} />
      </Cell>
      <Cell label={copy.numbers.thumbs}>
        {n.thumbs.percent === null ? (
          <Muted>{copy.numbers.thumbsEmpty}</Muted>
        ) : (
          <Num value={n.thumbs.percent} unit={copy.numbers.thumbsUnit} />
        )}
      </Cell>
    </dl>
  );
}

function Cell({
  label,
  mark,
  children,
}: {
  label: string;
  mark?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 px-4 first:pl-0 last:pr-0 @max-[23.75rem]/screen:px-3">
      <dt className="flex items-baseline gap-1.5 type-caption text-muted-foreground">
        {label}
        {mark}
      </dt>
      <dd className="flex min-h-9 items-end">{children}</dd>
    </div>
  );
}

function Num({ value, unit }: { value: number; unit: string }) {
  return (
    <span className="inline-flex items-baseline gap-0.5 whitespace-nowrap">
      <span className="type-numeric-lg">
        <RollingNumber value={value} from={0} />
      </span>
      <span className="type-caption text-muted-foreground">{unit}</span>
    </span>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return (
    <span className="pb-1 type-caption whitespace-nowrap text-muted-foreground">
      {children}
    </span>
  );
}

/* ---------- 행동 4칸 ---------- */

function ActionTiles({
  detail,
  mode,
  poll,
}: {
  detail: PlaceDetail;
  mode: DetailMode;
  poll: boolean;
}) {
  const fav = useFavorite(false);
  const actions = secondaryActions(detail, mode, poll);
  const tile =
    "group flex min-h-11 min-w-0 flex-col items-center gap-2 rounded-lg py-1 outline-none aria-disabled:pointer-events-none aria-disabled:opacity-50";
  const circle =
    "inline-flex size-12 items-center justify-center rounded-full border border-border transition-colors duration-(--lm-duration-fast) group-hover:bg-muted group-active:bg-muted group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ring group-focus-visible:outline-solid";
  return (
    <div className="mt-8 flex flex-col gap-3">
      <ul
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${actions.length + 1}, minmax(0, 1fr))`,
        }}
      >
        <li className="flex justify-center">
          <button
            type="button"
            aria-pressed={fav.on}
            aria-disabled={mode === "offline" || undefined}
            onClick={fav.toggle}
            className={tile}
          >
            <span className={circle}>
              <FavoriteIcon on={fav.on} />
            </span>
            <span className="type-caption">{copy.actions.favorite}</span>
          </button>
        </li>
        {actions.map((a) => (
          <li key={a.key} className="flex justify-center">
            <ActionElement action={a} className={tile}>
              <span className={circle}>
                <a.icon aria-hidden className="size-5" strokeWidth={1.5} />
              </span>
              <span className="type-caption whitespace-nowrap">{a.label}</span>
            </ActionElement>
          </li>
        ))}
      </ul>
      <FavoriteStatus fav={fav} />
      {mode !== "name" ? (
        <p className="type-caption break-keep text-muted-foreground">
          {copy.info.naverNote}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- 만족 막대 ---------- */

function ThumbsSplitBar({ n }: { n: DetailNumbers }) {
  const mounted = useMounted();
  const { up, down, total, percent } = n.thumbs;
  if (total === 0) {
    return (
      <p className="type-body-sm text-muted-foreground">{copy.thumbs.none}</p>
    );
  }
  if (percent === null) {
    return (
      <div className="flex flex-col gap-2.5">
        <div
          aria-hidden
          className="h-2.5 w-full rounded-full border border-dashed border-input"
        />
        <p className="type-body-sm break-keep text-muted-foreground">
          {copy.thumbs.few(total)}
        </p>
      </div>
    );
  }
  const ratio = up / total;
  return (
    <div className="flex flex-col gap-2.5">
      <div
        role="img"
        aria-label={copy.thumbs.barLabel(up, down, percent)}
        className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full"
      >
        <span
          className="h-full origin-left rounded-l-full bg-muted-foreground transition-transform duration-(--lm-duration-slow) ease-enter motion-reduce:transition-none"
          style={{
            width: `${ratio * 100}%`,
            transform: `scaleX(${mounted ? 1 : 0})`,
          }}
        />
        <span className="h-full flex-1 rounded-r-full bg-vote-bar-track" />
      </div>
      <div
        aria-hidden
        className="flex justify-between type-caption text-muted-foreground tabular-nums"
      >
        <span className="text-foreground">{copy.thumbs.up(up)}</span>
        <span>{copy.thumbs.down(down)}</span>
      </div>
    </div>
  );
}

/* ---------- 가격 점 분포 ---------- */

function PriceDots({ detail, n }: { detail: PlaceDetail; n: DetailNumbers }) {
  const mounted = useMounted();
  if (n.price.estimate || !n.price.range) {
    return (
      <p className="type-body-sm break-keep text-muted-foreground">
        {copy.price.estimateBody(n.price.category)}
      </p>
    );
  }
  const { min, max } = n.price.range;
  const span = Math.max(1, max - min);
  const pos = (v: number) => `${((v - min) / span) * 100}%`;
  const median = n.price.value;
  // 같은 값이 여러 번이면 위로 쌓는다
  const seen = new Map<number, number>();
  const dots = [...detail.priceReports]
    .sort((a, b) => a - b)
    .map((v) => {
      const stack = seen.get(v) ?? 0;
      seen.set(v, stack + 1);
      return { v, stack };
    });
  return (
    <div className="flex flex-col gap-2">
      <div
        role="img"
        aria-label={copy.price.dotsLabel(
          n.price.reportCount,
          formatWon(min),
          formatWon(max),
        )}
        className="relative mx-1.5 h-12"
      >
        <span className="absolute inset-x-0 bottom-1 h-px bg-border" />
        <span
          className="absolute bottom-0 h-full w-px bg-foreground"
          style={{ left: pos(median) }}
        />
        {dots.map(({ v, stack }, i) => (
          <span
            key={`${v}-${stack}`}
            className="absolute size-2.5 -translate-x-1/2 rounded-full bg-muted-foreground transition-opacity duration-(--lm-duration-base) ease-enter motion-reduce:transition-none"
            style={{
              left: pos(v),
              bottom: `${4 + stack * 12}px`,
              opacity: mounted ? 1 : 0,
              transitionDelay: `${i * 40}ms`,
            }}
          />
        ))}
      </div>
      <div
        aria-hidden
        className="flex items-baseline justify-between type-caption text-muted-foreground tabular-nums"
      >
        <span>{formatWon(min)}</span>
        <span className="text-foreground">
          {copy.price.median(n.price.won)}
        </span>
        <span>{formatWon(max)}</span>
      </div>
    </div>
  );
}

/* ---------- 태그 빈도 ---------- */

function TagBars({ detail }: { detail: PlaceDetail }) {
  const mounted = useMounted();
  if (detail.tags.length === 0) {
    return (
      <p className="type-body-sm text-muted-foreground">{copy.tags.none}</p>
    );
  }
  const top = detail.tags[0]?.count ?? 1;
  return (
    <ul className="flex flex-col gap-2.5">
      {detail.tags.map((t) => (
        <li
          key={t.label}
          className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3"
        >
          <span className="truncate type-body-sm">{t.label}</span>
          <span aria-hidden className="h-1.5 rounded-full bg-vote-bar-track">
            <span
              className="block h-full origin-left rounded-full bg-chart-3 transition-transform duration-(--lm-duration-slow) ease-enter motion-reduce:transition-none"
              style={{
                width: `${(t.count / top) * 100}%`,
                transform: `scaleX(${mounted ? 1 : 0})`,
              }}
            />
          </span>
          <span className="text-right type-caption text-muted-foreground tabular-nums">
            {copy.tags.count(t.count)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- 후기 ---------- */

function ReviewsA({ detail }: { detail: PlaceDetail }) {
  if (detail.reviews === null) return <ReviewsOffline />;
  if (detail.reviews.length === 0) {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <p className="type-body">{copy.reviews.empty.title}</p>
        <p className="type-body-sm text-muted-foreground">
          {copy.reviews.empty.body}
        </p>
        <button type="button" className={cn(btn.outline, "mt-3")}>
          {copy.reviews.write}
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      <ul className="flex flex-col divide-y divide-border">
        {detail.reviews.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 py-4 first:pt-0">
            <ReviewByline review={r} />
            <p className="type-body-sm break-keep">{r.text}</p>
            {r.tags.length > 0 ? (
              <p className="type-caption text-muted-foreground">
                {r.tags.join(", ")}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      {detail.reviewTotal > detail.reviews.length ? (
        <button type="button" className={cn(btn.outline, "mt-2 w-full")}>
          {copy.reviews.more(detail.reviewTotal)}
        </button>
      ) : null}
    </div>
  );
}

/* ---------- 스켈레톤 ---------- */

function SkeletonA() {
  return (
    <LoadingRegion
      label={copy.states.loading.label}
      className="flex flex-col pt-4 pb-8 desktop:pt-0"
    >
      <h1 className="sr-only">{copy.container.sheetLabel}</h1>
      <div className="flex items-start gap-4 pr-8 desktop:pr-0">
        <div className="flex flex-1 flex-col gap-1 pt-1">
          <SkeletonLine type="caption" className="w-10" />
          <SkeletonLine type="title" className="w-40" />
          <SkeletonLine type="caption" className="w-48" />
        </div>
        <Skeleton className="size-[72px] shrink-0 rounded-full" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-6 w-36 rounded-badge" />
      </div>
      <div className="mt-7 grid grid-cols-[0.8fr_1.3fr_0.9fr] divide-x divide-border">
        {["w-8", "w-16", "w-10"].map((w) => (
          <div
            key={w}
            className="flex flex-col gap-1.5 px-4 first:pl-0 last:pr-0"
          >
            <SkeletonLine type="caption" className="w-7" />
            <SkeletonLine type="numeric-lg" className={w} />
          </div>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-4 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2 py-1">
            <Skeleton className="size-12 rounded-full" />
            <SkeletonLine type="caption" className="w-8" />
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-col gap-4 border-t border-border pt-6">
        <SkeletonLine type="label" className="w-14" />
        <Skeleton className="h-2.5 w-full rounded-full" />
      </div>
      <div className="mt-8 flex flex-col gap-4 border-t border-border pt-6">
        <SkeletonLine type="label" className="w-10" />
        <Skeleton className="h-12 w-full rounded-sm" />
      </div>
    </LoadingRegion>
  );
}
