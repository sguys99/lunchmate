"use client";
// 지도 시안 B "도보 분 알약과 2단 시트" (T5.1).
// - 마커: 도보 분 숫자 알약("4분"). 왼쪽 점이 카테고리 색. 고르면 올리브 면으로 바뀌고 식당 이름이 펼쳐진다.
//   숫자가 주인공인 디자인(DESIGN.md 9장)을 지도까지 잇는다. 그림은 시트 안 목록과 요약에서만.
// - 필터 칩: 시트 머리 안. 지도 위에는 기준 위치 칩과 현위치 버튼만 남겨 지도를 넓게 쓴다.
// - 시트: 반쯤(머리 + 목록 또는 요약) ↔ 끝까지(상세 자리) 2단. 접힌 단계가 없어 목록이 늘 보인다.
// - 데스크톱: 좌 칸이 시트 내용(칩, 목록) 그대로. 지도에는 알약 마커.
import { ChevronLeft } from "lucide-react";
import { useEffect, useRef } from "react";
import { focusRing } from "@/components/ui/interaction";
import { mapLabCopy } from "@/copy/design-lab-map";
import { categoryLabel } from "@/features/place/categories";
import { cn } from "@/lib/utils";
import { LabMap, type LabMarker } from "../shared/lab-map";
import { MapSheet } from "../shared/map-sheet";
import type { MapLabParams } from "../shared/params";
import {
  BaseChip,
  DetailPlaceholder,
  EmptyBlock,
  FilterChipRow,
  ListLoading,
  ListModeScreen,
  LocateButton,
  MapScreenFrame,
  OfficeMarker,
  OfflineBlock,
  PlaceList,
  PlaceSummary,
  ResearchButton,
  TAB_BAR_PX,
  useScreenSize,
} from "../shared/parts";
import type { MapPlace } from "../shared/places";
import { useMapLab } from "../shared/use-map-lab";

const copy = mapLabCopy;
const SNAPS = ["half", "full"] as const;
const HEIGHTS = { half: 0.48, full: 1 };

function WalkPill({
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
        "relative flex flex-col items-center",
        selected && "z-10",
        focusRing,
        "rounded-chip",
      )}
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
          "ml-marker flex h-9 min-w-11 items-center gap-1.5 rounded-chip border px-2.5",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-foreground",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "size-2 shrink-0 rounded-full",
            selected && "ring-2 ring-primary-foreground/70",
          )}
          style={{ backgroundColor: `var(--cat-${place.category}-ink)` }}
        />
        <span
          aria-hidden
          className={cn(
            "ml-marker overflow-hidden type-label whitespace-nowrap",
            selected ? "max-w-40" : "max-w-0",
          )}
        >
          {place.name}
        </span>
        <span aria-hidden className="type-label whitespace-nowrap tabular-nums">
          {place.walkMinutes}
          <span
            className={cn(
              "ml-px type-caption",
              !selected && "text-muted-foreground",
            )}
          >
            {copy.numbers.walkUnit}
          </span>
        </span>
      </span>
      <span
        aria-hidden
        className={cn(
          "ml-marker -mt-1 size-2 rotate-45 border-r border-b",
          selected ? "border-primary bg-primary" : "border-border bg-card",
        )}
      />
    </button>
  );
}

function ClusterPill({ count, onOpen }: { count: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "relative flex flex-col items-center rounded-chip",
        focusRing,
      )}
    >
      <span className="sr-only">{copy.clusterLabel(count)}</span>
      {/* 겹친 알약 두 장으로 "여러 곳"을 보인다 */}
      <span
        aria-hidden
        className="absolute top-1 left-1 h-9 w-full rounded-chip border border-border bg-card"
      />
      <span
        aria-hidden
        className="relative flex h-9 min-w-11 items-center rounded-chip border border-foreground/40 bg-card px-3 type-label tabular-nums"
      >
        {count}
        <span className="ml-0.5 type-caption text-muted-foreground">
          {copy.clusterUnit}
        </span>
      </span>
    </button>
  );
}

