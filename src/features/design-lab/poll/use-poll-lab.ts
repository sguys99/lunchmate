"use client";
// 투표방 시안 상태 (T7.1). 세 안이 같은 상태 기계를 쓰고 그리는 방식만 다르다.
// 단계: vote(진행 중) → [마감 또는 방장 결정] → tie(동점) → rolling(룰렛) → result(확정).
// 실제 구현에서는 득표가 Supabase Realtime으로 오고 마감은 서버 판정(T7.9)이다. 여기서는 로컬 상태로 흉내만 낸다.
import { useEffect, useMemo, useRef, useState } from "react";
import { pollLabCopy as copy } from "@/copy/design-lab-poll";
import { withObject } from "@/features/rec/why";
import { useMotionReduced } from "@/lib/motion";
import {
  CANDIDATES,
  LATECOMER,
  POLL_REMAINING_MS,
  SUGGESTION,
  leaders,
  rouletteSteps,
  scenarioFor,
  tally,
  type Ballots,
  type PollCandidate,
  type PollPerson,
} from "./mock";
import { isVoteFail, type PollParams } from "./params";

export type PollPhase = "vote" | "tie" | "rolling" | "result";
export type ResolvedBy = "time" | "host" | "roulette";
export type SuggestionState = "pending" | "sent" | "approved" | "rejected";

