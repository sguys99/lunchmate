"use client";
// 홈 시안 A "스와이프 스택" (T3.1, REC-04).
//
// 의도: 한 번에 한 곳만 보여 주고 손끝으로 넘긴다. 뒤에 남은 장수는 카드 가장자리 두 겹으로만 알린다.
// 구성: 머리(기준 위치, 끼니, 제목 + 다시 뽑기 아이콘) → 어제 피드백 띠 → 카드 더미 → 이전/다음 + 그냥 골라줘 → 진입점 목록.
// 카드: DESIGN.md 5장 해부도 그대로(일러스트 96 모서리, 식당명 세리프, 숫자 28px 3칸, 이유, 길찾기 + 상세).
// 모션
// - 넘김: D-02 스와이프(domMax 비동기, useSwipeStack 규칙). 크로스페이드 + 8px, 끌어서 넘기면 손을 따라 120px 나간다.
// - 다시 뽑기: 더미 전체가 fast로 흐려진 뒤 새 카드의 블록이 70ms 간격으로 나타난다(ShuffleSwap).
// - 첫 화면은 CSS 페이드 하나(D-04). 축소 모드면 끌기를 끄고 버튼과 키만, 전환은 즉시.
// 데스크톱: 같은 더미를 좌 칸에 두고, 우 지도 자리의 핀이 지금 카드를 따라간다.
import { AnimatePresence, LazyMotion, type Variants } from "motion/react";
import * as m from "motion/react-m";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { CardSkeleton, LoadingRegion } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import type { MockPick, MockPlace } from "@/features/design-lab/mock";
import { getHomeContent } from "@/features/design-lab/system/states";
import {
  useSwipeStack,
  type UseSwipeStack,
} from "@/features/rec/use-swipe-stack";
import { CategoryIllustration } from "@/features/place/illustrations";
import {
  loadDomMax,
  motionTokens,
  springOf,
  tweenOf,
  useMotionPreset,
  useMotionReduced,
  withDirection,
  type MotionPreset,
} from "@/lib/motion";
import { cn } from "@/lib/utils";
import { CardBadges, CategoryCaption, NumberGrid } from "../shared/card-bits";
import { HomeHeader, JustPickButton, RerollButton } from "../shared/controls";
import { EntryLinks } from "../shared/entries";
import { YesterdayFeedback } from "../shared/feedback";
import {
  HomeColumn,
  HomeFrame,
  HomeMap,
  HomeStateMessage,
} from "../shared/frame";
import { RevealProvider, ShuffleBlock, ShuffleSwap } from "../shared/shuffle";
import type { HomeVariantProps } from "../types";
import { useHomeLab } from "../shared/use-home-lab";

const copy = designLabHomeCopy.screen;
/** 끌어서 넘긴 카드가 나가는 거리(px) */
const FLING_PX = 120;

const noop = () => () => {};
/** 하이드레이션 뒤에만 true (축소 모드에서 끌기를 끌 때 서버 렌더와 속성을 맞추려고) */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

