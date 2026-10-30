"use client";
// 온보딩 시안의 목업 지도 (T4.1). 지도 SDK를 불러오지 않는다(디자인 랩 규칙). 길, 공원, 개울, 건물을 토큰 색 SVG로 그린다.
// - 끌기(포인터)와 방향키로 지도를 움직인다. 누르기(6px 미만 이동)와 Enter, Space는 핀 놓기.
// - mode "tap": 누른 자리에 핀이 생긴다(세계 좌표). mode "center": 핀은 화면 가운데 고정, 지도를 움직여 맞춘다.
// - 검색, 현위치 이동은 glide로 미끄러지듯(slow 300, standard), 끄는 동안은 즉시 따라온다.
// - radiusPx를 주면 핀 둘레에 걷는 거리 원과 그 안의 식당 점을 강조한다(2단계 미리보기).
// 색은 모두 토큰 변수(var(--…))만 쓴다.
import { Building2, WifiOff } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { focusRing } from "@/components/ui/interaction";
import { onboardingLabCopy } from "@/copy/design-lab-onboarding";
import { cn } from "@/lib/utils";
import {
  MOCK_PLACE_DOTS,
  MOCK_SEARCH_RESULTS,
  WORLD,
  type PinMode,
  type Point,
} from "./office";

const copy = onboardingLabCopy.location;
const TAP_SLOP = 6;
const KEY_STEP = 32;

export type MockMapStatus = "ready" | "loading" | "offline";

export type MockMapProps = {
  mode: PinMode;
  center: Point;
  pin: Point | null;
  /** 중심 변화를 미끄러지듯 보여 준다(검색, 현위치). 끌기 중에는 false */
  glide?: boolean;
  /** 끌기와 방향키(사용자 조작) */
  onPan?: (to: Point) => void;
  /** 누르기와 Enter(사용자 조작) */
  onPlace?: (at: Point) => void;
  interactive?: boolean;
  /** 핀 둘레 걷는 거리 원(세계 px). null이면 없음 */
  radiusPx?: number | null;
  /** 식당 점 표시 */
  showDots?: boolean;
  /** 축척(1 = 기본). "fit"이면 걷는 거리 원 전체가 지도 칸에 들어오게 줄인다(최대 1) */
  zoom?: number | "fit";
  /** 지도 위 왼쪽 위 안내 알약 */
  hint?: ReactNode;
  /** 지도 위 오른쪽 아래(현위치 버튼 등) */
  corner?: ReactNode;
  status?: MockMapStatus;
  className?: string;
  hintClassName?: string;
  cornerClassName?: string;
  /** 보조 설명(방향키 안내)의 id */
  describedBy?: string;
};

