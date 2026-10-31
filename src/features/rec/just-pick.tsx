"use client";
// "그냥 골라줘" (REC-12, T5.22, G3 D-05 R1): 고르기 상태 훅 + 결과 패널을 늦게 받는 자리.
// 디자인 랩 D1(features/design-lab/home/shared/just-pick.tsx)을 실제 묶음(TodayCard)으로 옮겼다.
//
// 흐름: 버튼 → pickByScore(점수 비례)로 결과를 먼저 정함 → R1 하이라이트 순회(rolling) → 결과(result) → 닫기(closing → 없음).
// - R1은 화면의 큰 카드와 대안 카드 위에서 돈다. 연출 중에는 결과 패널을 열지 않는다.
// - 다시 고르기는 직전 결과를 빼고 남은 곳에서 점수 비례로 고른다(G3 안건 3).
// - 건너뛰기: 연출 중 화면 어디든 누르거나 Esc, Enter, Space, 또는 같은 자리의 "바로 보기". 축소 모드면 연출 없이 바로 결과.
// - 결과가 나오면 onSettle(번호)로 화면도 그 곳으로 옮겨 둔다(닫은 뒤 바로 그 카드, 데스크톱 지도 핀도 따라감).
// - 결과 패널(just-pick-panel.tsx)은 처음 누를 때 받는다(React.lazy). 버튼에 손이나 포커스가 닿으면 미리 받는다.
//   Motion을 쓰지 않고 CSS 전환과 타이머만 쓴다(홈 첫 로드 증가 0).
// - 햅틱: 누르는 순간 tap, 연출 중 눌러 건너뛰면 select. 타이머 안에서는 진동하지 않는다(src/lib/haptics 규칙).
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { homeCopy } from "@/copy/home";
import { haptic } from "@/lib/haptics";
import { pickByScore } from "@/lib/reco/pick-one";
import type { TodayCard } from "./card-model";
import {
  highlightSchedule,
  highlightSettleMs,
  type HighlightStep,
} from "./roulette";
import type { JustPickPanelProps } from "./just-pick-panel";

const copy = homeCopy.today.justPick;

export type JustPickPhase = "rolling" | "result" | "closing";

export type JustPickRun = {
  id: number;
  /** 이 결과를 낸 묶음(다시 뽑기 등으로 묶음이 바뀌면 무효) */
  setKey: string;
  target: number;
  start: number;
  steps: HighlightStep[];
  phase: JustPickPhase;
};

export type JustPick = {
  run: JustPickRun | null;
  /** 연출 중 강조된 카드 번호(묶음 안 번호). 아니면 null */
  cursor: number | null;
  /** 순회가 마지막 칸에 닿았다(나머지가 물러난다) */
  landed: boolean;
  /** 화면 카드 위에서 순회가 돌고 있다 */
  rolling: boolean;
  begin: (trigger: HTMLElement | null, from?: number) => void;
  skip: () => void;
  again: () => void;
  close: () => void;
  prefetch: () => void;
};

const loadPanel = () => import("./just-pick-panel");
const JustPickPanel = lazy(loadPanel);

const CLOSE_MS = 180;
/** 건너뛴 직후 이만큼은 닫기를 받지 않는다(ms) */
const SKIP_GUARD_MS = 400;

export function deckKey(cards: readonly TodayCard[]): string {
  return cards.map((c) => c.id).join("|");
}

