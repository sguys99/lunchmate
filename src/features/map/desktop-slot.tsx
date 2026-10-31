"use client";
// 데스크톱 우측 지도 칸 자리 (T5.31, MAP-06). (app)/@map/map 슬롯이 이 자리를 그리고, 지도 탭 화면(map-screen)이
// 데스크톱일 때 지도 칸을 이 자리로 포털한다. 화면 상태(고른 식당, 필터)는 지도 탭 화면 한 트리에 그대로 남는다.
import { useEffect, useRef, useSyncExternalStore } from "react";

let target: HTMLElement | null = null;
const listeners = new Set<() => void>();

function setTarget(el: HTMLElement | null) {
  target = el;
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** 지도 탭 화면이 읽는다. 슬롯이 아직 없거나 모바일이면 null */
export function useDesktopMapTarget(): HTMLElement | null {
  return useSyncExternalStore(
    subscribe,
    () => target,
    () => null,
  );
}

/**
 * @map/map 슬롯이 그린다. 빈 지도 자리(MapPane)와 같은 면이지만 role="img"를 두지 않는다
 * (안에 마커 버튼이 들어오므로 보조 기술에서 숨기면 안 된다).
 */
export function DesktopMapSlot() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setTarget(ref.current);
    return () => setTarget(null);
  }, []);
  return (
    <div
      ref={ref}
      data-slot="map-tab-pane"
      className="relative isolate min-h-64 flex-1 border-l border-border bg-muted"
    />
  );
}
