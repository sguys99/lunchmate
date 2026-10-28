/**
 * 모션 프리셋 (T2.11). DESIGN.md 7절 "숨을 고르듯 느리게 나타나고, 멈출 때 튀지 않습니다."
 *
 * - 값은 직접 쓰지 않는다. duration, easing, spring은 `pnpm tokens`가 DESIGN.md에서 만든
 *   tokens.generated.ts에서 읽는다. 여기서 정하는 것은 "무엇이 얼마나 움직이는가"(opacity, 8px, scale 0.98)뿐이다.
 * - 축소 모드 변환(reducePreset)도 여기 순수 함수로 둔다. 훅(useMotionPreset)은 provider.tsx.
 * - React, DOM에 의존하지 않는다(테스트는 node 환경). Motion에서는 타입만 가져온다.
 *
 * 사용: `<m.div {...useMotionPreset("enter")} />`, 바텀시트 `<m.div {...useMotionPreset("spring-sheet")} />`
 */
import type { Transition } from "motion/react";
import type { DesignFrontmatter } from "@/lib/design/schema";
import { motionTokens } from "./tokens.generated";

export type MotionTokens = DesignFrontmatter["motion"];
export type DurationStep = keyof MotionTokens["duration"];
export type EasingName = keyof MotionTokens["easing"];
export type SpringName = keyof MotionTokens["spring"];

export { motionTokens };

/** 프리셋이 다루는 값. 위치는 transform(x, y, scale)과 opacity만 쓴다(레이아웃을 흔들지 않음). */
export type MotionTarget = {
  readonly opacity?: number;
  readonly x?: number | string;
  readonly y?: number | string;
  readonly scale?: number;
  /** 이 상태로 갈 때만 쓰는 전환(예: exit은 더 빠르게). */
  readonly transition?: Transition;
};

/** `<m.div {...preset} />`로 펼쳐 쓰는 묶음. 없는 키는 Motion 기본값을 따른다. */
export type MotionPreset = {
  readonly initial?: MotionTarget;
  readonly animate?: MotionTarget;
  readonly exit?: MotionTarget;
  readonly whileTap?: MotionTarget;
  readonly transition: Transition;
};

/* ---------- 토큰 → transition ---------- */

/** 토큰 duration + easing → tween (ms를 초로 바꾼다). */
export function tweenOf(
  duration: DurationStep,
  easing: EasingName = "standard",
  tokens: MotionTokens = motionTokens,
): Transition {
  const [x1, y1, x2, y2] = tokens.easing[easing];
  return {
    type: "tween",
    duration: tokens.duration[duration] / 1000,
    ease: [x1, y1, x2, y2],
  };
}

/** 토큰 spring → Motion spring. */
export function springOf(
  name: SpringName,
  tokens: MotionTokens = motionTokens,
): Transition {
  const { stiffness, damping, mass } = tokens.spring[name];
  return { type: "spring", stiffness, damping, mass };
}

/** 목록 등장 간격(초). */
export function staggerOf(tokens: MotionTokens = motionTokens): number {
  return tokens.stagger / 1000;
}

/** i번째 블록의 등장 지연(초). 다시 뽑기에서 식당명, 숫자, 이유 순서로 쓴다. */
export function revealDelay(
  index: number,
  tokens: MotionTokens = motionTokens,
): number {
  return index * staggerOf(tokens);
}

/** 감쇠비 ζ = c / (2√(k·m)). 1 이상이면 넘침(오버슈트) 없이 멈춘다. */
export function dampingRatio({
  stiffness,
  damping,
  mass,
}: MotionTokens["spring"][SpringName]): number {
  return damping / (2 * Math.sqrt(stiffness * mass));
}

/* ---------- 프리셋 ---------- */

/** 프리셋이 움직이는 거리. DESIGN.md 7절 "크로스페이드 + 8px 수평 이동". */
export const MOTION_OFFSET_PX = 8;
/** 눌림 축소 비율. */
export const PRESS_SCALE = 0.98;

export const MOTION_PRESET_NAMES = [
  "enter",
  "exit",
  "fade",
  "press",
  "spring-sheet",
  "spring-card",
  "spring-bar",
  "reveal",
] as const;
export type MotionPresetName = (typeof MOTION_PRESET_NAMES)[number];

