"use client";
// 지도 시안 공용 상태 (T5.1): 필터, 고른 식당, 시트 높이, 지도 이동, 클러스터, 4상태.
// 세 안이 같은 상태를 쓰고 그리는 방식만 다르다. 데이터는 목업(places.ts), 저장하지 않는다.
import { useState } from "react";
import { mapLabCopy } from "@/copy/design-lab-map";
import type { CategorySlug } from "@/features/place/categories";
import type { LabMapStatus } from "./lab-map";
import type { MapLabParams, SheetSnap } from "./params";
import {
  ALLEY_IDS,
  EMPTY_FILTERS,
  MAP_PLACES,
  WALK_EXPAND_MINUTES,
  WALK_LIMIT_MINUTES,
  activeFilterCount,
  categoriesIn,
  filterPlaces,
  findMapPlace,
  groupMarkers,
  radiusMeters,
  type MapFilters,
} from "./places";

const copy = mapLabCopy;

/** 안이 쓰지 않는 높이를 쿼리로 받으면 가까운 단계로 맞춘다 */
export function nearestSnap(
  wanted: SheetSnap,
  snaps: readonly SheetSnap[],
): SheetSnap {
  if (snaps.includes(wanted)) return wanted;
  const order: SheetSnap[] = ["peek", "half", "full"];
  const w = order.indexOf(wanted);
  return [...snaps].sort(
    (a, b) =>
      Math.abs(order.indexOf(a) - w) - Math.abs(order.indexOf(b) - w) ||
      order.indexOf(b) - order.indexOf(a),
  )[0] as SheetSnap;
}

export function useMapLab(
  params: MapLabParams,
  {
    snaps,
    idleSnap,
    selectSnap,
  }: {
    snaps: readonly SheetSnap[];
    /** 아무것도 고르지 않았을 때 높이 */
    idleSnap: SheetSnap;
    /** 마커를 골랐을 때 높이 */
    selectSnap: SheetSnap;
  },
) {
  const [filters, setFilters] = useState<MapFilters>(EMPTY_FILTERS);
  const [walkLimit, setWalkLimit] = useState(WALK_LIMIT_MINUTES);
  const [forcedEmpty, setForcedEmpty] = useState(params.state === "empty");
  const [selectedId, setSelectedId] = useState<string | null>(params.selectId);
  const [snap, setSnap] = useState<SheetSnap>(
    params.snap
      ? nearestSnap(params.snap, snaps)
      : params.selectId
        ? selectSnap
        : idleSnap,
  );
  const [moved, setMoved] = useState(params.moved);
  const [filterOpen, setFilterOpen] = useState(params.filterOpen);
  const [mapFailed, setMapFailed] = useState(false);
  const [mapAttempt, setMapAttempt] = useState(0);
  const [fitKey, setFitKey] = useState(0);
  const [clusterOpen, setClusterOpen] = useState(false);
  const [clusterFit, setClusterFit] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [offline, setOffline] = useState(params.state === "offline");

  const loading = params.state === "loading";
  const mapStatus: LabMapStatus = loading
    ? "loading"
    : offline
      ? "offline"
      : "ready";
  /** 오류 상태 시연: 첫 시도만 실패한다(다시 불러오면 성공) */
  const failMap = params.state === "error" && mapAttempt === 0;

  const inRadius = forcedEmpty
    ? []
    : filterPlaces(MAP_PLACES, EMPTY_FILTERS, walkLimit);
  const places = forcedEmpty
    ? []
    : filterPlaces(MAP_PLACES, filters, walkLimit);
  const filterCount = activeFilterCount(filters);
  const selected = places.find((p) => p.id === selectedId) ?? null;
  const groups = groupMarkers(places, clusterOpen, selectedId);

  function select(id: string | null, nextSnap: SheetSnap = selectSnap) {
    setSelectedId(id);
    if (id) {
      setSnap(nextSnap);
      const p = findMapPlace(id);
      if (p) setAnnounce(copy.selected(p.name));
    } else {
      setSnap(idleSnap);
    }
  }

  function toggleFilter(key: "cheap" | "near" | "top" | "favorites") {
    setFilters((f) => ({ ...f, [key]: !f[key] }));
  }
  function setCategory(slug: CategorySlug | null) {
    setFilters((f) => ({ ...f, category: slug }));
  }
  function resetFilters() {
    setFilters(EMPTY_FILTERS);
  }
  function expand() {
    setWalkLimit(WALK_EXPAND_MINUTES);
    setForcedEmpty(false);
    setFitKey((k) => k + 1);
  }
  function research() {
    setMoved(false);
    setFitKey((k) => k + 1);
    setAnnounce(copy.researched);
  }
  function openCluster() {
    setClusterOpen(true);
    setClusterFit(String(Date.now()));
    setAnnounce(copy.clusterOpened(ALLEY_IDS.length));
  }
  function retryMap() {
    setMapFailed(false);
    setMapAttempt((n) => n + 1);
  }
  function retryOnline() {
    setOffline(false);
  }

  return {
    state: params.state,
    provider: params.provider,
    loading,
    offline,
    mapStatus,
    failMap,
    mapFailed,
    mapAttempt,
    onMapFailed: () => setMapFailed(true),
    retryMap,
    retryOnline,
    filters,
    filterCount,
    toggleFilter,
    setCategory,
    resetFilters,
    filterOpen,
    setFilterOpen,
    categories: categoriesIn(inRadius),
    walkLimit,
    radiusM: radiusMeters(walkLimit),
    expand,
    places,
    groups,
    filteredEmpty: !forcedEmpty && places.length === 0 && filterCount > 0,
    empty: places.length === 0,
    selected,
    selectedId: selected?.id ?? null,
    select,
    snap,
    setSnap,
    moved,
    setMoved,
    research,
    fitKey,
    clusterFit,
    openCluster,
    announce,
    setAnnounce,
  };
}

export type MapLab = ReturnType<typeof useMapLab>;
