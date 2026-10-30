"use client";
// 랜딩 데모: 예시 카드 3장 + 다시 뽑기 (T4.28, G3 선택안 B, DESIGN.md 5장 "랜딩").
// - 히어로가 데모다. 첫 묶음은 서버 HTML에 그려 둔다(LCP). 다시 뽑기는 CSS 전환(landing.css .lm-shuffle):
//   세 장이 함께 흐려지고(exit, fast) 새 세 장이 70ms 간격으로 떠오른다(reveal, slow). 축소 모드면 바로 바꾼다.
// - 첫 화면의 움직임은 다시 뽑기 아이콘 손짓(.lm-nudge) 하나뿐이다. Motion을 쓰지 않는다(D-06).
// - loading은 design-lab 확인 화면에서만 켠다(실제 랜딩은 정적 예시라 기다릴 데이터가 없다).
import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type AnimationEvent } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { commonCopy } from "@/copy/common";
import { landingCopy } from "@/copy/landing";
import { useMotionPreference } from "@/lib/motion/preference";
import { cn } from "@/lib/utils";
import { DemoCard, DemoCardSkeleton } from "./demo-card";
import { roundLabel, setIndex } from "./rounds";

const copy = landingCopy.demo;
const SETS = copy.sets;
/** 퇴장 애니메이션 끝 이벤트가 오지 않을 때(탭 숨김 등) 바꿔 끼우는 안전 시간. exit fast(180ms)보다 넉넉하게 */
const EXIT_FALLBACK_MS = 400;
const HEADING_ID = "landing-demo";

type Shuffle = "idle" | "leaving" | "entering";

export function DemoSection({
  loading = false,
  className,
}: {
  loading?: boolean;
  className?: string;
}) {
  const preference = useMotionPreference();
  /** 누른 횟수(계속 커진다). 묶음은 setIndex로 돌린다. 0일 때만 첫 화면 손짓을 보인다 */
  const [round, setRound] = useState(0);
  const [shuffle, setShuffle] = useState<Shuffle>("idle");
  const [announce, setAnnounce] = useState("");
  const fallback = useRef<number | null>(null);
  const picks = SETS[setIndex(round, SETS.length)] ?? SETS[0]!;

  useEffect(
    () => () => {
      if (fallback.current !== null) window.clearTimeout(fallback.current);
    },
    [],
  );

  function show(next: number, nextShuffle: Shuffle) {
    if (fallback.current !== null) window.clearTimeout(fallback.current);
    fallback.current = null;
    setRound(next);
    setShuffle(nextShuffle);
    setAnnounce(copy.rerolled(setIndex(next, SETS.length) + 1));
  }

  function reroll() {
    if (loading || shuffle === "leaving") return;
    const next = round + 1;
    const reduced =
      preference === "reduce" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      show(next, "idle");
      return;
    }
    setShuffle("leaving");
    fallback.current = window.setTimeout(
      () => show(next, "entering"),
      EXIT_FALLBACK_MS,
    );
  }

  // 퇴장은 세 장이 함께 끝나므로 아무 한 장의 끝 이벤트에서 새 묶음으로 바꾼다
  function onListAnimationEnd(e: AnimationEvent<HTMLOListElement>) {
    if (shuffle === "leaving" && e.animationName === "lm-shuffle-exit") {
      show(round + 1, "entering");
    }
  }

  return (
    <section
      aria-labelledby={HEADING_ID}
      className={cn("flex flex-col gap-4", className)}
    >
      <div className="flex items-baseline justify-between">
        <h2 id={HEADING_ID} className="type-caption text-muted-foreground">
          {copy.caption}
        </h2>
        <span className="type-caption text-muted-foreground tabular-nums">
          {roundLabel(round, SETS.length)}
        </span>
      </div>

      <p aria-live="polite" className="sr-only">
        {announce}
      </p>

      {loading ? (
        <div
          aria-busy
          aria-label={copy.loading}
          role="status"
          className="flex flex-col gap-3"
        >
          <span className="sr-only">{commonCopy.states.loading.label}</span>
          <DemoCardSkeleton />
          <DemoCardSkeleton />
          <DemoCardSkeleton />
        </div>
      ) : (
        <ol
          key={round}
          aria-label={copy.label}
          data-shuffle={shuffle}
          onAnimationEnd={onListAnimationEnd}
          className="lm-shuffle flex flex-col gap-3"
        >
          {picks.map((p) => (
            <li key={p.id}>
              <DemoCard place={p} />
            </li>
          ))}
        </ol>
      )}

      <button
        type="button"
        onClick={reroll}
        aria-disabled={loading || undefined}
        className={cn(
          buttonClass("secondary"),
          "self-center pr-6 pl-5",
          loading && "pointer-events-none opacity-60",
        )}
      >
        <RotateCcw
          aria-hidden
          className={cn("size-4", round === 0 && !loading && "lm-nudge")}
          strokeWidth={1.5}
        />
        {copy.reroll}
      </button>
    </section>
  );
}
