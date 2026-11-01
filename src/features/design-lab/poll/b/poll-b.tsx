"use client";
// 투표방 시안 B "한 장씩" (T7.1).
//
// 의도: 고르는 순간에 한 곳만 크게 본다. 홈 "오늘의 한 곳" 큰 카드 문법(세리프 30 이름, 모서리 그림, 숫자 3칸)을
//       후보마다 한 장씩 쓰고, 이전/다음 버튼(스와이프만 있는 조작 금지)과 위쪽 비율 띠로 전체를 본다.
// 비율 띠: 한 줄 트랙을 후보별 득표 비율로 나눈 띠(1위만 올리브). 누르면 그 후보 카드로 간다.
// 득표는 무기명. 카드 숫자 칸 셋째가 "득표"라 실시간 변화가 카드 안 큰 숫자로 굴러간다.
// 확정: 이긴 카드가 그대로 남고 위에 축하 한 줄이 떠오른다. 다른 후보는 아래 작은 득표 목록으로 접힌다.
// 룰렛: 동점 후보 카드가 빠르게 번갈아 보이다 멈춘다(그냥 골라줘 R1 리듬, 2초).
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { PlaceBadges } from "@/components/badges/place-badges";
import { RollingNumber } from "@/components/numbers";
import { focusRing, hitArea44 } from "@/components/ui/interaction";
import { pollLabCopy as copy } from "@/copy/design-lab-poll";
import { categoryLabel } from "@/features/place/categories";
import { formatPriceBand } from "@/lib/format";
import { cn } from "@/lib/utils";
import { POLL_TITLE, type PollCandidate } from "../mock";
import {
  isLoadError,
  isNameFail,
  isNoticeFlow,
  type PollParams,
} from "../params";
import {
  AvoidNote,
  CandidateArt,
  CandidateName,
  Celebrate,
  Countdown,
  EmptyVotesLine,
  HostLine,
  LiveStatus,
  LoadError,
  NoticeScreen,
  OfflineLine,
  PollColumn,
  PollFrame,
  PollSkeleton,
  ResultActions,
  StickyActions,
  SuggestionBlock,
  TieActions,
  TieQuestion,
  TopBar,
  VoteActions,
  VoteBar,
  buttonClass,
  resolvedLine,
  useLabAnnouncer,
} from "../shared";
import { rankOrder, usePollLab, type PollLab } from "../use-poll-lab";

export function PollB({ p }: { p: PollParams }) {
  if (isNoticeFlow(p.flow)) {
    return (
      <PollFrame showMap={false}>
        <PollColumn>
          <NoticeScreen kind={p.flow} />
        </PollColumn>
      </PollFrame>
    );
  }
  if (isLoadError(p)) {
    return (
      <PollFrame showMap={false}>
        <PollColumn>
          <LoadError />
        </PollColumn>
      </PollFrame>
    );
  }
  if (p.state === "loading") {
    return (
      <PollFrame showMap={false}>
        <PollColumn>
          <PollSkeleton card />
        </PollColumn>
      </PollFrame>
    );
  }
  return <RoomB p={p} />;
}

