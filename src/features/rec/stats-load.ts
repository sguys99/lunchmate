// 오늘(홈) 후보 집계 읽기 본체 (T6.11). stats-query.ts의 queryFn이 동적으로 받는다(홈 첫 로드 밖).
import { fetchPlaceStats } from "./stats-source";
import type { PlaceStatsRow } from "./place-stats";

/** RPC 한 번에 보낼 수 있는 place_id 수(place_stats 입력 한도) */
export const PLACE_STATS_BATCH = 60;
/** 요청 하나를 기다리는 최대 시간. 카드를 오래 막지 않는다 */
export const STATS_TIMEOUT_MS = 2_500;

/** 후보 id → 중복 없이 정렬한 묶음들(60곳씩). 같은 후보 집합이면 같은 결과 */
export function statsBatches(ids: readonly string[]): string[][] {
  const unique = [...new Set(ids)].sort();
  const out: string[][] = [];
  for (let i = 0; i < unique.length; i += PLACE_STATS_BATCH) {
    out.push(unique.slice(i, i + PLACE_STATS_BATCH));
  }
  return out;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("place_stats_timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(t);
        reject(e instanceof Error ? e : new Error("place_stats_failed"));
      },
    );
  });
}

export async function loadStatsRows(
  ids: readonly string[],
): Promise<PlaceStatsRow[]> {
  const batches = statsBatches(ids);
  const results = await Promise.all(
    batches.map((b) => withTimeout(fetchPlaceStats(b), STATS_TIMEOUT_MS)),
  );
  const rows: PlaceStatsRow[] = [];
  for (const r of results) {
    if (!r.ok) throw new Error("place_stats_failed");
    rows.push(...r.rows);
  }
  return rows;
}
