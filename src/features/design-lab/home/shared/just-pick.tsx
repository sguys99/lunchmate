"use client";
// "그냥 골라줘" 시안 (REC-12, T3.3): 고르기 상태 훅 + 결과 패널을 늦게 받는 자리.
//
// 흐름: 버튼 → pickByScore(점수 비례, rng 주입)로 결과를 먼저 정함 → 안별 연출(rolling) → 결과(result) → 닫기(closing → 없음).
// - 연출 안은 ?roulette=r1|r2|r3(비교 스위처 "골라줘")로 바꾸고, 생략하면 시안별 기본값(DEFAULT_ROULETTE).
// - r1 하이라이트 순회는 세 곳이 한 화면에 다 보이는 시안(C, D)에서는 화면의 카드 위에서 돌고(page),
//   한 장만 보이는 시안(A, B)에서는 패널 안 세 줄 목록에서 돈다(panel).
// - 건너뛰기: 연출 중 화면 어디든 누르거나 Esc, Enter, Space. 축소 모드면 연출 없이 바로 결과.
// - 결과가 나오면 onSettle(번호)로 시안 화면도 그 곳으로 옮겨 둔다(닫은 뒤 바로 그 카드가 보이게).
// - 결과 패널(just-pick-panel.tsx)은 처음 누를 때 받는다(React.lazy). 버튼에 손이나 포커스가 닿으면 미리 받는다.
//   Motion을 쓰지 않고 CSS 전환과 타이머만 쓴다(첫 로드 증가 0, 패널 청크만 추가).
// - 햅틱: 결과가 정해지는 순간 select. 타이머 안에서 부르지만 버튼을 누른 직후라 sticky user activation이 있다(T3.3 보고 참고).
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import type { MockPick } from "@/features/design-lab/mock";
import {
  highlightSchedule,
  settleMs,
  type HighlightStep,
  type RouletteMode,
} from "@/features/rec/roulette";
import { haptic } from "@/lib/haptics";
import { useMotionReduced } from "@/lib/motion";
import { pickByScore, seededRng, type Rng } from "@/lib/reco/pick-one";
import type { HomeVariantId } from "../types";
import { useHomeLabOptions } from "./lab-options-context";

const copy = designLabHomeCopy.screen.justPick;

/** 시안별 기본 연출. 이유는 T3.3 보고와 design-lab-home 문구 참고 */
export const DEFAULT_ROULETTE: Readonly<Record<HomeVariantId, RouletteMode>> = {
  a: "r2",
  b: "r2",
  c: "r1",
  d: "r1",
};

/** r1을 화면의 카드 위에서 돌릴 수 있는 시안(세 곳이 한 화면에 다 보임) */
const PAGE_HIGHLIGHT: Readonly<Record<HomeVariantId, boolean>> = {
  a: false,
  b: false,
  c: true,
  d: true,
};

export type JustPickPhase = "rolling" | "result" | "closing";

export type JustPickRun = {
  id: number;
  /** 이 결과를 낸 카드 세트(다시 뽑기 등으로 세트가 바뀌면 무효) */
  setKey: string;
  mode: RouletteMode;
  /** r1을 어디서 돌리는가. r2, r3은 항상 panel */
  stage: "page" | "panel";
  target: number;
  /** 연출이 시작하는 카드(지금 보고 있는 곳) */
  start: number;
  steps: HighlightStep[];
  phase: JustPickPhase;
};

export type JustPick = {
  mode: RouletteMode;
  run: JustPickRun | null;
  /** r1 연출 중 강조된 카드 번호. 아니면 null */
  cursor: number | null;
  /** r1이 마지막 칸에 닿았다(나머지가 물러난다) */
  landed: boolean;
  /** 화면 카드 위에서 r1이 돌고 있다(C, D 시안이 카드에 강조를 그린다) */
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
  variant,
  picks,
  onSettle,
}: {
  variant: HomeVariantId;
  picks: MockPick;
  onSettle?: (index: number) => void;
}): JustPick {
  const { roulette, seed } = useHomeLabOptions();
  const mode = roulette === "auto" ? DEFAULT_ROULETTE[variant] : roulette;
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

  const settle = useCallback(
    (r: JustPickRun) => {
      setRun({ ...r, phase: "result" });
      setCursor(null);
      setLanded(false);
      // 진동은 보조 신호. 제스처(건너뛰기, 축소 모드 누름) 안이거나, 누른 직후 시작한 연출이 끝난 순간
      haptic("select", { reduced });
      settleRef.current?.(r.target);
    },
    [reduced],
  );

  function start(from: number, exclude: number | null) {
    const target = pickByScore(
      picks.map((p) => p.score),
      rng,
      { exclude },
    );
    if (target < 0) return;
    const stage: JustPickRun["stage"] =
      mode === "r1" && PAGE_HIGHLIGHT[variant] ? "page" : "panel";
    const r: JustPickRun = {
      id: nextId.current++,
      setKey,
      mode,
      stage,
      target,
      start: from,
      steps: mode === "r1" ? highlightSchedule(picks.length, target, from) : [],
      phase: "rolling",
    };
    if (reduced) {
      settle(r);
      return;
    }
    setCursor(mode === "r1" ? from : null);
    setLanded(false);
    setRun(r);
  }

  // 연출 타이머: r1은 칸마다 강조를 옮기고, 모든 안은 settleMs에 결과로 넘어간다
  const rollingId = run?.phase === "rolling" ? run.id : null;
  useEffect(() => {
    if (rollingId === null || !run) return;
    const timers: number[] = [];
    if (run.mode === "r1") {
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
    }
    timers.push(
      window.setTimeout(() => settle(run), settleMs(run.mode, run.steps)),
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
    mode,
    run,
    cursor: run?.phase === "rolling" ? cursor : null,
    landed: run?.phase === "rolling" && landed,
    pageHighlight: run?.phase === "rolling" && run.stage === "page",
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

/**
 * 결과 패널 자리 + 스크린 리더 안내. 시안 화면 끝에 한 번 둔다.
 * 패널은 r1 page 연출 중에는 열지 않고(화면 카드가 무대), 그 밖에는 누르는 순간 연다.
 */
export function JustPickLayer({
  pick,
  picks,
}: {
  pick: JustPick;
  picks: MockPick;
}) {
  const { run } = pick;
  const announcement = !run
    ? ""
    : run.phase === "rolling"
      ? copy.picking
      : copy.announce(picks[run.target]?.name ?? "");
  const showPanel = run && !(run.phase === "rolling" && run.stage === "page");
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
            cursor={pick.cursor}
            landed={pick.landed}
            onSkip={pick.skip}
            onAgain={pick.again}
            onClose={pick.close}
          />
        </Suspense>
      ) : null}
    </>
  );
}
