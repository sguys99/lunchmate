"use client";
// 투표방 상태 훅 (T7.16~T7.19, AC-POLL-1, AC-POLL-2, D-14). 데이터는 TanStack Query 세션 메모리에만 둔다.
// - 첫 읽기와 다시 읽기는 get_poll(서버가 읽기 전에 마감 판정). 실시간 집계(poll_state)는 득표에 바로 반영하고,
//   상태나 참여자가 바뀌면 전체를 다시 읽는다(model.applySnapshot).
// - 실시간이 끊긴 동안(lost)과 마감 직후(closing)는 짧은 간격으로 다시 읽어 2초 갱신을 지킨다.
// - 투표는 낙관적으로 바로 보이고, 실패하면 되돌리되 고른 곳은 화면에 남긴다("다시 보내기").
// - 분석 이벤트: poll_voted(is_first_vote), poll_closed(마감, 취소를 처음 본 참여자 한 명, claim_poll_closed_report), poll_candidate_added(승인).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import {
  addCandidateAction,
  cancelPollAction,
  closePollNowAction,
  castVoteAction,
  claimPollClosedReportAction,
  pollRoomAction,
  resolveTieAction,
  reviewSuggestionAction,
} from "./actions";
import type { PollErrorCode } from "./errors";
import {
  applySnapshot,
  readSnapshot,
  roomPhase,
  withMyVotes,
  type PollRoom,
  type RoomPhase,
} from "./model";
import type { LiveState, PollSubscription } from "./realtime";

export const pollRoomKey = (pollId: string) =>
  ["db", "poll", "room", pollId] as const;

/** 실시간이 끊긴 동안 다시 읽는 간격 */
const LOST_POLL_MS = 4_000;
/** 마감 시각이 지나 서버 판정을 기다리는 동안 */
const CLOSING_POLL_MS = 2_000;

export class PollLoadError extends Error {
  constructor(readonly code: PollErrorCode) {
    super(code);
  }
}

