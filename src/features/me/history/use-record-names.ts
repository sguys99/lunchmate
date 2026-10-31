"use client";
// 나 탭 장소 이름 (T6.13, T5.12a). DB 행은 place_id, place_url뿐이라 이름과 카테고리는 세 단계로 찾는다:
// 세션 메모리 → 기본 사무실 주변 FD6 매칭 → 미해결(대체 이름 + 카카오맵 링크).
// - 결과는 TanStack Query 세션 메모리에만 있다(usePlaceNames). 저장하지 않는다(CLAUDE.md 7장).
// - 해석이 끝날 때마다 place_names_resolved(screen, total, unresolved, extra_calls)를 한 번 보낸다(PRD 10.2).
//   place_id, 이름, 좌표는 넣지 않는다.
import { useEffect, useMemo, useRef } from "react";
import type { CategorySlug } from "@/features/place/categories";
import type {
  PlaceRef,
  ResolvedPlace,
} from "@/features/place/resolve-place-names";
import { usePlaceNames } from "@/features/place/use-place-names";
import { kakaoCategorySlug } from "@/features/rec/kakao-category";
import { track } from "@/lib/analytics";
import type { LatLng } from "@/lib/map/types";

export type NameScreen = "me_history" | "me_places" | "me_reviews";

export type RecordNames = {
  /** 해석 결과. 아직 모르면 undefined(해석 중에는 줄이 pending을 보고 대체 이름 대신 빈 줄을 둔다) */
  get: (placeId: string) => ResolvedPlace | undefined;
  categoryOf: (placeId: string) => CategorySlug | null;
  pending: boolean;
  /** 전부 해석에 실패했다(위 안내 한 줄) */
  allFailed: boolean;
};

export function useRecordNames(
  refs: readonly PlaceRef[],
  anchor: LatLng | null,
  screen: NameScreen,
  enabled = true,
): RecordNames {
  // id 목록이 같으면 같은 쿼리(usePlaceNames 키가 id 정렬)
  const q = usePlaceNames(refs, anchor, { enabled });
  const reported = useRef<number>(0);

  useEffect(() => {
    if (!q.data || q.dataUpdatedAt === reported.current) return;
    reported.current = q.dataUpdatedAt;
    const s = q.data.stats;
    if (s.total === 0) return;
    track({
      name: "place_names_resolved",
      properties: {
        screen,
        total: s.total,
        unresolved: s.unresolved,
        extra_calls: s.extraCalls,
      },
    });
  }, [q.data, q.dataUpdatedAt, screen]);

  return useMemo(() => {
    const map = new Map<string, ResolvedPlace>();
    for (const p of q.data?.places ?? []) map.set(p.placeId, p);
    const total = q.data?.stats.total ?? 0;
    return {
      get: (id) => map.get(id),
      categoryOf: (id) => {
        const p = map.get(id);
        return p?.status === "resolved"
          ? kakaoCategorySlug(p.place.categoryName)
          : null;
      },
      pending: enabled && refs.length > 0 && q.isPending,
      allFailed: total > 0 && q.data?.stats.unresolved === total,
    };
  }, [q.data, q.isPending, enabled, refs.length]);
}
