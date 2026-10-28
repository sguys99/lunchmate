"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { mapCopy } from "@/copy/map";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/lib/map/constants";
import { classifyMapError, type MapErrorKind } from "@/lib/map/errors";
import type { LatLng, MapInstance, MapProvider } from "@/lib/map/types";
import { cn } from "@/lib/utils";

type Status =
  | { type: "loading" }
  | { type: "ready" }
  | { type: "error"; kind: MapErrorKind };

export type MapViewProps = {
  provider: MapProvider;
  center?: LatLng;
  zoom?: number;
  /** 지도가 만들어지면 호출한다. 마커 추가 등 후속 기능이 쓴다 */
  onReady?: (map: MapInstance) => void;
  className?: string;
};

/** 지도 영역. SDK 는 이 컴포넌트가 마운트될 때만 불러온다. */
export function MapView({
  provider,
  center = DEFAULT_MAP_CENTER,
  zoom = DEFAULT_MAP_ZOOM,
  onReady,
  className,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>({ type: "loading" });
  const [attempt, setAttempt] = useState(0);
  // 초기 중심, 확대는 생성 시점 값만 쓴다. 이후 변경은 MapInstance 로 한다.
  const initial = useRef({ center, zoom, onReady });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    let cancelled = false;
    let map: MapInstance | undefined;
    let unsubscribeAuth: (() => void) | undefined;

    provider
      .load()
      .then(() => {
        if (cancelled) return;
        map = provider.createMap(element, {
          center: initial.current.center,
          zoom: initial.current.zoom,
        });
        unsubscribeAuth = provider.onAuthFailure(() => {
          if (cancelled) return;
          map?.destroy();
          map = undefined;
          setStatus({ type: "error", kind: "auth" });
        });
        if (cancelled || !map) return;
        setStatus({ type: "ready" });
        initial.current.onReady?.(map);
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setStatus({ type: "error", kind: classifyMapError(error) });
      });

    return () => {
      cancelled = true;
      unsubscribeAuth?.();
      map?.destroy();
    };
  }, [provider, attempt]);

  const retry = () => {
    setStatus({ type: "loading" });
    setAttempt((n) => n + 1);
  };

  return (
    <div
      role="region"
      aria-label={mapCopy.mapLabel}
      aria-busy={status.type === "loading"}
      tabIndex={0}
      className={cn(
        "relative h-96 w-full overflow-hidden rounded-lg border border-border bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      {/* 네이버 SDK가 지도 요소에 position: relative를 인라인으로 덮어쓰므로 absolute 대신 크기로 채운다 */}
      <div ref={containerRef} className="size-full" />
      {status.type === "loading" && <MapSkeleton />}
      {status.type === "error" && (
        <MapError kind={status.kind} onRetry={retry} />
      )}
    </div>
  );
}

function MapSkeleton() {
  return (
    <div
      role="status"
      aria-label={mapCopy.loadingLabel}
      className="absolute inset-0 flex flex-col gap-3 bg-muted p-4"
    >
      <div className="h-8 w-2/5 rounded-md bg-border motion-safe:animate-pulse" />
      <div className="flex-1 rounded-md bg-accent motion-safe:animate-pulse" />
      <div className="h-10 w-full rounded-md bg-border motion-safe:animate-pulse" />
    </div>
  );
}

function MapError({
  kind,
  onRetry,
}: {
  kind: MapErrorKind;
  onRetry: () => void;
}) {
  const text = mapCopy.error[kind];
  return (
    <div
      role="alert"
      className="absolute inset-0 flex flex-col items-start justify-end gap-2 bg-card p-6 text-card-foreground"
    >
      <h2 className="text-lg font-semibold">{text.title}</h2>
      <p className="text-sm text-muted-foreground">{text.body}</p>
      {kind === "load" && (
        <Button variant="outline" className="mt-2 min-h-11" onClick={onRetry}>
          {mapCopy.retry}
        </Button>
      )}
    </div>
  );
}
