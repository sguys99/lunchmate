// 오늘(홈) 후보 집계 읽기 본체 (T6.11). stats-query.ts의 queryFn이 동적으로 받는다(홈 첫 로드 밖).
import type { CardMenu } from "@/features/menu/card-menu-pick";
import type { QueryClient } from "@tanstack/react-query";
import { fetchHomeStats, fetchPlaceStats } from "./stats-source";
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

/** 오늘(홈) 집계와 본인 메모(T10.15). 집계는 loadStatsRows와 같은 규칙(한 묶음이라도 실패하면 오류), 메모는 묶음별로 합친다 */
export async function loadHomeStats(
  ids: readonly string[],
  withMemos: boolean,
  /** 받은 집계를 같은 후보 집합의 지도 캐시(placeStats 키)에도 넣어 지도 탭이 다시 읽지 않게 한다 */
  client?: QueryClient,
): Promise<{
  rows: PlaceStatsRow[];
  memos: Record<string, string>;
  menus: Record<string, CardMenu>;
}> {
  const batches = statsBatches(ids);
  const results = await Promise.all(
    batches.map((b) =>
      withTimeout(fetchHomeStats(b, withMemos), STATS_TIMEOUT_MS),
    ),
  );
  const rows: PlaceStatsRow[] = [];
  const memos: Record<string, string> = {};
  const menus: Record<string, CardMenu> = {};
  for (const r of results) {
    if (!r.ok) throw new Error("place_stats_failed");
    rows.push(...r.rows);
    Object.assign(memos, r.memos);
    Object.assign(menus, r.menus);
  }
  // 메모 배지 조각을 카드가 그려지기 전에 받아 둔다(홈 첫 로드 밖, 메모가 있을 때만)
  if (Object.keys(memos).length > 0)
    void import("./card-badge-row").catch(() => undefined);
  const mapKey = ["placeStats", statsBatches(ids).flat().join(",")];
  if (client && client.getQueryData(mapKey) === undefined)
    client.setQueryData(mapKey, rows);
  return { rows, memos, menus };
}