export function usePollLab(p: PollParams) {
  const reduced = useMotionReduced();
  const start = useMemo(() => scenarioFor(p), [p]);

  const [people, setPeople] = useState<readonly PollPerson[]>(start.people);
  const [others, setOthers] = useState<Ballots>(start.others);
  const [mine, setMine] = useState<readonly number[] | null>(start.mine);
  const [picks, setPicks] = useState<readonly number[]>(start.mine ?? []);
  const [phase, setPhase] = useState<PollPhase>(
    p.flow === "tie"
      ? "tie"
      : p.flow === "closing" || p.flow === "result"
        ? "result"
        : "vote",
  );
  const [entering, setEntering] = useState(p.flow === "closing");
  const [winner, setWinner] = useState<number | null>(
    p.flow === "closing" || p.flow === "result" ? 0 : null,
  );
  const [resolvedBy, setResolvedBy] = useState<ResolvedBy>("time");
  const [rollingAt, setRollingAt] = useState<number | null>(null);
  const [decideOpen, setDecideOpen] = useState(false);
  const [sendFailed, setSendFailed] = useState(isVoteFail(p));
  const [suggestion, setSuggestion] = useState<SuggestionState | null>(
    p.suggest ? (p.role === "host" ? "pending" : "sent") : null,
  );
  const [announce, setAnnounce] = useState("");
  const [incoming, setIncoming] = useState<string | null>(null);
  // 마감 시각. 화면에 그리는 쪽(DeadlineCountdown, 시간 줄)은 1초 시계가 생긴 뒤에만 읽으므로
  // 서버 렌더 값과 달라도 하이드레이션이 어긋나지 않는다
  const [deadline] = useState<Date | null>(
    () => new Date(Date.now() + POLL_REMAINING_MS),
  );
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);

  // 확정 순간: 바가 차오르고 축하 한 줄이 뜬 뒤 결과 화면으로 가라앉는다
  useEffect(() => {
    if (!entering) return;
    const t = window.setTimeout(() => setEntering(false), reduced ? 0 : 1400);
    return () => window.clearTimeout(t);
  }, [entering, reduced]);

  // sim=on: 다른 사람의 표가 하나 들어온다(AC-POLL-1 시연)
  useEffect(() => {
    if (!p.sim || phase !== "vote") return;
    const t = window.setTimeout(() => {
      setPeople((list) =>
        list.some((x) => x.id === LATECOMER.id) ? list : [...list, LATECOMER],
      );
      setOthers((b) => ({ ...b, [LATECOMER.id]: [1] }));
      setIncoming(copy.live.incoming(LATECOMER.nick));
    }, 1600);
    return () => window.clearTimeout(t);
  }, [p.sim, phase]);

  const candidates: readonly PollCandidate[] =
    suggestion === "approved"
      ? [...CANDIDATES, { place: SUGGESTION.place, badges: [] }]
      : CANDIDATES;

  const votes = tally(candidates.length, others, mine);
  const top = leaders(votes);
  const voters = Object.keys(others).length + (mine ? 1 : 0);
  const isGuest = p.role === "guest";
  const offline = p.state === "offline";
  const canVote = phase === "vote" && !isGuest && !offline;

  const toggle = (i: number) => {
    if (!canVote || mine) return;
    setSendFailed(false);
    setPicks((cur) =>
      p.multi
        ? cur.includes(i)
          ? cur.filter((x) => x !== i)
          : [...cur, i]
        : cur[0] === i
          ? cur
          : [i],
    );
  };

  const submit = () => {
    if (!canVote || picks.length === 0) return;
    setMine(picks);
    setSendFailed(false);
    setAnnounce(copy.voted.done);
  };

  const change = () => {
    if (!mine) return;
    setPicks(mine);
    setMine(null);
    setAnnounce("");
  };

  const cancel = () => {
    setMine(null);
    setPicks([]);
    setAnnounce(copy.voted.canceled);
  };

  const close = (w: number, by: ResolvedBy) => {
    setWinner(w);
    setResolvedBy(by);
    setPhase("result");
    setEntering(true);
    setRollingAt(null);
    setAnnounce(
      `${copy.result.closedTitle}. ${copy.result.winner(candidates[w]?.place.name ?? "")}`,
    );
  };

  const confirmDecide = () => {
    setDecideOpen(false);
    if (top.length > 1) {
      setPhase("tie");
      return;
    }
    close(top[0] ?? 0, "host");
  };

  const pickTie = (i: number) => close(i, "host");

  const startRoulette = () => {
    const pool = phase === "tie" ? top : [];
    if (pool.length < 2) return;
    // 목업은 결과를 고정한다(실제는 서버가 정하고 화면은 결과를 향해 돈다)
    const landing = pool[0]!;
    if (reduced) {
      close(landing, "roulette");
      return;
    }
    setPhase("rolling");
    setAnnounce(copy.tie.rolling);
    const steps = rouletteSteps();
    const n = pool.length;
    // 마지막 칸이 landing에 멈추도록 시작 칸을 맞춘다
    const offset = (((pool.indexOf(landing) - (steps.length - 1)) % n) + n) % n;
    let t = 0;
    steps.forEach((gap, k) => {
      t += gap;
      const at = pool[(k + offset) % n]!;
      timers.current.push(window.setTimeout(() => setRollingAt(at), t));
    });
    timers.current.push(
      window.setTimeout(() => close(landing, "roulette"), t + 420),
    );
  };

  const approve = () => {
    setSuggestion("approved");
    setAnnounce(copy.suggest.approved(withObject(SUGGESTION.place.name)));
  };
  const reject = () => {
    setSuggestion("rejected");
    setAnnounce(copy.suggest.rejected);
  };
  const suggest = () => {
    setSuggestion("sent");
    setAnnounce(copy.suggest.sent);
  };

  const sendFail = () => {
    setSendFailed(true);
  };

  return {
    candidates,
    people,
    others,
    votes,
    top,
    voters,
    mine,
    picks,
    phase,
    entering,
    winner,
    resolvedBy,
    rollingAt,
    decideOpen,
    sendFailed,
    suggestion,
    announce,
    incoming,
    deadline,
    isGuest,
    offline,
    canVote,
    multi: p.multi,
    isHost: p.role === "host",
    toggle,
    submit,
    change,
    cancel,
    openDecide: () => setDecideOpen(true),
    closeDecide: () => setDecideOpen(false),
    confirmDecide,
    pickTie,
    startRoulette,
    approve,
    reject,
    suggest,
    sendFail,
    retrySend: () => {
      setSendFailed(false);
      submit();
    },
  };
}

export type PollLab = ReturnType<typeof usePollLab>;

/** 결과 목록 순서: 득표 많은 순, 같으면 원래 순서 */
export function rankOrder(votes: readonly number[]): number[] {
  return votes
    .map((v, i) => ({ v, i }))
    .sort((a, b) => b.v - a.v || a.i - b.i)
    .map((x) => x.i);
}
