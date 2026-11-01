"use client";
// 나 탭 "장소" 패널 (T6.13, HIS-02, D-12 안건 7, 8, DESIGN.md 5장 "나 탭").
// - 위 즐겨찾기, 아래 48 띄워 다시 안 갈 곳. 각 20곳, 더 보기로 20곳씩(목록은 한 번에 받는다).
// - 즐겨찾기 해제는 별 토글(aria-pressed). 끈 줄은 흐리게 남아 다시 누르면 되돌리고, 화면을 떠나면 빠진다.
// - 다시 안 갈 곳은 "해제" → 그 자리 "다시 추천에 넣었습니다." + "되돌리기".
// 쓰기는 place/actions.ts(setFavoriteAction, setBlockedAction). 요청에는 place_id, place_url만 간다.
import { useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ErrorState,
  LoadingRegion,
  OfflineState,
  SkeletonLine,
} from "@/components/states";
import { toast } from "@/components/ui/lazy-toaster";
import { Skeleton } from "@/components/ui/skeleton";
import { historyCopy as copy } from "@/copy/history";
import type { MyPlace } from "@/features/feedback/actions";
import { useMyPlaces } from "@/features/feedback/use-my-records";
import { setBlockedAction, setFavoriteAction } from "@/features/place/actions";
import { placeUserStateKey } from "@/features/place/detail";
import { placeLinkFor } from "@/features/place/resolve-place-names";
import { invalidateAfterWrite } from "@/lib/query/db-keys";
import { kstDateKey } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useDetailEntry, type OfficeAnchor } from "./detail-entry";
import { useMeMap, type MeMapPin } from "./me-map-store";
import { mdLabel, mergeKept, savedFallbackName } from "./model";
import {
  MoreButton,
  NamesFailNote,
  OfflineBanner,
  PlaceGlyph,
  PlaceName,
  SectionHead,
  btn,
  toRowPlace,
  useOfflineGuard,
} from "./parts";
import { useRecordNames, type RecordNames } from "./use-record-names";

/** 한 번에 보이는 곳 수 (D-12 안건 7) */
export const PLACES_PAGE = 20;

const idOf = (p: MyPlace) => p.placeId;
const sortKey = (p: MyPlace) => p.createdAt;
/** 화면에 남길 항목 표: keep이면 넣고, 아니면 뺀다 */
function toggleKept(
  m: Record<string, MyPlace>,
  p: MyPlace,
  keep: boolean,
): Record<string, MyPlace> {
  const next = { ...m };
  if (keep) next[p.placeId] = p;
  else delete next[p.placeId];
  return next;
}

const dateOf = (iso: string) => mdLabel(kstDateKey(new Date(iso)));

