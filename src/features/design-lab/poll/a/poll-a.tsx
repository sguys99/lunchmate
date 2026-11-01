"use client";
// 투표방 시안 A "목록과 바" (T7.1).
//
// 의도: 한 화면에서 모든 후보와 지금 득표를 한 번에 읽는다. 위계는 타이포로만:
//       세리프 질문 → 큰 카운트다운 숫자 → 후보 줄(세리프 이름 + 8px 득표 바 + 오른쪽 득표 수).
// 고르기: 줄 전체가 라디오(복수 선택이면 체크). 왼쪽 원이 1.5px 올리브 테두리와 점으로 바뀐다(면 틴트 없음).
// 득표는 무기명(숫자만). 1위 바만 올리브, 나머지는 chart-3. 실시간으로 표가 들어오면 바 길이가 slow로 늘고 숫자가 굴러간다.
// 확정: 같은 목록이 득표순으로 다시 서고, 맨 위에 축하 한 줄(display 세리프)과 확정 식당 블록이 떠오른다.
import { Check } from "lucide-react";
import { useState, type ReactNode } from "react";
import { PlaceBadges } from "@/components/badges/place-badges";
import { RollingNumber } from "@/components/numbers";
import { focusRing } from "@/components/ui/interaction";
import { pollLabCopy as copy } from "@/copy/design-lab-poll";
import { categoryLabel } from "@/features/place/categories";
import { formatPriceBand } from "@/lib/format";
import { cn } from "@/lib/utils";
import { POLL_DEADLINE_LABEL, POLL_TITLE, type PollCandidate } from "../mock";
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
  VoteBar,
  resolvedLine,
  useLabAnnouncer,
} from "../shared";
import { rankOrder, usePollLab, type PollLab } from "../use-poll-lab";

export function PollA({ p }: { p: PollParams }) {
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
          <PollSkeleton />
        </PollColumn>
      </PollFrame>
    );
  }
  return <RoomA p={p} />;
}

function RoomA({ p }: { p: PollParams }) {
  const lab = usePollLab(p);
  const nameFail = isNameFail(p);
  const { notice, announcer } = useLabAnnouncer();
  const [tiePick, setTiePick] = useState<number | null>(null);
  const max = Math.max(1, ...lab.votes);
  const leading =
    lab.phase === "result"
      ? lab.winner
      : lab.top.length === 1
        ? lab.top[0]!
        : -1;

  return (
    <PollFrame
      candidates={lab.candidates}
      active={leading ?? -1}
      nameFail={nameFail}
    >
      <PollColumn>
        <TopBar lab={lab} onNotice={notice} />
        {announcer}
        <p role="status" className="sr-only">
          {lab.announce}
        </p>

        {lab.phase === "result" && lab.winner !== null ? (
          <ResultA lab={lab} nameFail={nameFail} max={max} />
        ) : (
          <>
            <HeadA lab={lab} p={p} />
            {lab.offline ? <OfflineLine className="mt-6" /> : null}
            {p.liveLost && !lab.offline ? (
              <LiveStatus lost incoming={null} className="mt-6" />
            ) : null}
            {lab.phase === "tie" || lab.phase === "rolling" ? (
              <TieQuestion lab={lab} className="mt-8" />
            ) : null}
            {p.state === "empty" ? <EmptyVotesLine className="mt-8" /> : null}

            <CandidateList
              lab={lab}
              nameFail={nameFail}
              max={max}
              tiePick={tiePick}
              onTiePick={setTiePick}
            />

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
            {lab.phase === "vote" ? (
              <VoteActions
                lab={lab}
                voteLabel={
                  lab.multi && lab.picks.length > 1
                    ? copy.actions.voteMulti(lab.picks.length)
                    : undefined
                }
              />
            ) : (
              <TieActions lab={lab} picked={tiePick} />
            )}
          </>
        )}
      </PollColumn>
    </PollFrame>
  );
}

/* ---------- 머리 ---------- */

function HeadA({ lab, p }: { lab: PollLab; p: PollParams }) {
  return (
    <header className="flex flex-col pt-1">
      <p className="type-caption text-muted-foreground">
        {copy.head.eyebrow}
        <span
          aria-hidden
          className="mx-2 inline-block h-3 w-px translate-y-0.5 bg-border"
        />
        {copy.head.deadlineAt(POLL_DEADLINE_LABEL)}
      </p>
      <h1 className="mt-2 type-title text-balance break-keep">
        {copy.head.question(POLL_TITLE)}
      </h1>
      <HostLine isHost={lab.isHost} className="mt-2" />

      <div className="mt-6 flex items-end justify-between gap-4 border-b border-border pb-4">
        <div className="flex flex-col gap-2">
          <AvatarStack people={lab.people} max={5} />
          <p className="type-caption text-muted-foreground">
            {copy.head.participants(lab.people.length)}
            <span
              aria-hidden
              className="mx-2 inline-block h-3 w-px translate-y-0.5 bg-border"
            />
            {p.multi ? copy.head.multi : copy.head.single}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-2 type-caption text-muted-foreground">
            {lab.offline || p.liveLost ? null : (
              <LiveStatus lost={false} incoming={lab.incoming} />
            )}
            {copy.head.untilDeadline}
          </span>
          <Countdown deadline={lab.deadline} className="type-numeric-lg" />
        </div>
      </div>
    </header>
  );
}

