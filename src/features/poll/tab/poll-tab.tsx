"use client";
// 투표 탭 /poll (T7.21, POLL-10, D-15 안건 3, D-16 안건 7). 진행 중과 지난 투표.
// - my_polls가 마감이 지난 방을 먼저 판정해 돌려준다(AC-POLL-2). 목록에 장소 이름은 없다(제목, 상태, 숫자만).
// - 보내지 않고 닫은 방도 "진행 중"에 남는다(D-15 안건 3). 줄을 누르면 투표방(/poll/<code>)에서 다시 보낼 수 있다.
// - 머리 오른쪽 "회식 후보 찾기"(D-16 안건 7). 주 버튼은 두지 않는다(만들기는 오늘 화면 "친구랑 정하기").
// - 4상태: 스켈레톤 줄, 빈 상태(오늘 추천으로), 오류(다시 불러오기), 오프라인.
// - 데스크톱 우측 지도(@map/poll, T8.11b): 진행 중 줄에 마우스나 초점을 두면 지도가 그 방의 후보 핀으로 바뀐다.
// - 지난 투표 줄 끝 휴지통 → 그 자리 확인 → 내 목록에서만 지우기(leave_ended_poll, D-43). 진행 중 방은 버튼이 없다.
//   지운 줄은 떠날 때까지 결과 한 줄로 남는다(나 탭 기록과 같은 방식).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { PageHeader } from "@/components/app-shell";
import {
  EmptyState,
  ErrorState,
  ListSkeleton,
  OfflineState,
} from "@/components/states";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing } from "@/components/ui/interaction";
import { toast } from "@/components/ui/lazy-toaster";
import { rowPress } from "@/components/ui/row-press";
import { pollCreateCopy } from "@/copy/poll-create";
import { type MyPollRow } from "@/features/poll/create/actions";
import { myPollsKey } from "@/features/poll/create/keys";
import { partyHref, pollRoomHref } from "@/features/poll/routes";
import { countdownUnits } from "@/lib/format/countdown-units";
import {
  claimPollClosedReportAction,
  leaveEndedPollAction,
} from "@/features/poll/room/actions";
import { mergeKept } from "@/features/me/history/model";
import { track } from "@/lib/analytics";
import { useOnlineStatus } from "@/lib/network";
import { getKstParts, kstDayDiff } from "@/lib/time";
import { cn } from "@/lib/utils";
import { usePollTabMapFocus } from "./map-focus-store";
import { read } from "@/lib/read";

const copy = pollCreateCopy.tab;

const isPast = (p: MyPollRow) =>
  p.status === "closed" || p.status === "canceled";
const idOf = (p: MyPollRow) => p.pollId;
// my_polls의 지난 방 정렬(coalesce(closed_at, created_at) 내림차순)과 같은 순서
const sortKey = (p: MyPollRow) => p.closedAt ?? p.createdAt;

export function PollTab() {
  const online = useOnlineStatus();
  const q = useQuery({
    queryKey: myPollsKey,
    queryFn: () => read("myPollsAction"),
    staleTime: 15_000,
  });
  const now = useNow();
  useClosedReports(q.data?.signedIn ? q.data.polls : null);
  const client = useQueryClient();
  const [removed, setRemoved] = useState<Record<string, MyPollRow>>({});
  const polls = useMemo(() => (q.data?.signedIn ? q.data.polls : []), [q.data]);
  const past = useMemo(
    () =>
      mergeKept(polls.filter(isPast), Object.values(removed), idOf, sortKey),
    [polls, removed],
  );

  const remove = async (poll: MyPollRow): Promise<boolean> => {
    const result = await leaveEndedPollAction(poll.pollId);
    if (!result.ok) {
      void toast.error(copy.deleteFailed);
      return false;
    }
    setRemoved((r) => ({ ...r, [poll.pollId]: poll }));
    void client.invalidateQueries({ queryKey: myPollsKey });
    return true;
  };

  const header = (
    <PageHeader
      title={copy.title}
      action={
        <Link
          href={partyHref}
          className={cn(
            "inline-flex min-h-11 items-center rounded-sm type-label text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground active:text-foreground",
            focusRing,
          )}
        >
          {copy.partyLink}
        </Link>
      }
    />
  );

  let body;
  if (!online && !q.data) {
    body = (
      <OfflineState
        title={copy.offline.title}
        body={copy.offline.body}
        headingLevel="h2"
        action={{ onClick: () => void q.refetch() }}
      />
    );
  } else if (q.isPending || !now) {
    body = <ListSkeleton rows={4} label={copy.loading} />;
  } else if (q.isError || !q.data) {
    body = (
      <ErrorState
        title={copy.error.title}
        body={copy.error.body}
        headingLevel="h2"
        action={{ label: copy.error.retry, onClick: () => void q.refetch() }}
      />
    );
  } else {
    const open = polls.filter((p) => p.status === "open" || p.status === "tie");
    body =
      polls.length === 0 && past.length === 0 ? (
        <EmptyState
          title={copy.empty.title}
          body={copy.empty.body}
          headingLevel="h2"
          action={{ label: copy.goToday, href: "/today" }}
        />
      ) : (
        <div className="flex flex-col gap-10">
          <Section
            title={copy.open}
            empty={open.length === 0 ? copy.newHint : null}
          >
            {open.map((p) => (
              <PollRow key={p.pollId} poll={p} now={now} />
            ))}
          </Section>
          <Section
            title={copy.past}
            empty={past.length === 0 ? copy.pastEmpty : null}
          >
            {past.map((p) => (
              <PollRow
                key={p.pollId}
                poll={p}
                now={now}
                online={online}
                removed={!!removed[p.pollId]}
                onRemove={() => remove(p)}
              />
            ))}
          </Section>
        </div>
      );
  }

  return (
    <div className="flex flex-col gap-8">
      {header}
      {body}
    </div>
  );
}

