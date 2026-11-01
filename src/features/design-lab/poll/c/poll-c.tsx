"use client";
// 투표방 시안 C "모이는 자리" (T7.1).
//
// 의도: 점심 투표는 사람을 모으는 일이라 숫자보다 얼굴로 보인다. 맨 위에 참여자 얼굴 줄(고른 사람은 체크 점)과
//       "7명 중 6명 골랐습니다", 시간은 줄어드는 가는 선 하나. 후보는 2열 타일이고 득표는 바 대신 고른 사람 얼굴이 쌓인다(기명).
// 고르기: 타일을 누르면 1.5px 올리브 테두리 + 내 얼굴이 그 타일 줄 맨 앞에 붙는다(투표 전에는 점선 얼굴로 미리 보임).
// 확정: 이긴 타일이 넓어지며 고른 사람 얼굴이 한데 모이고, 위에 축하 한 줄. 나머지는 아래 작은 줄로.
// 동점: 동점 타일 둘만 나란히, 방장이 하나를 누르면 "○○로 정하기", 룰렛은 두 타일을 번갈아 비춘다.
import { Check } from "lucide-react";
import { useState } from "react";
import { PlaceBadges } from "@/components/badges/place-badges";
import { RollingNumber, useSecondClock } from "@/components/numbers";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { focusRing } from "@/components/ui/interaction";
import { pollLabCopy as copy } from "@/copy/design-lab-poll";
import { withObject } from "@/features/rec/why";
import { formatPriceBand } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ME,
  POLL_DEADLINE_LABEL,
  POLL_LENGTH_MIN,
  POLL_TITLE,
  initialOf,
  votersOf,
  type PollCandidate,
  type PollPerson,
} from "../mock";
import {
  isLoadError,
  isNameFail,
  isNoticeFlow,
  type PollParams,
} from "../params";
import {
  AvatarStack,
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
  SuggestionBlock,
  TieActions,
  TieQuestion,
  TopBar,
  VoteActions,
  resolvedLine,
  useLabAnnouncer,
} from "../shared";
import { rankOrder, usePollLab, type PollLab } from "../use-poll-lab";

export function PollC({ p }: { p: PollParams }) {
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
          <PollSkeleton rows={3} />
        </PollColumn>
      </PollFrame>
    );
  }
  return <RoomC p={p} />;
}

function RoomC({ p }: { p: PollParams }) {
  const lab = usePollLab(p);
  const nameFail = isNameFail(p);
  const { notice, announcer } = useLabAnnouncer();
  const [tiePick, setTiePick] = useState<number | null>(null);
  const tie = lab.phase === "tie" || lab.phase === "rolling";
  const leading = lab.top.length === 1 ? lab.top[0]! : -1;

  return (
    <PollFrame
      candidates={lab.candidates}
      active={lab.phase === "result" ? (lab.winner ?? -1) : leading}
      nameFail={nameFail}
    >
      <PollColumn>
        <TopBar lab={lab} onNotice={notice} />
        {announcer}
        <p role="status" className="sr-only">
          {lab.announce}
        </p>

        {lab.phase === "result" && lab.winner !== null ? (
          <ResultC lab={lab} nameFail={nameFail} onNotice={notice} />
        ) : (
          <>
            <header className="flex flex-col pt-1">
              <h1 className="type-title text-balance break-keep">
                {copy.head.question(POLL_TITLE)}
              </h1>
              <HostLine isHost={lab.isHost} className="mt-2" />
              <TimeLine deadline={lab.deadline} className="mt-6" />
            </header>

            <Gathering
              lab={lab}
              className="mt-7"
              showLive={!lab.offline && !p.liveLost}
            />

            {lab.offline ? <OfflineLine className="mt-6" /> : null}
            {p.liveLost && !lab.offline ? (
              <LiveStatus lost incoming={null} className="mt-6" />
            ) : null}
            {tie ? <TieQuestion lab={lab} className="mt-7" /> : null}
            {p.state === "empty" ? <EmptyVotesLine className="mt-7" /> : null}

            <div
              role={tie || !lab.multi ? "radiogroup" : "group"}
              aria-label={copy.head.question(POLL_TITLE)}
              className="mt-6"
            >
              <ul className="grid grid-cols-2 gap-3">
                {lab.candidates.map((c, i) => {
                  if (tie && !lab.top.includes(i)) return null;
                  const count = tie ? lab.top.length : lab.candidates.length;
                  const wide = !tie && count % 2 === 1 && i === count - 1;
                  const selected = tie
                    ? tiePick === i || lab.rollingAt === i
                    : lab.mine
                      ? lab.mine.includes(i)
                      : lab.picks.includes(i);
                  const interactive = tie
                    ? lab.isHost && lab.phase === "tie"
                    : lab.canVote && !lab.mine;
                  return (
                    <Tile
                      key={c.place.id}
                      c={c}
                      i={i}
                      lab={lab}
                      nameFail={nameFail}
                      selected={selected}
                      interactive={interactive}
                      radio={tie || !lab.multi}
                      wide={wide}
                      leading={i === leading}
                      tie={tie}
                      onSelect={() => (tie ? setTiePick(i) : lab.toggle(i))}
                    />
                  );
                })}
              </ul>
            </div>

            <AvoidNote
              show={lab.candidates.some((c) =>
                c.badges.some((b) => b.kind === "avoidWarning"),
              )}
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
              <TieActions lab={lab} picked={tiePick} />
            ) : (
              <VoteActions
                lab={lab}
                voteLabel={
                  lab.multi && lab.picks.length > 1
                    ? copy.actions.voteMulti(lab.picks.length)
                    : undefined
                }
              />
            )}
          </>
        )}
      </PollColumn>
    </PollFrame>
  );
}