export function HomeA({ state }: HomeVariantProps) {
  const content = getHomeContent(state);
  const lab = useHomeLab();
  const stack = useSwipeStack(3, (i) =>
    copy.deck.announce(i + 1, 3, lab.picks[i]?.name ?? ""),
  );
  /** 마지막으로 카드를 넘긴 회차. 지금 회차와 같으면 새 카드 블록은 순차 등장 없이 바로 보인다 */
  const [navRound, setNavRound] = useState(-1);

  function withNav<T extends unknown[]>(fn: (...args: T) => void) {
    return (...args: T) => {
      setNavRound(lab.round);
      fn(...args);
    };
  }
  const nav: UseSwipeStack = {
    ...stack,
    prev: withNav(stack.prev),
    next: withNav(stack.next),
    goTo: withNav(stack.goTo),
    onKeyDown: withNav(stack.onKeyDown),
    onDragEnd: withNav(stack.onDragEnd),
  };
  const resetting = (fn: () => void) => () => {
    stack.reset();
    fn();
  };
  const header = (
    <HomeHeader
      meal={lab.meal}
      location={lab.location}
      onMeal={(meal) => {
        stack.reset();
        lab.setMeal(meal);
      }}
      onLocation={resetting(lab.cycleLocation)}
      trailing={
        content.kind === "ready" ? (
          <RerollButton
            iconOnly
            onClick={resetting(lab.reroll)}
            className="-mb-1"
          />
        ) : null
      }
    />
  );

  if (content.kind !== "ready") {
    return (
      <HomeFrame>
        <HomeColumn>
          {header}
          {content.kind === "loading" ? (
            <LoadingA label={content.label} />
          ) : (
            <HomeStateMessage
              content={content}
              className="mt-auto pt-6 desktop:mt-12"
            />
          )}
        </HomeColumn>
      </HomeFrame>
    );
  }

  return (
    <HomeFrame map={<HomeMap picks={lab.picks} active={stack.index} />}>
      <HomeColumn>
        {header}
        <p aria-live="polite" className="sr-only">
          {lab.announcement}
        </p>
        <p aria-live="polite" className="sr-only">
          {stack.announcement}
        </p>

        <YesterdayFeedback layout="line" className="mt-7" />

        <section
          aria-roledescription="carousel"
          aria-label={copy.listLabel}
          className="mt-8 flex flex-col gap-5"
        >
          <ShuffleSwap round={lab.round}>
            <Deck
              picks={lab.picks}
              stack={nav}
              fresh={navRound !== lab.round}
              reveal={lab.round > 0 && navRound !== lab.round}
            />
          </ShuffleSwap>
          <div className="mt-3 flex items-center justify-between gap-3">
            <Pager stack={nav} />
            <JustPickButton variant="ghost" className="-mr-3" />
          </div>
        </section>

        <EntryLinks layout="rows" className="mt-10" />
      </HomeColumn>
    </HomeFrame>
  );
}

/* ---------- 더미 ---------- */

type ExitCustom = {
  direction: 1 | -1;
  dragged: boolean;
  reduced: boolean;
  /** 회차의 첫 카드(넘긴 적 없음)면 들어올 때 움직이지 않는다 */
  still: boolean;
};

function cardVariants(base: MotionPreset): Variants {
  return {
    enter: (c: ExitCustom) =>
      c.still
        ? { opacity: 1, x: 0 }
        : { ...withDirection(base, c.direction).initial },
    center: { ...base.animate },
    exit: (c: ExitCustom) =>
      c.dragged && !c.reduced
        ? {
            x: -c.direction * FLING_PX,
            opacity: 0,
            transition: {
              x: springOf("swipe"),
              opacity: tweenOf("fast", "exit"),
            },
          }
        : { ...withDirection(base, c.direction).exit },
  };
}

function Deck({
  picks,
  stack,
  fresh,
  reveal,
}: {
  picks: MockPick;
  stack: UseSwipeStack;
  /** 이번 회차에 아직 넘기지 않았다(첫 카드는 움직이지 않고 들어온다) */
  fresh: boolean;
  /** 다시 뽑기 직후라 블록이 순서대로 나타난다 */
  reveal: boolean;
}) {
  const reduced = useMotionReduced();
  const hydrated = useHydrated();
  const preset = useMotionPreset("spring-card");
  const place = picks[stack.index] ?? picks[0];
  const behind = Math.min(2, stack.total - 1 - stack.index);
  const custom: ExitCustom = {
    direction: stack.direction,
    dragged: stack.dragged,
    reduced,
    still: fresh,
  };

  return (
    <LazyMotion features={loadDomMax} strict>
      <div
        tabIndex={0}
        onKeyDown={stack.onKeyDown}
        aria-describedby="home-a-hint"
        className="relative grid rounded-card outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring focus-visible:outline-solid"
      >
        <p id="home-a-hint" className="sr-only">
          {copy.deck.hint}
        </p>
        {/* 뒤에 남은 카드 가장자리. 앞 카드보다 좁고 아래로 조금씩 비친다(움직임 없음, 남은 장수만 알린다) */}
        {[2, 1].map((depth) => (
          <div
            key={depth}
            aria-hidden
            className={cn(
              "absolute inset-0 rounded-card border border-border bg-card transition-[opacity,translate,scale] duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
              depth === 1
                ? "translate-y-2.5 scale-x-[0.95]"
                : "translate-y-5 scale-x-[0.9]",
              depth > behind && "translate-y-0 scale-x-100 opacity-0",
            )}
          />
        ))}

        {/* initial 기본값: 회차 첫 카드는 still 변형이라 움직이지 않고, 다시 뽑기 뒤 블록 순차 등장은 막히지 않는다 */}
        <AnimatePresence custom={custom}>
          <m.div
            key={place.id}
            role="group"
            aria-roledescription="slide"
            aria-label={copy.deck.slide(stack.index + 1, stack.total)}
            custom={custom}
            variants={cardVariants(preset)}
            initial="enter"
            animate="center"
            exit="exit"
            transition={preset.transition}
            drag="x"
            dragListener={!(hydrated && reduced)}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{
              left: stack.canNext ? 0.5 : 0.12,
              right: stack.canPrev ? 0.5 : 0.12,
            }}
            dragTransition={{
              bounceStiffness: motionTokens.spring.swipe.stiffness,
              bounceDamping: motionTokens.spring.swipe.damping,
            }}
            onDragEnd={stack.onDragEnd}
            className="relative col-start-1 row-start-1 cursor-grab touch-pan-y select-none active:cursor-grabbing"
          >
            <RevealProvider value={reveal}>
              <CardA place={place} />
            </RevealProvider>
          </m.div>
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}

