"use client";
// PoC 1: 스와이프 카드 스택 (T2.13, REC-04 바탕).
//
// - drag는 domMax가 필요하다. 이 영역만 <LazyMotion features={loadDomMax} strict>로 감싸 비동기로 받는다(T0.27).
// - 넘김 규칙과 키보드는 useSwipeStack(src/features/rec). 끌기, 화살표 키, 이전/다음 버튼이 같은 경로를 지난다.
// - 모션: spring-card 프리셋(크로스페이드 + 8px), 방향은 withDirection. 끌어서 넘긴 카드만 손을 따라 멀리 나간다.
// - 뒤에 깔린 카드 두 장은 남은 장수를 알려 주는 정적인 가장자리다(움직임은 앞 카드 하나만).
// - 축소 모드: drag를 끄고(버튼과 키만), 프리셋이 즉시 전환으로 바뀐다.
import { AnimatePresence, LazyMotion, type Variants } from "motion/react";
import * as m from "motion/react-m";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { designLabPocCopy } from "@/copy/design-lab-poc";
import { MOCK_HOME_TODAY, type MockPlace } from "@/features/design-lab/mock";
import { useSwipeStack } from "@/features/rec/use-swipe-stack";
import {
  loadDomMax,
  motionTokens,
  springOf,
  tweenOf,
  useMotionPreset,
  useMotionReduced,
  withDirection,
  type MotionPreset,
} from "@/lib/motion";
import { cn } from "@/lib/utils";
import { PocCard } from "../poc-card";

const copy = designLabPocCopy.swipe;
/** 끌어서 넘긴 카드가 나가는 거리(px). 화면 밖까지 날리지 않고 흐려지며 사라진다. */
const FLING_PX = 120;

const noop = () => () => {};
/** 하이드레이션이 끝났는지. 서버와 첫 클라이언트 렌더는 false라 속성이 같다. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

type ExitCustom = { direction: 1 | -1; dragged: boolean; reduced: boolean };

/** 프리셋 → Motion variants. exit은 나가는 순간의 방향과 끌기 여부(custom)로 정한다. */
function cardVariants(base: MotionPreset): Variants {
  return {
    initial: (c: ExitCustom) => ({
      ...withDirection(base, c.direction).initial,
    }),
    animate: { ...base.animate },
    exit: (c: ExitCustom) =>
      c.dragged && !c.reduced
        ? {
            x: -c.direction * FLING_PX,
            opacity: 0,
            transition: {
              x: springOf("swipe"),
              opacity: tweenOf("fast", "exit"),
            },
          }
        : { ...withDirection(base, c.direction).exit },
  };
}

export function SwipeStackPoc() {
  const places: readonly MockPlace[] = MOCK_HOME_TODAY;
  const stack = useSwipeStack(places.length, (i) =>
    copy.announce(i + 1, places.length, places[i]?.name ?? ""),
  );
  const reduced = useMotionReduced();
  const hydrated = useHydrated();
  const preset = useMotionPreset("spring-card");
  const place = places[stack.index] ?? places[0]!;
  const behind = Math.min(2, stack.total - 1 - stack.index);
  const custom: ExitCustom = {
    direction: stack.direction,
    dragged: stack.dragged,
    reduced,
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={copy.regionLabel}
      className="mt-auto flex flex-col gap-6 pt-12"
    >
      <p aria-live="polite" className="sr-only">
        {stack.announcement}
      </p>

      <LazyMotion features={loadDomMax} strict>
        <div
          tabIndex={0}
          onKeyDown={stack.onKeyDown}
          aria-describedby="swipe-hint"
          className="relative grid rounded-card outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          {/* 뒤에 남은 카드 가장자리. 앞 카드보다 좁고 아래로 조금씩 비친다 */}
          {[2, 1].map((depth) => (
            <div
              key={depth}
              aria-hidden
              className={cn(
                "absolute inset-0 rounded-card border border-border bg-card transition-[opacity,translate,scale] duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
                depth === 1
                  ? "translate-y-2.5 scale-x-[0.95]"
                  : "translate-y-5 scale-x-[0.9]",
                depth > behind && "translate-y-0 scale-x-100 opacity-0",
              )}
            />
          ))}

          <AnimatePresence initial={false} custom={custom}>
            <m.div
              key={place.id}
              role="group"
              aria-roledescription="slide"
              aria-label={copy.slide(stack.index + 1, stack.total)}
              custom={custom}
              variants={cardVariants(preset)}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={preset.transition}
              drag="x"
              // OS 축소 값은 클라이언트에서만 알아 첫 렌더는 서버와 같게 두고, 하이드레이션 뒤에 끌기 시작을 막는다.
              dragListener={!(hydrated && reduced)}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{
                left: stack.canNext ? 0.5 : 0.12,
                right: stack.canPrev ? 0.5 : 0.12,
              }}
              dragTransition={{
                bounceStiffness: motionTokens.spring.swipe.stiffness,
                bounceDamping: motionTokens.spring.swipe.damping,
              }}
              onDragEnd={stack.onDragEnd}
              className="relative col-start-1 row-start-1 cursor-grab touch-pan-y select-none active:cursor-grabbing"
            >
              <PocCard place={place} />
            </m.div>
          </AnimatePresence>
        </div>
      </LazyMotion>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p id="swipe-hint" className="type-caption text-muted-foreground">
          {copy.hint}
        </p>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            aria-label={copy.previous}
            disabled={!stack.canPrev}
            focusableWhenDisabled
            onClick={stack.prev}
          >
            <ChevronLeft aria-hidden strokeWidth={1.5} />
          </Button>
          <p
            aria-hidden
            className="w-12 text-center type-label text-muted-foreground tabular-nums"
          >
            <span className="text-foreground">{stack.index + 1}</span>
            {` / ${stack.total}`}
          </p>
          <Button
            size="icon"
            aria-label={copy.next}
            disabled={!stack.canNext}
            focusableWhenDisabled
            onClick={stack.next}
          >
            <ChevronRight aria-hidden strokeWidth={1.5} />
          </Button>
        </div>
      </div>
    </section>
  );
}