export function MockMap({
  mode,
  center,
  pin,
  glide = false,
  onPan,
  onPlace,
  interactive = true,
  radiusPx = null,
  showDots = false,
  zoom: zoomProp = 1,
  hint,
  corner,
  status = "ready",
  className,
  hintClassName,
  cornerClassName,
  describedBy,
}: MockMapProps) {
  const drag = useRef<{
    id: number;
    sx: number;
    sy: number;
    cx: number;
    cy: number;
    moved: boolean;
  } | null>(null);
  const [lifted, setLifted] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (!el || zoomProp !== "fit") return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry)
        setBox({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [zoomProp, status]);
  const zoom =
    zoomProp !== "fit"
      ? zoomProp
      : box && radiusPx
        ? Math.min(
            1,
            Math.max(0.3, (Math.min(box.w, box.h) / 2 - 24) / radiusPx),
          )
        : 1;

  if (status === "loading") {
    return (
      <div
        aria-busy="true"
        className={cn(
          "relative overflow-hidden rounded-card border border-border",
          className,
        )}
      >
        <span role="status" className="sr-only">
          {copy.loading}
        </span>
        <Skeleton className="absolute inset-0 rounded-none" />
      </div>
    );
  }

  if (status === "offline") {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-card border border-border bg-muted",
          className,
        )}
      >
        <div className="flex items-center gap-2 type-caption text-muted-foreground">
          <WifiOff aria-hidden className="size-4" strokeWidth={1.5} />
          {copy.mapOffline}
        </div>
      </div>
    );
  }

  function toWorld(e: PointerEvent<HTMLDivElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.round(center.x + (e.clientX - rect.left - rect.width / 2) / zoom),
      y: Math.round(center.y + (e.clientY - rect.top - rect.height / 2) / zoom),
    };
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!interactive || e.button !== 0) return;
    drag.current = {
      id: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      cx: center.x,
      cy: center.y,
      moved: false,
    };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
    if (!d.moved) {
      d.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      if (mode === "center") setLifted(true);
    }
    onPan?.({
      x: Math.round(d.cx - dx / zoom),
      y: Math.round(d.cy - dy / zoom),
    });
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    drag.current = null;
    setLifted(false);
    if (!d || d.id !== e.pointerId || d.moved) return;
    onPlace?.(toWorld(e));
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!interactive) return;
    const move: Record<string, [number, number]> = {
      ArrowUp: [0, -KEY_STEP],
      ArrowDown: [0, KEY_STEP],
      ArrowLeft: [-KEY_STEP, 0],
      ArrowRight: [KEY_STEP, 0],
    };
    const delta = move[e.key];
    if (delta) {
      e.preventDefault();
      onPan?.({ x: center.x + delta[0], y: center.y + delta[1] });
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPlace?.(center);
    }
  }

  const ringOn = radiusPx !== null && pin !== null;
  const counter = 1 / zoom;

  return (
    <div
      ref={boxRef}
      className={cn(
        "relative isolate overflow-hidden rounded-card border border-border bg-muted select-none",
        interactive && "cursor-grab touch-none active:cursor-grabbing",
        className,
      )}
    >
      <div
        role={interactive ? "application" : "img"}
        aria-roledescription={interactive ? "지도" : undefined}
        aria-label={copy.mapLabel}
        aria-describedby={interactive ? describedBy : undefined}
        tabIndex={interactive ? 0 : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
          setLifted(false);
        }}
        onKeyDown={onKeyDown}
        className={cn(
          "absolute inset-0 rounded-[inherit]",
          interactive && focusRing,
          interactive && "focus-visible:outline-offset-[-3px]",
        )}
      >
        <div
          data-glide={glide}
          className="ob-map-world absolute top-1/2 left-1/2 origin-top-left"
          style={{
            width: WORLD.width,
            height: WORLD.height,
            transform: `translate(${-center.x * zoom}px, ${-center.y * zoom}px) scale(${zoom})`,
          }}
        >
          <MapArt labels={zoom >= 0.95} />
          <svg
            aria-hidden
            width={WORLD.width}
            height={WORLD.height}
            className="absolute inset-0"
          >
            {showDots
              ? MOCK_PLACE_DOTS.map((d, i) => {
                  const inside =
                    ringOn &&
                    (d.x - pin.x) ** 2 + (d.y - pin.y) ** 2 <= radiusPx ** 2;
                  return (
                    <circle
                      key={i}
                      cx={d.x}
                      cy={d.y}
                      r={3.5 * Math.max(1, counter * 0.8)}
                      className="ob-map-dot"
                      style={{
                        fill: inside
                          ? "var(--primary)"
                          : "var(--muted-foreground)",
                        opacity: inside ? 0.85 : 0.3,
                      }}
                    />
                  );
                })
              : null}
            {pin ? (
              <circle
                cx={pin.x}
                cy={pin.y}
                r={ringOn ? radiusPx : 0}
                className="ob-map-ring"
                style={{
                  fill: "var(--primary)",
                  fillOpacity: 0.06,
                  stroke: "var(--primary)",
                  strokeWidth: 1.5 * counter,
                  strokeDasharray: `${5 * counter} ${6 * counter}`,
                  opacity: ringOn ? 1 : 0,
                }}
              />
            ) : null}
          </svg>
          {mode === "tap" && pin ? (
            <span
              className="absolute"
              style={{
                left: pin.x,
                top: pin.y,
                transform: `scale(${counter})`,
                transformOrigin: "0 0",
              }}
            >
              <OfficePin />
            </span>
          ) : null}
          {mode === "center" && pin && radiusPx !== null ? (
            <span
              className="absolute"
              style={{
                left: pin.x,
                top: pin.y,
                transform: `scale(${counter})`,
                transformOrigin: "0 0",
              }}
            >
              <OfficePin />
            </span>
          ) : null}
        </div>
      </div>

      {mode === "center" && radiusPx === null ? (
        <span
          data-lifted={lifted}
          className="ob-center-pin pointer-events-none absolute top-1/2 left-1/2"
        >
          <OfficePin hollow={pin === null} />
        </span>
      ) : null}

      {hint ? (
        <div
          className={cn(
            "pointer-events-none absolute top-3 right-3 left-3 flex",
            hintClassName,
          )}
        >
          <p className="rounded-chip border border-border bg-card px-3 py-1.5 type-caption break-keep text-foreground">
            {hint}
          </p>
        </div>
      ) : null}
      {corner ? (
        <div className={cn("absolute right-3 bottom-3", cornerClassName)}>
          {corner}
        </div>
      ) : null}
    </div>
  );
}

/** 회사 핀: 올리브 원 + 건물 아이콘 + 가는 기둥 + 바닥 그림자. 끝이 (0,0)에 닿는다 */
export function OfficePin({ hollow = false }: { hollow?: boolean }) {
  return (
    <span
      aria-hidden
      className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center"
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-full border-[1.5px] border-primary ring-[3px] ring-card",
          hollow
            ? "bg-card text-primary"
            : "bg-primary text-primary-foreground",
        )}
      >
        <Building2 className="size-4" strokeWidth={1.75} />
      </span>
      <span className="h-3 w-[1.5px] bg-primary" />
      <span className="-mt-0.5 h-1 w-3 rounded-full bg-foreground/20" />
    </span>
  );
}

