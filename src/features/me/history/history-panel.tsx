"use client";
// 나 탭 "기록" 패널 (T6.13, HIS-01, D-12 안건 2, 3, 4, 7, 10, DESIGN.md 5장 "나 탭").
// - 맨 위 이번 달 숫자 한 줄(다녀온 횟수, 좋았어요 %, 자주 간 종류). 평가 3개 미만이면 문장, 이번 달 0건이면 숨김.
// - 월요일 시작 주 묶음(머리줄 sticky), 줄마다 날짜 칸, 그림, 이름(누르면 상세), 끼니와 출처, 내 평가.
// - 확인 전 방문은 줄 아래 세 답(👍, 👎, 안 갔어요). 방문 후 14일(canAnswerLate)이 지나면 답 없이 기록만.
//   답은 선호도와 식당 집계에 들어간다(T6.11 저장 함수). 답한 줄은 떠날 때까지 결과 한 줄을 남긴다.
// - 처음 2주, "지난 기록 더 보기"로 2주씩. 가장 오래된 방문일(myOldestVisitAction)로 끝을 안다.
//   빈 2주가 이어지면 기록이 나올 때까지 이어서 받는다(무한 스크롤 없음).
// - 맨 아래 "설정" 줄(안건 1). 오류 상태에서도 남는다.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ErrorState,
  LoadingRegion,
  OfflineState,
  SkeletonLine,
} from "@/components/states";
import { buttonClass } from "@/components/ui/button-classes";
import { toast } from "@/components/ui/lazy-toaster";
import { Skeleton } from "@/components/ui/skeleton";
import { historyCopy as copy } from "@/copy/history";
import { moderationCopy } from "@/copy/moderation";
import {
  markNotVisitedAction,
  rateVisitAction,
} from "@/features/feedback/actions";
import {
  canAnswerLate,
  type MyVisit,
} from "@/features/feedback/feedback-target";
import {
  HISTORY_PAGE_DAYS,
  useMyVisitHistory,
  useMyVisits,
} from "@/features/feedback/use-my-records";
import { categoryLabel } from "@/features/place/categories";
import { CategoryIllustration } from "@/features/place/illustrations";
import { placeLinkFor } from "@/features/place/resolve-place-names";
import { SettingsLinkRow } from "@/features/me/parts";
import { track } from "@/lib/analytics";
import { dbKeys, invalidateAfterWrite } from "@/lib/query/db-keys";
import type { WriteFailure } from "@/lib/supabase/write-result";
import { kstDateKey } from "@/lib/time";
import { cn } from "@/lib/utils";
import { myOldestVisitAction } from "./actions";
import { useDetailEntry, type OfficeAnchor } from "./detail-entry";
import { useMeMap, type MeMapPin } from "./me-map-store";
import {
  groupVisitsByWeek,
  hasOlderVisits,
  monthRange,
  summarizeMonth,
  visitFallbackName,
  weekRangeLabel,
  weekTitle,
  weekdayLabel,
  parseDateKey,
  type MonthSummary,
} from "./model";
import {
  MetaLine,
  MoreButton,
  NamesFailNote,
  OfflineBanner,
  PlaceGlyph,
  PlaceName,
  RatingMark,
  btn,
  toRowPlace,
  useOfflineGuard,
  type RowPlace,
} from "./parts";
import { useRecordNames } from "./use-record-names";

type Answer = "up" | "down" | "no";

export const oldestVisitKey = [...dbKeys.myVisitsAll, "oldest"] as const;

function errorTitle(f: WriteFailure): string {
  if (f.error === "limit" || f.error === "cooldown")
    return copy.states.saveError;
  return moderationCopy.errors[f.error]?.title ?? copy.states.saveError;
}

