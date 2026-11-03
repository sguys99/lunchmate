"use client";
// 탭 스와이프 포인터 처리 (T9.14). 판정은 ./gesture.ts 순수 규칙, 여기는 포인터 이벤트를 그 규칙에 잇기만 한다.
// - 받는 요소에 touch-action: pan-y를 준다. 세로 스크롤은 브라우저가 하고(세로로 잠기면 이 손가락은 버린다),
//   가로 이동만 포인터 이벤트로 받는다. 가로로 잠기면 포인터를 잡아(setPointerCapture) 요소 밖으로 나가도 따라간다.
// - 가로로 민 뒤에는 바로 이어지는 click을 막는다(손가락 밑 링크나 카드가 눌리지 않게).
// - 시안은 마우스로도 시험할 수 있게 allowMouse 기본 true. 실제 구현은 터치와 펜만 받는다(데스크톱은 하단 탭).
// - 손을 떼면 onRelease(옮길 탭 또는 null, 마지막 화면 상태)를 부르고 drag를 비운다. 넘어가는 모양은 시안이 그린다.
import { useRef, useState, type MouseEvent, type PointerEvent } from "react";
import {
  canStartAt,
  dragState,
  isIgnoredTarget,
  lockAxis,
  releaseTarget,
  type SwipeDrag,
} from "./gesture";

type Track = {
  id: number;
  x0: number;
  y0: number;
  width: number;
  axis: "x" | "y" | null;
  samples: { x: number; t: number }[];
};

export type SwipeRelease = {
  target: number | null;
  last: SwipeDrag;
  width: number;
};

/** 최근 100ms 동안의 x 속도(px/ms) */
function velocityOf(samples: readonly { x: number; t: number }[]): number {
  const last = samples.at(-1);
  if (!last) return 0;
  const from = samples.find((s) => last.t - s.t <= 100) ?? last;
  const dt = last.t - from.t;
  return dt > 0 ? (last.x - from.x) / dt : 0;
}

export function useTabSwipe({
  index,
  count,
  enabled = true,
  allowMouse = true,
  onRelease,
}: {
  index: number;
  count: number;
  enabled?: boolean;
  allowMouse?: boolean;
  onRelease: (release: SwipeRelease) => void;
}) {
  const [drag, setDrag] = useState<SwipeDrag | null>(null);
  /** 받는 요소 폭(가로로 잠긴 순간에 잰다) */
  const [width, setWidth] = useState(0);
  const track = useRef<Track | null>(null);
  const suppressClick = useRef(false);
  const lastDrag = useRef<SwipeDrag | null>(null);

  function end(e: PointerEvent<HTMLElement>, cancelled: boolean) {
    const t = track.current;
    if (!t || e.pointerId !== t.id) return;
    track.current = null;
    if (t.axis !== "x") return;
    const last = lastDrag.current ?? dragState(0, index, count, t.width);
    const dx = e.clientX - t.x0;
    const target = cancelled
      ? null
      : releaseTarget(dx, velocityOf(t.samples), index, count, t.width);
    suppressClick.current = true;
    lastDrag.current = null;
    setDrag(null);
    onRelease({ target, last, width: t.width });
  }

  const handlers = {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      suppressClick.current = false;
      if (!enabled || track.current) return;
      if (e.pointerType === "mouse" && (!allowMouse || e.button !== 0)) return;
      if (!canStartAt(e.clientX, window.innerWidth)) return;
      if (isIgnoredTarget(e.target as Element, e.currentTarget)) return;
      track.current = {
        id: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        width: e.currentTarget.getBoundingClientRect().width,
        axis: null,
        samples: [{ x: e.clientX, t: e.timeStamp }],
      };
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      const t = track.current;
      if (!t || e.pointerId !== t.id) return;
      const dx = e.clientX - t.x0;
      if (t.axis === null) {
        const axis = lockAxis(dx, e.clientY - t.y0);
        if (axis === null) return;
        if (axis === "y") {
          track.current = null;
          return;
        }
        t.axis = "x";
        setWidth(t.width);
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }
      t.samples.push({ x: e.clientX, t: e.timeStamp });
      if (t.samples.length > 12) t.samples.shift();
      const next = dragState(dx, index, count, t.width);
      lastDrag.current = next;
      setDrag(next);
    },
    onPointerUp(e: PointerEvent<HTMLElement>) {
      end(e, false);
    },
    onPointerCancel(e: PointerEvent<HTMLElement>) {
      end(e, true);
    },
    onClickCapture(e: MouseEvent<HTMLElement>) {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
  };

  return { drag, width, handlers };
}
