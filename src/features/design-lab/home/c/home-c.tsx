"use client";
// 홈 시안 C "세로 3단 비교" (T3.1).
//
// 의도: 세 곳을 넘기지 않고 한 화면에서 비교한다. 카드보다 표에 가까운 밀도로, 숫자 열(도보, 1인, 만족)을 세 줄에 맞춰 세로로 읽는다.
// 구성: 머리(제목 옆 다시 뽑기 아이콘) → 열 머리글 → 세 줄 → 그냥 골라줘 → 어제 피드백 띠 → 진입점 목록.
// 줄: 일러스트 아이콘 40px(열 0) + 식당명 세리프와 카테고리(열 1~3) / 숫자 18px 세 칸(열 1~3) / 이유 한 줄과 배지.
// 열마다 가장 나은 값(가장 가까움, 가장 쌈, 만족 가장 높음)만 진한 글자, 나머지는 보조 색. 색이 아니라 명도 차이라 단색 화면을 지킨다.
// 고르기: 줄을 누르면 그 줄만 카드 면(bg-card, 1px 선)으로 떠오르고 아래로 길찾기(주 버튼) + 상세가 펼쳐진다. 한 번에 한 줄.
// 모션: 펼침은 CSS grid-rows 0fr → 1fr(base, standard), 면 전환도 CSS. 다시 뽑기는 줄 단위 순차 등장(ShuffleSwap).
// 데스크톱: 같은 표를 좌 칸에 두고 고른 줄의 핀을 지도 자리에서 올리브로.
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { LoadingRegion, SkeletonLine } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { focusRing } from "@/components/ui/interaction";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import type { MockPick, MockPlace } from "@/features/design-lab/mock";
import { getHomeContent } from "@/features/design-lab/system/states";
import { CategoryIllustration } from "@/features/place/illustrations";
import { cn } from "@/lib/utils";
import {
  CardBadges,
  CategoryCaption,
  NumberValue,
  numberCells,
  type NumberCell,
} from "../shared/card-bits";
import { HomeHeader, JustPickButton, RerollButton } from "../shared/controls";
import { EntryLinks } from "../shared/entries";
import { YesterdayFeedback } from "../shared/feedback";
import {
  HomeColumn,
  HomeFrame,
  HomeMap,
  HomeStateMessage,
} from "../shared/frame";
import { ShuffleBlock, ShuffleSwap } from "../shared/shuffle";
import { useHomeLab } from "../shared/use-home-lab";
import type { HomeVariantProps } from "../types";

const copy = designLabHomeCopy.screen;
const numbers = copy.numbers;

/** 열 0 아이콘, 열 1~3 숫자. 가격 칸이 조금 넓다(DESIGN.md 4장 360px 대응과 같은 비율) */
const gridCols = "grid grid-cols-[2.5rem_0.8fr_1.25fr_0.9fr] gap-x-3";

type Best = Record<NumberCell["key"], number>;

/** 열마다 가장 나은 줄의 번호. 만족이 모두 null이면 -1 */
function bestOf(picks: MockPick): Best {
  const minBy = (f: (p: MockPlace) => number) =>
    picks.reduce((b, p, i) => (f(p) < f(picks[b]!) ? i : b), 0);
  let thumbs = -1;
  picks.forEach((p, i) => {
    if (p.thumbsUpRate === null) return;
    const cur = thumbs === -1 ? null : picks[thumbs]!.thumbsUpRate;
    if (cur === null || p.thumbsUpRate > cur) thumbs = i;
  });
  return {
    walk: minBy((p) => p.walkMinutes),
    price: minBy((p) => p.priceKRW),
    thumbs,
  };
}

