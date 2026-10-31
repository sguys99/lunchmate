// 내 방문 기록과 평가 → 추천 엔진 방문 신호 (T6.11, AC-REC-5, FB-05). 순수 함수.
//
// - 서버(load-today)는 visits와 내 reviews.rating만 읽는다. DB에는 카카오 카테고리가 없다(place_id만 저장, CLAUDE.md 7장).
//   그래서 카테고리는 이번 후보(세션 메모리의 카카오 값)에서 찾고, 후보 밖 식당은 null로 둔다.
//   null이면 그 식당 자신의 신호에만 쓰고 카테고리 신호(같은 종류 👍👎, 같은 종류 반복 감점)에는 쓰지 않는다.
// - 감쇠 기준 시각은 방문일(KST) 정오다. 엔진이 반감기(constants.ts FEEDBACK_HALF_LIFE_DAYS)로 무게를 줄인다.
// - 안 갔어요(not_visited)는 skipped: 선호에도 반복 패널티에도 쓰지 않는다(FB-05).
import type { CategorySlug } from "@/features/place/categories";
import type { Visit } from "@/lib/reco/types";
import { fromKstWallTime } from "@/lib/time";

/** load-today가 화면으로 넘기는 한 줄(사용자 자신의 값) */
export type HistoryRow = {
  placeId: string;
  /** KST 방문일 "YYYY-MM-DD" */
  visitedOn: string;
  status: Visit["status"];
  rating: Visit["rating"];
};

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toVisits(
  rows: readonly HistoryRow[],
  categoryOf: (placeId: string) => CategorySlug | null,
): Visit[] {
  const out: Visit[] = [];
  for (const r of rows) {
    const m = DATE_RE.exec(r.visitedOn);
    if (!m) continue;
    out.push({
      placeId: r.placeId,
      category: categoryOf(r.placeId),
      at: fromKstWallTime(Number(m[1]), Number(m[2]), Number(m[3]), 12),
      status: r.status,
      rating: r.rating,
    });
  }
  return out;
}

/** visits.status(DB) → 엔진 상태. 모르는 값은 null(버린다) */
export function visitStatusOf(status: string): Visit["status"] | null {
  if (status === "candidate" || status === "visited") return status;
  if (status === "not_visited") return "skipped";
  return null;
}

/** reviews.rating(DB) → 엔진 평가 */
export function ratingOf(rating: string | null | undefined): Visit["rating"] {
  return rating === "up" || rating === "down" ? rating : null;
}
