"use client";
// 지도 탭 지도 칸 (T5.26 MAP-01, T5.27 MAP-02, T5.30 MAP-05). MapProvider 인터페이스로만 지도를 다룬다.
//
// - SDK 동적 import: 지도 칸이 마운트될 때 네이버 구현체 모듈을 import()로 받고 provider.load()가 스크립트를 넣는다.
//   지도 탭 밖의 번들에는 들어가지 않는다. 디자인 랩이 켜진 개발 환경에서는 ?map=lab으로 목업 지도를 쓸 수 있다.
// - 기준 위치 원(점선)과 다시 찾은 지역 원(옅은 실선), 마커는 addMarker에 넘긴 빈 DOM 요소 안을 React 포털로 그린다.
//   고른 마커는 MarkerHandle.setZIndex로 이웃보다 위로 올린다.
// - 사용자가 지도 면을 끌기, 휠, 방향키로 움직인 뒤의 멈춤(onIdle)만 사용자 이동으로 알린다(코드의 맞춤, 고른 식당 이동 제외).
// - 멈출 때마다 영역과 칸 크기를 올린다(클러스터를 다시 묶는다).
// - 로딩 실패와 인증 실패는 onFailed. 화면은 목록 보기로 바뀐다(T5.32).
// 색은 토큰만: 네이버 SDK는 CSS 변수를 못 받으므로 계산된 토큰 값을 넘긴다.
// 좌표(기준점, 현위치, 지도 가운데)는 이 컴포넌트 밖으로 콜백으로만 나가고 어디에도 저장하지 않는다(CLAUDE.md 7장).
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { focusRing } from "@/components/ui/interaction";
import { mapCopy } from "@/copy/map";
import type {
  Bounds,
  LatLng,
  MapInstance,
  MapProvider,
  MarkerHandle,
} from "@/lib/map/types";
import { cn } from "@/lib/utils";
import { centerForFocus, fitWithInset, type Inset } from "./fit";

const copy = mapCopy;
const KEY_STEP_PX = 80;
const START_ZOOM = 16;
/** 코드가 옮긴 뒤 영역을 다시 올리는 시점(네이버 미끄러짐 + 여유) */
const SETTLE_MS = 800;

export type MapProviderKind = "naver" | "lab";

export type CanvasMarker = {
  id: string;
  position: LatLng;
  zIndex: number;
  node: ReactNode;
};

export type CanvasCircle = {
  id: string;
  center: LatLng;
  radiusM: number;
  /** base: 기준 위치 반경(점선), area: 다시 찾은 지역(옅은 실선) */
  tone: "base" | "area";
};

export type MapView = {
  bounds: Bounds;
  size: { width: number; height: number };
  center: LatLng;
};

export type MapCanvasProps = {
  providerKind: MapProviderKind;
  /** 처음 가운데 */
  initialCenter: LatLng;
  circles: readonly CanvasCircle[];
  markers: readonly CanvasMarker[];
  /** 이 영역 전체가 보이는 칸에 들어오게 맞춘다. key가 바뀔 때마다 */
  fit: { key: string; bounds: Bounds; pad: number } | null;
  /** 고른 식당. 바뀔 때마다 보이는 칸 가운데로 미끄러진다 */
  focus: { key: string; position: LatLng } | null;
  /** 지도 가운데를 이 점으로 옮긴다(현위치 버튼). key가 바뀔 때마다 */
  moveTo: { key: string; position: LatLng } | null;
  /** 지도 위아래가 겹침(칩 줄, 시트)에 가리는 높이(px) */
  inset: Inset;
  reducedMotion: boolean;
  onLoaded: () => void;
  onFailed: () => void;
  onUserMoved: (center: LatLng) => void;
  onView: (view: MapView) => void;
  onMapTap?: () => void;
  describedById?: string;
  className?: string;
  /** 지도 위 겹치는 것(칩, 버튼) */
  children?: ReactNode;
};

async function loadProvider(kind: MapProviderKind): Promise<MapProvider> {
  if (kind === "lab") {
    const m = await import("@/features/design-lab/map/shared/lab-map-provider");
    return m.createLabMapProvider();
  }
  const m = await import("@/lib/naver/naver-map-provider");
  return m.createNaverMapProvider();
}

function tokenColor(kind: MapProviderKind, name: string): string {
  if (kind === "lab") return `var(${name})`;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    "currentColor"
  );
}

