"use client";
// 식당 하나의 메뉴 집계 쿼리 (T10.16, MENU-03). 상세 메뉴판과 피드백 시트 칩이 같은 키를 쓴다.
// 세션 메모리(TanStack Query)만. 우리 DB 집계라 카카오 캐시 금지 규칙과 무관하지만 같은 방식으로 둔다.
import { useQuery } from "@tanstack/react-query";
import { isEnabled } from "@/lib/flags";
import { dbKeys } from "@/lib/query/db-keys";
import { placeMenusAction } from "./actions";
import type { MenuStat } from "./model";

export function menuReportsOn(): boolean {
  return isEnabled("menuReports");
}

export function usePlaceMenus(placeId: string, enabled = true) {
  return useQuery<MenuStat[]>({
    queryKey: dbKeys.placeMenus(placeId),
    queryFn: () => placeMenusAction([placeId]).then((r) => r[placeId] ?? []),
    enabled: enabled && menuReportsOn(),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
