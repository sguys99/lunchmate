"use client";
// 오늘(홈) 카드 (T5.17, T5.19, T5.25, G3 D1, DESIGN.md 5장 "오늘(홈) 화면").
// - "오늘의 한 곳" 큰 카드 1장 + 대안 작은 카드 2장 + 하단 고정 행동 줄. 넘기기가 없다(스와이프 대체 버튼이 필요 없다).
// - 큰 카드: 이름 30 → 이유 16 → 배지 → 숫자 18. 버튼은 "왜 추천했나요?"(펼치기), "상세" 글자 버튼과 그 옆 더 보기
//   아이콘(즐겨찾기, 다시 안 갈래요, 투표에 추가, T5.20)뿐이고 길찾기는 하단 줄.
//   일러스트 152px(카드 폭의 약 44%)는 이 큰 카드 한정 예외(G3 안건 6). 이유 문장에서 도보 분은 뺐다(card-model).
// - 대안 카드: 아이콘 28 + 식당명, 도보와 만족. 누르면 큰 카드와 자리를 바꾼다(today-screen이 교환 모션과 포커스 이동).
// - 카드 순서 낭독: 큰 카드와 대안에 "3곳 중 1번째"를 스크린 리더 글자로 붙인다.
// 모션은 today.css(Motion 없음, D-04). data-reveal 순번: 윗줄 0, 이유 1, 배지 2, 숫자 3, 대안 5, 6.
import { ChevronDown, Dices, RotateCcw, ThumbsUp } from "lucide-react";
import {
  useId,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { LoadingRegion, SkeletonLine } from "@/components/states/loading";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing, hitArea44, pressMotion } from "@/components/ui/interaction";
import { Skeleton } from "@/components/ui/skeleton";
import { homeCopy } from "@/copy/home";
import { cn } from "@/lib/utils";
import {
  ArtCircle,
  CardArt,
  CardBadges,
  CategoryCaption,
  NumberGrid,
  NumberGridSkeleton,
  NumberValue,
} from "./card-bits";
import type { TodayCard } from "./card-model";
import type { JustPick } from "./just-pick";

const copy = homeCopy.today;

/** 그냥 골라줘 순회 중 카드 강조. on: 지금 칸, off: 다른 칸, dim: 멈춘 뒤 물러남 */
export type Spot = "on" | "off" | "dim" | undefined;

export function spotOf(pick: JustPick, index: number): Spot {
  if (!pick.rolling) return undefined;
  if (pick.cursor === index) return "on";
  return pick.landed ? "dim" : "off";
}

function reveal(index: number): CSSProperties {
  return { "--reveal": index } as CSSProperties;
}

const HERO_PAD = "p-6 @max-[23.75rem]/screen:p-5";
/** 그림 아래쪽 여백(바닥선 y 78 / 96 아래)은 이유 줄과 겹쳐도 되므로 음수 아래 여백으로 행 높이에서 뺀다 */
const HERO_ART =
  "-mt-3 -mr-4 -mb-6 shrink-0 @max-[23.75rem]/screen:-mr-3 @max-[23.75rem]/screen:-mb-3 @max-[23.75rem]/screen:size-28 desktop:size-32 desktop:-mb-5";

const textButton = cn(
  "inline-flex h-6 shrink-0 items-center rounded-sm px-0.5 type-caption text-muted-foreground underline decoration-border underline-offset-3 hover:text-foreground",
  hitArea44,
  focusRing,
);

/* ---------- 큰 카드 ---------- */

