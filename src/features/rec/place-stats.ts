// place_stats 집계 행 → 추천 엔진 후보 값 (T6.11, T6.15, T6.23, T6.25). 순수 함수, React와 네트워크 의존 없음.
//
// - 평판 C: 👍/👎 수를 그대로 넘긴다. 3건 미만 중립은 엔진(score.ts)이 판정한다.
// - 예산 B와 예산 하드 필터: 가격 제보가 1건 이상일 때만 priceReport(중앙값, 수). 없으면 null(카테고리 추정가).
// - 웨이팅 W: 30분 안의 최신 제보 1건. now(바로 지금), short, long 단계를 엔진 단계로 바꾼다.
//   점심 피크와 "줄 길어요" 판정은 엔진이 한다(PLACE-08).
// - 폐업(MOD-03): 서버가 closed(서로 다른 3명)로 판정했으면 하드 필터 기준 수 이상으로 맞춘다.
// - 오늘 쉬어요(D-40): 이번 끼니 제보 수. 1명이면 W 감점과 카드 배지, 2명이면 엔진이 뺀다.
// - 할인: 표시용 deal만. 엔진은 점수와 이유에 쓰지 않는다(AC-DEAL-2, deal-neutral.test.ts).
// 집계를 못 받았으면 EMPTY_STATS(콜드 스타트 중립)로 추천을 계속한다.
import { CLOSED_REPORT_THRESHOLD } from "@/lib/reco/filter";
import type { WaitLevel } from "@/lib/reco/types";
import { EMPTY_STATS, type PlaceStats } from "./candidates";

/** stats-source가 돌려주는 행(필요한 열만). 서버 값이라 null일 수 있는 열은 null로 둔다 */
export type PlaceStatsRow = {
  place_id: string;
  price_count: number;
  price_median: number | null;
  thumbs_up: number;
  thumbs_down: number;
  closed_reports: number;
  closed: boolean;
  /** 이번 끼니 "오늘 쉬어요" 제보 수(D-40). 옛 응답이면 없을 수 있다 */
  closed_today?: number | null;
  wait_level: string | null;
  wait_reported_at: string | null;
  deal_count: number;
};

/** wait_reports.level → 엔진 단계 */
const WAIT_LEVELS: Readonly<Record<string, WaitLevel>> = {
  now: "walkIn",
  short: "short",
  long: "long",
};

const count = (n: number) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

export function toPlaceStats(row: PlaceStatsRow): PlaceStats {
  const priceCount = count(row.price_count);
  const level = row.wait_level ? WAIT_LEVELS[row.wait_level] : undefined;
  const reportedAt = row.wait_reported_at
    ? new Date(row.wait_reported_at)
    : null;
  const closedReports = count(row.closed_reports);
  return {
    priceReport:
      priceCount > 0 && row.price_median !== null && row.price_median > 0
        ? { medianKRW: row.price_median, count: priceCount }
        : null,
    thumbs: { up: count(row.thumbs_up), down: count(row.thumbs_down) },
    closedReports: row.closed
      ? Math.max(closedReports, CLOSED_REPORT_THRESHOLD)
      : closedReports,
    closedToday: count(row.closed_today ?? 0),
    waiting:
      level && reportedAt && !Number.isNaN(reportedAt.getTime())
        ? { level, reportedAt }
        : null,
    deal: count(row.deal_count) > 0 ? { active: true } : null,
  };
}

/** 행 목록 → place_id로 찾는 함수. 없는 곳은 EMPTY_STATS */
export function statsLookup(
  rows: readonly PlaceStatsRow[] | null | undefined,
): (id: string) => PlaceStats {
  if (!rows || rows.length === 0) return () => EMPTY_STATS;
  const byId = new Map(rows.map((r) => [r.place_id, toPlaceStats(r)]));
  return (id) => byId.get(id) ?? EMPTY_STATS;
}
