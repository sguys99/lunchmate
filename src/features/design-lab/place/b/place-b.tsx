"use client";
// 식당 상세 시안 B "이야기형" (T5.2).
//
// 의도: 숫자를 문장 속에 녹여 "왜 이 집인지"를 위에서 아래로 읽게 한다. 이름(세리프) → 추천 이유 → 숫자 한 줄 →
//       길찾기 → 왜 이 집인지 → 가 본 사람들(점 그림) → 자주 나온 말 → 가격 문장 → 지금(웨이팅, 할인) → 후기(인용) → 정보.
// 기본 컨테이너: 홈 카드 "상세"에서 연 화면(from=home, 뒤로 버튼). 지도 시트에서 열면 같은 본문을 시트에 담는다.
// 데스크톱: 지도 칸 없이 넓은 2단. 왼쪽 본문(이야기), 오른쪽 고정 요약(숫자, 길찾기, 행동, 작은 지도).
// 👍 시각화: 후기 하나를 점 하나로. 👍는 채운 점, 👎는 빈 점. 문장 "후기 23건 중 20건이 좋았다고 했습니다."
// 가격: 문장 두 줄("제보 7건의 가운데 값은 9,000원입니다.", "8,000~11,000원 사이로 제보됐습니다.")
// 액션: 길찾기는 숫자 줄 바로 아래(본문 안). 스크롤로 그 버튼이 화면 위로 지나가면 하단 고정 줄이 나타난다.
// 모션: 점 그림이 순서대로 나타남(CSS, 20ms 간격), 하단 고정 줄 등장(CSS, base). 축소 모드면 즉시.
import {
  BadgePercent,
  CircleCheck,
  Hourglass,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MapPane } from "@/components/app-shell";
import { EstimateMark } from "@/components/badges/estimate-mark";
import { LoadingRegion, SkeletonLine } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { badgeCopy } from "@/copy/badges";
import { placeLabCopy as copy } from "@/copy/design-lab-place";
import {
  CATEGORY_INK,
  MapLines,
  MapPin,
} from "@/features/design-lab/system/b/parts";
import { categoryLabel } from "@/features/place/categories";
import { reasonWithoutWalk } from "@/features/rec/reason";
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
  ReviewsOffline,
  btn,
  getDetailContent,
  placeName,
  secondaryActions,
  useFavorite,
  useMounted,
  type DetailMode,
  type Favorite,
} from "../shared";

export function PlaceB({ params }: { params: PlaceParams }) {
  const content = getDetailContent(params);
  const from = params.from ?? "home";
  const name = placeName(content);

  if (content.kind === "loading") {
    return (
      <DetailScreen from={from} desktop="wide" pinLabel={null}>
        <SkeletonB />
      </DetailScreen>
    );
  }
  if (content.kind === "error") {
    return (
      <DetailScreen from={from} desktop="wide" pinLabel={null}>
        <DetailError className="pb-10 desktop:max-w-[34rem]" />
      </DetailScreen>
    );
  }
  return (
    <DetailScreen from={from} desktop="wide" pinLabel={name}>
      <BodyB detail={content.detail} mode={content.mode} poll={params.poll} />
    </DetailScreen>
  );
}

/* ---------- 본문 ---------- */

