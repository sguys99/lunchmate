"use client";
// 투표방 데스크톱 우측 지도 (T7.16, D-14 안건 3, DESIGN.md 5장 "투표방"). (app)/@map/poll 슬롯이 그린다.
// - 투표방 화면이 poll-map-store에 기준점과 후보 핀을 넣는다. 1위(단독)나 확정 핀만 올리브.
// - 1024px 이상일 때만 네이버 지도 SDK를 동적으로 받는다. 실패하면 조용한 빈 지도 자리(MapPane).
// - 핀 모양과 색은 오늘(홈) 지도와 같은 클래스(today.css)를 쓴다. 이름은 textContent로만 넣는다.
// - 투표 탭(@map/poll, T8.11b)도 PollMapCanvas에 view를 직접 넘겨 같은 지도를 쓴다. 진행 중 투표가 없으면
//   기본 사무실을 오늘 지도와 같은 사무실 기준점(건물 원, baseKind "office")으로 보인다.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MapPane } from "@/components/app-shell";
import type { LatLng, MapInstance, MarkerHandle } from "@/lib/map/types";
import "@/features/rec/today.css";
import { usePollMap, type PollMapView } from "./poll-map-store";

const DESKTOP_QUERY = "(min-width: 64rem)";
const FIT_PADDING_PX = 96;

function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useDesktop(): boolean {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

/** 정적 SVG(사용자 입력 없음): Lucide building-2. 오늘 지도(today-map.tsx)의 사무실 기준점과 같다 */
const BUILDING_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>';

export type PollMapBaseKind = "here" | "office";

function baseElement(kind: PollMapBaseKind): HTMLElement {
  const el = document.createElement("span");
  el.className = "lm-today-base";
  el.dataset.kind = kind;
  if (kind === "office") el.innerHTML = BUILDING_SVG;
  return el;
}

function pinElement(name: string, active: boolean): HTMLElement {
  const el = document.createElement("span");
  el.className = "lm-today-pin";
  el.dataset.active = String(active);
  const inner = document.createElement("span");
  inner.className = "lm-today-pin-inner";
  const label = document.createElement("span");
  label.className = "lm-today-pin-label";
  label.textContent = name;
  const dot = document.createElement("span");
  dot.className = "lm-today-pin-dot";
  inner.append(label, dot);
  el.append(inner);
  return el;
}

function boundsOf(points: readonly LatLng[]) {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return {
    sw: { lat: Math.min(...lats), lng: Math.min(...lngs) },
    ne: { lat: Math.max(...lats), lng: Math.max(...lngs) },
  };
}

export function PollMap() {
  const desktop = useDesktop();
  const view = usePollMap((s) => s.view);
  if (!desktop || !view.base) return <MapPane />;
  return <PollMapCanvas view={view} />;
}

/**
 * 지도 칸 본체. view.base가 있을 때만 그린다(없으면 부르는 쪽이 MapPane).
 * 1024px 판정은 부르는 쪽이 한다. SDK 실패나 인증 실패면 MapPane.
 */
export function PollMapCanvas({
  view,
  baseKind = "here",
}: {
  view: PollMapView;
  baseKind?: PollMapBaseKind;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const startRef = useRef(view.base);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    let cancelled = false;
    let map: MapInstance | undefined;
    let offAuth: (() => void) | undefined;
    let observer: ResizeObserver | undefined;
    void (async () => {
      try {
        const { createNaverMapProvider } =
          await import("@/lib/naver/naver-map-provider");
        const provider = createNaverMapProvider();
        await provider.load();
        if (cancelled) return;
        const center = startRef.current;
        if (!center) return;
        map = provider.createMap(element, { center, zoom: 16 });
        mapRef.current = map;
        offAuth = provider.onAuthFailure(() => {
          if (!cancelled) setStatus("error");
        });
        const frame = element.parentElement ?? element;
        observer = new ResizeObserver(() => {
          const { width, height } = frame.getBoundingClientRect();
          if (width > 0 && height > 0) map?.setSize({ width, height });
        });
        observer.observe(frame);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      offAuth?.();
      observer?.disconnect();
      mapRef.current = null;
      map?.destroy();
    };
  }, []);

  const pinKey = view.pins.map((p) => `${p.id}:${p.name}`).join("|");
  const baseKey = view.base ? `${view.base.lat},${view.base.lng}` : "";
  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map || !view.base) return;
    const handles: MarkerHandle[] = [
      map.addMarker({
        position: view.base,
        content: baseElement(baseKind),
        anchor: baseKind === "office" ? { x: 14, y: 14 } : { x: 7, y: 7 },
        zIndex: 1,
      }),
    ];
    for (const p of view.pins) {
      const active = p.id === view.activeId;
      handles.push(
        map.addMarker({
          position: p.position,
          content: pinElement(p.name, active),
          anchor: { x: 0, y: 0 },
          title: p.name,
          zIndex: active ? 3 : 2,
        }),
      );
    }
    return () => handles.forEach((h) => h.remove());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pinKey, baseKey, view.activeId, baseKind]);

  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map || !view.base) return;
    const points = [view.base, ...view.pins.map((p) => p.position)];
    if (points.length < 2) {
      map.setCenter(view.base);
      return;
    }
    map.fitBounds(boundsOf(points), FIT_PADDING_PX);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pinKey, baseKey]);

  if (status === "error") return <MapPane />;
  return (
    <div className="relative min-h-64 flex-1 overflow-hidden border-l border-border bg-muted">
      <div className="absolute inset-0">
        <div ref={containerRef} className="lm-map-tiles size-full" />
      </div>
    </div>
  );
}
