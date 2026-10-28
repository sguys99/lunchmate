"use client";
// 시안 C "Clay Grid" 비교 화면 1: 오늘(홈) 추천 카드 3장 + 하단 탭 (T1.11, T1.13).
// 세로 3단 비교: 카드 3장이 같은 열 격자를 공유해 도보, 가격, 👍 숫자가 표처럼 위아래로 정렬된다.
// 카드는 radio group(화살표 키로 이동), 선택한 카드가 주 버튼 "길찾기"의 대상이 된다.
import { CloudOff, Navigation, RefreshCw, TriangleAlert } from "lucide-react";
import * as m from "motion/react-m";
import { useRef, useState, type KeyboardEvent } from "react";
import { clayGridCopy } from "@/copy/design-lab-c";
import { homeCopy } from "@/copy/home";
import {
  MOCK_HOME_ALL_SETS,
  MOCK_HOME_DEFAULT,
  MOCK_HOME_EMPTY,
  MOCK_POLL,
  type MockPick,
  type MockPlace,
} from "@/features/design-lab/mock";
import { formatPercent, formatPriceBand } from "@/lib/format";
import { getKstParts, getMeal } from "@/lib/time";
import { cn } from "@/lib/utils";
import { DesktopSplit } from "../desktop-split";
import { springOf, staggerOf, tweenOf } from "../motion";
import { getHomeContent, type HomeContent } from "../states";
import { ACTIVE_TAB_BY_SCREEN } from "../tabs";
import type { DesignMotionTokens, DesignScreenProps } from "../types";
import {
  Badge,
  Bone,
  IllustrationCell,
  MapSurfaceC,
  MetricGrid,
  StateGlyph,
  StateNotice,
  catInk,
  categoryText,
} from "./parts";
import { SegmentTabsC, TabBarC } from "./tab-bar";

const copy = clayGridCopy;

/** 시연 기준 시각(목업 고정값)으로 맥락 줄을 만든다. 실제 시계는 쓰지 않는다 */
function useContextLine() {
  const now = new Date(MOCK_POLL.mockNow);
  const { month, day, weekday } = getKstParts(now);
  const meal = getMeal(now);
  return {
    meal,
    line: copy.context(month, day, copy.weekdays[weekday], copy.meals[meal]),
  };
}

export function HomeScreenC({ state, tokens }: DesignScreenProps) {
  const content = getHomeContent(state);
  const motion = tokens.motion;
  const [setIndex, setSetIndex] = useState(0);
  const [rerolls, setRerolls] = useState(0);
  const [selected, setSelected] = useState(0);

  const picks: MockPick | null =
    content.kind === "ready"
      ? (MOCK_HOME_ALL_SETS[setIndex] ?? content.picks)
      : null;
  const selectedPlace = picks ? (picks[selected] ?? picks[0]) : null;

  const reroll = () => {
    setSetIndex((i) => (i + 1) % MOCK_HOME_ALL_SETS.length);
    setRerolls((n) => n + 1);
  };

  const list = (
    <div className="flex min-h-full flex-1 flex-col">
      <SegmentTabsC active={ACTIVE_TAB_BY_SCREEN.home} />
      <Header kind={content.kind} />
      <main className="flex flex-1 flex-col px-(--lm-layout-gutter) pb-4">
        <Body
          content={content}
          picks={picks}
          selected={selected}
          onSelect={setSelected}
          rerolls={rerolls}
          motion={motion}
        />
      </main>
      <div className="sticky bottom-0 z-10">
        <ActionZone
          content={content}
          place={selectedPlace}
          onReroll={reroll}
          rerolls={rerolls}
          motion={motion}
        />
        <TabBarC active={ACTIVE_TAB_BY_SCREEN.home} motion={motion} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col">
      <DesktopSplit
        className="desktop:grid-cols-[minmax(0,var(--lm-layout-desktop-list-max-width))_minmax(0,1fr)]"
        list={list}
        map={
          <MapSurfaceC
            className="border-l border-border"
            pins={picks ?? []}
            selectedId={selectedPlace?.id}
          />
        }
      />
    </div>
  );
}

