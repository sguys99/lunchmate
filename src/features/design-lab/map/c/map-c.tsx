"use client";
// 지도 시안 C "점 마커와 카드 넘기기" (T5.1).
// - 마커: 카테고리 색 점(터치 영역 44). 고른 식당만 그림과 이름이 든 알약으로 펼쳐진다. 지도가 가장 조용하다.
// - 필터: 지도 오른쪽 위 "필터" 버튼 하나 → 필터 시트(Base UI Drawer, 누른 뒤 지연 로딩). 적용 수를 버튼에 보인다.
// - 시트 높이: 바닥 카드 줄(가로로 넘기는 카드, 한 장씩 스냅) ↔ 끝까지(상세 자리) 2단. 카드를 넘기면 마커가 따라
//   바뀌고 지도가 그 식당으로 미끄러진다. 마커를 누르면 카드 줄이 그 카드로 넘어간다. 이전/다음 버튼 필수.
// - 데스크톱: 좌 칸에 같은 카드를 세로로 쌓고, 지도에는 점 마커.
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing } from "@/components/ui/interaction";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonLine } from "@/components/states";
import { mapLabCopy } from "@/copy/design-lab-map";
import { CATEGORY_INK } from "@/features/design-lab/system/b/parts";
import { categoryLabel } from "@/features/place/categories";
import { CategoryIllustration } from "@/features/place/illustrations";
import { useMotionReduced } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { LabMap, type LabMarker } from "../shared/lab-map";
import type { MapLabParams } from "../shared/params";
import {
  BaseChip,
  DetailPlaceholder,
  EmptyBlock,
  ListModeScreen,
  LocateButton,
  MapScreenFrame,
  NumbersInline,
  OfficeMarker,
  OfflineBlock,
  PlaceSummary,
  ResearchButton,
  useScreenSize,
} from "../shared/parts";
import type { MapPlace } from "../shared/places";
import { useMapLab } from "../shared/use-map-lab";
import type { FilterDrawerProps } from "./filter-drawer";

const copy = mapLabCopy;
const DOT_BOX = 44;
/** 카드 줄이 지도를 가리는 높이(카드 + 넘김 줄 + 여백) */
const CAROUSEL_INSET = 264;

const FilterDrawer = dynamic<FilterDrawerProps>(
  () => import("./filter-drawer"),
  { ssr: false },
);

function DotMarker({
  place,
  selected,
  onSelect,
}: {
  place: MapPlace;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "relative flex items-center justify-center rounded-full",
        selected && "z-10",
        focusRing,
      )}
      style={{ width: DOT_BOX, height: DOT_BOX }}
    >
      <span className="sr-only">
        {copy.markerLabel(
          place.name,
          categoryLabel(place.category),
          place.walkMinutes,
        )}
      </span>
      <span
        aria-hidden
        className={cn(
          "ml-marker size-3.5 rounded-full ring-2 ring-card",
          selected && "scale-0",
        )}
        style={{ backgroundColor: `var(--cat-${place.category}-ink)` }}
      />
      {selected ? (
        // 점 자리에서 오른쪽으로 펼쳐지는 알약. 그림 원의 가운데가 좌표에 놓인다
        <span
          aria-hidden
          className="ml-rise absolute top-1/2 left-0.5 flex h-10 -translate-y-1/2 items-center gap-2 rounded-chip border-[1.5px] border-primary bg-card py-1 pr-3.5 pl-1"
        >
          <span
            className="flex size-8 items-center justify-center rounded-full"
            style={{ backgroundColor: `var(--cat-${place.category}-surface)` }}
          >
            <CategoryIllustration slug={place.category} size={24} />
          </span>
          <span className="type-label whitespace-nowrap text-foreground">
            {place.name}
          </span>
        </span>
      ) : null}
    </button>
  );
}

function ClusterDot({ count, onOpen }: { count: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex size-11 items-center justify-center rounded-full",
        focusRing,
      )}
    >
      <span className="sr-only">{copy.clusterLabel(count)}</span>
      <span
        aria-hidden
        className="flex size-7 items-center justify-center rounded-full bg-foreground type-caption font-medium text-background tabular-nums ring-2 ring-card"
      >
        {count}
      </span>
    </button>
  );
}

