"use client";
// 온보딩 지도 (T4.16, T4.17). MapProvider(네이버 구현체)를 이 화면에 들어올 때만 동적으로 불러온다.
//
// 핀 규칙 (ONB-01, D-07 안건 1, AC-ONB-3)
// - 핀은 사용자가 지도를 누르거나(map-tap), 핀을 끌어 놓거나(pin-drag-end), 방향키로 옮긴 뒤 Enter(keyboard-center)로만 생긴다.
//   이 세 동작만 onPinGesture로 올린다. 코드가 지도를 옮겨도(검색, 현위치) 핀은 생기지 않는다.
// - 검색, 현위치 이동은 registerMover로 등록한 함수(panTo)로만 한다. 이 함수는 핀을 건드리지 않는다.
// - 2단계부터는 핀 둘레에 걷는 거리 원(반경 = 도보 분 x 67 ÷ 1.3 m)과 근처 식당 점을 그리고, 원이 다 보이게 물러난다.
// - 지도 로딩 실패는 지도 칸 안에 안내와 다시 시도. 시트(검색, 안내)는 그대로 쓸 수 있다.
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { Skeleton } from "@/components/ui/skeleton";
import { commonCopy } from "@/copy/common";
import { onboardingCopy } from "@/copy/onboarding";
import type { NearbyRestaurant } from "@/lib/kakao/local";
import { DEFAULT_MAP_CENTER } from "@/lib/map/constants";
import type {
  CircleHandle,
  LatLng,
  MapInstance,
  MarkerHandle,
} from "@/lib/map/types";
import { cn } from "@/lib/utils";
import type { PinGesture, UserPinnedLatLng } from "./pin";
import type { MapMover } from "./use-onboarding";

const copy = onboardingCopy.location;
const START_ZOOM = 16;
const PIN_ZOOM = 17;
const KEY_STEP_PX = 80;
const FIT_PADDING_PX = 28;

type Status = "loading" | "ready" | "error";

/** 정적 SVG(사용자 입력 없음): Lucide building-2 */
const BUILDING_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>';

function pinElement(draggable: boolean): HTMLElement {
  const el = document.createElement("div");
  el.className = "ob-pin";
  el.dataset.draggable = String(draggable);
  el.innerHTML = `<span class="ob-pin-head">${BUILDING_SVG}</span><span class="ob-pin-stem"></span><span class="ob-pin-shadow"></span>`;
  return el;
}

function dotElement(inside: boolean): HTMLElement {
  const el = document.createElement("span");
  el.className = "ob-dot";
  el.dataset.inside = String(inside);
  return el;
}

/** 디자인 토큰 색을 읽는다(하드코딩 금지). 지도 SDK의 원은 CSS 변수를 직접 받지 못한다 */
function tokenColor(name: string): string {
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    "currentColor"
  );
}

/** 원(중심, 반지름 m)을 감싸는 사각형 */
function circleBounds(center: LatLng, radius: number) {
  const dLat = radius / 111_320;
  const dLng = radius / (111_320 * Math.cos((center.lat * Math.PI) / 180));
  return {
    sw: { lat: center.lat - dLat, lng: center.lng - dLng },
    ne: { lat: center.lat + dLat, lng: center.lng + dLng },
  };
}

export type OnboardingMapProps = {
  pin: UserPinnedLatLng | null;
  /** 1단계에서만 true: 누르기, 끌기, 키보드로 핀을 놓는다 */
  interactive: boolean;
  /** 걷는 거리 원 반경(m). null이면 원 없음(1단계) */
  radiusM: number | null;
  dots: readonly NearbyRestaurant[];
  onPinGesture: (gesture: PinGesture) => void;
  registerMover: (mover: MapMover | null) => void;
  /** 지도 오른쪽 아래(현위치 버튼) */
  corner?: ReactNode;
  className?: string;
};

