// 디자인 랩 목업 지도 공급자 (T5.1). MapProvider 인터페이스(src/lib/map/types.ts)를 그대로 구현한다.
// 시안 화면은 실제 지도와 같은 코드 경로(provider.load → createMap → addMarker/addCircle/fitBounds/panTo)로 그린다.
// 그래서 시안이 정한 마커(DOM 요소 + React 포털)와 시트 연동을 T5.26~T5.29에서 네이버 구현체로 그대로 옮길 수 있다.
//
// - 지도 SDK를 불러오지 않는다(캡처 안정, 키 없이 동작). 바탕은 토큰 색(var(--…))만 쓴 SVG 길과 건물이다.
// - 좌표: 기준 위경도에서 m로 바꿔(동쪽 x, 남쪽 y) 화면 px = m ÷ (m/px). zoom 16에서 1px = 1.6m, 한 단계마다 두 배.
// - 끌기(포인터)로 움직이고, 6px 미만 이동으로 놓으면 onClick. panTo, fitBounds는 slow 300 standard로 미끄러진다
//   (lab-map.css, 축소 모드면 즉시). onIdle은 끌기가 끝나거나 미끄러짐이 끝날 때 한 번.
// - status "fail"이면 load()가 MapLoadError로 실패한다(지도 로딩 실패 → 목록 보기 T5.32 시연).
import { MapLoadError } from "@/lib/map/errors";
import type {
  Bounds,
  CircleHandle,
  CircleOptions,
  LatLng,
  MapInstance,
  MapOptions,
  MapProvider,
  MarkerHandle,
  MarkerOptions,
} from "@/lib/map/types";

const M_PER_DEG_LAT = 111_320;
const BASE_ZOOM = 16;
const BASE_M_PER_PX = 1.6;
const TAP_SLOP_PX = 6;
const GLIDE_MS = 300;
const SVG_NS = "http://www.w3.org/2000/svg";

/** 바탕 그림 범위(m). 기준점에서 사방 1.6km */
const WORLD_HALF_M = 1600;

export function metersPerPx(zoom: number): number {
  return BASE_M_PER_PX * 2 ** (BASE_ZOOM - zoom);
}

export function zoomForMetersPerPx(mpp: number): number {
  return BASE_ZOOM - Math.log2(mpp / BASE_M_PER_PX);
}

/** 위경도 → 기준점에서 떨어진 m (동쪽 x, 남쪽 y) */
export function toMeters(origin: LatLng, p: LatLng): { x: number; y: number } {
  const mPerDegLng = M_PER_DEG_LAT * Math.cos((origin.lat * Math.PI) / 180);
  return {
    x: (p.lng - origin.lng) * mPerDegLng,
    y: (origin.lat - p.lat) * M_PER_DEG_LAT,
  };
}

export function fromMeters(
  origin: LatLng,
  m: { x: number; y: number },
): LatLng {
  const mPerDegLng = M_PER_DEG_LAT * Math.cos((origin.lat * Math.PI) / 180);
  return {
    lat: origin.lat - m.y / M_PER_DEG_LAT,
    lng: origin.lng + m.x / mPerDegLng,
  };
}

/** 영역이 padding 안쪽에 다 들어가는 zoom (상한 18) */
export function fitZoom(
  origin: LatLng,
  bounds: Bounds,
  size: { width: number; height: number },
  padding: number,
): number {
  const sw = toMeters(origin, bounds.sw);
  const ne = toMeters(origin, bounds.ne);
  const wM = Math.abs(ne.x - sw.x);
  const hM = Math.abs(sw.y - ne.y);
  const w = Math.max(1, size.width - padding * 2);
  const h = Math.max(1, size.height - padding * 2);
  const mpp = Math.max(wM / w, hM / h, metersPerPx(18));
  return zoomForMetersPerPx(mpp);
}

/* ---------- 바탕 그림 (결정적, 토큰 색만) ---------- */

type Road = { d: string; w: number };