/** 카드 한 장 (DESIGN.md 5장 해부도). 블록 0~3은 다시 뽑기 뒤 순서대로 나타난다 */
function CardA({ place }: { place: MockPlace }) {
  return (
    <article
      aria-label={place.name}
      className="flex flex-col gap-6 rounded-card border border-border bg-card p-7 text-card-foreground @max-[23.75rem]/screen:p-5"
    >
      <ShuffleBlock
        index={0}
        className="flex items-start justify-between gap-4"
      >
        <div className="flex min-w-0 flex-col gap-2 pt-1">
          <CategoryCaption place={place} />
          <h2 className="type-heading text-balance break-keep">{place.name}</h2>
          <CardBadges place={place} className="pt-1" />
        </div>
        <CategoryIllustration
          slug={place.category}
          className="-mt-2 -mr-2 shrink-0"
        />
      </ShuffleBlock>
      <ShuffleBlock index={1}>
        <NumberGrid place={place} />
      </ShuffleBlock>
      <ShuffleBlock index={2}>
        <p className="truncate type-body-sm text-muted-foreground">
          {place.reason}
        </p>
      </ShuffleBlock>
      <ShuffleBlock index={3} className="flex gap-2">
        <Button
          variant="primary"
          aria-label={copy.actions.directionsTo(place.name)}
          className="flex-1"
        >
          {copy.actions.directions}
        </Button>
        <Button aria-label={copy.actions.detailOf(place.name)}>
          {copy.actions.detail}
        </Button>
      </ShuffleBlock>
    </article>
  );
}

/** 이전/다음 버튼과 현재 위치 (스와이프만 있는 조작 금지, CLAUDE.md 6.3) */
function Pager({ stack }: { stack: UseSwipeStack }) {
  return (
    <div className="flex items-center gap-1">
      <Button
        size="icon"
        aria-label={copy.deck.previous}
        disabled={!stack.canPrev}
        focusableWhenDisabled
        onClick={stack.prev}
      >
        <ChevronLeft aria-hidden strokeWidth={1.5} />
      </Button>
      <p
        aria-hidden
        className="w-12 text-center type-label text-muted-foreground tabular-nums"
      >
        <span className="text-foreground">{stack.index + 1}</span>
        {` / ${stack.total}`}
      </p>
      <Button
        size="icon"
        aria-label={copy.deck.next}
        disabled={!stack.canNext}
        focusableWhenDisabled
        onClick={stack.next}
      >
        <ChevronRight aria-hidden strokeWidth={1.5} />
      </Button>
    </div>
  );
}

/* ---------- 로딩 ---------- */

function LoadingA({ label }: { label: string }) {
  return (
    <LoadingRegion label={label} className="mt-7 flex flex-col">
      <Skeleton className="h-16 w-full rounded-none" />
      <div className="relative mt-8">
        <div
          aria-hidden
          className="absolute inset-0 translate-y-5 scale-x-[0.9] rounded-card border border-border bg-card"
        />
        <div
          aria-hidden
          className="absolute inset-0 translate-y-2.5 scale-x-[0.95] rounded-card border border-border bg-card"
        />
        <CardSkeleton bare className="relative" />
      </div>
      <div aria-hidden className="mt-8 flex items-center justify-between">
        <Skeleton className="h-12 w-40 rounded-button" />
        <Skeleton className="h-12 w-32 rounded-button" />
      </div>
    </LoadingRegion>
  );
}
