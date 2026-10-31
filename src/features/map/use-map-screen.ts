"use client";
// 지도 탭 화면 상태 (T5.26~T5.32). 기준 위치, 카카오 검색, 필터, 고른 식당, 시트 높이, 지도 이동, 클러스터, 지도 실패.
//
// 데이터 규칙 (CLAUDE.md 7장)
// - 기준 위치는 오늘(홈)과 같은 세션 값(today-store의 choice, here)을 쓴다. 탭을 오가도 같은 곳을 본다.
// - 카카오 결과는 TanStack Query 세션 메모리에만 둔다. 다시 찾은 지역(지도 가운데)과 현위치 좌표는 이 훅의 메모리에만 있고
//   서버, 저장 API, 분석 이벤트로 보내지 않는다.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { mapCopy } from "@/copy/map";
import { locateOnce } from "@/features/onboarding/geolocation";
import { placeUserStateKey } from "@/features/place/detail";
import type { PlaceUserState } from "@/features/place/place-requests";
import type { CategorySlug } from "@/features/place/categories";
import {
  afterLocate,
  resolveBase,
  sortOffices,
  type HereState,
} from "@/features/rec/base-location";
import { straightDistanceM } from "@/features/rec/candidates";
import { useTodaySession } from "@/features/rec/today-store";
import { searchRadiusFromWalkMinutes } from "@/lib/format";
import { restaurantsInRadiusQuery } from "@/lib/kakao/queries";
import { DEFAULT_MAP_CENTER } from "@/lib/map/constants";
import type { Bounds, LatLng } from "@/lib/map/types";
import { useOnlineStatus } from "@/lib/network";
import { getMeal, type Meal } from "@/lib/time";
import { boundsOf, groupMarkers } from "./cluster";
import { circleBounds } from "./fit";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  categoriesIn,
  filterPlaces,
  type FilterToggleKey,
  type MapFilters,
} from "./filters";
import type { MapView } from "./map-canvas";
import type { SheetSnap } from "./map-sheet";
import type { MapData } from "./load-map";
import { hidePersonal, toMapPlaces } from "./places";
import {
  INITIAL_MAP_LOAD,
  expandedWalk,
  mapLoadReducer,
  mapScreenMode,
  researchVisible,
} from "./view-state";

const copy = mapCopy;
const FIT_PAD_PX = 24;
const CLUSTER_PAD_PX = 72;
/** 묶음 구성원이 이 거리(m) 안에 다 있으면 확대해도 떨어지지 않는 것으로 본다 */
const INSEPARABLE_M = 30;

const keyOf = (p: LatLng | null) =>
  p ? `${p.lat.toFixed(6)},${p.lng.toFixed(6)}` : "none";