function RoomB({ p }: { p: PollParams }) {
  const lab = usePollLab(p);
  const nameFail = isNameFail(p);
  const { notice, announcer } = useLabAnnouncer();
  const tie = lab.phase === "tie" || lab.phase === "rolling";
  // 동점이면 동점 후보만 넘긴다
  const pool = tie ? lab.top : lab.candidates.map((_, i) => i);
  // 동점으로 바뀌면 첫 장부터 다시 본다(어느 목록을 넘기던 중인지 함께 기억)
  const [nav, setNav] = useState({ tie, at: 0 });
  const at = nav.tie === tie ? nav.at : 0;
  const setAt = (next: number | ((a: number) => number)) =>
    setNav({ tie, at: typeof next === "function" ? next(at) : next });
  const index = lab.rollingAt ?? pool[Math.min(at, pool.length - 1)] ?? 0;

  if (lab.phase === "result" && lab.winner !== null) {
    return (
      <PollFrame
        candidates={lab.candidates}
        active={lab.winner}
        nameFail={nameFail}
      >
        <PollColumn>
          <TopBar lab={lab} onNotice={notice} />
          {announcer}
          <p role="status" className="sr-only">
            {lab.announce}
          </p>
          <ResultB lab={lab} nameFail={nameFail} onNotice={notice} />
        </PollColumn>
      </PollFrame>
    );
  }

  const go = (d: number) => setAt((a) => (a + d + pool.length) % pool.length);
  const c = lab.candidates[index]!;
  // "내 선택" 표시는 보낸 표에만. 한 곳 투표는 보고 있는 카드가 곧 고른 곳이라 미리 표시하지 않는다
  const picked = lab.mine
    ? lab.mine.includes(index)
    : lab.multi && lab.picks.includes(index);

  return (
    <PollFrame candidates={lab.candidates} active={index} nameFail={nameFail}>
      <PollColumn>
        <TopBar lab={lab} onNotice={notice} />
        {announcer}
        <p role="status" className="sr-only">
          {lab.announce}
        </p>

        <header className="flex flex-col pt-1">
          <h1 className="type-title text-balance break-keep">
            {copy.head.question(POLL_TITLE)}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 type-caption text-muted-foreground">
            <span className="inline-flex items-baseline gap-1.5">
              {copy.head.untilDeadline}
              <Countdown
                deadline={lab.deadline}
                className="type-numeric-md text-foreground"
              />
            </span>
            <span aria-hidden className="h-3 w-px bg-border" />
            <span>{copy.head.participants(lab.people.length)}</span>
            {lab.offline || p.liveLost ? null : (
              <>
                <span aria-hidden className="h-3 w-px bg-border" />
                <LiveStatus lost={false} incoming={lab.incoming} />
              </>
            )}
          </div>
          <HostLine isHost={lab.isHost} className="mt-1" />
        </header>

        {lab.offline ? <OfflineLine className="mt-5" /> : null}
        {p.liveLost && !lab.offline ? (
          <LiveStatus lost incoming={null} className="mt-5" />
        ) : null}
        {tie ? <TieQuestion lab={lab} className="mt-6" /> : null}
        {p.state === "empty" ? <EmptyVotesLine className="mt-6" /> : null}

        {lab.isGuest ? null : (
          <ShareStrip
            lab={lab}
            pool={pool}
            current={index}
            nameFail={nameFail}
            onPick={(i) => setAt(Math.max(0, pool.indexOf(i)))}
          />
        )}

        <div className="relative mt-4">
          <CardB
            key={lab.phase === "rolling" ? "rolling" : index}
            c={c}
            i={index}
            lab={lab}
            nameFail={nameFail}
            picked={picked}
            tie={tie}
          />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            aria-label={copy.candidate.prevLabel}
            onClick={() => go(-1)}
            disabled={pool.length < 2 || lab.phase === "rolling"}
            className={buttonClass("secondary", "icon-sm")}
          >
            <ChevronLeft aria-hidden strokeWidth={1.5} />
          </button>
          <p
            aria-live="polite"
            className="type-caption text-muted-foreground tabular-nums"
          >
            {copy.candidate.pager(pool.indexOf(index) + 1, pool.length)}
          </p>
          <button
            type="button"
            aria-label={copy.candidate.nextLabel}
            onClick={() => go(1)}
            disabled={pool.length < 2 || lab.phase === "rolling"}
            className={buttonClass("secondary", "icon-sm")}
          >
            <ChevronRight aria-hidden strokeWidth={1.5} />
          </button>
        </div>

        <AvoidNote
          show={c.badges.some((b) => b.kind === "avoidWarning")}
          className="mt-5"
        />
        <SuggestionBlock lab={lab} onNotice={notice} className="mt-6" />
        {lab.isGuest ? (
          <p className="mt-6 type-body-sm text-muted-foreground">
            {copy.guest.hiddenTally}
          </p>
        ) : null}
        <div className="h-8" />

        {tie ? (
          <TieActions lab={lab} picked={lab.isHost ? index : null} />
        ) : lab.multi && lab.canVote && !lab.mine ? (
          <MultiActions lab={lab} index={index} />
        ) : (
          <VoteActions
            lab={lab}
            voteLabel={
              lab.picks[0] !== undefined
                ? copy.actions.voteFor(
                    nameFail && lab.picks[0] === 1
                      ? copy.candidate.unresolved(2)
                      : (lab.candidates[lab.picks[0]]?.place.name ?? ""),
                  )
                : undefined
            }
          />
        )}
        {/* 한 곳 투표에서는 지금 보는 카드가 곧 고른 곳이다 */}
        <AutoPick lab={lab} index={index} enabled={!lab.multi && !tie} />
      </PollColumn>
    </PollFrame>
  );
}

/** 한 곳 투표: 카드를 넘기면 그 카드가 고른 곳이 된다(투표하기 버튼 이름이 따라 바뀐다) */
function AutoPick({
  lab,
  index,
  enabled,
}: {
  lab: PollLab;
  index: number;
  enabled: boolean;
}) {
  const { canVote, mine, picks, toggle } = lab;
  useEffect(() => {
    if (enabled && canVote && !mine && picks[0] !== index) toggle(index);
  }, [enabled, canVote, mine, picks, index, toggle]);
  return null;
}

