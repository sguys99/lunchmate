"use client";
// 할인 한 줄, 출처 배지, 고지 두 줄, 아직 해요/끝났어요, 끝났어요 점 3개, 웨이팅 3버튼, 결과 줄 (T6.20, T6.21, T6.24).
// D-13: C 화면을 바탕으로 B의 그 자리 결과 줄 + 되돌리기(토스트 없음), C의 끝났어요 점 3개. 규칙 정본 DESIGN.md 5장 "제보와 신고".
// 상세 "지금" 행(상세 청크)과 질문 시트(지연 청크)가 함께 쓴다. 홈 첫 로드에는 들어가지 않는다.
import { Check, Flag, Tag } from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import type { WaitingLevel } from "@/components/badges/pick-badges";
import { Badge } from "@/components/ui/badge";
import {
  focusRing,
  hitArea44,
  hitArea48,
  pressMotion,
} from "@/components/ui/interaction";
import { badgeCopy } from "@/copy/badges";
import { reportCopy, reportLabels } from "@/copy/report";
import { cn } from "@/lib/utils";
import type { DealType } from "./labels";
import { endedDots } from "./flow";

const copy = reportCopy;

/** 펼쳐 나타나는 조각: base 페이드 + 4px 위로. 축소 모드면 즉시 */
export const enterClass =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:[animation-duration:var(--lm-duration-base)] motion-safe:[animation-timing-function:var(--lm-ease-enter)]";

export const reportCls = {
  /** 작은 테두리 버튼(높이 40, 터치 48). 웨이팅 3버튼, 아직 해요/끝났어요 */
  pill: cn(
    "inline-flex h-10 items-center justify-center gap-1.5 rounded-chip border border-border px-4 type-label text-foreground hover:bg-muted active:bg-muted aria-disabled:opacity-50",
    "aria-pressed:border-primary aria-pressed:text-primary aria-pressed:ring-[0.5px] aria-pressed:ring-primary aria-pressed:ring-inset aria-pressed:hover:bg-transparent",
    hitArea48,
    focusRing,
    pressMotion,
  ),
  /** 밑줄 글자 버튼 (터치 44) */
  text: cn(
    "relative inline-flex min-h-11 items-center gap-1.5 type-caption text-foreground underline decoration-border decoration-1 underline-offset-[3px] hover:decoration-foreground active:decoration-foreground aria-disabled:opacity-50",
    focusRing,
  ),
  ghostIcon: cn(
    "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted active:text-foreground aria-disabled:opacity-50",
    focusRing,
  ),
};

/** 출처 배지 "제보" (DEAL-02). 사장님 등록(DEAL-07)은 2단계 */
export function SourceBadge() {
  return (
    <Badge variant="neutral">
      <Tag aria-hidden strokeWidth={1.75} />
      <span aria-hidden>{copy.deal.sourceBadge}</span>
      <span className="sr-only">{copy.deal.sourceBadgeSr}</span>
    </Badge>
  );
}

