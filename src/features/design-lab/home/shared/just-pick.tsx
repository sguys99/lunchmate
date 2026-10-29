"use client";
// "그냥 골라줘" (REC-12, G3 D-05): 고르기 상태 훅 + 결과 패널을 늦게 받는 자리.
//
// 흐름: 버튼 → pickByScore(점수 비례, rng 주입)로 결과를 먼저 정함 → R1 하이라이트 순회(rolling) → 결과(result) → 닫기(closing → 없음).
// - R1은 화면의 큰 카드와 대안 카드 위에서 돈다(세 곳이 한 화면에 다 보이는 D1). 연출 중에는 결과 패널을 열지 않는다.
// - 다시 고르기는 직전 결과를 빼고 남은 곳에서 점수 비례로 고른다(G3 안건 3, PRD REC-12).
// - 건너뛰기: 연출 중 화면 어디든 누르거나 Esc, Enter, Space. 축소 모드면 연출 없이 바로 결과.
// - 결과가 나오면 onSettle(번호)로 화면도 그 곳으로 옮겨 둔다(닫은 뒤 바로 그 카드가 보이게, 데스크톱 지도 핀도 따라감).
// - 결과 패널(just-pick-panel.tsx)은 처음 누를 때 받는다(React.lazy). 버튼에 손이나 포커스가 닿으면 미리 받는다.
//   Motion을 쓰지 않고 CSS 전환과 타이머만 쓴다(첫 로드 증가 0, 패널 청크만 추가).
// - 햅틱(src/lib/haptics 규칙 "타이머, 효과 안에서 부르지 않는다"):
//   누르는 순간(그냥 골라줘, 다시 고르기) tap. 연출이 끝나 결과가 정해지는 순간은 타이머라 진동하지 않는다(시각 전환과 status 안내가 알린다).
//   연출 중 사용자가 눌러 건너뛰면 그 누름 안에서 select.
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import type { MockPick, MockPlace } from "@/features/design-lab/mock";
import {
  highlightSchedule,
  highlightSettleMs,
  type HighlightStep,
} from "@/features/rec/roulette";
import { haptic } from "@/lib/haptics";
import { useMotionReduced } from "@/lib/motion";
import { pickByScore, seededRng, type Rng } from "@/lib/reco/pick-one";
import { useHomeLabOptions } from "./lab-options-context";

const copy = designLabHomeCopy.screen.justPick;

export type JustPickPhase = "rolling" | "result" | "closing";

export type JustPickRun = {
  id: number;
  /** 이 결과를 낸 카드 세트(다시 뽑기 등으로 세트가 바뀌면 무효) */
  setKey: string;
  target: number;
  /** 연출이 시작하는 카드(지금 보고 있는 곳) */
  start: number;
  steps: HighlightStep[];
  phase: JustPickPhase;
};

export type JustPick = {
  run: JustPickRun | null;
  /** 연출 중 강조된 카드 번호. 아니면 null */
  cursor: number | null;
  /** 순회가 마지막 칸에 닿았다(나머지가 물러난다) */
  landed: boolean;
  /** 화면 카드 위에서 순회가 돌고 있다(카드가 강조를 그린다, 버튼은 "바로 보기") */
  pageHighlight: boolean;
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

function keyOf(picks: MockPick): string {
  return picks.map((p) => p.id).join("|");
}

export function useJustPick({
  picks,
  onSettle,
}: {
  picks: MockPick;
  onSettle?: (index: number) => void;
}): JustPick {
  const { seed } = useHomeLabOptions();
  const reduced = useMotionReduced();

  const [rawRun, setRun] = useState<JustPickRun | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [landed, setLanded] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  const rngRef = useRef<{ seed: number | null; rng: Rng } | null>(null);
  const nextId = useRef(1);
  const settleRef = useRef(onSettle);
  useEffect(() => {
    settleRef.current = onSettle;
  });

  const setKey = keyOf(picks);
  // 다시 뽑기, 끼니, 기준 위치로 세트가 바뀌면 진행 중이던 고르기는 없던 일로 본다
  const run = rawRun && rawRun.setKey === setKey ? rawRun : null;

  function rng(): number {
    if (!rngRef.current || rngRef.current.seed !== seed) {
      rngRef.current = {
        seed,
        rng: seed === null ? Math.random : seededRng(seed),
      };
    }
    return rngRef.current.rng();
  }

  const settle = useCallback((r: JustPickRun) => {
    setRun({ ...r, phase: "result" });
    setCursor(null);
    setLanded(false);
    settleRef.current?.(r.target);
  }, []);

  function start(from: number, exclude: number | null) {
    const target = pickByScore(
      picks.map((p) => p.score),
      rng,
      { exclude },
    );
    if (target < 0) return;
    // 누르는 순간의 진동(제스처 핸들러 안). 축소 모드면 haptic이 스스로 건너뛴다
    haptic("tap", { reduced });
    const r: JustPickRun = {
      id: nextId.current++,
      setKey,
      target,
      start: from,
      steps: highlightSchedule(picks.length, target, from),
      phase: "rolling",
    };
    if (reduced) {
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
    // 건너뛰기는 사용자의 누름(pointerdown, keydown) 안에서 불린다. 결과 확정 진동은 이 경우에만
    haptic("select", { reduced });
    settle(run);
  }, [run, settle, reduced]);

  // 연출 중 건너뛰기: 화면 어디든 누르기, Esc, Enter, Space
  useEffect(() => {
    if (rollingId === null) return;
    function onPointerDown() {
      skip();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        // 같은 키가 결과 패널의 Esc(닫기)나 포커스된 버튼으로 이어지지 않게 여기서 끝낸다
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
    pageHighlight: run?.phase === "rolling",
    begin: (el, from = 0) => {
      if (run) return;
      trigger.current = el;
      void loadPanel();
      start(from, null);
    },
    skip,
    // 다시 고르기: 직전 결과에서 순회를 시작하고, 결과 후보에서는 직전 곳을 뺀다(G3 안건 3)
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

/**
 * 결과 패널 자리 + 스크린 리더 안내. 화면 끝에 한 번 둔다.
 * 패널은 연출 중에는 열지 않고(화면 카드가 무대) 결과가 정해지면 연다.
 */
export function JustPickLayer({
  pick,
  picks,
  formatReason,
}: {
  pick: JustPick;
  picks: MockPick;
  formatReason: (place: MockPlace) => string;
}) {
  const { run } = pick;
  const announcement = !run
    ? ""
    : run.phase === "rolling"
      ? copy.picking
      : copy.announce(picks[run.target]?.name ?? "");
  const showPanel = run && run.phase !== "rolling";
  return (
    <>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {showPanel ? (
        <Suspense fallback={null}>
          <JustPickPanel
            key={run.id}
            run={run}
            picks={picks}
            formatReason={formatReason}
            onAgain={pick.again}
            onClose={pick.close}
          />
        </Suspense>
      ) : null}
    </>
  );
}
