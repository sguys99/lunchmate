"use client";
// 마감 카운트다운 (T2.13, 투표방 POLL 마감 표시). "3:12", "1:02:05"를 시, 분, 초 NumberFlow 3개로 굴린다.
//
// - 남은 시간 계산은 src/lib/format의 countdownUntil(정각 포함 마감, 남은 초 올림)을 그대로 쓴다.
// - 분과 초의 십의 자리는 0~5만 돌도록 digits를 준다(59 → 00으로 넘어갈 때 9, 8, 7...을 거치지 않음).
// - 값은 줄어들기만 하므로 trend -1(숫자가 위에서 아래로 내려온다).
// - 축소 모드면 RollingNumber가 애니메이션 없이 바로 바꾼다. 매초 바뀌는 숫자라 이 차이가 가장 크다.
// - 접근성: role="timer"(aria-live off)라 매초 읽지 않는다. 이름에 전체 남은 시간을 문장으로 준다.
// - 서버와 첫 렌더에는 시각을 모르므로 같은 폭의 자리(placeholder)를 그린다(레이아웃 이동 없음).
import { NumberFlowGroup } from "@number-flow/react";
import { numbersCopy } from "@/copy/numbers";
import { countdownUntil } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RollingNumber } from "./rolling-number";
import { useSecondClock } from "./use-second-clock";

const TWO_DIGITS = { minimumIntegerDigits: 2 } as const;
/** 오른쪽부터 0번 자리. 1번(십의 자리)은 0~5. */
const SEXAGESIMAL = { 1: { max: 5 } } as const;

export type DeadlineCountdownProps = {
  deadline: Date;
  /** 테스트와 디자인 랩용. 없으면 1초 시계(useSecondClock)를 쓴다. */
  nowMs?: number;
  /** 마감 뒤 보일 글자. 기본 "마감되었습니다" */
  closedLabel?: string;
  className?: string;
};

export function DeadlineCountdown({
  deadline,
  nowMs,
  closedLabel = numbersCopy.countdownClosed,
  className,
}: DeadlineCountdownProps) {
  const clock = useSecondClock();
  const now = nowMs ?? clock;

  if (now === null) {
    // 시각을 모르는 첫 렌더: 숫자 자리만 비워 둔다.
    return (
      <span
        aria-hidden
        className={cn("inline-block tabular-nums opacity-0", className)}
      >
        0:00
      </span>
    );
  }

  const c = countdownUntil(deadline, new Date(now));
  if (c.status === "closed") {
    return (
      <span data-state="closed" className={className}>
        {closedLabel}
      </span>
    );
  }

  return (
    <span
      role="timer"
      data-state="open"
      aria-label={numbersCopy.countdownLabel(c.hours, c.minutes, c.seconds)}
      className={cn("inline-flex items-baseline tabular-nums", className)}
    >
      <span aria-hidden className="contents">
        <NumberFlowGroup>
          {c.hasHours ? <RollingNumber value={c.hours} trend={-1} /> : null}
          <RollingNumber
            value={c.minutes}
            trend={-1}
            prefix={c.hasHours ? ":" : undefined}
            format={c.hasHours ? TWO_DIGITS : undefined}
            digits={c.hasHours ? SEXAGESIMAL : undefined}
          />
          <RollingNumber
            value={c.seconds}
            trend={-1}
            prefix=":"
            format={TWO_DIGITS}
            digits={SEXAGESIMAL}
          />
        </NumberFlowGroup>
      </span>
    </span>
  );
}
