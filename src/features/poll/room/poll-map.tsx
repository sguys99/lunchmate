"use client";
// 투표방 데스크톱 우측 지도 (T7.16, D-14 안건 3, DESIGN.md 5장 "투표방"). (app)/@map/poll 슬롯이 그린다.
// - 투표방 화면이 poll-map-store에 기준점과 후보 핀을 넣는다. 1위(단독)나 확정 핀만 올리브.
// - 1024px 이상일 때만 네이버 지도 SDK를 동적으로 받는다. 실패하면 조용한 빈 지도 자리(MapPane).
// - 핀 모양과 색은 오늘(홈) 지도와 같은 클래스(today.css)를 쓴다. 이름은 textContent로만 넣는다.
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

function baseElement(): HTMLElement {
  const el = document.createElement("span");
  el.className = "lm-today-base";
  el.dataset.kind = "here";
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
  return <LiveMap view={view} />;
}

function LiveMap({ view }: { view: PollMapView }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
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
        const center = usePollMap.getState().view.base;
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
        content: baseElement(),
        anchor: { x: 7, y: 7 },
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
  }, [status, pinKey, baseKey, view.activeId]);

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
