"use client";
// 나 탭 "후기" 패널 (T6.13, HIS-03, FB-07, D-12 안건 6, 7, 9, DESIGN.md 5장 "나 탭").
// - 내 후기 최신순 20개씩(useMyReviews), "더 보기"로 다음 20개.
// - 한 건: 이름(누르면 상세), 방문 월 / 내 평가, 1인 가격, 태그 / 글 2줄 / 공개 또는 나만 보기 + 수정, 삭제.
// - 수정은 식후 피드백 시트(D-11)로 간다(detail-entry.tsx openReviewEditor). 삭제는 그 자리 확인(안건 9),
//   초점은 그 자리에 남고, 지운 줄은 "후기를 지웠습니다." 한 줄로 떠날 때까지 남는다.
// - 이름을 못 찾은 후기는 "남긴 후기 N"(순번, 날짜 중복 피함, g6 6절) + 카카오맵 링크.
// 비공개 글은 본인 세션으로만 읽는다(myReviewsAction, RLS 본인 정책).
import { useQueryClient } from "@tanstack/react-query";
import { Globe, Lock } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ErrorState,
  LoadingRegion,
  OfflineState,
  SkeletonLine,
} from "@/components/states";
import { buttonClass } from "@/components/ui/button-classes";
import { toast } from "@/components/ui/lazy-toaster";
import { Skeleton } from "@/components/ui/skeleton";
import { reviewTagLabels } from "@/copy/feedback";
import { historyCopy as copy } from "@/copy/history";
import { deleteReviewAction } from "@/features/feedback/actions";
import type { MyReview } from "@/features/feedback/my-records";
import { useMyReviews } from "@/features/feedback/use-my-records";
import { placeLinkFor } from "@/features/place/resolve-place-names";
import { formatWon } from "@/lib/format";
import { invalidateAfterWrite } from "@/lib/query/db-keys";
import { cn } from "@/lib/utils";
import { useDetailEntry, type OfficeAnchor } from "./detail-entry";
import { useMeMap, type MeMapPin } from "./me-map-store";
import { mergeKept, reviewFallbackName, visitMonthLabel } from "./model";
import {
  MoreButton,
  NamesFailNote,
  OfflineBanner,
  PlaceGlyph,
  PlaceName,
  RatingMark,
  btn,
  toRowPlace,
  useOfflineGuard,
} from "./parts";
import { useRecordNames, type RecordNames } from "./use-record-names";

const idOf = (r: MyReview) => r.id;
const sortKey = (r: MyReview) => r.createdAt;