function buildRoads(): Road[] {
  const roads: Road[] = [];
  const H = WORLD_HALF_M;
  // 큰길 두 개(가로, 세로), 골목 격자, 사선 하나
  roads.push({ d: `M${-H} 40 H${H}`, w: 22 });
  roads.push({ d: `M-60 ${-H} V${H}`, w: 22 });
  for (const y of [-520, -300, 300, 560, 820]) {
    roads.push({ d: `M${-H} ${y} H${H}`, w: 11 });
  }
  for (const x of [-620, -330, 260, 540, 900]) {
    roads.push({ d: `M${x} ${-H} V${H}`, w: 11 });
  }
  roads.push({ d: `M${-H} 900 L${H} -260`, w: 11 });
  for (const y of [-160, 170, 430]) {
    roads.push({ d: `M-620 ${y} H540`, w: 6 });
  }
  for (const x of [-200, 100, 400]) {
    roads.push({ d: `M${x} -520 V560`, w: 6 });
  }
  return roads;
}

function buildBuildings(): [number, number, number, number][] {
  // 블록마다 작은 건물 몇 개. 의사 난수(고정 시드)라 매번 같은 그림
  let seed = 7;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const xs = [-620, -330, -200, -60, 100, 260, 400, 540];
  const ys = [-520, -300, -160, 40, 170, 300, 430, 560];
  const out: [number, number, number, number][] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const x0 = (xs[i] ?? 0) + 16;
      const x1 = (xs[i + 1] ?? 0) - 16;
      const y0 = (ys[j] ?? 0) + 16;
      const y1 = (ys[j + 1] ?? 0) - 16;
      const n = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < n; k++) {
        const w = Math.max(24, (x1 - x0) * (0.25 + rand() * 0.35));
        const h = Math.max(20, (y1 - y0) * (0.3 + rand() * 0.4));
        const x = x0 + rand() * Math.max(0, x1 - x0 - w);
        const y = y0 + rand() * Math.max(0, y1 - y0 - h);
        out.push([Math.round(x), Math.round(y), Math.round(w), Math.round(h)]);
      }
    }
  }
  return out;
}

const ROADS = buildRoads();
const BUILDINGS = buildBuildings();

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function drawArt(svg: SVGSVGElement) {
  const H = WORLD_HALF_M;
  svg.append(
    el("rect", {
      x: 640,
      y: -900,
      width: 520,
      height: 320,
      rx: 40,
      style: "fill: var(--cat-salad-surface)",
    }),
    el("path", {
      d: `M${-H} 1180 C -700 1080, -300 1240, 200 1120 S 900 1000, ${H} 1060`,
      style:
        "fill: none; stroke: var(--cat-asian-surface); stroke-width: 46; stroke-linecap: round",
    }),
  );
  for (const r of ROADS) {
    svg.append(
      el("path", {
        d: r.d,
        style: `fill: none; stroke: var(--lab-road); stroke-width: ${r.w}; stroke-linecap: round`,
      }),
    );
  }
  for (const [x, y, w, h] of BUILDINGS) {
    svg.append(
      el("rect", {
        x,
        y,
        width: w,
        height: h,
        rx: 5,
        style:
          "fill: var(--lab-building); stroke: var(--border); stroke-width: 1; vector-effect: non-scaling-stroke",
      }),
    );
  }
}

/* ---------- 지도 인스턴스 ---------- */

