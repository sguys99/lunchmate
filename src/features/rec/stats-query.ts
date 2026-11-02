// 오늘(홈) 후보 집계 쿼리 옵션 (T6.11). 후보 집합 하나에 한 번만 읽는다.
//
// - 키는 후보 place_id를 정렬해 이은 값이다. 다시 뽑기는 같은 후보 집합이라 다시 읽지 않는다.
// - 받은 뒤 같은 세션에서는 다시 읽지 않는다(창 포커스, 다시 마운트 포함). 집계가 바뀌면 카드가 눈앞에서
//   다시 뽑히기 때문이다. 웨이팅 30분 판정은 묶음을 뽑은 시각으로 엔진이 다시 하므로 지난 제보는 다음 묶음에서 빠진다.
// - 한 요청이 STATS_TIMEOUT_MS를 넘으면 실패로 보고 한 번 더 시도한다. 그래도 실패하면 화면은 중립값으로 추천한다.
// - 이 파일은 홈 첫 로드에 들어간다. 읽기 본체(stats-load, 서버 액션 호출)는 queryFn 안에서 동적으로 받는다.
import { queryOptions } from "@tanstack/react-query";

const load = () => import("./stats-load");

/** 읽기 본체 청크를 미리 받는다(AC-REC-4). 카카오 결과가 온 뒤 청크 받기와 집계 요청이 차례로 이어지지 않게 화면 진입 때 부른다 */
export function preloadPlaceStats(): void {
  void load().catch(() => {});
}

/** 후보 집합 키: 중복을 빼고 정렬해 잇는다(stats-load statsBatches와 같은 순서) */
export function placeStatsKey(ids: readonly string[]): string {
  return [...new Set(ids)].sort().join(",");
}

export function placeStatsQuery(ids: readonly string[]) {
  return queryOptions({
    queryKey: ["placeStats", placeStatsKey(ids)] as const,
    queryFn: () => load().then((m) => m.loadStatsRows(ids)),
    retry: 1,
    retryDelay: 300,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}