/* ---------- 시간 줄 ---------- */

/** 줄어드는 가는 선 + 양 끝 글자. 남은 비율은 투표방 전체 길이(30분) 기준 */
function TimeLine({
  deadline,
  className,
}: {
  deadline: Date | null;
  className?: string;
}) {
  const now = useSecondClock();
  const left =
    deadline && now !== null ? Math.max(0, deadline.getTime() - now) : null;
  const ratio =
    left === null ? 1 : Math.min(1, left / (POLL_LENGTH_MIN * 60_000));
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between type-caption text-muted-foreground">
        <span>{copy.head.deadlineAt(POLL_DEADLINE_LABEL)}</span>
        <span className="inline-flex items-baseline gap-1.5">
          {copy.head.untilDeadline}
          <Countdown
            deadline={deadline}
            className="type-numeric-md text-foreground"
          />
        </span>
      </div>
      <span
        aria-hidden
        className="block h-0.5 w-full overflow-hidden rounded-full bg-vote-bar-track"
      >
        <span
          className="block h-full origin-left rounded-full bg-foreground transition-transform duration-1000 ease-linear motion-reduce:transition-none"
          style={{ transform: `scaleX(${ratio})` }}
        />
      </span>
    </div>
  );
}

/* ---------- 참여자 ---------- */

/** 얼굴은 두 줄(14명)까지, 나머지는 "외 N명" */
const FACE_LIMIT = 14;

