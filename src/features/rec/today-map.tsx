"use client";
// 오늘(홈) 데스크톱 우측 지도 (T5.17, REC-04, D-05, DESIGN.md 4장 "데스크톱"). (app)/@map/today 슬롯이 그린다.
// - 오늘 화면(today-screen)이 세션 상태(today-store map)에 기준점과 추천 세 곳 핀을 넣고, 여기서는 읽기만 한다.
// - 화면이 1024px 이상일 때만 지도 SDK(네이버)를 동적으로 받는다. 모바일에서는 지도 칸이 숨겨져 있어 받지 않는다.
// - 기준점 마커 + 세 곳 핀(이름 알약 + 점), 큰 카드(또는 그냥 골라줘 결과)의 핀만 올리브. 처음과 묶음이 바뀔 때 핀이 다 보이게 맞춘다.
// - 지도 구현(T5.26~T5.31) 전 최소 표시다. 클러스터, 필터, 마커 탭 시트는 지도 작업이 맡는다.
// - 이름은 카카오 세션 메모리 값이라 textContent로만 넣는다(innerHTML 금지). 좌표는 어디에도 보내지 않는다.
// - SDK 로딩 실패나 키 없음이면 조용한 빈 지도 자리(MapPane)로 둔다(PRD 12장 "지도 로딩 실패 시 리스트 보기"; 리스트는 왼쪽에 이미 있다).
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MapPane } from "@/components/app-shell";
import type { LatLng, MapInstance, MarkerHandle } from "@/lib/map/types";
import { useTodaySession, type TodayMapView } from "./today-store";
import "./today.css";

const DESKTOP_QUERY = "(min-width: 64rem)";
const FIT_PADDING_PX = 96;
const START_ZOOM = 16;

/** 정적 SVG(사용자 입력 없음): Lucide building-2 */
const BUILDING_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>';

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

export function TodayMap() {
  const desktop = useDesktop();
  const view = useTodaySession((s) => s.map);
  if (!desktop || !view.base) return <MapPane />;
  return <LiveMap view={view} />;
}

function LiveMap({ view }: { view: TodayMapView }) {
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
        <div ref={containerRef} className="size-full" />
      </div>
    </div>
  );
}