export function MapB({ params }: { params: MapLabParams }) {
  const lab = useMapLab(params, {
    snaps: SNAPS,
    idleSnap: "half",
    selectSnap: "half",
  });
  const rootRef = useRef<HTMLElement>(null);
  const screen = useScreenSize(rootRef);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stageH = Math.max(0, screen.height - TAB_BAR_PX);

  const selectedId = lab.selectedId;
  useEffect(() => {
    if (selectedId) headingRef.current?.focus({ preventScroll: true });
  }, [selectedId]);

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
      zIndex: p.id === lab.selectedId ? 10 : undefined,
      node: (
        <WalkPill
          place={p}
          selected={p.id === lab.selectedId}
          onSelect={() => lab.select(p.id)}
        />
      ),
    })),
    ...(lab.groups.cluster
      ? [
          {
            id: "__cluster",
            at: lab.groups.cluster.at,
            node: (
              <ClusterPill
                count={lab.groups.cluster.ids.length}
                onOpen={lab.openCluster}
              />
            ),
          },
        ]
      : []),
  ];

  const inset = screen.desktop ? 0 : Math.round(stageH * HEIGHTS.half);

  const header = (
    <div className="flex flex-col gap-3 px-(--lm-layout-gutter) pb-3 desktop:gap-5 desktop:px-10 desktop:pt-10 desktop:pb-4">
      {lab.selected ? (
        <button
          type="button"
          onClick={() => lab.select(null)}
          className={cn(
            "-ml-2 inline-flex h-11 items-center gap-1 self-start rounded-button pr-3 pl-1 type-label text-muted-foreground hover:text-foreground",
            focusRing,
          )}
        >
          <ChevronLeft aria-hidden className="size-5" strokeWidth={1.5} />
          {copy.list.back}
        </button>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-3 pt-1">
            <h2 className="type-label">
              {lab.loading || lab.offline
                ? copy.list.title
                : copy.count(lab.walkLimit, lab.places.length)}
            </h2>
            <span className="type-caption text-muted-foreground">
              {copy.sortHint}
            </span>
          </div>
          {/* 걷는 거리 안에 0곳이면 칩은 소용이 없어 숨긴다(필터로 0곳일 때는 남김) */}
          {lab.loading ||
          lab.offline ||
          (lab.empty && !lab.filteredEmpty) ? null : (
            <FilterChipRow
              filters={lab.filters}
              onToggle={lab.toggleFilter}
              categoryOpen={lab.filterOpen}
              onCategoryOpen={lab.setFilterOpen}
              categories={lab.categories}
              onCategory={lab.setCategory}
              rowClassName="desktop:mx-0 desktop:flex-wrap desktop:px-0"
            />
          )}
        </>
      )}
    </div>
  );

  let body;
  if (lab.loading) body = <ListLoading />;
  else if (lab.offline) body = <OfflineBlock onRetry={lab.retryOnline} />;
  else if (lab.empty)
    body = (
      <EmptyBlock
        filtered={lab.filteredEmpty}
        walkLimit={lab.walkLimit}
        expandTo={15}
        onExpand={lab.expand}
        onReset={lab.resetFilters}
      />
    );
  else if (lab.selected)
    body = (
      <div className="flex flex-col gap-8">
        <PlaceSummary
          key={lab.selected.id}
          place={lab.selected}
          headingRef={headingRef}
          onDetail={() => lab.setSnap("full")}
          className="ml-rise"
        />
        {lab.snap === "full" || screen.desktop ? <DetailPlaceholder /> : null}
      </div>
    );
  else
    body = (
      <PlaceList
        places={lab.places}
        selectedId={lab.selectedId}
        onSelect={(id) => lab.select(id)}
      />
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
      inset={{ top: screen.desktop ? 72 : 64, bottom: inset }}
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
      onMapTap={() => {
        if (lab.selectedId) lab.select(null);
      }}
      onFailed={lab.onMapFailed}
      describedById="map-b-keys"
      className="size-full"
    >
      <p id="map-b-keys" className="sr-only">
        {copy.mapKeysHint}
      </p>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 px-(--lm-layout-gutter) pt-3 desktop:px-6 desktop:pt-6">
        <div className="pointer-events-auto flex items-center justify-between">
          <BaseChip />
          <LocateButton onClick={() => lab.setAnnounce(copy.myLocationDone)} />
        </div>
        {lab.moved ? (
          <div className="pointer-events-auto flex justify-center">
            <ResearchButton onClick={lab.research} />
          </div>
        ) : null}
      </div>
    </LabMap>
  );

  const sheet = (
    <MapSheet
      snaps={SNAPS}
      heights={HEIGHTS}
      snap={lab.snap}
      onSnapChange={lab.setSnap}
      desktop={screen.desktop}
      header={header}
      bodyClassName="px-(--lm-layout-gutter) pb-8 desktop:px-10"
    >
      {body}
    </MapSheet>
  );

  return (
    <>
      <MapScreenFrame rootRef={rootRef} map={map} sheet={sheet} />
      <p aria-live="polite" className="sr-only">
        {lab.announce}
      </p>
    </>
  );
}
