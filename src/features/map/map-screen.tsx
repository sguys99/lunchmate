"use client";
// 지도 탭 화면 (T5.26~T5.32, D-09 B + 고른 마커에 A의 그림, DESIGN.md 5장 "지도", PRD MAP-01~06).
//
// 모바일: 지도가 탭 바 위 전체를 채우고, 지도 위에는 기준 위치 칩과 현위치 버튼(그리고 옮긴 뒤 "이 지역에서 다시 찾기")만.
//   필터 칩과 목록은 지도 칸 안 2단 시트(반쯤, 끝까지)에 있다. 마커를 고르면 반쯤 높이에 상세 요약, 끝까지면 상세 본문.
// 데스크톱(1024 이상): 좌 칸에 시트 내용(개수, 칩, 목록 또는 상세), 우 지도는 (app)/@map/map 슬롯 자리로 포털한다.
// 지도 SDK 로딩 실패: 목록 보기로 자동 전환(T5.32). 카카오까지 실패하면 오류 블록.
// 모션은 CSS만(map.css). 축소 모드면 지도 이동도 즉시.
import { ChevronLeft, WifiOff } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { focusRing } from "@/components/ui/interaction";
import { mapCopy } from "@/copy/map";
import { useLoginPrompt } from "@/features/auth/login-prompt";
import {
  PlaceDetail,
  PlaceDetailActions,
  PlaceDetailBody,
  type PlaceDetailProps,
} from "@/features/place/detail";
import { EMPTY_PLACE_STATS } from "@/features/place/detail-model";
import { useReducedMotion } from "@/features/rec/use-reduced-motion";
import { naverPlaceSearchUrl } from "@/lib/naver/directions";
import { cn } from "@/lib/utils";
import { useDesktopMapTarget } from "./desktop-slot";
import type { MapData } from "./load-map";
import {
  MapCanvas,
  type CanvasCircle,
  type CanvasMarker,
  type MapProviderKind,
} from "./map-canvas";
import { HALF_RATIO, MapSheet } from "./map-sheet";
import {
  BaseChip,
  BaseMarker,
  ClusterPill,
  EmptyBlock,
  FilterChipRow,
  HeaderSkeleton,
  KakaoErrorBlock,
  ListLoading,
  LoadFailedBlock,
  LocateButton,
  MapFailedNote,
  NeedLocationBlock,
  OfflineBlock,
  PlaceList,
  ResearchButton,
  WalkPill,
} from "./parts";
import type { MapPlace } from "./places";
import { useMapScreen, type MapScreenState } from "./use-map-screen";
import "./map.css";

const copy = mapCopy;
const DESKTOP_QUERY = "(min-width: 64rem)";
/** 지도 위 칩 줄이 가리는 높이(위 12 + 칩 44 + 여유 8) */
const TOP_INSET_PX = 64;
const KEYS_HINT_ID = "lm-map-keys";

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

