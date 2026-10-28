"use client";
/**
 * 단어 단위 페이드 (T2.13 랜딩 효과 후보 A). 랜딩 첫 문장, 확정 축하 한 줄처럼 세리프 display 한 줄에 쓴다.
 *
 * 출처: Motion Primitives `TextEffect` (per="word", preset="fade-in-blur")
 *   https://github.com/ibelick/motion-primitives/blob/120f64f6ca60348e251f929e9c81f11ccbe45eda/components/core/text-effect.tsx
 * 라이선스: MIT License, Copyright (c) 2024 ibelick
 *   https://github.com/ibelick/motion-primitives/blob/main/LICENCE.md
 *   (전문: Permission is hereby granted, free of charge, to any person obtaining a copy of this software ...
 *    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.)
 *
 * 원본에서 바꾼 것
 * - `motion.*` → `m.*` (LazyMotion strict 호환, domAnimation만으로 동작. variants, AnimatePresence 제거)
 * - 글자, 줄 단위와 프리셋 5종 → 단어 단위 하나. 한글은 글자 단위로 쪼개면 자모가 흩어져 보여 단어(어절)만 남겼다.
 * - 타이밍은 DESIGN.md 모션 토큰: 단어마다 slow 300ms 감속(enter), 간격 stagger 70ms. 원본 기본값(0.3s, 0.05s)과 비슷하다.
 * - 움직임을 줄였다: y 20px → 8px(MOTION_OFFSET_PX), blur 12px → 4px. 오버슈트 없음.
 * - 축소 모드(useMotionReduced)면 쪼개지 않은 정적 텍스트를 그린다.
 * - 띄어쓰기는 span이 아니라 텍스트 노드로 남겨 줄바꿈과 text-wrap: balance가 그대로 동작한다.
 * - 접근성: 원본처럼 전체 문장을 sr-only로 한 번 두고 쪼갠 단어는 aria-hidden.
 */
import * as m from "motion/react-m";
import { Fragment, type ElementType } from "react";
import {
  MOTION_OFFSET_PX,
  staggerOf,
  tweenOf,
  useMotionReduced,
} from "@/lib/motion";

const TAGS = { h1: "h1", h2: "h2", p: "p", span: "span" } as const;
type Tag = keyof typeof TAGS;

export type WordFadeProps = {
  text: string;
  as?: Tag;
  className?: string;
  /** 첫 단어가 시작하기 전 기다리는 초. */
  delay?: number;
  /** 흐림을 끄면 opacity와 8px 이동만 남는다(저사양 기기용 비교). */
  blur?: boolean;
};

const BLUR = "blur(4px)";
const SHARP = "blur(0px)";

export function WordFade({
  text,
  as = "p",
  className,
  delay = 0,
  blur = true,
}: WordFadeProps) {
  const reduced = useMotionReduced();
  const Component: ElementType = TAGS[as];

  if (reduced) return <Component className={className}>{text}</Component>;

  const words = text.split(/\s+/).filter(Boolean);
  const step = staggerOf();
  const base = tweenOf("slow", "enter");

  return (
    <Component className={className}>
      <span className="sr-only">{text}</span>
      {words.map((word, i) => (
        <Fragment key={`${i}-${word}`}>
          {i > 0 ? " " : null}
          <m.span
            aria-hidden
            className="inline-block will-change-[opacity,transform]"
            initial={{
              opacity: 0,
              y: MOTION_OFFSET_PX,
              ...(blur ? { filter: BLUR } : {}),
            }}
            animate={{ opacity: 1, y: 0, ...(blur ? { filter: SHARP } : {}) }}
            transition={{ ...base, delay: delay + i * step }}
          >
            {word}
          </m.span>
        </Fragment>
      ))}
    </Component>
  );
}