function Gathering({
  lab,
  className,
  showLive,
}: {
  lab: PollLab;
  className?: string;
  showLive: boolean;
}) {
  const voted = new Set([
    ...Object.keys(lab.others),
    ...(lab.mine ? [ME.id] : []),
  ]);
  return (
    <section
      aria-label={copy.head.avatarsLabel(lab.people.length)}
      className={cn("flex flex-col gap-3", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="type-label">
          {lab.isGuest
            ? copy.head.participants(lab.people.length)
            : copy.head.votedOf(voted.size, lab.people.length)}
        </p>
        {showLive ? <LiveStatus lost={false} incoming={lab.incoming} /> : null}
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {lab.people.slice(0, FACE_LIMIT).map((person) => {
          const done = !lab.isGuest && voted.has(person.id);
          const me = person.id === ME.id;
          return (
            <li key={person.id} className="relative">
              <Avatar
                size="lg"
                className={cn(
                  "motion-safe:transition-opacity motion-safe:duration-(--lm-duration-base) motion-safe:starting:opacity-0",
                  !lab.isGuest && !done && "opacity-55",
                  me && "after:border-[1.5px] after:border-foreground",
                )}
              >
                <AvatarFallback>{initialOf(person.nick)}</AvatarFallback>
              </Avatar>
              <span className="sr-only">{me ? copy.head.me : person.nick}</span>
              {done ? (
                <span
                  aria-hidden
                  className="absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full bg-background"
                >
                  <span className="flex size-3.5 items-center justify-center rounded-full bg-success">
                    <Check
                      className="size-2.5 text-background"
                      strokeWidth={3}
                    />
                  </span>
                </span>
              ) : null}
            </li>
          );
        })}
        {lab.people.length > FACE_LIMIT ? (
          <li className="flex h-10 items-center pl-1 type-caption text-muted-foreground">
            {copy.head.moreShown(lab.people.length - FACE_LIMIT)}
          </li>
        ) : null}
      </ul>
    </section>
  );
}

/* ---------- 타일 ---------- */

function Tile({
  c,
  i,
  lab,
  nameFail,
  selected,
  interactive,
  radio,
  wide,
  leading,
  tie,
  onSelect,
}: {
  c: PollCandidate;
  i: number;
  lab: PollLab;
  nameFail: boolean;
  selected: boolean;
  interactive: boolean;
  radio: boolean;
  wide: boolean;
  leading: boolean;
  tie: boolean;
  onSelect: () => void;
}) {
  const fail = nameFail && i === 1;
  const name = fail ? copy.candidate.unresolved(2) : c.place.name;
  const voters = votersOf(i, lab.people, lab.others, lab.mine);
  // 투표 전 고른 타일에는 내 얼굴을 점선으로 미리 붙인다
  const preview = !lab.mine && selected && !tie && !lab.isGuest;
  const votes = lab.votes[i] ?? 0;
  return (
    <li
      className={cn(
        "relative flex min-h-52 flex-col rounded-card border bg-card p-4 transition-[border-color,box-shadow] duration-(--lm-duration-fast) ease-standard",
        wide && "col-span-2 min-h-0",
        selected ? "border-primary ring-[0.5px] ring-primary" : "border-border",
      )}
    >
      <button
        type="button"
        role={radio ? "radio" : "checkbox"}
        aria-checked={selected}
        aria-disabled={!interactive || undefined}
        onClick={onSelect}
        className={cn(
          "absolute inset-0 z-0 rounded-card",
          focusRing,
          interactive ? "cursor-pointer" : "cursor-default",
        )}
      >
        <span className="sr-only">
          {name}
          {lab.isGuest ? "" : `, ${copy.candidate.votes(votes)}`}
        </span>
      </button>
      <div
        className={cn(
          "pointer-events-none flex flex-1 flex-col",
          wide && "flex-row items-start gap-4",
        )}
      >
        <div className="flex items-start justify-between">
          <CandidateArt candidate={c} fail={fail} size={52} />
          {selected ? (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary motion-safe:transition-transform motion-safe:duration-(--lm-duration-fast) motion-safe:starting:scale-50">
              <Check
                aria-hidden
                className="size-3 text-primary-foreground"
                strokeWidth={2.5}
              />
            </span>
          ) : tie ? (
            <span className="type-caption text-foreground">
              {copy.tie.tieBadge}
            </span>
          ) : null}
        </div>
        <div
          className={cn("mt-3 flex min-w-0 flex-1 flex-col", wide && "mt-0")}
        >
          <div className="pointer-events-auto">
            <CandidateName
              candidate={c}
              order={i + 1}
              fail={fail}
              className="type-heading text-balance"
            />
          </div>
          {fail ? null : (
            <p className="mt-1 type-caption text-muted-foreground tabular-nums">
              {copy.candidate.walk} {c.place.walkMinutes}
              {copy.candidate.minuteUnit}
              <span
                aria-hidden
                className="mx-1.5 inline-block h-3 w-px translate-y-0.5 bg-border"
              />
              {formatPriceBand(c.place.priceKRW)}
            </p>
          )}
          {c.badges.length > 0 && !fail ? (
            <PlaceBadges badges={c.badges} max={1} className="mt-2" />
          ) : null}
          {lab.isGuest ? null : (
            <div className="mt-auto flex items-center justify-between gap-2 pt-4">
              <Faces
                people={preview ? [ME, ...voters] : voters}
                dashedFirst={preview}
                label={copy.candidate.voterListLabel(
                  withObject(name),
                  voters.length,
                )}
              />
              <span
                className={cn(
                  "type-numeric-md",
                  leading ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <RollingNumber value={votes} suffix={copy.candidate.voteUnit} />
              </span>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/** 고른 사람 얼굴 겹침. 0명이면 빈 점선 원 하나 */
function Faces({
  people,
  dashedFirst,
  label,
}: {
  people: readonly PollPerson[];
  dashedFirst: boolean;
  label: string;
}) {
  if (people.length === 0) {
    return (
      <span role="img" aria-label={copy.candidate.noVoters} className="flex">
        <span
          aria-hidden
          className="size-6 rounded-full border border-dashed border-input"
        />
      </span>
    );
  }
  const shown = people.slice(0, 4);
  const rest = people.length - shown.length;
  return (
    <span role="img" aria-label={label} className="flex items-center">
      <span aria-hidden className="flex -space-x-1.5">
        {shown.map((person, k) => (
          <Avatar
            key={person.id}
            size="sm"
            className={cn(
              "ring-2 ring-card motion-safe:transition-[opacity,translate] motion-safe:duration-(--lm-duration-base) motion-safe:ease-enter motion-safe:starting:-translate-x-1 motion-safe:starting:opacity-0",
              k === 0 &&
                dashedFirst &&
                "after:border-dashed after:border-primary",
            )}
          >
            <AvatarFallback>{initialOf(person.nick)}</AvatarFallback>
          </Avatar>
        ))}
      </span>
      {rest > 0 ? (
        <span aria-hidden className="ml-1.5 type-caption text-muted-foreground">
          +{rest}
        </span>
      ) : null}
    </span>
  );
}

/* ---------- 결과 ---------- */

function ResultC({
  lab,
  nameFail,
  onNotice,
}: {
  lab: PollLab;
  nameFail: boolean;
  onNotice: (m: string) => void;
}) {
  const w = lab.winner!;
  const c = lab.candidates[w]!;
  const fail = nameFail && w === 1;
  const voters = votersOf(w, lab.people, lab.others, lab.mine);
  const rest = rankOrder(lab.votes).filter((i) => i !== w);
  return (
    <>
      <header className="flex flex-col pt-1">
        <p className="type-caption text-muted-foreground">
          {resolvedLine(lab.resolvedBy)}
        </p>
        <Celebrate className="mt-3" />
      </header>

      <section
        aria-label={copy.result.winner(c.place.name)}
        className="mt-8 flex flex-col items-start rounded-card border border-border bg-card px-6 pt-6 pb-6 motion-safe:transition-[opacity,translate] motion-safe:delay-150 motion-safe:duration-(--lm-duration-slow) motion-safe:ease-enter motion-safe:starting:translate-y-2 motion-safe:starting:opacity-0"
      >
        <div className="flex w-full items-start justify-between gap-4">
          <h1 className="type-title text-balance break-keep">
            <CandidateName candidate={c} order={w + 1} fail={fail} />
          </h1>
          <CandidateArt
            candidate={c}
            fail={fail}
            size={80}
            className="-mt-1 -mr-1"
          />
        </div>
        {fail ? null : (
          <p className="mt-2 type-body-sm text-muted-foreground tabular-nums">
            {copy.candidate.walk} {c.place.walkMinutes}
            {copy.candidate.minuteUnit}
            <span
              aria-hidden
              className="mx-2 inline-block h-3 w-px translate-y-0.5 bg-border"
            />
            {copy.candidate.price} {formatPriceBand(c.place.priceKRW)}
          </p>
        )}
        <div className="mt-6 flex w-full items-center justify-between border-t border-border pt-5">
          <AvatarStack
            people={voters}
            max={6}
            size="default"
            label={copy.candidate.voterListLabel(
              withObject(c.place.name),
              voters.length,
            )}
          />
          <p className="type-label">
            {copy.result.tally(voters.length, lab.voters)}
          </p>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="poll-c-rest">
        <h2 id="poll-c-rest" className="type-caption text-muted-foreground">
          {copy.result.allVotes}
        </h2>
        <ol className="mt-1 flex flex-col">
          {rest.map((i) => {
            const x = lab.candidates[i]!;
            const vs = votersOf(i, lab.people, lab.others, lab.mine);
            const name =
              nameFail && i === 1 ? copy.candidate.unresolved(2) : x.place.name;
            return (
              <li
                key={x.place.id}
                className="flex min-h-14 items-center gap-3 border-b border-border py-2"
              >
                <CandidateArt
                  candidate={x}
                  fail={nameFail && i === 1}
                  size={32}
                />
                <span className="min-w-0 flex-1 truncate type-body-sm">
                  {name}
                </span>
                <Faces
                  people={vs}
                  dashedFirst={false}
                  label={copy.candidate.voterListLabel(
                    withObject(name),
                    vs.length,
                  )}
                />
                <span className="w-8 text-right type-body-sm text-muted-foreground tabular-nums">
                  {copy.candidate.votes(vs.length)}
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
      <ResultActions onNotice={onNotice} />
    </>
  );
}