export function HomeC({ state }: HomeVariantProps) {
  const content = getHomeContent(state);
  const lab = useHomeLab();
  const [selected, setSelected] = useState(0);

  const header = (
    <HomeHeader
      meal={lab.meal}
      location={lab.location}
      onMeal={(meal) => {
        setSelected(0);
        lab.setMeal(meal);
      }}
      onLocation={() => {
        setSelected(0);
        lab.cycleLocation();
      }}
      trailing={
        content.kind === "ready" ? (
          <RerollButton
            iconOnly
            className="-mb-1"
            onClick={() => {
              setSelected(0);
              lab.reroll();
            }}
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
            <LoadingC label={content.label} />
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

  const best = bestOf(lab.picks);

  return (
    <HomeFrame map={<HomeMap picks={lab.picks} active={selected} />}>
      <HomeColumn>
        {header}
        <p aria-live="polite" className="sr-only">
          {lab.announcement}
        </p>

        <section aria-label={copy.compare.tableLabel} className="mt-9">
          {/* 열 머리글. 각 줄 숫자에도 같은 라벨이 dt로 있어 보조 기술에는 숨긴다 */}
          <div aria-hidden className={cn(gridCols, "px-4 pb-2")}>
            <span />
            <span className="type-caption text-muted-foreground">
              {numbers.walk}
            </span>
            <span className="type-caption text-muted-foreground">
              {numbers.price}
            </span>
            <span className="type-caption text-muted-foreground">
              {numbers.thumbs}
            </span>
          </div>
          <ShuffleSwap round={lab.round}>
            <ol className="flex flex-col">
              {lab.picks.map((p, i) => (
                <ShuffleBlock key={p.id} index={i} as="li">
                  <Row
                    place={p}
                    best={best}
                    order={i}
                    selected={i === selected}
                    neighborSelected={i - 1 === selected}
                    onSelect={() => {
                      if (i === selected) return;
                      setSelected(i);
                      lab.announce(copy.compare.selected(p.name));
                    }}
                  />
                </ShuffleBlock>
              ))}
            </ol>
          </ShuffleSwap>
          <p className="mt-3 px-4 type-caption text-muted-foreground">
            {copy.compare.bestHint}
          </p>
        </section>

        <div className="mt-6 flex">
          <JustPickButton className="flex-1" />
        </div>

        <YesterdayFeedback layout="line" className="mt-10" />
        <EntryLinks layout="rows" className="mt-8" />
      </HomeColumn>
    </HomeFrame>
  );
}

/* ---------- 줄 ---------- */

function Row({
  place,
  best,
  order,
  selected,
  neighborSelected,
  onSelect,
}: {
  place: MockPlace;
  best: Best;
  order: number;
  selected: boolean;
  /** 바로 위 줄이 골라져 떠 있으면 이 줄의 윗선을 지운다(선 두 겹 방지) */
  neighborSelected: boolean;
  onSelect: () => void;
}) {
  const panelId = `home-c-actions-${place.id}`;
  return (
    <article
      aria-label={place.name}
      className={cn(
        "rounded-card border px-4 transition-[background-color,border-color] duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
        selected
          ? "border-border bg-card"
          : cn(
              "rounded-none border-x-transparent border-b-transparent bg-transparent",
              order === 0 || neighborSelected
                ? "border-t-transparent"
                : "border-t-border",
            ),
      )}
    >
      {/* 줄 전체를 눌러도 고른다(터치 편의). 키보드와 보조 기술은 식당명 버튼 하나로 조작한다 */}
      <div
        onClick={onSelect}
        className={cn(
          gridCols,
          "cursor-pointer gap-y-3 py-4",
          selected && "cursor-default",
        )}
      >
        <CategoryIllustration
          slug={place.category}
          size={40}
          className="row-span-3 -mt-0.5"
        />
        <h2 className="col-span-3 flex min-w-0">
          <button
            type="button"
            aria-expanded={selected}
            aria-controls={panelId}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className={cn(
              "-my-1 flex min-w-0 flex-1 items-baseline justify-between gap-3 rounded-sm py-1 text-left",
              focusRing,
            )}
          >
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="truncate type-heading">{place.name}</span>
              <CategoryCaption place={place} className="shrink-0" />
            </span>
            <ChevronDown
              aria-hidden
              className={cn(
                "size-4 shrink-0 self-center text-muted-foreground transition-transform duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
                selected && "rotate-180",
              )}
              strokeWidth={1.5}
            />
          </button>
        </h2>
        <dl className="col-span-3 grid grid-cols-subgrid">
          {numberCells(place).map((c) => {
            const isBest = best[c.key] === order;
            return (
              <div key={c.key} className="flex min-w-0 flex-col">
                <dt className="sr-only">{c.label}</dt>
                <dd>
                  <NumberValue cell={c} size="md" emphasis={isBest} />
                  {isBest ? (
                    <span className="sr-only">{copy.compare.best}</span>
                  ) : null}
                </dd>
              </div>
            );
          })}
        </dl>
        <p className="col-span-3 truncate type-body-sm text-muted-foreground">
          {place.reason}
        </p>
      </div>

      {/* 펼침: 배지 + 길찾기(주 버튼) + 상세. grid-rows 0fr → 1fr */}
      <div
        id={panelId}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
          selected
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        )}
        inert={!selected}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-4 pb-4 pl-[3.25rem]">
            <CardBadges place={place} />
            <div className="flex gap-2">
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
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ---------- 로딩 ---------- */

function LoadingC({ label }: { label: string }) {
  return (
    <LoadingRegion label={label} className="mt-9 flex flex-col">
      <div aria-hidden className={cn(gridCols, "px-4 pb-2")}>
        <span />
        <SkeletonLine type="caption" className="w-7" />
        <SkeletonLine type="caption" className="w-6" />
        <SkeletonLine type="caption" className="w-7" />
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          aria-hidden
          className={cn(
            gridCols,
            "gap-y-3 px-4 py-4",
            i > 0 && "border-t border-border",
          )}
        >
          <Skeleton className="row-span-3 size-10 rounded-full" />
          <SkeletonLine
            type="heading"
            lineClassName="col-span-3"
            className={["w-28", "w-24", "w-32"][i]}
          />
          <SkeletonLine type="label" className="w-8" />
          <SkeletonLine type="label" className="w-16" />
          <SkeletonLine type="label" className="w-9" />
          <SkeletonLine
            type="body-sm"
            lineClassName="col-span-3"
            className="w-4/5"
          />
        </div>
      ))}
      <Skeleton aria-hidden className="mt-6 h-12 w-full rounded-button" />
    </LoadingRegion>
  );
}
