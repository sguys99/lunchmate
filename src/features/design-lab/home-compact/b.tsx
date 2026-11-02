"use client";
// 시안 B 가로 카드 (T9.10 G9). 큰 카드를 가로로 눕히고 대안 두 곳을 한 덩어리 목록 두 줄로 바꾼다.
// - 큰 카드: 왼쪽 그림 72px, 오른쪽에 업종, 이름(두 줄까지), 이유(펼치기). 숫자 셋은 카드 아래 한 줄 인라인
// - 대안: 테두리 하나 안에 두 줄(그림 아이콘 28 + 이름 + 도보, 만족). 줄을 누르면 큰 카드와 자리를 바꾼다(시안에서는 동작 없음)
// - 행동 줄과 탭은 지금 그대로
import { ChevronRight, ThumbsUp } from "lucide-react";
import { useId } from "react";
import { focusRing } from "@/components/ui/interaction";
import { homeCopy } from "@/copy/home";
import type { DesignState } from "@/features/design-lab/mock/design-state";
import {
  CardArt,
  CategoryCaption,
  NumberValue,
} from "@/features/rec/card-bits";
import type { TodayCard } from "@/features/rec/card-model";
import { TodayActionBar } from "@/features/rec/today-cards";
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

export function HomeCompactB({
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
  return (
    <CompactShell>
      <CompactColumn>
        <CompactHeader />
        {state !== "ready" ? (
          <CompactStates state={state} skeleton={<SkeletonB />} />
        ) : (
          <>
            <article
              aria-labelledby={nameId}
              className="mt-3 flex flex-col rounded-card border border-border bg-card p-4"
            >
              <div className="flex items-start gap-3">
                <CardArt
                  slug={hero.category}
                  size={72}
                  className="-mt-1 -ml-1 size-18 shrink-0"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex min-w-0 items-baseline gap-2 type-caption text-muted-foreground">
                      {copy.single.eyebrow}
                      <CategoryCaption category={hero.category} />
                    </p>
                    <DetailAndMore name={hero.name} />
                  </div>
                  <h2
                    id={nameId}
                    title={hero.name}
                    className="mt-1 line-clamp-2 type-heading text-balance wrap-anywhere break-keep"
                  >
                    {hero.name}
                  </h2>
                </div>
              </div>
              <ReasonToggle reason={hero.reason} className="mt-1" />
              <InlineNumbers card={hero} className="mt-2" />
            </article>

            <section aria-labelledby={altId} className="mt-4">
              <AltHeading id={altId} />
              <ul className="mt-2 flex flex-col divide-y divide-border rounded-card border border-border bg-card">
                {alts.map((c, i) => (
                  <li key={c.id}>
                    <AltRow
                      card={c}
                      order={copy.single.order(i + 2, cards.length)}
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

/** 숫자 셋을 한 줄로: 라벨 caption + 숫자, 칸 사이 얇은 세로선(문자 구분자 없음) */
function InlineNumbers({
  card,
  className,
}: {
  card: TodayCard;
  className?: string;
}) {
  const n = copy.numbers;
  return (
    <dl
      className={cn(
        "flex items-baseline gap-3 border-t border-border pt-3 whitespace-nowrap",
        className,
      )}
    >
      <div className="flex items-baseline gap-1.5">
        <dt className="type-caption text-muted-foreground">{n.walk}</dt>
        <dd>
          <NumberValue cell={card.walk} />
        </dd>
      </div>
      <span aria-hidden className="h-3 w-px self-center bg-border" />
      <div className="flex items-baseline gap-1.5">
        <dt className="type-caption text-muted-foreground">{n.price}</dt>
        <dd>
          <NumberValue cell={card.price} />
        </dd>
      </div>
      <span aria-hidden className="h-3 w-px self-center bg-border" />
      <div className="flex min-w-0 items-baseline gap-1.5">
        <dt className="type-caption text-muted-foreground">{n.thumbs}</dt>
        <dd className="min-w-0 truncate">
          {card.thumbs.value === null ? (
            <span className="type-caption text-muted-foreground">
              {homeCopy.thumbsUpEmpty}
            </span>
          ) : (
            <NumberValue cell={card.thumbs} />
          )}
        </dd>
      </div>
    </dl>
  );
}

function AltRow({ card, order }: { card: TodayCard; order: string }) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left first:rounded-t-card last:rounded-b-card hover:bg-muted/40",
        focusRing,
      )}
    >
      <CardArt
        slug={card.category}
        size={28}
        variant="icon"
        className="shrink-0"
      />
      <span title={card.name} className="min-w-0 flex-1 truncate type-label">
        {card.name}
      </span>
      <span className="flex shrink-0 items-baseline gap-2.5 whitespace-nowrap">
        <span className="sr-only">{copy.numbers.walk}</span>
        <NumberValue cell={card.walk} />
        {card.thumbs.value === null ? null : (
          <span className="inline-flex items-baseline gap-1">
            <ThumbsUp
              aria-hidden
              className="size-3.5 translate-y-px self-center text-muted-foreground"
              strokeWidth={1.5}
            />
            <span className="sr-only">{copy.numbers.thumbs}</span>
            <NumberValue cell={card.thumbs} />
          </span>
        )}
      </span>
      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground"
        strokeWidth={1.5}
      />
      <span className="sr-only">
        , {order}, {copy.single.swapHint}
      </span>
    </button>
  );
}

function SkeletonB() {
  return (
    <>
      <div className="flex flex-col rounded-card border border-border bg-card p-4">
        <div className="flex gap-3">
          <Skeleton className="size-16 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col">
            <SkeletonLine type="caption" className="w-24" />
            <SkeletonLine
              type="heading"
              lineClassName="mt-1"
              className="w-36"
            />
          </div>
        </div>
        <SkeletonLine type="body" lineClassName="mt-3" className="w-3/5" />
        <Skeleton className="mt-4 h-6 w-full rounded-badge" />
      </div>
      <SkeletonLine type="caption" lineClassName="mt-4" className="w-20" />
      <Skeleton className="mt-2 h-28 rounded-card" />
    </>
  );
}
