"use client";
// 나 탭 시안 A "기록 일지" (T6.2).
//
// 의도: 나 탭을 열면 바로 "내가 어디서 먹었나"가 주간 일지로 보인다. 세 갈래(기록, 장소, 후기)를 위 밑줄 탭으로 나누고
//       설정은 머리줄 오른쪽 "설정" 버튼 뒤 하위 화면으로 뺀다. 날마다 한 줄, 왼쪽 날짜 칸이 리듬을 만든다.
// - 기록: 월요일 시작 주 단위 묶음(이번 주, 지난주, 날짜 범위), 묶음 머리줄이 스크롤 중 위에 붙는다.
//         길찾기만 누른 곳(후보)은 그 줄 아래 "다녀오셨나요?" 세 답을 바로 단다.
//         처음엔 두 주만, "지난 기록 더 보기"로 나머지(실제는 다음 페이지 요청).
// - 장소: 즐겨찾기(별 토글, 5곳 + 더 보기) 아래 다시 안 갈 곳(해제 + 되돌리기).
// - 후기: 내 후기(수정, 삭제는 그 자리 확인).
// 데스크톱: 좌 일지 + 우 이번 주 다녀온 곳 지도(가장 최근 다녀온 곳 핀 강조).
// 모션: 탭 밑줄이 base로 미끄러지고 패널은 fade-in(base). 축소 모드면 즉시.
import { Settings } from "lucide-react";
import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { LoadingRegion, SkeletonLine } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { focusRing } from "@/components/ui/interaction";
import { meLabCopy as copy } from "@/copy/design-lab-me";
import { cn } from "@/lib/utils";
import {
  MOCK_TODAY,
  getMeData,
  groupByWeek,
  type MeData,
  type WeekGroup,
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
  MoreButton,
  NamesFailNote,
  OfflineBanner,
  ReviewList,
  SectionHead,
  SettingsBlock,
  SideMap,
  VisitRow,
  btn,
  useVisitAnswers,
} from "../shared";

const BASE = "/design-lab/me/a";
type TabId = "history" | "places" | "reviews";
const TABS: { id: TabId; label: string }[] = [
  { id: "history", label: copy.history.tab },
  { id: "places", label: copy.places.tab },
  { id: "reviews", label: copy.reviews.tab },
];

export function MeA({ params }: { params: MeParams }) {
  const data = getMeData(params.namesFail);

  if (params.view === "settings") {
    return (
      <MeScreen>
        <MeHeader title={copy.settings.title} backHref={BASE} />
        <SettingsBlock className="mt-8" />
      </MeScreen>
    );
  }

  const header = (
    <MeHeader
      eyebrow={copy.greeting(copy.nickname)}
      action={
        <Link
          href={`${BASE}?view=settings`}
          aria-label={copy.header.settings}
          className={cn(btn.ghostIcon, "-mr-2.5")}
        >
          <Settings aria-hidden className="size-[1.375rem]" strokeWidth={1.5} />
        </Link>
      }
    />
  );

  if (params.authOff) {
    return (
      <MeScreen>
        <MeHeader />
        <div className="mt-8">
          <AuthOffBlock preview={<PreviewA data={data} />} />
        </div>
      </MeScreen>
    );
  }

  const initial: TabId =
    params.view === "places" ||
    params.view === "favorites" ||
    params.view === "blocklist"
      ? "places"
      : params.view === "reviews"
        ? "reviews"
        : "history";

  const thisWeek = groupByWeek(data.visits, MOCK_TODAY)[0];
  const activePin =
    thisWeek?.visits.find((x) => x.status === "visited" && x.place.name)?.place
      .placeId ?? null;
  const side =
    params.state === "ready" || params.state === "offline" ? (
      <SideMap
        places={thisWeek?.visits.map((x) => x.place) ?? []}
        activeId={activePin}
      />
    ) : undefined;

  return (
    <MeScreen side={side}>
      {header}
      <TabbedBody params={params} data={data} initial={initial} />
    </MeScreen>
  );
}

/* ---------- 탭 ---------- */

function TabbedBody({
  params,
  data,
  initial,
}: {
  params: MeParams;
  data: MeData;
  initial: TabId;
}) {
  const [tab, setTab] = useState<TabId>(initial);
  const baseId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = TABS.findIndex((t) => t.id === tab);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (index + dir + TABS.length) % TABS.length;
    setTab(TABS[next]!.id);
    refs.current[next]?.focus();
  };

  return (
    <div className="mt-6 flex flex-1 flex-col">
      <div
        role="tablist"
        aria-label={copy.title}
        className="relative grid grid-cols-3 border-b border-border"
      >
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${t.id}`}
            aria-selected={t.id === tab}
            aria-controls={`${baseId}-panel`}
            tabIndex={t.id === tab ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={onKey}
            className={cn(
              "h-12 type-label transition-colors duration-(--lm-duration-fast) motion-reduce:transition-none",
              t.id === tab
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
              focusRing,
            )}
          >
            {t.label}
          </button>
        ))}
        <span
          aria-hidden
          className="absolute bottom-[-1px] left-0 h-px w-1/3 bg-foreground transition-transform duration-(--lm-duration-base) ease-standard motion-reduce:transition-none"
          style={{ transform: `translateX(${index * 100}%)` }}
        />
      </div>
      <div
        key={tab}
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${tab}`}
        className="flex flex-1 animate-in flex-col pt-6 duration-(--lm-duration-base) fade-in motion-reduce:animate-none"
      >
        <Panel tab={tab} params={params} data={data} />
      </div>
    </div>
  );
}

