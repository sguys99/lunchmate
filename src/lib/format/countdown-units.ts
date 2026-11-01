// 투표방 카운트다운 단위 표기 (D-14). countdown.ts와 파일을 나눈 것은 홈 첫 로드 번들 때문이다:
// 홈이 countdown.ts를 쓰는데 Turbopack은 한 모듈 안의 안 쓰는 export를 다 걷어 내지 못한다(T7.11 측정, +0.5 KB).
import { countdownFromMs } from "./countdown";

const pad2 = (n: number) => String(n).padStart(2, "0");

/** 단위 붙은 카운트다운의 한 칸. 숫자는 크게, 단위는 작게 그린다(도보 "4분"과 같은 문법) */
export type CountdownUnitPart = { value: number; unit: "시간" | "분" | "초" };

/**
 * 투표방 카운트다운 "12분", "9분 05초", "1시간 20분" (G7 게이트 2026-11-01).
 * "12:30 마감" 옆에 "12:40"을 두면 시각으로 읽히므로 단위를 붙인다.
 * - 10분 미만만 초를 보인다(두 자리). 1분 미만은 "40초".
 * - 10분 이상은 분을 올림한다(12분 40초 → "13분"). 남은 시간보다 작게 보이지 않게.
 * - 1시간 이상은 "1시간 20분", 분이 0이면 "2시간".
 * 마감이면 null. 마감 문구는 호출 측이 src/copy에서.
 */
export function countdownUnits(
  remainingMs: number,
): { parts: CountdownUnitPart[]; text: string } | null {
  const c = countdownFromMs(remainingMs);
  if (c.status === "closed") return null;
  const parts: CountdownUnitPart[] = [];
  if (c.totalSeconds < 10 * 60) {
    if (c.minutes > 0) parts.push({ value: c.minutes, unit: "분" });
    parts.push({ value: c.seconds, unit: "초" });
  } else {
    const totalMinutes = Math.ceil(c.totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) parts.push({ value: hours, unit: "시간" });
    if (minutes > 0 || hours === 0) parts.push({ value: minutes, unit: "분" });
  }
  const text = parts
    .map((p, i) =>
      p.unit === "초" && i > 0
        ? `${pad2(p.value)}${p.unit}`
        : `${p.value}${p.unit}`,
    )
    .join(" ");
  return { parts, text };
}
