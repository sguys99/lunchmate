"use client";
// 시안 B "Quiet Stone" 비교 화면 1: 오늘(홈) 추천 카드 3장 + 하단 탭 (T1.11, T1.13).
//
// 구성: 날짜와 끼니 한 줄 → 세리프 제목 → (여백) → 크고 여유 있는 단일 카드 1장 → 위치 표시, 이전/다음, 다시 뽑기 → 하단 탭.
// 제목은 위에, 카드와 행동은 아래로 붙여 주요 행동이 화면 하단 1/3에 오도록 한다(사이 여백이 "숨").
// 모션: 카드 넘김은 크로스페이드 + 8px 수평 이동, 다시 뽑기는 블록 순서대로 70ms 간격 페이드인. 둘 다 오버슈트 없음.
// 데스크톱(컨테이너 1024px 이상): 좌 리스트 3장 세로 + 우 지도 자리.
import { AnimatePresence, LazyMotion, type PanInfo } from "motion/react";
import * as m from "motion/react-m";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useState, type ReactNode } from "react";
import { quietStoneScreenCopy as copy } from "@/copy/design-lab-quiet-stone";
import { homeCopy } from "@/copy/home";
import {
  MOCK_HOME_ALL_SETS,
  MOCK_POLL,
  type MockPick,
  type MockPlace,
} from "@/features/design-lab/mock";
import { categoryLabel } from "@/features/place/categories";
import { formatWalkMinutes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DesktopSplit, MapPlaceholder } from "../desktop-split";
import {
  loadDomMax,
  staggerOf,
  tweenOf,
  usePrefersReducedMotion,
} from "../motion";
import { getHomeContent, type HomeContent } from "../states";
import type { DesignMotionTokens, DesignScreenProps } from "../types";
import {
  Badges,
  MapLines,
  MapPin,
  NumberRow,
  PIN_POSITIONS,
  PlaceHeading,
  PressButton,
  SkeletonBlock,
  StateMessage,
  TabBarB,
  buttonClass,
  dateLine,
} from "./parts";

const SWIPE_DISTANCE = 56;
const SWIPE_VELOCITY = 420;

export function HomeScreenB({ state, tokens }: DesignScreenProps) {
  const content = getHomeContent(state);
  return (
    <div className="flex flex-1 flex-col">
      {content.kind === "ready" ? (
        <ReadyHome motion={tokens.motion} />
      ) : (
        <DesktopSplit
          list={
            <HomeColumn>
              <HomeHeader />
              {content.kind === "loading" ? <IndexSkeleton /> : null}
              <div className="mt-auto pt-12 desktop:mt-14">
                <NonReady content={content} motion={tokens.motion} />
              </div>
            </HomeColumn>
          }
          map={<QuietMap />}
        />
      )}
      <TabBarB screen="home" />
    </div>
  );
}

/* ---------- 틀 ---------- */

function HomeColumn({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-10 pb-6 desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-10 desktop:pt-14 desktop:pb-14">
      {children}
    </main>
  );
}

function HomeHeader({ action }: { action?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <p className="type-caption text-muted-foreground">
          {dateLine(MOCK_POLL.mockNow)}
        </p>
        <h1 className="type-title">{copy.title}</h1>
      </div>
      {action}
    </header>
  );
}

function QuietMap({
  active = 0,
  picks,
}: {
  active?: number;
  picks?: MockPick;
}) {
  return (
    <MapPlaceholder className="border-l border-border desktop:sticky desktop:top-0 desktop:max-h-svh">
      <MapLines />
      {picks?.map((p, i) => (
        <MapPin
          key={p.id}
          label={p.name}
          active={i === active}
          position={PIN_POSITIONS[i] ?? PIN_POSITIONS[0]}
        />
      ))}
    </MapPlaceholder>
  );
}

/* ---------- 정상 ---------- */

type Entrance = "first" | "nav" | "reroll";

