"use client";
// 홈 시안 D "오늘의 한 곳 + 대안 2곳" (T3.1, 오케스트레이터 제안안).
//
// 의도: 고르는 일을 앱이 먼저 끝내 둔다. 1순위 한 곳을 크게 권하고, 나머지 두 곳은 작은 줄로만 둔다. 10초 원칙에 가장 가깝다.
// 구성: 머리 → 큰 카드 1장(일러스트 152px가 시각적 주인공, 식당명 30px 세리프, 이유 16px 본문 글자, 배지,
//       숫자 18px 3칸, 길찾기 + 상세) → "또는 이 두 곳" 두 줄 → 다시 뽑기, 그냥 골라줘 → 어제 피드백 카드 → 진입점 알약.
// T3.2 위계: "이름과 이유를 먼저 읽는다". 앱이 이미 골랐으니 왜 이 집인지가 설득의 중심이고, 숫자는 확인용으로 낮춘다.
//       이유를 식당명 바로 아래로 올리고 보조 색 15px에서 본문 색 16px(두 줄까지)로 키웠다. 숫자는 28px에서 18px.
// 대안 줄을 누르면 그 곳이 큰 카드로 올라오고 원래 큰 카드는 대안 줄로 내려간다(순서 교환).
// 모션: 교환은 큰 카드가 fast로 흐려진 뒤 새 카드가 8px 아래에서 slow로 떠오른다(AnimatePresence mode="wait").
//       다시 뽑기는 블록 순차 등장. 첫 화면은 CSS 페이드(D-04).
// 위험: DESIGN.md 9장 "일러스트를 카드 폭 30%보다 크게 키우지 않는다"를 넘는다(152 / 342 = 44%). 6장의 큰 카드 120~160px 범위 안이다.
// 데스크톱: 같은 배치를 좌 칸에, 지도 핀은 큰 카드의 곳.
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { ArrowUpRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ListSkeleton, LoadingRegion, SkeletonLine } from "@/components/states";
import { Button } from "@/components/ui/button";
import { focusRing } from "@/components/ui/interaction";
import { Skeleton } from "@/components/ui/skeleton";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import type { MockPlace } from "@/features/design-lab/mock";
import { getHomeContent } from "@/features/design-lab/system/states";
import { CategoryIllustration } from "@/features/place/illustrations";
import { tweenOf, useMotionReduced } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  CardBadges,
  CategoryCaption,
  CellEstimateMark,
  NumberGrid,
  NumberValue,
  numberCells,
} from "../shared/card-bits";
import { HomeHeader, JustPickButton, RerollButton } from "../shared/controls";
import { JustPickLayer, useJustPick, type JustPick } from "../shared/just-pick";
import { EntryLinks } from "../shared/entries";
import { YesterdayFeedback } from "../shared/feedback";
import {
  HomeColumn,
  HomeFrame,
  HomeMap,
  HomeStateMessage,
} from "../shared/frame";
import { RevealProvider, ShuffleBlock, ShuffleSwap } from "../shared/shuffle";
import { useHomeLab } from "../shared/use-home-lab";
import type { HomeVariantProps } from "../types";

const copy = designLabHomeCopy.screen;

