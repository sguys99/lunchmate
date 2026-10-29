"use client";
// 랜딩 B 다시 뽑기 모션 (T3.4). 첫 "다시 뽑기" 때만 React.lazy로 받는 덩어리다.
// 이 파일이 Motion(domAnimation)을 처음 끌고 오므로 랜딩 첫 로드에는 Motion이 없다(D-04: 상호작용 뒤에만 비동기).
// 순서는 PoC 셔플(D-02)과 같다: 지금 세 장이 함께 흐려지고(exit, fast) → 새 세 장이 70ms 간격으로 나타난다(reveal, slow).
// AnimatePresence mode="wait"라 한 순간에 움직이는 효과는 하나다. 축소 모드면 프리셋이 즉시 전환으로 바뀐다.
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import type { MockPick } from "@/features/design-lab/mock";
import {
  MotionProvider,
  revealDelay,
  useMotionPreset,
  useMotionReduced,
} from "@/lib/motion";
import { DemoCard } from "../shared/demo-card";

function List({
  round,
  picks,
  label,
}: {
  round: number;
  picks: MockPick;
  label: string;
}) {
  const leave = useMotionPreset("exit");
  const reveal = useMotionPreset("reveal");
  const reduced = useMotionReduced();
  return (
    <AnimatePresence mode="wait">
      <m.ol
        key={round}
        aria-label={label}
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
              hidden: { ...reveal.initial, y: reduced ? 0 : 8 },
              shown: {
                ...reveal.animate,
                y: 0,
                transition: {
                  ...(reveal.transition as object),
                  delay: reduced ? 0 : revealDelay(i),
                },
              },
            }}
          >
            <DemoCard place={p} />
          </m.li>
        ))}
      </m.ol>
    </AnimatePresence>
  );
}

export default function DemoMotionList(props: {
  round: number;
  picks: MockPick;
  label: string;
}) {
  return (
    <MotionProvider>
      <List {...props} />
    </MotionProvider>
  );
}