export function PlacesPanel({
  office,
  offline,
}: {
  office: OfficeAnchor | null;
  offline: boolean;
}) {
  const client = useQueryClient();
  const q = useMyPlaces();
  const data = q.data?.signedIn ? q.data : null;

  // 화면에서 끈 즐겨찾기, 해제한 다시 안 갈 곳(떠날 때까지 그 자리에 남긴다)
  const [favOff, setFavOff] = useState<Record<string, MyPlace>>({});
  const [unblocked, setUnblocked] = useState<Record<string, MyPlace>>({});
  const [favLimit, setFavLimit] = useState(PLACES_PAGE);
  const [blockLimit, setBlockLimit] = useState(PLACES_PAGE);

  const favorites = useMemo(
    () =>
      mergeKept(data?.favorites ?? [], Object.values(favOff), idOf, sortKey),
    [data, favOff],
  );
  const blocked = useMemo(
    () =>
      mergeKept(data?.blocked ?? [], Object.values(unblocked), idOf, sortKey),
    [data, unblocked],
  );
  const shownFav = useMemo(
    () => favorites.slice(0, favLimit),
    [favorites, favLimit],
  );
  const shownBlock = useMemo(
    () => blocked.slice(0, blockLimit),
    [blocked, blockLimit],
  );

  const refs = useMemo(
    () =>
      [...shownFav, ...shownBlock].map((p) => ({
        placeId: p.placeId,
        placeUrl: p.placeUrl,
      })),
    [shownFav, shownBlock],
  );
  const names = useRecordNames(
    refs,
    office?.position ?? null,
    "me_places",
    !!data,
  );

  // 데스크톱 우측 지도: 보이는 즐겨찾기
  const setPins = useMeMap((s) => s.setPins);
  useEffect(() => {
    const pins: MeMapPin[] = [];
    for (const p of shownFav) {
      const r = names.get(p.placeId);
      if (r?.status === "resolved" && !favOff[p.placeId])
        pins.push({
          id: p.placeId,
          name: r.place.name,
          position: r.place.position,
        });
    }
    setPins(pins);
  }, [shownFav, names, favOff, setPins]);

  const guard = useOfflineGuard(offline);
  const afterWrite = (placeId: string) => {
    void invalidateAfterWrite(client, "my-places");
    void client.invalidateQueries({ queryKey: placeUserStateKey(placeId) });
  };

  const toggleFavorite = async (p: MyPlace) => {
    const turningOff = !favOff[p.placeId];
    const result = await setFavoriteAction({
      placeId: p.placeId,
      placeUrl: p.placeUrl,
      on: !turningOff,
    });
    if (!result.ok) {
      void toast.error(
        result.error === "blocked"
          ? copy.places.favoriteBlocked
          : copy.states.saveError,
      );
      return;
    }
    setFavOff((m) => toggleKept(m, p, turningOff));
    afterWrite(p.placeId);
  };

  const toggleBlocked = async (p: MyPlace) => {
    const releasing = !unblocked[p.placeId];
    const result = await setBlockedAction({
      placeId: p.placeId,
      placeUrl: p.placeUrl,
      on: !releasing,
    });
    if (!result.ok) {
      void toast.error(copy.states.saveError);
      return;
    }
    setUnblocked((m) => toggleKept(m, p, releasing));
    afterWrite(p.placeId);
  };

  if (q.isError && !q.data) {
    return (
      <ErrorState
        className="pt-4"
        title={copy.states.error.title}
        body={copy.states.error.body}
        action={{ onClick: () => void q.refetch() }}
      />
    );
  }
  // 받아 둔 것이 없는데 연결이 끊겼으면 오프라인 안내(연결되면 쿼리가 다시 부른다)
  if (offline && !q.data) return <OfflineState className="pt-4" />;
  if (q.isPending) return <PlacesSkeleton />;

  return (
    <>
      {offline ? <OfflineBanner className="mb-6" /> : null}
      {names.allFailed ? <NamesFailNote className="mb-6" /> : null}
      <section aria-labelledby="me-fav" className="flex flex-col">
        <SectionHead
          id="me-fav"
          title={copy.places.favorites}
          count={copy.places.count(data?.favorites.length ?? 0)}
        />
        {favorites.length === 0 ? (
          <p className="border-y border-border py-5 type-body-sm break-keep text-muted-foreground">
            {copy.places.favoritesEmpty}
          </p>
        ) : (
          <>
            <ul
              aria-labelledby="me-fav"
              className="flex flex-col border-t border-border"
            >
              {shownFav.map((p, i) => (
                <FavoriteRow
                  key={p.placeId}
                  item={p}
                  index={i}
                  names={names}
                  on={!favOff[p.placeId]}
                  offline={offline}
                  onToggle={guard(() => void toggleFavorite(p))}
                />
              ))}
            </ul>
            {favorites.length > favLimit ? (
              <MoreButton
                label={copy.places.more}
                onClick={() => setFavLimit((n) => n + PLACES_PAGE)}
              />
            ) : null}
          </>
        )}
      </section>

      <section aria-labelledby="me-block" className="mt-12 flex flex-col">
        <SectionHead
          id="me-block"
          title={copy.places.blocklist}
          count={copy.places.count(data?.blocked.length ?? 0)}
        />
        {blocked.length === 0 ? (
          <p className="border-y border-border py-5 type-body-sm text-muted-foreground">
            {copy.places.blocklistEmpty}
          </p>
        ) : (
          <>
            <p className="pb-3 type-body-sm break-keep text-muted-foreground">
              {copy.places.blockNote}
            </p>
            <ul
              aria-labelledby="me-block"
              className="flex flex-col border-t border-border"
            >
              {shownBlock.map((p, i) => (
                <BlockRow
                  key={p.placeId}
                  item={p}
                  index={i}
                  names={names}
                  released={!!unblocked[p.placeId]}
                  offline={offline}
                  onToggle={guard(() => void toggleBlocked(p))}
                />
              ))}
            </ul>
            {blocked.length > blockLimit ? (
              <MoreButton
                label={copy.places.more}
                onClick={() => setBlockLimit((n) => n + PLACES_PAGE)}
              />
            ) : null}
          </>
        )}
      </section>
    </>
  );
}

