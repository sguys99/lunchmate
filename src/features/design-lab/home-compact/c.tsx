"use client";
// 시안 C 카드 안 행동 (T9.10 G9). 하단 고정 행동 줄(약 73px)을 없애고 길찾기, 그냥 골라줘, 다시 뽑기를 큰 카드 아래에 넣는다.
// 하단 탭은 64 → 52px로 낮춘다(아이콘 22 + 라벨, 칸 전체가 터치 영역이라 44px 이상 유지). 탭 높이는 모든 탭 화면에 걸리는 변경이다.
// - 큰 카드는 지금 홈 모양(이름 옆 그림)을 유지하되 그림 96/80px, 윗줄에 상세와 더 보기, 이유 줄이 펼치기
// - 약점: 길찾기 위치가 화면 위쪽으로 올라간다(엄지 영역 하단 1/3 밖, 390x664에서 약 0.6)
import { Dices, RotateCcw } from "lucide-react";
import { useId } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { homeCopy } from "@/copy/home";
import type { DesignState } from "@/features/design-lab/mock/design-state";
import { CardArt, CategoryCaption, NumberGrid } from "@/features/rec/card-bits";
import { heroNameSize } from "@/features/rec/hero-name";
import { AltTile } from "@/features/rec/today-cards";
import { cn } from "@/lib/utils";
import {
  AltHeading,
  CompactColumn,
  CompactHeader,
  CompactShell,
  CompactStates,
  DetailAndMore,
  ReasonToggle,
  Skeleton,
  SkeletonLine,
  mockCards,
  type NameMode,
} from "./shared";

const copy = homeCopy.today;

export function HomeCompactC({
  state,
  name,
}: {
  state: DesignState;
  name: NameMode;
}) {
  const cards = mockCards(name);
  const [hero, ...alts] = cards;
  const nameId = useId();
  const altId = useId();
  if (!hero) return null;
  const size = heroNameSize(hero.name);
  const art = size === "lg" ? 96 : 80;
  return (
    <CompactShell tabBarHeight="52px">
      <CompactColumn>
        <CompactHeader />
        {state !== "ready" ? (
          <CompactStates state={state} skeleton={<SkeletonC />} dock={false} />
        ) : (
          <>
            <article
              aria-labelledby={nameId}
              className="mt-3 flex flex-col rounded-card border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="flex min-w-0 items-baseline gap-2 type-caption text-muted-foreground">
                  {copy.single.eyebrow}
                  <CategoryCaption category={hero.category} />
                </p>
                <DetailAndMore name={hero.name} />
              </div>
              <div className="mt-2 flex items-start gap-3">
                <h2
                  id={nameId}
                  title={hero.name}
                  className={cn(
                    "line-clamp-2 min-w-0 flex-1 text-balance wrap-anywhere break-keep",
                    size === "sm" ? "type-heading" : "type-title",
                  )}
                >
                  {hero.name}
                </h2>
                <CardArt
                  slug={hero.category}
                  size={art}
                  className={cn(
                    "-mt-2 -mr-2 -mb-3 shrink-0",
                    art === 96 ? "size-24" : "size-20",
                  )}
                />
              </div>
              <ReasonToggle reason={hero.reason} className="mt-1" />
              <NumberGrid card={hero} className="mt-3" />
              <div
                role="group"
                aria-label={copy.single.actionsLabel}
                className="mt-4 flex items-center gap-2 border-t border-border pt-4"
              >
                <button
                  type="button"
                  aria-label={copy.actions.directionsTo(hero.name)}
                  className={cn(buttonClass("primary"), "min-w-0 flex-1")}
                >
                  {copy.actions.directions}
                </button>
                <button
                  type="button"
                  aria-haspopup="dialog"
                  className={cn(buttonClass("secondary"), "shrink-0 pr-4 pl-3")}
                >
                  <Dices aria-hidden className="size-4" strokeWidth={1.5} />
                  {copy.actions.justPick}
                </button>
                <button
                  type="button"
                  aria-label={copy.actions.reroll}
                  className={cn(buttonClass("secondary", "icon"), "shrink-0")}
                >
                  <RotateCcw aria-hidden strokeWidth={1.5} />
                </button>
              </div>
            </article>

            <section aria-labelledby={altId} className="mt-4 pb-4">
              <AltHeading id={altId} />
              <ul className="mt-2 grid grid-cols-2 gap-2">
                {alts.map((c, i) => (
                  <li key={c.id} className="flex min-w-0">
                    <AltTile
                      card={c}
                      order={copy.single.order(i + 2, cards.length)}
                      onPromote={() => {}}
                    />
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </CompactColumn>
    </CompactShell>
  );
}

function SkeletonC() {
  return (
    <>
      <div className="flex flex-col rounded-card border border-border bg-card p-5">
        <SkeletonLine type="caption" className="w-24" />
        <div className="mt-2 flex items-start gap-3">
          <SkeletonLine type="title" className="w-40" />
          <Skeleton className="ml-auto size-20 rounded-full" />
        </div>
        <SkeletonLine type="body" lineClassName="mt-2" className="w-3/5" />
        <Skeleton className="mt-4 h-11 w-full rounded-badge" />
        <div className="mt-4 flex gap-2 border-t border-border pt-4">
          <Skeleton className="h-12 flex-1 rounded-button" />
          <Skeleton className="h-12 w-32 rounded-button" />
          <Skeleton className="size-12 rounded-full" />
        </div>
      </div>
      <SkeletonLine type="caption" lineClassName="mt-4" className="w-20" />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Skeleton className="h-18 rounded-card" />
        <Skeleton className="h-18 rounded-card" />
      </div>
    </>
  );
}
