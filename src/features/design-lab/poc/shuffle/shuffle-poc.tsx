"use client";
// PoC 3: 다시 뽑기 셔플 (T2.13, REC "다시 뽑기").
//
// - 순서: 지금 세 장이 함께 흐려진다(exit 프리셋, fast) → 새 세 장이 위에서부터 revealDelay(i) 간격으로 나타난다(reveal, slow).
//   AnimatePresence mode="wait"라 나가는 것과 들어오는 것이 겹치지 않는다. 한 순간에 움직이는 효과는 하나뿐이다
//   (홈 첫 화면 동시 효과 2개 이하, tasks.md 2.4절). 버튼 눌림(scale 0.98)은 손 아래 반응이라 세지 않는다.
// - 카드가 좌우로 섞이거나 뒤집히는 연출은 넣지 않는다. Quiet Stone "느린 페이드"와 결정 속도(10초)를 우선한다.
// - 축소 모드: 프리셋이 즉시 전환이라 새 세 장으로 바로 바뀐다. 바뀐 사실은 aria-live로 알린다.
// - 다시 뽑기 직후 포커스는 버튼에 남는다(목록으로 옮기지 않는다). 다시 누르기 쉽고 스크린 리더는 안내 문장으로 안다.
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { designLabPocCopy } from "@/copy/design-lab-poc";
import { MOCK_HOME_ALL_SETS } from "@/features/design-lab/mock";
import { revealDelay, useMotionPreset, useMotionReduced } from "@/lib/motion";
import { PocCard } from "../poc-card";

const copy = designLabPocCopy.shuffle;

export function ShufflePoc() {
  const [round, setRound] = useState(0);
  const [announce, setAnnounce] = useState("");
  const leave = useMotionPreset("exit");
  const reveal = useMotionPreset("reveal");
  const reduced = useMotionReduced();
  const picks =
    MOCK_HOME_ALL_SETS[round % MOCK_HOME_ALL_SETS.length] ??
    MOCK_HOME_ALL_SETS[0]!;

  function reroll() {
    const next = round + 1;
    setRound(next);
    setAnnounce(copy.rerolled((next % MOCK_HOME_ALL_SETS.length) + 1));
  }

  return (
    <section className="mt-auto flex flex-col gap-6 pt-10">
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
      <AnimatePresence mode="wait" initial={false}>
        <m.ol
          key={round}
          aria-label={copy.listLabel}
          initial="hidden"
          animate="shown"
          exit="leaving"
          variants={{
            hidden: {},
            shown: {},
            leaving: { ...leave.exit, transition: leave.transition },
          }}
          className="flex flex-col gap-3"
        >
          {picks.map((p, i) => (
            <m.li
              key={p.id}
              variants={{
                hidden: { ...reveal.initial },
                shown: {
                  ...reveal.animate,
                  transition: {
                    ...(reveal.transition as object),
                    delay: round === 0 || reduced ? 0 : revealDelay(i),
                  },
                },
              }}
            >
              <PocCard place={p} compact />
            </m.li>
          ))}
        </m.ol>
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3">
        <p className="type-caption text-muted-foreground tabular-nums">
          {copy.round((round % MOCK_HOME_ALL_SETS.length) + 1)}
        </p>
        <Button onClick={reroll} className="pr-5 pl-4">
          <RotateCcw aria-hidden className="size-4" strokeWidth={1.5} />
          {copy.reroll}
        </Button>
      </div>
    </section>
  );
}
