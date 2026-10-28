"use client";
// PoC 4: 결정 축하 (T2.13, canvas-confetti 동적 import, POLL 확정).
//
// - celebrate()(src/lib/motion/celebrate.ts)가 모듈을 처음 누를 때 받는다. 확정 버튼에 포인터가 올라오거나
//   포커스가 가면 preloadCelebrate()로 미리 받아 첫 터짐이 늦지 않게 한다.
// - 조각은 누른 버튼 자리에서 피어난다. 색은 지금 테마의 토큰(--primary, --chart-2/3/5)을 읽어 쓴다.
// - 축소 모드: 모듈도 받지 않는다. 문장 전환(reveal 프리셋, 축소면 즉시)만으로 결정을 알린다.
// - 확정 문장은 role="status"라 스크린 리더가 읽는다. 조각은 장식이라 읽을 것이 없다.
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { designLabPocCopy } from "@/copy/design-lab-poc";
import { MOCK_POLL, getMockPlace } from "@/features/design-lab/mock";
import { useMotionPreset, useMotionReduced } from "@/lib/motion";
import {
  celebrate,
  originOf,
  preloadCelebrate,
  type CelebrateResult,
} from "@/lib/motion/celebrate";
import { cn } from "@/lib/utils";

const copy = designLabPocCopy.celebrate;
const candidates = [...MOCK_POLL.candidates]
  .sort((a, b) => b.votes - a.votes)
  .slice(0, 3)
  .map((c) => ({ ...c, place: getMockPlace(c.placeId) }));
const maxVotes = Math.max(...candidates.map((c) => c.votes), 1);

export function CelebratePoc() {
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<CelebrateResult | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const reduced = useMotionReduced();
  const reveal = useMotionPreset("reveal");
  const winner = candidates[0]!;

  function preload() {
    if (!reduced) void preloadCelebrate();
  }

  async function confirm() {
    const origin = originOf(buttonRef.current);
    setConfirmed(true);
    setResult(await celebrate({ reduced, origin }));
  }

  return (
    <section className="mt-auto flex flex-col gap-8 pt-10">
      <div className="flex flex-col gap-6 rounded-card border border-border bg-card p-7 @max-[23.75rem]/screen:p-5">
        <div className="flex flex-col gap-2">
          <p className="type-caption text-muted-foreground">
            {MOCK_POLL.title}
          </p>
          <div role="status" className="min-h-[3.75rem]">
            <AnimatePresence mode="wait" initial={false}>
              <m.p
                key={confirmed ? "done" : "pending"}
                {...reveal}
                className={cn(
                  "type-title text-balance break-keep",
                  !confirmed && "text-muted-foreground",
                )}
              >
                {confirmed ? copy.confirmed : copy.pending}
              </m.p>
            </AnimatePresence>
          </div>
        </div>

        <ol className="flex flex-col gap-4">
          {candidates.map((c, i) => (
            <li key={c.placeId} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={cn(
                    "type-body",
                    i === 0 ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {c.place.name}
                </span>
                <span className="type-label text-muted-foreground tabular-nums">
                  {copy.votes(c.votes)}
                </span>
              </div>
              <div
                aria-hidden
                className="h-1.5 overflow-hidden rounded-full bg-vote-bar-track"
              >
                <div
                  className={cn(
                    "h-full rounded-full",
                    i === 0 ? "bg-vote-bar" : "bg-muted-foreground/40",
                  )}
                  style={{ width: `${(c.votes / maxVotes) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>

        {/* 같은 버튼 요소를 유지해 확정 뒤에도 포커스가 버튼에 남는다 */}
        <Button
          ref={buttonRef}
          variant={confirmed ? "secondary" : "primary"}
          aria-label={confirmed ? undefined : copy.confirmTo(winner.place.name)}
          onPointerEnter={confirmed ? undefined : preload}
          onFocus={confirmed ? undefined : preload}
          onClick={() => {
            if (!confirmed) {
              void confirm();
              return;
            }
            setConfirmed(false);
            setResult(null);
          }}
        >
          {confirmed ? copy.reset : copy.confirm}
        </Button>
      </div>

      <p className="min-h-5 type-caption text-muted-foreground">
        {result === "fired"
          ? copy.loaded
          : result === "skipped"
            ? copy.skipped
            : result === "unsupported"
              ? copy.unsupported
              : null}
      </p>
    </section>
  );
}
