"use client";
// 후보 줄 펼침의 넣기 목록 (T7.11, D-15 안건 8): 오늘 추천, 즐겨찾기, 최근 간 곳 + 지도에서 고르기 안내.
// - 오늘 추천은 이번 세션 오늘(홈) 카드 묶음(useTodaySession 메모리)이다. 홈에 다녀오지 않았으면 묶음을 숨긴다.
//   이름은 같은 세션의 카카오 결과에서 바로 찾는다(새 호출 없음). 여기서 넣으면 source "rec"(추천 수락률).
// - DB에서 읽는 것은 place_id, place_url뿐이다. 이름과 카테고리는 T5.12a(세션 메모리 → 기준점 주변 FD6)로 찾고,
//   이름을 못 찾은 곳은 목록에서 뺀다(D-15 안건 8). 결과는 TanStack Query 세션 메모리에만 있다(CLAUDE.md 7장).
// - 키워드 검색은 2단계 백로그(D-15 안건 8).
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { pollCreateCopy as copy } from "@/copy/poll-create";
import { isCategorySlug } from "@/features/place/categories";
import { usePlaceNames } from "@/features/place/use-place-names";
import { kakaoCategorySlug } from "@/features/rec/kakao-category";
import { useTodaySession } from "@/features/rec/today-store";
import { dbKeys } from "@/lib/query/db-keys";
import type { LatLng } from "@/lib/map/types";
import { addKstDays, kstDateKey } from "@/lib/time";
import { cn } from "@/lib/utils";
import { focusRing } from "@/components/ui/interaction";
import { CANDIDATE_MAX, PickRow, PickSkeleton, type SheetPlace } from "./parts";
import { read } from "@/lib/read";

/** 그룹마다 처음 보이는 줄 수(나머지는 "더 보기") */
const GROUP_LIMIT = 3;
/** 최근 간 곳을 찾는 기간 */
const RECENT_DAYS = 30;

export type PickedPlace = SheetPlace & {
  name: string;
  /** 세션 메모리 좌표(반경 확인용, 저장 금지) */
  position: LatLng;
};

/** 넣은 묶음. poll_candidate_added source(PRD 10.2)로 이어진다 */
export type PickGroup = "today" | "favorite" | "history";

