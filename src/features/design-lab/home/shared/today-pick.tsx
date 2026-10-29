"use client";
// 홈 D1 "오늘의 한 곳" 조각 (G3 D 선택 뒤 수정안 D1, design-decisions D-05). 규칙 정본은 DESIGN.md 5장 "오늘(홈) 화면".
// - 큰 카드 1장 + 대안 작은 카드 2장 + 하단 고정 행동 줄(길찾기 올리브 하나 + 그냥 골라줘 + 다시 뽑기 아이콘).
//   D는 길찾기가 큰 카드 안이라 390 x 844에서 0.62(하단 1/3 밖)였다. 행동을 카드에서 떼어 하단 탭 바로 위에 묶었다(0.85).
// - 큰 카드: "상세"는 배지 줄 오른쪽 글자 버튼. 일러스트 152px(카드 폭의 약 44%)는 이 큰 카드 한정 예외(안건 6).
//   이유 문장에서 "도보 약 N분"을 뺐다(바로 아래 도보 칸과 중복, src/features/rec/reason.ts).
// - 대안: 나란히 놓인 작은 카드 두 장(아이콘 28 + 식당명, 도보와 만족). 누르면 큰 카드와 자리를 바꾼다.
// - 배지 calm(안건 1), 그냥 골라줘 R1 화면 위 순회(안건 2), 다시 고르기 직전 곳 제외(안건 3),
//   데스크톱 결과 패널은 좌 리스트 칸 안 + 지도 핀 강조(안건 4), 데스크톱 좌 세로 + 우 지도 2단(안건 5).
// 모션: 첫 화면은 CSS 페이드 하나(ShuffleSwap). Motion은 다시 뽑기와 교환 뒤에만(D-04).
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { ThumbsUp } from "lucide-react";
import { useState, type ReactNode, type Ref } from "react";
import { LoadingRegion, SkeletonLine } from "@/components/states";
import { Button } from "@/components/ui/button";
import { focusRing, hitArea44, pressMotion } from "@/components/ui/interaction";
import { Skeleton } from "@/components/ui/skeleton";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import { homeCopy } from "@/copy/home";
import type { MockPlace } from "@/features/design-lab/mock";
import { CategoryIllustration } from "@/features/place/illustrations";
import { reasonWithoutWalk } from "@/features/rec/reason";
import { tweenOf, useMotionReduced } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  BadgeRowSkeleton,
  CardBadges,
  CategoryCaption,
  NumberGrid,
  NumberGridSkeleton,
  NumberValue,
  numberCells,
} from "./card-bits";
import { HomeHeader, JustPickButton, RerollButton } from "./controls";
import { JustPickLayer, useJustPick, type JustPick } from "./just-pick";
import { RevealProvider, ShuffleBlock, ShuffleSwap } from "./shuffle";
import { useHomeLab, type HomeLab } from "./use-home-lab";

const copy = designLabHomeCopy.screen;

/** 이유 문장: 도보 분을 뺀 것 (안건 6) */
export const todayReason = (place: MockPlace) =>
  reasonWithoutWalk(place.reason);

/* ---------- 상태 ---------- */

export type TodayPick = {
  lab: HomeLab;
  pick: JustPick;
  order: [number, number, number];
  heroIndex: number;
  hero: MockPlace;
  /** 지금 회차에 교환이 있었다(새 큰 카드는 통째로 떠오른다) */
  swapped: boolean;
  promote: (slot: 1 | 2) => void;
  reroll: () => void;
  header: ReactNode;
};

