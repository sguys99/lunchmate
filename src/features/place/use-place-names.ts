"use client";
// 장소 이름 해석 훅 (T5.12a). 즐겨찾기, 기록, 피드백 요청, 투표방, 투표 결과 화면이 쓴다.
// 결과는 TanStack Query 세션 메모리에만 둔다(저장 금지, CLAUDE.md 7장). 카카오 실패는 미해결로 돌아오므로
// 이 쿼리 자체는 실패하지 않는다. 화면은 status "unresolved" 항목에 copy/place.ts의 대체 문구와 링크를 쓴다.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LatLng } from "@/lib/map/types";
import {
  DEFAULT_RESOLVE_RADIUS,
  queryClientDeps,
  resolvePlaceNames,
  type PlaceRef,
} from "./resolve-place-names";

export const placeNamesKey = (
  ids: readonly string[],
  anchor: LatLng | null,
  radius: number,
) =>
  [
    "place-names",
    [...ids].sort().join(","),
    anchor ? anchor.lat.toFixed(5) : null,
    anchor ? anchor.lng.toFixed(5) : null,
    Math.round(radius),
  ] as const;

export function usePlaceNames(
  refs: readonly PlaceRef[],
  anchor: LatLng | null,
  options: { radius?: number; enabled?: boolean } = {},
) {
  const client = useQueryClient();
  const radius = options.radius ?? DEFAULT_RESOLVE_RADIUS;
  return useQuery({
    queryKey: placeNamesKey(
      refs.map((r) => r.placeId),
      anchor,
      radius,
    ),
    queryFn: () =>
      resolvePlaceNames(refs, queryClientDeps(client), { anchor, radius }),
    enabled: (options.enabled ?? true) && refs.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