function ReadyHome({ motion }: { motion: DesignMotionTokens }) {
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1 | 0>(0);
  const [entrance, setEntrance] = useState<Entrance>("first");
  const [announce, setAnnounce] = useState("");
  const picks =
    MOCK_HOME_ALL_SETS[round % MOCK_HOME_ALL_SETS.length] ??
    MOCK_HOME_ALL_SETS[0]!;
  const total = picks.length;
  const place = picks[index] ?? picks[0];

  function goTo(next: number) {
    if (next < 0 || next >= total || next === index) return;
    setDirection(next > index ? 1 : -1);
    setEntrance("nav");
    setIndex(next);
    const target = picks[next];
    if (target)
      setAnnounce(copy.carousel.announce(next + 1, total, target.name));
  }

  function reroll() {
    setDirection(0);
    setEntrance("reroll");
    setRound((r) => r + 1);
    setIndex(0);
    setAnnounce(copy.carousel.rerolled);
  }

  const rerollButton = (
    <PressButton
      motion={motion}
      onClick={reroll}
      className={cn(buttonClass.outline, "pr-5 pl-4")}
    >
      <RotateCcw aria-hidden className="size-4" strokeWidth={1.5} />
      {homeCopy.actions.reroll}
    </PressButton>
  );

  return (
    <DesktopSplit
      list={
        <HomeColumn>
          <HomeHeader
            action={<div className="hidden desktop:block">{rerollButton}</div>}
          />
          <p aria-live="polite" className="sr-only">
            {announce}
          </p>

          {/* 모바일: 세 곳 목차. 다른 두 곳의 존재와 현재 위치를 조용히 보여 준다 */}
          <TodayIndex
            key={`index-${round}`}
            picks={picks}
            index={index}
            onGo={goTo}
          />

          {/* 모바일: 단일 카드 캐러셀 */}
          <section
            aria-roledescription="carousel"
            aria-label={copy.carousel.label}
            className="mt-auto flex flex-col gap-5 pt-12 desktop:hidden"
          >
            <Carousel
              slideKey={`${round}-${place.id}`}
              place={place}
              index={index}
              total={total}
              direction={direction}
              entrance={entrance}
              motion={motion}
              onPrev={() => goTo(index - 1)}
              onNext={() => goTo(index + 1)}
            />
            <div className="flex items-center justify-between gap-3">
              <Pager picks={picks} index={index} onGo={goTo} />
              {rerollButton}
            </div>
          </section>

          {/* 데스크톱: 3장 세로 */}
          <DesktopList
            key={`list-${round}`}
            picks={picks}
            motion={motion}
            reveal={entrance === "reroll"}
          />
        </HomeColumn>
      }
      map={<QuietMap picks={picks} active={0} />}
    />
  );
}

function Carousel({
  slideKey,
  place,
  index,
  total,
  direction,
  entrance,
  motion,
  onPrev,
  onNext,
}: {
  slideKey: string;
  place: MockPlace;
  index: number;
  total: number;
  direction: 1 | -1 | 0;
  entrance: Entrance;
  motion: DesignMotionTokens;
  onPrev: () => void;
  onNext: () => void;
}) {
  const reduced = usePrefersReducedMotion();
  const enter = reduced ? { duration: 0 } : tweenOf(motion, "base", "enter");
  const exit = reduced ? { duration: 0 } : tweenOf(motion, "fast", "exit");
  const swipe = motion.spring.swipe;

  function onDragEnd(_: unknown, info: PanInfo) {
    const { offset, velocity } = info;
    if (offset.x < -SWIPE_DISTANCE || velocity.x < -SWIPE_VELOCITY) onNext();
    else if (offset.x > SWIPE_DISTANCE || velocity.x > SWIPE_VELOCITY) onPrev();
  }

  return (
    <LazyMotion features={loadDomMax}>
      <div className="relative">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={slideKey}
            role="group"
            aria-roledescription="slide"
            aria-label={copy.carousel.slide(index + 1, total)}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.16}
            dragTransition={{
              bounceStiffness: swipe.stiffness,
              bounceDamping: swipe.damping,
            }}
            onDragEnd={onDragEnd}
            initial={{ opacity: 0, x: direction * 8 }}
            animate={{ opacity: 1, x: 0, transition: enter }}
            exit={{ opacity: 0, x: direction * -8, transition: exit }}
            className="touch-pan-y"
          >
            <PlaceCard
              place={place}
              motion={motion}
              primary
              reveal={entrance === "reroll"}
            />
          </m.div>
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}