/* ---------- 후보 목록 ---------- */

function CandidateList({
  lab,
  nameFail,
  max,
  tiePick,
  onTiePick,
}: {
  lab: PollLab;
  nameFail: boolean;
  max: number;
  tiePick: number | null;
  onTiePick: (i: number) => void;
}) {
  const tie = lab.phase === "tie" || lab.phase === "rolling";
  const role = tie || !lab.multi ? "radiogroup" : "group";
  return (
    <div
      role={role}
      aria-label={copy.head.question(POLL_TITLE)}
      className="mt-2"
    >
      <ul className="flex flex-col">
        {lab.candidates.map((c, i) => {
          const inTie = lab.top.includes(i);
          if (tie && !inTie) {
            return (
              <Row key={c.place.id} dim>
                <RowBody
                  c={c}
                  i={i}
                  lab={lab}
                  nameFail={nameFail}
                  max={max}
                  leading={false}
                />
              </Row>
            );
          }
          const selected = tie
            ? tiePick === i || lab.rollingAt === i
            : lab.mine
              ? lab.mine.includes(i)
              : lab.picks.includes(i);
          const interactive = tie
            ? lab.isHost && lab.phase === "tie"
            : lab.canVote && !lab.mine;
          return (
            <Row key={c.place.id} highlight={lab.rollingAt === i}>
              <button
                type="button"
                role={role === "radiogroup" ? "radio" : "checkbox"}
                aria-checked={selected}
                aria-disabled={!interactive || undefined}
                onClick={() => (tie ? onTiePick(i) : lab.toggle(i))}
                className={cn(
                  "absolute inset-0 z-0 rounded-lg",
                  focusRing,
                  interactive ? "cursor-pointer" : "cursor-default",
                )}
              >
                <span className="sr-only">
                  {nameFail && i === 1
                    ? copy.candidate.unresolved(2)
                    : c.place.name}
                  {lab.isGuest
                    ? ""
                    : `, ${copy.candidate.votes(lab.votes[i] ?? 0)}`}
                </span>
              </button>
              <SelectMark
                selected={selected}
                multi={lab.multi && !tie}
                hidden={lab.isGuest}
              />
              <RowBody
                c={c}
                i={i}
                lab={lab}
                nameFail={nameFail}
                max={max}
                leading={lab.top.length === 1 && lab.top[0] === i}
                mine={!!lab.mine?.includes(i)}
                tie={tie && inTie}
              />
            </Row>
          );
        })}
      </ul>
    </div>
  );
}

function Row({
  children,
  dim = false,
  highlight = false,
}: {
  children: ReactNode;
  dim?: boolean;
  highlight?: boolean;
}) {
  return (
    <li
      className={cn(
        "relative flex items-start gap-4 border-b border-border py-4 transition-[opacity,box-shadow] duration-(--lm-duration-fast) ease-standard",
        dim && "opacity-45",
        highlight && "rounded-lg ring-[1.5px] ring-primary ring-inset",
      )}
    >
      {children}
    </li>
  );
}

/** 왼쪽 고름 표시: 라디오 원(복수면 둥근 네모). 고르면 1.5px 올리브 테두리 + 안쪽 점 */
function SelectMark({
  selected,
  multi,
  hidden,
}: {
  selected: boolean;
  multi: boolean;
  hidden: boolean;
}) {
  if (hidden) return null;
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none mt-3 flex size-5.5 shrink-0 items-center justify-center border transition-[border-color,border-width] duration-(--lm-duration-fast) ease-standard",
        multi ? "rounded-md" : "rounded-full",
        selected ? "border-[1.5px] border-primary" : "border-input",
      )}
    >
      {selected ? (
        multi ? (
          <Check className="size-3.5 text-primary" strokeWidth={2} />
        ) : (
          <span className="size-2.5 rounded-full bg-primary motion-safe:transition-transform motion-safe:duration-(--lm-duration-fast) motion-safe:starting:scale-0" />
        )
      ) : null}
    </span>
  );
}

