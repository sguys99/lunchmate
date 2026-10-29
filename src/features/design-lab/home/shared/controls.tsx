"use client";
// 홈 D1 조작 (T3.1, G3 D-05): 끼니 토글(REC-01), 기준 위치 칩(REC-02), 다시 뽑기(REC-05), 그냥 골라줘(REC-12 진입점).
// 올리브 면 버튼은 쓰지 않는다. 화면의 주 버튼은 하단 행동 줄의 "길찾기" 하나다(CLAUDE.md 6.3).
import { ChevronDown, Dices, MapPin, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { focusRing, hitArea44 } from "@/components/ui/interaction";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import { MOCK_POLL } from "@/features/design-lab/mock";
import { getKstParts } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { JustPick } from "./just-pick";
import type { BaseLocation, Meal } from "./use-home-lab";

const copy = designLabHomeCopy.screen;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 시연 기준 시각(목업 고정값)의 "10월 28일 수요일" */
export function mockDateLine(): string {
  const { month, day, weekday } = getKstParts(new Date(MOCK_POLL.mockNow));
  return copy.dateLine(month, day, WEEKDAYS[weekday] ?? "");
}

/**
 * 끼니 토글: 글자 두 개, 선택된 쪽만 진한 글자와 1px 밑줄(틴트 없음, DESIGN.md 2장 "선택 상태").
 * 터치 영역은 각 44px 이상.
 */
export function MealToggle({
  meal,
  onChange,
  className,
}: {
  meal: Meal;
  onChange: (meal: Meal) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={copy.meal.label}
      className={cn("flex items-center", className)}
    >
      {(["lunch", "dinner"] as const).map((m) => {
        const on = m === meal;
        return (
          <button
            key={m}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(m)}
            className={cn(
              "inline-flex h-11 min-w-11 items-center justify-center px-2 type-label transition-colors duration-(--lm-duration-fast) ease-standard",
              "underline-offset-[0.4rem]",
              on
                ? "text-foreground underline decoration-foreground decoration-1"
                : "text-muted-foreground hover:text-foreground",
              focusRing,
              "rounded-sm",
            )}
          >
            {copy.meal[m]}
          </button>
        );
      })}
    </div>
  );
}

/** 기준 위치 칩. 누르면 목업에서는 다음 위치로 바뀐다(실제는 선택 시트, T4/T5) */
export function LocationChip({
  location,
  onCycle,
  className,
}: {
  location: BaseLocation;
  onCycle: () => void;
  className?: string;
}) {
  const name = copy.location.options[location];
  return (
    <button
      type="button"
      onClick={onCycle}
      aria-label={copy.location.chipLabel(name)}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-chip border border-border pr-3 pl-3 type-label whitespace-nowrap text-foreground transition-colors duration-(--lm-duration-fast) ease-standard hover:bg-muted",
        hitArea44,
        focusRing,
        className,
      )}
    >
      <MapPin
        aria-hidden
        className="size-4 text-muted-foreground"
        strokeWidth={1.5}
      />
      {name}
      <ChevronDown
        aria-hidden
        className="size-4 text-muted-foreground"
        strokeWidth={1.5}
      />
    </button>
  );
}

/** 다시 뽑기 아이콘 버튼(48px 원, 보이는 글자 없음 → aria-label) */
export function RerollButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      size="icon"
      aria-label={copy.actions.reroll}
      onClick={onClick}
      className={className}
    >
      <RotateCcw aria-hidden strokeWidth={1.5} />
    </Button>
  );
}

/**
 * "그냥 골라줘" (REC-12). 누르면 useJustPick().begin, 손이나 포커스가 닿으면 결과 패널을 미리 받는다.
 * 화면 카드 위에서 R1이 도는 동안에는 같은 자리에서 "바로 보기"가 된다(건너뛰기를 눈에 보이게).
 */
export function JustPickButton({
  pick,
  from = 0,
  className,
}: {
  pick: JustPick;
  /** 연출을 시작할 카드(지금 보고 있는 곳) */
  from?: number;
  className?: string;
}) {
  const skipping = pick.pageHighlight;
  return (
    <Button
      data-entry="just-pick"
      aria-haspopup="dialog"
      onPointerEnter={pick.prefetch}
      onFocus={pick.prefetch}
      onClick={(e) => {
        if (skipping) pick.skip();
        else pick.begin(e.currentTarget, from);
      }}
      className={cn("pr-5 pl-4", className)}
    >
      <Dices aria-hidden className="size-4" strokeWidth={1.5} />
      {skipping
        ? designLabHomeCopy.screen.justPick.skip
        : copy.actions.justPick}
    </Button>
  );
}

/**
 * 홈 머리: 첫 줄 기준 위치 칩(왼쪽) + 끼니 토글(오른쪽), 둘째 줄 날짜와 끼니 caption, 셋째 줄 세리프 제목.
 * 줄 사이 24px(데스크톱 16px).
 */
export function HomeHeader({
  meal,
  location,
  onMeal,
  onLocation,
}: {
  meal: Meal;
  location: BaseLocation;
  onMeal: (meal: Meal) => void;
  onLocation: () => void;
}) {
  return (
    <header className="flex flex-col gap-6 desktop:gap-4">
      <div className="flex items-center justify-between gap-3">
        <LocationChip location={location} onCycle={onLocation} />
        <MealToggle meal={meal} onChange={onMeal} className="-mr-2" />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="type-caption text-muted-foreground">
          {mockDateLine()} {copy.meal[meal]}
        </p>
        <h1 className="type-title">{copy.title}</h1>
      </div>
    </header>
  );
}
