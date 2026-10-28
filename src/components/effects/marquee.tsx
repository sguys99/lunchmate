"use client";
/**
 * 느린 마퀴 (T2.13 랜딩 효과 후보 C). 카테고리 일러스트가 한 줄로 천천히 흘러간다.
 *
 * 출처: Magic UI `Marquee`
 *   https://github.com/magicuidesign/magicui/blob/efe76fc5755eca1142dd4f74c1d6f0ace2887e3c/apps/www/registry/magicui/marquee.tsx
 * 라이선스: MIT License, Copyright (c) Magic UI
 *   https://github.com/magicuidesign/magicui/blob/main/LICENSE.md
 *   (전문: Permission is hereby granted, free of charge, to any person obtaining a copy of this software ...
 *    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.)
 *
 * 원본에서 바꾼 것
 * - CSS 키프레임(animate-marquee, globals.css에 키프레임 추가 필요) → Motion 모션 값. 트랙 하나에 같은 묶음 2벌을 두고
 *   x를 0%에서 -50%로 반복한다. m.div + useAnimationFrame이라 LazyMotion strict에서 domAnimation만으로 동작한다.
 * - 세로 방향, 반복 횟수(repeat 4) 옵션 제거. 2벌이면 끊김 없이 이어진다.
 * - 기본 속도 40s → 60s(Quiet Stone은 느리게). 손을 올리면 멈추고(원본 pauseOnHover), 화면 밖이면 계산하지 않는다.
 * - 5초 넘게 자동으로 움직이므로 멈춤 버튼을 둔다(WCAG 2.2.2). 라벨은 호출 측이 src/copy에서 넘긴다.
 * - 축소 모드면 움직이지 않고 한 벌만 줄바꿈해서 보여 준다.
 * - 하드코딩 색 없음. 양끝 흐림은 mask-image(색이 아니라 투명도)로 처리한다.
 */
import {
  useAnimationFrame,
  useInView,
  useMotionValue,
  useTransform,
} from "motion/react";
import * as m from "motion/react-m";
import { Pause, Play } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { focusRing } from "@/components/ui/interaction";
import { useMotionReduced } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type MarqueeProps = {
  children: ReactNode;
  /** 한 바퀴(묶음 하나가 지나가는 시간) 초. */
  duration?: number;
  /** 영역 이름(스크린 리더). 내용 자체는 장식이라 숨긴다. */
  label: string;
  pauseLabel: string;
  playLabel: string;
  className?: string;
};

export function Marquee({
  children,
  duration = 60,
  label,
  pauseLabel,
  playLabel,
  className,
}: MarqueeProps) {
  const reduced = useMotionReduced();
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref);
  const [hovered, setHovered] = useState(false);
  const [paused, setPaused] = useState(false);
  const progress = useMotionValue(0);
  const x = useTransform(progress, (p) => `${-50 * p}%`);

  useAnimationFrame((_, delta) => {
    if (reduced || paused || hovered || !visible) return;
    progress.set((progress.get() + delta / 1000 / duration) % 1);
  });

  if (reduced) {
    return (
      <div
        role="group"
        aria-label={label}
        className={cn("flex flex-wrap gap-10", className)}
      >
        <div aria-hidden className="contents">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      className={cn("relative flex items-center gap-2", className)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div
        aria-hidden
        className="min-w-0 flex-1 overflow-hidden mask-x-from-85% mask-x-to-100%"
      >
        <m.div className="flex w-max" style={{ x }}>
          {[0, 1].map((copy) => (
            // 묶음 끝 여백(pr-10)을 항목 간격(gap-10)과 같게 둬 이음매가 보이지 않는다.
            <div key={copy} className="flex shrink-0 items-center gap-10 pr-10">
              {children}
            </div>
          ))}
        </m.div>
      </div>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? playLabel : pauseLabel}
        className={cn(
          "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-(--lm-duration-fast) hover:bg-muted hover:text-foreground",
          focusRing,
        )}
      >
        {paused ? (
          <Play aria-hidden className="size-4" strokeWidth={1.5} />
        ) : (
          <Pause aria-hidden className="size-4" strokeWidth={1.5} />
        )}
      </button>
    </div>
  );
}