export function useMapScreen(data: MapData) {
  const online = useOnlineStatus();
  const client = useQueryClient();
  const choice = useTodaySession((s) => s.choice);
  const here = useTodaySession((s) => s.here);
  const mealOverride = useTodaySession((s) => s.mealOverride);
  const patch = useTodaySession((s) => s.patch);
  const [announce, setAnnounce] = useState("");

  /* ---------- 기준 위치 (MAP-01, 오늘과 같은 세션 값) ---------- */

  const offices = useMemo(() => sortOffices(data.offices), [data.offices]);
  const base = resolveBase(choice, offices, here);
  const baseStatus: "ready" | "locating" | "none" = base.center
    ? "ready"
    : base.kind === "here" &&
        (base.state.status === "idle" || base.state.status === "locating")
      ? "locating"
      : "none";
  const needReason =
    base.kind === "here" &&
    (base.state.status === "denied" || base.state.status === "unavailable")
      ? base.state.status
      : null;

  const locateBase = useCallback(async () => {
    patch({ here: { status: "locating" } });
    const r = await locateOnce();
    const next: HereState = r.ok
      ? { status: "ok", position: { lat: r.target.lat, lng: r.target.lng } }
      : { status: r.reason };
    const after = afterLocate(next, data.offices);
    patch({ here: next, choice: after.choice, notice: after.notice });
  }, [patch, data.offices]);

  // 사무실이 없으면(둘러보기) 처음 한 번 현위치를 찾는다
  const needsFirstLocate = base.kind === "here" && base.state.status === "idle";
  useEffect(() => {
    if (needsFirstLocate) void locateBase();
  }, [needsFirstLocate, locateBase]);

  /* ---------- 검색 기준점과 반경 ---------- */

  const [walk, setWalk] = useState(data.prefs.walk);
  // 다시 찾은 지역(MAP-05). 기준 위치가 바뀌면 버린다
  const baseKey = `${base.kind}:${keyOf(base.center)}`;
  const [areaState, setAreaState] = useState<{
    for: string;
    center: LatLng;
  } | null>(null);
  const area = areaState && areaState.for === baseKey ? areaState.center : null;
  const searchCenter = area ?? base.center;
  const radiusM = searchRadiusFromWalkMinutes(walk);

  const query = useQuery({
    ...restaurantsInRadiusQuery(searchCenter ?? DEFAULT_MAP_CENTER, radiusM),
    enabled: searchCenter !== null && online && !data.loadFailed,
  });
  const result = query.data;

  /* ---------- 끼니와 예산 (상세 예산 판정, 추정 가격) ---------- */

  const [now] = useState(() => new Date(data.nowIso));
  const meal: Meal = mealOverride ?? getMeal(now);
  const budgetKRW = meal === "lunch" ? data.prefs.lunch : data.prefs.dinner;

  /* ---------- 즐겨찾기 (상세에서 바꾸면 바로 반영) ---------- */

  const initialFavorites = useMemo(
    () => new Set(data.favorites),
    [data.favorites],
  );
  const [favVersion, bumpFav] = useReducer((n: number) => n + 1, 0);
  useEffect(
    () =>
      client.getQueryCache().subscribe((e) => {
        if (e.type === "updated" && e.query.queryKey[0] === "place-user-state")
          bumpFav();
      }),
    [client],
  );

  /* ---------- 기피 음식, 다시 안 갈 곳 숨기기 (2026-10-31 사용자 결정, 추천 하드 필터와 같은 판정) ---------- */

  const initialBlocked = useMemo(() => new Set(data.blocked), [data.blocked]);

  const { places, hidden } = useMemo(() => {
    if (!result || !searchCenter)
      return { places: null, hidden: { avoid: 0, blocked: 0 } };
    const userState = (id: string) =>
      client.getQueryData<PlaceUserState>(placeUserStateKey(id));
    // 상세에서 바꾼 값(캐시)이 있으면 그 값, 없으면 서버가 준 첫 값
    const blocked = new Set(
      result.places
        .filter((p) => {
          const s = userState(p.id);
          return s?.signedIn ? s.blocked : initialBlocked.has(p.id);
        })
        .map((p) => p.id),
    );
    const split = hidePersonal(result.places, { avoid: data.avoid, blocked });
    const isFavorite = (id: string) => {
      const s = userState(id);
      return s?.signedIn ? s.favorite : initialFavorites.has(id);
    };
    return {
      places: toMapPlaces(split.visible, searchCenter, { meal, isFavorite }),
      hidden: split.hidden,
    };
    // favVersion: 즐겨찾기, 다시 안 갈 곳 캐시가 바뀌면 다시 계산
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    result,
    searchCenter?.lat,
    searchCenter?.lng,
    meal,
    client,
    initialFavorites,
    initialBlocked,
    data.avoid,
    favVersion,
  ]);
  const hiddenCount = hidden.avoid + hidden.blocked;
  // 나 탭에서 고칠 곳. 기피 음식으로 숨긴 것이 있으면 기피 음식 설정, 다시 안 갈 곳 목록(T6.13) 전에는 나 탭 첫 화면
  const hiddenHref: string | null = !data.signedIn
    ? null
    : hidden.avoid > 0
      ? "/me/avoid"
      : "/me";

  /* ---------- 필터 (MAP-03) ---------- */

  const [filters, setFilters] = useState<MapFilters>(EMPTY_FILTERS);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const filtered = useMemo(
    () => (places ? filterPlaces(places, filters) : []),
    [places, filters],
  );
  const filterCount = activeFilterCount(filters);
  const categories = useMemo(() => categoriesIn(places ?? []), [places]);

  function toggleFilter(key: FilterToggleKey) {
    setFilters((f) => ({ ...f, [key]: !f[key] }));
  }
  function setCategory(slug: CategorySlug | null) {
    setFilters((f) => ({ ...f, category: slug }));
  }
  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setCategoryOpen(false);
  }

  /* ---------- 고른 식당과 시트 (MAP-04) ---------- */

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = filtered.find((p) => p.id === selectedId) ?? null;
  const [snap, setSnap] = useState<SheetSnap>("half");

  function select(id: string | null) {
    setSelectedId(id);
    setSnap("half");
    const p = id ? filtered.find((x) => x.id === id) : null;
    if (p) setAnnounce(copy.selected(p.name));
  }

  /* ---------- 지도 SDK (T5.26, T5.32) ---------- */

  const [mapLoad, dispatchMap] = useReducer(mapLoadReducer, INITIAL_MAP_LOAD);

  /* ---------- 지도 이동과 다시 찾기 (MAP-05) ---------- */

  const [view, setView] = useState<MapView | null>(null);
  const [moved, setMoved] = useState<{ center: LatLng } | null>(null);
  const showResearch =
    !query.isFetching &&
    researchVisible({
      userMoved: moved !== null,
      mapCenter: moved?.center ?? null,
      searchCenter,
      radiusM,
    });
  const announceAfterFetch = useRef(false);

  function research() {
    if (!moved) return;
    setAreaState({ for: baseKey, center: moved.center });
    setMoved(null);
    setSelectedId(null);
    setOpened(new Set());
    announceAfterFetch.current = true;
  }
  function returnToBase() {
    setAreaState(null);
    setMoved(null);
    setSelectedId(null);
    setOpened(new Set());
    setAnnounce(copy.backedToBase);
  }
  useEffect(() => {
    if (!announceAfterFetch.current || !places || query.isFetching) return;
    announceAfterFetch.current = false;
    setAnnounce(copy.researched(places.length));
  }, [places, query.isFetching]);

  /* ---------- 현위치 버튼: 지도 가운데만 옮긴다 ---------- */

  const [moveTo, setMoveTo] = useState<{
    key: string;
    position: LatLng;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  async function moveToHere() {
    setLocating(true);
    const r = await locateOnce();
    setLocating(false);
    if (!r.ok) {
      setAnnounce(copy.myLocationFailed);
      return;
    }
    // 좌표는 지도 이동에만 쓴다(저장, 전송 없음)
    setMoveTo({
      key: String(performance.now()),
      position: { lat: r.target.lat, lng: r.target.lng },
    });
    setAnnounce(copy.myLocationDone);
  }

  /* ---------- 넓히기 ---------- */

  const expandTo = expandedWalk(walk);
  function expand() {
    if (expandTo === null) return;
    setWalk(expandTo);
    setSelectedId(null);
  }

  /* ---------- 클러스터 (MAP-02) ---------- */

  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const keep = useMemo(() => {
    const s = new Set(opened);
    if (selected) s.add(selected.id);
    return s;
  }, [opened, selected]);
  const groups = useMemo(
    () => groupMarkers(filtered, view, keep),
    [filtered, view, keep],
  );
  const [clusterFit, setClusterFit] = useState<{
    key: string;
    bounds: Bounds;
  } | null>(null);
  function openCluster(ids: readonly string[]) {
    const members = filtered.filter((p) => ids.includes(p.id));
    if (members.length === 0) return;
    const bounds = boundsOf(members.map((p) => p.position));
    // 다가가면 확대가 바뀌어 저절로 다시 묶인다. 한 건물처럼 다가가도 떨어지지 않는 묶음만 펼친 채로 둔다
    if (straightDistanceM(bounds.sw, bounds.ne) < INSEPARABLE_M) {
      setOpened((prev) => new Set([...prev, ...ids]));
    }
    setClusterFit({
      key: `cluster:${ids.join(",")}:${performance.now()}`,
      bounds,
    });
    setAnnounce(copy.clusterOpened(members.length));
  }

  /* ---------- 맞춤 ---------- */

  const autoFitKey = `auto:${keyOf(searchCenter)}:${radiusM}`;
  const [clusterFitFor, setClusterFitFor] = useState(autoFitKey);
  // 기준점이나 반경이 바뀌면 묶음 맞춤은 버리고 원 맞춤으로
  if (clusterFitFor !== autoFitKey) {
    setClusterFitFor(autoFitKey);
    setClusterFit(null);
  }
  const fit = clusterFit
    ? { key: clusterFit.key, bounds: clusterFit.bounds, pad: CLUSTER_PAD_PX }
    : searchCenter
      ? {
          key: autoFitKey,
          bounds: circleBounds(searchCenter, radiusM),
          pad: FIT_PAD_PX,
        }
      : null;

  /* ---------- 화면 모드 ---------- */

  const mode = mapScreenMode({
    loadFailed: data.loadFailed,
    base: baseStatus,
    online,
    hasPlaces: places !== null,
    kakaoError: query.isError,
    mapStatus: mapLoad.status,
  });
  const loadingPlaces = places === null;

  return {
    mode,
    online,
    announce,
    setAnnounce,
    base,
    needReason,
    locateBase,
    offices,
    walk,
    radiusM,
    area,
    searchCenter,
    query,
    capped: result?.capped ?? false,
    loadingPlaces,
    meal,
    budgetKRW,
    places: places ?? [],
    hiddenCount,
    hiddenHref,
    filtered,
    filters,
    filterCount,
    categories,
    categoryOpen,
    setCategoryOpen,
    toggleFilter,
    setCategory,
    resetFilters,
    selected,
    select,
    snap,
    setSnap,
    mapLoad,
    dispatchMap,
    setView,
    onUserMoved: (center: LatLng) => setMoved({ center }),
    showResearch,
    research,
    returnToBase,
    moveTo,
    moveToHere,
    locating,
    expandTo,
    expand,
    groups,
    openCluster,
    fit,
  };
}

export type MapScreenState = ReturnType<typeof useMapScreen>;
