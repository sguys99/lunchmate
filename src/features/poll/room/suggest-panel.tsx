"use client";
// 후보 제안과 방장 승인 (T7.17, POLL-07, DESIGN.md 5장 "투표방").
// - 참여자: 목록 아래 "후보 제안" 글자 버튼 → 투표방 기준점 근처 식당(카카오 반경 검색, 세션 메모리)에서 고른다.
//   방장이 승인하면 후보에 들어간다. 한 사람이 3곳까지 기다릴 수 있다(서버 판정).
// - 방장: "제안받은 후보" 점선 줄 + 거절(글자) / 승인(테두리). 방장은 "후보 넣기"로 바로 넣는다.
// - 승인된 후보는 5곳까지(서버 판정). 제안하는 순간 저장되는 값은 place_id, place_url뿐이다(T0.16-1).
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { pollCopy as copy } from "@/copy/poll";
import { categoryLabel } from "@/features/place/categories";
import { CategoryIllustration } from "@/features/place/illustrations";
import { straightDistanceM } from "@/features/rec/candidates";
import { kakaoCategorySlug } from "@/features/rec/kakao-category";
import { walkMinutesFromMeters } from "@/lib/format";
import { restaurantsInRadiusQuery } from "@/lib/kakao/queries";
import { cn } from "@/lib/utils";
import type { PollErrorCode } from "./errors";
import {
  POLL_MAX_CANDIDATES,
  type PollRoom,
  type RoomCandidate,
} from "./model";
import {
  CandidateArt,
  CandidateName,
  buttonClass,
  iconButton,
  nameOf,
  textButton,
} from "./parts";
import type { CandidatePlace } from "./use-candidate-places";

const PICK_LIMIT = 8;

type Result = Promise<{ ok: boolean; error?: PollErrorCode }>;