export function TodayHero({
  card,
  spot,
  order,
  why,
  heroRef,
  onDetail,
  onDetailIntent,
  more,
}: {
  card: TodayCard;
  spot?: Spot;
  /** "3곳 중 1번째" */
  order: string;
  /** "왜 추천했나요?" 펼쳤을 때 문장들 */
  why: readonly string[];
  heroRef?: Ref<HTMLElement>;
  /** 상세 바텀시트 열기(T5.20) */
  onDetail?: (card: TodayCard) => void;
  /** "상세"에 손이나 포커스가 닿을 때 시트 미리 받기 */
  onDetailIntent?: () => void;
  /** "상세" 옆 더 보기(즐겨찾기, 다시 안 갈래요, T5.20) */
  more?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const whyId = useId();
  const nameId = useId();
  return (
    <article
      ref={heroRef}
      tabIndex={-1}
      aria-labelledby={nameId}
      className={cn(
        "flex flex-col rounded-card border bg-card text-card-foreground transition-[border-color,opacity] ease-standard outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
        HERO_PAD,
        spot
          ? "duration-(--lm-duration-fast)"
          : "duration-(--lm-duration-base)",
        spot === "on" ? "border-primary" : "border-border",
        spot === "dim" && "opacity-40",
      )}
    >
      <div
        data-reveal
        style={reveal(0)}
        className="flex items-start justify-between gap-3"
      >
        <div className="flex min-w-0 flex-col pt-1">
          <span className="type-caption text-muted-foreground">
            {copy.single.eyebrow}
            <span className="sr-only">, {order}</span>
          </span>
          <CategoryCaption category={card.category} className="mt-4" />
          <h2 id={nameId} className="mt-1 type-title text-balance break-keep">
            {card.name}
          </h2>
        </div>
        <CardArt slug={card.category} size={152} className={HERO_ART} />
      </div>

      <div data-reveal style={reveal(1)} className="mt-2 flex flex-col">
        <p className="line-clamp-2 type-body text-pretty text-foreground">
          {card.reason}
        </p>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={whyId}
          onClick={() => setOpen((v) => !v)}
          className={cn(textButton, "mt-1.5 gap-1 self-start")}
        >
          {copy.actions.why}
          <ChevronDown
            aria-hidden
            className={cn(
              "size-3.5 transition-transform duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
              open && "rotate-180",
            )}
            strokeWidth={1.5}
          />
        </button>
        {open ? (
          <ul
            id={whyId}
            className="lm-today-why mt-3 flex flex-col gap-1.5 border-l border-border pl-3"
          >
            {why.map((line) => (
              <li
                key={line}
                className="type-body-sm text-pretty break-keep text-muted-foreground"
              >
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <div id={whyId} hidden />
        )}
      </div>

      <div
        data-reveal
        style={reveal(2)}
        className="mt-3 flex min-h-6 items-start justify-between gap-3"
      >
        <CardBadges card={card} />
        <div className="ml-auto flex shrink-0 items-center gap-4">
          <button
            type="button"
            aria-label={copy.actions.detailOf(card.name)}
            aria-haspopup="dialog"
            onPointerEnter={onDetailIntent}
            onFocus={onDetailIntent}
            onClick={() => onDetail?.(card)}
            className={textButton}
          >
            {copy.actions.detail}
          </button>
          {more}
        </div>
      </div>

      <div data-reveal style={reveal(3)} className="mt-5">
        <NumberGrid card={card} />
      </div>
    </article>
  );
}

/* ---------- 대안 카드 ---------- */

export function AltTile({
  card,
  spot,
  order,
  onPromote,
}: {
  card: TodayCard;
  spot?: Spot;
  order: string;
  onPromote: () => void;
}) {
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
        <CardArt
          slug={card.category}
          size={28}
          variant="icon"
          className="-ml-0.5 shrink-0"
        />
        <span className="truncate type-label">{card.name}</span>
      </span>
      <span className="flex min-w-0 items-baseline gap-2.5 whitespace-nowrap">
        <NumberValue cell={card.walk} />
        <span aria-hidden className="h-3 w-px self-center bg-border" />
        {card.thumbs.value === null ? (
          <span className="truncate type-caption text-muted-foreground">
            {homeCopy.thumbsUpEmpty}
          </span>
        ) : (
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
      <span className="sr-only">
        , {order}, {copy.single.swapHint}
      </span>
    </button>
  );
}

/* ---------- 하단 고정 줄 ---------- */

/**
 * 하단 탭 바로 위에 붙는 줄. 내용이 짧으면 칸 맨 아래(mt-auto), 길면 스크롤해도 엄지 자리에 남는다.
 * 모바일은 화면 끝까지(위 선이 탭 바 선과 나란히), 데스크톱은 리스트 내용 폭.
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
        "sticky bottom-[calc(var(--lm-layout-tab-bar-height)+env(safe-area-inset-bottom,0px))] z-[5] -mx-(--lm-layout-gutter) mt-auto border-t border-border bg-background px-(--lm-layout-gutter) py-3 desktop:bottom-(--lm-layout-tab-bar-height) desktop:mx-0 desktop:px-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** 길찾기(주 버튼 하나) + 그냥 골라줘 + 다시 뽑기 아이콘 */
export function TodayActionBar({
  hero,
  pick,
  heroIndex,
  busy,
  opening,
  onDirections,
  onReroll,
}: {
  hero: TodayCard;
  pick: JustPick;
  heroIndex: number;
  /** 다시 뽑기 전환 중 */
  busy: boolean;
  /** 길찾기를 여는 중(앱 확인 최대 1.5초) */
  opening?: boolean;
  onDirections?: (card: TodayCard) => void;
  onReroll: () => void;
}) {
  const skipping = pick.rolling;
  return (
    <BottomDock label={copy.single.actionsLabel}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={copy.actions.directionsTo(hero.name)}
          aria-busy={opening || undefined}
          onClick={() => onDirections?.(hero)}
          className={cn(buttonClass("primary"), "min-w-0 flex-1")}
        >
          {opening ? copy.actions.opening : copy.actions.directions}
        </button>
        <button
          type="button"
          aria-haspopup="dialog"
          onPointerEnter={pick.prefetch}
          onFocus={pick.prefetch}
          onClick={(e) => {
            if (skipping) pick.skip();
            else pick.begin(e.currentTarget, heroIndex);
          }}
          // "바로 보기"로 바뀌어도 폭이 같게(길찾기 폭이 출렁이지 않게)
          className={cn(
            buttonClass("secondary"),
            "min-w-32 shrink-0 pr-5 pl-4 @max-[23.75rem]/screen:pr-4 @max-[23.75rem]/screen:pl-3",
          )}
        >
          <Dices aria-hidden className="size-4" strokeWidth={1.5} />
          {skipping ? copy.justPick.skip : copy.actions.justPick}
        </button>
        <button
          type="button"
          aria-label={copy.actions.reroll}
          aria-disabled={busy || undefined}
          onClick={() => {
            if (!busy) onReroll();
          }}
          className={cn(buttonClass("secondary", "icon"), "shrink-0")}
        >
          <RotateCcw aria-hidden strokeWidth={1.5} />
        </button>
      </div>
    </BottomDock>
  );
}

/* ---------- 로딩 (실제 카드와 같은 자리, 같은 높이) ---------- */

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
        <SkeletonLine type="caption" lineClassName="mt-1.5" className="w-20" />
        <div className="mt-3 flex min-h-6 justify-between">
          <span />
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