export function useTodayPick(): TodayPick {
  const lab = useHomeLab();
  const [order, setOrder] = useState<[number, number, number]>([0, 1, 2]);
  const [swapRound, setSwapRound] = useState(-1);
  // R1은 큰 카드와 대안 카드 위에서 돈다. 결과가 대안이면 큰 카드로 올려 둔다(지도 핀도 따라간다, 안건 4)
  const pick = useJustPick({
    picks: lab.picks,
    onSettle: (index) => {
      const slot = order.indexOf(index);
      if (slot === 1 || slot === 2) swapTo(slot, false);
    },
  });

  function swapTo(slot: 1 | 2, announce: boolean) {
    const next = [...order] as [number, number, number];
    [next[0], next[slot]] = [next[slot], next[0]];
    setOrder(next);
    setSwapRound(lab.round);
    if (announce)
      lab.announce(copy.single.swapped(lab.picks[next[0]]?.name ?? ""));
  }

  const resetOrder = () => setOrder([0, 1, 2]);
  const heroIndex = order[0];

  return {
    lab,
    pick,
    order,
    heroIndex,
    hero: lab.picks[heroIndex] ?? lab.picks[0],
    swapped: swapRound === lab.round,
    promote: (slot) => swapTo(slot, true),
    reroll: () => {
      resetOrder();
      lab.reroll();
    },
    header: (
      <HomeHeader
        meal={lab.meal}
        location={lab.location}
        onMeal={(meal) => {
          resetOrder();
          lab.setMeal(meal);
        }}
        onLocation={() => {
          resetOrder();
          lab.cycleLocation();
        }}
      />
    ),
  };
}

type Spot = "on" | "off" | "dim" | undefined;

function spotOf(pick: JustPick, index: number): Spot {
  if (!pick.pageHighlight) return undefined;
  if (pick.cursor === index) return "on";
  return pick.landed ? "dim" : "off";
}

/* ---------- 큰 카드 + 대안 ---------- */

/** 큰 카드와 대안 두 장. 다시 뽑기는 ShuffleSwap, 교환은 큰 카드 자리만 흐려졌다 떠오른다 */
export function TodayPicks({
  t,
  heroRef,
  className,
}: {
  t: TodayPick;
  /** 피드백에 답한 뒤 포커스를 옮길 자리 */
  heroRef?: Ref<HTMLElement>;
  className?: string;
}) {
  const { lab, pick, order, hero, heroIndex, swapped } = t;
  const [, ...altIndexes] = order;
  return (
    <ShuffleSwap round={lab.round} className={className}>
      <AnimatePresence mode="wait" initial={lab.round > 0}>
        <HeroSlot key={hero.id} animate={swapped}>
          <RevealProvider value={lab.round > 0 && !swapped}>
            <TodayHero
              ref={heroRef}
              place={hero}
              spot={spotOf(pick, heroIndex)}
            />
          </RevealProvider>
        </HeroSlot>
      </AnimatePresence>

      <section aria-labelledby="today-alt" className="mt-5 desktop:mt-4">
        <h2 id="today-alt" className="type-caption text-muted-foreground">
          {copy.single.alternatives}
        </h2>
        <ul className="mt-2 grid grid-cols-2 gap-2">
          {altIndexes.map((idx, slot) => {
            const place = lab.picks[idx];
            if (!place) return null;
            return (
              <ShuffleBlock
                key={place.id}
                index={5 + slot}
                as="li"
                className="flex min-w-0"
              >
                <AltTile
                  place={place}
                  spot={spotOf(pick, idx)}
                  onPromote={() => t.promote((slot + 1) as 1 | 2)}
                />
              </ShuffleBlock>
            );
          })}
        </ul>
      </section>
    </ShuffleSwap>
  );
}

function HeroSlot({
  animate,
  children,
}: {
  animate: boolean;
  children: ReactNode;
}) {
  const reduced = useMotionReduced();
  const [enter] = useState(animate && !reduced);
  return (
    <m.div
      initial={enter ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0, transition: tweenOf("slow", "enter") }}
      exit={{
        opacity: 0,
        transition: reduced ? { duration: 0 } : tweenOf("fast", "exit"),
      }}
    >
      {children}
    </m.div>
  );
}

const HERO_PAD = "p-6 @max-[23.75rem]/screen:p-5";
/** 그림 아래쪽 여백(바닥선 y 78 / 96 아래)은 이유 줄과 겹쳐도 되므로 음수 아래 여백으로 행 높이에서 뺀다 */
export const HERO_ART =
  "-mt-3 -mr-4 -mb-6 shrink-0 @max-[23.75rem]/screen:-mr-3 @max-[23.75rem]/screen:-mb-3 @max-[23.75rem]/screen:size-28 desktop:size-32 desktop:-mb-5";

