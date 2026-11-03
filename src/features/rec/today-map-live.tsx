"use client";
// 오늘(홈) 데스크톱 우측 지도의 본체 (T5.17). today-map.tsx(문지기)가 1024px 이상에서만 지연으로 받는다(11/03 홈 첫 로드 감량).
// 동작 설명은 today-map.tsx 머리 주석.
import { useEffect, useRef, useState } from "react";
import { MapPane } from "@/components/app-shell";
import type { LatLng, MapInstance, MarkerHandle } from "@/lib/map/types";
import { useTodaySession, type TodayMapView } from "./today-store";

const FIT_PADDING_PX = 96;
const START_ZOOM = 16;

/** 정적 SVG(사용자 입력 없음): Lucide building-2 */
const BUILDING_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>';

function baseElement(kind: "office" | "here"): HTMLElement {
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

export function LiveMap({ view }: { view: TodayMapView }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  // 지도 생성(한 번)
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
        const center = useTodaySession.getState().map.base?.center;
        if (!center) return;
        map = provider.createMap(element, { center, zoom: START_ZOOM });
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

  // 기준점과 핀
  const pinKey = view.pins.map((p) => p.id).join("|");
  const baseKey = view.base
    ? `${view.base.kind}:${view.base.center.lat},${view.base.center.lng}`
    : "";
  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map || !view.base) return;
    const handles: MarkerHandle[] = [
      map.addMarker({
        position: view.base.center,
        content: baseElement(view.base.kind),
        anchor: view.base.kind === "office" ? { x: 14, y: 14 } : { x: 7, y: 7 },
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
    // 핀 목록, 기준점, 강조가 바뀔 때만 다시 그린다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pinKey, baseKey, view.activeId]);

  // 핀이 다 보이게 맞춘다(묶음이나 기준점이 바뀔 때)
  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map || !view.base) return;
    const points = [view.base.center, ...view.pins.map((p) => p.position)];
    if (points.length < 2) {
      map.setCenter(view.base.center);
      return;
    }
    map.fitBounds(boundsOf(points), FIT_PADDING_PX);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pinKey, baseKey]);

  if (status === "error") return <MapPane />;
  return (
    // 지도 요소는 SDK가 크기를 인라인으로 박는다. 칸 크기에 영향을 주지 않게 absolute 틀 안에 둔다(2fr 3fr 격자가 늘어나지 않게)
    <div className="relative min-h-64 flex-1 overflow-hidden border-l border-border bg-muted">
      <div className="absolute inset-0">
        <div ref={containerRef} className="lm-map-tiles size-full" />
      </div>
    </div>
  );
}
