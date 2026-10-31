"use client";
// 나 탭 시안 C "이번 달 돌아보기" (T6.2).
//
// 의도: 나 탭 첫 화면은 목록이 아니라 조용한 한 달 요약이다. "10월의 점심" 세리프 제목 아래 숫자 3칸(다녀온 곳, 좋았어요 %,
//       자주 간 종류)과 자주 간 종류 막대 3줄. 그 아래 섹션마다 3개만 미리 보이고 "모두 보기"로 하위 화면에 들어간다.
//       기록은 최근 3줄, 즐겨찾기는 그림 타일 3개, 다시 안 갈 곳은 한 줄 요약, 내 후기는 최근 한 편 인용. 맨 아래 설정 줄.
// - 확인 전(후보) 방문은 요약 바로 아래 "확인하지 않은 방문 N곳" 블록으로 올려 한 탭으로 답하게 한다.
// - 숫자는 Pretendard 28px tabular(DESIGN.md 9장 Do). 👍 비율은 평가 3개부터(콜드 스타트와 같은 기준).
// 데스크톱: 좌 요약과 섹션 + 우 "내 지도"(즐겨찾기와 이번 달 다녀온 곳 핀).
// 모션: 막대가 0에서 채워짐(slow, CSS width), 섹션 fade-in. 축소 모드면 즉시.
import { useEffect, useState } from "react";
import Link from "next/link";
import { LoadingRegion, SkeletonLine } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { focusRing } from "@/components/ui/interaction";
import { meLabCopy as copy } from "@/copy/design-lab-me";
import { categoryLabel } from "@/features/place/categories";
import { CategoryIllustration } from "@/features/place/illustrations";
import { cn } from "@/lib/utils";
import {
  MOCK_TODAY,
  getMeData,
  groupByMonth,
  monthStats,
  type MeData,
  type MonthStats,
  type MyReview,
  type SavedPlace,
} from "../mock";
import type { MeParams } from "../params";
import {
  AuthOffBlock,
  BlockList,
  FavoriteList,
  FirstVisit,
  KakaoLink,
  MeError,
  MeHeader,
  MeScreen,
  MoreButton,
  NamesFailNote,
  OfflineBanner,
  PlaceGlyph,
  RatingMark,
  ReviewList,
  SectionHead,
  SettingsBlock,
  SideMap,
  VisitRow,
  btn,
  md,
  useVisitAnswers,
} from "../shared";

const BASE = "/design-lab/me/c";

function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return mounted;
}

export function MeC({ params }: { params: MeParams }) {
  const data = getMeData(params.namesFail);
  if (
    params.view === "history" ||
    params.view === "favorites" ||
    params.view === "blocklist" ||
    params.view === "reviews"
  ) {
    return <SubPage params={params} data={data} />;
  }
  if (params.authOff) {
    return (
      <MeScreen>
        <MeHeader />
        <div className="mt-8">
          <AuthOffBlock preview={<PreviewC />} />
        </div>
      </MeScreen>
    );
  }
  return <MainC params={params} data={data} />;
}