function TodayHero({
  place,
  spot,
  ref,
}: {
  place: MockPlace;
  spot?: Spot;
  ref?: Ref<HTMLElement>;
}) {
  return (
    <article
      ref={ref}
      tabIndex={-1}
      aria-label={place.name}
      className={cn(
        "flex flex-col rounded-card border bg-card text-card-foreground transition-[border-color,opacity] ease-standard outline-none",
        HERO_PAD,
        spot
          ? "duration-(--lm-duration-fast)"
          : "duration-(--lm-duration-base)",
        spot === "on" ? "border-primary" : "border-border",
        spot === "dim" && "opacity-40",
      )}
    >
      <ShuffleBlock
        index={0}
        className="flex items-start justify-between gap-3"
      >
        <div className="flex min-w-0 flex-col pt-1">
          <span className="type-caption text-muted-foreground">
            {copy.single.eyebrow}
          </span>
          <CategoryCaption place={place} className="mt-4" />
          <h2 className="mt-1 type-title text-balance break-keep">
            {place.name}
          </h2>
        </div>
        <CategoryIllustration
          slug={place.category}
          size={152}
          className={HERO_ART}
        />
      </ShuffleBlock>
      <ShuffleBlock index={1} className="mt-2">
        <p className="line-clamp-2 type-body text-pretty text-foreground">
          {todayReason(place)}
        </p>
      </ShuffleBlock>
      <ShuffleBlock
        index={2}
        className="mt-3 flex min-h-6 items-start justify-between gap-3"
      >
        <CardBadges place={place} />
        <button
          type="button"
          aria-label={copy.actions.detailOf(place.name)}
          className={cn(
            "ml-auto inline-flex h-6 shrink-0 items-center rounded-sm px-0.5 type-caption text-muted-foreground underline decoration-border underline-offset-3 hover:text-foreground",
            hitArea44,
            focusRing,
          )}
        >
          {copy.actions.detail}
        </button>
      </ShuffleBlock>
      <ShuffleBlock index={3} className="mt-5">
        <NumberGrid place={place} />
      </ShuffleBlock>
    </article>
  );
}