function Panel({
  tab,
  params,
  data,
}: {
  tab: TabId;
  params: MeParams;
  data: MeData;
}) {
  if (params.state === "loading") return <SkeletonA />;
  if (params.state === "error") return <MeError className="pt-4" />;
  const offline = params.state === "offline";
  const empty = params.state === "empty";
  const top = (
    <>
      {offline ? <OfflineBanner className="mb-6" /> : null}
      {params.namesFail && !empty ? <NamesFailNote className="mb-6" /> : null}
    </>
  );

  if (tab === "history") {
    return (
      <>
        {top}
        {empty ? (
          <FirstVisit />
        ) : (
          <Timeline data={data} initialMore={params.more} disabled={offline} />
        )}
      </>
    );
  }
  if (tab === "places") {
    return (
      <>
        {top}
        <section aria-labelledby="a-fav" className="flex flex-col">
          <SectionHead
            id="a-fav"
            title={copy.places.favorites}
            aside={
              <span className="type-caption text-muted-foreground tabular-nums">
                {copy.places.favoritesCount(empty ? 0 : data.favorites.length)}
              </span>
            }
          />
          <FavoriteList
            items={empty ? [] : data.favorites}
            limit={5}
            initialMore={params.more}
            disabled={offline}
            labelledBy="a-fav"
          />
        </section>
        <section aria-labelledby="a-block" className="mt-12 flex flex-col">
          <SectionHead
            id="a-block"
            title={copy.places.blocklist}
            aside={
              <span className="type-caption text-muted-foreground tabular-nums">
                {copy.places.favoritesCount(empty ? 0 : data.blocklist.length)}
              </span>
            }
          />
          <BlockList
            items={empty ? [] : data.blocklist}
            disabled={offline}
            labelledBy="a-block"
          />
        </section>
      </>
    );
  }
  return (
    <>
      {top}
      <h2 id="a-reviews" className="sr-only">
        {copy.reviews.title}
      </h2>
      <ReviewList
        reviews={empty ? [] : data.reviews}
        limit={4}
        initialMore={params.more}
        disabled={offline}
        labelledBy="a-reviews"
      />
    </>
  );
}

/* ---------- 주간 일지 ---------- */

function weekTitle(g: WeekGroup): string {
  if (g.kind === "this") return copy.history.thisWeek;
  if (g.kind === "last") return copy.history.lastWeek;
  return copy.date.weekRange(g.start.m, g.start.d, g.end.m, g.end.d);
}

function Timeline({
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
  const groups = groupByWeek(data.visits, MOCK_TODAY);
  const shown = more ? groups : groups.slice(0, 2);
  return (
    <div className="flex flex-col">
      <h2 className="sr-only">{copy.history.listLabel}</h2>
      {shown.map((g, gi) => (
        <section
          key={g.key}
          aria-labelledby={`a-week-${g.key}`}
          className={cn(
            "flex flex-col",
            gi > 0 && "mt-8",
            gi >= 2 &&
              "animate-in duration-(--lm-duration-base) fade-in motion-reduce:animate-none",
          )}
        >
          <div className="sticky top-0 z-[1] flex min-h-11 items-end justify-between gap-3 border-b border-border bg-background pb-2">
            <h3 id={`a-week-${g.key}`} className="flex items-baseline gap-2">
              <span className="type-label">{weekTitle(g)}</span>
              {g.kind !== "older" ? (
                <span className="type-caption text-muted-foreground">
                  {copy.date.weekRange(g.start.m, g.start.d, g.end.m, g.end.d)}
                </span>
              ) : null}
            </h3>
            <span className="type-caption text-muted-foreground tabular-nums">
              {copy.history.count(g.visits.length)}
            </span>
          </div>
          <ul className="flex flex-col">
            {g.visits.map((visit, i) => (
              <VisitRow
                key={visit.id}
                visit={visit}
                answers={answers}
                date="column"
                sameDayAsPrev={
                  i > 0 && g.visits[i - 1]!.date.d === visit.date.d
                }
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

function SkeletonA() {
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

/** 로그인 꺼짐 미리보기: 탭 줄 + 이번 주 세 줄 (정적) */
function PreviewA({ data }: { data: MeData }) {
  const g = groupByWeek(data.visits, MOCK_TODAY)[0];
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-3 border-b border-border pb-2 text-center type-label text-muted-foreground">
        {TABS.map((t) => (
          <span
            key={t.id}
            className={t.id === "history" ? "text-foreground" : undefined}
          >
            {t.label}
          </span>
        ))}
      </div>
      <p className="mt-4 type-label">{copy.history.thisWeek}</p>
      <ul className="flex flex-col">
        {g?.visits.slice(1, 4).map((x) => (
          <li
            key={x.id}
            className="flex items-center gap-3 border-b border-border py-3"
          >
            <span className="w-6 text-center type-numeric-md tabular-nums">
              {x.date.d}
            </span>
            <span className="type-body-sm">{x.place.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