function Header({ kind }: { kind: HomeContent["kind"] }) {
  const { meal, line } = useContextLine();
  return (
    <header className="flex flex-col gap-1 px-(--lm-layout-gutter) pt-5 pb-3">
      <p className="type-caption text-muted-foreground">{line}</p>
      <h1 className="type-title">{copy.title[meal]}</h1>
      {kind === "loading" && <Bone className="mt-1 h-4 w-48" />}
      {kind === "ready" && (
        <p className="type-body-sm text-muted-foreground">
          {copy.subtitle(MOCK_HOME_DEFAULT.walkLimitMinutes)}
        </p>
      )}
    </header>
  );
}

function Body({
  content,
  picks,
  selected,
  onSelect,
  rerolls,
  motion,
}: {
  content: HomeContent;
  picks: MockPick | null;
  selected: number;
  onSelect: (i: number) => void;
  rerolls: number;
  motion: DesignMotionTokens;
}) {
  switch (content.kind) {
    case "ready":
      return picks ? (
        <PickList
          picks={picks}
          selected={selected}
          onSelect={onSelect}
          rerolls={rerolls}
          motion={motion}
        />
      ) : null;
    case "loading":
      return <LoadingList label={content.label} />;
    case "empty":
      return (
        <StateNotice
          title={content.title}
          body={content.body}
          visual={
            <IllustrationCell
              category="hansik"
              className="size-14 opacity-70"
            />
          }
        >
          <EmptyRuler />
        </StateNotice>
      );
    case "error":
      return (
        <StateNotice
          title={content.title}
          body={content.body}
          visual={
            <StateGlyph>
              <TriangleAlert aria-hidden />
            </StateGlyph>
          }
        />
      );
    case "offline":
      return (
        <StateNotice
          title={content.title}
          body={content.body}
          visual={
            <StateGlyph>
              <CloudOff aria-hidden />
            </StateGlyph>
          }
        />
      );
  }
}

