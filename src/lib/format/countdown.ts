// 마감 카운트다운 ("3:12", "1:02:05"). 마감 판정은 src/lib/time의 msUntil(정각 포함 마감)을 따른다.
import { msUntil } from "@/lib/time";

export type Countdown =
  | { status: "closed" }
  | {
      status: "open";
      /** 남은 초 (올림). 1ms만 남아도 1초로 보여 정각 전에 0:00이 뜨지 않는다. */
      totalSeconds: number;
      /** 1시간 미만이면 0. 표시 형식 결정은 hasHours로 한다. */
      hours: number;
      minutes: number;
      seconds: number;
      /** true면 "h:mm:ss", false면 "m:ss" */
      hasHours: boolean;
      /** "3:12", "1:02:05" */
      text: string;
    };

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * 남은 ms → 카운트다운. 0 이하면 { status: "closed" }.
 * 숫자 성분(hours, minutes, seconds)을 따로 주므로 NumberFlow에 각각 넣고
 * 두 자리 채움(minimumIntegerDigits: 2)은 minutes는 hasHours일 때만, seconds는 항상 적용하면 된다.
 */
export function countdownFromMs(remainingMs: number): Countdown {
  if (Number.isNaN(remainingMs)) {
    throw new RangeError("remainingMs가 NaN입니다");
  }
  if (remainingMs <= 0) return { status: "closed" };
  if (!Number.isFinite(remainingMs)) {
    throw new RangeError("remainingMs는 유한한 숫자여야 합니다");
  }
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const hasHours = hours > 0;
  const text = hasHours
    ? `${hours}:${pad2(minutes)}:${pad2(seconds)}`
    : `${minutes}:${pad2(seconds)}`;
  return {
    status: "open",
    totalSeconds,
    hours,
    minutes,
    seconds,
    hasHours,
    text,
  };
}

/** 마감 시각과 기준 시각으로 카운트다운. 마감 정각은 이미 마감(closed). */
export function countdownUntil(deadline: Date, now: Date): Countdown {
  if (Number.isNaN(deadline.getTime()) || Number.isNaN(now.getTime())) {
    throw new RangeError("deadline 또는 now가 올바른 Date가 아닙니다");
  }
  return countdownFromMs(msUntil(deadline, now));
}

/** 카운트다운 문자열만 필요할 때. 마감이면 null (마감 문구는 호출 측이 src/copy에서). */
export function formatCountdown(remainingMs: number): string | null {
  const c = countdownFromMs(remainingMs);
  return c.status === "open" ? c.text : null;
}