function useElementHeight(ref: React.RefObject<HTMLElement | null>) {
  const [h, setH] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      if (e) setH(e.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return h;
}

function baseName(s: MapScreenState): string {
  return s.base.kind === "office" ? s.base.office.name : copy.base.here;
}

function detailProps(s: MapScreenState, place: MapPlace): PlaceDetailProps {
  const b = s.base;
  return {
    place: {
      id: place.id,
      placeUrl: place.placeUrl,
      category: place.category,
      name: place.name,
      address: place.address,
      phone: place.phone,
      position: place.position,
      walkMinutes: place.walkMinutes,
      reason: null,
    },
    stats: EMPTY_PLACE_STATS,
    meal: s.meal,
    budgetKRW: s.budgetKRW,
    source: "map",
    origin: b.center
      ? b.kind === "office"
        ? { kind: "office", name: b.office.name, position: b.center }
        : { kind: "current", name: copy.base.here, position: b.center }
      : null,
    headingLevel: "h2",
  };
}

export function MapScreen({
  data,
  providerKind,
}: {
  data: MapData;
  providerKind: MapProviderKind;
}) {
  const s = useMapScreen(data);
  const router = useRouter();
  const login = useLoginPrompt();
  const desktop = useDesktop();
  const reduced = useReducedMotion();
  const desktopTarget = useDesktopMapTarget();
  const stageRef = useRef<HTMLDivElement>(null);
  const stageH = useElementHeight(stageRef);
  const detailRef = useRef<HTMLDivElement>(null);

  // 식당을 고르면 상세 제목으로 초점을 옮긴다(지도 조작의 대체 수단, DESIGN.md 5장 접근성)
  const selectedId = s.selected?.id ?? null;
  useEffect(() => {
    if (!selectedId) return;
    const h = detailRef.current?.querySelector<HTMLElement>("h2");
    if (!h) return;
    h.tabIndex = -1;
    h.focus({ preventScroll: true });
  }, [selectedId]);

  function onToggleFilter(key: Parameters<MapScreenState["toggleFilter"]>[0]) {
    // 즐겨찾기는 로그인한 사용자만(둘러보기는 로그인 유도)
    if (key === "favorites" && !data.signedIn) {
      login.prompt("save");
      return;
    }
    s.toggleFilter(key);
  }

  /* ---------- 화면 전체 상태 ---------- */

  const naverHref = naverPlaceSearchUrl(
    copy.states.kakaoError.naverQuery,
    s.base.kind === "office" ? s.base.center : null,
  );
  let full: ReactNode = null;
  if (s.mode === "loadFailed")
    full = <LoadFailedBlock onRetry={() => router.refresh()} />;
  else if (s.mode === "needLocation" && s.needReason)
    full = (
      <NeedLocationBlock
        reason={s.needReason}
        signedIn={data.signedIn}
        onRetry={() => void s.locateBase()}
        onSaveOffice={() => login.prompt("save")}
      />
    );
  else if (s.mode === "offline") full = <OfflineBlock />;
  else if (s.mode === "kakaoError")
    full = (
      <KakaoErrorBlock
        naverHref={naverHref}
        onRetry={() => void s.query.refetch()}
      />
    );

  if (full) {
    return (
      <Frame announce={s.announce} loginSheet={login.sheet} list>
        <div className="flex flex-col px-(--lm-layout-gutter) pt-10 pb-8 desktop:px-10 desktop:pt-14">
          {full}
        </div>
      </Frame>
    );
  }

  /* ---------- 시트 머리와 본문 ---------- */

  const header = (
    <SheetHeader s={s} onToggleFilter={onToggleFilter} />
  );
  const body = <SheetBody s={s} detailRef={detailRef} />;

  /* ---------- 지도 실패: 목록 보기 (T5.32) ---------- */

  if (s.mode === "list") {
    return (
      <Frame announce={s.announce} loginSheet={login.sheet} list>
        <div className="flex flex-col gap-6 px-(--lm-layout-gutter) pt-6 pb-8 desktop:px-10 desktop:pt-14">
          <MapFailedNote onRetry={() => s.dispatchMap("retry")} />
          {s.selected ? (
            <div ref={detailRef} className="flex flex-col gap-2">
              <BackButton onClick={() => s.select(null)} />
              <PlaceDetail
                {...detailProps(s, s.selected)}
                footerClassName="bottom-[calc(var(--lm-layout-tab-bar-height)+env(safe-area-inset-bottom,0px))] bg-background"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <SheetHeader s={s} onToggleFilter={onToggleFilter} inline />
              {body}
            </div>
          )}
        </div>
        {desktopTarget
          ? createPortal(
              <div className="flex size-full items-center justify-center">
                <p className="type-caption text-muted-foreground">
                  {copy.states.mapError.pane}
                </p>
              </div>,
              desktopTarget,
            )
          : null}
      </Frame>
    );
  }

  /* ---------- 지도 + 시트 ---------- */

  const inset = desktop
    ? { top: 72, bottom: 0 }
    : { top: TOP_INSET_PX, bottom: Math.round(stageH * HALF_RATIO) };

  const canvas = (
    <MapLayer s={s} inset={inset} reduced={reduced} providerKind={providerKind} desktop={desktop} />
  );

  return (
    <Frame announce={s.announce} loginSheet={login.sheet}>
      <div
        ref={stageRef}
        className="relative h-[calc(100dvh-var(--lm-layout-tab-bar-height)-env(safe-area-inset-bottom,0px)-env(safe-area-inset-top,0px))] min-h-[30rem] overflow-hidden desktop:flex desktop:h-auto desktop:min-h-0 desktop:flex-1 desktop:flex-col desktop:overflow-visible"
      >
        {desktop ? (
          desktopTarget ? createPortal(canvas, desktopTarget) : null
        ) : (
          <div className="absolute inset-0">{canvas}</div>
        )}
        <MapSheet
          snap={s.snap}
          onSnapChange={s.setSnap}
          desktop={desktop}
          header={header}
          footer={
            s.selected ? (
              <PlaceDetailActions {...detailProps(s, s.selected)} />
            ) : null
          }
          bodyClassName="px-(--lm-layout-gutter) desktop:px-10"
        >
          {body}
        </MapSheet>
      </div>
    </Frame>
  );
}

/* ---------- 틀 ---------- */

function Frame({
  children,
  announce,
  loginSheet,
  list = false,
}: {
  children: ReactNode;
  announce: string;
  loginSheet: ReactNode;
  list?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col",
        list && "mx-auto w-full max-w-(--lm-layout-max-width) desktop:max-w-none",
      )}
    >
      <h1 className="sr-only">{copy.screenTitle}</h1>
      <p id={KEYS_HINT_ID} className="sr-only">
        {copy.mapKeysHint}
      </p>
      {children}
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
      {loginSheet}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "-ml-2 inline-flex h-11 items-center gap-1 self-start rounded-button pr-3 pl-1 type-label text-muted-foreground hover:text-foreground",
        focusRing,
      )}
    >
      <ChevronLeft aria-hidden className="size-5" strokeWidth={1.5} />
      {copy.sheet.back}
    </button>
  );
}