function PickList({
  picks,
  selected,
  onSelect,
  rerolls,
  motion,
}: {
  picks: MockPick;
  selected: number;
  onSelect: (i: number) => void;
  rerolls: number;
  motion: DesignMotionTokens;
}) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>, i: number) => {
    const last = picks.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowDown" || e.key === "ArrowRight")
      next = i === last ? 0 : i + 1;
    if (e.key === "ArrowUp" || e.key === "ArrowLeft")
      next = i === 0 ? last : i - 1;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = last;
    if (next !== null) {
      e.preventDefault();
      onSelect(next);
      refs.current[next]?.focus();
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onSelect(i);
    }
  };

  return (
    <>
      <div
        role="radiogroup"
        aria-label={copy.picksLabel}
        aria-describedby="c-picks-hint"
        className="flex flex-col gap-3"
      >
        {picks.map((place, i) => (
          <PickCard
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            place={place}
            index={i}
            checked={i === selected}
            onSelect={() => onSelect(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
            rerolls={rerolls}
            motion={motion}
          />
        ))}
      </div>
      <p id="c-picks-hint" className="sr-only">
        {copy.selectedHint}
      </p>
      <p aria-live="polite" className="sr-only">
        {rerolls > 0
          ? `${copy.rerolled} ${picks.map((p) => p.name).join(", ")}`
          : ""}
      </p>
    </>
  );
}

function PickCard({
  ref,
  place,
  index,
  checked,
  onSelect,
  onKeyDown,
  rerolls,
  motion,
}: {
  ref: (el: HTMLDivElement | null) => void;
  place: MockPlace;
  index: number;
  checked: boolean;
  onSelect: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  rerolls: number;
  motion: DesignMotionTokens;
}) {
  // 다시 뽑기: 이름과 일러스트는 4px 아래에서 순서대로 들어오고(셔플 스프링 + 24ms 간격), 숫자는 NumberFlow가 굴린다
  const enter = rerolls === 0 ? false : ({ opacity: 0, y: 4 } as const);
  const enterTransition = {
    ...springOf(motion, "shuffle"),
    opacity: tweenOf(motion, "base", "enter"),
    delay: index * staggerOf(motion),
  };
  return (
    <m.div
      ref={ref}
      role="radio"
      aria-checked={checked}
      aria-label={place.name}
      aria-describedby={`c-pick-${index}-summary`}
      tabIndex={checked ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      whileTap={{ scale: 0.99 }}
      transition={springOf(motion, "press")}
      className={cn(
        "relative cursor-pointer rounded-card border bg-card p-4 outline-none select-none",
        "transition-[border-color] duration-(--lm-duration-fast) ease-standard",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        checked
          ? "border-primary [box-shadow:inset_0_0_0_0.5px_var(--color-primary)]"
          : "border-border desktop:hover:border-input",
      )}
    >
      <span id={`c-pick-${index}-summary`} className="sr-only">
        {summaryOf(place)}
      </span>
      {/* 선택 표시: 왼쪽 2px 클레이 선 */}
      <span
        aria-hidden
        className={cn(
          "absolute top-4 bottom-4 left-0 w-0.5 rounded-r-full bg-primary transition-opacity duration-(--lm-duration-fast)",
          checked ? "opacity-100" : "opacity-0",
        )}
      />
      <m.div
        key={`${rerolls}-${place.id}`}
        initial={enter}
        animate={{ opacity: 1, y: 0 }}
        transition={enterTransition}
        className="flex items-center gap-3"
      >
        <IllustrationCell
          category={place.category}
          className="size-14"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center justify-between gap-2">
            <span className="type-caption" style={catInk(place.category)}>
              {categoryText(place.category)}
            </span>
            {place.statusBadges.length > 0 && (
              <span className="flex gap-1">
                {place.statusBadges.map((b) => (
                  <Badge key={b} kind={b} />
                ))}
              </span>
            )}
          </div>
          <span className="truncate type-heading">{place.name}</span>
        </div>
      </m.div>
      <div className="my-3 h-px bg-border" aria-hidden />
      <MetricGrid place={place} motion={motion} />
      <m.p
        key={`r-${rerolls}-${place.id}`}
        initial={enter}
        animate={{ opacity: 1, y: 0 }}
        transition={enterTransition}
        className="mt-2.5 truncate type-body-sm text-muted-foreground"
      >
        {place.reason}
      </m.p>
    </m.div>
  );
}

/** 스크린 리더용 카드 요약: 카드 안 내용은 radio의 자식이라 이름 외에는 읽히지 않는다 */
function summaryOf(place: MockPlace): string {
  const parts = [
    categoryText(place.category),
    copy.metrics.price + " " + formatPriceBand(place.priceKRW),
    copy.metrics.thumbs +
      " " +
      (formatPercent(place.thumbsUpRate) ?? homeCopy.thumbsUpEmpty),
    ...place.statusBadges.map((b) => homeCopy.badges[b]),
    place.reason,
  ];
  return parts.join(", ");
}

function ActionZone({
  content,
  place,
  onReroll,
  rerolls,
  motion,
}: {
  content: HomeContent;
  place: MockPlace | null;
  onReroll: () => void;
  rerolls: number;
  motion: DesignMotionTokens;
}) {
  const press = springOf(motion, "press");
  const zone =
    "border-t border-border bg-background px-(--lm-layout-gutter) py-3";

  if (
    content.kind === "empty" ||
    content.kind === "error" ||
    content.kind === "offline"
  ) {
    return (
      <div className={zone}>
        <m.button
          type="button"
          whileTap={{ scale: 0.98 }}
          transition={press}
          className={primaryButton}
        >
          {content.kind !== "empty" && (
            <RefreshCw aria-hidden className="size-4" />
          )}
          {content.action}
        </m.button>
      </div>
    );
  }

  if (content.kind === "loading" || !place) {
    return (
      <div className={cn(zone, "grid grid-cols-[1fr_2fr] gap-2")} aria-hidden>
        <Bone className="h-12 rounded-button" />
        <Bone className="h-12 rounded-button" />
      </div>
    );
  }

  return (
    <div className={cn(zone, "grid grid-cols-[1fr_2fr] gap-2")}>
      <m.button
        type="button"
        onClick={onReroll}
        whileTap={{ scale: 0.98 }}
        transition={press}
        className={outlineButton}
      >
        <m.span
          aria-hidden
          className="flex"
          animate={{ rotate: rerolls * 180 }}
          transition={springOf(motion, "shuffle")}
        >
          <RefreshCw className="size-4" strokeWidth={1.75} />
        </m.span>
        {homeCopy.actions.reroll}
      </m.button>
      <m.button
        type="button"
        whileTap={{ scale: 0.98 }}
        transition={press}
        className={primaryButton}
      >
        <Navigation
          aria-hidden
          className="size-4 shrink-0"
          strokeWidth={1.75}
        />
        <span className="truncate">{copy.directionsTo(place.name)}</span>
      </m.button>
    </div>
  );
}

const buttonBase =
  "flex h-12 min-w-0 items-center justify-center gap-2 rounded-button px-3 type-label whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const primaryButton = cn(
  buttonBase,
  "w-full bg-primary text-primary-foreground active:bg-[color-mix(in_oklch,var(--color-primary)_92%,var(--color-foreground))]",
);
const outlineButton = cn(
  buttonBase,
  "border border-input bg-card text-foreground active:bg-muted",
);

/** 로딩: 실제 카드와 같은 해부도의 스켈레톤 3장 */
function LoadingList({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-card border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <Bone className="size-14 rounded-md" />
            <div className="flex flex-1 flex-col gap-2">
              <Bone className="h-3 w-12" />
              <Bone className={cn("h-[18px]", i === 1 ? "w-24" : "w-32")} />
            </div>
          </div>
          <div className="my-3 h-px bg-border" />
          <div className="grid grid-cols-3">
            {[0, 1, 2].map((c) => (
              <div
                key={c}
                className={cn(
                  "flex flex-col gap-1.5",
                  c === 0 ? "pr-3" : "border-l border-border px-3",
                )}
              >
                <Bone className="h-6 w-10" />
                <Bone className="h-3 w-8" />
              </div>
            ))}
          </div>
          <Bone className={cn("mt-3 h-3.5", i === 2 ? "w-3/5" : "w-4/5")} />
        </div>
      ))}
    </div>
  );
}