function PlaceCard({
  place,
  active,
  onActivate,
  onDetail,
  className,
}: {
  place: MapPlace;
  active: boolean;
  onActivate: () => void;
  onDetail: () => void;
  className?: string;
}) {
  return (
    <article
      aria-current={active || undefined}
      aria-label={place.name}
      className={cn(
        "flex flex-col gap-4 rounded-card border bg-card p-5 transition-colors duration-(--lm-duration-fast) ease-standard",
        active ? "border-foreground/30" : "border-border",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onActivate}
          tabIndex={active ? -1 : 0}
          className={cn(
            "flex min-w-0 flex-col gap-1 rounded-sm text-left",
            focusRing,
          )}
        >
          <span className={cn("type-caption", CATEGORY_INK[place.category])}>
            {categoryLabel(place.category)}
          </span>
          <h3 className="truncate type-heading">{place.name}</h3>
        </button>
        <CategoryIllustration
          slug={place.category}
          size={56}
          className="-mt-1 -mr-1 shrink-0"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <NumbersInline place={place} className="type-body-sm" />
        <p className="truncate type-caption text-muted-foreground">
          {place.reason}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          tabIndex={active ? 0 : -1}
          className={cn(
            buttonClass(active ? "primary" : "secondary", "sm"),
            "flex-1",
          )}
        >
          {copy.actions.directions}
        </button>
        <button
          type="button"
          tabIndex={active ? 0 : -1}
          onClick={(e) => {
            e.stopPropagation();
            onDetail();
          }}
          className={buttonClass("secondary", "sm")}
        >
          {copy.actions.detail}
        </button>
      </div>
    </article>
  );
}

function CardSkeletonSmall() {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-4 rounded-card border border-border bg-card p-5"
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <SkeletonLine type="caption" className="w-12" />
          <SkeletonLine type="heading" className="w-36" />
        </div>
        <Skeleton className="size-12 rounded-full" />
      </div>
      <SkeletonLine type="body-sm" className="w-48" />
      <Skeleton className="h-10 w-full rounded-button" />
    </div>
  );
}

