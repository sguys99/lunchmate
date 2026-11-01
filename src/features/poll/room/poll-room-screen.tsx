"use client";
// 투표방 화면 (T7.16~T7.19, T7.22, T7.23, POLL-06~09, POLL-12, POLL-13, DEAL-05, D-14). 참여자만 이 화면을 본다.
// 구조: 머리(caption, 세리프 질문, 연 사람) → 참여 줄 + 카운트다운 → 후보 목록(라디오 줄 + 득표 바) → 하단 행동 줄.
// 결과는 축하 한 줄 + 홈 큰 카드 문법 확정 카드 + 득표순 목록 + 길찾기(올리브 하나)와 결과 공유(테두리).
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Link2, Share2, XCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState, ErrorState, StateGlyph } from "@/components/states";
import { pollCopy as copy } from "@/copy/poll";
import { PlaceMoreMenu } from "@/features/place/detail/more-menu";
import { highlightSchedule, highlightSettleMs } from "@/features/rec/roulette";
import { haptic } from "@/lib/haptics";
import { useOnlineStatus } from "@/lib/network";
import { MotionProvider, useMotionReduced } from "@/lib/motion";
import { formatPriceBand, withRo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { pollTabHref } from "../routes";
import { markPollSharedAction } from "./actions";
import type { PollErrorCode } from "./errors";
import {
  approvedCandidates,
  leaders,
  rankByVotes,
  resolvedWay,
  sameVotes,
  type PollRoom,
  type RoomCandidate,
  type RoomPhase,
} from "./model";
import {
  AvoidNote,
  CandidateArt,
  CandidateBadges,
  CandidateMeta,
  CandidateName,
  ConfirmBox,
  HeadCaption,
  LiveDot,
  LiveLostLine,
  OfflineLine,
  ParticipantsRow,
  PollCountdown,
  RoomColumn,
  RoomSkeleton,
  SelectMark,
  Stat,
  StickyActions,
  VoteBar,
  VoteCount,
  buttonClass,
  candidateBadges,
  enterClass,
  iconButton,
  nameOf,
  textButton,
  useDeadlineText,
} from "./parts";
import { usePollMap } from "./poll-map-store";
import { ResultActions } from "./result-actions";
import { SuggestPanel } from "./suggest-panel";
import { useAvoidFlags } from "./use-avoid-flags";
import {
  useCandidatePlaces,
  type CandidatePlace,
} from "./use-candidate-places";
import { PollLoadError, usePollRoom } from "./use-poll-room";

export function PollRoomScreen({ pollId }: { pollId: string }) {
  return (
    <MotionProvider>
      <RoomColumn>
        <RoomBody pollId={pollId} />
      </RoomColumn>
    </MotionProvider>
  );
}

function RoomBody({ pollId }: { pollId: string }) {
  const online = useOnlineStatus();
  const state = usePollRoom(pollId, online);
  const { room, phase, query } = state;

  if (!room || !phase) {
    if (query.isError) {
      const code =
        query.error instanceof PollLoadError ? query.error.code : "save";
      // 마감 뒤 새로 들어온 사람은 다시 시도해도 같으므로 마감 안내와 투표 탭 버튼을 보인다(T8.13)
      if (online && code === "not_member") return <RoomNotice kind="closed" />;
      return (
        <div className="flex flex-1 flex-col justify-center py-10">
          {online ? (
            <ErrorState
              title={copy.states.error.title}
              body={copy.states.error.body}
              action={{
                label: copy.actions.retry,
                onClick: () => void query.refetch(),
              }}
              headingLevel="h1"
            />
          ) : (
            <EmptyState
              title={copy.states.offline.title}
              body={copy.states.offline.guestBody}
              visual={<StateGlyph icon={XCircle} />}
              headingLevel="h1"
            />
          )}
        </div>
      );
    }
    return <RoomSkeleton />;
  }
  if (phase === "canceled") return <RoomNotice kind="canceled" />;
  return <Room state={state} room={room} phase={phase} online={online} />;
}

export function RoomNotice({
  kind,
}: {
  kind: "canceled" | "expired" | "closed" | "full" | "notFound";
}) {
  const c = copy.notices[kind];
  return (
    <div className="flex flex-1 flex-col justify-center py-10">
      <EmptyState
        title={c.title}
        body={c.body}
        visual={<StateGlyph icon={XCircle} />}
        action={{
          label: copy.actions.toPollTab,
          href: pollTabHref,
          variant: "primary",
        }}
        headingLevel="h1"
      />
    </div>
  );
}

type RoomState = ReturnType<typeof usePollRoom>;

function Room({
  state,
  room,
  phase,
  online,
}: {
  state: RoomState;
  room: PollRoom;
  phase: RoomPhase;
  online: boolean;
}) {
  const client = useQueryClient();
  const reduced = useMotionReduced();
  const meal = room.poll.kind === "lunch" ? "lunch" : "dinner";
  const approved = useMemo(() => approvedCandidates(room), [room]);
  const suggested = room.candidates.filter((c) => c.status === "suggested");
  const refs = useMemo(
    () =>
      room.candidates.map((c) => ({
        placeId: c.placeId,
        placeUrl: c.placeUrl,
      })),
    [room.candidates],
  );
  const places = useCandidatePlaces(refs, room.poll.anchor, room.poll.radiusM, {
    meal,
    withStats: true,
  });
  const avoid = useAvoidFlags(
    room,
    approved,
    places.get,
    online && phase === "vote",
  );

  /* ---------- 룰렛 연출 (방장, POLL-08) ---------- */
  const [rolling, setRolling] = useState<{
    frozen: PollRoom;
    highlight: string | null;
  } | null>(null);
  const shown = rolling?.frozen ?? room;
  const shownPhase: RoomPhase = rolling ? "tie" : phase;

  const startRoulette = useCallback(async () => {
    const frozen = room;
    const tieIds = leaders(approvedCandidates(frozen));
    setRolling({ frozen, highlight: tieIds[0] ?? null });
    const r = await state.actions.resolveTie(null);
    const after = await state.query.refetch();
    const winnerPlace = after.data?.poll.winnerPlaceId;
    const target = tieIds.findIndex(
      (id) =>
        frozen.candidates.find((c) => c.id === id)?.placeId === winnerPlace,
    );
    if (!r.ok || target < 0 || reduced) {
      setRolling(null);
      if (r.ok) haptic("success");
      return;
    }
    const steps = highlightSchedule(tieIds.length, target);
    steps.forEach((s) =>
      setTimeout(
        () =>
          setRolling((v) =>
            v ? { ...v, highlight: tieIds[s.index] ?? null } : v,
          ),
        s.atMs,
      ),
    );
    setTimeout(() => {
      setRolling(null);
      haptic("success");
    }, highlightSettleMs(steps));
  }, [room, state.actions, state.query, reduced]);

  /* ---------- 지도 (데스크톱) ---------- */
  const setMap = usePollMap((s) => s.setView);
  const clearMap = usePollMap((s) => s.clear);
  const lead = leaders(approved);
  const activePlaceId =
    phase === "result"
      ? room.poll.winnerPlaceId
      : lead.length === 1
        ? (approved.find((c) => c.id === lead[0])?.placeId ?? null)
        : null;
  const pinKey = approved
    .map((c) => `${c.placeId}:${places.get(c.placeId).status}`)
    .join("|");
  useEffect(() => {
    const pins = approved.flatMap((c) => {
      const p = places.get(c.placeId);
      return p.status === "resolved"
        ? [{ id: p.placeId, name: p.name, position: p.position }]
        : [];
    });
    setMap({ base: room.poll.anchor, pins, activeId: activePlaceId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinKey, activePlaceId, room.poll.anchor.lat, room.poll.anchor.lng]);
  useEffect(() => clearMap, [clearMap]);

  if (shownPhase === "result" && room.poll.winnerPlaceId) {
    return <ResultView room={room} approved={approved} getPlace={places.get} />;
  }
  if (shownPhase === "noResult") {
    return (
      <>
        <TopBar
          room={room}
          phase={phase}
          online={online}
          onAfterCancel={() => undefined}
        />
        <div className="flex flex-1 flex-col justify-center py-10">
          <EmptyState
            title={copy.result.noVotesTitle}
            body={copy.result.noVotesBody}
            visual={<StateGlyph icon={XCircle} />}
            action={{
              label: copy.actions.toPollTab,
              href: pollTabHref,
              variant: "primary",
            }}
            headingLevel="h1"
          />
        </div>
      </>
    );
  }

  return (
    <VotingView
      state={state}
      room={shown}
      phase={shownPhase}
      online={online}
      approved={rolling ? approvedCandidates(shown) : approved}
      suggested={suggested}
      getPlace={places.get}
      avoidFlagged={avoid.flagged}
      rollingHighlight={rolling?.highlight ?? null}
      rolling={rolling !== null}
      onRoulette={startRoulette}
      onCanceled={() =>
        void client.invalidateQueries({ queryKey: ["db", "poll"] })
      }
    />
  );
}

/* ---------- 머리줄 ---------- */

function TopBar({
  room,
  phase,
  online,
  onAfterCancel,
  onAskCancel,
}: {
  room: PollRoom;
  phase: RoomPhase;
  online: boolean;
  onAfterCancel: () => void;
  onAskCancel?: () => void;
}) {
  const share = useCallback(
    async (channel: "share" | "copy") => {
      const { shareInvite } =
        await import("@/features/poll/share/share-invite");
      const useChannel =
        channel === "share" &&
        typeof navigator !== "undefined" &&
        typeof navigator.share !== "function"
          ? "copy"
          : channel;
      const outcome = await shareInvite({
        code: room.poll.code,
        title: room.poll.title,
        closesAt: room.poll.closesAt,
        candidateCount: approvedCandidates(room).length,
        kind: room.poll.kind,
        channel: useChannel,
      });
      if (
        room.poll.isHost &&
        !room.poll.shared &&
        (outcome === "shared" || outcome === "copied")
      ) {
        void markPollSharedAction(room.poll.id);
      }
    },
    [room],
  );
  void onAfterCancel;
  const live = phase === "vote" || phase === "tie" || phase === "closing";
  return (
    <div className="-mx-2 flex h-14 items-center justify-between">
      <Link
        href={pollTabHref}
        aria-label={copy.head.backLabel}
        className={iconButton}
      >
        <ChevronLeft aria-hidden className="size-6" strokeWidth={1.5} />
      </Link>
      <div className="flex items-center gap-1">
        {live && online ? (
          <button
            type="button"
            aria-label={copy.head.shareLabel}
            className={iconButton}
            onClick={() => void share("share")}
          >
            <Share2 aria-hidden className="size-5" strokeWidth={1.5} />
          </button>
        ) : null}
        {room.poll.isHost && live && online && onAskCancel ? (
          <PlaceMoreMenu
            label={copy.head.moreLabel}
            side="bottom"
            triggerClassName={iconButton}
            reports={[]}
            actions={[
              {
                key: "copy",
                label: copy.actions.copyLink,
                icon: Link2,
                onSelect: () => void share("copy"),
              },
              {
                key: "cancel",
                label: copy.actions.cancelPoll,
                icon: XCircle,
                onSelect: onAskCancel,
              },
            ]}
          />
        ) : null}
      </div>
    </div>
  );
}

/* ---------- 진행 중, 동점 ---------- */

function VotingView({
  state,
  room,
  phase,
  online,
  approved,
  suggested,
  getPlace,
  avoidFlagged,
  rollingHighlight,
  rolling,
  onRoulette,
  onCanceled,
}: {
  state: RoomState;
  room: PollRoom;
  phase: RoomPhase;
  online: boolean;
  approved: readonly RoomCandidate[];
  suggested: readonly RoomCandidate[];
  getPlace: (placeId: string) => CandidatePlace;
  avoidFlagged: ReadonlySet<string>;
  rollingHighlight: string | null;
  rolling: boolean;
  onRoulette: () => void;
  onCanceled: () => void;
}) {
  const { poll } = room;
  const tie = phase === "tie";
  const voted = room.myVotes.length > 0;
  const [changing, setChanging] = useState(false);
  const [picks, setPicks] = useState<string[]>([]);
  const [tiePick, setTiePick] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | "decide" | "cancel">(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [writeError, setWriteError] = useState<PollErrorCode | null>(null);
  const announcedIncoming = useRef(state.incoming);

  // 다른 사람 표: "다른 참여자가 투표했습니다"(어디에 찍었는지는 읽지 않음)
  useEffect(() => {
    if (state.incoming !== announcedIncoming.current) {
      announcedIncoming.current = state.incoming;
      setNotice(copy.live.someoneVoted);
    }
  }, [state.incoming]);

  // 전송 실패 뒤에도 picks는 비우지 않으므로 고른 곳이 화면에 남는다(성공했을 때만 비운다)

  const selecting = phase === "vote" && online && (!voted || changing);
  const lead = leaders(approved);
  const max = Math.max(1, ...approved.map((c) => c.votes ?? 0));
  const tieIds = tie ? lead : [];
  const anyAvoid = approved.some((c) => avoidFlagged.has(c.placeId));

  const toggle = (id: string) => {
    if (tie) {
      if (poll.isHost && !rolling) setTiePick(id);
      return;
    }
    if (!selecting) return;
    setPicks((cur) =>
      poll.multi
        ? cur.includes(id)
          ? cur.filter((x) => x !== id)
          : [...cur, id]
        : [id],
    );
    state.clearSendFailure();
  };

  const submit = async (next: string[]) => {
    if (next.length === 0 && !voted) return;
    const ok = await state.vote(next);
    if (ok) {
      setChanging(false);
      setPicks([]);
      setNotice(next.length === 0 ? copy.voted.canceled : copy.voted.sent);
      if (next.length > 0) haptic("select");
    }
  };

  const runHost = async (
    fn: () => Promise<{ ok: boolean; error?: PollErrorCode }>,
  ) => {
    if (busy) return;
    setBusy(true);
    setWriteError(null);
    const r = await fn();
    setBusy(false);
    setConfirm(null);
    if (!r.ok) setWriteError(r.error ?? "save");
    return r;
  };

  const kindLabel = copy.kind[poll.kind];
  const deadlineText = useDeadlineText(poll.closesAt);
  const host = room.members.find((m) => m.isHost);
  const totalVotes = approved.reduce((n, c) => n + (c.votes ?? 0), 0);

  return (
    <>
      <TopBar
        room={room}
        phase={phase}
        online={online}
        onAfterCancel={onCanceled}
        onAskCancel={() => setConfirm("cancel")}
      />
      <p role="status" className="sr-only">
        {notice}
      </p>

      {confirm === "cancel" ? (
        <ConfirmBox
          title={copy.host.cancelTitle}
          body={copy.host.cancelBody}
          confirm={copy.host.cancelConfirm}
          keep={copy.host.cancelKeep}
          destructive
          busy={busy}
          onConfirm={() => void runHost(state.actions.cancel)}
          onKeep={() => setConfirm(null)}
          className="mb-4"
        />
      ) : null}

      <header className="flex flex-col pt-1">
        <HeadCaption kindLabel={kindLabel} deadline={deadlineText} />
        <h1 className="mt-2 type-title text-balance break-keep">
          {copy.head.question(poll.title)}
        </h1>
        <p className="mt-2 type-caption text-muted-foreground">
          {poll.isHost
            ? copy.head.hostedByMe
            : host?.nickname
              ? copy.head.hostedBy(host.nickname)
              : copy.head.hostedByUnknown}
        </p>
        <div className="mt-6 flex items-end justify-between gap-4 border-b border-border pb-4">
          <ParticipantsRow members={room.members} voted={room.voterCount} />
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="flex items-center gap-2 type-caption text-muted-foreground">
              {online && state.live === "live" ? <LiveDot /> : null}
              {phase === "vote" ? copy.head.untilDeadline : null}
            </span>
            {phase === "vote" ? (
              <PollCountdown deadline={poll.closesAt} onDone={state.tick} />
            ) : phase === "closing" ? (
              <span className="type-body-sm text-muted-foreground">
                {copy.head.closingNow}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {!online ? <OfflineLine className="mt-6" /> : null}
      {online && state.live === "lost" && phase !== "closing" ? (
        <LiveLostLine className="mt-6" onReconnect={state.reconnect} />
      ) : null}

      {tie ? (
        <div role="status" className="mt-8 flex flex-col gap-1">
          {poll.isHost ? (
            <>
              <p className="type-label">{copy.tie.hostTitle(tieIds.length)}</p>
              <p className="type-body-sm text-muted-foreground">
                {rolling ? copy.tie.rolling : copy.tie.hostBody}
              </p>
            </>
          ) : (
            <>
              <p className="type-label">{copy.tie.memberTitle}</p>
              <p className="type-body-sm text-muted-foreground">
                {copy.tie.autoNote}
              </p>
            </>
          )}
        </div>
      ) : null}

      {phase === "vote" && totalVotes === 0 && !voted ? (
        <p className="mt-8 type-body-sm text-muted-foreground">
          <span className="text-foreground">{copy.states.empty.title}.</span>{" "}
          {copy.states.empty.body}
        </p>
      ) : null}

      <CandidateList
        title={poll.title}
        approved={approved}
        getPlace={getPlace}
        avoidFlagged={avoidFlagged}
        multi={poll.multi && !tie}
        tie={tie}
        tieIds={tieIds}
        lead={lead}
        max={max}
        selectedIds={
          tie
            ? rolling
              ? rollingHighlight
                ? [rollingHighlight]
                : []
              : tiePick
                ? [tiePick]
                : []
            : selecting
              ? picks
              : room.myVotes
        }
        mine={room.myVotes}
        interactive={tie ? poll.isHost && !rolling && online : selecting}
        highlight={rolling ? rollingHighlight : null}
        onToggle={toggle}
      />

      {anyAvoid ? <AvoidNote className="mt-5" /> : null}

      {phase === "vote" && online ? (
        <SuggestPanel
          room={room}
          suggested={suggested}
          getPlace={getPlace}
          onReview={state.actions.review}
          onAdd={state.actions.add}
          className="mt-6"
        />
      ) : null}

      {writeError ? (
        <p role="alert" className="mt-4 type-body-sm text-destructive">
          {writeError === "closed"
            ? copy.errors.closed
            : writeError === "not_host"
              ? copy.errors.notHost
              : writeError === "suspended"
                ? copy.errors.suspended
                : copy.errors.save}
        </p>
      ) : null}

      <div className="h-8" />

      {phase === "vote" ? (
        <VoteActionsRow
          isHost={poll.isHost}
          multi={poll.multi}
          online={online}
          voted={voted}
          changing={changing}
          picks={picks}
          myVotes={room.myVotes}
          sending={state.sendState.status === "sending"}
          sendFailed={state.sendState.status === "failed"}
          confirmDecide={confirm === "decide"}
          busy={busy}
          onSubmit={() => void submit(picks)}
          onRetry={() => void submit(picks)}
          onChange={() => {
            setChanging(true);
            setPicks([...room.myVotes]);
          }}
          onKeep={() => {
            setChanging(false);
            setPicks([]);
          }}
          onCancelVote={() => void submit([])}
          onDecide={() => setConfirm("decide")}
          onConfirmDecide={() => void runHost(state.actions.closeNow)}
          onKeepDeciding={() => setConfirm(null)}
        />
      ) : tie && poll.isHost && online ? (
        <StickyActions>
          <div className="flex gap-2">
            <button
              type="button"
              aria-disabled={rolling || busy || undefined}
              onClick={() => {
                if (!rolling && !busy) onRoulette();
              }}
              className={cn(buttonClass("secondary"), tiePick ? "" : "flex-1")}
            >
              {copy.actions.roulette}
            </button>
            {tiePick ? (
              <button
                type="button"
                aria-disabled={rolling || busy || undefined}
                onClick={() => {
                  if (rolling || busy) return;
                  void runHost(() => state.actions.resolveTie(tiePick)).then(
                    (r) => {
                      if (r?.ok) haptic("success");
                    },
                  );
                }}
                className={cn(buttonClass("primary"), "min-w-0 flex-1")}
              >
                <span className="truncate">
                  {copy.actions.pickThis(
                    withRo(
                      nameOf(
                        getPlace(
                          approved.find((c) => c.id === tiePick)?.placeId ?? "",
                        ),
                        (approved.findIndex((c) => c.id === tiePick) ?? 0) + 1,
                      ),
                    ),
                  )}
                </span>
              </button>
            ) : null}
          </div>
          {!tiePick ? (
            <p className="mt-2 type-caption text-muted-foreground">
              {copy.tie.hostPick}
            </p>
          ) : null}
        </StickyActions>
      ) : null}
    </>
  );
}

function CandidateList({
  title,
  approved,
  getPlace,
  avoidFlagged,
  multi,
  tie,
  tieIds,
  lead,
  max,
  selectedIds,
  mine,
  interactive,
  highlight,
  onToggle,
}: {
  title: string;
  approved: readonly RoomCandidate[];
  getPlace: (placeId: string) => CandidatePlace;
  avoidFlagged: ReadonlySet<string>;
  multi: boolean;
  tie: boolean;
  tieIds: readonly string[];
  lead: readonly string[];
  max: number;
  selectedIds: readonly string[];
  mine: readonly string[];
  interactive: boolean;
  highlight: string | null;
  onToggle: (id: string) => void;
}) {
  const role = multi ? "group" : "radiogroup";
  return (
    <div
      role={role}
      aria-label={copy.candidate.listLabel(title)}
      className="mt-2"
    >
      <ul className="flex flex-col">
        {approved.map((c, i) => {
          const place = getPlace(c.placeId);
          const order = i + 1;
          const votes = c.votes ?? 0;
          const inTie = tieIds.includes(c.id);
          const dim = tie && !inTie;
          const selected = selectedIds.includes(c.id);
          const canPick = interactive && (!tie || inTie);
          const leading = lead.length === 1 && lead[0] === c.id;
          const name = nameOf(place, order);
          return (
            <li
              key={c.id}
              className={cn(
                "relative flex items-start gap-4 border-b border-border py-4 transition-[opacity,box-shadow] duration-(--lm-duration-fast) ease-standard",
                dim && "opacity-45",
                highlight === c.id &&
                  "rounded-lg ring-[1.5px] ring-primary ring-inset",
              )}
            >
              <button
                type="button"
                role={multi ? "checkbox" : "radio"}
                aria-checked={selected}
                aria-disabled={!canPick || undefined}
                onClick={() => {
                  if (canPick) onToggle(c.id);
                }}
                className={cn(
                  "absolute inset-0 z-0 rounded-lg",
                  focusRingClass,
                  canPick ? "cursor-pointer" : "cursor-default",
                )}
              >
                <span className="sr-only">
                  {name}, {copy.candidate.votes(votes)}
                  {avoidFlagged.has(c.placeId) ? `, ${copy.avoid.note}` : ""}
                </span>
              </button>
              <SelectMark selected={selected} multi={multi} />
              <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    {mine.includes(c.id) && !tie ? (
                      <span className="inline-flex items-center gap-1 type-caption text-primary">
                        {copy.candidate.mine}
                      </span>
                    ) : null}
                    {tie && inTie ? (
                      <span className="type-caption text-foreground">
                        {copy.tie.tieBadge}
                      </span>
                    ) : null}
                    <CandidateName
                      place={place}
                      order={order}
                      className="type-heading"
                    />
                    <CandidateMeta place={place} />
                    <CandidateBadges
                      badges={candidateBadges(
                        place,
                        avoidFlagged.has(c.placeId),
                      )}
                    />
                  </div>
                  <CandidateArt place={place} size={48} className="mt-0.5" />
                </div>
                <div className="flex items-center gap-3">
                  <VoteBar value={votes} max={max} leading={leading} />
                  <VoteCount value={votes} leading={leading} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const focusRingClass =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function VoteActionsRow(props: {
  isHost: boolean;
  multi: boolean;
  online: boolean;
  voted: boolean;
  changing: boolean;
  picks: readonly string[];
  myVotes: readonly string[];
  sending: boolean;
  sendFailed: boolean;
  confirmDecide: boolean;
  busy: boolean;
  onSubmit: () => void;
  onRetry: () => void;
  onChange: () => void;
  onKeep: () => void;
  onCancelVote: () => void;
  onDecide: () => void;
  onConfirmDecide: () => void;
  onKeepDeciding: () => void;
}) {
  const p = props;
  if (!p.online) {
    return (
      <StickyActions>
        <button
          type="button"
          aria-disabled
          className={cn(buttonClass("primary"), "w-full")}
        >
          {copy.states.offline.button}
        </button>
      </StickyActions>
    );
  }
  const noPick = p.picks.length === 0;
  const unchanged = p.changing && sameVotes(p.picks, p.myVotes);
  const voteLabel = noPick
    ? copy.actions.pickFirst
    : p.multi && p.picks.length > 1
      ? copy.actions.voteMulti(p.picks.length)
      : copy.actions.vote;
  const disabledVote = noPick || p.sending || unchanged;
  return (
    <StickyActions>
      {p.confirmDecide ? (
        <ConfirmBox
          title={copy.decide.confirmTitle}
          body={copy.decide.confirmBody}
          confirm={copy.decide.confirm}
          keep={copy.decide.keep}
          busy={p.busy}
          onConfirm={p.onConfirmDecide}
          onKeep={p.onKeepDeciding}
          className="mb-3"
        />
      ) : null}
      {p.sendFailed ? (
        <div role="alert" className="mb-3 flex items-center gap-3">
          <p className="min-w-0 flex-1 type-body-sm text-destructive">
            {copy.voted.sendFailed}
          </p>
          <button
            type="button"
            onClick={p.onRetry}
            className={buttonClass("secondary", "sm")}
          >
            {copy.actions.retrySend}
          </button>
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        {p.voted && !p.changing ? (
          <>
            <button
              type="button"
              aria-disabled={p.sending || undefined}
              onClick={() => {
                if (!p.sending) p.onChange();
              }}
              className={cn(buttonClass("secondary"), "flex-1")}
            >
              {copy.actions.change}
            </button>
            {p.isHost ? (
              <button
                type="button"
                aria-disabled={p.sending || undefined}
                onClick={() => {
                  // 방금 낸 표가 저장되기 전에 마감하지 않게 기다린다
                  if (!p.sending) p.onDecide();
                }}
                className={cn(buttonClass("primary"), "flex-1")}
              >
                {copy.actions.decideNow}
              </button>
            ) : (
              <button
                type="button"
                onClick={p.onCancelVote}
                className={cn(textButton, "shrink-0 px-3")}
              >
                {copy.actions.cancelVote}
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              aria-disabled={disabledVote || undefined}
              onClick={() => {
                if (!disabledVote) p.onSubmit();
              }}
              className={cn(buttonClass("primary"), "flex-1")}
            >
              {voteLabel}
            </button>
            {p.changing ? (
              <>
                <button
                  type="button"
                  onClick={p.onKeep}
                  className={buttonClass("secondary")}
                >
                  {copy.actions.cancelChange}
                </button>
                {p.isHost ? (
                  <button
                    type="button"
                    onClick={p.onCancelVote}
                    className={cn(textButton, "shrink-0 px-2")}
                  >
                    {copy.actions.cancelVote}
                  </button>
                ) : null}
              </>
            ) : p.isHost ? (
              <button
                type="button"
                onClick={p.onDecide}
                className={buttonClass("secondary")}
              >
                {copy.actions.decide}
              </button>
            ) : null}
          </>
        )}
      </div>
      {p.voted && !p.changing ? (
        <p className="mt-2 type-caption text-muted-foreground">
          {copy.voted.done}
        </p>
      ) : p.changing ? (
        <p className="mt-2 type-caption text-muted-foreground">
          {copy.voted.changing}
        </p>
      ) : null}
    </StickyActions>
  );
}

/* ---------- 결과 ---------- */

function ResultView({
  room,
  approved,
  getPlace,
}: {
  room: PollRoom;
  approved: readonly RoomCandidate[];
  getPlace: (placeId: string) => CandidatePlace;
}) {
  const { poll } = room;
  const winner = approved.find((c) => c.placeId === poll.winnerPlaceId);
  const winnerIndex = winner ? approved.indexOf(winner) : 0;
  const place = getPlace(poll.winnerPlaceId ?? "");
  const order = rankByVotes(approved);
  const max = Math.max(1, ...approved.map((c) => c.votes ?? 0));
  const winnerVotes = winner?.votes ?? 0;
  const way = resolvedWay(poll);
  const wayText = {
    time: copy.result.byTime,
    host: copy.result.byHost,
    hostTie: copy.result.byHostTie,
    roulette: copy.result.byRoulette,
    auto: copy.result.byAuto,
  }[way];
  const category = place.status === "resolved" ? place.slug : null;

  return (
    <>
      <div className="-mx-2 flex h-14 items-center">
        <Link
          href={pollTabHref}
          aria-label={copy.head.backLabel}
          className={iconButton}
        >
          <ChevronLeft aria-hidden className="size-6" strokeWidth={1.5} />
        </Link>
      </div>
      <header className="flex flex-col pt-1">
        <p className="type-caption text-muted-foreground">{wayText}</p>
        <h1
          className={cn(
            "mt-4 type-display text-balance break-keep motion-safe:transition-[opacity,translate] motion-safe:duration-(--lm-duration-slow) motion-safe:ease-enter motion-safe:starting:translate-y-2 motion-safe:starting:opacity-0",
          )}
        >
          {copy.result.celebrate[poll.kind]}
        </h1>
      </header>

      <section
        aria-label={copy.result.winner(nameOf(place, winnerIndex + 1))}
        className={cn(
          "mt-8 rounded-card border border-border bg-card px-6 pt-6 pb-6 motion-safe:delay-[calc(var(--lm-stagger)*2)]",
          enterClass,
        )}
      >
        <div className="flex items-start gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {category ? (
              <p
                className="type-caption"
                style={{ color: `var(--cat-${category}-ink)` }}
              >
                {place.status === "resolved" ? place.categoryLabel : null}
              </p>
            ) : null}
            <h2 className="type-title break-keep">
              <CandidateName place={place} order={winnerIndex + 1} />
            </h2>
            <CandidateBadges badges={candidateBadges(place, false)} />
          </div>
          <CandidateArt place={place} size={88} className="-mt-2 -mr-2" />
        </div>
        <dl className="mt-6 grid grid-cols-3 divide-x divide-border">
          <Stat
            label={copy.candidate.walk}
            {...(place.status === "resolved"
              ? { value: place.walkMinutes, unit: copy.candidate.minuteUnit }
              : { text: "-" })}
          />
          <Stat
            label={copy.candidate.price}
            text={
              place.status === "resolved" && place.price
                ? formatPriceBand(place.price.priceKRW)
                : "-"
            }
          />
          <Stat
            label={copy.candidate.tally}
            value={winnerVotes}
            unit={copy.candidate.voteUnit}
          />
        </dl>
        <div className="mt-5">
          <VoteBar
            value={winnerVotes}
            max={Math.max(1, room.voterCount)}
            leading
          />
        </div>
        <p className="mt-3 type-body-sm text-muted-foreground">
          {copy.result.tally(winnerVotes, room.members.length)}
        </p>
      </section>

      <section className="mt-10" aria-labelledby="poll-all-votes">
        <h2 id="poll-all-votes" className="type-caption text-muted-foreground">
          {copy.result.allVotes}
        </h2>
        <ol className="mt-2 flex flex-col">
          {order.map((c) => {
            const i = approved.indexOf(c);
            const p = getPlace(c.placeId);
            const isWinner = c.placeId === poll.winnerPlaceId;
            return (
              <li
                key={c.id}
                className="flex items-center gap-3 border-b border-border py-3.5"
              >
                <span className="w-28 min-w-0 shrink-0 truncate type-body-sm">
                  {nameOf(p, i + 1)}
                </span>
                <VoteBar value={c.votes ?? 0} max={max} leading={isWinner} />
                <span
                  className={cn(
                    "w-11 shrink-0 text-right type-numeric-md",
                    isWinner ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {copy.candidate.votes(c.votes ?? 0)}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-5 type-caption text-muted-foreground">
          {copy.result.visitNote}
        </p>
      </section>
      <div className="h-8" />
      <ResultActions
        room={room}
        place={place}
        winnerVotes={winnerVotes}
        category={category}
      />
    </>
  );
}
