"use client";
/**
 * 블록 블러 페이드 (T2.13 랜딩 효과 후보 B). 랜딩 섹션, 결과 화면 블록이 화면에 들어올 때 한 번 나타난다.
 *
 * 출처: Magic UI `BlurFade`
 *   https://github.com/magicuidesign/magicui/blob/efe76fc5755eca1142dd4f74c1d6f0ace2887e3c/apps/www/registry/magicui/blur-fade.tsx
 * 라이선스: MIT License, Copyright (c) Magic UI
 *   https://github.com/magicuidesign/magicui/blob/main/LICENSE.md
 *   (전문: Permission is hereby granted, free of charge, to any person obtaining a copy of this software ...
 *    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.)
 *
 * 원본에서 바꾼 것
 * - `motion.div` → `m.div` (LazyMotion strict 호환). 외부 variant 주입, AnimatePresence, 방향 4종을 뺐다(아래에서 위로만).
 * - 타이밍은 DESIGN.md 토큰: slow 300ms 감속(enter). 원본은 0.4s easeOut으로 CLAUDE.md 상한(300ms)을 넘는다.
 * - 이동 6px → 8px(MOTION_OFFSET_PX), blur 6px → 4px.
 * - inView는 원본처럼 한 번만(once) 재생한다. 기본값은 원본과 같이 꺼짐(마운트 즉시 재생).
 * - 축소 모드(useMotionReduced)면 감싸는 div만 그린다(처음부터 보임).
 */
import { useInView } from "motion/react";
import * as m from "motion/react-m";
import { useRef, type ReactNode } from "react";
import { MOTION_OFFSET_PX, tweenOf, useMotionReduced } from "@/lib/motion";

export type BlurFadeProps = {
  children: ReactNode;
  className?: string;
  /** 시작 전 기다리는 초. 여러 블록은 revealDelay(i)를 넘기면 stagger 70ms 간격이 된다. */
  delay?: number;
  /** true면 화면에 들어올 때 재생한다(뷰포트 아래 60px 앞에서 시작). */
  inView?: boolean;
  /** 흐림을 끄면 opacity와 8px 이동만 남는다. */
  blur?: boolean;
};

export function BlurFade({
  children,
  className,
  delay = 0,
  inView = false,
  blur = true,
}: BlurFadeProps) {
  const reduced = useMotionReduced();
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -60px 0px" });
  const show = !inView || seen;

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <m.div
      ref={ref}
      className={className}
      initial={{
        opacity: 0,
        y: MOTION_OFFSET_PX,
        ...(blur ? { filter: "blur(4px)" } : {}),
      }}
      animate={
        show
          ? { opacity: 1, y: 0, ...(blur ? { filter: "blur(0px)" } : {}) }
          : undefined
      }
      transition={{ ...tweenOf("slow", "enter"), delay }}
    >
      {children}
    </m.div>
  );
}
