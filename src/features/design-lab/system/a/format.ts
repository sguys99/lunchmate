// 시안 A 화면용 표시 도우미. 숫자와 단위를 나눠 크기를 다르게 쓰기 위한 순수 함수만 둔다.
import { designLabACopy as copy } from "@/copy/design-lab-a";
import { MOCK_POLL } from "@/features/design-lab/mock";
import { formatPercent, formatPriceBand } from "@/lib/format";
import { getKstParts, getMeal, type Meal } from "@/lib/time";

/** 시연 기준 현재 시각 (목업 고정값). 실제 시계 대신 이 값으로 끼니와 날짜를 정한다 */
export const MOCK_NOW = new Date(MOCK_POLL.mockNow);

export type NumberParts = { value: string; unit: string };

/** "9천 원대" → { value: "9천", unit: "원대" }, "1.1만 원대" → { value: "1.1만", unit: "원대" } */
export function splitPrice(priceKRW: number): NumberParts {
  const text = formatPriceBand(priceKRW);
  const [value = text, ...rest] = text.split(" ");
  return { value, unit: rest.join(" ") };
}

/** 87 → { value: "87", unit: "%" }. 콜드 스타트(null)는 null */
export function splitPercent(rate: number | null): NumberParts | null {
  const text = formatPercent(rate);
  if (text === null) return null;
  return { value: text.replace("%", ""), unit: copy.numbers.thumbsUnit };
}

export function homeContext(now: Date = MOCK_NOW): {
  meal: Meal;
  line: string;
} {
  const meal = getMeal(now);
  const { month, day, weekday } = getKstParts(now);
  return {
    meal,
    line: copy.context(month, day, copy.weekdays[weekday], copy.meals[meal]),
  };
}

/** 마감 시각 "HH:MM" (KST) */
export function kstHHMM(date: Date): string {
  const { hour, minute } = getKstParts(date);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * 상태 문구의 제목과 본문이 같은 말을 되풀이할 때(본문 첫 문장이 제목으로 끝남),
 * 더 구체적인 본문 첫 문장을 제목으로 올리고 나머지를 본문으로 쓴다.
 * 예: "도보 10분 안에 조건에 맞는 식당이 없습니다." + "15분까지 넓혀볼까요?"
 */
export function splitMessage(
  title: string,
  body: string,
): { heading: string; detail: string } {
  const cut = body.indexOf(". ");
  if (cut === -1) return { heading: title, detail: body };
  const first = body.slice(0, cut);
  if (!first.endsWith(title)) return { heading: title, detail: body };
  return { heading: first, detail: body.slice(cut + 2) };
}