export function useJustPick({
  cards,
  reduced,
  onPicked,
  onSettle,
}: {
  cards: readonly TodayCard[];
  /** 축소 모드(OS 또는 앱 설정) */
  reduced: boolean;
  /** 결과가 정해지는 순간(분석 이벤트 자리) */
  onPicked?: (card: TodayCard) => void;
  onSettle?: (index: number) => void;
}): JustPick {
  const [rawRun, setRun] = useState<JustPickRun | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [landed, setLanded] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  const nextId = useRef(1);
  const settleRef = useRef(onSettle);
  useEffect(() => {
    settleRef.current = onSettle;
  });

  const setKey = deckKey(cards);
  const run = rawRun && rawRun.setKey === setKey ? rawRun : null;

  const settle = useCallback((r: JustPickRun) => {
    setRun({ ...r, phase: "result" });
    setCursor(null);
    setLanded(false);
    settleRef.current?.(r.target);
  }, []);

  function start(from: number, exclude: number | null) {
    const target = pickByScore(
      cards.map((c) => c.score),
      Math.random,
      { exclude },
    );
    const card = cards[target];
    if (target < 0 || !card) return;
    haptic("tap");
    onPicked?.(card);
    const r: JustPickRun = {
      id: nextId.current++,
      setKey,
      target,
      start: from,
      steps: highlightSchedule(cards.length, target, from),
      phase: "rolling",
    };
    if (reduced || cards.length < 2) {
      settle(r);
      return;
    }
    setCursor(from);
    setLanded(false);
    setRun(r);
  }

  // 연출 타이머: 칸마다 강조를 옮기고, 마지막 칸 + 머묾 뒤 결과로 넘어간다
  const rollingId = run?.phase === "rolling" ? run.id : null;
  useEffect(() => {
    if (rollingId === null || !run) return;
    const timers: number[] = [];
    const last = run.steps.length - 1;
    run.steps.forEach((s, k) => {
      if (k === 0) return;
      timers.push(
        window.setTimeout(() => {
          setCursor(s.index);
          if (k === last) setLanded(true);
        }, s.atMs),
      );
    });
    timers.push(
      window.setTimeout(() => settle(run), highlightSettleMs(run.steps)),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
    // run은 rollingId가 같으면 같은 값이다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollingId, settle]);

  /** 건너뛴 시각. 건너뛴 그 누름이 이어서 딤 클릭(닫기)으로 읽히지 않게 한다 */
  const skippedAt = useRef(0);
  const skip = useCallback(() => {
    if (run?.phase !== "rolling") return;
    skippedAt.current = performance.now();
    haptic("select");
    settle(run);
  }, [run, settle]);

  // 연출 중 건너뛰기: 화면 어디든 누르기, Esc, Enter, Space
  useEffect(() => {
    if (rollingId === null) return;
    function onPointerDown() {
      skip();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        skip();
      }
    }
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [rollingId, skip]);

  // 닫힘 전환(fast) 뒤 정리하고 포커스를 버튼으로 돌려준다
  const closingId = run?.phase === "closing" ? run.id : null;
  useEffect(() => {
    if (closingId === null) return;
    const t = window.setTimeout(() => {
      setRun(null);
      trigger.current?.focus();
    }, CLOSE_MS);
    return () => window.clearTimeout(t);
  }, [closingId]);

  return {
    run,
    cursor: run?.phase === "rolling" ? cursor : null,
    landed: run?.phase === "rolling" && landed,
    rolling: run?.phase === "rolling",
    begin: (el, from = 0) => {
      if (run) return;
      trigger.current = el;
      void loadPanel();
      start(from, null);
    },
    skip,
    again: () => {
      if (run?.phase !== "result") return;
      start(run.target, run.target);
    },
    close: () => {
      if (!run || run.phase === "closing") return;
      if (performance.now() - skippedAt.current < SKIP_GUARD_MS) return;
      if (reduced) {
        setRun(null);
        trigger.current?.focus();
        return;
      }
      setRun({ ...run, phase: "closing" });
    },
    prefetch: () => void loadPanel(),
  };
}

/** 결과 패널 자리 + 스크린 리더 안내. 화면 끝에 한 번 둔다 */
export function JustPickLayer({
  pick,
  cards,
  reduced,
  onDirections,
}: {
  pick: JustPick;
  cards: readonly TodayCard[];
  reduced: boolean;
  onDirections?: JustPickPanelProps["onDirections"];
}) {
  const { run } = pick;
  const announcement = !run
    ? ""
    : run.phase === "rolling"
      ? copy.picking
      : copy.announce(cards[run.target]?.name ?? "");
  const card = run ? cards[run.target] : undefined;
  return (
    <>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {run && card && run.phase !== "rolling" ? (
        <Suspense fallback={null}>
          <JustPickPanel
            key={run.id}
            phase={run.phase}
            card={card}
            reduced={reduced}
            onAgain={pick.again}
            onClose={pick.close}
            onDirections={onDirections}
          />
        </Suspense>
      ) : null}
    </>
  );
}
