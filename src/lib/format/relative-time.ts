// 상대 시간 표시 ("방금", "12분 전", "어제"). 기준 시각(now)을 주입받아 결정적이다.
// 날짜 판정은 KST 달력 기준이며 src/lib/time 유틸만 쓴다.
import {
  HOUR_MS,
  MINUTE_MS,
  getKstParts,
  kstDayDiff,
  msSince,
} from "@/lib/time";

function assertValidDate(date: Date, name: string): void {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`${name}이(가) 올바른 Date가 아닙니다`);
  }
}

/**
 * 지난 시각을 상대 시간으로 표시한다.
 *  - 1분 미만, 또는 미래 시각(기기 시계 차이): "방금"
 *  - 1시간 미만: "N분 전" (내림)
 *  - 24시간 미만: "N시간 전" (내림, 자정을 넘었어도 24시간 안이면 시간으로)
 *  - 그 밖에 KST 달력으로 하루 전: "어제", 2~6일 전: "N일 전"
 *  - 7일 이상: 같은 해면 "10월 21일", 다른 해면 "2025년 10월 21일" (KST)
 */
export function formatRelativeTime(past: Date, now: Date): string {
  assertValidDate(past, "past");
  assertValidDate(now, "now");
  const elapsed = msSince(past, now);
  if (elapsed < MINUTE_MS) return "방금";
  if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}분 전`;
  if (elapsed < 24 * HOUR_MS) return `${Math.floor(elapsed / HOUR_MS)}시간 전`;

  const days = kstDayDiff(past, now);
  if (days <= 1) return "어제";
  if (days < 7) return `${days}일 전`;

  const p = getKstParts(past);
  const n = getKstParts(now);
  const md = `${p.month}월 ${p.day}일`;
  return p.year === n.year ? md : `${p.year}년 ${md}`;
}