function BodyB({
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
  const fav = useFavorite(false);
  const { place } = detail;

  // 본문 안 길찾기가 화면 위로 지나가면 하단 고정 줄을 띄운다
  const inlineRef = useRef<HTMLDivElement>(null);
  const [docked, setDocked] = useState(false);
  useEffect(() => {
    const el = inlineRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      setDocked(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div className="flex flex-col pt-2 pb-10 desktop:grid desktop:grid-cols-[minmax(0,1fr)_20rem] desktop:grid-rows-[auto_1fr] desktop:gap-x-16 desktop:pt-6">
        {/* 1. 머리와 이유 */}
        <header className="flex flex-col desktop:col-start-1 desktop:row-start-1">
          {mode === "offline" ? <OfflineNote className="mb-6" /> : null}
          {named ? (
            <>
              <CategoryIllustration
                slug={place.category}
                size={112}
                className="-mb-2 -ml-3"
              />
              <span
                className={cn("type-caption", CATEGORY_INK[place.category])}
              >
                {categoryLabel(place.category)}
              </span>
              <h1 className="mt-1 type-display text-balance break-keep">
                {place.name}
              </h1>
            </>
          ) : (
            <NameUnresolved />
          )}
          <p className="mt-4 type-body break-keep">
            {reasonWithoutWalk(place.reason)}
          </p>
        </header>

        {/* 2. 숫자 한 줄 + 길찾기 + 행동 (데스크톱 오른쪽 고정) */}
        <aside
          aria-label={copy.container.sheetLabel}
          className="mt-6 flex flex-col gap-5 desktop:sticky desktop:top-20 desktop:col-start-2 desktop:row-span-2 desktop:row-start-1 desktop:mt-2 desktop:self-start desktop:rounded-card desktop:border desktop:border-border desktop:bg-card desktop:p-7"
        >
          <FactLine n={n} />
          <div ref={inlineRef}>
            <PrimaryAction detail={detail} mode={mode} className="w-full" />
          </div>
          <TextActions detail={detail} mode={mode} poll={poll} fav={fav} />
          {named ? (
            <MapPane className="hidden h-44 min-h-0 flex-none rounded-lg border border-border desktop:block">
              <MapLines />
              <MapPin
                label={place.name}
                active
                position={{ left: "50%", top: "58%" }}
              />
            </MapPane>
          ) : null}
        </aside>

        {/* 3. 이야기 */}
        <div className="flex flex-col desktop:col-start-1 desktop:row-start-2">
          {detail.myVisit ? (
            <p className="mt-8 flex items-center gap-1.5 type-body-sm text-muted-foreground">
              <CircleCheck aria-hidden className="size-4" strokeWidth={1.5} />
              {copy.myVisit.line(detail.myVisit.dateLabel)}
            </p>
          ) : null}

          {named && mode !== "empty" ? (
            <Story title={copy.why.title}>
              <p className="type-body break-keep">{copy.why.lines.join(" ")}</p>
            </Story>
          ) : null}

          <Story title={copy.thumbs.titleStory}>
            <ThumbsDots n={n} />
          </Story>

          {detail.tags.length > 0 ? (
            <Story title={copy.tags.titleStory}>
              <TagWords detail={detail} />
            </Story>
          ) : null}

          <Story title={copy.price.title}>
            <PriceSentences n={n} />
          </Story>

          {place.waiting || detail.deal ? (
            <Story title={copy.now.title}>
              <NowBlock detail={detail} />
            </Story>
          ) : null}

          <Story
            title={
              detail.reviewTotal > 0
                ? copy.reviews.titleCount(detail.reviewTotal)
                : copy.reviews.title
            }
          >
            <ReviewQuotes detail={detail} />
          </Story>

          {named ? (
            <Story title={copy.info.title}>
              <InfoRows detail={detail} />
            </Story>
          ) : null}

          <ReportEntry className="mt-12" disabled={mode === "offline"} />
        </div>
      </div>

      {/* 하단 고정 줄: 본문 길찾기가 지나간 뒤에만 (모바일) */}
      <div
        inert={!docked}
        aria-hidden={!docked}
        className={cn(
          "sticky bottom-[calc(var(--lm-layout-tab-bar-height)+env(safe-area-inset-bottom,0px))] z-[5] -mx-(--lm-layout-gutter) mt-auto flex gap-2 border-t border-border bg-background px-(--lm-layout-gutter) py-3 transition-[opacity,translate] duration-(--lm-duration-base) ease-enter motion-reduce:transition-none desktop:hidden",
          docked ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        )}
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
      </div>
      <FavoriteStatus fav={fav} />
    </>
  );
}

function Story({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12 flex flex-col gap-4">
      <h2 className="type-heading break-keep">{title}</h2>
      {children}
    </section>
  );
}

/* ---------- 숫자 한 줄 ---------- */

function FactLine({ n }: { n: DetailNumbers }) {
  const sep = <span aria-hidden className="h-3.5 w-px shrink-0 bg-border" />;
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 type-body-sm tabular-nums">
      {n.walkMinutes !== null ? (
        <>
          <span>
            {copy.numbers.walk}{" "}
            <span className="type-numeric-md">{n.walkMinutes}</span>
            {copy.numbers.walkUnit}
          </span>
          {sep}
        </>
      ) : null}
      <span className="inline-flex items-baseline gap-1">
        <span>
          {copy.numbers.price}{" "}
          <span className="type-numeric-md">{n.price.amount}</span>
          {n.price.unit}
        </span>
        {n.price.estimate ? <EstimateMark /> : null}
      </span>
      {sep}
      <span>
        {n.thumbs.percent === null ? (
          <span className="text-muted-foreground">
            {copy.numbers.thumbsEmpty}
          </span>
        ) : (
          <>
            {copy.numbers.thumbs}{" "}
            <span className="type-numeric-md">{n.thumbs.percent}</span>
            {copy.numbers.thumbsUnit}
          </>
        )}
      </span>
    </p>
  );
}

/* ---------- 글자 행동 ---------- */

function TextActions({
  detail,
  mode,
  poll,
  fav,
}: {
  detail: PlaceDetail;
  mode: DetailMode;
  poll: boolean;
  fav: Favorite;
}) {
  const actions = secondaryActions(detail, mode, poll);
  const item =
    "inline-flex min-h-11 items-center gap-1.5 rounded-button px-2 type-label text-foreground hover:bg-muted aria-disabled:pointer-events-none aria-disabled:opacity-50 outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring";
  return (
    <ul className="-mx-2 flex flex-wrap gap-x-1 gap-y-0">
      <li>
        <button
          type="button"
          aria-pressed={fav.on}
          aria-disabled={mode === "offline" || undefined}
          onClick={fav.toggle}
          className={item}
        >
          <FavoriteIcon on={fav.on} />
          {copy.actions.favorite}
        </button>
      </li>
      {actions.map((a) => (
        <li key={a.key}>
          <ActionElement action={a} className={item}>
            <a.icon aria-hidden className="size-4" strokeWidth={1.5} />
            {a.longLabel}
          </ActionElement>
        </li>
      ))}
    </ul>
  );
}

/* ---------- 가 본 사람들: 점 그림 ---------- */

function ThumbsDots({ n }: { n: DetailNumbers }) {
  const mounted = useMounted();
  const { up, down, total, percent } = n.thumbs;
  if (total === 0) {
    return (
      <p className="type-body text-muted-foreground">{copy.thumbs.none}</p>
    );
  }
  const dots = [
    ...Array.from({ length: up }, () => "up" as const),
    ...Array.from({ length: down }, () => "down" as const),
  ];
  return (
    <div className="flex flex-col gap-4">
      <p className="type-body break-keep">
        {percent === null
          ? copy.thumbs.few(total)
          : copy.thumbs.sentence(total, up)}
      </p>
      <div
        role="img"
        aria-label={
          percent === null
            ? copy.thumbs.reviewsOf(total)
            : copy.thumbs.barLabel(up, down, percent)
        }
        className="flex max-w-[18rem] flex-wrap gap-1.5"
      >
        {dots.map((kind, i) => (
          <span
            key={i}
            className={cn(
              "size-3.5 rounded-full transition-opacity duration-(--lm-duration-base) ease-enter motion-reduce:transition-none",
              kind === "up"
                ? "bg-muted-foreground"
                : "border border-muted-foreground",
            )}
            style={{
              opacity: mounted ? 1 : 0,
              transitionDelay: `${i * 20}ms`,
            }}
          />
        ))}
      </div>
      <p
        aria-hidden
        className="flex gap-4 type-caption text-muted-foreground tabular-nums"
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-muted-foreground" />
          {copy.thumbs.up(up)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border border-muted-foreground" />
          {copy.thumbs.down(down)}
        </span>
      </p>
    </div>
  );
}

/* ---------- 자주 나온 말 ---------- */

function TagWords({ detail }: { detail: PlaceDetail }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2">
      {detail.tags.map((t) => (
        <li key={t.label} className="inline-flex items-baseline gap-1">
          <span className="type-body">{t.label}</span>
          <span className="type-caption text-muted-foreground tabular-nums">
            {copy.tags.count(t.count)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- 가격 문장 ---------- */

function PriceSentences({ n }: { n: DetailNumbers }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="inline-flex items-baseline gap-1.5">
        <span className="type-label">{copy.numbers.price}</span>
        <span className="type-numeric-lg">{n.price.amount}</span>
        <span className="type-body-sm text-muted-foreground">
          {n.price.unit}
        </span>
        {n.price.estimate ? <EstimateMark /> : null}
      </p>
      {n.price.estimate ? (
        <p className="type-body break-keep text-muted-foreground">
          {copy.price.estimateBody(n.price.category)}
        </p>
      ) : (
        <p className="type-body break-keep">
          {copy.price.sentenceReport(n.price.reportCount, n.price.won)}{" "}
          {n.price.range
            ? copy.price.sentenceRange(
                formatWon(n.price.range.min),
                formatWon(n.price.range.max),
              )
            : null}
        </p>
      )}
    </div>
  );
}

/* ---------- 지금 ---------- */

function NowBlock({ detail }: { detail: PlaceDetail }) {
  const w = detail.place.waiting;
  return (
    <div className="flex flex-col gap-4">
      {w ? (
        <p className="flex items-center gap-2 type-body">
          <Hourglass
            aria-hidden
            className="size-4 text-muted-foreground"
            strokeWidth={1.5}
          />
          {badgeCopy.waitingReport(
            w.minutesAgo,
            badgeCopy.waitingLevels[w.level],
          )}
        </p>
      ) : null}
      {detail.deal ? (
        <div className="flex flex-col gap-1.5 border-l-2 border-border pl-4">
          <p className="flex items-center gap-2 type-body">
            <BadgePercent
              aria-hidden
              className="size-4 text-muted-foreground"
              strokeWidth={1.5}
            />
            {detail.deal.title}
          </p>
          <p className="type-caption text-muted-foreground tabular-nums">
            {copy.now.dealMeta(detail.deal.daysAgo, detail.deal.until)}
          </p>
          <p className="type-caption break-keep text-muted-foreground">
            {copy.now.dealNotice} {copy.now.dealNoScore}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- 후기 인용 ---------- */

function ReviewQuotes({ detail }: { detail: PlaceDetail }) {
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
    <div className="flex flex-col gap-7">
      {detail.reviews.map((r) => {
        const Thumb = r.thumb === "up" ? ThumbsUp : ThumbsDown;
        return (
          <figure
            key={r.id}
            className="flex flex-col gap-2 border-l-2 border-border pl-4"
          >
            <blockquote className="type-body break-keep">{r.text}</blockquote>
            <figcaption className="flex items-center gap-2 type-caption text-muted-foreground">
              <Thumb aria-hidden className="size-3.5" strokeWidth={1.5} />
              <span className="sr-only">
                {r.thumb === "up"
                  ? copy.reviews.thumbUp
                  : copy.reviews.thumbDown}
              </span>
              <span className="text-foreground">{r.nickname}</span>
              <span>{copy.reviews.visitMonth(r.visitMonth)}</span>
            </figcaption>
          </figure>
        );
      })}
      {detail.reviewTotal > detail.reviews.length ? (
        <button type="button" className={cn(btn.text, "self-start")}>
          {copy.reviews.more(detail.reviewTotal)}
        </button>
      ) : null}
    </div>
  );
}

/* ---------- 정보 ---------- */

function InfoRows({ detail }: { detail: PlaceDetail }) {
  const { place } = detail;
  return (
    <div className="flex flex-col">
      <dl className="flex flex-col border-t border-border">
        <div className="grid grid-cols-[4rem_1fr] gap-4 border-b border-border py-3">
          <dt className="type-caption leading-6 text-muted-foreground">
            {copy.info.address}
          </dt>
          <dd className="type-body-sm break-keep">{place.address}</dd>
        </div>
        <div className="grid grid-cols-[4rem_1fr] gap-4 border-b border-border py-3">
          <dt className="type-caption leading-6 text-muted-foreground">
            {copy.info.phone}
          </dt>
          <dd className="type-body-sm tabular-nums">
            <a
              href={`tel:${place.phone}`}
              className={cn(btn.text, "min-h-0 type-body-sm")}
            >
              {place.phone}
            </a>
          </dd>
        </div>
      </dl>
      <p className="pt-3 type-caption break-keep text-muted-foreground">
        {copy.info.naverNote}
      </p>
    </div>
  );
}

/* ---------- 스켈레톤 ---------- */

function SkeletonB() {
  return (
    <LoadingRegion
      label={copy.states.loading.label}
      className="flex flex-col pt-2 pb-10 desktop:max-w-[34rem] desktop:pt-6"
    >
      <h1 className="sr-only">{copy.container.sheetLabel}</h1>
      <Skeleton className="mb-3 size-[88px] rounded-full" />
      <SkeletonLine type="caption" className="w-10" />
      <SkeletonLine type="title" className="w-48" lineClassName="mt-1" />
      <SkeletonLine type="body" className="w-56" lineClassName="mt-4" />
      <SkeletonLine type="body-sm" className="w-60" lineClassName="mt-6" />
      <Skeleton className="mt-5 h-12 w-full rounded-button" />
      <div className="mt-5 flex gap-4">
        <SkeletonLine type="label" className="w-16" />
        <SkeletonLine type="label" className="w-10" />
        <SkeletonLine type="label" className="w-12" />
      </div>
      <SkeletonLine type="heading" className="w-32" lineClassName="mt-12" />
      <SkeletonLine type="body" className="w-full" lineClassName="mt-4" />
      <SkeletonLine type="body" className="w-2/3" />
      <SkeletonLine type="heading" className="w-28" lineClassName="mt-12" />
      <div className="mt-4 flex max-w-[18rem] flex-wrap gap-1.5">
        {Array.from({ length: 18 }, (_, i) => (
          <Skeleton key={i} className="size-3.5 rounded-full" />
        ))}
      </div>
    </LoadingRegion>
  );
}
