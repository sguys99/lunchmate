"use client";
// "지금 안 열었어요" 제보 시안 공용 조각 (T9.18). 세 안이 같은 홈 목업(큰 카드 + 대안 두 줄 + 하단 행동 줄)을 쓰고
// "어디서 알리고, 알린 뒤 무엇이 바뀌는가"만 다르다(A 상세 지금 행 / B 카드 더 보기에서 바로 바꾸기 / C 길찾기 뒤 확인).
//
// 공통 규칙(세 안 같음, 비교 자료 3절): "오늘만 쉬어요"는 그 끼니(점심 15시, 저녁 자정 KST)까지만 유효.
// 1명이면 카드 배지 + 점수 감점, 서로 다른 2명이면 그 끼니 추천에서 뺀다. 폐업(3명 누적)과는 따로 센다.
// 모션은 CSS뿐(ob-rise 등장, 카드 바꿈은 opacity/translate). 실제 홈 첫 로드 예산 때문에 Motion을 쓰지 않는다.
import {
  ChevronDown,
  ChevronRight,
  MapPin,
  MoreHorizontal,
  RotateCcw,
  Shuffle,
} from "lucide-react";
import type { ReactNode } from "react";
import { CardSkeleton, ListSkeleton } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing } from "@/components/ui/interaction";
import { closedLabCopy } from "@/copy/design-lab-closed";
import {
  CategoryCaption,
  NumberGrid,
} from "@/features/design-lab/home/shared/card-bits";
import {
  MOCK_HOME_TODAY,
  type DesignState,
  type MockPlace,
} from "@/features/design-lab/mock";
import { MapLines, StateBlock } from "@/features/design-lab/system/b/parts";
import { CategoryIllustration } from "@/features/place/illustrations";
import { cn } from "@/lib/utils";

export const copy = closedLabCopy;

const PAGE_PAD =
  "mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-10";

/** 세 안 공통 배지: 이번 끼니에 문이 닫혀 있었다는 제보(1명) */
export function ClosedBadge({ count = 1 }: { count?: number }) {
  return (
    <Badge variant="warning" aria-label={copy.badge.label(count)}>
      {copy.badge.one}
    </Badge>
  );
}

/** 밑줄 글자 링크(영업시간 보기). 네이버 플레이스 검색 링크(PLACE-04)와 같은 곳으로 간다 */
export function HoursLink({ className }: { className?: string }) {
  return (
    <a
      href="https://map.naver.com/"
      target="_blank"
      rel="noreferrer"
      aria-label={`${copy.home.hours}, ${copy.home.hoursHint}`}
      className={cn(
        "inline-flex h-11 items-center type-caption text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground",
        focusRing,
        className,
      )}
    >
      {copy.home.hours}
    </a>
  );
}

/**
 * 오늘 화면 목업.
 * - hero: 큰 카드 자리를 바꿔 끼울 때(B 바꾼 뒤). 없으면 기본 큰 카드(heroBadge, heroExtra, moreSlot을 받음)
 * - aboveDock: 하단 행동 줄 바로 위 한 줄(C 길찾기 뒤 확인)
 * - overlay: 화면 위에 덮는 시트나 메뉴(A 상세, B 메뉴)
 * 4상태: ready만 카드와 시안 조각을 그린다. 나머지는 실제 홈과 같은 상태 화면.
 */
