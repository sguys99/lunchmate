"use client";
// 지도 시안 공용 지도 칸 (T5.1). MapProvider(목업 또는 네이버 구현체)로 지도를 만들고, 마커는 DOM 요소 + React 포털로 그린다.
// - 기준 위치(회사 핀)와 걷는 거리 원(MAP-01), 식당 마커(MAP-02)를 올린다. 마커 모양은 시안이 renderMarker로 정한다.
// - 처음에는 원이 보이는 칸(위 칩 줄과 아래 시트에 가리는 높이 inset을 뺀 영역)에 맞춰 물러난다.
// - focus가 바뀌면(마커, 목록, 카드에서 식당을 고름) 그 식당이 보이는 칸 가운데로 미끄러진다.
// - 사용자가 지도를 끌거나 방향키로 옮기면 onMoved(MAP-05 "이 지역에서 다시 찾기"). 코드가 옮긴 것은 알리지 않는다.
// - 로딩 실패(load 실패)는 onFailed로 올린다. 화면은 목록 보기로 바뀐다(T5.32).
// 색은 토큰만 쓴다. 목업 지도는 var(--…)를 그대로, 네이버 지도는 계산된 토큰 값을 넘긴다(SDK가 CSS 변수를 못 받는다).
import { WifiOff } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { focusRing } from "@/components/ui/interaction";
import { mapLabCopy } from "@/copy/design-lab-map";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/lib/map/constants";
import type { MapInstance, MapProvider } from "@/lib/map/types";
import { createNaverMapProvider } from "@/lib/naver/naver-map-provider";
import { cn } from "@/lib/utils";
import { createLabMapProvider } from "./lab-map-provider";
import { offsetToLatLng } from "./places";

const copy = mapLabCopy;
const KEY_STEP_PX = 80;
const FIT_PADDING_PX = 24;
const QUIET_MS = 450;
const CLUSTER_PADDING_PX = 72;
const ORIGIN = DEFAULT_MAP_CENTER;

export type LabMarker = {
  id: string;
  /** 기준점에서 떨어진 m (동쪽 x, 남쪽 y) */
  at: { x: number; y: number };
  /** content 안에서 좌표에 맞출 점(px). 생략하면 가운데 아래 */
  anchor?: { x: number; y: number };
  /** 겹칠 때 위에 올 순서. 고른 마커, 기준 위치 */
  zIndex?: number;
  node: ReactNode;
};

export type LabMapStatus = "ready" | "loading" | "offline";

export type LabMapProps = {
  providerKind: "lab" | "naver";
  /** true면 load()가 실패하는 목업(오류 상태 시연) */
  fail?: boolean;
  status: LabMapStatus;
  radiusM: number;
  markers: readonly LabMarker[];
  /** 보이게 할 식당 위치. 바뀔 때마다 미끄러진다 */
  focus: { key: string; at: { x: number; y: number } } | null;
  /** 지도 위아래가 겹침(칩 줄, 시트)에 가리는 높이(px). 맞춤과 고른 식당 위치를 보이는 칸 기준으로 잡는다 */
  inset?: { top: number; bottom: number };
  /** 처음 맞춤(전체 보기)에 쓸 겹침. 생략하면 inset. 고른 상태의 큰 시트로 맞추면 너무 물러나서 따로 둔다 */
  fitInset?: { top: number; bottom: number };
  /** 바뀌면 처음 맞춤을 다시 한다(넓히기, 다시 찾기 뒤) */
  fitKey?: string | number;
  /** 이 점들이 다 보이게 다가간다(클러스터 펼치기). key가 바뀔 때마다 */
  fitTo?: { key: string; points: readonly { x: number; y: number }[] } | null;
  onMoved?: () => void;
  onMapTap?: () => void;
  onFailed?: () => void;
  /** 지도 위 겹치는 것(칩, 버튼). 지도 칸 안 절대 위치로 둔다 */
  children?: ReactNode;
  className?: string;
  describedById?: string;
};

function resolveColor(kind: "lab" | "naver", name: string) {
  if (kind === "lab") return `var(${name})`;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    "currentColor"
  );
}

const NO_INSET = { top: 0, bottom: 0 };

/**
 * 영역(m)이 위아래 겹침을 뺀 보이는 칸에 다 들어오게 맞춘다. MapInstance.fitBounds는 네 방향 같은 여백만 받으므로,
 * 보이는 칸 비율로 넓힌 영역을 만들어 넘긴다(축척 = 영역 ÷ 보이는 칸, 가운데 = 보이는 칸 가운데).
 */
