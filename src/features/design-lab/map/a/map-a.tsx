"use client";
// 지도 시안 A "그림 핀과 3단 시트" (T5.1).
// - 마커: 카테고리 일러스트(icon 변형 28px)를 담은 원형 핀. 고르면 1.2배로 커지고 테두리가 올리브, 아래에 이름 알약.
// - 필터 칩: 지도 위 상단 가로 스크롤 줄. "카테고리"를 누르면 아래에 카테고리 줄이 펼쳐진다.
// - 시트: 작게(개수, 고른 식당 이름) → 반쯤(목록 또는 식당 요약) → 끝까지(상세 자리) 3단.
// - 데스크톱: 좌 칸 머리에 칩 줄, 그 아래 목록이나 요약. 지도에는 기준 위치 칩과 버튼만.
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { focusRing } from "@/components/ui/interaction";
import { mapLabCopy } from "@/copy/design-lab-map";
import { categoryLabel } from "@/features/place/categories";
import { CategoryIllustration } from "@/features/place/illustrations";
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
const SNAPS = ["peek", "half", "full"] as const;
const HEIGHTS = { peek: 132, half: 0.54, full: 1 };
const PIN_BOX = { w: 48, h: 56 };

function IllustrationPin({
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
        "relative flex flex-col items-center rounded-full",
        selected && "z-10",
        focusRing,
      )}
      style={{ width: PIN_BOX.w, height: PIN_BOX.h }}
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
          "ml-marker flex size-11 origin-bottom items-center justify-center rounded-full border bg-card",
          selected
            ? "scale-[1.2] border-[1.5px] border-primary"
            : "border-border",
        )}
        style={{ backgroundColor: `var(--cat-${place.category}-surface)` }}
      >
        <CategoryIllustration slug={place.category} size={30} />
      </span>
      <span
        aria-hidden
        className={cn(
          "-mt-1 size-2 rotate-45 border-r border-b",
          selected ? "border-primary" : "border-border",
        )}
        style={{ backgroundColor: `var(--cat-${place.category}-surface)` }}
      />
      {selected ? (
        <span
          aria-hidden
          className="ml-rise absolute top-full mt-1 rounded-chip border border-border bg-card px-2.5 py-0.5 type-caption whitespace-nowrap text-foreground"
        >
          {place.name}
        </span>
      ) : null}
    </button>
  );
}

function ClusterPin({ count, onOpen }: { count: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex size-12 items-center justify-center rounded-full border-[1.5px] border-primary bg-card type-numeric-md text-foreground ring-4 ring-card/60",
        focusRing,
      )}
    >
      <span className="sr-only">{copy.clusterLabel(count)}</span>
      <span aria-hidden>{count}</span>
    </button>
  );
}

export function MapA({ params }: { params: MapLabParams }) {
  const lab = useMapLab(params, {
    snaps: SNAPS,
    idleSnap: "peek",
    selectSnap: "half",
  });
  const rootRef = useRef<HTMLElement>(null);
  const screen = useScreenSize(rootRef);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stageH = Math.max(0, screen.height - TAB_BAR_PX);

  // 고르면 요약 제목으로 초점(시트가 열렸음을 알 수 있게)
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
      anchor: { x: PIN_BOX.w / 2, y: PIN_BOX.h },
      node: (
        <IllustrationPin
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
            anchor: { x: 24, y: 24 },
            node: (
              <ClusterPin
                count={lab.groups.cluster.ids.length}
                onOpen={lab.openCluster}
              />
            ),
          },
        ]
      : []),
  ];

  const inset = screen.desktop
    ? 0
    : lab.selected || lab.empty || lab.offline
      ? Math.round(stageH * HEIGHTS.half)
      : HEIGHTS.peek;
  const insetTop = screen.desktop ? 72 : lab.filterOpen ? 176 : 124;
  const snap =
    !screen.desktop && (lab.empty || lab.offline) && lab.snap === "peek"
      ? "half"
      : lab.snap;

  const chips = (onMap: boolean) => (
    <FilterChipRow
      filters={lab.filters}
      onToggle={lab.toggleFilter}
      categoryOpen={lab.filterOpen}
      onCategoryOpen={lab.setFilterOpen}
      categories={lab.categories}
      onCategory={lab.setCategory}
      onMap={onMap}
      rowClassName={
        onMap ? undefined : "desktop:mx-0 desktop:flex-wrap desktop:px-0"
      }
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
      inset={{ top: insetTop, bottom: inset }}
      fitInset={{
        top: insetTop,
        bottom: screen.desktop
          ? 0
          : lab.empty || lab.offline
            ? Math.round(stageH * HEIGHTS.half)
            : HEIGHTS.peek,
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
      onMapTap={() => {
        if (lab.selectedId) lab.select(null);
      }}
      onFailed={lab.onMapFailed}
      describedById="map-a-keys"
      className="size-full"
    >
      <p id="map-a-keys" className="sr-only">
        {copy.mapKeysHint}
      </p>
      {/* 상단: 기준 위치 칩 + 현위치, 그 아래 필터 칩 줄(모바일), 다시 찾기 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 px-(--lm-layout-gutter) pt-3 desktop:px-6 desktop:pt-6">
        <div className="pointer-events-auto flex items-center justify-between">
          <BaseChip />
          <LocateButton onClick={() => lab.setAnnounce(copy.myLocationDone)} />
        </div>
        <div className="pointer-events-auto desktop:hidden">{chips(true)}</div>
        {lab.moved ? (
          <div className="pointer-events-auto flex justify-center pt-1">
            <ResearchButton onClick={lab.research} />
          </div>
        ) : null}
      </div>
    </LabMap>
  );

  const header = (
    <div className="flex flex-col gap-3 px-(--lm-layout-gutter) pb-3 desktop:gap-5 desktop:px-10 desktop:pt-10 desktop:pb-4">
      <div className="hidden desktop:block">{chips(false)}</div>
      {lab.loading ? null : lab.selected ? (
        <div className="flex items-center justify-between gap-3">
          <p className="type-caption text-muted-foreground">
            {copy.count(lab.walkLimit, lab.places.length)}
          </p>
          <button
            type="button"
            onClick={() => lab.select(null)}
            aria-label={copy.list.back}
            className={cn(
              "-mr-2 inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted",
              focusRing,
            )}
          >
            <X aria-hidden className="size-5" strokeWidth={1.5} />
          </button>
        </div>
      ) : lab.empty || lab.offline ? null : (
        <div className="flex items-baseline justify-between gap-3 pt-1">
          <h2 className="type-label">
            {copy.count(lab.walkLimit, lab.places.length)}
          </h2>
          <span className="type-caption text-muted-foreground">
            {copy.sortHint}
          </span>
        </div>
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

  const sheet = (
    <MapSheet
      snaps={SNAPS}
      heights={HEIGHTS}
      snap={snap}
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