export function ReviewsPanel({
  office,
  offline,
}: {
  office: OfficeAnchor | null;
  offline: boolean;
}) {
  const client = useQueryClient();
  const q = useMyReviews();
  const [deleted, setDeleted] = useState<Record<string, MyReview>>({});

  const server = useMemo(
    () => q.data?.pages.flatMap((p) => (p.signedIn ? p.reviews : [])) ?? [],
    [q.data],
  );
  const reviews = useMemo(
    () => mergeKept(server, Object.values(deleted), idOf, sortKey),
    [server, deleted],
  );
  const refs = useMemo(
    () => reviews.map((r) => ({ placeId: r.placeId, placeUrl: r.placeUrl })),
    [reviews],
  );
  const names = useRecordNames(
    refs,
    office?.position ?? null,
    "me_reviews",
    !!q.data,
  );

  const setPins = useMeMap((s) => s.setPins);
  useEffect(() => {
    const pins: MeMapPin[] = [];
    const seen = new Set<string>();
    for (const r of reviews) {
      const p = names.get(r.placeId);
      if (deleted[r.id] || seen.has(r.placeId) || p?.status !== "resolved")
        continue;
      seen.add(r.placeId);
      pins.push({
        id: r.placeId,
        name: p.place.name,
        position: p.place.position,
      });
    }
    setPins(pins);
  }, [reviews, names, deleted, setPins]);

  const guard = useOfflineGuard(offline);

  const remove = async (review: MyReview): Promise<boolean> => {
    const result = await deleteReviewAction({ reviewId: review.id });
    if (!result.ok) {
      void toast.error(copy.states.saveError);
      return false;
    }
    setDeleted((d) => ({ ...d, [review.id]: review }));
    void invalidateAfterWrite(client, "review", review.placeId);
    return true;
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
  if (q.isPending) return <ReviewsSkeleton />;

  return (
    <>
      {offline ? <OfflineBanner className="mb-6" /> : null}
      {names.allFailed ? <NamesFailNote className="mb-6" /> : null}
      <h2 id="me-reviews" className="sr-only">
        {copy.reviews.title}
      </h2>
      {reviews.length === 0 ? (
        <p className="border-y border-border py-5 type-body-sm break-keep text-muted-foreground">
          {copy.reviews.empty}
        </p>
      ) : (
        <div className="flex flex-col">
          <ul
            aria-labelledby="me-reviews"
            className="flex flex-col border-t border-border"
          >
            {reviews.map((r, i) => (
              <ReviewItem
                key={r.id}
                review={r}
                index={i}
                names={names}
                deleted={!!deleted[r.id]}
                offline={offline}
                guard={guard}
                onDelete={() => remove(r)}
              />
            ))}
          </ul>
          {q.hasNextPage ? (
            <MoreButton
              label={copy.reviews.more}
              busy={q.isFetchingNextPage}
              onClick={() => void q.fetchNextPage()}
            />
          ) : null}
          <p className="mt-4 flex items-start gap-2 type-caption break-keep text-muted-foreground">
            <Lock
              aria-hidden
              className="mt-0.5 size-3.5 shrink-0"
              strokeWidth={1.75}
            />
            {copy.reviews.privateHint}
          </p>
        </div>
      )}
    </>
  );
}

function ReviewItem({
  review,
  index,
  names,
  deleted,
  offline,
  guard,
  onDelete,
}: {
  review: MyReview;
  index: number;
  names: RecordNames;
  deleted: boolean;
  offline: boolean;
  guard: (fn: () => void) => () => void;
  onDelete: () => Promise<boolean>;
}) {
  const entry = useDetailEntry();
  const [phase, setPhase] = useState<"idle" | "confirm" | "busy">("idle");
  const askId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const place = toRowPlace(
    review.placeId,
    names.get(review.placeId),
    placeLinkFor(review),
  );
  const fallback = reviewFallbackName(index);
  const title = place.name ?? fallback;

  const doneRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (phase === "confirm") confirmRef.current?.focus();
  }, [phase]);
  // 지운 뒤 초점이 사라지지 않게 그 자리 결과 줄로 옮긴다(안건 9: 초점은 그 자리에)
  useEffect(() => {
    if (deleted && phase === "busy") doneRef.current?.focus();
  }, [deleted, phase]);

  if (deleted) {
    return (
      <li className="border-b border-border py-4">
        <p
          ref={doneRef}
          role="status"
          tabIndex={-1}
          className="animate-in type-body-sm text-muted-foreground duration-(--lm-duration-base) fade-in focus:outline-none motion-reduce:animate-none"
        >
          {copy.reviews.deleted}
        </p>
      </li>
    );
  }
  const Privacy = review.isPublic ? Globe : Lock;
  return (
    <li className="flex flex-col gap-2 border-b border-border py-4">
      <div className="flex items-center gap-3">
        <PlaceGlyph pending={names.pending} place={place} size={32} />
        <div className="min-w-0 flex-1">
          <PlaceName
            place={place}
            fallback={fallback}
            pending={names.pending}
            onOpen={entry.openPlace}
            onPreload={entry.preload}
          />
        </div>
        <span className="shrink-0 type-caption text-muted-foreground tabular-nums">
          {visitMonthLabel(review.visitedOn)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pl-11">
        <RatingMark rating={review.rating} withText />
        {review.priceKrw !== null ? (
          <span className="type-caption tabular-nums">
            {copy.reviews.price(formatWon(review.priceKrw))}
          </span>
        ) : null}
        {review.tags.map((t) => (
          <span
            key={t}
            className="rounded-badge border border-input px-2 py-0.5 type-caption"
          >
            {reviewTagLabels[t]}
          </span>
        ))}
      </div>
      <p
        className={cn(
          "line-clamp-2 pl-11 type-body-sm break-keep",
          !review.body && "text-muted-foreground",
        )}
      >
        {review.body ?? copy.reviews.noText}
      </p>
      {review.hidden ? (
        <p className="pl-11 type-caption break-keep text-muted-foreground">
          {copy.reviews.hidden}
        </p>
      ) : null}
      <div className="flex items-center gap-2 pl-11">
        <span className="mr-auto inline-flex items-center gap-1.5 type-caption text-muted-foreground">
          <Privacy aria-hidden className="size-3.5" strokeWidth={1.75} />
          {review.isPublic ? copy.reviews.public : copy.reviews.private}
        </span>
        <button
          type="button"
          aria-label={copy.reviews.editLabel(title)}
          aria-disabled={offline || undefined}
          onClick={guard(() => entry.openReviewEditor(review, place))}
          onPointerEnter={entry.preloadReview}
          onFocus={entry.preloadReview}
          className={btn.text}
        >
          {copy.reviews.edit}
        </button>
        <button
          ref={deleteRef}
          type="button"
          aria-label={copy.reviews.deleteLabel(title)}
          aria-disabled={offline || undefined}
          aria-expanded={phase !== "idle"}
          aria-controls={askId}
          onClick={guard(() => setPhase("confirm"))}
          className={cn(btn.text, "ml-2")}
        >
          {copy.reviews.delete}
        </button>
      </div>
      {phase !== "idle" ? (
        <div
          id={askId}
          role="group"
          aria-label={copy.reviews.deleteAsk}
          aria-busy={phase === "busy" || undefined}
          className="ml-11 flex animate-in flex-col gap-3 rounded-card border border-border bg-card p-4 duration-(--lm-duration-base) fade-in motion-reduce:animate-none"
        >
          <p className="type-body-sm break-keep">
            {copy.reviews.deleteAsk}
            <span className="block type-caption text-muted-foreground">
              {copy.reviews.deleteBody}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              ref={confirmRef}
              type="button"
              aria-disabled={phase === "busy" || offline || undefined}
              onClick={guard(() => {
                if (phase === "busy") return;
                setPhase("busy");
                void onDelete().then((ok) => {
                  if (!ok) setPhase("confirm");
                });
              })}
              className={cn(
                buttonClass("destructive", "sm"),
                "aria-disabled:opacity-60",
              )}
            >
              {copy.reviews.deleteConfirm}
            </button>
            <button
              type="button"
              onClick={() => {
                setPhase("idle");
                deleteRef.current?.focus();
              }}
              className={buttonClass("ghost", "sm")}
            >
              {copy.reviews.keep}
            </button>
          </div>
          {phase === "busy" ? (
            <span role="status" className="sr-only">
              {copy.reviews.deleting}
            </span>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function ReviewsSkeleton() {
  return (
    <LoadingRegion
      label={copy.states.loading}
      className="flex flex-col border-t border-border"
    >
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 border-b border-border py-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <SkeletonLine type="label" className={i % 2 ? "w-24" : "w-32"} />
          </div>
          <div className="flex flex-col gap-1.5 pl-11">
            <SkeletonLine type="caption" className="w-40" />
            <SkeletonLine type="body-sm" className="w-full" />
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}
