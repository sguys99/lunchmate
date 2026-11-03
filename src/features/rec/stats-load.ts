// 오늘(홈) 후보 집계 읽기 본체 (T6.11). stats-query.ts의 queryFn이 동적으로 받는다(홈 첫 로드 밖).
import type { CardMenu } from "@/features/menu/card-menu-pick";
import type { QueryClient } from "@tanstack/react-query";
import type { PlaceStatsRow } from "./place-stats";
import { read } from "@/lib/read";

/** RPC 한 번에 보낼 수 있는 place_id 수(place_stats 입력 한도) */
export const PLACE_STATS_BATCH = 60;
/** 요청 하나를 기다리는 최대 시간. 카드를 오래 막지 않는다 */
export const STATS_TIMEOUT_MS = 2_500;
/**
 * 홈 카드가 집계를 기다리는 최대 시간(11/03 첫 로딩 측정). 평소 응답은 0.2초 안팎인데 서버가 식어 있으면 1.2초쯤 걸렸고,
 * 실패하면 요청 상한 2.5초에 재시도까지 약 5.3초 동안 카드가 스켈레톤에 머물렀다.
 * 넘기면 홈은 이 후보 집합을 빈 집계(중립값, 콜드 스타트)로 추천한다. 쿼리는 그 값으로 성공해 이번 세션 동안 유지되므로
 * (staleTime Infinity) 늦게 온 집계로 카드가 눈앞에서 다시 뽑히지 않고, 탭을 오가도 같은 묶음이 나온다.
 * 늦게 온 집계는 지도 캐시(placeStats 키)에만 넣는다. 그 세션의 홈 대표 메뉴와 메모 배지는 비어 있다.
 */
export const HOME_STATS_WAIT_MS = 800;

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
    batches.map((b) =>
      withTimeout(read("fetchPlaceStats", b), STATS_TIMEOUT_MS),
    ),
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
): Promise<HomeStatsRows> {
  const full = readHomeStats(ids, withMemos, client);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const gaveUp = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), HOME_STATS_WAIT_MS);
  });
  try {
    const first = await Promise.race([full, gaveUp]);
    if (first) return first;
  } finally {
    clearTimeout(timer);
  }
  // 늦게 오면 지도 캐시만 채운다(readHomeStats 안). 실패는 조용히 버린다
  full.catch(() => undefined);
  return { rows: [], memos: {}, menus: {} };
}

type HomeStatsRows = {
  rows: PlaceStatsRow[];
  memos: Record<string, string>;
  menus: Record<string, CardMenu>;
};

async function readHomeStats(
  ids: readonly string[],
  withMemos: boolean,
  client?: QueryClient,
): Promise<HomeStatsRows> {
  const batches = statsBatches(ids);
  const results = await Promise.all(
    batches.map((b) =>
      withTimeout(read("fetchHomeStats", b, withMemos), STATS_TIMEOUT_MS),
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