/**
 * 30초마다 지금 시각(남은 시간 줄). 첫 렌더는 null: 서버 프리렌더(cacheComponents)에서 new Date()를 쓰지 않고
 * 마운트 뒤에 채운다(목록도 브라우저 조회라 그 전에는 뼈대만 보인다).
 */
function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = window.setTimeout(tick, 0);
    const t = window.setInterval(tick, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, []);
  return now;
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  /** 줄이 없을 때 한 줄 안내 */
  empty: string | null;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col">
      <h2 className="type-caption text-muted-foreground">{title}</h2>
      {empty ? (
        <p className="mt-2 border-t border-border py-4 type-body-sm break-keep text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ul className="mt-2 flex flex-col border-t border-border">
          {children}
        </ul>
      )}
    </section>
  );
}

/** 마감 시각 "12:30", 다른 날이면 "11월 3일 18:00" (KST) */
function whenLabel(at: Date, now: Date): string {
  const p = getKstParts(at);
  const hhmm = `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
  return kstDayDiff(now, at) === 0 ? hhmm : `${p.month}월 ${p.day}일 ${hhmm}`;
}

function PollRow({
  poll,
  now,
  online = true,
  removed = false,
  onRemove,
}: {
  poll: MyPollRow;
  now: Date;
  online?: boolean;
  removed?: boolean;
  /** 지난 방만 받는다. 없으면 삭제 버튼을 그리지 않는다 */
  onRemove?: () => Promise<boolean>;
}) {
  const [phase, setPhase] = useState<"idle" | "confirm" | "busy">("idle");
  const askId = useId();
  const deleteRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (phase === "confirm") confirmRef.current?.focus();
  }, [phase]);
  // 지운 뒤 초점이 사라지지 않게 그 자리 결과 줄로 옮긴다
  useEffect(() => {
    if (removed && phase === "busy") doneRef.current?.focus();
  }, [removed, phase]);
  const offlineGuard = (fn: () => void) => () => {
    if (!online) {
      void toast(copy.offlineToast);
      return;
    }
    fn();
  };

  const closes = new Date(poll.closesAt);
  const left =
    poll.status === "open"
      ? countdownUnits(closes.getTime() - now.getTime())
      : null;
  const status =
    poll.status === "tie"
      ? copy.tie
      : poll.status === "canceled"
        ? copy.canceled
        : poll.status === "closed"
          ? poll.winnerPlaceId
            ? copy.decided
            : copy.noResult
          : poll.hasVoted
            ? copy.voted
            : copy.notVoted;
  const past = poll.status === "closed" || poll.status === "canceled";
  const setMapFocus = usePollTabMapFocus((s) => s.setFocus);
  const focusMap = past ? undefined : () => setMapFocus(poll.pollId);
  if (removed) {
    return (
      <li className="border-b border-border py-4">
        <p
          ref={doneRef}
          role="status"
          tabIndex={-1}
          className="animate-in type-body-sm text-muted-foreground duration-(--lm-duration-base) ease-enter fade-in focus:outline-none motion-reduce:animate-none"
        >
          {copy.deleted}
        </p>
      </li>
    );
  }
  return (
    <li className="flex flex-col border-b border-border">
      <div className="flex items-center gap-1">
        <Link
          href={pollRoomHref(poll.code)}
          onPointerEnter={focusMap}
          onFocus={focusMap}
          className={cn(
            "flex min-h-18 min-w-0 flex-1 items-center gap-4 rounded-md py-3 hover:bg-muted/50",
            focusRing,
            rowPress,
          )}
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex items-baseline gap-2">
              <span
                className={cn(
                  "truncate type-heading break-keep",
                  past && "text-muted-foreground",
                )}
              >
                {poll.title}
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 type-caption text-muted-foreground tabular-nums">
              <span>{copy.kind[poll.kind]}</span>
              <Divider />
              <span>{copy.candidates(poll.candidateCount)}</span>
              <Divider />
              <span>{copy.members(poll.memberCount)}</span>
              {poll.isHost ? (
                <>
                  <Divider />
                  <span>{copy.host}</span>
                </>
              ) : null}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1 text-right">
            {left ? (
              <span className="type-label tabular-nums">
                {left.parts.map((part, i) => (
                  <span key={part.unit} className={i > 0 ? "ml-1" : undefined}>
                    {part.unit === "초" && i > 0
                      ? String(part.value).padStart(2, "0")
                      : part.value}
                    <span className="ml-0.5 type-caption text-muted-foreground">
                      {part.unit}
                    </span>
                  </span>
                ))}
              </span>
            ) : (
              <span className="type-caption text-muted-foreground tabular-nums">
                {copy.closedOn(
                  whenLabel(new Date(poll.closedAt ?? poll.closesAt), now),
                )}
              </span>
            )}
            <span
              className={cn(
                "type-caption",
                poll.status === "open" && !poll.hasVoted
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {status}
            </span>
          </span>
          <ChevronRight
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground"
            strokeWidth={1.5}
          />
        </Link>
        {onRemove ? (
          <button
            ref={deleteRef}
            type="button"
            aria-label={copy.deleteLabel(poll.title)}
            aria-disabled={!online || undefined}
            aria-expanded={phase !== "idle"}
            aria-controls={askId}
            onClick={offlineGuard(() => setPhase("confirm"))}
            className={cn(
              "-mr-2.5 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-(--lm-duration-fast) ease-standard hover:bg-muted active:bg-muted aria-disabled:opacity-50 motion-reduce:transition-none",
              focusRing,
            )}
          >
            <Trash2 aria-hidden className="size-4" strokeWidth={1.5} />
          </button>
        ) : null}
      </div>
      {onRemove && phase !== "idle" ? (
        <div
          id={askId}
          role="group"
          aria-label={copy.deleteAsk}
          aria-busy={phase === "busy" || undefined}
          className="mb-3 flex animate-in flex-col gap-3 rounded-card border border-border bg-card p-4 duration-(--lm-duration-base) ease-enter fade-in motion-reduce:animate-none"
        >
          <p className="type-body-sm break-keep">
            {copy.deleteAsk}
            <span className="block type-caption text-muted-foreground">
              {copy.deleteBody}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              ref={confirmRef}
              type="button"
              aria-disabled={phase === "busy" || !online || undefined}
              onClick={offlineGuard(() => {
                if (phase === "busy") return;
                setPhase("busy");
                void onRemove().then((ok) => {
                  if (!ok) setPhase("confirm");
                });
              })}
              className={cn(
                buttonClass("destructive", "sm"),
                "aria-disabled:opacity-60",
              )}
            >
              {copy.deleteConfirm}
            </button>
            <button
              type="button"
              onClick={() => {
                setPhase("idle");
                deleteRef.current?.focus();
              }}
              className={buttonClass("ghost", "sm")}
            >
              {copy.keep}
            </button>
          </div>
          {phase === "busy" ? (
            <span role="status" className="sr-only">
              {copy.deleting}
            </span>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function Divider() {
  return <span aria-hidden className="h-3 w-px bg-border" />;
}

/** 보고권을 청하는 지난 방의 범위. 오래된 방까지 매번 부르지 않는다 */
const REPORT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * poll_closed (PRD 10.2, T7.30): 투표 탭에 보이는 마감, 취소된 내 방(최근 7일)도 보고권을 청한다.
 * 크론이 마감한 방을 아무도 다시 열지 않아도 탭을 열면 보낸다. 서버가 방마다 한 번만 claimed를 준다.
 */
function useClosedReports(polls: readonly MyPollRow[] | null) {
  const asked = useRef(new Set<string>());
  useEffect(() => {
    if (!polls) return;
    const since = Date.now() - REPORT_WINDOW_MS;
    for (const p of polls) {
      if (p.status !== "closed" && p.status !== "canceled") continue;
      if (!p.closedAt || Date.parse(p.closedAt) < since) continue;
      if (asked.current.has(p.pollId)) continue;
      asked.current.add(p.pollId);
      void claimPollClosedReportAction(p.pollId).then((r) => {
        if (!r.claimed) return;
        track({
          name: "poll_closed",
          properties: {
            reason: r.reason,
            participant_count: r.participantCount,
          },
        });
      });
    }
  }, [polls]);
}