/* ---------- 바탕 그림 ---------- */

const ROADS: readonly {
  d: string;
  w: number;
}[] = [
  { d: "M0 500 H1200", w: 18 },
  { d: "M600 0 V1000", w: 18 },
  { d: "M0 300 H1200", w: 9 },
  { d: "M0 700 H1200", w: 9 },
  { d: "M380 0 V1000", w: 9 },
  { d: "M820 0 V1000", w: 9 },
  { d: "M0 860 L1200 640", w: 9 },
  { d: "M380 400 H820", w: 5 },
  { d: "M500 300 V700", w: 5 },
  { d: "M700 300 V700", w: 5 },
  { d: "M380 600 H820", w: 5 },
  { d: "M120 0 V500", w: 5 },
  { d: "M1000 300 V1000", w: 5 },
];

const LABELS: readonly {
  x: number;
  y: number;
  text: string;
  rotate?: number;
}[] = [
  { x: 236, y: 490, text: "소담로" },
  { x: 610, y: 168, text: "한빛대로", rotate: 90 },
  { x: 900, y: 290, text: "느티길" },
  { x: 1010, y: 618, text: "개울길", rotate: -10 },
];

/** 건물 바닥(결정적 배치). 길과 겹치지 않게 블록 안에만 둔다 */
const BUILDINGS: readonly [number, number, number, number][] = [
  [400, 316, 40, 30],
  [452, 320, 36, 60],
  [516, 318, 70, 34],
  [620, 316, 64, 44],
  [716, 320, 40, 30],
  [764, 318, 44, 64],
  [400, 420, 84, 40],
  [516, 416, 70, 70],
  [620, 412, 30, 70],
  [660, 420, 30, 50],
  [716, 416, 90, 36],
  [400, 516, 40, 70],
  [452, 520, 36, 40],
  [516, 512, 66, 76],
  [620, 516, 60, 40],
  [716, 512, 88, 34],
  [716, 556, 40, 30],
  [400, 616, 84, 34],
  [516, 614, 60, 70],
  [620, 616, 60, 60],
  [716, 618, 44, 60],
  [140, 320, 90, 60],
  [250, 330, 100, 40],
  [140, 520, 60, 90],
  [230, 540, 120, 50],
  [840, 520, 70, 60],
  [930, 516, 50, 90],
  [840, 720, 60, 40],
  [1020, 720, 120, 50],
  [140, 720, 200, 40],
  [400, 720, 90, 40],
  [620, 716, 70, 34],
];

function MapArt({ labels }: { labels: boolean }) {
  return (
    <svg
      aria-hidden
      width={WORLD.width}
      height={WORLD.height}
      viewBox={`0 0 ${WORLD.width} ${WORLD.height}`}
      className="absolute inset-0"
    >
      {/* 공원과 개울 */}
      <rect
        x={850}
        y={110}
        width={260}
        height={170}
        rx={28}
        style={{ fill: "var(--cat-salad-surface)" }}
      />
      <path
        d="M-20 930 C 200 880, 320 960, 520 900 S 860 820, 1220 860"
        style={{
          fill: "none",
          stroke: "var(--cat-asian-surface)",
          strokeWidth: 26,
          strokeLinecap: "round",
        }}
      />
      {/* 길 */}
      {ROADS.map((r) => (
        <path
          key={r.d}
          d={r.d}
          style={{
            fill: "none",
            stroke: "var(--card)",
            strokeWidth: r.w,
            strokeLinecap: "round",
          }}
        />
      ))}
      {/* 건물 */}
      {BUILDINGS.map(([x, y, w, h]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={w}
          height={h}
          rx={4}
          style={{
            fill: "var(--background)",
            stroke: "var(--border)",
            strokeWidth: 1,
          }}
        />
      ))}
      {/* 검색 대상 건물 표시 */}
      {MOCK_SEARCH_RESULTS.map((r) => (
        <g key={r.id}>
          <rect
            x={r.at.x - 5}
            y={r.at.y - 5}
            width={10}
            height={10}
            rx={2}
            style={{ fill: "var(--muted-foreground)", opacity: 0.55 }}
          />
          {labels ? (
            <text
              x={r.at.x + 10}
              y={r.at.y + 4}
              style={{
                fill: "var(--muted-foreground)",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {r.name}
            </text>
          ) : null}
        </g>
      ))}
      {labels
        ? LABELS.map((l) => (
            <text
              key={l.text}
              x={l.x}
              y={l.y}
              transform={
                l.rotate ? `rotate(${l.rotate} ${l.x} ${l.y})` : undefined
              }
              style={{
                fill: "var(--muted-foreground)",
                fontSize: 13,
                letterSpacing: "0.04em",
              }}
            >
              {l.text}
            </text>
          ))
        : null}
    </svg>
  );
}