export function SuggestPanel({
  room,
  suggested,
  getPlace,
  onReview,
  onAdd,
  className,
}: {
  room: PollRoom;
  suggested: readonly RoomCandidate[];
  getPlace: (placeId: string) => CandidatePlace;
  onReview: (candidateId: string, approve: boolean, placeId: string) => Result;
  onAdd: (placeId: string, placeUrl: string | null, isHost: boolean) => Result;
  className?: string;
}) {
  const isHost = room.poll.isHost;
  const approvedCount = room.candidates.filter(
    (c) => c.status === "approved",
  ).length;
  const full = approvedCount >= POLL_MAX_CANDIDATES;
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const errorText = (code?: PollErrorCode) =>
    code === "candidates_full"
      ? copy.errors.full
      : code === "exists"
        ? copy.errors.exists
        : code === "suggestions_full"
          ? copy.errors.suggestionsFull
          : code === "closed"
            ? copy.errors.closed
            : copy.errors.save;

  const review = async (c: RoomCandidate, approve: boolean) => {
    setBusy(c.id);
    setError(null);
    const r = await onReview(c.id, approve, c.placeId);
    setBusy(null);
    if (!r.ok) setError(errorText(r.error));
    else setStatus(approve ? copy.suggest.approved : copy.suggest.rejected);
  };

  const add = async (placeId: string, placeUrl: string) => {
    setBusy(placeId);
    setError(null);
    const r = await onAdd(placeId, placeUrl, isHost);
    setBusy(null);
    if (!r.ok) {
      setError(errorText(r.error));
      return;
    }
    setOpen(false);
    setStatus(isHost ? copy.suggest.approved : copy.suggest.sent);
  };

  const pending = suggested.filter((c) => (isHost ? true : c.suggestedByMe));

  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <p role="status" className="sr-only">
        {status}
      </p>
      {pending.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="type-caption text-muted-foreground">
            {isHost ? copy.suggest.pendingTitle : copy.suggest.mineTitle}
          </h2>
          <ul className="flex flex-col gap-2">
            {pending.map((c, i) => {
              const place = getPlace(c.placeId);
              return (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-card border border-dashed border-input px-4 py-3"
                >
                  <CandidateArt place={place} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate type-label">
                      <CandidateName
                        place={place}
                        order={approvedCount + i + 1}
                      />
                    </p>
                    <p className="type-caption text-muted-foreground">
                      {isHost
                        ? copy.suggest.pendingBy
                        : copy.suggest.mineWaiting}
                    </p>
                  </div>
                  {isHost ? (
                    <>
                      <button
                        type="button"
                        aria-disabled={busy === c.id || undefined}
                        onClick={() => void review(c, false)}
                        aria-label={`${nameOf(place, approvedCount + i + 1)} ${copy.actions.reject}`}
                        className={buttonClass("ghost", "sm")}
                      >
                        {copy.actions.reject}
                      </button>
                      <button
                        type="button"
                        aria-disabled={busy === c.id || full || undefined}
                        onClick={() => {
                          if (!full) void review(c, true);
                        }}
                        aria-label={`${nameOf(place, approvedCount + i + 1)} ${copy.actions.approve}`}
                        className={buttonClass("secondary", "sm")}
                      >
                        {copy.actions.approve}
                      </button>
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {full ? (
        <p className="type-caption text-muted-foreground">
          {copy.suggest.full}
        </p>
      ) : open ? (
        <PlacePicker
          room={room}
          busy={busy}
          onPick={(id, url) => void add(id, url)}
          onClose={() => setOpen(false)}
        />
      ) : (
        <div className="flex">
          <button
            type="button"
            aria-expanded={false}
            onClick={() => {
              setOpen(true);
              setError(null);
            }}
            className={textButton}
          >
            {isHost ? copy.actions.addCandidate : copy.actions.suggest}
          </button>
        </div>
      )}
      {error ? (
        <p role="alert" className="type-body-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}

/** 투표방 기준점 근처 식당에서 고르기. 이미 후보(제안 포함)에 있는 곳은 뺀다 */
function PlacePicker({
  room,
  busy,
  onPick,
  onClose,
}: {
  room: PollRoom;
  busy: string | null;
  onPick: (placeId: string, placeUrl: string) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const q = useQuery(
    restaurantsInRadiusQuery(room.poll.anchor, room.poll.radiusM),
  );
  const taken = useMemo(
    () => new Set(room.candidates.map((c) => c.placeId)),
    [room.candidates],
  );
  const list = (q.data?.places ?? [])
    .filter((p) => !taken.has(p.id))
    .slice(0, PICK_LIMIT);
  const isHost = room.poll.isHost;

  return (
    <div
      role="group"
      aria-labelledby={titleId}
      className="rounded-card border border-border bg-card px-4 pt-4 pb-2 motion-safe:transition-[opacity,translate] motion-safe:duration-(--lm-duration-base) motion-safe:ease-enter motion-safe:starting:translate-y-1 motion-safe:starting:opacity-0"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p id={titleId} className="type-label">
            {isHost ? copy.suggest.hostPickTitle : copy.suggest.pickTitle}
          </p>
          <p className="type-caption text-muted-foreground">
            {isHost ? copy.suggest.hostPickBody : copy.suggest.pickBody}
          </p>
        </div>
        <button
          type="button"
          aria-label={copy.suggest.close}
          onClick={onClose}
          className={cn(iconButton, "-mt-2 -mr-2 shrink-0")}
        >
          <X aria-hidden className="size-5" strokeWidth={1.5} />
        </button>
      </div>
      {q.isPending ? (
        <div
          role="status"
          aria-label={copy.suggest.pickLoading}
          className="flex flex-col gap-3 py-3"
        >
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="py-4 type-body-sm text-muted-foreground">
          {copy.suggest.pickEmpty}
        </p>
      ) : (
        <ul className="mt-2 flex flex-col">
          {list.map((p) => {
            const slug = kakaoCategorySlug(p.categoryName);
            const walk = walkMinutesFromMeters(
              straightDistanceM(room.poll.anchor, p.position),
            );
            return (
              <li
                key={p.id}
                className="border-t border-border first:border-t-0"
              >
                <button
                  type="button"
                  aria-disabled={busy !== null || undefined}
                  onClick={() => {
                    if (busy === null) onPick(p.id, p.placeUrl);
                  }}
                  className="flex min-h-14 w-full items-center gap-3 rounded-lg py-2 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <CategoryIllustration
                    slug={slug}
                    size={32}
                    className="shrink-0"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate type-label">{p.name}</span>
                    <span className="type-caption text-muted-foreground tabular-nums">
                      {categoryLabel(slug)}
                      <span
                        aria-hidden
                        className="mx-2 inline-block h-3 w-px translate-y-0.5 bg-border"
                      />
                      {copy.candidate.walk} {walk}
                      {copy.candidate.minuteUnit}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
