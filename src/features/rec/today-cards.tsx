"use client";
// 오늘(홈) 카드 (T5.17, T5.19, T5.25, G3 D1, DESIGN.md 5장 "오늘(홈) 화면").
// - "오늘의 한 곳" 큰 카드 1장 + 대안 두 줄 목록 + 하단 고정 행동 줄. 넘기기가 없다(스와이프 대체 버튼이 필요 없다).
// - D-25(T9.10 한 화면 압축, 시안 A + B 대안 목록): 390x664, 360x640에서 홈 전체가 스크롤 없이 보이게 줄였다.
// - 큰 카드: 윗줄(오늘의 한 곳, 업종 | 상세, 더 보기) → 이름 + 그림 80 → 이유 한 줄(누르면 "왜 추천했나요?"
//   펼침) → 배지(있을 때만) → 숫자 3칸. 이름은 아주 짧을 때(hero-name lg)만 30, 나머지는 22로 두 줄까지(그림 행 높이 안). 길찾기는 하단 줄. 이유 문장에서 도보 분은 뺐다(card-model).
// - 대안 목록: 아이콘 28 + 식당명(한 줄 전체 폭), 도보와 👍, 화살표. 누르면 큰 카드와 자리를 바꾼다(today-screen이 교환 모션과 포커스 이동).
// - 카드 순서 낭독: 큰 카드와 대안에 "3곳 중 1번째"를 스크린 리더 글자로 붙인다.
// 모션은 today.css(Motion 없음, D-04). data-reveal 순번: 윗줄 0, 이유 1, 배지 2, 숫자 3, 대안 3, 4(T8.8 사용자 결정 P2).
import { EmojiText } from "@/components/a11y/emoji-text";
import {
  ChevronDown,
  ChevronRight,
  Dices,
  RotateCcw,
  ThumbsUp,
} from "lucide-react";
import {
  useId,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { LoadingRegion, SkeletonLine } from "@/components/states/loading";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing, hitArea44 } from "@/components/ui/interaction";
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
import type { CardMenu } from "@/features/menu/card-menu-pick";
import { showMemoBadge } from "@/features/memo/badge-slot";
import { heroNameSize } from "./hero-name";
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

const HERO_PAD = "p-5";
/** 이름 옆 그림 80px(D-25 한 화면 압축). 그림 아래쪽 빈 곳은 이유 줄과 겹쳐도 되므로 음수 아래 여백으로 행 높이에서 뺀다 */
const HERO_ART = "-mt-2 -mr-2 -mb-3 size-20 shrink-0";

const textButton = cn(
  "inline-flex h-6 shrink-0 items-center rounded-sm px-0.5 type-caption text-muted-foreground underline decoration-border underline-offset-3 hover:text-foreground active:text-foreground",
  hitArea44,
  focusRing,
);

/* ---------- 큰 카드 ---------- */

export function TodayHero({
  card,
  memo,
  menu,
  spot,
  order,
  why,
  heroRef,
  onDetail,
  onDetailIntent,
  more,
}: {
  card: TodayCard;
  /** 내 메모(T10.15). 카드 배지가 2개 미만일 때만 배지 줄 끝에 한 자리를 쓴다 */
  memo?: string;
  /** 대표 메뉴(T10.16e, D-35 A). 숫자 3칸 가운데 칸을 바꾼다. 표시 전용 */
  menu?: CardMenu;
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
      {/* 윗줄: "오늘의 한 곳" + 업종, 오른쪽 상세와 더 보기(D-25) */}
      <div
        data-reveal
        style={reveal(0)}
        className="flex items-center justify-between gap-3"
      >
        <p className="flex min-w-0 items-baseline gap-2 type-caption text-muted-foreground">
          {copy.single.eyebrow}
          <span className="sr-only">, {order}</span>
          <CategoryCaption category={card.category} />
        </p>
        <div className="flex shrink-0 items-center gap-5">
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
      <div
        data-reveal
        style={reveal(0)}
        className="mt-2 flex items-start gap-3"
      >
        {/* break-keep은 낱말 단위로 줄을 바꾸고, 칸보다 긴 낱말만 wrap-anywhere로 끊는다(긴 낱말이 그림 밑으로 넘치지 않게) */}
        <h2
          id={nameId}
          title={card.name}
          className={cn(
            "line-clamp-2 min-w-0 flex-1 text-balance wrap-anywhere break-keep",
            heroNameSize(card.name) === "lg" ? "type-title" : "type-heading",
          )}
        >
          {card.name}
        </h2>
        <CardArt slug={card.category} size={80} className={HERO_ART} />
      </div>

      {/* 이유 한 줄이 곧 "왜 추천했나요?" 펼치기(D-25) */}
      <div data-reveal style={reveal(1)} className="mt-1 flex flex-col">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={whyId}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "-mx-1 flex min-h-11 items-center gap-1.5 rounded-sm px-1 text-left",
            focusRing,
          )}
        >
          <span className="line-clamp-1 type-body text-foreground">
            <EmojiText text={card.reason} />
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
              open && "rotate-180",
            )}
            strokeWidth={1.5}
          />
          <span className="sr-only">, {copy.actions.why}</span>
        </button>
        {open ? (
          <ul
            id={whyId}
            className="lm-today-why mt-1 mb-1 flex flex-col gap-1.5 border-l border-border pl-3"
          >
            {why.map((line) => (
              <li
                key={line}
                className="type-body-sm text-pretty break-keep text-muted-foreground"
              >
                <EmojiText text={line} />
              </li>
            ))}
          </ul>
        ) : (
          <div id={whyId} hidden />
        )}
      </div>

      {card.badges.length > 0 || showMemoBadge(card.badges.length, memo) ? (
        <div data-reveal style={reveal(2)} className="mt-1">
          <CardBadges card={card} memo={memo} />
        </div>
      ) : null}

      <div data-reveal style={reveal(3)} className="mt-3">
        <NumberGrid card={card} menu={menu} />
      </div>
    </article>
  );
}