/** 복수 선택: 지금 카드를 담고 빼는 테두리 버튼 + 담은 만큼 투표하기 */
function MultiActions({ lab, index }: { lab: PollLab; index: number }) {
  const on = lab.picks.includes(index);
  return (
    <StickyActions>
      <div className="flex gap-2">
        <button
          type="button"
          aria-pressed={on}
          onClick={() => lab.toggle(index)}
          className={cn(
            buttonClass("secondary"),
            on && "border-[1.5px] border-primary text-primary",
          )}
        >
          {on ? <Check aria-hidden strokeWidth={2} /> : null}
          {copy.candidate.mine}
        </button>
        <button
          type="button"
          aria-disabled={lab.picks.length === 0 || undefined}
          onClick={lab.submit}
          className={cn(buttonClass("primary"), "flex-1")}
        >
          {lab.picks.length === 0
            ? copy.actions.pickFirst
            : copy.actions.voteMulti(lab.picks.length)}
        </button>
      </div>
      <p className="mt-2 type-caption text-muted-foreground">
        {copy.head.multi}
      </p>
    </StickyActions>
  );
}

/* ---------- 비율 띠 ---------- */

function ShareStrip({
  lab,
  pool,
  current,
  nameFail,
  onPick,
}: {
  lab: PollLab;
  pool: readonly number[];
  current: number;
  nameFail: boolean;
  onPick: (i: number) => void;
}) {
  const total = lab.votes.reduce((s, v) => s + v, 0);
  const lead = lab.top.length === 1 ? lab.top[0] : -1;
  return (
    <div className="mt-7 flex flex-col gap-2.5">
      <div
        className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-vote-bar-track"
        aria-hidden
      >
        {total > 0
          ? lab.votes.map((v, i) =>
              v === 0 ? null : (
                <span
                  key={lab.candidates[i]!.place.id}
                  style={{ flexGrow: v }}
                  className={cn(
                    "h-full basis-0 transition-[flex-grow,background-color] duration-[520ms] ease-emphasized motion-reduce:transition-none",
                    i === lead ? "bg-vote-bar" : "bg-chart-3",
                    pool.includes(i) ? "" : "opacity-40",
                  )}
                />
              ),
            )
          : null}
      </div>
      <ol
        aria-label={copy.candidate.shareStripLabel}
        className="flex flex-wrap gap-x-4 gap-y-2"
      >
        {lab.candidates.map((c, i) => {
          if (!pool.includes(i)) return null;
          const name =
            nameFail && i === 1 ? copy.candidate.unresolved(2) : c.place.name;
          return (
            <li key={c.place.id}>
              <button
                type="button"
                aria-current={i === current || undefined}
                onClick={() => onPick(i)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-sm py-0.5 type-caption transition-colors duration-(--lm-duration-fast)",
                  hitArea44,
                  i === current ? "text-foreground" : "text-muted-foreground",
                  focusRing,
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 rounded-full",
                    i === lead ? "bg-vote-bar" : "bg-chart-3",
                  )}
                />
                <span
                  className={cn(
                    i === current &&
                      "underline decoration-1 underline-offset-4",
                  )}
                >
                  {name}
                </span>
                <span className="tabular-nums">{lab.votes[i] ?? 0}</span>
                <span className="sr-only">{copy.candidate.voteUnit}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------- 카드 ---------- */

function CardB({
  c,
  i,
  lab,
  nameFail,
  picked,
  tie,
  winner = false,
}: {
  c: PollCandidate;
  i: number;
  lab: PollLab;
  nameFail: boolean;
  picked: boolean;
  tie: boolean;
  winner?: boolean;
}) {
  const fail = nameFail && i === 1;
  const votes = lab.votes[i] ?? 0;
  const rolling = lab.phase === "rolling";
  return (
    <article
      aria-label={fail ? copy.candidate.unresolved(2) : c.place.name}
      className={cn(
        "relative overflow-hidden rounded-card border bg-card px-6 pt-6 pb-6 @max-[23.75rem]/screen:px-5",
        picked && !winner ? "border-[1.5px] border-primary" : "border-border",
        !rolling &&
          "motion-safe:transition-[opacity,translate] motion-safe:duration-(--lm-duration-base) motion-safe:ease-enter motion-safe:starting:translate-x-2 motion-safe:starting:opacity-0",
      )}
    >
      <CandidateArt
        candidate={c}
        fail={fail}
        size={winner ? 140 : 128}
        className="absolute -top-3 -right-4 @max-[23.75rem]/screen:size-24"
      />
      <div className="relative flex min-h-36 flex-col pr-28 @max-[23.75rem]/screen:pr-20">
        <p className="flex items-center gap-2 type-caption">
          {winner ? (
            <span className="text-foreground">{copy.candidate.leading}</span>
          ) : picked ? (
            <span className="inline-flex items-center gap-1 text-primary">
              <Check aria-hidden className="size-3.5" strokeWidth={2} />
              {copy.candidate.mine}
            </span>
          ) : tie ? (
            <span className="text-foreground">{copy.tie.tieBadge}</span>
          ) : (
            <span className="text-muted-foreground">
              {copy.candidate.pager(i + 1, lab.candidates.length)}
            </span>
          )}
        </p>
        {fail ? null : (
          <p
            className="mt-4 type-caption"
            style={{ color: `var(--cat-${c.place.category}-ink)` }}
          >
            {categoryLabel(c.place.category)}
          </p>
        )}
        <h2 className="mt-1 type-title text-balance break-keep">
          <CandidateName candidate={c} order={i + 1} fail={fail} />
        </h2>
        {c.badges.length > 0 && !fail ? (
          <PlaceBadges badges={c.badges} className="mt-3" />
        ) : null}
      </div>
      <dl className="mt-6 grid grid-cols-[0.8fr_1.3fr_0.9fr] divide-x divide-border">
        <Cell label={copy.candidate.walk}>
          {fail ? (
            ""
          ) : (
            <Num value={c.place.walkMinutes} unit={copy.candidate.minuteUnit} />
          )}
        </Cell>
        <Cell label={copy.candidate.price}>
          {fail ? (
            ""
          ) : (
            <span className="type-numeric-lg">
              {formatPriceBand(c.place.priceKRW)}
            </span>
          )}
        </Cell>
        {lab.isGuest ? (
          <Cell label={copy.head.participants(lab.people.length)}>
            <span className="type-numeric-lg text-muted-foreground">?</span>
          </Cell>
        ) : (
          <Cell label={copy.candidate.tally}>
            <Num
              value={votes}
              unit={copy.candidate.voteUnit}
              from={winner ? 0 : undefined}
            />
          </Cell>
        )}
      </dl>
      {lab.isGuest ? null : (
        <VoteBar
          value={votes}
          max={Math.max(1, lab.voters)}
          leading={winner || (lab.top.length === 1 && lab.top[0] === i)}
          className="mt-5"
        />
      )}
    </article>
  );
}

function Cell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-3 first:pl-0 last:pr-0">
      <dt className="truncate type-caption text-muted-foreground">{label}</dt>
      <dd className="flex items-baseline gap-0.5 whitespace-nowrap">
        {children}
      </dd>
    </div>
  );
}

function Num({
  value,
  unit,
  from,
}: {
  value: number;
  unit: string;
  from?: number;
}) {
  return (
    <>
      <span className="type-numeric-lg">
        <RollingNumber value={value} from={from} />
      </span>
      <span className="type-body-sm text-muted-foreground">{unit}</span>
    </>
  );
}

/* ---------- 결과 ---------- */

function ResultB({
  lab,
  nameFail,
  onNotice,
}: {
  lab: PollLab;
  nameFail: boolean;
  onNotice: (m: string) => void;
}) {
  const w = lab.winner!;
  const order = rankOrder(lab.votes).filter((i) => i !== w);
  const max = Math.max(1, ...lab.votes);
  return (
    <>
      <header className="flex flex-col pt-1">
        <Celebrate as="h1" />
        <p className="mt-3 type-body-sm text-muted-foreground">
          {resolvedLine(lab.resolvedBy)}{" "}
          {copy.result.tally(lab.votes[w] ?? 0, lab.voters)}
        </p>
      </header>
      <div className="mt-7 motion-safe:transition-[opacity,translate] motion-safe:delay-150 motion-safe:duration-(--lm-duration-slow) motion-safe:ease-enter motion-safe:starting:translate-y-2 motion-safe:starting:opacity-0">
        <CardB
          c={lab.candidates[w]!}
          i={w}
          lab={lab}
          nameFail={nameFail}
          picked={false}
          tie={false}
          winner
        />
      </div>
      <section className="mt-8" aria-labelledby="poll-b-rest">
        <h2 id="poll-b-rest" className="type-caption text-muted-foreground">
          {copy.result.allVotes}
        </h2>
        <ol className="mt-1 flex flex-col">
          {order.map((i) => (
            <li
              key={lab.candidates[i]!.place.id}
              className="flex items-center gap-3 border-b border-border py-3"
            >
              <span className="w-28 min-w-0 truncate type-body-sm">
                {nameFail && i === 1
                  ? copy.candidate.unresolved(2)
                  : lab.candidates[i]!.place.name}
              </span>
              <VoteBar value={lab.votes[i] ?? 0} max={max} leading={false} />
              <span className="w-9 shrink-0 text-right type-body-sm text-muted-foreground tabular-nums">
                {copy.candidate.votes(lab.votes[i] ?? 0)}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-5 type-caption text-muted-foreground">
          {copy.result.visitNote}
        </p>
      </section>
      <div className="h-8" />
      <ResultActions onNotice={onNotice} />
    </>
  );
}