function FavoriteRow({
  item,
  index,
  names,
  on,
  offline,
  onToggle,
}: {
  item: MyPlace;
  index: number;
  names: RecordNames;
  on: boolean;
  offline: boolean;
  onToggle: () => void;
}) {
  const entry = useDetailEntry();
  const place = toRowPlace(
    item.placeId,
    names.get(item.placeId),
    placeLinkFor(item),
  );
  const fallback = savedFallbackName(index);
  const title = place.name ?? fallback;
  const [message, setMessage] = useState("");
  return (
    <li className="flex min-h-18 items-center gap-4 border-b border-border py-3">
      <PlaceGlyph
        place={place}
        pending={names.pending}
        className={cn(
          "transition-opacity duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
          !on && "opacity-50",
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <PlaceName
          place={place}
          fallback={fallback}
          pending={names.pending}
          onOpen={entry.openPlace}
          onPreload={entry.preload}
          className={cn(!on && "text-muted-foreground")}
        />
        <span className="type-caption text-muted-foreground">
          {copy.places.savedOn(dateOf(item.createdAt))}
        </span>
      </div>
      <button
        type="button"
        aria-label={copy.places.favoriteToggle(title)}
        aria-pressed={on}
        aria-disabled={offline || undefined}
        onClick={() => {
          if (!offline)
            setMessage(
              on ? copy.places.favoriteRemoved : copy.places.favoriteAdded,
            );
          onToggle();
        }}
        className={cn(btn.ghostIcon, "-mr-2.5")}
      >
        <Star
          aria-hidden
          className={cn(
            "size-5 transition-[fill,color] duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
            on ? "fill-foreground text-foreground" : "text-muted-foreground",
          )}
          strokeWidth={1.5}
        />
      </button>
      <span role="status" className="sr-only">
        {message}
      </span>
    </li>
  );
}

function BlockRow({
  item,
  index,
  names,
  released,
  offline,
  onToggle,
}: {
  item: MyPlace;
  index: number;
  names: RecordNames;
  released: boolean;
  offline: boolean;
  onToggle: () => void;
}) {
  const entry = useDetailEntry();
  const place = toRowPlace(
    item.placeId,
    names.get(item.placeId),
    placeLinkFor(item),
  );
  const fallback = savedFallbackName(index);
  const title = place.name ?? fallback;
  return (
    <li className="flex min-h-18 items-center gap-4 border-b border-border py-3">
      <PlaceGlyph
        pending={names.pending}
        place={place}
        className={cn(released && "opacity-50")}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <PlaceName
          place={place}
          fallback={fallback}
          pending={names.pending}
          onOpen={entry.openPlace}
          onPreload={entry.preload}
          className={cn(released && "text-muted-foreground")}
        />
        {released ? (
          <span
            role="status"
            className="animate-in type-caption text-muted-foreground duration-(--lm-duration-fast) ease-enter fade-in motion-reduce:animate-none"
          >
            {copy.places.unblocked}
          </span>
        ) : (
          <span className="type-caption text-muted-foreground">
            {copy.places.blockedOn(dateOf(item.createdAt))}
          </span>
        )}
      </div>
      {released ? (
        <button
          type="button"
          aria-label={copy.places.undoLabel(title)}
          aria-disabled={offline || undefined}
          onClick={onToggle}
          className={cn(btn.text, "shrink-0")}
        >
          {copy.places.undo}
        </button>
      ) : (
        <button
          type="button"
          aria-label={copy.places.unblockLabel(title)}
          aria-disabled={offline || undefined}
          onClick={onToggle}
          className={cn(btn.small, "shrink-0")}
        >
          {copy.places.unblock}
        </button>
      )}
    </li>
  );
}

function PlacesSkeleton() {
  return (
    <LoadingRegion label={copy.states.loading} className="flex flex-col">
      {[3, 2].map((rows, s) => (
        <div key={s} className={cn("flex flex-col", s > 0 && "mt-12")}>
          <div className="flex min-h-11 items-center justify-between">
            <SkeletonLine type="caption" className="w-16" />
            <SkeletonLine type="caption" className="w-8" />
          </div>
          {Array.from({ length: rows }, (_, i) => (
            <div
              key={i}
              className="flex min-h-18 items-center gap-4 border-b border-border py-3"
            >
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <SkeletonLine
                  type="label"
                  className={i % 2 ? "w-24" : "w-32"}
                />
                <SkeletonLine type="caption" className="w-20" />
              </div>
              <Skeleton className="size-5 rounded-full" />
            </div>
          ))}
        </div>
      ))}
    </LoadingRegion>
  );
}