export function HistoryPanel({
  now,
  office,
  offline,
}: {
  now: Date;
  office: OfficeAnchor | null;
  offline: boolean;
}) {
  const client = useQueryClient();
  const todayKey = kstDateKey(now);
  const oldest = useQuery({
    queryKey: oldestVisitKey,
    queryFn: () => myOldestVisitAction(),
    staleTime: 60_000,
  });
  const hist = useMyVisitHistory(now);
  const range = useMemo(() => monthRange(todayKey), [todayKey]);
  const month = useMyVisits(range);

  const visits = useMemo(
    () => hist.data?.pages.flatMap((p) => (p.signedIn ? p.visits : [])) ?? [],
    [hist.data],
  );
  const pages = hist.data?.pages.length ?? 0;
  const oldestKey =
    oldest.data && oldest.data.signedIn ? oldest.data.oldest : undefined;
  const more =
    oldestKey === undefined
      ? hist.hasNextPage
      : hasOlderVisits(oldestKey, todayKey, pages, HISTORY_PAGE_DAYS) &&
        hist.hasNextPage;

  // 기록이 나올 때까지 이어서 받기: 처음(0건)과 "더 보기"를 누른 뒤
  const [seekFrom, setSeekFrom] = useState(0);
  const { isFetchingNextPage, fetchNextPage } = hist;
  const seeking = !!hist.data && visits.length <= seekFrom && more;
  useEffect(() => {
    if (seeking && !isFetchingNextPage) void fetchNextPage();
  }, [seeking, isFetchingNextPage, fetchNextPage]);

  const monthVisits = useMemo(
    () => (month.data?.signedIn ? month.data.visits : []),
    [month.data],
  );
  const refs = useMemo(() => {
    const seen = new Map<
      string,
      { placeId: string; placeUrl: string | null }
    >();
    for (const v of [...visits, ...monthVisits]) {
      if (!seen.has(v.placeId))
        seen.set(v.placeId, { placeId: v.placeId, placeUrl: v.placeUrl });
    }
    return [...seen.values()];
  }, [visits, monthVisits]);
  const names = useRecordNames(refs, office?.position ?? null, "me_history");

  const summary = useMemo(
    () => summarizeMonth(monthVisits, todayKey, names.categoryOf),
    [monthVisits, todayKey, names],
  );
  const groups = useMemo(
    () => groupVisitsByWeek(visits, todayKey),
    [visits, todayKey],
  );

  // 데스크톱 우측 지도: 이번 주 다녀온 곳(이름을 아는 곳만)
  const setPins = useMeMap((s) => s.setPins);
  const thisWeek = groups[0]?.kind === "this" ? groups[0] : undefined;
  useEffect(() => {
    const pins: MeMapPin[] = [];
    const seen = new Set<string>();
    for (const v of thisWeek?.visits ?? []) {
      const r = names.get(v.placeId);
      if (v.status === "not_visited" || r?.status !== "resolved") continue;
      if (seen.has(v.placeId)) continue;
      seen.add(v.placeId);
      pins.push({
        id: v.placeId,
        name: r.place.name,
        position: r.place.position,
      });
    }
    setPins(pins);
  }, [thisWeek, names, setPins]);

  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [busy, setBusy] = useState<Record<string, true>>({});
  const guard = useOfflineGuard(offline);

  const answer = async (visit: MyVisit, a: Answer) => {
    if (busy[visit.id]) return;
    setBusy((b) => ({ ...b, [visit.id]: true }));
    const result =
      a === "no"
        ? await markNotVisitedAction({ visitId: visit.id })
        : await rateVisitAction({ visitId: visit.id, rating: a });
    setBusy((b) => {
      const next = { ...b };
      delete next[visit.id];
      return next;
    });
    if (!result.ok) {
      void toast.error(errorTitle(result));
      return;
    }
    setAnswers((s) => ({ ...s, [visit.id]: a }));
    track({
      name: "feedback_submitted",
      properties: {
        rating: a === "no" ? "not_visited" : a,
        has_price: false,
        tag_count: 0,
        has_review: false,
      },
    });
    void invalidateAfterWrite(client, "review", visit.placeId);
  };

  const settingsRow = (
    <ul className="mt-12 flex flex-col border-y border-border">
      <SettingsLinkRow
        href="/me/settings"
        label={copy.history.settingsRow}
        value={copy.history.settingsValue}
      />
    </ul>
  );

  if (hist.isError && !hist.data) {
    return (
      <>
        <ErrorState
          className="pt-4"
          title={copy.states.error.title}
          body={copy.states.error.body}
          action={{
            onClick: () => {
              void hist.refetch();
              void oldest.refetch();
            },
          }}
        />
        {settingsRow}
      </>
    );
  }
  if (offline && !hist.data) {
    return (
      <>
        <OfflineState className="pt-4" />
        {settingsRow}
      </>
    );
  }
  if (hist.isPending || (oldest.isPending && !oldest.isError)) {
    return <HistorySkeleton />;
  }

  const empty = visits.length === 0 && !more;
  if (visits.length === 0 && !empty) return <HistorySkeleton />;

  return (
    <>
      {offline ? <OfflineBanner className="mb-6" /> : null}
      {empty ? (
        <FirstVisit />
      ) : (
        <>
          {names.allFailed ? <NamesFailNote className="mb-6" /> : null}
          {summary ? (
            <MonthNumbers summary={summary} namesPending={names.pending} />
          ) : null}
          <div className="flex flex-col">
            <h2 className="sr-only">{copy.history.listLabel}</h2>
            {groups.map((g, gi) => (
              <section
                key={g.key}
                aria-labelledby={`me-week-${g.key}`}
                className={cn(
                  "flex animate-in flex-col duration-(--lm-duration-base) fade-in motion-reduce:animate-none",
                  gi > 0 && "mt-8",
                )}
              >
                <div className="sticky top-0 z-[1] flex min-h-11 items-end justify-between gap-3 border-b border-border bg-background pb-2">
                  <h3
                    id={`me-week-${g.key}`}
                    className="flex min-w-0 flex-wrap items-baseline gap-x-2"
                  >
                    <span className="type-label">{weekTitle(g)}</span>
                    {g.kind !== "older" ? (
                      <span className="type-caption text-muted-foreground">
                        {weekRangeLabel(g)}
                      </span>
                    ) : null}
                  </h3>
                  <span className="shrink-0 type-caption text-muted-foreground tabular-nums">
                    {copy.history.count(g.visits.length)}
                  </span>
                </div>
                <ul className="flex flex-col">
                  {g.visits.map((v, i) => (
                    <VisitRow
                      key={v.id}
                      visit={v}
                      now={now}
                      place={toRowPlace(
                        v.placeId,
                        names.get(v.placeId),
                        placeLinkFor(v),
                      )}
                      namesPending={names.pending}
                      sameDayAsPrev={
                        i > 0 && g.visits[i - 1]!.visitedOn === v.visitedOn
                      }
                      answer={answers[v.id]}
                      busy={busy[v.id] === true}
                      offline={offline}
                      onAnswer={(a) => guard(() => void answer(v, a))()}
                    />
                  ))}
                </ul>
              </section>
            ))}
            {more ? (
              <MoreButton
                label={copy.history.more}
                busy={seeking || isFetchingNextPage}
                onClick={() => setSeekFrom(visits.length)}
              />
            ) : (
              <p className="mt-6 type-caption text-muted-foreground">
                {copy.history.end}
              </p>
            )}
            {seeking ? (
              <span role="status" className="sr-only">
                {copy.history.loadingMore}
              </span>
            ) : null}
          </div>
        </>
      )}
      {settingsRow}
    </>
  );
}

