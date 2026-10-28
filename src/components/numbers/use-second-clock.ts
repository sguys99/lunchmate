"use client";
// 1초 시계 (T2.13). 카운트다운 여러 개가 타이머 하나를 함께 쓴다.
// 서버 렌더와 하이드레이션 중에는 null을 돌려준다(서버 시각으로 그리면 클라이언트와 글자가 달라 경고가 난다).
// 시각 판정은 이 값을 src/lib/time, src/lib/format(countdownUntil)에 넘겨서 한다.
import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let nowMs = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

function tick() {
  nowMs = Date.now();
  listeners.forEach((l) => l());
  // 초 경계에 맞춰 다음 틱을 건다(setInterval은 밀리면서 한 초를 건너뛰어 보일 수 있다).
  timer = setTimeout(tick, 1000 - (nowMs % 1000) + 5);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) tick();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };
}

const getSnapshot = () => nowMs || null;
const getServerSnapshot = () => null;

/** 지금 시각(ms). 마운트 전과 서버에서는 null. 매초 갱신된다. */
export function useSecondClock(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
