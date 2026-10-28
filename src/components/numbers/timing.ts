// NumberFlow 타이밍 (T2.13). NumberFlow는 Web Animations의 EffectTiming을 받으므로 Motion transition이 아니라
// 같은 DESIGN.md 모션 토큰(tokens.generated.ts)에서 ms와 cubic-bezier 문자열을 만든다.
// DESIGN.md 7절 "득표 바: 숫자는 NumberFlow로 굴리되 속도는 base". 오버슈트 없는 곡선만 쓴다.
import { motionTokens, type MotionTokens } from "@/lib/motion";

export type NumberFlowTimings = {
  transformTiming: EffectTiming;
  spinTiming: EffectTiming;
  opacityTiming: EffectTiming;
};

const bezier = ([x1, y1, x2, y2]: readonly number[]) =>
  `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;

/** 자리 이동과 숫자 회전은 base + standard, 나타나고 사라지는 자리는 fast + enter(감속). */
export function numberFlowTimings(
  tokens: MotionTokens = motionTokens,
): NumberFlowTimings {
  const move: EffectTiming = {
    duration: tokens.duration.base,
    easing: bezier(tokens.easing.standard),
  };
  return {
    transformTiming: move,
    spinTiming: move,
    opacityTiming: {
      duration: tokens.duration.fast,
      easing: bezier(tokens.easing.enter),
    },
  };
}

export const NUMBER_FLOW_TIMINGS = numberFlowTimings();
