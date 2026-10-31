"use client";
// 나 탭 시안 B "달력" (T6.2).
//
// 의도: 한 달을 한눈에. 다녀온 날 칸에 그날 먹은 카테고리 그림(icon 22px)이 앉아 "이번 달 뭘 먹었나"가 그림으로 읽힌다.
//       날을 누르면 달력 바로 아래에 그날 기록이 열린다. 즐겨찾기, 다시 안 갈 곳, 내 후기는 개수가 붙은 "목록" 줄에서
//       하위 화면으로 들어가고, 그 아래에 지금 설정 줄이 그대로 이어진다(한 페이지 스크롤).
// - 달력: 일요일 시작 7칸. 기록이 있는 날만 버튼(키보드 정지점을 줄인다). 확인 전(후보) 날은 점선 원.
//         오늘은 날짜 밑줄, 고른 날은 1.5px primary 테두리(면 틴트 없음, DESIGN.md 선택 규칙).
// - 이전 달 버튼으로 9월, 다음 달은 이번 달이라 비활성.
// 데스크톱: 좌 달력과 목록 + 우 이번 달 다녀온 곳 지도(고른 날 핀 강조).
// 모션: 고른 날 테두리 fast, 날짜 상세 fade-in(base) + 4px 떠오름. 축소 모드면 즉시.
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { LoadingRegion, SkeletonLine } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { focusRing } from "@/components/ui/interaction";
import { meLabCopy as copy } from "@/copy/design-lab-me";
import { SettingsLinkRow, SettingsSection } from "@/features/me/parts";
import { CategoryIllustration } from "@/features/place/illustrations";
import { cn } from "@/lib/utils";
import {
  MOCK_TODAY,
  getMeData,
  monthGrid,
  sameDay,
  visitsOn,
  type MeData,
  type Visit,
  type Ymd,
} from "../mock";
import type { MeParams } from "../params";
import {
  AuthOffBlock,
  BlockList,
  FavoriteList,
  FirstVisit,
  MeError,
  MeHeader,
  MeScreen,
  NamesFailNote,
  OfflineBanner,
  ReviewList,
  SettingsBlock,
  SideMap,
  VisitRow,
  btn,
  effectiveVisit,
  mdw,
  useVisitAnswers,
  visitTitle,
  type VisitAnswers,
} from "../shared";

const BASE = "/design-lab/me/b";

export function MeB({ params }: { params: MeParams }) {
  const data = getMeData(params.namesFail);
  const offline = params.state === "offline";
  const empty = params.state === "empty";

  if (
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
          <AuthOffBlock preview={<PreviewB />} />
        </div>
      </MeScreen>
    );
  }

  return <MainB params={params} data={data} offline={offline} empty={empty} />;
}

function MainB({
  params,
  data,
  offline,
  empty,
}: {
  params: MeParams;
  data: MeData;
  offline: boolean;
  empty: boolean;
}) {
  const answers = useVisitAnswers();
  const [month, setMonth] = useState<{ y: number; m: number }>({
    y: MOCK_TODAY.y,
    m: MOCK_TODAY.m,
  });
  const visits = empty ? [] : data.visits;
  const inMonth = visits.filter(
    (x) => x.date.y === month.y && x.date.m === month.m,
  );
  const defaultDay = params.day ?? inMonth[0]?.date.d ?? MOCK_TODAY.d;
  const [selected, setSelected] = useState<Ymd>({
    y: MOCK_TODAY.y,
    m: MOCK_TODAY.m,
    d: defaultDay,
  });
  const dayVisits = visitsOn(visits, selected);
  const ready = params.state === "ready" || offline;

  const goMonth = (dir: -1 | 1) => {
    const m0 = month.m - 1 + dir;
    const next = {
      y: month.y + Math.floor(m0 / 12),
      m: (((m0 % 12) + 12) % 12) + 1,
    };
    setMonth(next);
    const first = visits.find(
      (x) => x.date.y === next.y && x.date.m === next.m,
    );
    setSelected(first ? first.date : { ...next, d: 1 });
  };

  const side = ready ? (
    <SideMap
      places={inMonth.map((x) => x.place)}
      activeId={dayVisits.find((x) => x.place.name)?.place.placeId ?? null}
    />
  ) : undefined;

  return (
    <MeScreen side={side}>
      <MeHeader eyebrow={copy.greeting(copy.nickname)} />
      {offline ? <OfflineBanner className="mt-6" /> : null}
      {params.namesFail && ready ? <NamesFailNote className="mt-6" /> : null}

      {params.state === "loading" ? (
        <SkeletonB />
      ) : params.state === "error" ? (
        <MeError className="mt-8" />
      ) : (
        <>
          <Calendar
            month={month}
            visits={visits}
            answers={answers}
            selected={selected}
            onSelect={setSelected}
            onMonth={goMonth}
          />
          {empty ? (
            <FirstVisit className="mt-10" />
          ) : (
            <DayDetail
              key={`${selected.m}-${selected.d}`}
              date={selected}
              visits={dayVisits}
              answers={answers}
              disabled={offline}
            />
          )}
        </>
      )}

      {params.state !== "error" && params.state !== "loading" ? (
        <SettingsSection title={copy.calendar.lists} className="mt-12">
          <SettingsLinkRow
            href={`${BASE}?view=favorites`}
            label={copy.places.favorites}
            value={copy.places.favoritesCount(
              empty ? 0 : data.favorites.length,
            )}
          />
          <SettingsLinkRow
            href={`${BASE}?view=blocklist`}
            label={copy.places.blocklist}
            value={copy.places.favoritesCount(
              empty ? 0 : data.blocklist.length,
            )}
          />
          <SettingsLinkRow
            href={`${BASE}?view=reviews`}
            label={copy.reviews.title}
            value={copy.reviews.count(empty ? 0 : data.reviews.length)}
          />
        </SettingsSection>
      ) : null}
      <SettingsBlock className="mt-10" />
    </MeScreen>
  );
}