function fitInView(
  map: MapInstance,
  el: HTMLElement,
  box: { minX: number; maxX: number; minY: number; maxY: number },
  pad: number,
  inset: { top: number; bottom: number },
) {
  const w = el.clientWidth;
  const h = el.clientHeight;
  const visW = Math.max(40, w - pad * 2);
  const visH = Math.max(40, h - inset.top - inset.bottom - pad * 2);
  const mpp = Math.max(
    (box.maxX - box.minX) / visW,
    (box.maxY - box.minY) / visH,
    0.4,
  );
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  // 지도 가운데(h/2)는 보이는 칸 가운데보다 얼마나 아래(남쪽)인가
  const dy = (h / 2 - (inset.top + pad + visH / 2)) * mpp;
  const hw = (mpp * (w - pad * 2)) / 2;
  const hh = (mpp * (h - pad * 2)) / 2;
  map.fitBounds(
    {
      sw: offsetToLatLng(ORIGIN, { x: cx - hw, y: cy + dy + hh }),
      ne: offsetToLatLng(ORIGIN, { x: cx + hw, y: cy + dy - hh }),
    },
    pad,
  );
}

export function LabMap({
  providerKind,
  fail = false,
  status,
  radiusM,
  markers,
  focus,
  inset = NO_INSET,
  fitInset,
  fitKey,
  fitTo = null,
  onMoved,
  onMapTap,
  onFailed,
  children,
  className,
  describedById,
}: LabMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapInstance | null>(null);
  const [provider] = useState<MapProvider>(() =>
    providerKind === "naver"
      ? createNaverMapProvider()
      : createLabMapProvider({ fail }),
  );
  // 최신 값 보관(효과는 선언 순서대로 돌기 때문에 아래 효과보다 먼저 갱신된다)
  const callbacks = useRef({ onMoved, onMapTap, onFailed });
  // 겹침 높이가 바뀌면(화면 크기를 처음 잰 뒤, 시트 단계가 바뀐 뒤) 맞춤과 고른 식당 위치를 다시 잡는다
  const insetTop = inset.top;
  const insetBottom = inset.bottom;
  const fitTop = (fitInset ?? inset).top;
  const fitBottom = (fitInset ?? inset).bottom;
  const insetRef = useRef(inset);
  const focusAt = useRef(focus?.at ?? null);
  const markersRef = useRef(markers);
  useEffect(() => {
    callbacks.current = { onMoved, onMapTap, onFailed };
    insetRef.current = inset;
    focusAt.current = focus?.at ?? null;
    markersRef.current = markers;
  });
  // 코드가 옮긴 뒤 이 시각까지의 onIdle은 사용자 이동이 아니다(미끄러짐 300ms + 여유)
  const quietUntil = useRef(0);

  // 지도 만들기
  useEffect(() => {
    if (status !== "ready") return;
    const element = containerRef.current;
    if (!element) return;
    let cancelled = false;
    let instance: MapInstance | undefined;
    const unsubs: (() => void)[] = [];
    provider
      .load()
      .then(() => {
        if (cancelled) return;
        instance = provider.createMap(element, {
          center: ORIGIN,
          zoom: DEFAULT_MAP_ZOOM,
        });
        unsubs.push(
          instance.onIdle(() => {
            if (performance.now() < quietUntil.current) return;
            callbacks.current.onMoved?.();
          }),
          instance.onClick(() => callbacks.current.onMapTap?.()),
          provider.onAuthFailure(() => callbacks.current.onFailed?.()),
        );
        setMap(instance);
      })
      .catch(() => {
        if (!cancelled) callbacks.current.onFailed?.();
      });
    return () => {
      cancelled = true;
      for (const u of unsubs) u();
      instance?.destroy();
      setMap(null);
    };
  }, [provider, status]);

  // 기준 위치 원 (MAP-01)
  useEffect(() => {
    if (!map) return;
    const circle = map.addCircle({
      center: ORIGIN,
      radius: radiusM,
      strokeColor: resolveColor(providerKind, "--primary"),
      fillColor: resolveColor(providerKind, "--primary"),
      fillOpacity: 0.05,
      strokeOpacity: 0.7,
      strokeWeight: 1.5,
    });
    return () => circle.remove();
  }, [map, radiusM, providerKind]);

  // 마커: DOM 요소를 만들어 addMarker로 올리고, 내용은 포털로 그린다.
  // 요소는 지도와 마커 id 목록이 바뀔 때만 새로 만든다(지도는 브라우저에서만 생기므로 document를 써도 된다)
  const markerIds = markers.map((m) => m.id).join("|");
  const slots = useMemo<ReadonlyMap<string, HTMLElement>>(() => {
    if (!map || !markerIds) return new Map();
    return new Map(
      markerIds.split("|").map((id) => [id, document.createElement("div")]),
    );
  }, [map, markerIds]);
  useEffect(() => {
    if (!map) return;
    const handles = markersRef.current.flatMap((m) => {
      const content = slots.get(m.id);
      if (!content) return [];
      return [
        map.addMarker({
          position: offsetToLatLng(ORIGIN, m.at),
          content,
          anchor: m.anchor,
        }),
      ];
    });
    return () => {
      for (const h of handles) h.remove();
    };
  }, [map, slots]);

  // 처음 맞춤: 원 전체가 위 겹침(칩)과 아래 시트 사이 보이는 칸에 들어오게
  useEffect(() => {
    const el = containerRef.current;
    if (!map || !el) return;
    quietUntil.current = performance.now() + QUIET_MS;
    fitInView(
      map,
      el,
      { minX: -radiusM, maxX: radiusM, minY: -radiusM, maxY: radiusM },
      FIT_PADDING_PX,
      { top: fitTop, bottom: fitBottom },
    );
  }, [map, radiusM, fitKey, fitTop, fitBottom]);

  // 클러스터 펼치기: 모인 점들로 다가간다
  const fitToKey = fitTo?.key ?? null;
  const fitPoints = useRef(fitTo?.points ?? null);
  useEffect(() => {
    fitPoints.current = fitTo?.points ?? null;
  });
  useEffect(() => {
    const pts = fitPoints.current;
    const el = containerRef.current;
    if (!map || !el || !fitToKey || !pts || pts.length === 0) return;
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    quietUntil.current = performance.now() + QUIET_MS;
    fitInView(
      map,
      el,
      {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
      },
      CLUSTER_PADDING_PX,
      insetRef.current,
    );
  }, [map, fitToKey]);

  // 고른 식당으로 미끄러지기: 보이는 칸 가운데에 오게
  const focusKey = focus?.key ?? null;
  useEffect(() => {
    if (!map || !focusKey || !focusAt.current) return;
    const { top, bottom } = insetRef.current;
    quietUntil.current = performance.now() + QUIET_MS;
    map.panTo(offsetToLatLng(ORIGIN, focusAt.current));
    if (bottom !== top) map.panBy({ x: 0, y: (bottom - top) / 2 });
  }, [map, focusKey, insetTop, insetBottom]);

  // 고른 마커를 위로: 마커 감싸개(공급자가 만든 요소)의 z-index. 감싸개가 translate로 쌓임 맥락을 만들어
  // 안쪽 z-index는 다른 마커를 넘지 못한다. 실제 구현은 MarkerHandle에 setZIndex를 더한다(T5.27 메모)
  useEffect(() => {
    for (const m of markers) {
      const wrapper = slots.get(m.id)?.parentElement;
      if (wrapper) wrapper.style.zIndex = m.zIndex ? String(m.zIndex) : "";
    }
  });

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
    map.panBy({ x: d[0], y: d[1] });
  }

  return (
    <div className={cn("relative isolate overflow-hidden bg-muted", className)}>
      {status === "loading" ? (
        <div aria-hidden className="absolute inset-0">
          <Skeleton className="absolute inset-0 rounded-none" />
        </div>
      ) : status === "offline" ? (
        <div
          className="absolute inset-0 flex items-start justify-center"
          style={{ paddingTop: inset.top + 16 }}
        >
          <p className="flex items-center gap-2 rounded-chip border border-border bg-card px-3 py-1.5 type-caption text-muted-foreground">
            <WifiOff aria-hidden className="size-4" strokeWidth={1.5} />
            {copy.states.offline.map}
          </p>
        </div>
      ) : (
        <div
          ref={containerRef}
          role="application"
          aria-roledescription="지도"
          aria-label={copy.mapLabel}
          aria-describedby={describedById}
          tabIndex={0}
          onKeyDown={onKeyDown}
          className={cn(
            "absolute inset-0",
            focusRing,
            "focus-visible:outline-offset-[-3px]",
          )}
        />
      )}
      {[...slots].map(([id, slot]) => {
        const m = markers.find((x) => x.id === id);
        return m ? createPortal(m.node, slot, id) : null;
      })}
      {children}
    </div>
  );
}
