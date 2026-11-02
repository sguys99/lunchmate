"use client";
// 시안 A 간격 줄이기 (T9.10 G9). 구조는 지금 홈 그대로(큰 카드 + 대안 두 장 + 하단 행동 줄 + 탭), 세로 낭비만 줄인다.
// - 머리 세 줄 → 두 줄(제목 heading 크기 + 날짜 같은 줄)
// - 큰 카드: 윗줄에 "오늘의 한 곳", 업종, 상세와 더 보기. 이름 옆 그림 80px 고정. 이유 줄이 곧 "왜 추천했나요?" 펼치기
// - 같이 정하기 두 진입점을 "또는 이 두 곳" 제목 줄 오른쪽으로
import { useId } from "react";
import type { DesignState } from "@/features/design-lab/mock/design-state";
import { CardArt, CategoryCaption, NumberGrid } from "@/features/rec/card-bits";
import { AltTile, TodayActionBar } from "@/features/rec/today-cards";
import { homeCopy } from "@/copy/home";
import { heroNameSize } from "@/features/rec/hero-name";
import { cn } from "@/lib/utils";
import {
  AltHeading,
  CompactColumn,
  CompactHeader,
  CompactShell,
  CompactStates,
  DetailAndMore,
  IDLE_PICK,
  ReasonToggle,
  Skeleton,
  SkeletonLine,
  mockCards,
  type NameMode,
} from "./shared";

const copy = homeCopy.today;

export function HomeCompactA({
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
  const small = heroNameSize(hero.name) === "sm";
  return (
    <CompactShell>
      <CompactColumn>
        <CompactHeader />
        {state !== "ready" ? (
          <CompactStates state={state} skeleton={<SkeletonA />} />
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
                    small ? "type-heading" : "type-title",
                  )}
                >
                  {hero.name}
                </h2>
                <CardArt
                  slug={hero.category}
                  size={80}
                  className="-mt-2 -mr-2 -mb-3 size-20 shrink-0"
                />
              </div>
              <ReasonToggle reason={hero.reason} className="mt-1" />
              <NumberGrid card={hero} className="mt-3" />
            </article>

            <section aria-labelledby={altId} className="mt-4">
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

            <TodayActionBar
              hero={hero}
              pick={IDLE_PICK}
              heroIndex={0}
              busy={false}
              onReroll={() => {}}
            />
          </>
        )}
      </CompactColumn>
    </CompactShell>
  );
}

function SkeletonA() {
  return (
    <>
      <div className="flex flex-col rounded-card border border-border bg-card p-5">
        <div className="flex justify-between">
          <SkeletonLine type="caption" className="w-24" />
          <SkeletonLine type="caption" className="w-12" />
        </div>
        <div className="mt-2 flex items-start gap-3">
          <SkeletonLine type="title" className="w-40" />
          <Skeleton className="ml-auto size-16 rounded-full" />
        </div>
        <SkeletonLine type="body" lineClassName="mt-3" className="w-3/5" />
        <Skeleton className="mt-5 h-11 w-full rounded-badge" />
      </div>
      <SkeletonLine type="caption" lineClassName="mt-4" className="w-20" />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Skeleton className="h-18 rounded-card" />
        <Skeleton className="h-18 rounded-card" />
      </div>
    </>
  );
}
