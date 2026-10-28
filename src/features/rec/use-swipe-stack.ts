"use client";
// 추천 카드 넘김 훅 (T2.13 PoC). 끌기, 키보드, 이전/다음 버튼이 모두 같은 moveTo를 지난다.
// 스크린 리더 안내 문장은 쓰는 쪽이 announce로 만든다(문구는 src/copy).
import type { PanInfo } from "motion/react";
import { useState, type KeyboardEvent } from "react";
import {
  keyTarget,
  moveTo,
  swipeStep,
  type SwipeStackState,
} from "./swipe-stack";

const START: SwipeStackState = { index: 0, direction: 1, dragged: false };

export type UseSwipeStack = SwipeStackState & {
  total: number;
  canPrev: boolean;
  canNext: boolean;
  /** aria-live에 넣을 문장. 처음에는 빈 문자열(읽지 않는다). */
  announcement: string;
  goTo: (target: number) => void;
  prev: () => void;
  next: () => void;
  /** 카드 영역 onKeyDown (영역 자체에 포커스가 있을 때만) */
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  /** Motion onDragEnd */
  onDragEnd: (event: unknown, info: PanInfo) => void;
  /** 목록이 바뀌면(다시 뽑기) 처음으로 */
  reset: () => void;
};

export function useSwipeStack(
  total: number,
  announce: (index: number) => string,
): UseSwipeStack {
  const [state, setState] = useState<SwipeStackState>(START);
  const [announcement, setAnnouncement] = useState("");

  function move(target: number, dragged = false) {
    const next = moveTo(state, target, total, dragged);
    if (next === state) return;
    setState(next);
    setAnnouncement(announce(next.index));
  }

  return {
    ...state,
    total,
    canPrev: state.index > 0,
    canNext: state.index < total - 1,
    announcement,
    goTo: (target) => move(target),
    prev: () => move(state.index - 1),
    next: () => move(state.index + 1),
    onKeyDown: (event) => {
      // 카드 안 버튼에서 누른 화살표는 그 요소의 몫이다.
      if (event.target !== event.currentTarget) return;
      const target = keyTarget(event.key, state.index, total);
      if (target === null) return;
      event.preventDefault();
      move(target);
    },
    onDragEnd: (_, info) => {
      const step = swipeStep(info.offset.x, info.velocity.x);
      if (step !== 0) move(state.index + step, true);
    },
    reset: () => {
      setState(START);
      setAnnouncement("");
    },
  };
}
