"use client";
// 회식 모드 지도 (T7.27, DESIGN.md 5장 "회식 모드" 지도 띠). 모바일은 화면 안 지도 띠, 데스크톱은 @map/poll/party 슬롯이 그린다.
// - 회사 기준점(마름모) + 도보 15분 점선 원 + 번호 핀 1~5(28 원). 고른 핀만 올리브 면 + 이름 알약(데스크톱).
// - 지도 SDK(네이버)는 이 컴포넌트가 보일 때만 동적으로 받는다. 실패하면 조용한 빈 지도 자리로 둔다(목록이 이미 있다).
// - 이름은 카카오 세션 값이라 textContent로만 넣는다(innerHTML 금지). 좌표는 어디에도 보내지 않는다.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MapPane } from "@/components/app-shell";
import { partyCopy as copy } from "@/copy/party";
import type { LatLng, MapInstance, MarkerHandle } from "@/lib/map/types";
import { cn } from "@/lib/utils";
import { usePartyMap, type PartyMapView } from "./party-store";
import "./party.css";

const DESKTOP_QUERY = "(min-width: 64rem)";
const FIT_PADDING_PX = 72;
const COMPACT_FIT_PADDING_PX = 28;
const START_ZOOM = 15;

function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function useDesktop(): boolean {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

function tokenColor(name: string): string {
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    "currentColor"
  );
}

function baseElement(): HTMLElement {
  const el = document.createElement("span");
  el.className = "lm-party-base";
  el.setAttribute("aria-hidden", "true");
  return el;
}

function pinElement(
  n: number,
  name: string,
  active: boolean,
  compact: boolean,
) {
  const el = document.createElement("span");
  el.className = "lm-party-pin";
  el.dataset.active = String(active);
  const num = document.createElement("span");
  num.className = "lm-party-pin-num";
  num.textContent = String(n);
  el.append(num);
  if (active && !compact) {
    const label = document.createElement("span");
    label.className = "lm-party-pin-label";
    label.textContent = name;
    el.append(label);
  }
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

/** 데스크톱 우측 칸(@map/poll/party). 모바일에서는 칸이 숨겨져 있어 지도를 받지 않는다 */
export function PartyDesktopMap() {
  const desktop = useDesktop();
  const view = usePartyMap();
  if (!desktop || !view.base) return <MapPane />;
  return (
    <div className="relative min-h-64 flex-1 overflow-hidden border-l border-border bg-muted">
      <LiveMap view={view} onPick={view.setActive} />
    </div>
  );
}

/** 모바일 지도 띠(높이 136). 데스크톱에서는 그리지 않는다 */
export function PartyMapStrip({ className }: { className?: string }) {
  const desktop = useDesktop();
  const view = usePartyMap();
  if (desktop) return null;
  return (
    <div
      className={cn(
        "relative h-34 overflow-hidden rounded-card border border-border bg-muted",
        className,
      )}
    >
      {view.base ? (
        <LiveMap view={view} onPick={view.setActive} compact />
      ) : null}
    </div>
  );
}

function LiveMap({
  view,
  onPick,
  compact = false,
}: {
  view: PartyMapView;
  onPick: (i: number) => void;
  compact?: boolean;
}) {
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
        const center = usePartyMap.getState().base?.center;
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

  const pinKey = view.pins.map((p) => p.id).join("|");
  const baseKey = view.base
    ? `${view.base.center.lat},${view.base.center.lng},${view.base.radiusM}`
    : "";

  // 기준점, 15분 원, 번호 핀
  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map || !view.base) return;
    const primary = tokenColor("--primary");
    const circle = map.addCircle({
      center: view.base.center,
      radius: view.base.radiusM,
      strokeColor: primary,
      fillColor: primary,
      strokeOpacity: 0.55,
      fillOpacity: 0.04,
      strokeWeight: 1.5,
      strokeStyle: "dash",
    });
    const handles: MarkerHandle[] = [
      map.addMarker({
        position: view.base.center,
        content: baseElement(),
        anchor: { x: 9, y: 9 },
        zIndex: 1,
      }),
    ];
    view.pins.forEach((p, i) => {
      const active = i === view.active;
      handles.push(
        map.addMarker({
          position: p.position,
          content: pinElement(i + 1, p.name, active, compact),
          anchor: { x: 14, y: 14 },
          title: `${i + 1} ${p.name}`,
          zIndex: active ? 3 : 2,
          onClick: () => onPick(i),
        }),
      );
    });
    return () => {
      circle.remove();
      handles.forEach((h) => h.remove());
    };
    // 핀 목록, 기준점, 고른 번호가 바뀔 때만 다시 그린다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pinKey, baseKey, view.active, compact]);

  // 기준점과 핀이 다 보이게(묶음이나 기준점이 바뀔 때)
  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map || !view.base) return;
    const points = [view.base.center, ...view.pins.map((p) => p.position)];
    if (points.length < 2) {
      map.setCenter(view.base.center);
      return;
    }
    map.fitBounds(
      boundsOf(points),
      compact ? COMPACT_FIT_PADDING_PX : FIT_PADDING_PX,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pinKey, baseKey]);

  // 실패하면 바탕(muted) 칸만 남긴다. 목록이 이미 있어 결정을 막지 않는다
  if (status === "error") return null;
  return (
    <div role="img" aria-label={copy.map.region} className="absolute inset-0">
      <div ref={containerRef} className="lm-map-tiles size-full" />
    </div>
  );
}