export function OnboardingMap({
  pin,
  interactive,
  radiusM,
  dots,
  onPinGesture,
  registerMover,
  corner,
  className,
}: OnboardingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const pinRef = useRef<{
    handle: MarkerHandle;
    el: HTMLElement;
    draggable: boolean;
  } | null>(null);
  const circleRef = useRef<CircleHandle | null>(null);
  const dotsRef = useRef<MarkerHandle[]>([]);
  /** 원이 있으면 크기가 바뀔 때 다시 맞춘다 */
  const fitRef = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);

  // 콜백은 최신 값을 ref로 본다(지도 리스너를 다시 달지 않는다)
  const live = useRef({ interactive, onPinGesture });
  useEffect(() => {
    live.current = { interactive, onPinGesture };
  });

  // 지도 생성
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    let cancelled = false;
    let map: MapInstance | undefined;
    let offAuth: (() => void) | undefined;
    let offClick: (() => void) | undefined;
    let offResize: (() => void) | undefined;

    void (async () => {
      try {
        const { createNaverMapProvider } =
          await import("@/lib/naver/naver-map-provider");
        const provider = createNaverMapProvider();
        await provider.load();
        if (cancelled) return;
        map = provider.createMap(element, {
          center: DEFAULT_MAP_CENTER,
          zoom: START_ZOOM,
        });
        mapRef.current = map;
        offAuth = provider.onAuthFailure(() => {
          if (cancelled) return;
          setStatus("error");
        });
        offClick = map.onClick((position) => {
          if (live.current.interactive)
            live.current.onPinGesture({ kind: "map-tap", position });
        });
        // 시트 높이가 단계마다 바뀐다. 지도 요소 크기를 SDK에 알리고 원을 다시 맞춘다.
        // SDK가 지도 요소에 생성 시점 크기를 인라인으로 박으므로 바깥 틀(부모)의 크기를 본다.
        const frameEl = element.parentElement ?? element;
        let frame = 0;
        const observer = new ResizeObserver(() => {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => {
            const { width, height } = frameEl.getBoundingClientRect();
            if (!map || width === 0 || height === 0) return;
            map.setSize({ width, height });
            fitRef.current?.();
          });
        });
        observer.observe(frameEl);
        offResize = () => {
          cancelAnimationFrame(frame);
          observer.disconnect();
        };
        registerMover((target) => {
          map?.setZoom(PIN_ZOOM);
          map?.panTo(target);
        });
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      registerMover(null);
      offAuth?.();
      offClick?.();
      offResize?.();
      fitRef.current = null;
      pinRef.current = null;
      circleRef.current = null;
      dotsRef.current = [];
      mapRef.current = null;
      map?.destroy();
    };
  }, [attempt, registerMover]);

  // 핀 마커
  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map) return;
    const current = pinRef.current;
    if (!pin) {
      current?.handle.remove();
      pinRef.current = null;
      return;
    }
    if (current && current.draggable === interactive) {
      current.handle.setPosition(pin);
      return;
    }
    current?.handle.remove();
    const el = pinElement(interactive);
    const handle = map.addMarker({
      position: pin,
      content: el,
      anchor: { x: 16, y: 46 },
      title: copy.pinLabel,
      zIndex: 100,
      draggable: interactive,
      onDragStart: () => {
        el.dataset.lifted = "true";
      },
      onDragEnd: (position) => {
        el.dataset.lifted = "false";
        if (live.current.interactive)
          live.current.onPinGesture({ kind: "pin-drag-end", position });
      },
    });
    pinRef.current = { handle, el, draggable: interactive };
  }, [pin, interactive, status]);

  // 걷는 거리 원 + 물러나기
  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map) return;
    if (!pin || radiusM === null) {
      circleRef.current?.remove();
      circleRef.current = null;
      fitRef.current = null;
      return;
    }
    if (circleRef.current) {
      circleRef.current.setCenter(pin);
      circleRef.current.setRadius(radiusM);
    } else {
      circleRef.current = map.addCircle({
        center: pin,
        radius: radiusM,
        strokeColor: tokenColor("--primary"),
        fillColor: tokenColor("--primary"),
        fillOpacity: 0.08,
        strokeOpacity: 0.9,
        strokeWeight: 1.5,
      });
    }
    const fit = () =>
      mapRef.current?.fitBounds(circleBounds(pin, radiusM), FIT_PADDING_PX);
    fitRef.current = fit;
    fit();
  }, [pin, radiusM, status]);

  // 근처 식당 점(세션 메모리 값, 저장하지 않음)
  useEffect(() => {
    const map = mapRef.current;
    for (const d of dotsRef.current) d.remove();
    dotsRef.current = [];
    if (status !== "ready" || !map || radiusM === null) return;
    dotsRef.current = dots.map((d) =>
      map.addMarker({
        position: d.position,
        content: dotElement(d.distance <= radiusM),
        anchor: { x: 4, y: 4 },
        zIndex: 10,
      }),
    );
  }, [dots, radiusM, status]);

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const map = mapRef.current;
    if (!map || !live.current.interactive || e.target !== e.currentTarget)
      return;
    const moves: Record<string, [number, number]> = {
      ArrowUp: [0, -KEY_STEP_PX],
      ArrowDown: [0, KEY_STEP_PX],
      ArrowLeft: [-KEY_STEP_PX, 0],
      ArrowRight: [KEY_STEP_PX, 0],
    };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      map.panBy({ x: move[0], y: move[1] });
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      live.current.onPinGesture({
        kind: "keyboard-center",
        position: map.getCenter(),
      });
    }
  }, []);

  return (
    <div className={cn("isolate overflow-hidden bg-muted", className)}>
      {/* 모바일은 시트가 지도 아래 28px를 덮는다. 네이버 로고와 저작권 표시가 가리지 않게 지도를 그만큼 올린다 */}
      <section
        aria-label={commonCopy.tabs.map}
        className="absolute inset-x-0 top-0 bottom-7 desktop:bottom-0"
      >
        <p id="ob-map-keys" className="sr-only">
          {copy.mapKeysHint}
        </p>
        <div
          role="application"
          aria-label={copy.mapLabel}
          aria-describedby={interactive ? "ob-map-keys" : undefined}
          aria-busy={status === "loading"}
          tabIndex={interactive && status === "ready" ? 0 : -1}
          onKeyDown={onKeyDown}
          data-testid="onboarding-map"
          className="size-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
        >
          {/* 네이버 SDK가 지도 요소에 position: relative를 덮어쓰므로 크기로 채운다 */}
          <div ref={containerRef} className="size-full" />
        </div>
        {status === "loading" ? (
          <div
            role="status"
            aria-label={copy.loading}
            className="absolute inset-0 flex flex-col gap-3 bg-muted p-4"
          >
            <Skeleton className="h-6 w-2/5" />
            <Skeleton className="flex-1" />
          </div>
        ) : null}
        {status === "error" ? (
          <div
            role="alert"
            className="absolute inset-0 flex flex-col items-start justify-end gap-2 bg-card p-6 pb-12 text-card-foreground"
          >
            <p className="type-label">{copy.mapError.title}</p>
            <p className="type-caption break-keep text-muted-foreground">
              {copy.mapError.body}
            </p>
            <button
              type="button"
              onClick={() => {
                setStatus("loading");
                setAttempt((n) => n + 1);
              }}
              className={cn(buttonClass("secondary", "sm"), "mt-1")}
            >
              {onboardingCopy.actions.retry}
            </button>
          </div>
        ) : null}
        {corner && status === "ready" ? (
          <div className="absolute right-3 bottom-10 desktop:right-6 desktop:bottom-12">
            {corner}
          </div>
        ) : null}
      </section>
    </div>
  );
}