function MainC({ params, data }: { params: MeParams; data: MeData }) {
  const answers = useVisitAnswers();
  const offline = params.state === "offline";
  const empty = params.state === "empty";
  const ready = params.state === "ready" || offline;
  const visits = empty ? [] : data.visits;
  const stats = monthStats(visits, MOCK_TODAY.y, MOCK_TODAY.m);
  const pending = visits.filter((x) => x.status === "candidate");
  const recent = visits.filter((x) => x.status !== "candidate").slice(0, 3);

  const side = ready ? (
    <SideMap
      places={[
        ...data.favorites.map((x) => x.place),
        ...visits.filter((x) => x.date.m === MOCK_TODAY.m).map((x) => x.place),
      ]}
    />
  ) : undefined;

  return (
    <MeScreen side={side}>
      <MeHeader eyebrow={copy.greeting(copy.nickname)} />
      {offline ? <OfflineBanner className="mt-6" /> : null}
      {params.namesFail && ready ? <NamesFailNote className="mt-6" /> : null}

      {params.state === "loading" ? (
        <SkeletonC />
      ) : params.state === "error" ? (
        <MeError className="mt-8" />
      ) : (
        <>
          <Summary stats={stats} />
          {empty ? <FirstVisit className="mt-12" /> : null}

          {pending.length > 0 ? (
            <section
              aria-labelledby="c-pending"
              className="mt-10 flex flex-col"
            >
              <SectionHead
                id="c-pending"
                title={copy.confirm.pendingCount(pending.length)}
              />
              <ul className="flex flex-col border-t border-border">
                {pending.map((x) => (
                  <VisitRow
                    key={x.id}
                    visit={x}
                    answers={answers}
                    disabled={offline}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {recent.length > 0 ? (
            <section aria-labelledby="c-recent" className="mt-10 flex flex-col">
              <SectionHead
                id="c-recent"
                title={copy.history.recent}
                aside={
                  <Link href={`${BASE}?view=history`} className={btn.text}>
                    {copy.history.all}
                  </Link>
                }
              />
              <ul className="flex flex-col border-t border-border">
                {recent.map((x) => (
                  <VisitRow key={x.id} visit={x} answers={answers} />
                ))}
              </ul>
            </section>
          ) : null}

          {!empty ? (
            <>
              <FavoriteTiles items={data.favorites} />
              <section
                aria-labelledby="c-block"
                className="mt-10 flex flex-col"
              >
                <SectionHead id="c-block" title={copy.places.blocklist} />
                <div className="flex min-h-14 items-center justify-between gap-4 border-y border-border py-2">
                  <p className="type-body-sm break-keep">
                    {copy.places.blockSummary(data.blocklist.length)}
                  </p>
                  <Link
                    href={`${BASE}?view=blocklist`}
                    aria-label={`${copy.places.blocklist} ${copy.places.manage}`}
                    className={cn(btn.small, "shrink-0")}
                  >
                    {copy.places.manage}
                  </Link>
                </div>
              </section>
              {data.reviews[0] ? (
                <LatestReview
                  review={data.reviews[0]}
                  total={data.reviews.length}
                />
              ) : null}
            </>
          ) : null}
        </>
      )}

      <SettingsBlock className="mt-14" />
    </MeScreen>
  );
}

/* ---------- 요약 ---------- */

function Summary({ stats }: { stats: MonthStats }) {
  const mounted = useMounted();
  const top = stats.topCategories[0];
  const max = Math.max(1, ...stats.topCategories.map((c) => c.count));
  return (
    <section aria-labelledby="c-month" className="mt-8 flex flex-col">
      <h2 id="c-month" className="type-heading">
        {copy.summary.title(MOCK_TODAY.m)}
      </h2>
      {stats.visited > 0 ? (
        <p className="mt-2 type-body-sm break-keep text-muted-foreground">
          {copy.summary.sentence(stats.visited, stats.up)}
        </p>
      ) : null}

      <dl className="mt-6 grid grid-cols-[0.9fr_1fr_1.1fr] border-y border-border">
        <div className="flex flex-col gap-1.5 py-4 pr-3">
          <dt className="type-caption text-muted-foreground">
            {copy.summary.visits}
          </dt>
          <dd className="flex items-baseline gap-0.5 whitespace-nowrap">
            <span className="type-numeric-lg tabular-nums">
              {stats.visited}
            </span>
            <span className="type-caption">{copy.summary.visitsUnit}</span>
          </dd>
        </div>
        <div className="flex flex-col gap-1.5 border-l border-border px-3 py-4">
          <dt className="type-caption text-muted-foreground">
            {copy.summary.thumbs}
          </dt>
          <dd className="flex items-baseline gap-0.5 whitespace-nowrap">
            {stats.upRate !== null ? (
              <>
                <span className="type-numeric-lg tabular-nums">
                  {stats.upRate}
                </span>
                <span className="type-caption">{copy.summary.thumbsUnit}</span>
              </>
            ) : (
              <span className="pt-2 type-caption text-muted-foreground">
                {copy.summary.thumbsFew}
              </span>
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-1.5 border-l border-border py-4 pl-3">
          <dt className="type-caption text-muted-foreground">
            {copy.summary.top}
          </dt>
          <dd className="flex min-w-0 items-center gap-1.5">
            {top ? (
              <>
                <CategoryIllustration slug={top.slug} size={28} />
                <span className="truncate type-label">
                  {categoryLabel(top.slug)}
                </span>
              </>
            ) : (
              <span className="pt-2 type-caption text-muted-foreground">
                {copy.summary.topNone}
              </span>
            )}
          </dd>
        </div>
      </dl>

      {stats.topCategories.length > 0 ? (
        <div className="mt-6 flex flex-col gap-3">
          <h3 className="type-caption text-muted-foreground">
            {copy.summary.categories}
          </h3>
          <ul className="flex flex-col gap-2.5">
            {stats.topCategories.map((c) => (
              <li
                key={c.slug}
                className="grid grid-cols-[1.75rem_6.5rem_1fr_1.5rem] items-center gap-3"
              >
                <CategoryIllustration slug={c.slug} size={28} />
                <span className="truncate type-body-sm">
                  {categoryLabel(c.slug)}
                </span>
                <span
                  role="img"
                  aria-label={copy.summary.categoryCount(
                    categoryLabel(c.slug),
                    c.count,
                  )}
                  className="h-1.5 overflow-hidden rounded-full bg-vote-bar-track"
                >
                  <span
                    className="block h-full rounded-full bg-chart-3 transition-[width] duration-(--lm-duration-slow) ease-enter motion-reduce:transition-none"
                    style={{
                      width: mounted ? `${(c.count / max) * 100}%` : "0%",
                    }}
                  />
                </span>
                <span
                  aria-hidden
                  className="text-right type-caption text-muted-foreground tabular-nums"
                >
                  {c.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/* ---------- 즐겨찾기 타일 ---------- */

function FavoriteTiles({ items }: { items: readonly SavedPlace[] }) {
  const shown = items.slice(0, 3);
  return (
    <section aria-labelledby="c-fav" className="mt-10 flex flex-col">
      <SectionHead
        id="c-fav"
        title={copy.places.favorites}
        aside={
          <Link href={`${BASE}?view=favorites`} className={btn.text}>
            {copy.places.all(items.length)}
          </Link>
        }
      />
      <ul className="grid grid-cols-3 gap-2">
        {shown.map((item, i) => {
          const title = item.place.name ?? copy.unresolved.saved(i + 1);
          return (
            <li key={item.place.placeId} className="flex">
              {item.place.name ? (
                <button
                  type="button"
                  className={cn(
                    "flex w-full flex-col items-start gap-2 rounded-card border border-border bg-card p-3 text-left transition-colors duration-(--lm-duration-fast) hover:bg-muted motion-reduce:transition-none",
                    focusRing,
                  )}
                >
                  <PlaceGlyph place={item.place} size={48} />
                  <span className="line-clamp-2 type-label break-keep">
                    {title}
                  </span>
                  <span className="type-caption text-muted-foreground">
                    {item.lastVisit ? md(item.lastVisit) : copy.places.noVisit}
                  </span>
                </button>
              ) : (
                <div className="flex w-full flex-col items-start gap-2 rounded-card border border-dashed border-input p-3">
                  <PlaceGlyph place={item.place} size={48} />
                  <span className="line-clamp-2 type-label text-muted-foreground">
                    {title}
                  </span>
                  <KakaoLink place={item.place} label={title} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------- 내 후기 한 편 ---------- */

function LatestReview({ review, total }: { review: MyReview; total: number }) {
  const name = review.place.name ?? copy.unresolved.review(md(review.date));
  return (
    <section aria-labelledby="c-review" className="mt-10 flex flex-col">
      <SectionHead
        id="c-review"
        title={copy.reviews.title}
        aside={
          <Link href={`${BASE}?view=reviews`} className={btn.text}>
            {copy.reviews.all(total)}
          </Link>
        }
      />
      <figure className="flex flex-col gap-2 border-l border-border pl-4">
        <blockquote className="type-body break-keep">
          {review.text ?? copy.reviews.noText}
        </blockquote>
        <figcaption className="flex flex-wrap items-center gap-x-3 type-caption text-muted-foreground">
          <span className="text-foreground">{name}</span>
          <span className="tabular-nums">{md(review.date)}</span>
          <RatingMark rating={review.rating} />
        </figcaption>
      </figure>
    </section>
  );
}

/* ---------- 하위 화면 ---------- */

function SubPage({ params, data }: { params: MeParams; data: MeData }) {
  const offline = params.state === "offline";
  const empty = params.state === "empty";
  const title =
    params.view === "history"
      ? copy.history.title
      : params.view === "favorites"
        ? copy.places.favorites
        : params.view === "blocklist"
          ? copy.places.blocklist
          : copy.reviews.title;
  const side =
    params.state === "ready" && params.view === "favorites" ? (
      <SideMap places={data.favorites.map((x) => x.place)} />
    ) : undefined;
  return (
    <MeScreen side={side}>
      <MeHeader title={title} backHref={BASE} />
      <div className="mt-6 flex flex-col">
        {offline ? <OfflineBanner className="mb-6" /> : null}
        {params.namesFail ? <NamesFailNote className="mb-6" /> : null}
        {params.state === "loading" ? (
          <RowsSkel rows={6} />
        ) : params.state === "error" ? (
          <MeError />
        ) : params.view === "history" ? (
          empty ? (
            <FirstVisit />
          ) : (
            <HistoryByMonth
              data={data}
              initialMore={params.more}
              disabled={offline}
            />
          )
        ) : params.view === "favorites" ? (
          <FavoriteList
            items={empty ? [] : data.favorites}
            limit={8}
            initialMore={params.more}
            disabled={offline}
          />
        ) : params.view === "blocklist" ? (
          <BlockList items={empty ? [] : data.blocklist} disabled={offline} />
        ) : (
          <ReviewList
            reviews={empty ? [] : data.reviews}
            limit={5}
            initialMore={params.more}
            disabled={offline}
          />
        )}
      </div>
    </MeScreen>
  );
}

function HistoryByMonth({
  data,
  initialMore,
  disabled,
}: {
  data: MeData;
  initialMore: boolean;
  disabled: boolean;
}) {
  const answers = useVisitAnswers();
  const [more, setMore] = useState(initialMore);
  const groups = groupByMonth(data.visits);
  const shown = more ? groups : groups.slice(0, 1);
  return (
    <div className="flex flex-col">
      {shown.map((g, i) => (
        <section
          key={`${g.y}-${g.m}`}
          aria-labelledby={`c-m-${g.m}`}
          className={cn("flex flex-col", i > 0 && "mt-10")}
        >
          <SectionHead
            id={`c-m-${g.m}`}
            title={copy.date.month(g.m)}
            aside={
              <span className="type-caption text-muted-foreground tabular-nums">
                {copy.history.count(g.visits.length)}
              </span>
            }
          />
          <ul className="flex flex-col border-t border-border">
            {g.visits.map((x) => (
              <VisitRow
                key={x.id}
                visit={x}
                answers={answers}
                disabled={disabled}
              />
            ))}
          </ul>
        </section>
      ))}
      {more ? (
        <p className="mt-6 type-caption text-muted-foreground">
          {copy.history.end}
        </p>
      ) : (
        <MoreButton
          label={copy.history.more}
          onClick={() => setMore(true)}
          className="mt-6"
        />
      )}
    </div>
  );
}

/* ---------- 로딩, 미리보기 ---------- */

function RowsSkel({ rows }: { rows: number }) {
  return (
    <LoadingRegion
      label={copy.states.loading}
      className="flex flex-col border-t border-border"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex min-h-18 items-center gap-4 border-b border-border py-3"
        >
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1">
            <SkeletonLine type="label" className={i % 2 ? "w-24" : "w-32"} />
            <SkeletonLine type="caption" className="w-28" />
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}

function SkeletonC() {
  return (
    <LoadingRegion label={copy.states.loading} className="mt-8 flex flex-col">
      <SkeletonLine type="heading" className="w-36" />
      <SkeletonLine type="body-sm" className="mt-2 w-60" />
      <div className="mt-6 grid grid-cols-3 border-y border-border">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col gap-2 py-4",
              i > 0 && "border-l border-border pl-3",
            )}
          >
            <SkeletonLine type="caption" className="w-12" />
            <SkeletonLine type="numeric-lg" className="w-14" />
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-1.5 flex-1 rounded-full" />
          </div>
        ))}
      </div>
      <div className="mt-10">
        <RowsSkel rows={3} />
      </div>
    </LoadingRegion>
  );
}

/** 로그인 꺼짐 미리보기: 요약 숫자 3칸(정적) */
function PreviewC() {
  return (
    <div className="flex flex-col">
      <p className="type-heading">{copy.summary.title(MOCK_TODAY.m)}</p>
      <div className="mt-4 grid grid-cols-3 border-y border-border">
        <span className="flex flex-col gap-1 py-3">
          <span className="type-caption text-muted-foreground">
            {copy.summary.visits}
          </span>
          <span className="type-numeric-lg tabular-nums">12</span>
        </span>
        <span className="flex flex-col gap-1 border-l border-border py-3 pl-3">
          <span className="type-caption text-muted-foreground">
            {copy.summary.thumbs}
          </span>
          <span className="type-numeric-lg tabular-nums">83</span>
        </span>
        <span className="flex flex-col gap-1 border-l border-border py-3 pl-3">
          <span className="type-caption text-muted-foreground">
            {copy.summary.top}
          </span>
          <CategoryIllustration slug="hansik" size={28} />
        </span>
      </div>
    </div>
  );
}