/** 토큰으로 프리셋 묶음을 만든다. 앱은 아래 motionPresets(확정 토큰)를 쓰고, 다른 토큰은 테스트와 디자인 랩용. */
export function buildPresets(
  tokens: MotionTokens = motionTokens,
): Record<MotionPresetName, MotionPreset> {
  const exitTween = tweenOf("fast", "exit", tokens);
  return {
    /** 등장: 감속 곡선, base. 아래에서 8px 떠오르며 나타난다. */
    enter: {
      initial: { opacity: 0, y: MOTION_OFFSET_PX },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, transition: exitTween },
      transition: tweenOf("base", "enter", tokens),
    },
    /** 퇴장만: 가속 곡선, fast. 자리는 그대로 두고 흐려진다. */
    exit: {
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: exitTween,
    },
    /** 제자리 페이드(오버레이, 칩 상태 등): standard, base. */
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0, transition: exitTween },
      transition: tweenOf("base", "standard", tokens),
    },
    /** 눌림: scale 0.98, press 스프링. */
    press: {
      whileTap: { scale: PRESS_SCALE },
      transition: springOf("press", tokens),
    },
    /** 바텀시트(예비안, 기본은 Base UI Drawer): 아래에서 올라와 sheet 스프링으로 멈춘다. */
    "spring-sheet": {
      initial: { y: "100%" },
      animate: { y: 0 },
      exit: { y: "100%", transition: tweenOf("slow", "exit", tokens) },
      transition: springOf("sheet", tokens),
    },
    /** 카드 넘김: 크로스페이드 + 8px 수평 이동. x는 swipe 스프링, opacity는 base 감속. 뒤로 갈 때는 withDirection(p, -1). */
    "spring-card": {
      initial: { opacity: 0, x: MOTION_OFFSET_PX },
      animate: { opacity: 1, x: 0 },
      exit: {
        opacity: 0,
        x: -MOTION_OFFSET_PX,
        transition: { x: springOf("swipe", tokens), opacity: exitTween },
      },
      transition: {
        x: springOf("swipe", tokens),
        opacity: tweenOf("base", "enter", tokens),
      },
    },
    /** 득표 바: bar 스프링. 값(scaleX, width)은 쓰는 쪽이 animate로 준다. */
    "spring-bar": {
      transition: springOf("bar", tokens),
    },
    /** 다시 뽑기 블록 등장: slow 감속 페이드. 블록마다 transition.delay = revealDelay(i). */
    reveal: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: tweenOf("slow", "enter", tokens),
    },
  };
}

/** 확정 DESIGN.md 토큰으로 만든 프리셋. */
export const motionPresets = buildPresets();

/** 카드 방향 뒤집기: 1은 다음(오른쪽에서 들어옴), -1은 이전. 숫자 x만 부호를 바꾼다. */
export function withDirection(
  preset: MotionPreset,
  direction: 1 | -1,
): MotionPreset {
  if (direction === 1) return preset;
  const flip = (t?: MotionTarget): MotionTarget | undefined =>
    t && typeof t.x === "number" ? { ...t, x: -t.x } : t;
  return {
    ...preset,
    initial: flip(preset.initial),
    exit: flip(preset.exit),
  };
}

/* ---------- 축소 모드 (T2.12) ---------- */

/** 축소 모드 전환: 즉시 상태 변화 (DESIGN.md motion.reducedMotion: instant). */
export const INSTANT: Transition = { duration: 0 };

function stripTransform(t?: MotionTarget): MotionTarget | undefined {
  if (!t) return t;
  // opacity만 남긴다. 상태 전환용 transition도 즉시로 바꾼다.
  return t.opacity === undefined ? {} : { opacity: t.opacity };
}

/**
 * 프리셋 → 축소 모드 프리셋. DESIGN.md 7절 "모든 전환을 즉시 상태 변화로".
 * - 움직임(x, y, scale)은 시작과 퇴장 상태에서 빼고 opacity만 남긴다(한 프레임도 움직이지 않게).
 * - 모든 transition은 duration 0. 값별 transition(spring-card의 x, opacity)도 하나로 덮는다.
 * - whileTap(눌림 축소)은 없앤다.
 */
export function reducePreset(preset: MotionPreset): MotionPreset {
  const reduced: {
    -readonly [K in keyof MotionPreset]: MotionPreset[K];
  } = { transition: INSTANT };
  if (preset.initial) reduced.initial = stripTransform(preset.initial);
  if (preset.animate) {
    const { transition: _drop, ...animate } = preset.animate;
    void _drop;
    reduced.animate = animate;
  }
  if (preset.exit) reduced.exit = stripTransform(preset.exit);
  return reduced;
}

/** 축소 모드 프리셋 묶음. 훅이 렌더마다 새 객체를 만들지 않도록 미리 만든다. */
export const reducedMotionPresets = Object.fromEntries(
  MOTION_PRESET_NAMES.map((name) => [name, reducePreset(motionPresets[name])]),
) as Record<MotionPresetName, MotionPreset>;

/** 이름과 축소 여부로 프리셋을 고른다(훅이 없는 곳, 테스트용). */
export function getMotionPreset(
  name: MotionPresetName,
  reduced: boolean,
): MotionPreset {
  return reduced ? reducedMotionPresets[name] : motionPresets[name];
}

/** 직접 만든 transition도 축소 모드를 따르게 한다. */
export function reduceTransition(
  transition: Transition,
  reduced: boolean,
): Transition {
  return reduced ? INSTANT : transition;
}