export function MapC({ params }: { params: MapLabParams }) {
  const lab = useMapLab(params, {
    snaps: ["half", "full"],
    idleSnap: "half",
    selectSnap: "half",
  });
  const rootRef = useRef<HTMLElement>(null);
  const screen = useScreenSize(rootRef);
  const reduced = useMotionReduced();
  const railRef = useRef<HTMLUListElement>(null);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(params.filterOpen);
  const [drawerLoaded, setDrawerLoaded] = useState(params.filterOpen);

  // C는 늘 한 곳이 골라져 있다(카드 줄의 지금 카드). 아무것도 고르지 않았으면 가장 가까운 곳
  const active = lab.selected ?? lab.places[0] ?? null;
  const activeIndex = active ? lab.places.indexOf(active) : -1;
  const detailOpen = lab.snap === "full" && active !== null;

  // 지금 카드가 바뀌면(마커, 이전/다음) 카드 줄을 그 카드로 넘긴다
  const activeId = active?.id ?? null;
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !activeId) return;
    const card = rail.querySelector<HTMLElement>(`[data-id="${activeId}"]`);
    if (!card) return;
    const left = card.offsetLeft - (rail.clientWidth - card.clientWidth) / 2;
    if (Math.abs(rail.scrollLeft - left) < 4) return;
    rail.scrollTo({ left, behavior: reduced ? "auto" : "smooth" });
  }, [activeId, reduced]);

  useEffect(() => {
    if (detailOpen) detailHeadingRef.current?.focus({ preventScroll: true });
  }, [detailOpen]);

  // 손으로 넘기면 멈춘 자리의 카드를 고른다
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  function onRailScroll() {
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      const rail = railRef.current;
      if (!rail) return;
      const mid = rail.scrollLeft + rail.clientWidth / 2;
      let best: { id: string; d: number } | null = null;
      for (const el of rail.querySelectorAll<HTMLElement>("[data-id]")) {
        const d = Math.abs(el.offsetLeft + el.clientWidth / 2 - mid);
        if (!best || d < best.d) best = { id: el.dataset.id ?? "", d };
      }
      if (best && best.id !== activeId) lab.select(best.id);
    }, 120);
  }

  function step(dir: -1 | 1) {
    const next = lab.places[activeIndex + dir];
    if (next) lab.select(next.id);
  }

  function openFilters() {
    setDrawerLoaded(true);
    setDrawerOpen(true);
  }

  if (lab.mapFailed) {
    return (
      <ListModeScreen
        rootRef={rootRef}
        places={lab.places}
        selectedId={lab.selectedId}
        onSelect={(id) => lab.select(id)}
        onRetry={lab.retryMap}
      />
    );
  }

  const markers: LabMarker[] = [
    {
      id: "__office",
      at: { x: 0, y: 0 },
      zIndex: 5,
      node: <OfficeMarker />,
    },
    ...lab.groups.singles.map((p) => ({
      id: p.id,
      at: p.at,
      zIndex: p.id === activeId ? 10 : undefined,
      anchor: { x: DOT_BOX / 2, y: DOT_BOX / 2 },
      node: (
        <DotMarker
          place={p}
          selected={p.id === activeId && !lab.empty}
          onSelect={() => lab.select(p.id)}
        />
      ),
    })),
    ...(lab.groups.cluster
      ? [
          {
            id: "__cluster",
            at: lab.groups.cluster.at,
            anchor: { x: 22, y: 22 },
            node: (
              <ClusterDot
                count={lab.groups.cluster.ids.length}
                onOpen={lab.openCluster}
              />
            ),
          },
        ]
      : []),
  ];

  const filterButton = (
    <button
      type="button"
      onClick={openFilters}
      aria-haspopup="dialog"
      aria-label={
        lab.filterCount > 0
          ? copy.filters.openWithCount(lab.filterCount)
          : copy.filters.open
      }
      className={cn(
        "inline-flex h-11 items-center gap-1.5 rounded-chip border bg-card px-4 type-label",
        lab.filterCount > 0
          ? "border-primary text-primary ring-[0.5px] ring-primary ring-inset"
          : "border-border text-foreground",
        focusRing,
      )}
    >
      <SlidersHorizontal aria-hidden className="size-4" strokeWidth={1.75} />
      <span aria-hidden>{copy.filters.open}</span>
      {lab.filterCount > 0 ? (
        <span
          aria-hidden
          className="flex size-5 items-center justify-center rounded-full bg-primary type-caption text-primary-foreground tabular-nums"
        >
          {lab.filterCount}
        </span>
      ) : null}
    </button>
  );

  const map = (
    <LabMap
      key={lab.mapAttempt}
      providerKind={lab.provider}
      fail={lab.failMap}
      status={lab.mapStatus}
      radiusM={lab.radiusM}
      markers={lab.loading || lab.offline ? [] : markers}
      focus={
        lab.selected ? { key: lab.selected.id, at: lab.selected.at } : null
      }
      inset={{
        top: screen.desktop ? 72 : 112,
        bottom: screen.desktop ? 0 : CAROUSEL_INSET,
      }}
      fitKey={`${lab.fitKey}-${screen.desktop}`}
      fitTo={
        lab.clusterFit && lab.groups.cluster === null
          ? {
              key: lab.clusterFit,
              points: lab.places
                .filter((p) => p.id.startsWith("alley-"))
                .map((p) => p.at),
            }
          : null
      }
      onMoved={() => lab.setMoved(true)}
      onFailed={lab.onMapFailed}
      describedById="map-c-keys"
      className="size-full"
    >
      <p id="map-c-keys" className="sr-only">
        {copy.mapKeysHint}
      </p>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 px-(--lm-layout-gutter) pt-3 desktop:px-6 desktop:pt-6">
        <div className="pointer-events-auto flex items-center justify-between gap-2">
          <BaseChip />
          <div className="desktop:hidden">{filterButton}</div>
        </div>
        <div className="flex items-start justify-between">
          <span />
          {lab.moved ? (
            <ResearchButton
              onClick={lab.research}
              className="pointer-events-auto"
            />
          ) : (
            <span />
          )}
          <LocateButton
            onClick={() => lab.setAnnounce(copy.myLocationDone)}
            className="pointer-events-auto"
          />
        </div>
      </div>
    </LabMap>
  );

  // 카드 줄(모바일) 또는 카드 목록(데스크톱) 자리의 상태
  let stateCard: React.ReactNode = null;
  if (lab.offline) stateCard = <OfflineBlock onRetry={lab.retryOnline} />;
  else if (lab.empty)
    stateCard = (
      <EmptyBlock
        filtered={lab.filteredEmpty}
        walkLimit={lab.walkLimit}
        expandTo={15}
        onExpand={lab.expand}
        onReset={lab.resetFilters}
      />
    );

  const detail = active ? (
    <div className="flex flex-col gap-8">
      <PlaceSummary
        key={active.id}
        place={active}
        headingRef={detailHeadingRef}
        onDetail={() => {}}
        compact
      />
      <DetailPlaceholder />
    </div>
  ) : null;

  const counter =
    active && !lab.empty ? (
      <p className="type-caption text-muted-foreground tabular-nums">
        {copy.carousel.position(activeIndex + 1, lab.places.length)}
      </p>
    ) : null;

  const stepButtons = (
    <div className="flex gap-2">
      {([-1, 1] as const).map((dir) => {
        const disabled =
          dir === -1 ? activeIndex <= 0 : activeIndex >= lab.places.length - 1;
        return (
          <button
            key={dir}
            type="button"
            onClick={() => !disabled && step(dir)}
            aria-disabled={disabled || undefined}
            aria-label={dir === -1 ? copy.actions.prev : copy.actions.next}
            className={cn(
              "inline-flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground aria-disabled:opacity-40",
              focusRing,
            )}
          >
            {dir === -1 ? (
              <ChevronLeft aria-hidden className="size-5" strokeWidth={1.5} />
            ) : (
              <ChevronRight aria-hidden className="size-5" strokeWidth={1.5} />
            )}
          </button>
        );
      })}
    </div>
  );

  const mobileSheet = (
    <>
      {/* 바닥 카드 줄 */}
      <section
        aria-label={copy.carousel.label}
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 pb-3",
          detailOpen && "invisible",
        )}
      >
        <h2 className="sr-only">{copy.carousel.label}</h2>
        {lab.loading ? (
          <div aria-busy="true" className="px-(--lm-layout-gutter)">
            <span role="status" className="sr-only">
              {copy.states.loading}
            </span>
            <CardSkeletonSmall />
          </div>
        ) : stateCard ? (
          <div className="mx-(--lm-layout-gutter) rounded-card border border-border bg-card px-5 pt-2 pb-6">
            {stateCard}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-(--lm-layout-gutter)">
              <span className="rounded-chip bg-card/90 px-2 py-0.5">
                {counter}
              </span>
              {stepButtons}
            </div>
            <ul
              ref={railRef}
              onScroll={onRailScroll}
              className="flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto px-(--lm-layout-gutter)"
            >
              {lab.places.map((p) => (
                <li
                  key={p.id}
                  data-id={p.id}
                  className="w-[min(20rem,calc(100%-3rem))] shrink-0 snap-center"
                >
                  <PlaceCard
                    place={p}
                    active={p.id === activeId}
                    onActivate={() => lab.select(p.id)}
                    onDetail={() => lab.select(p.id, "full")}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* 끝까지 열림: 상세 자리 */}
      {detailOpen ? (
        <section
          aria-label={copy.sheet.label}
          className="ml-rise absolute inset-x-0 top-2 bottom-0 z-30 flex flex-col rounded-t-sheet bg-popover shadow-sheet"
        >
          <div className="flex shrink-0 items-center justify-between px-(--lm-layout-gutter) pt-2">
            <span aria-hidden className="h-1 w-9 rounded-full bg-border" />
            <button
              type="button"
              onClick={() => lab.setSnap("half")}
              aria-label={copy.actions.close}
              className={cn(
                "-mr-2 inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted",
                focusRing,
              )}
            >
              <X aria-hidden className="size-5" strokeWidth={1.5} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-(--lm-layout-gutter) pt-2">
            {detail}
          </div>
        </section>
      ) : null}
    </>
  );

  const desktopPanel = (
    <section
      aria-label={copy.sheet.label}
      className="flex h-full min-h-0 flex-col bg-background"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-10 pt-10 pb-5">
        {detailOpen ? (
          <button
            type="button"
            onClick={() => lab.setSnap("half")}
            className={cn(
              "-ml-2 inline-flex h-11 items-center gap-1 rounded-button pr-3 pl-1 type-label text-muted-foreground hover:text-foreground",
              focusRing,
            )}
          >
            <ChevronLeft aria-hidden className="size-5" strokeWidth={1.5} />
            {copy.list.back}
          </button>
        ) : (
          <h2 className="type-label">
            {lab.loading || lab.offline
              ? copy.list.title
              : copy.count(lab.walkLimit, lab.places.length)}
          </h2>
        )}
        {filterButton}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-10 pb-10">
        {lab.loading ? (
          <div aria-busy="true" className="flex flex-col gap-3">
            <span role="status" className="sr-only">
              {copy.states.loading}
            </span>
            <CardSkeletonSmall />
            <CardSkeletonSmall />
          </div>
        ) : stateCard ? (
          stateCard
        ) : detailOpen ? (
          detail
        ) : (
          <ul className="flex flex-col gap-3">
            {lab.places.map((p) => (
              <li key={p.id}>
                <PlaceCard
                  place={p}
                  active={p.id === activeId}
                  onActivate={() => lab.select(p.id)}
                  onDetail={() => lab.select(p.id, "full")}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );

  return (
    <>
      <MapScreenFrame
        rootRef={rootRef}
        map={map}
        sheet={screen.desktop ? desktopPanel : mobileSheet}
      />
      {drawerLoaded ? (
        <FilterDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          filters={lab.filters}
          categories={lab.categories}
          resultCount={lab.places.length}
          onToggle={lab.toggleFilter}
          onCategory={lab.setCategory}
          onReset={lab.resetFilters}
        />
      ) : null}
      <p aria-live="polite" className="sr-only">
        {lab.announce}
      </p>
    </>
  );
}
