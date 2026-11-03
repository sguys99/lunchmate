// 메모를 고친 뒤 세션 메모리 캐시 맞추기 (T10.15). 다시 읽지 않고 메모 자리만 바꾼다.
// - 상세(placeUserStateKey): 그 식당의 memo만.
// - 오늘(홈) 집계(["placeStats", 후보, "home-memos"]): memos 표만. 집계(rows)는 같은 참조로 남겨 카드가 다시 뽑히지 않게 한다
//   (홈 집계 쿼리는 staleTime Infinity이고 다시 읽으면 카드가 바뀐다, rec/stats-query).
// - 나 탭 내 메모(memoKeys.mine): 그 식당 글만.
// - 장애 홈 "즐겨찾기에서 고르기"(memoKeys.favorites): 순서가 바뀌므로 지워 두고 다음에 열 때 읽는다.
// 메모 글은 세션 메모리에만 둔다(localStorage, 서비스 워커 캐시 없음).
import type { QueryClient } from "@tanstack/react-query";
import { placeUserStateKey } from "@/features/place/detail/user-state-key";
import type { PlaceUserState } from "@/features/place/place-requests";
import type { HomeStats } from "@/features/rec/stats-query";
import { memoKeys } from "./keys";
import type { MyPlaceMemosResult } from "./actions";

function withMemo(
  memos: Record<string, string>,
  placeId: string,
  memo: string | null,
): Record<string, string> {
  const next = { ...memos };
  if (memo === null) delete next[placeId];
  else next[placeId] = memo;
  return next;
}

function isHomeStats(v: unknown): v is HomeStats {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    "memos" in v &&
    "rows" in v
  );
}

export function applyMemo(
  client: QueryClient,
  placeId: string,
  memo: string | null,
): void {
  client.setQueryData<PlaceUserState>(placeUserStateKey(placeId), (old) =>
    old && old.signedIn ? { ...old, memo } : old,
  );
  client.setQueriesData<unknown>(
    { queryKey: ["placeStats"] },
    (old: unknown) =>
      isHomeStats(old)
        ? { ...old, memos: withMemo(old.memos, placeId, memo) }
        : old,
  );
  client.setQueryData<MyPlaceMemosResult>(memoKeys.mine, (old) =>
    old && old.signedIn
      ? { ...old, memos: withMemo(old.memos, placeId, memo) }
      : old,
  );
  client.removeQueries({ queryKey: memoKeys.favorites });
}
