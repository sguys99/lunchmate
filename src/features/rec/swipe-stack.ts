/**
 * 추천 카드 넘김 규칙 (T2.13 PoC, REC-04 카드 스와이프의 바탕).
 * React, DOM에 의존하지 않는 순수 함수다. 훅은 use-swipe-stack.ts.
 *
 * - 끌기: 왼쪽으로 SWIPE_DISTANCE_PX 넘게 밀거나 SWIPE_VELOCITY_PX 넘게 빠르게 튕기면 다음, 오른쪽이면 이전.
 *   값은 시안 B 홈(T1.11)과 같다.
 * - 끝에서 멈춘다(돌아가지 않는다). 3장뿐이라 처음과 끝이 분명한 편이 위치를 알기 쉽다.
 * - 키보드: 왼쪽, 오른쪽 화살표, Home, End. 스와이프만 있는 조작은 금지(CLAUDE.md 6.3).
 */

/** 다음 카드로 넘기는 최소 끌기 거리(px). */
export const SWIPE_DISTANCE_PX = 56;
/** 거리가 짧아도 넘기는 최소 속도(px/s). */
export const SWIPE_VELOCITY_PX = 420;

/** 1: 다음, -1: 이전, 0: 제자리 */
export type SwipeStep = 1 | -1 | 0;

/** 끌기를 놓았을 때 넘길 방향. 왼쪽으로 밀면(offset 음수) 다음 카드. */
export function swipeStep(offsetX: number, velocityX: number): SwipeStep {
  if (offsetX < -SWIPE_DISTANCE_PX || velocityX < -SWIPE_VELOCITY_PX) return 1;
  if (offsetX > SWIPE_DISTANCE_PX || velocityX > SWIPE_VELOCITY_PX) return -1;
  return 0;
}

/** 키 입력 → 이동 목표. 처리하지 않는 키는 null. */
export function keyTarget(
  key: string,
  index: number,
  total: number,
): number | null {
  switch (key) {
    case "ArrowRight":
      return index + 1;
    case "ArrowLeft":
      return index - 1;
    case "Home":
      return 0;
    case "End":
      return total - 1;
    default:
      return null;
  }
}

export type SwipeStackState = {
  index: number;
  /** 마지막 이동 방향. 들어오고 나가는 카드의 x 부호를 정한다. */
  direction: 1 | -1;
  /** 마지막 이동이 끌기로 일어났는지. 끌어서 넘긴 카드는 손을 따라 멀리 나간다. */
  dragged: boolean;
};

/** 목표 위치로 이동. 범위 밖이거나 같은 위치면 상태를 그대로 돌려준다(렌더 없음). */
export function moveTo(
  state: SwipeStackState,
  target: number,
  total: number,
  dragged = false,
): SwipeStackState {
  if (target < 0 || target >= total || target === state.index) return state;
  return {
    index: target,
    direction: target > state.index ? 1 : -1,
    dragged,
  };
}