function SheetHeader({
  s,
  onToggleFilter,
  inline = false,
}: {
  s: MapScreenState;
  /** 목록 보기(T5.32)처럼 바깥이 여백을 이미 가진 곳 */
  inline?: boolean;
  onToggleFilter: (key: Parameters<MapScreenState["toggleFilter"]>[0]) => void;
}) {
  const wrap = inline
    ? "flex flex-col gap-3 pb-3 desktop:gap-5"
    : "flex flex-col gap-3 px-(--lm-layout-gutter) pb-3 desktop:gap-5 desktop:px-10 desktop:pt-14 desktop:pb-4";
  if (s.selected) {
    return (
      <div className={wrap}>
        <BackButton onClick={() => s.select(null)} />
      </div>
    );
  }
  if (s.loadingPlaces) {
    return (
      <div className={wrap}>
        <HeaderSkeleton />
      </div>
    );
  }
  const emptyInRadius = s.places.length === 0;
  return (
    <div className={wrap}>
      <div className="flex items-baseline justify-between gap-3 pt-1">
        <h2 className="type-label">
          {s.filterCount > 0
            ? copy.countFiltered(s.filtered.length)
            : copy.count(s.walk, s.places.length, s.capped)}
        </h2>
        <span className="shrink-0 type-caption text-muted-foreground">
          {copy.sortHint}
        </span>
      </div>
      {!s.online ? (
        <p className="flex items-center gap-1.5 type-caption text-muted-foreground">
          <WifiOff aria-hidden className="size-3.5" strokeWidth={1.5} />
          {copy.states.offline.stale}
        </p>
      ) : null}
      {/* 걷는 거리 안에 0곳이면 칩은 소용이 없어 숨긴다(필터로 0곳일 때는 남김) */}
      {emptyInRadius ? null : (
        <FilterChipRow
          filters={s.filters}
          onToggle={onToggleFilter}
          categoryOpen={s.categoryOpen}
          onCategoryOpen={s.setCategoryOpen}
          categories={s.categories}
          onCategory={s.setCategory}
        />
      )}
    </div>
  );
}