export function HomeD({ state }: HomeVariantProps) {
  const content = getHomeContent(state);
  const lab = useHomeLab();
  /** 화면 순서: 0번이 큰 카드. 교환하면 순서만 바꾼다 */
  const [order, setOrder] = useState<[number, number, number]>([0, 1, 2]);
  /** 마지막으로 교환한 회차. 지금 회차와 같으면 새 큰 카드는 블록 순차 등장 대신 통째로 떠오른다 */
  const [swapRound, setSwapRound] = useState(-1);
  // 그냥 골라줘(T3.3): 기본 r1은 큰 카드와 대안 두 줄 위에서 돈다. 결과가 대안이면 큰 카드로 올려 둔다(닫으면 바로 길찾기)
  const pick = useJustPick({
    variant: "d",
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
    // 그냥 골라줘 결과는 JustPickLayer가 따로 읽는다
    if (announce)
      lab.announce(copy.single.swapped(lab.picks[next[0]]?.name ?? ""));
  }

  const resetOrder = () => setOrder([0, 1, 2]);
  const header = (
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
  );

  if (content.kind !== "ready") {
    return (
      <HomeFrame>
        <HomeColumn>
          {header}
          {content.kind === "loading" ? (
            <LoadingD label={content.label} />
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

  const [heroIndex, ...altIndexes] = order;
  const hero = lab.picks[heroIndex] ?? lab.picks[0];
  const swapped = swapRound === lab.round;

  function promote(slot: 1 | 2) {
    swapTo(slot, true);
  }

  return (
    <HomeFrame map={<HomeMap picks={lab.picks} active={heroIndex} />}>
      <HomeColumn>
        {header}
        <p aria-live="polite" className="sr-only">
          {lab.announcement}
        </p>

        <ShuffleSwap round={lab.round} className="mt-7">
          {/* 첫 화면(0회차)은 Motion 등장 없이, 다시 뽑기 뒤에는 안쪽 블록 순차 등장이 막히지 않게 */}
          <AnimatePresence mode="wait" initial={lab.round > 0}>
            <HeroSlot key={hero.id} animate={swapped}>
              <RevealProvider value={lab.round > 0 && !swapped}>
                <HeroCard place={hero} spot={spotOf(pick, heroIndex)} />
              </RevealProvider>
            </HeroSlot>
          </AnimatePresence>

          <section aria-labelledby="home-d-alt" className="mt-10">
            <h2 id="home-d-alt" className="type-caption text-muted-foreground">
              {copy.single.alternatives}
            </h2>
            <ul className="mt-2 flex flex-col border-t border-border">
              {altIndexes.map((idx, slot) => {
                const place = lab.picks[idx];
                if (!place) return null;
                return (
                  <ShuffleBlock
                    key={place.id}
                    index={5 + slot}
                    as="li"
                    className="border-b border-border"
                  >
                    <AltRow
                      place={place}
                      spot={spotOf(pick, idx)}
                      onPromote={() => promote((slot + 1) as 1 | 2)}
                    />
                  </ShuffleBlock>
                );
              })}
            </ul>
          </section>
        </ShuffleSwap>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <RerollButton
            onClick={() => {
              resetOrder();
              lab.reroll();
            }}
          />
          <JustPickButton pick={pick} from={heroIndex} />
        </div>

        {/* 결정이 먼저라 어제 피드백은 대안 아래로 내린다 */}
        <YesterdayFeedback layout="card" className="mt-10" />
        <EntryLinks layout="pills" className="mt-4" />
        <JustPickLayer pick={pick} picks={lab.picks} />
      </HomeColumn>
    </HomeFrame>
  );
}

type Spot = "on" | "off" | "dim" | undefined;

/** 그냥 골라줘 r1 연출 중 이 카드의 상태. 연출 밖이면 undefined */
function spotOf(pick: JustPick, index: number): Spot {
  if (!pick.pageHighlight) return undefined;
  if (pick.cursor === index) return "on";
  return pick.landed ? "dim" : "off";
}

/** 큰 카드 자리. 교환으로 들어올 때만 8px 아래에서 떠오르고, 나갈 때는 fast로 흐려진다 */
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

function HeroCard({ place, spot }: { place: MockPlace; spot?: Spot }) {
  return (
    <article
      aria-label={place.name}
      className={cn(
        "flex flex-col rounded-card border bg-card p-7 text-card-foreground transition-[border-color,opacity] ease-standard @max-[23.75rem]/screen:p-5",
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
        <div className="flex min-w-0 flex-col gap-2 pt-1">
          <span className="type-caption text-muted-foreground">
            {copy.single.eyebrow}
          </span>
          <CategoryCaption place={place} className="mt-5" />
          <h2 className="type-title text-balance break-keep">{place.name}</h2>
        </div>
        <CategoryIllustration
          slug={place.category}
          size={152}
          className="-mt-3 -mr-4 shrink-0 @max-[23.75rem]/screen:size-28"
        />
      </ShuffleBlock>
      <ShuffleBlock index={1} className="mt-3">
        <p className="line-clamp-2 type-body text-pretty text-foreground">
          {place.reason}
        </p>
      </ShuffleBlock>
      <ShuffleBlock index={2} className="mt-4 min-h-6">
        <CardBadges place={place} />
      </ShuffleBlock>
      <ShuffleBlock index={3} className="mt-7">
        <NumberGrid place={place} size="md" />
      </ShuffleBlock>
      <ShuffleBlock index={4} className="mt-7 flex gap-2">
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

/** 대안 한 줄: 아이콘 + 식당명과 카테고리 + 도보와 가격. 줄 전체가 "크게 보기" 버튼 */
function AltRow({
  place,
  spot,
  onPromote,
}: {
  place: MockPlace;
  spot?: Spot;
  onPromote: () => void;
}) {
  const [walk, price] = numberCells(place);
  return (
    <button
      type="button"
      onClick={onPromote}
      aria-label={copy.single.swap(place.name)}
      className={cn(
        "group -mx-3 flex min-h-18 w-[calc(100%+1.5rem)] items-center gap-4 rounded-card border px-3 py-3 text-left transition-[border-color,background-color,opacity] ease-standard",
        spot
          ? "duration-(--lm-duration-fast)"
          : "duration-(--lm-duration-base)",
        spot === "on" ? "border-primary bg-card" : "border-transparent",
        spot === "dim" && "opacity-40",
        focusRing,
      )}
    >
      <CategoryIllustration slug={place.category} size={40} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate type-label">{place.name}</span>
        <CategoryCaption place={place} />
      </span>
      <span className="flex shrink-0 items-baseline gap-3">
        {walk ? <NumberValue cell={walk} size="md" /> : null}
        {price ? (
          <span className="flex items-baseline gap-1.5">
            <NumberValue cell={price} size="md" />
            {price.estimate ? <CellEstimateMark /> : null}
          </span>
        ) : null}
      </span>
      <ArrowUpRight
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground transition-transform duration-(--lm-duration-fast) ease-standard group-hover:-translate-y-0.5 motion-reduce:transition-none"
        strokeWidth={1.5}
      />
    </button>
  );
}

/* ---------- 로딩 ---------- */

function LoadingD({ label }: { label: string }) {
  return (
    <LoadingRegion label={label} className="mt-7 flex flex-col">
      <div
        aria-hidden
        className="flex flex-col rounded-card border border-border bg-card p-7"
      >
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2 pt-1">
            <SkeletonLine type="caption" className="w-16" />
            <SkeletonLine
              type="caption"
              lineClassName="mt-5"
              className="w-10"
            />
            <SkeletonLine type="title" className="w-32" />
          </div>
          <div className="relative -mt-3 -mr-4 size-[8.5rem] shrink-0">
            <Skeleton className="absolute top-[24px] left-[21px] size-[71px] rounded-full" />
          </div>
        </div>
        <SkeletonLine type="body" lineClassName="mt-3" className="w-4/5" />
        <SkeletonLine type="label" lineClassName="mt-14" className="w-3/5" />
        <Skeleton className="mt-7 h-12 w-full rounded-button" />
      </div>
      <SkeletonLine type="caption" lineClassName="mt-10" className="w-20" />
      <ListSkeleton bare rows={2} className="mt-2 border-t border-border" />
    </LoadingRegion>
  );
}
