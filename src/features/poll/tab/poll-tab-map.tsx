"use client";
// 투표 탭 데스크톱 우측 지도 (T8.11b, g7-qa.md 7절 사용자 결정 11/01). (app)/@map/poll 슬롯이 그린다.
// - 진행 중 내 투표 하나의 기준점과 후보 핀(투표방 지도와 같은 문법, PollMapCanvas). 1위(단독)만 올리브.
//   어느 방인지는 map-pick.ts: 목록에서 마우스나 초점을 둔 진행 중 줄, 없으면 마감이 가장 가까운 방.
// - 진행 중 투표가 없으면 기본 사무실 주변(오늘 지도와 같은 사무실 기준점, 핀 없음). 사무실도 없으면 빈 지도 자리.
// - 1024px 이상에서만 데이터와 지도 SDK를 받는다(모바일은 지도 칸이 숨겨져 있다). 목록 쿼리(my_polls)는 탭과 같은 캐시.
// - 후보 이름은 T5.12a(세션 메모리, 기준점 주변 FD6 매칭). 투표방 화면과 같은 쿼리 키라 들어가면 다시 찾지 않는다.
//   이름을 못 찾은 후보는 핀을 두지 않는다(투표방 지도와 같다). 장소 이름, 좌표는 저장하지도 보내지도 않는다.
// - 지도 로딩 중, 목록 읽는 중, 오류, 오프라인, SDK 실패는 모두 조용한 빈 지도 자리(다른 탭 데스크톱 지도와 같다).
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { MapPane } from "@/components/app-shell";
import { myOfficesAction, myPollsAction } from "@/features/poll/create/actions";
import {
  myOfficesKey,
  myPollsKey,
  pollRoomKey,
} from "@/features/poll/create/keys";
import { pollRoomAction } from "@/features/poll/room/actions";
import { approvedCandidates, leaders } from "@/features/poll/room/model";
import { PollMapCanvas } from "@/features/poll/room/poll-map";
import type { PollMapView } from "@/features/poll/room/poll-map-store";
import { usePlaceNames } from "@/features/place/use-place-names";
import { pickMapPoll } from "./map-pick";
import { usePollTabMapFocus } from "./map-focus-store";

const DESKTOP_QUERY = "(min-width: 64rem)";
/** 줄 위를 훑고 지나갈 때마다 방을 읽지 않게 잠깐 기다린다 */
const FOCUS_SETTLE_MS = 200;

function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useDesktop(): boolean {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

function useSettled<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setSettled(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return settled;
}

export function PollTabMap() {
  const desktop = useDesktop();
  if (!desktop) return <MapPane />;
  return <DesktopPollTabMap />;
}

function DesktopPollTabMap() {
  const focusId = useSettled(
    usePollTabMapFocus((s) => s.focusId),
    FOCUS_SETTLE_MS,
  );
  const clearFocus = usePollTabMapFocus((s) => s.setFocus);
  useEffect(() => () => clearFocus(null), [clearFocus]);

  const polls = useQuery({
    queryKey: myPollsKey,
    queryFn: () => myPollsAction(),
    staleTime: 15_000,
  });
  const list = polls.data?.signedIn ? polls.data.polls : null;
  const pickedId = list ? (pickMapPoll(list, focusId)?.pollId ?? null) : null;
  const pollView = usePollView(pickedId);
  const officeView = useOfficeView(Boolean(list) && pickedId === null);

  // 지도 하나를 그대로 두고 view만 바꾼다(방을 옮겨도 SDK를 다시 받지 않는다)
  const view = pickedId ? pollView : officeView;
  if (!list || !view) return <MapPane />;
  return <PollMapCanvas view={view} baseKind={pickedId ? "here" : "office"} />;
}

/** 진행 중 투표가 없을 때: 기본 사무실(없으면 첫 사무실) 주변, 핀 없음 */
function useOfficeView(enabled: boolean): PollMapView | null {
  const offices = useQuery({
    queryKey: myOfficesKey,
    queryFn: () => myOfficesAction(),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
  const list = offices.data?.signedIn ? offices.data.offices : null;
  const office = list ? (list.find((o) => o.isDefault) ?? list[0]) : undefined;
  const lat = office?.lat;
  const lng = office?.lng;
  return useMemo(
    () =>
      lat !== undefined && lng !== undefined
        ? { base: { lat, lng }, pins: [], activeId: null }
        : null,
    [lat, lng],
  );
}

/**
 * 진행 중 투표 한 곳: 기준점 + 승인된 후보 핀(이름을 찾은 곳만), 1위(단독)만 올리브(투표방 지도와 같다).
 * 다른 방으로 옮기는 동안은 앞 방을 그대로 보인다(placeholderData).
 */
function usePollView(pollId: string | null): PollMapView | null {
  const room = useQuery({
    queryKey: pollRoomKey(pollId ?? ""),
    queryFn: async () => {
      const r = await pollRoomAction(pollId ?? "");
      if (!r.ok) throw new Error(r.error);
      return r.room;
    },
    enabled: pollId !== null,
    staleTime: 30_000,
    retry: 1,
    placeholderData: (prev) => prev,
  });
  const data = pollId ? (room.data ?? null) : null;
  // 투표방 화면과 같은 묶음(제안 포함 전체 후보)이라야 이름 찾기 캐시를 함께 쓴다
  const refs = useMemo(
    () =>
      data?.candidates.map((c) => ({
        placeId: c.placeId,
        placeUrl: c.placeUrl,
      })) ?? [],
    [data],
  );
  const names = usePlaceNames(refs, data?.poll.anchor ?? null, {
    radius: data?.poll.radiusM,
  });

  return useMemo<PollMapView | null>(() => {
    if (!data) return null;
    const approved = approvedCandidates(data);
    const lead = leaders(approved);
    const activeId =
      lead.length === 1
        ? (approved.find((c) => c.id === lead[0])?.placeId ?? null)
        : null;
    const resolved = new Map(
      names.data?.places.map((p) => [p.placeId, p]) ?? [],
    );
    const pins = approved.flatMap((c) => {
      const r = resolved.get(c.placeId);
      return r && r.status === "resolved"
        ? [{ id: c.placeId, name: r.place.name, position: r.place.position }]
        : [];
    });
    return { base: data.poll.anchor, pins, activeId };
  }, [data, names.data]);
}