function createLabMap(element: HTMLElement, options: MapOptions): MapInstance {
  const origin = options.center;
  let center = { x: 0, y: 0 };
  let zoom = options.zoom;
  let destroyed = false;

  element.classList.add("lab-map");
  const world = document.createElement("div");
  world.className = "lab-map-world";
  const art = el("svg", {
    width: WORLD_HALF_M * 2,
    height: WORLD_HALF_M * 2,
    viewBox: `${-WORLD_HALF_M} ${-WORLD_HALF_M} ${WORLD_HALF_M * 2} ${WORLD_HALF_M * 2}`,
    "aria-hidden": "true",
  });
  art.style.position = "absolute";
  art.style.left = `${-WORLD_HALF_M}px`;
  art.style.top = `${-WORLD_HALF_M}px`;
  art.style.overflow = "visible";
  drawArt(art);
  const circles = el("g", {});
  art.append(circles);
  world.append(art);

  const overlay = document.createElement("div");
  overlay.className = "lab-map-overlay";
  element.append(world, overlay);

  const markers = new Set<{ node: HTMLElement; m: { x: number; y: number } }>();
  const clickCbs = new Set<(p: LatLng) => void>();
  const idleCbs = new Set<() => void>();

  const size = () => ({
    width: element.clientWidth,
    height: element.clientHeight,
  });

  function placeMarker(mk: { node: HTMLElement; m: { x: number; y: number } }) {
    const mpp = metersPerPx(zoom);
    mk.node.style.left = `${mk.m.x / mpp}px`;
    mk.node.style.top = `${mk.m.y / mpp}px`;
  }

  function render() {
    const { width, height } = size();
    const mpp = metersPerPx(zoom);
    const tx = width / 2 - center.x / mpp;
    const ty = height / 2 - center.y / mpp;
    world.style.transform = `translate(${tx}px, ${ty}px) scale(${1 / mpp})`;
    overlay.style.transform = `translate(${tx}px, ${ty}px)`;
  }

  let glideTimer: ReturnType<typeof setTimeout> | undefined;
  const fireIdle = () => {
    for (const cb of idleCbs) cb();
  };
  function glide(apply: () => void) {
    element.dataset.glide = "true";
    apply();
    render();
    for (const mk of markers) placeMarker(mk);
    clearTimeout(glideTimer);
    glideTimer = setTimeout(() => {
      if (destroyed) return;
      element.dataset.glide = "false";
      fireIdle();
    }, GLIDE_MS);
  }

  // 끌기
  let drag: {
    id: number;
    sx: number;
    sy: number;
    cx: number;
    cy: number;
    moved: boolean;
  } | null = null;

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-lab-marker]")) return;
    drag = {
      id: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      cx: center.x,
      cy: center.y,
      moved: false,
    };
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.sx;
    const dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < TAP_SLOP_PX) return;
    if (!drag.moved) {
      drag.moved = true;
      element.setPointerCapture(e.pointerId);
      element.dataset.glide = "false";
    }
    const mpp = metersPerPx(zoom);
    center = { x: drag.cx - dx * mpp, y: drag.cy - dy * mpp };
    render();
  };
  const onPointerUp = (e: PointerEvent) => {
    const d = drag;
    drag = null;
    if (!d || d.id !== e.pointerId) return;
    if (d.moved) {
      fireIdle();
      return;
    }
    const rect = element.getBoundingClientRect();
    const mpp = metersPerPx(zoom);
    const at = {
      x: center.x + (e.clientX - rect.left - rect.width / 2) * mpp,
      y: center.y + (e.clientY - rect.top - rect.height / 2) * mpp,
    };
    const p = fromMeters(origin, at);
    for (const cb of clickCbs) cb(p);
  };
  const onPointerCancel = () => {
    drag = null;
  };
  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerup", onPointerUp);
  element.addEventListener("pointercancel", onPointerCancel);

  const ro = new ResizeObserver(() => render());
  ro.observe(element);
  render();

  return {
    setCenter(p) {
      center = toMeters(origin, p);
      render();
    },
    getCenter() {
      return fromMeters(origin, center);
    },
    setZoom(z) {
      zoom = z;
      render();
      for (const mk of markers) placeMarker(mk);
    },
    getZoom() {
      return zoom;
    },
    panTo(p) {
      glide(() => {
        center = toMeters(origin, p);
      });
    },
    setSize() {
      render();
    },
    panBy({ x, y }) {
      const mpp = metersPerPx(zoom);
      glide(() => {
        center = { x: center.x + x * mpp, y: center.y + y * mpp };
      });
    },
    addMarker(opts: MarkerOptions): MarkerHandle {
      const node = document.createElement("div");
      node.className = "lab-map-marker";
      node.dataset.labMarker = "";
      if (opts.anchor) {
        node.style.translate = `${-opts.anchor.x}px ${-opts.anchor.y}px`;
      } else {
        node.style.translate = "-50% -100%";
      }
      if (opts.zIndex !== undefined) node.style.zIndex = String(opts.zIndex);
      if (opts.title) node.title = opts.title;
      if (typeof opts.content === "string") {
        // 정적 문자열만 받는다(MarkerOptions 규칙). 사용자 입력을 섞지 않는다
        node.innerHTML = opts.content;
      } else {
        node.append(opts.content);
      }
      if (opts.onClick) node.addEventListener("click", opts.onClick);
      const mk = { node, m: toMeters(origin, opts.position) };
      markers.add(mk);
      overlay.append(node);
      placeMarker(mk);
      return {
        setPosition(p) {
          mk.m = toMeters(origin, p);
          placeMarker(mk);
        },
        setZIndex(z) {
          node.style.zIndex = String(z);
        },
        remove() {
          markers.delete(mk);
          node.remove();
        },
      };
    },
    addCircle(opts: CircleOptions): CircleHandle {
      const c = el("circle", {});
      const apply = () => {
        const m = toMeters(origin, opts.center);
        c.setAttribute("cx", String(m.x));
        c.setAttribute("cy", String(m.y));
        c.setAttribute("r", String(opts.radius));
        c.setAttribute(
          "style",
          [
            `fill: ${opts.fillColor}`,
            `fill-opacity: ${opts.fillOpacity ?? 0.08}`,
            `stroke: ${opts.strokeColor}`,
            `stroke-opacity: ${opts.strokeOpacity ?? 1}`,
            `stroke-width: ${opts.strokeWeight ?? 1.5}`,
            opts.strokeStyle === "solid" ? "" : "stroke-dasharray: 5 6",
            "vector-effect: non-scaling-stroke",
          ].filter(Boolean).join("; "),
        );
      };
      apply();
      circles.append(c);
      return {
        setCenter(p) {
          opts = { ...opts, center: p };
          apply();
        },
        setRadius(r) {
          opts = { ...opts, radius: r };
          apply();
        },
        remove() {
          c.remove();
        },
      };
    },
    onClick(cb) {
      clickCbs.add(cb);
      return () => clickCbs.delete(cb);
    },
    getBounds() {
      const { width: w, height: h } = size();
      const mpp = metersPerPx(zoom);
      return {
        sw: fromMeters(origin, {
          x: center.x - (w / 2) * mpp,
          y: center.y + (h / 2) * mpp,
        }),
        ne: fromMeters(origin, {
          x: center.x + (w / 2) * mpp,
          y: center.y - (h / 2) * mpp,
        }),
      };
    },
    fitBounds(bounds, padding = 0) {
      const sw = toMeters(origin, bounds.sw);
      const ne = toMeters(origin, bounds.ne);
      const z = fitZoom(origin, bounds, size(), padding);
      glide(() => {
        zoom = z;
        center = { x: (sw.x + ne.x) / 2, y: (sw.y + ne.y) / 2 };
      });
    },
    onIdle(cb) {
      idleCbs.add(cb);
      return () => idleCbs.delete(cb);
    },
    destroy() {
      destroyed = true;
      clearTimeout(glideTimer);
      ro.disconnect();
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("pointercancel", onPointerCancel);
      markers.clear();
      clickCbs.clear();
      idleCbs.clear();
      world.remove();
      overlay.remove();
      element.classList.remove("lab-map");
    },
  };
}

export function createLabMapProvider({
  fail = false,
}: { fail?: boolean } = {}): MapProvider {
  return {
    name: "design-lab",
    load: () =>
      fail
        ? Promise.reject(new MapLoadError("design-lab: 지도 로딩 실패 시연"))
        : Promise.resolve(),
    createMap: createLabMap,
    onAuthFailure: () => () => {},
  };
}