/* ---------- 이번 달 숫자 (C에서 옮김) ---------- */

function MonthNumbers({
  summary,
  namesPending,
}: {
  summary: MonthSummary;
  namesPending: boolean;
}) {
  const s = summary;
  return (
    <section aria-labelledby="me-month" className="mb-8 flex flex-col gap-2">
      <h2 id="me-month" className="type-caption text-muted-foreground">
        {copy.summary.title(s.month)}
      </h2>
      {s.upRate === null ? (
        <p className="border-y border-border py-4 type-body-sm break-keep text-muted-foreground">
          {copy.summary.sentence(s.visited, s.up)}
        </p>
      ) : (
        <dl className="grid grid-cols-[0.9fr_1fr_1.1fr] border-y border-border">
          <div className="flex min-w-0 flex-col gap-1.5 py-4 pr-3">
            <dt className="type-caption text-muted-foreground">
              {copy.summary.visits}
            </dt>
            <dd className="flex items-baseline gap-0.5 whitespace-nowrap">
              <span className="type-numeric-lg tabular-nums">{s.visited}</span>
              <span className="type-caption">{copy.summary.visitsUnit}</span>
            </dd>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5 border-l border-border px-3 py-4">
            <dt className="type-caption text-muted-foreground">
              {copy.summary.thumbs}
            </dt>
            <dd className="flex items-baseline gap-0.5 whitespace-nowrap">
              <span className="type-numeric-lg tabular-nums">{s.upRate}</span>
              <span className="type-caption">{copy.summary.thumbsUnit}</span>
            </dd>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5 border-l border-border py-4 pl-3">
            <dt className="truncate type-caption text-muted-foreground">
              {copy.summary.top}
            </dt>
            <dd className="flex min-h-9 min-w-0 items-center gap-1.5">
              {s.topCategory ? (
                <>
                  <CategoryIllustration slug={s.topCategory} size={20} />
                  <span className="truncate type-label">
                    {categoryLabel(s.topCategory)}
                  </span>
                </>
              ) : namesPending ? (
                <Skeleton className="h-4 w-16 rounded-full" />
              ) : (
                <span className="type-caption text-muted-foreground">
                  {copy.summary.topNone}
                </span>
              )}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

/* ---------- 기록 한 줄 ---------- */

function VisitRow({
  visit,
  now,
  place,
  namesPending,
  sameDayAsPrev,
  answer,
  busy,
  offline,
  onAnswer,
}: {
  visit: MyVisit;
  now: Date;
  place: RowPlace;
  namesPending: boolean;
  sameDayAsPrev: boolean;
  answer: Answer | undefined;
  busy: boolean;
  offline: boolean;
  onAnswer: (a: Answer) => void;
}) {
  const entry = useDetailEntry();
  const wasCandidate = visit.status === "candidate" || answer !== undefined;
  const notVisited =
    answer === "no" || (answer === undefined && visit.status === "not_visited");
  const rating =
    answer === "up" || answer === "down"
      ? answer
      : (visit.review?.rating ?? null);
  const fallback = visitFallbackName(visit);
  const day = parseDateKey(visit.visitedOn)?.d ?? "";
  const meta: string[] = [];
  // 이름을 못 찾으면 대체 이름에 날짜와 끼니가 이미 들어 있다
  if (place.name || namesPending) meta.push(copy.meal[visit.meal]);
  meta.push(copy.source[visit.source]);
  const askable =
    visit.status === "candidate" &&
    answer === undefined &&
    canAnswerLate(visit, now);
  const name = place.name ?? fallback;

  return (
    <li className="flex flex-col gap-2 border-b border-border py-3">
      <div className="flex min-h-12 items-center gap-4">
        <span className="flex w-8 shrink-0 flex-col items-center">
          <span
            className={cn(
              "flex flex-col items-center",
              sameDayAsPrev && "sr-only",
            )}
          >
            <span className="block type-numeric-md tabular-nums">{day}</span>
            <span className="block type-caption text-muted-foreground">
              {weekdayLabel(visit.visitedOn)}
            </span>
          </span>
        </span>
        {place.name ? (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={() => entry.openPlace(place)}
            onPointerEnter={entry.preload}
            className="shrink-0 rounded-full"
          >
            <PlaceGlyph
              place={place}
              pending={namesPending}
              className={cn(notVisited && "opacity-50")}
            />
          </button>
        ) : (
          <PlaceGlyph
            place={place}
            pending={namesPending}
            className={cn(notVisited && "opacity-50")}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <PlaceName
            place={place}
            fallback={fallback}
            pending={namesPending}
            onOpen={entry.openPlace}
            onPreload={entry.preload}
            className={cn(notVisited && "text-muted-foreground")}
          />
          <MetaLine parts={meta} />
        </div>
        {visit.status === "candidate" && answer === undefined ? (
          <span className="shrink-0 rounded-badge border border-dashed border-input px-2 py-0.5 type-caption text-muted-foreground">
            {copy.confirm.pending}
          </span>
        ) : (
          <RatingMark
            rating={rating}
            notVisited={notVisited}
            className="shrink-0"
          />
        )}
      </div>
      {wasCandidate && answer !== undefined ? (
        <p
          role="status"
          className="animate-in pl-12 type-caption text-muted-foreground duration-(--lm-duration-fast) fade-in motion-reduce:animate-none"
        >
          {answer === "no" ? copy.confirm.thanksNo : copy.confirm.thanks}
        </p>
      ) : askable ? (
        <div
          role="group"
          aria-label={copy.confirm.ask(name)}
          aria-busy={busy || undefined}
          className="flex items-center gap-2 pl-12"
        >
          <span className="mr-auto type-body-sm">{copy.confirm.title}</span>
          <button
            type="button"
            aria-label={copy.confirm.up}
            aria-disabled={offline || busy || undefined}
            onClick={() => onAnswer("up")}
            className={btn.round}
          >
            <ThumbsUp
              aria-hidden
              className="size-[1.125rem]"
              strokeWidth={1.5}
            />
          </button>
          <button
            type="button"
            aria-label={copy.confirm.down}
            aria-disabled={offline || busy || undefined}
            onClick={() => onAnswer("down")}
            className={btn.round}
          >
            <ThumbsDown
              aria-hidden
              className="size-[1.125rem]"
              strokeWidth={1.5}
            />
          </button>
          <button
            type="button"
            aria-disabled={offline || busy || undefined}
            onClick={() => onAnswer("no")}
            className={cn(btn.text, "ml-1")}
          >
            {copy.confirm.no}
          </button>
        </div>
      ) : null}
    </li>
  );
}

/* ---------- 상태 ---------- */

export function HistorySkeleton() {
  return (
    <LoadingRegion label={copy.states.loading} className="flex flex-col">
      {[3, 4].map((rows, gi) => (
        <div key={gi} className={cn("flex flex-col", gi > 0 && "mt-8")}>
          <div className="flex min-h-11 items-end justify-between border-b border-border pb-2">
            <SkeletonLine type="label" className="w-28" />
            <SkeletonLine type="caption" className="w-8" />
          </div>
          {Array.from({ length: rows }, (_, i) => (
            <div
              key={i}
              className="flex min-h-18 items-center gap-4 border-b border-border py-3"
            >
              <span className="flex w-8 flex-col items-center gap-1">
                <Skeleton className="h-4 w-5" />
                <Skeleton className="h-3 w-3" />
              </span>
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <SkeletonLine
                  type="label"
                  className={i % 2 ? "w-24" : "w-32"}
                />
                <SkeletonLine type="caption" className="w-28" />
              </div>
              <Skeleton className="size-4 rounded-full" />
            </div>
          ))}
        </div>
      ))}
    </LoadingRegion>
  );
}

/**
 * 첫 방문 빈 상태: 점선 위 그릇 세 개 + 쌓이는 방법 3단계 + 오늘 추천으로(이 화면의 유일한 primary).
 * 그림은 카테고리 일러스트(icon 변형)라 번들 증가가 없다.
 */
function FirstVisit() {
  return (
    <section
      aria-labelledby="me-first-visit"
      className="flex animate-in flex-col duration-(--lm-duration-slow) fade-in motion-reduce:animate-none"
    >
      <div aria-hidden className="relative flex h-16 items-center gap-6">
        <span className="absolute top-1/2 right-0 left-0 border-t border-dashed border-input" />
        {(["hansik", "gukbap", "salad"] as const).map((slug) => (
          <span key={slug} className="relative rounded-full bg-background">
            <CategoryIllustration slug={slug} size={56} />
          </span>
        ))}
      </div>
      <h2 id="me-first-visit" className="mt-6 type-heading break-keep">
        {copy.states.empty.title}
      </h2>
      <p className="mt-2 type-body-sm break-keep text-muted-foreground">
        {copy.states.empty.body}
      </p>
      <ol className="mt-5 flex flex-col gap-3">
        {copy.states.empty.steps.map((s, i) => (
          <li
            key={s}
            className="flex items-start gap-3 type-body-sm break-keep"
          >
            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border type-caption tabular-nums">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
      <p className="mt-6 type-body-sm">{copy.states.empty.ask}</p>
      <Link
        href="/today"
        className={cn(buttonClass("primary"), "mt-3 self-start")}
      >
        {copy.states.empty.cta}
      </Link>
    </section>
  );
}
