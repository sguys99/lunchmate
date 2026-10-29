"use client";
// 다시 뽑기 셔플 (T3.1, D-02 채택안): 지금 묶음이 fast로 흐려진 뒤(exit) 새 묶음의 블록이 slow로 순서대로 나타난다(reveal).
// AnimatePresence mode="wait"라 나가는 것과 들어오는 것이 겹치지 않는다. 한 순간에 움직이는 효과는 하나다.
//
// 첫 화면(round 0)은 Motion을 쓰지 않는다(D-04): AnimatePresence initial={false}로 Motion 등장을 막고,
// CSS 페이드(tw-animate-css animate-in, duration과 easing은 토큰 변수)로 한 번 나타난다. OS 축소 모드면 motion-safe로 꺼진다.
//
// 블록 순차 등장: ShuffleBlock이 RevealContext를 읽는다. 다시 뽑기 직후 처음 마운트될 때만 나타나는 모션을 쓰고,
// 같은 회차 안에서 카드를 넘겨 새로 마운트되는 블록은 시안이 RevealProvider로 꺼서 바로 보이게 한다.
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { createContext, useContext, useState, type ReactNode } from "react";
import { revealDelay, tweenOf, useMotionReduced } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** 첫 화면 CSS 등장. 같은 길이(slow)와 곡선(enter) 토큰을 쓴다 */
export const firstEntranceClass =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-slow)] motion-safe:[animation-timing-function:var(--lm-ease-enter)]";

const RevealContext = createContext(false);

/** 이 안의 ShuffleBlock이 마운트될 때 순차 등장할지. 시안이 덮어쓴다 */
export function RevealProvider({
  value,
  children,
}: {
  value: boolean;
  children: ReactNode;
}) {
  return <RevealContext value={value}>{children}</RevealContext>;
}

export function useRevealing(): boolean {
  return useContext(RevealContext);
}

export function ShuffleSwap({
  round,
  children,
  className,
}: {
  round: number;
  children: ReactNode;
  className?: string;
}) {
  const reduced = useMotionReduced();
  const exit = reduced ? { duration: 0 } : tweenOf("fast", "exit");
  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={round}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: exit }}
        className={cn(round === 0 && firstEntranceClass, className)}
      >
        <RevealProvider value={round > 0}>{children}</RevealProvider>
      </m.div>
    </AnimatePresence>
  );
}

/** 다시 뽑기 뒤 i번째로 나타나는 블록 (식당명 0, 숫자 1, 이유 2 ...) */
export function ShuffleBlock({
  index,
  className,
  children,
  as = "div",
}: {
  index: number;
  className?: string;
  children: ReactNode;
  as?: "div" | "li";
}) {
  const revealing = useRevealing();
  const reduced = useMotionReduced();
  // 마운트 순간의 값만 쓴다. 나중에 값이 바뀌어도 요소를 다시 만들지 않는다.
  const [animateIn] = useState(revealing && !reduced);
  const Comp = as === "li" ? m.li : m.div;
  return (
    <Comp
      initial={animateIn ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ ...tweenOf("slow", "enter"), delay: revealDelay(index) }}
      className={className}
    >
      {children}
    </Comp>
  );
}
