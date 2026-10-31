"use client";
// 나 탭 데스크톱 우측 지도 (T6.13, D-12 안건 11, DESIGN.md 5장 "나 탭" 데스크톱). (app)/@map/me 슬롯이 그린다.
// - 나 탭 화면이 me-map-store에 기준 사무실과 보이는 줄의 핀(이름 해석된 곳만)을 넣고, 여기서는 읽기만 한다.
// - 1024px 이상에서만 네이버 지도 SDK를 동적으로 받는다. 기준점이 없거나 SDK가 실패하면 빈 지도 자리(MapPane).
// - 핀 모양은 오늘 지도와 같은 알약(today.css). 줄에서 이름을 누른 곳만 올리브.
// - 이름은 textContent로만 넣는다(innerHTML 금지). 좌표는 어디에도 보내지 않는다.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MapPane } from "@/components/app-shell";
import type { LatLng, MapInstance, MarkerHandle } from "@/lib/map/types";
import { useMeMap, type MeMapView } from "./me-map-store";
import "@/features/rec/today.css";

const DESKTOP_QUERY = "(min-width: 64rem)";
const FIT_PADDING_PX = 96;
const START_ZOOM = 16;

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

export function MeMap() {
  const desktop = useDesktop();
  const base = useMeMap((s) => s.base);
  const pins = useMeMap((s) => s.pins);
  const activeId = useMeMap((s) => s.activeId);
  const center = base ?? pins[0]?.position ?? null;
  if (!desktop || !center) return <MapPane />;
  return <LiveMap view={{ base, pins, activeId }} center={center} />;
}

function LiveMap({ view, center }: { view: MeMapView; center: LatLng }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const centerRef = useRef(center);
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
        map = provider.createMap(element, {
          center: centerRef.current,
          zoom: START_ZOOM,
        });
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

  const pinKey = view.pins.map((p) => p.id).join("|");
  const baseKey = view.base ? `${view.base.lat},${view.base.lng}` : "";

  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map) return;
    const handles: MarkerHandle[] = [];
    if (view.base) {
      handles.push(
        map.addMarker({
          position: view.base,
          content: baseElement(),
          anchor: { x: 7, y: 7 },
          zIndex: 1,
        }),
      );
    }
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

  // 핀이 다 보이게 맞춘다(목록이나 기준점이 바뀔 때)
  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map) return;
    const points = [
      ...(view.base ? [view.base] : []),
      ...view.pins.map((p) => p.position),
    ];
    if (points.length < 2) {
      map.setCenter(points[0] ?? centerRef.current);
      return;
    }
    map.fitBounds(boundsOf(points), FIT_PADDING_PX);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pinKey, baseKey]);

  // 강조한 핀으로 옮긴다
  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map || !view.activeId) return;
    const pin = view.pins.find((p) => p.id === view.activeId);
    if (pin) map.setCenter(pin.position);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, view.activeId]);

  if (status === "error") return <MapPane />;
  return (
    <div className="relative min-h-64 flex-1 overflow-hidden border-l border-border bg-muted">
      <div className="absolute inset-0">
        <div ref={containerRef} className="lm-map-tiles size-full" />
      </div>
    </div>
  );
}