export function usePollRoom(pollId: string, online: boolean) {
  const client = useQueryClient();
  const key = pollRoomKey(pollId);
  const [live, setLive] = useState<LiveState>("connecting");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [incoming, setIncoming] = useState(0);
  const subRef = useRef<PollSubscription | null>(null);

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const r = await pollRoomAction(pollId);
      if (!r.ok) throw new PollLoadError(r.error);
      return r.room;
    },
    staleTime: 0,
    retry: (count, error) =>
      count < 1 && !(error instanceof PollLoadError && error.code !== "save"),
    refetchOnWindowFocus: true,
  });
  const room = query.data;
  const phase: RoomPhase | null = room ? roomPhase(room, nowMs) : null;

  // 마감 시각, 동점 대기 끝 시각에 다시 읽는다(AC-POLL-2: 누가 열어도 서버가 판정)
  useEffect(() => {
    if (!room) return;
    const targets = [room.poll.closesAt, room.poll.tieUntil]
      .filter((x): x is string => typeof x === "string")
      .map((x) => Date.parse(x) - Date.now())
      .filter((ms) => ms > 0 && ms < 2 ** 31 - 1);
    const timers = targets.map((ms) =>
      setTimeout(() => {
        setNowMs(Date.now());
        void client.invalidateQueries({ queryKey: key });
      }, ms + 300),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.poll.closesAt, room?.poll.tieUntil]);

  // 끊긴 동안, 마감 판정을 기다리는 동안은 짧게 다시 읽는다
  const pollEvery =
    !online || !room
      ? null
      : phase === "closing"
        ? CLOSING_POLL_MS
        : live === "lost" && (phase === "vote" || phase === "tie")
          ? LOST_POLL_MS
          : null;
  useEffect(() => {
    if (pollEvery === null) return;
    const t = setInterval(() => {
      setNowMs(Date.now());
      void client.invalidateQueries({ queryKey: key });
    }, pollEvery);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollEvery]);

  // 실시간 구독(진행 중, 동점 대기만). 끝난 방은 구독하지 않는다
  const subscribe =
    Boolean(room) &&
    (phase === "vote" || phase === "tie" || phase === "closing");
  useEffect(() => {
    if (!subscribe || !online) return;
    let cancelled = false;
    void import("./realtime").then(({ subscribePoll }) => {
      if (cancelled) return;
      subRef.current = subscribePoll(pollId, {
        onLive: (s) => {
          setLive(s);
          // 구독이 붙기 전(첫 조회 ~ SUBSCRIBED 사이)에 들어온 표는 브로드캐스트를 놓친다.
          // 붙을 때마다(재연결 포함) 한 번 다시 읽어 그 틈을 메운다(AC-POLL-1)
          if (s === "live") void client.invalidateQueries({ queryKey: key });
        },
        onState: (payload) => {
          const snap = readSnapshot(payload);
          const current = client.getQueryData<PollRoom>(key);
          if (!snap || !current) {
            void client.invalidateQueries({ queryKey: key });
            return;
          }
          if (snap.voterCount > current.voterCount) setIncoming((n) => n + 1);
          const { room: next, needsRefetch } = applySnapshot(current, snap);
          client.setQueryData(key, next);
          if (needsRefetch) void client.invalidateQueries({ queryKey: key });
        },
      });
    });
    return () => {
      cancelled = true;
      subRef.current?.close();
      subRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe, online, pollId]);

  const reconnect = useCallback(() => {
    subRef.current?.reconnect();
    void client.invalidateQueries({ queryKey: key });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollId]);

  /* ---------- 투표 ---------- */

  const [sendState, setSendState] = useState<
    | { status: "idle" }
    | { status: "sending" }
    | { status: "failed"; picks: string[] }
  >({ status: "idle" });

  const vote = useCallback(
    async (next: readonly string[]) => {
      const current = client.getQueryData<PollRoom>(key);
      if (!current) return false;
      setSendState({ status: "sending" });
      await client.cancelQueries({ queryKey: key });
      client.setQueryData(key, withMyVotes(current, next));
      const r = await castVoteAction({ pollId, candidateIds: [...next] });
      if (!r.ok) {
        client.setQueryData(key, current);
        if (r.error === "closed" || r.error === "expired") {
          setSendState({ status: "idle" });
          void client.invalidateQueries({ queryKey: key });
          return false;
        }
        setSendState({ status: "failed", picks: [...next] });
        return false;
      }
      setSendState({ status: "idle" });
      if (next.length > 0) {
        track({
          name: "poll_voted",
          properties: { is_first_vote: r.isFirstVote },
        });
      }
      void client.invalidateQueries({ queryKey: key });
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pollId],
  );

  /* ---------- 방장, 제안 ---------- */

  const run = useCallback(
    async (fn: () => Promise<{ ok: boolean; error?: PollErrorCode }>) => {
      const r = await fn();
      void client.invalidateQueries({ queryKey: key });
      return r;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pollId],
  );

  const actions = useMemo(
    () => ({
      closeNow: () => run(() => closePollNowAction(pollId)),
      resolveTie: (candidateId: string | null) =>
        run(() => resolveTieAction({ pollId, candidateId })),
      cancel: () => run(() => cancelPollAction(pollId)),
      // 투표방 안 후보 넣기와 제안은 기준점 근처 장소 목록에서 고른다. 추천 수락률(source rec)에 섞이지 않게 map (T7.30)
      review: (candidateId: string, approve: boolean, placeId: string) =>
        run(async () => {
          const r = await reviewSuggestionAction({ candidateId, approve });
          if (r.ok && approve) {
            track({
              name: "poll_candidate_added",
              properties: { place_id: placeId, source: "map" },
            });
          }
          return r;
        }),
      add: (placeId: string, placeUrl: string | null, isHost: boolean) =>
        run(async () => {
          const r = await addCandidateAction({ pollId, placeId, placeUrl });
          if (r.ok && isHost) {
            track({
              name: "poll_candidate_added",
              properties: { place_id: placeId, source: "map" },
            });
          }
          return r;
        }),
    }),
    [pollId, run],
  );

  // poll_closed (PRD 10.2, North Star, T7.30): 마감, 취소된 방을 본 참여자 누구나 보고권을 청한다.
  // 서버(claim_poll_closed_report)가 방마다 처음 한 명에게만 claimed를 주고, 그 화면만 보낸다.
  // 크론이 마감해 방장이 화면을 열지 않아도 빠지지 않게 하려는 것이다. 이 세션에서는 방마다 한 번만 부른다.
  const claimedFor = useRef<string | null>(null);
  const status = room?.poll.status;
  useEffect(() => {
    if (!pollId || (status !== "closed" && status !== "canceled")) return;
    if (claimedFor.current === pollId) return;
    claimedFor.current = pollId;
    void claimPollClosedReportAction(pollId).then((r) => {
      if (!r.claimed) return;
      track({
        name: "poll_closed",
        properties: {
          reason: r.reason,
          participant_count: r.participantCount,
        },
      });
    });
  }, [pollId, status]);

  return {
    query,
    room,
    phase,
    live,
    incoming,
    reconnect,
    vote,
    sendState,
    clearSendFailure: () => setSendState({ status: "idle" }),
    actions,
    tick: () => setNowMs(Date.now()),
  };
}