/** 빈 상태 시각 요소: 일러스트 칸과 검색 범위 눈금(지금 범위는 클레이, 넓힐 범위는 헤어라인) */
function EmptyRuler() {
  const { walkLimitMinutes: now, expandToMinutes: next } = MOCK_HOME_EMPTY;
  const ticks = Array.from({ length: next + 1 }, (_, i) => i);
  return (
    <figure
      className="mt-2 flex flex-col gap-2"
      aria-label={copy.empty.rulerLabel}
    >
      <div className="relative h-2 rounded-full bg-vote-bar-track">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-vote-bar"
          style={{ width: `${(now / next) * 100}%` }}
        />
      </div>
      <div className="relative h-4">
        {ticks
          .filter((t) => t % 5 === 0)
          .map((t) => (
            <span
              key={t}
              className={cn(
                "absolute -translate-x-1/2 type-caption whitespace-nowrap tabular-nums",
                t === now
                  ? "text-foreground"
                  : t === next
                    ? "text-primary"
                    : "text-muted-foreground",
                t === 0 && "translate-x-0",
                t === next && "-translate-x-full",
              )}
              style={{ left: `${(t / next) * 100}%` }}
            >
              {copy.empty.minutes(t)}
            </span>
          ))}
      </div>
    </figure>
  );
}