/* ---------- 달력 ---------- */

function dayDetailLabel(visits: Visit[], answers: VisitAnswers): string {
  return visits
    .map((raw) => {
      const v = effectiveVisit(raw, answers);
      const state =
        raw.status === "candidate" && !answers.get(raw.id)
          ? copy.calendar.pendingMark
          : v.status === "not_visited"
            ? copy.rating.notVisited
            : v.rating
              ? copy.rating[v.rating]
              : copy.rating.none;
      return `${visitTitle(v)} ${copy.meal[v.meal]} ${state}`;
    })
    .join(", ");
}

function Calendar({
  month,
  visits,
  answers,
  selected,
  onSelect,
  onMonth,
}: {
  month: { y: number; m: number };
  visits: readonly Visit[];
  answers: VisitAnswers;
  selected: Ymd;
  onSelect: (d: Ymd) => void;
  onMonth: (dir: -1 | 1) => void;
}) {
  const cells = monthGrid(month.y, month.m);
  const isCurrent = month.y === MOCK_TODAY.y && month.m === MOCK_TODAY.m;
  const count = visits.filter(
    (x) =>
      x.date.y === month.y && x.date.m === month.m && x.status === "visited",
  ).length;
  return (
    <section aria-labelledby="b-month" className="mt-8 flex flex-col">
      <div className="flex items-center justify-between">
        <h2 id="b-month" className="type-heading tabular-nums">
          {copy.date.monthYear(month.y, month.m)}
        </h2>
        <div className="-mr-2.5 flex items-center">
          <button
            type="button"
            aria-label={copy.calendar.prev}
            onClick={() => onMonth(-1)}
            className={btn.ghostIcon}
          >
            <ChevronLeft aria-hidden className="size-5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            aria-label={copy.calendar.next}
            aria-disabled={isCurrent || undefined}
            onClick={isCurrent ? undefined : () => onMonth(1)}
            className={btn.ghostIcon}
          >
            <ChevronRight aria-hidden className="size-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div
        aria-hidden
        className="mt-4 grid grid-cols-7 text-center type-caption text-muted-foreground"
      >
        {copy.weekday.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <ol
        aria-label={copy.calendar.label(month.y, month.m)}
        className="mt-2 grid grid-cols-7 gap-y-1"
      >
        {cells.map((d, i) => {
          if (d === null) return <li key={`b${i}`} aria-hidden />;
          const date = { y: month.y, m: month.m, d };
          const day = visitsOn(visits, date);
          const isToday = sameDay(date, MOCK_TODAY);
          const isSel = sameDay(date, selected);
          const pending = day.some(
            (x) => x.status === "candidate" && !answers.get(x.id),
          );
          const first = day[0];
          const dayNum = (
            <span
              className={cn(
                "type-caption tabular-nums",
                isToday
                  ? "text-foreground underline decoration-foreground underline-offset-[3px]"
                  : day.length
                    ? "text-foreground"
                    : "text-muted-foreground",
              )}
            >
              {d}
            </span>
          );
          if (!first) {
            return (
              <li key={d} className="flex h-14 flex-col items-center pt-1">
                {dayNum}
              </li>
            );
          }
          return (
            <li key={d} className="flex">
              <button
                type="button"
                aria-pressed={isSel}
                onClick={() => onSelect(date)}
                className={cn(
                  "relative mx-auto flex h-14 w-full max-w-12 flex-col items-center gap-0.5 rounded-xl border pt-1 transition-colors duration-(--lm-duration-fast) motion-reduce:transition-none",
                  isSel
                    ? "[border-width:1.5px] border-primary"
                    : "border-transparent hover:bg-muted",
                  focusRing,
                )}
              >
                <span aria-hidden>{dayNum}</span>
                <span className="sr-only">
                  {copy.calendar.dayLabel(
                    mdw(date) + (isToday ? `, ${copy.calendar.today}` : ""),
                    dayDetailLabel(day, answers),
                  )}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "relative inline-flex size-7 items-center justify-center rounded-full",
                    pending && "border border-dashed border-muted-foreground",
                  )}
                >
                  {first.place.category && !pending ? (
                    <CategoryIllustration
                      slug={first.place.category}
                      size={26}
                    />
                  ) : (
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        pending ? "bg-transparent" : "bg-muted-foreground",
                      )}
                    />
                  )}
                  {day.length > 1 ? (
                    <span className="absolute -right-1 -bottom-0.5 size-1.5 rounded-full bg-foreground" />
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 type-caption text-muted-foreground">
        <span className="tabular-nums">
          {copy.calendar.monthCount(month.m, count)}
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-3 rounded-full border border-dashed border-muted-foreground"
          />
          {copy.calendar.legendPending}
        </span>
      </div>
    </section>
  );
}

function DayDetail({
  date,
  visits,
  answers,
  disabled,
}: {
  date: Ymd;
  visits: Visit[];
  answers: VisitAnswers;
  disabled: boolean;
}) {
  return (
    <section
      aria-labelledby="b-day"
      aria-live="polite"
      className="mt-8 flex animate-in flex-col duration-(--lm-duration-base) fade-in slide-in-from-bottom-1 motion-reduce:animate-none"
    >
      <h2 id="b-day" className="border-b border-border pb-2 type-label">
        {mdw(date)}
      </h2>
      {visits.length === 0 ? (
        <p className="py-5 type-body-sm text-muted-foreground">
          {copy.calendar.noVisit}
        </p>
      ) : (
        <ul className="flex flex-col">
          {visits.map((x) => (
            <VisitRow
              key={x.id}
              visit={x}
              answers={answers}
              date="none"
              glyph={48}
              disabled={disabled}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- 하위 화면 ---------- */

function SubPage({ params, data }: { params: MeParams; data: MeData }) {
  const offline = params.state === "offline";
  const empty = params.state === "empty";
  const title =
    params.view === "favorites"
      ? copy.places.favorites
      : params.view === "blocklist"
        ? copy.places.blocklist
        : copy.reviews.title;
  const side =
    params.view === "favorites" && params.state === "ready" ? (
      <SideMap places={data.favorites.map((x) => x.place)} />
    ) : undefined;
  return (
    <MeScreen side={side}>
      <MeHeader title={title} backHref={BASE} />
      <div className="mt-6 flex flex-col">
        {offline ? <OfflineBanner className="mb-6" /> : null}
        {params.namesFail ? <NamesFailNote className="mb-6" /> : null}
        {params.state === "loading" ? (
          <ListSkel />
        ) : params.state === "error" ? (
          <MeError />
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

/* ---------- 로딩, 미리보기 ---------- */

function ListSkel() {
  return (
    <LoadingRegion
      label={copy.states.loading}
      className="flex flex-col border-t border-border"
    >
      {Array.from({ length: 5 }, (_, i) => (
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

function SkeletonB() {
  return (
    <LoadingRegion label={copy.states.loading} className="mt-8 flex flex-col">
      <div className="flex items-center justify-between">
        <SkeletonLine type="heading" className="w-32" />
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="mt-6 grid grid-cols-7 gap-y-1">
        {Array.from({ length: 35 }, (_, i) => (
          <div key={i} className="flex h-14 flex-col items-center gap-1.5 pt-1">
            <Skeleton className="h-3 w-3.5" />
            {i % 3 === 1 ? <Skeleton className="size-6 rounded-full" /> : null}
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-col border-t border-border">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex min-h-18 items-center gap-4 border-b border-border py-3"
          >
            <Skeleton className="size-12 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1">
              <SkeletonLine type="label" className="w-28" />
              <SkeletonLine type="caption" className="w-20" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

/** 로그인 꺼짐 미리보기: 빈 달력 한 달(정적) */
function PreviewB() {
  const cells = monthGrid(MOCK_TODAY.y, MOCK_TODAY.m);
  const marks: Record<number, "hansik" | "gukbap" | "asian" | "ilsik"> = {
    6: "ilsik",
    13: "hansik",
    16: "gukbap",
    21: "hansik",
    28: "gukbap",
    29: "asian",
  };
  return (
    <div className="flex flex-col">
      <p className="type-heading">
        {copy.date.monthYear(MOCK_TODAY.y, MOCK_TODAY.m)}
      </p>
      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
        {cells.map((d, i) => (
          <span
            key={i}
            className="flex h-10 flex-col items-center type-caption text-muted-foreground"
          >
            {d ?? ""}
            {d && marks[d] ? (
              <CategoryIllustration slug={marks[d]} size={20} />
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}