export function MapCanvas({
  providerKind,
  initialCenter,
  circles,
  markers,
  fit,
  focus,
  moveTo,
  inset,
  reducedMotion,
  onLoaded,
  onFailed,
  onUserMoved,
  onView,
  onMapTap,
  describedById,
  className,
  children,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapInstance | null>(null);
  /** 사용자가 지도 면을 끌거나 휠, 방향키로 움직였는가(마커 누르기는 제외) */
  const userTouched = useRef(false);
  const latest = useRef({
    onLoaded,
    onFailed,
    onUserMoved,
    onView,
    onMapTap,
    inset,
    reducedMotion,
    markers,
    initialCenter,
  });
  useEffect(() => {
    latest.current = {
      onLoaded,
      onFailed,
      onUserMoved,
      onView,
      onMapTap,
      inset,
      reducedMotion,
      markers,
      initialCenter,
    };
  });

  const mapRef = useRef<MapInstance | null>(null);
  const settleTimer = useRef<number | null>(null);
  /** 지금 영역과 칸 크기를 올린다(클러스터를 다시 묶는다) */
  const reportView = useCallback(() => {
    const m = mapRef.current;
    const el = containerRef.current;
    if (!m || !el) return;
    const { width, height } = el.getBoundingClientRect();
    latest.current.onView({
      bounds: m.getBounds(),
      size: { width, height },
      center: m.getCenter(),
    });
  }, []);
  /**
   * 코드가 지도를 옮긴다. 움직임이 끝날 즈음 영역을 다시 올린다
   * (애니메이션 없는 맞춤은 공급자가 멈춤 이벤트를 주지 않을 수 있다).
   */
  const afterCodeMove = useCallback(() => {
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    requestAnimationFrame(reportView);
    settleTimer.current = window.setTimeout(reportView, SETTLE_MS);
  }, [reportView]);
  useEffect(
    () => () => {
      if (settleTimer.current !== null)
        window.clearTimeout(settleTimer.current);
    },
    [],
  );

  // 지도 만들기 (T5.26): 구현체 모듈과 SDK를 이때 받는다
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    let cancelled = false;
    let instance: MapInstance | undefined;
    const unsubs: (() => void)[] = [];
    let observer: ResizeObserver | undefined;
    void (async () => {
      try {
        const provider = await loadProvider(providerKind);
        await provider.load();
        if (cancelled) return;
        const m = provider.createMap(element, {
          center: latest.current.initialCenter,
          zoom: START_ZOOM,
        });
        instance = m;
        mapRef.current = m;
        afterCodeMove();
        unsubs.push(
          m.onIdle(() => {
            reportView();
            // 사용자가 지도를 직접 만진 뒤의 멈춤만 사용자 이동이다(코드의 맞춤, 고른 식당으로 이동은 제외)
            if (!userTouched.current) return;
            userTouched.current = false;
            latest.current.onUserMoved(m.getCenter());
          }),
          m.onClick(() => {
            // 누르기만 하고 옮기지 않았다
            userTouched.current = false;
            latest.current.onMapTap?.();
          }),
          provider.onAuthFailure(() => {
            if (!cancelled) latest.current.onFailed();
          }),
        );
        // 네이버 지도는 만든 때 크기에 고정된다. 칸 크기가 바뀌면 알린다(시트, 화면 회전, 데스크톱 전환)
        observer = new ResizeObserver(() => {
          const { width, height } = element.getBoundingClientRect();
          if (width <= 0 || height <= 0) return;
          afterCodeMove();
          m.setSize({ width, height });
        });
        observer.observe(element);
        const touch = (e: Event) => {
          const t = e.target;
          if (t instanceof Element && t.closest(".lm-map-marker-slot")) return;
          userTouched.current = true;
        };
        for (const type of ["pointerdown", "wheel", "touchstart"] as const) {
          element.addEventListener(type, touch, { passive: true });
          unsubs.push(() => element.removeEventListener(type, touch));
        }
        setMap(m);
        latest.current.onLoaded();
      } catch {
        if (!cancelled) latest.current.onFailed();
      }
    })();
    return () => {
      cancelled = true;
      observer?.disconnect();
      for (const u of unsubs) u();
      instance?.destroy();
      mapRef.current = null;
      setMap(null);
    };
  }, [providerKind, afterCodeMove, reportView]);

  // 반경 원 (MAP-01)
  const circleKey = circles
    .map((c) => `${c.id}:${c.center.lat},${c.center.lng}:${c.radiusM}`)
    .join("|");
  const circlesRef = useRef(circles);
  useEffect(() => {
    circlesRef.current = circles;
  });
  useEffect(() => {
    if (!map) return;
    const primary = tokenColor(providerKind, "--primary");
    const muted = tokenColor(providerKind, "--muted-foreground");
    const handles = circlesRef.current.map((c) =>
      map.addCircle({
        center: c.center,
        radius: c.radiusM,
        strokeColor: c.tone === "base" ? primary : muted,
        fillColor: c.tone === "base" ? primary : muted,
        fillOpacity: c.tone === "base" ? 0.05 : 0.04,
        strokeOpacity: c.tone === "base" ? 0.7 : 0.35,
        strokeWeight: 1.5,
        strokeStyle: c.tone === "base" ? "dash" : "solid",
      }),
    );
    return () => {
      for (const h of handles) h.remove();
    };
  }, [map, circleKey, providerKind]);

  // 마커: id 목록이 바뀔 때만 DOM 요소를 새로 만들고, 내용은 포털로 그린다
  const markerIds = markers.map((m) => m.id).join("|");
  const slots = useMemo<ReadonlyMap<string, HTMLElement>>(() => {
    if (!map || !markerIds) return new Map();
    return new Map(
      markerIds.split("|").map((id) => {
        const el = document.createElement("div");
        el.className = "lm-map-marker-slot";
        return [id, el];
      }),
    );
  }, [map, markerIds]);
  const handlesRef = useRef<Map<string, MarkerHandle>>(new Map());
  useEffect(() => {
    if (!map) return;
    const handles = new Map<string, MarkerHandle>();
    for (const m of latest.current.markers) {
      const content = slots.get(m.id);
      if (!content) continue;
      handles.set(
        m.id,
        map.addMarker({
          position: m.position,
          content,
          // 안쪽 요소가 CSS로 가운데 아래 끝을 좌표에 맞춘다(map.css .lm-map-marker-slot)
          anchor: { x: 0, y: 0 },
          zIndex: m.zIndex,
        }),
      );
    }
    handlesRef.current = handles;
    return () => {
      for (const h of handles.values()) h.remove();
      handlesRef.current = new Map();
    };
  }, [map, slots]);
  // 좌표와 쌓임 순서는 요소를 다시 만들지 않고 바꾼다(고른 마커를 위로, T5.27)
  const markerState = markers
    .map((m) => `${m.id}:${m.zIndex}:${m.position.lat},${m.position.lng}`)
    .join("|");
  useEffect(() => {
    for (const m of latest.current.markers) {
      const h = handlesRef.current.get(m.id);
      if (!h) continue;
      h.setZIndex(m.zIndex);
      h.setPosition(m.position);
    }
  }, [markerState, slots]);

  // 맞춤: 영역 전체가 위 칩과 아래 시트 사이 보이는 칸에 들어오게
  const fitKey = fit?.key ?? null;
  const fitRef = useRef(fit);
  useEffect(() => {
    fitRef.current = fit;
  });
  useEffect(() => {
    const el = containerRef.current;
    const f = fitRef.current;
    if (!map || !el || !f) return;
    const { width, height } = el.getBoundingClientRect();
    afterCodeMove();
    map.fitBounds(
      fitWithInset(f.bounds, { width, height }, f.pad, latest.current.inset),
      f.pad,
    );
  }, [map, fitKey, inset.top, inset.bottom, afterCodeMove]);

  // 고른 식당으로 미끄러지기: 보이는 칸 가운데에
  const focusKey = focus?.key ?? null;
  const focusRef = useRef(focus);
  useEffect(() => {
    focusRef.current = focus;
  });
  useEffect(() => {
    const el = containerRef.current;
    const f = focusRef.current;
    if (!map || !el || !f) return;
    const target = centerForFocus(
      f.position,
      map.getBounds(),
      el.getBoundingClientRect().height,
      latest.current.inset,
    );
    afterCodeMove();
    if (latest.current.reducedMotion) map.setCenter(target);
    else map.panTo(target);
  }, [map, focusKey, inset.top, inset.bottom, afterCodeMove]);

  // 현위치 버튼: 지도 가운데만 옮긴다(기준점은 그대로, 저장하지 않음). 사용자가 원한 이동이라 조용히 두지 않는다
  const moveKey = moveTo?.key ?? null;
  const moveRef = useRef(moveTo);
  useEffect(() => {
    moveRef.current = moveTo;
  });
  useEffect(() => {
    const m = moveRef.current;
    if (!map || !m) return;
    userTouched.current = true;
    if (latest.current.reducedMotion) map.setCenter(m.position);
    else map.panTo(m.position);
  }, [map, moveKey]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!map || e.target !== e.currentTarget) return;
    const delta: Record<string, [number, number]> = {
      ArrowUp: [0, -KEY_STEP_PX],
      ArrowDown: [0, KEY_STEP_PX],
      ArrowLeft: [-KEY_STEP_PX, 0],
      ArrowRight: [KEY_STEP_PX, 0],
    };
    const d = delta[e.key];
    if (!d) return;
    e.preventDefault();
    userTouched.current = true;
    map.panBy({ x: d[0], y: d[1] });
  }

  return (
    <div className={cn("relative isolate overflow-hidden bg-muted", className)}>
      <div
        ref={containerRef}
        role="application"
        aria-roledescription={copy.mapRole}
        aria-label={copy.mapLabel}
        aria-describedby={describedById}
        tabIndex={0}
        onKeyDown={onKeyDown}
        // 네이버 지도가 요소에 position: relative를 넣으므로 크기는 inset이 아니라 size-full로 잡는다
        className={cn(
          "lm-map-tiles absolute inset-0 size-full",
          focusRing,
          "focus-visible:outline-offset-[-3px]",
        )}
      />
      {[...slots].map(([id, slot]) => {
        const m = markers.find((x) => x.id === id);
        return m ? createPortal(m.node, slot, id) : null;
      })}
      {children}
    </div>
  );
}