export function HomeMock({
  state,
  hero,
  heroBadge,
  heroExtra,
  moreSlot,
  alts = MOCK_HOME_TODAY.slice(1),
  aboveDock,
  overlay,
  dockDisabled = false,
}: {
  state: DesignState;
  hero?: ReactNode;
  heroBadge?: ReactNode;
  heroExtra?: ReactNode;
  moreSlot?: ReactNode;
  alts?: readonly MockPlace[];
  aboveDock?: ReactNode;
  overlay?: ReactNode;
  dockDisabled?: boolean;
}) {
  const place = MOCK_HOME_TODAY[0]!;
  const s = copy.states;
  return (
    <div className="relative flex min-h-dvh flex-1 flex-col bg-background text-foreground desktop:grid desktop:grid-cols-[minmax(0,32rem)_minmax(0,1fr)]">
      <div className="flex min-h-dvh flex-col">
        <div className={cn(PAGE_PAD, "pt-4 pb-4 desktop:pt-10")}>
          <div className="flex items-center justify-between">
            <span className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-4 type-label">
              <MapPin aria-hidden className="size-4" strokeWidth={1.5} />
              {copy.home.place}
              <ChevronDown aria-hidden className="size-4" strokeWidth={1.5} />
            </span>
            <span className="type-caption text-muted-foreground">
              {copy.home.eyebrow}
            </span>
          </div>
          <h1 className="mt-4 type-title">{copy.home.title}</h1>

          {state === "loading" ? (
            <>
              <CardSkeleton className="mt-4" />
              <ListSkeleton className="mt-6" rows={2} />
            </>
          ) : state === "empty" || state === "error" || state === "offline" ? (
            <div className="py-8">
              <StateBlock
                kind={state}
                title={s[state].title}
                body={s[state].body}
                action={s[state].action}
              />
            </div>
          ) : (
            <>
              {hero ?? (
                <article className="mt-4 flex flex-col gap-4 rounded-card border border-border bg-card p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-2">
                      <p className="type-caption text-muted-foreground">
                        {copy.home.spot} <CategoryCaption place={place} />
                      </p>
                      <h2 className="type-title break-keep">{place.name}</h2>
                      {heroBadge ? (
                        <div className="flex gap-1.5">{heroBadge}</div>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1">
                        <span className="inline-flex h-11 items-center px-1 type-caption text-muted-foreground underline underline-offset-4">
                          {copy.home.detail}
                        </span>
                        {moreSlot ?? <MoreButton />}
                      </div>
                      <CategoryIllustration slug={place.category} size={80} />
                    </div>
                  </div>
                  <p className="type-body-sm text-muted-foreground">
                    {copy.home.reason}
                  </p>
                  {heroExtra}
                  <NumberGrid place={place} />
                </article>
              )}
              <h2 className="mt-6 type-caption text-muted-foreground">
                {copy.home.others}
              </h2>
              <ul className="mt-2 flex flex-col divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
                {alts.map((p) => (
                  <li
                    key={p.id}
                    className="flex min-h-16 items-center gap-4 px-5"
                  >
                    <CategoryIllustration slug={p.category} size={40} />
                    <span className="flex-1 type-label">{p.name}</span>
                    <span className="type-numeric-md">
                      {copy.home.walk(p.walkMinutes)}
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="size-4 text-muted-foreground"
                      strokeWidth={1.5}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="sticky bottom-0 mt-auto border-t border-border bg-background px-(--lm-layout-gutter) pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] desktop:px-10">
          {state === "ready" && aboveDock ? (
            <div className="mb-3">{aboveDock}</div>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              aria-disabled={dockDisabled || state !== "ready" || undefined}
              className={cn(buttonClass("primary"), "flex-1")}
            >
              {copy.home.directions}
            </button>
            <button
              type="button"
              className={cn(buttonClass("secondary"), "flex-1")}
            >
              <Shuffle aria-hidden strokeWidth={1.5} />
              {copy.home.justPick}
            </button>
            <button
              type="button"
              aria-label={copy.home.reroll}
              className={cn(buttonClass("secondary", "icon"), "rounded-full")}
            >
              <RotateCcw aria-hidden strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
      <div
        aria-hidden
        className="relative hidden bg-muted desktop:block desktop:border-l desktop:border-border"
      >
        <MapLines />
      </div>
      {state === "ready" ? overlay : null}
    </div>
  );
}

export function MoreButton({
  pressed,
  onClick,
}: {
  pressed?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={copy.home.more}
      aria-haspopup="menu"
      aria-expanded={pressed || undefined}
      onClick={onClick}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground",
        pressed && "bg-muted text-foreground",
        focusRing,
      )}
    >
      <MoreHorizontal aria-hidden className="size-5" strokeWidth={1.5} />
    </button>
  );
}

/** 화면 아래 덮는 시트(A 상세). 모바일은 아래, 데스크톱은 왼쪽 칸 위 */
export function SheetOverlay({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end desktop:w-[32rem]">
      <div aria-hidden className="absolute inset-0 bg-overlay" />
      <section
        role="dialog"
        aria-label={label}
        className="ob-rise relative max-h-[78dvh] overflow-y-auto rounded-t-sheet bg-popover px-(--lm-layout-gutter) pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-popover-foreground shadow-sheet desktop:px-10"
      >
        <span
          aria-hidden
          className="mx-auto mb-3 block h-1 w-9 rounded-full bg-border"
        />
        {children}
      </section>
    </div>
  );
}