export function CandidatePicker({
  picked,
  anchor,
  onToggle,
  onMap,
}: {
  picked: readonly string[];
  anchor: LatLng | null;
  onToggle: (place: PickedPlace, group: PickGroup) => void;
  onMap: () => void;
}) {
  const pins = useTodaySession((s) => s.map.pins);
  const today = new Date();
  const from = kstDateKey(addKstDays(today, -RECENT_DAYS));
  const to = kstDateKey(today);
  const places = useQuery({
    queryKey: dbKeys.myPlaces,
    queryFn: () => read("myPlacesAction"),
    staleTime: 60_000,
  });
  const visits = useQuery({
    queryKey: dbKeys.myVisits(from, to),
    queryFn: () => read("myVisitsAction", { from, to }),
    staleTime: 60_000,
  });

  const groups = useMemo(() => {
    const today = pins.map((p) => ({ placeId: p.id, placeUrl: null }));
    const todayIds = new Set(today.map((p) => p.placeId));
    const favAll =
      places.data && places.data.signedIn
        ? places.data.favorites.map((p) => ({
            placeId: p.placeId,
            placeUrl: p.placeUrl,
          }))
        : [];
    const fav = favAll.filter((p) => !todayIds.has(p.placeId));
    const seen = new Set([...todayIds, ...fav.map((p) => p.placeId)]);
    const recent: { placeId: string; placeUrl: string | null }[] = [];
    if (visits.data && visits.data.signedIn)
      for (const v of visits.data.visits) {
        if (seen.has(v.placeId) || v.status === "not_visited") continue;
        seen.add(v.placeId);
        recent.push({ placeId: v.placeId, placeUrl: v.placeUrl });
      }
    return { today, fav, recent };
  }, [pins, places.data, visits.data]);

  const refs = useMemo(
    () => [...groups.today, ...groups.fav, ...groups.recent],
    [groups],
  );
  const names = usePlaceNames(refs, anchor, {
    enabled: !places.isPending && !visits.isPending,
  });

  const resolved = useMemo(() => {
    const map = new Map<string, PickedPlace>();
    for (const r of names.data?.places ?? []) {
      if (r.status !== "resolved") continue;
      const c = r.place.categoryName;
      map.set(r.placeId, {
        placeId: r.placeId,
        placeUrl: r.placeUrl,
        name: r.place.name,
        category: isCategorySlug(c) ? c : kakaoCategorySlug(c),
        position: r.place.position,
      });
    }
    return map;
  }, [names.data]);

  const pending = places.isPending || visits.isPending || names.isPending;
  const full = picked.length >= CANDIDATE_MAX;
  const list = (ids: readonly { placeId: string }[]) =>
    ids.flatMap((r) => {
      const p = resolved.get(r.placeId);
      return p ? [p] : [];
    });
  const todayList = list(groups.today);
  const favList = list(groups.fav);
  const recentList = list(groups.recent);
  const nothing =
    !pending &&
    todayList.length === 0 &&
    favList.length === 0 &&
    recentList.length === 0;

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-card px-4 pt-3 pb-2">
      {pending ? (
        <PickSkeleton />
      ) : nothing ? (
        <p className="py-2 type-caption break-keep text-muted-foreground">
          {copy.candidates.nothingToAdd}
        </p>
      ) : (
        <>
          <Group
            title={copy.candidates.today}
            items={todayList}
            picked={picked}
            full={full}
            onToggle={(p) => onToggle(p, "today")}
          />
          <Group
            title={copy.candidates.favorites}
            items={favList}
            picked={picked}
            full={full}
            onToggle={(p) => onToggle(p, "favorite")}
          />
          <Group
            title={copy.candidates.recent}
            items={recentList}
            picked={picked}
            full={full}
            onToggle={(p) => onToggle(p, "history")}
          />
        </>
      )}
      <div className="flex flex-col gap-1 border-t border-border pt-2">
        <Link
          href="/map"
          onClick={onMap}
          className={cn(
            "inline-flex min-h-11 w-fit items-center rounded-sm type-label underline decoration-border underline-offset-4 hover:decoration-foreground active:decoration-foreground",
            focusRing,
          )}
        >
          {copy.candidates.fromMap}
        </Link>
        <p className="type-caption break-keep text-muted-foreground">
          {copy.candidates.fromMapHint}
        </p>
      </div>
    </div>
  );
}

function Group({
  title,
  items,
  picked,
  full,
  onToggle,
}: {
  title: string;
  items: readonly PickedPlace[];
  picked: readonly string[];
  full: boolean;
  onToggle: (place: PickedPlace) => void;
}) {
  const [more, setMore] = useState(false);
  if (items.length === 0) return null;
  const shown = more ? items : items.slice(0, GROUP_LIMIT);
  return (
    <section className="flex flex-col">
      <h4 className="type-caption text-muted-foreground">{title}</h4>
      <ul className="flex flex-col">
        {shown.map((p) => (
          <PickRow
            key={p.placeId}
            place={p}
            picked={picked.includes(p.placeId)}
            full={full}
            onToggle={() => onToggle(p)}
          />
        ))}
      </ul>
      {!more && items.length > GROUP_LIMIT ? (
        <button
          type="button"
          onClick={() => setMore(true)}
          className={cn(
            "inline-flex min-h-11 w-fit items-center rounded-sm type-caption text-muted-foreground underline decoration-border underline-offset-3 hover:text-foreground active:text-foreground",
            focusRing,
          )}
        >
          {copy.candidates.more}
        </button>
      ) : null}
    </section>
  );
}
