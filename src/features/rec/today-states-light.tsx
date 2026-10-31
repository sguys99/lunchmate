"use client";
// 오늘(홈) 후보 부족 한 줄 (T5.21, REC-09, PRD 12장 "필터 후 후보 3곳 미만"). 카드와 함께 첫 화면에 그려질 수 있어
// 공통 상태 컴포넌트(today-states.tsx, 지연 로딩)와 따로 둔 가벼운 조각이다.
import { focusRing, hitArea44 } from "@/components/ui/interaction";
import { homeCopy } from "@/copy/home";
import { cn } from "@/lib/utils";
import type { Shortage } from "./deck";

const copy = homeCopy.today;

export const secondaryText = cn(
  "inline-flex items-center gap-1.5 self-start rounded-sm type-label text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground",
  hitArea44,
  focusRing,
);

/** 1~2곳 (REC-09): 있는 만큼 보여 주고 대안 자리에 한 줄 안내 + 글자 버튼 */
export function ShortNote({
  shortage,
  onWiden,
  onRelaxBudget,
  className,
}: {
  shortage: Extract<Shortage, { kind: "short" }>;
  onWiden: (to: number) => void;
  onRelaxBudget: () => void;
  className?: string;
}) {
  const { count, widenTo, overBudget } = shortage;
  const line =
    overBudget > 0
      ? copy.shortage.overBudget(overBudget)
      : widenTo !== null
        ? copy.shortage.widen(widenTo)
        : copy.shortage.few(count);
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-2 border-y border-border py-3",
        className,
      )}
    >
      <p className="type-body-sm break-keep text-muted-foreground">{line}</p>
      {overBudget > 0 ? (
        <button
          type="button"
          onClick={onRelaxBudget}
          className={secondaryText}
        >
          {copy.shortage.relaxBudget}
        </button>
      ) : widenTo !== null ? (
        <button
          type="button"
          onClick={() => onWiden(widenTo)}
          className={secondaryText}
        >
          {copy.shortage.widenAction(widenTo)}
        </button>
      ) : null}
    </div>
  );
}
