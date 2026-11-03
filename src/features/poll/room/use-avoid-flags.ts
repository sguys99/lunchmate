"use client";
// 기피 경고 플래그 (T7.8 화면, POLL-13, G7 결정 2026-11-01). 후보마다 "못 먹는 분 있음"인지만 받는다(누구, 무엇 비공개).
// - 서버가 참여자 3명 미만이면 tooFew로 판정하지 않는다(2인 방에서 상대를 특정하지 못하게). 그때는 경고 칸을 숨긴다.
// - 한 사람이 한 방에서 하루 10번까지라 후보 목록(이름을 찾은 곳)과 "3명 이상인지"가 바뀔 때만 다시 묻는다.
// - 이름과 업종은 판정에만 보내고 서버는 저장하지 않는다. 쿼리 키에는 place_id만 넣는다.
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { PollRoom, RoomCandidate } from "./model";
import type { CandidatePlace } from "./use-candidate-places";
import { read } from "@/lib/read";

const MIN_MEMBERS = 3;

export function useAvoidFlags(
  room: PollRoom,
  approved: readonly RoomCandidate[],
  getPlace: (placeId: string) => CandidatePlace,
  enabled: boolean,
): { flagged: ReadonlySet<string> } {
  const places = approved
    .map((c) => getPlace(c.placeId))
    .flatMap((p) => (p.status === "resolved" ? [p] : []));
  const enough = room.members.length >= MIN_MEMBERS;
  const ids = places
    .map((p) => p.placeId)
    .sort()
    .join(",");

  const q = useQuery({
    queryKey: ["db", "poll", "avoid", room.poll.id, ids, enough] as const,
    queryFn: async () => {
      const r = await read("avoidFlagsAction", {
        pollId: room.poll.id,
        places: places.slice(0, 5).map((p) => ({
          placeId: p.placeId,
          name: p.name,
          categoryText: p.categoryText,
          categoryLabel: p.categoryLabel,
        })),
      });
      if (!r.ok) return { flagged: [] as string[], tooFew: true };
      return { flagged: r.flagged, tooFew: r.tooFew };
    },
    enabled: enabled && enough && places.length > 0,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });

  return useMemo(
    () => ({
      flagged: new Set(q.data && !q.data.tooFew ? q.data.flagged : []),
    }),
    [q.data],
  );
}