function RowBody({
  c,
  i,
  lab,
  nameFail,
  max,
  leading,
  mine = false,
  tie = false,
}: {
  c: PollCandidate;
  i: number;
  lab: PollLab;
  nameFail: boolean;
  max: number;
  leading: boolean;
  mine?: boolean;
  tie?: boolean;
}) {
  const fail = nameFail && i === 1;
  const votes = lab.votes[i] ?? 0;
  return (
    <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            {mine ? (
              <span className="inline-flex items-center gap-1 type-caption text-primary">
                <Check aria-hidden className="size-3.5" strokeWidth={2} />
                {copy.candidate.mine}
              </span>
            ) : null}
            {tie ? (
              <span className="type-caption text-foreground">
                {copy.tie.tieBadge}
              </span>
            ) : null}
          </div>
          <div className="pointer-events-auto">
            <CandidateName
              candidate={c}
              order={i + 1}
              fail={fail}
              className="type-heading"
            />
          </div>
          {fail ? null : (
            <p className="type-caption text-muted-foreground tabular-nums">
              {copy.candidate.walk} {c.place.walkMinutes}
              {copy.candidate.minuteUnit}
              <span
                aria-hidden
                className="mx-2 inline-block h-3 w-px translate-y-0.5 bg-border"
              />
              {copy.candidate.price} {formatPriceBand(c.place.priceKRW)}
            </p>
          )}
          {c.badges.length > 0 && !fail ? (
            <PlaceBadges badges={c.badges} className="mt-1" />
          ) : null}
        </div>
        <CandidateArt candidate={c} fail={fail} size={44} className="mt-0.5" />
      </div>
      {lab.isGuest ? null : (
        <div className="flex items-center gap-3">
          <VoteBar value={votes} max={max} leading={leading} />
          <span
            aria-hidden
            className={cn(
              "w-10 shrink-0 text-right type-numeric-md",
              leading ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <RollingNumber value={votes} suffix={copy.candidate.voteUnit} />
          </span>
        </div>
      )}
    </div>
  );
}

/* ---------- 결과 ---------- */

function ResultA({
  lab,
  nameFail,
  max,
}: {
  lab: PollLab;
  nameFail: boolean;
  max: number;
}) {
  const w = lab.winner!;
  const c = lab.candidates[w]!;
  const fail = nameFail && w === 1;
  const order = rankOrder(lab.votes);
  const { notice, announcer } = useLabAnnouncer();
  return (
    <>
      {announcer}
      <header className="flex flex-col pt-2">
        <p className="type-caption text-muted-foreground">
          {resolvedLine(lab.resolvedBy)}
        </p>
        <Celebrate className="mt-4" />
      </header>

      <section
        aria-label={copy.result.winner(c.place.name)}
        className="mt-8 rounded-card border border-border bg-card px-6 pt-6 pb-6 motion-safe:transition-[opacity,translate] motion-safe:delay-150 motion-safe:duration-(--lm-duration-slow) motion-safe:ease-enter motion-safe:starting:translate-y-2 motion-safe:starting:opacity-0"
      >
        <div className="flex items-start gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {fail ? null : (
              <p
                className="type-caption"
                style={{ color: `var(--cat-${c.place.category}-ink)` }}
              >
                {categoryLabel(c.place.category)}
              </p>
            )}
            <h1 className="type-title break-keep">
              <CandidateName candidate={c} order={w + 1} fail={fail} />
            </h1>
          </div>
          <CandidateArt
            candidate={c}
            fail={fail}
            size={88}
            className="-mt-2 -mr-2"
          />
        </div>
        <dl className="mt-6 grid grid-cols-3 divide-x divide-border">
          <Stat
            label={copy.candidate.walk}
            value={c.place.walkMinutes}
            unit={copy.candidate.minuteUnit}
          />
          <Stat
            label={copy.candidate.price}
            text={formatPriceBand(c.place.priceKRW)}
          />
          <Stat
            label={copy.candidate.tally}
            value={lab.votes[w] ?? 0}
            unit={copy.candidate.voteUnit}
          />
        </dl>
        <p className="mt-5 type-body-sm text-muted-foreground">
          {copy.result.tally(lab.votes[w] ?? 0, lab.voters)}
        </p>
      </section>

      <section className="mt-10" aria-labelledby="poll-a-all">
        <h2 id="poll-a-all" className="type-caption text-muted-foreground">
          {copy.result.allVotes}
        </h2>
        <ol className="mt-2 flex flex-col">
          {order.map((i) => {
            const x = lab.candidates[i]!;
            return (
              <li
                key={x.place.id}
                className="flex items-center gap-3 border-b border-border py-3.5"
              >
                <span className="w-28 min-w-0 shrink-0 truncate type-body-sm">
                  {nameFail && i === 1
                    ? copy.candidate.unresolved(2)
                    : x.place.name}
                </span>
                <VoteBar
                  value={lab.votes[i] ?? 0}
                  max={max}
                  leading={i === w}
                />
                <span
                  className={cn(
                    "w-10 shrink-0 text-right type-numeric-md",
                    i === w ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <RollingNumber
                    value={lab.votes[i] ?? 0}
                    from={0}
                    suffix={copy.candidate.voteUnit}
                  />
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
      <ResultActions onNotice={notice} />
    </>
  );
}

function Stat({
  label,
  value,
  unit,
  text,
}: {
  label: string;
  value?: number;
  unit?: string;
  text?: string;
}) {
  return (
    <div className="flex flex-col gap-1 px-3 first:pl-0 last:pr-0">
      <dt className="type-caption text-muted-foreground">{label}</dt>
      <dd className="flex items-baseline gap-0.5 whitespace-nowrap">
        {text ? (
          <span className="type-numeric-md">{text}</span>
        ) : (
          <>
            <span className="type-numeric-lg">
              <RollingNumber value={value ?? 0} from={0} />
            </span>
            <span className="type-body-sm text-muted-foreground">{unit}</span>
          </>
        )}
      </dd>
    </div>
  );
}
