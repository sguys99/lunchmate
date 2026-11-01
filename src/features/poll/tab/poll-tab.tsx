"use client";
// 투표 탭 /poll (T7.21, POLL-10, D-15 안건 3, D-16 안건 7). 진행 중과 지난 투표.
// - my_polls가 마감이 지난 방을 먼저 판정해 돌려준다(AC-POLL-2). 목록에 장소 이름은 없다(제목, 상태, 숫자만).
// - 보내지 않고 닫은 방도 "진행 중"에 남는다(D-15 안건 3). 줄을 누르면 투표방(/poll/<code>)에서 다시 보낼 수 있다.
// - 머리 오른쪽 "회식 후보 찾기"(D-16 안건 7). 주 버튼은 두지 않는다(만들기는 오늘 화면 "친구랑 정하기").
// - 4상태: 스켈레톤 줄, 빈 상태(오늘 추천으로), 오류(다시 불러오기), 오프라인.
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/app-shell";
import {
  EmptyState,
  ErrorState,
  ListSkeleton,
  OfflineState,
} from "@/components/states";
import { focusRing } from "@/components/ui/interaction";
import { pollCreateCopy } from "@/copy/poll-create";
import { myPollsAction, type MyPollRow } from "@/features/poll/create/actions";
import { myPollsKey } from "@/features/poll/create/keys";
import { partyHref, pollRoomHref } from "@/features/poll/routes";
import { countdownUnits } from "@/lib/format/countdown-units";
import { claimPollClosedReportAction } from "@/features/poll/room/actions";
import { track } from "@/lib/analytics";
import { useOnlineStatus } from "@/lib/network";
import { getKstParts, kstDayDiff } from "@/lib/time";
import { cn } from "@/lib/utils";

const copy = pollCreateCopy.tab;

export function PollTab() {
  const online = useOnlineStatus();
  const q = useQuery({
    queryKey: myPollsKey,
    queryFn: () => myPollsAction(),
    staleTime: 15_000,
  });
  const now = useNow();
  useClosedReports(q.data?.signedIn ? q.data.polls : null);

  const header = (
    <PageHeader
      title={copy.title}
      action={
        <Link
          href={partyHref}
          className={cn(
            "inline-flex min-h-11 items-center rounded-sm type-label text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground",
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
  } else if (q.isPending) {
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
    const polls = q.data.signedIn ? q.data.polls : [];
    const open = polls.filter((p) => p.status === "open" || p.status === "tie");
    const past = polls.filter(
      (p) => p.status === "closed" || p.status === "canceled",
    );
    body =
      polls.length === 0 ? (
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
              <PollRow key={p.pollId} poll={p} now={now} />
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

/** 30초마다 지금 시각(남은 시간 줄) */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
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

function PollRow({ poll, now }: { poll: MyPollRow; now: Date }) {
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
  return (
    <li className="border-b border-border">
      <Link
        href={pollRoomHref(poll.code)}
        className={cn(
          "flex min-h-18 items-center gap-4 rounded-md py-3 hover:bg-muted/50",
          focusRing,
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