/* ---------- 대안 목록 ---------- */

/** 대안 두 곳: 테두리 하나 안 두 줄 목록(D-25, 시안 B). 줄은 AltRow */
export const ALT_LIST =
  "flex flex-col divide-y divide-border overflow-hidden rounded-card border border-border bg-card";

/** 대안 한 줄: 아이콘 28 + 이름(한 줄 전체 폭), 오른쪽 도보와 👍, 화살표. 누르면 큰 카드와 자리를 바꾼다 */
export function AltRow({
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
        "flex min-h-12 w-full items-center gap-3 px-4 py-1.5 text-left transition-[opacity,box-shadow] ease-standard hover:bg-muted/40 focus-visible:-outline-offset-2 active:bg-muted/40",
        spot
          ? "duration-(--lm-duration-fast)"
          : "duration-(--lm-duration-base)",
        spot === "on" && "ring-1 ring-primary ring-inset",
        spot === "dim" && "opacity-40",
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

/* ---------- 하단 고정 줄 ---------- */

/**
 * 하단 탭 바로 위에 붙는 줄. 모바일은 화면 아래 고정(fixed, 탭 바로 위), 데스크톱은 리스트 칸 안 sticky.
 * 모바일은 화면 끝까지(위 선이 탭 바 선과 나란히), 데스크톱은 리스트 내용 폭.
 * 모바일에서 sticky를 쓰지 않는 이유(T9.10): iOS Safari에서 문서 끝 고무줄 튕김과 주소 막대 접힘 때 sticky 줄이
 * 내용과 함께 끌려 올라가 흔들렸다. 고정 줄이 가리는 높이(위 선 1 + 위아래 12 + 버튼 48)는 문서 흐름의 빈 자리로 남긴다.
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
    <>
      <div
        aria-hidden
        data-slot="dock-space"
        className="mt-auto h-[calc(3rem+1.5rem+1px)] shrink-0 desktop:hidden"
      />
      <div
        role="group"
        aria-label={label}
        className={cn(
          "fixed inset-x-0 bottom-[calc(var(--lm-layout-tab-bar-height)+env(safe-area-inset-bottom,0px))] z-[5] mt-auto border-t border-border bg-background px-(--lm-layout-gutter) py-3 desktop:sticky desktop:bottom-(--lm-layout-tab-bar-height) desktop:px-0",
          className,
        )}
      >
        <div className="mx-auto w-full max-w-[calc(var(--lm-layout-max-width)-2*var(--lm-layout-gutter))] desktop:max-w-none">
          {children}
        </div>
      </div>
    </>
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
        <div className="flex h-6 items-center justify-between">
          <SkeletonLine type="caption" className="w-24" />
          <SkeletonLine type="caption" className="w-12" />
        </div>
        <div className="mt-2 flex items-start gap-3">
          <SkeletonLine type="title" className="w-36" />
          <ArtCircle className={cn("ml-auto", HERO_ART)} />
        </div>
        <div className="mt-1 flex min-h-11 flex-col justify-center">
          <SkeletonLine type="body" className="w-3/5" />
        </div>
        <NumberGridSkeleton className="mt-3" />
      </div>
      <div className="mt-3 flex h-6 items-center justify-between">
        <SkeletonLine type="caption" className="w-20" />
        <SkeletonLine type="caption" className="w-36" />
      </div>
      <div aria-hidden className={cn("mt-2", ALT_LIST)}>
        {["w-32", "w-24"].map((w) => (
          <div key={w} className="flex min-h-12 items-center gap-3 px-4 py-1.5">
            <ArtCircle className="size-7 shrink-0" />
            <SkeletonLine type="label" className={w} />
            <Skeleton className="ml-auto h-3.5 w-12 rounded-badge" />
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