/** 대안 작은 카드: 아이콘 + 식당명, 아래 도보와 만족. 누르면 큰 카드와 자리를 바꾼다 */
function AltTile({
  place,
  spot,
  onPromote,
}: {
  place: MockPlace;
  spot?: Spot;
  onPromote: () => void;
}) {
  const [walk, , thumbs] = numberCells(place);
  return (
    <button
      type="button"
      onClick={onPromote}
      className={cn(
        "flex min-h-18 w-full min-w-0 flex-col justify-center gap-1 rounded-card border bg-card px-3 py-2.5 text-left transition-[border-color,opacity] ease-standard hover:border-input",
        spot
          ? "duration-(--lm-duration-fast)"
          : "duration-(--lm-duration-base)",
        spot === "on" ? "border-primary" : "border-border",
        spot === "dim" && "opacity-40",
        pressMotion,
        focusRing,
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <CategoryIllustration
          slug={place.category}
          size={28}
          className="-ml-0.5 shrink-0"
        />
        <span className="truncate type-label">{place.name}</span>
      </span>
      <span className="flex min-w-0 items-baseline gap-2.5 whitespace-nowrap">
        {walk ? <NumberValue cell={walk} /> : null}
        <span aria-hidden className="h-3 w-px self-center bg-border" />
        {thumbs?.value === null ? (
          <span className="truncate type-caption text-muted-foreground">
            {homeCopy.thumbsUpEmpty}
          </span>
        ) : thumbs ? (
          <span className="inline-flex items-baseline gap-1">
            <ThumbsUp
              aria-hidden
              className="size-3.5 translate-y-px self-center text-muted-foreground"
              strokeWidth={1.5}
            />
            <span className="sr-only">{thumbs.label}</span>
            <NumberValue cell={thumbs} />
          </span>
        ) : null}
      </span>
      <span className="sr-only">{copy.single.swapHint}</span>
    </button>
  );
}

/* ---------- 하단 고정 줄 ---------- */

/**
 * 하단 탭 바로 위에 붙는 줄. 내용이 짧으면 칸 맨 아래(mt-auto), 길면 스크롤해도 엄지 자리에 남는다.
 * 리스트 칸 좌우 여백까지 덮어 아래로 지나가는 카드를 가린다.
 */
export function BottomDock({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        // 모바일은 화면 끝까지(위 선이 탭 바 선과 나란히), 데스크톱은 리스트 내용 폭에 맞춘다(어제 띠의 선과 같은 폭)
        "sticky bottom-[calc(var(--lm-layout-tab-bar-height)+env(safe-area-inset-bottom,0px))] z-[5] -mx-(--lm-layout-gutter) mt-auto border-t border-border bg-background px-(--lm-layout-gutter) py-3 desktop:mx-0 desktop:px-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** 길찾기(주 버튼 하나) + 그냥 골라줘 + 다시 뽑기 아이콘 */
export function TodayActionBar({ t }: { t: TodayPick }) {
  return (
    <BottomDock label={copy.single.actionsLabel}>
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          aria-label={copy.actions.directionsTo(t.hero.name)}
          className="min-w-0 flex-1"
        >
          {copy.actions.directions}
        </Button>
        <JustPickButton
          pick={t.pick}
          from={t.heroIndex}
          // "바로 보기"로 바뀌어도 폭이 같게(길찾기 폭이 출렁이지 않게)
          className="min-w-32 shrink-0 @max-[23.75rem]/screen:pr-4 @max-[23.75rem]/screen:pl-3"
        />
        <RerollButton onClick={t.reroll} className="shrink-0" />
      </div>
    </BottomDock>
  );
}

/** 결과 패널 자리: 데스크톱은 좌 리스트 칸 안(안건 4), 이유는 도보 분을 뺀 문장 */
export function TodayJustPickLayer({ t }: { t: TodayPick }) {
  return (
    <JustPickLayer
      pick={t.pick}
      picks={t.lab.picks}
      formatReason={todayReason}
    />
  );
}

/* ---------- 로딩 (실제 카드와 같은 자리, 같은 높이) ---------- */

/** 일러스트 자리의 원. 그림의 옅은 원(중심 40,42 반지름 25 / 96)과 같은 비율 */
function ArtCircle({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative", className)}>
      <Skeleton className="absolute top-[17.7%] left-[15.6%] size-[52.1%] rounded-full" />
    </div>
  );
}

export function TodayPicksSkeleton({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <LoadingRegion label={label} className={cn("flex flex-col", className)}>
      <div
        aria-hidden
        className={cn(
          "flex flex-col rounded-card border border-border bg-card",
          HERO_PAD,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col pt-1">
            <SkeletonLine type="caption" className="w-16" />
            <SkeletonLine
              type="caption"
              lineClassName="mt-4"
              className="w-10"
            />
            <SkeletonLine type="title" lineClassName="mt-1" className="w-32" />
          </div>
          <ArtCircle className={cn("size-[9.5rem]", HERO_ART)} />
        </div>
        <SkeletonLine type="body" lineClassName="mt-2" className="w-3/5" />
        <div className="mt-3 flex min-h-6 justify-between">
          <BadgeRowSkeleton />
          <SkeletonLine type="caption" className="w-6" />
        </div>
        <NumberGridSkeleton className="mt-5" />
      </div>
      <SkeletonLine type="caption" lineClassName="mt-5" className="w-20" />
      <div aria-hidden className="mt-2 grid grid-cols-2 gap-2">
        {["w-20", "w-16"].map((w) => (
          <div
            key={w}
            className="flex min-h-18 flex-col justify-center gap-1 rounded-card border border-border bg-card px-3 py-2.5"
          >
            <div className="flex items-center gap-2">
              <ArtCircle className="-ml-0.5 size-7" />
              <SkeletonLine type="label" className={w} />
            </div>
            <div className="flex min-h-[1.35rem] items-end">
              <Skeleton className="mb-0.5 h-3.5 w-16 rounded-badge" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function ActionBarSkeleton() {
  return (
    <BottomDock label={copy.single.actionsLabel}>
      <div aria-hidden className="flex items-center gap-2">
        <Skeleton className="h-12 min-w-0 flex-1 rounded-button" />
        <Skeleton className="h-12 w-34 shrink-0 rounded-button" />
        <Skeleton className="size-12 shrink-0 rounded-full" />
      </div>
    </BottomDock>
  );
}