/** 이전/다음 버튼과 현재 위치 숫자 */
function Pager({
  picks,
  index,
  onGo,
}: {
  picks: MockPick;
  index: number;
  onGo: (i: number) => void;
}) {
  const atStart = index === 0;
  const atEnd = index === picks.length - 1;
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={copy.carousel.previous}
        aria-disabled={atStart || undefined}
        onClick={() => onGo(index - 1)}
        className={buttonClass.icon}
      >
        <ChevronLeft aria-hidden className="size-5" strokeWidth={1.5} />
      </button>
      <p
        aria-hidden
        className="w-14 text-center type-label text-muted-foreground tabular-nums"
      >
        <span className="text-foreground">{index + 1}</span>
        {` / ${picks.length}`}
      </p>
      <button
        type="button"
        aria-label={copy.carousel.next}
        aria-disabled={atEnd || undefined}
        onClick={() => onGo(index + 1)}
        className={buttonClass.icon}
      >
        <ChevronRight aria-hidden className="size-5" strokeWidth={1.5} />
      </button>
    </div>
  );
}

/** 제목 아래 세 곳 목차: 이름과 도보 분. 현재 카드는 짧은 선과 진한 글자로 표시하고, 누르면 그 카드로 간다. */
function TodayIndex({
  picks,
  index,
  onGo,
}: {
  picks: MockPick;
  index: number;
  onGo: (i: number) => void;
}) {
  return (
    <ol
      aria-label={copy.carousel.label}
      className="mt-8 flex flex-col desktop:hidden"
    >
      {picks.map((p, i) => {
        const current = i === index;
        return (
          <li key={p.id}>
            <button
              type="button"
              aria-current={current ? "true" : undefined}
              onClick={() => onGo(i)}
              className={cn(
                "group flex h-11 w-full items-center gap-3 text-left",
                buttonClass.focusRing,
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "h-px shrink-0 transition-[width,background-color] duration-(--lm-duration-base) ease-standard",
                  current ? "w-5 bg-foreground" : "w-2.5 bg-border",
                )}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate type-body-sm transition-colors duration-(--lm-duration-base)",
                  current
                    ? "text-foreground"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              >
                {p.name}
              </span>
              <span className="shrink-0 type-caption text-muted-foreground tabular-nums">
                {formatWalkMinutes(p.walkMinutes)}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function DesktopList({
  picks,
  motion,
  reveal,
}: {
  picks: MockPick;
  motion: DesignMotionTokens;
  reveal: boolean;
}) {
  return (
    <ol
      aria-label={copy.desktopListLabel}
      className="mt-14 hidden flex-col gap-10 desktop:flex"
    >
      {picks.map((p, i) => (
        <li key={p.id}>
          <PlaceCard
            place={p}
            motion={motion}
            primary={i === 0}
            reveal={reveal}
            revealOffset={i * 2}
          />
        </li>
      ))}
    </ol>
  );
}

/* ---------- 카드 ---------- */

/**
 * 해부도(b.DESIGN.md 5절): 윗줄(카테고리, 식당명 세리프, 일러스트 96px 모서리) → 배지 → 숫자 3칸 → 이유 한 줄 → 길찾기.
 * reveal이면 블록 순서대로 stagger 페이드인(다시 뽑기).
 */
function PlaceCard({
  place,
  motion,
  primary,
  reveal,
  revealOffset = 0,
}: {
  place: MockPlace;
  motion: DesignMotionTokens;
  /** 주 버튼(올리브 면)인지. 화면당 1개 */
  primary: boolean;
  reveal: boolean;
  revealOffset?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const block = (i: number) =>
    reveal && !reduced
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: {
            ...tweenOf(motion, "slow", "enter"),
            delay: (i + revealOffset) * staggerOf(motion),
          },
        }
      : {};

  return (
    <article
      aria-label={place.name}
      className="flex flex-col gap-7 rounded-card border border-border bg-card p-7 text-card-foreground @max-[23.75rem]/screen:p-5"
    >
      <m.div {...block(0)}>
        <PlaceHeading
          place={place}
          categoryLabel={categoryLabel(place.category)}
        >
          <Badges place={place} />
        </PlaceHeading>
      </m.div>
      <m.div {...block(1)}>
        <NumberRow place={place} />
      </m.div>
      <m.p
        {...block(2)}
        className="-mt-1 truncate type-body-sm text-muted-foreground"
      >
        {place.reason}
      </m.p>
      <m.div {...block(3)} className="flex">
        <PressButton
          motion={motion}
          aria-label={copy.directionsTo(place.name)}
          className={cn(
            "flex-1",
            primary ? buttonClass.primary : buttonClass.outline,
          )}
        >
          {homeCopy.actions.directions}
        </PressButton>
      </m.div>
    </article>
  );
}

/* ---------- 로딩, 빈 상태, 오류, 오프라인 ---------- */

function NonReady({
  content,
  motion,
}: {
  content: Exclude<HomeContent, { kind: "ready" }>;
  motion: DesignMotionTokens;
}) {
  if (content.kind === "loading") {
    return (
      <div role="status" aria-label={content.label}>
        <span className="sr-only">{content.label}</span>
        <div className="flex flex-col gap-10">
          <SkeletonCard />
          <div className="hidden flex-col gap-10 desktop:flex">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between desktop:hidden">
          <SkeletonBlock className="h-12 w-40 rounded-button" />
          <SkeletonBlock className="h-12 w-28 rounded-button" />
        </div>
      </div>
    );
  }
  return (
    <section className="rounded-card border border-border bg-card px-7 pt-6 pb-8 @max-[23.75rem]/screen:px-5">
      <StateMessage
        kind={content.kind}
        title={content.title}
        body={content.body}
        action={content.action}
        category="gukbap"
        motion={motion}
      />
    </section>
  );
}

function IndexSkeleton() {
  return (
    <div aria-hidden className="mt-8 flex flex-col desktop:hidden">
      {["w-24", "w-28", "w-20"].map((w) => (
        <div key={w} className="flex h-11 items-center gap-3">
          <span className="h-px w-2.5 bg-border" />
          <SkeletonBlock className={cn("h-3.5 rounded-badge", w)} />
          <SkeletonBlock className="ml-auto h-3 w-14 rounded-badge" />
        </div>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-7 rounded-card border border-border bg-card p-7 @max-[23.75rem]/screen:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 flex-col gap-3 pt-1">
          <SkeletonBlock className="h-3.5 w-14 rounded-badge" />
          <SkeletonBlock className="h-6 w-36 rounded-badge" />
          <SkeletonBlock className="mt-1 h-6 w-28 rounded-badge" />
        </div>
        {/* 일러스트 자리: 같은 위치의 원 */}
        <div className="relative -mt-2 -mr-2 size-24 shrink-0">
          <SkeletonBlock className="absolute top-[17px] left-[15px] size-[50px] rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-[0.8fr_1.3fr_0.9fr] divide-x divide-border">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-2.5 px-4 first:pl-0 last:pr-0"
          >
            <SkeletonBlock className="h-3 w-8 rounded-badge" />
            <SkeletonBlock className="h-7 w-14 rounded-badge" />
          </div>
        ))}
      </div>
      <SkeletonBlock className="-mt-1 h-4 w-4/5 rounded-badge" />
      <SkeletonBlock className="h-12 w-full rounded-button" />
    </div>
  );
}