function SheetBody({
  s,
  detailRef,
}: {
  s: MapScreenState;
  detailRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (s.loadingPlaces)
    return (
      <ListLoading
        label={s.mode === "locating" ? copy.states.locating : undefined}
      />
    );
  if (s.selected) {
    return (
      <div ref={detailRef} key={s.selected.id} className="lm-map-rise">
        <PlaceDetailBody {...detailProps(s, s.selected)} />
      </div>
    );
  }
  if (s.filtered.length === 0) {
    const filtered = s.places.length > 0;
    return (
      <div className="pt-2 pb-8">
        <EmptyBlock
          filtered={filtered}
          walk={s.walk}
          expandTo={s.expandTo}
          onExpand={s.expand}
          onReset={s.resetFilters}
        />
      </div>
    );
  }
  return (
    <div className="pb-8">
      <PlaceList
        places={s.filtered}
        selectedId={null}
        onSelect={(id) => s.select(id)}
      />
    </div>
  );
}

/* ---------- 지도 칸 ---------- */

function MapLayer({
  s,
  inset,
  reduced,
  providerKind,
  desktop,
}: {
  s: MapScreenState;
  inset: { top: number; bottom: number };
  reduced: boolean;
  providerKind: MapProviderKind;
  desktop: boolean;
}) {
  const base = s.base;
  const circles: CanvasCircle[] = [];
  if (base.center)
    circles.push({
      id: "base",
      center: base.center,
      radiusM: s.radiusM,
      tone: "base",
    });
  if (s.area)
    circles.push({
      id: "area",
      center: s.area,
      radiusM: s.radiusM,
      tone: "area",
    });

  const markers: CanvasMarker[] = [];
  if (base.center)
    markers.push({
      id: "__base",
      position: base.center,
      zIndex: 1,
      node: <BaseMarker kind={base.kind} />,
    });
  const byId = new Map(s.filtered.map((p) => [p.id, p]));
  for (const g of s.groups) {
    if (g.kind === "single") {
      const p = byId.get(g.id);
      if (!p) continue;
      const selected = p.id === s.selected?.id;
      markers.push({
        id: p.id,
        position: p.position,
        zIndex: selected ? 100 : 10,
        node: (
          <WalkPill
            place={p}
            selected={selected}
            onSelect={() => s.select(p.id)}
          />
        ),
      });
    } else {
      markers.push({
        id: `__cluster:${g.ids.join(",")}`,
        position: g.position,
        zIndex: 20,
        node: (
          <ClusterPill count={g.ids.length} onOpen={() => s.openCluster(g.ids)} />
        ),
      });
    }
  }

  const focus = s.selected
    ? { key: s.selected.id, position: s.selected.position }
    : null;

  return (
    <MapCanvas
      key={s.mapLoad.attempt}
      providerKind={providerKind}
      initialCenter={s.searchCenter ?? base.center ?? { lat: 37.5665, lng: 126.978 }}
      circles={circles}
      markers={s.loadingPlaces ? markers.slice(0, 1) : markers}
      fit={s.fit}
      focus={focus}
      moveTo={s.moveTo}
      inset={inset}
      reducedMotion={reduced}
      onLoaded={() => s.dispatchMap("loaded")}
      onFailed={() => s.dispatchMap("failed")}
      onUserMoved={s.onUserMoved}
      onView={s.setView}
      onMapTap={() => {
        if (s.selected) s.select(null);
      }}
      describedById={KEYS_HINT_ID}
      className="size-full"
    >
      {s.mapLoad.status === "loading" ? (
        <Skeleton aria-hidden className="absolute inset-0 z-[1] rounded-none" />
      ) : null}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 px-(--lm-layout-gutter) pt-3",
          desktop && "px-6 pt-6",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="pointer-events-auto flex min-w-0 flex-1">
            {base.center ? (
              <BaseChip
                name={baseName(s)}
                kind={base.kind}
                onReturn={s.area ? s.returnToBase : null}
              />
            ) : null}
          </div>
          <div className="pointer-events-auto">
            <LocateButton
              onClick={() => void s.moveToHere()}
              busy={s.locating}
            />
          </div>
        </div>
        {s.showResearch && s.online ? (
          <div className="pointer-events-auto flex justify-center">
            <ResearchButton onClick={s.research} />
          </div>
        ) : null}
      </div>
    </MapCanvas>
  );
}
