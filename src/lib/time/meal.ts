import {
  DINNER_START_HOUR,
  LUNCH_PEAK_END_MINUTES,
  LUNCH_PEAK_START_MINUTES,
} from "./constants";
import { getKstParts, kstMinutesOfDay } from "./kst";

export type Meal = "lunch" | "dinner";

/** REC-01: KST 00:00~14:59 점심, 15:00~23:59 저녁. */
export function getMeal(now: Date): Meal {
  return getKstParts(now).hour < DINNER_START_HOUR ? "lunch" : "dinner";
}

/** 상단 토글로 수동 선택한 끼니가 있으면 그것을, 없으면 시각으로 판정한다. */
export function resolveMeal(now: Date, override?: Meal | null): Meal {
  return override ?? getMeal(now);
}

/** PLACE-08 점심 피크 시간대(KST 11:00 이상 13:30 미만). */
export function isLunchPeak(now: Date): boolean {
  const minutes = kstMinutesOfDay(now);
  return (
    minutes >= LUNCH_PEAK_START_MINUTES && minutes < LUNCH_PEAK_END_MINUTES
  );
}