/** 할인 한 줄: 유형 caption + 출처 배지 + 내용 + "3일 전 제보, 11월 5일까지 | 평일 점심" */
export function DealRow({
  type,
  content,
  meta,
  when,
  dim,
  menu,
  children,
  className,
  as: As = "li",
}: {
  type: DealType;
  content: string;
  meta: ReactNode;
  when?: string | null;
  /** 끝났어요를 누른 뒤 */
  dim?: boolean;
  /** 오른쪽 위 신고 버튼 */
  menu?: ReactNode;
  children?: ReactNode;
  className?: string;
  as?: "li" | "div";
}) {
  return (
    <As
      className={cn(
        "flex flex-col gap-2 border-b border-border py-4 last:border-b-0",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="type-caption text-muted-foreground">
              {reportLabels.dealTypes[type]}
            </span>
            <SourceBadge />
          </div>
          <p
            className={cn(
              "type-body-sm break-keep transition-colors duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
              dim && "text-muted-foreground",
            )}
          >
            {content}
          </p>
          <p className="type-caption text-muted-foreground tabular-nums">
            {meta}
            {when ? (
              <span className="ml-2 border-l border-border pl-2">{when}</span>
            ) : null}
          </p>
        </div>
        {menu}
      </div>
      {children}
    </As>
  );
}

/** 할인 고지 두 줄 (DEAL-02, D-10 안건 12, 원칙 6) */
export function DealNotice({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <p className="type-caption break-keep text-muted-foreground">
        {copy.deal.notice}
      </p>
      <p className="type-caption break-keep text-muted-foreground">
        {copy.deal.noScore}
      </p>
    </div>
  );
}

/** 할인 하나의 신고 버튼 (이름 "이 할인 정보 신고", 44) */
export function DealReportButton({
  onClick,
  disabled,
}: {
  onClick: (opener: HTMLElement) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={copy.check.reportDeal}
      aria-disabled={disabled || undefined}
      onClick={(e) => onClick(e.currentTarget)}
      className={cn(reportCls.ghostIcon, "-mt-1 -mr-2.5 size-10", hitArea44)}
    >
      <Flag aria-hidden className="size-4" strokeWidth={1.5} />
    </button>
  );
}

/** 아직 해요 / 끝났어요 한 탭 (DEAL-03). 1인 1응답 */
export const CheckPair = forwardRef<
  HTMLButtonElement,
  {
    label: string;
    disabled?: boolean;
    busy?: boolean;
    onPick: (v: "still" | "ended") => void;
  }
>(function CheckPair({ label, disabled, busy, onPick }, ref) {
  return (
    <div
      role="group"
      aria-label={label}
      aria-busy={busy || undefined}
      className="flex flex-wrap gap-2"
    >
      {(["still", "ended"] as const).map((v, i) => (
        <button
          key={v}
          ref={i === 0 ? ref : undefined}
          type="button"
          aria-pressed={false}
          aria-disabled={disabled || busy || undefined}
          onClick={() => onPick(v)}
          className={cn(reportCls.pill, "h-9 px-3.5")}
        >
          {reportLabels.dealCheck[v]}
        </button>
      ))}
    </div>
  );
});

/** 끝났어요 누적 점 3개 (서로 다른 3명이면 숨김, AC-DEAL-3). 묶음은 이름 하나 */
export function EndedTally({ count }: { count: number }) {
  const n = endedDots(count);
  return (
    <span
      role="img"
      aria-label={copy.check.endedTally(n)}
      className="inline-flex items-center gap-1.5 type-caption text-muted-foreground"
    >
      <span aria-hidden className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "size-1.5 rounded-full border border-muted-foreground transition-colors duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
              i < n && "bg-muted-foreground",
            )}
          />
        ))}
      </span>
      <span aria-hidden className="tabular-nums">
        {copy.check.endedTally(n)}
      </span>
    </span>
  );
}

const WAIT_LEVELS: readonly WaitingLevel[] = ["walkIn", "short", "long"];

/** 웨이팅 3버튼 (PLACE-07). 고르면 그것만 남기고 나머지는 접는다(B) */
export const WaitButtons = forwardRef<
  HTMLButtonElement,
  {
    selected: WaitingLevel | null;
    /** 고른 뒤나 30분 제한 중 */
    locked: boolean;
    disabled?: boolean;
    busy?: boolean;
    onPick: (level: WaitingLevel) => void;
  }
>(function WaitButtons({ selected, locked, disabled, busy, onPick }, ref) {
  return (
    <div
      role="group"
      aria-label={copy.wait.group}
      aria-busy={busy || undefined}
      className="flex flex-wrap gap-2"
    >
      {WAIT_LEVELS.map((level, i) => {
        const on = selected === level;
        if (selected && !on) return null;
        return (
          <button
            key={level}
            ref={i === 0 || on ? ref : undefined}
            type="button"
            aria-pressed={on}
            aria-disabled={disabled || locked || busy || undefined}
            onClick={() => onPick(level)}
            className={cn(
              reportCls.pill,
              // 고른 칸은 잠긴 뒤에도 또렷하게 둔다
              on && "aria-disabled:opacity-100",
            )}
          >
            {on ? (
              <Check aria-hidden className="size-4" strokeWidth={1.75} />
            ) : null}
            {badgeCopy.waitingLevels[level]}
          </button>
        );
      })}
    </div>
  );
});

/** 그 자리 결과 줄 (B): caption + 글자 버튼(되돌리기, 취소). role="status", 초점을 받을 수 있다 */
export const InlineResult = forwardRef<
  HTMLParagraphElement,
  { children: ReactNode; action?: ReactNode; className?: string }
>(function InlineResult({ children, action, className }, ref) {
  return (
    <p
      ref={ref}
      tabIndex={-1}
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-x-2 type-caption break-keep text-muted-foreground tabular-nums outline-none",
        enterClass,
        className,
      )}
    >
      <span>{children}</span>
      {action}
    </p>
  );
});
