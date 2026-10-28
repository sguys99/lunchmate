"use client";
// /design-lab/poc/number-flow (T2.13): 숫자 롤링 PoC. 공용 컴포넌트는 src/components/numbers.
// 득표 수, 마감 카운트다운, 👍 비율 세 곳에서 같은 RollingNumber를 쓰고, PocFrame의 "모션 줄이기"로 즉시 모드를 확인한다.
import { useEffect, useState, type ReactNode } from "react";
import { DeadlineCountdown, RollingNumber } from "@/components/numbers";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { pocNumbersCopy as copy } from "@/copy/design-lab-poc-numbers";
import { thumbsUpPercent } from "@/lib/format";
import { HOUR_MS, MINUTE_MS } from "@/lib/time";
import { PocFrame } from "./poc-frame";

const LONG_MS = HOUR_MS + 2 * MINUTE_MS + 5_000; // 1:02:05
const SHORT_MS = 3 * MINUTE_MS + 12_000; // 3:12

export function NumberFlowPoc() {
  return (
    <PocFrame title={copy.title} description={copy.description}>
      <div className="mt-10 flex flex-col gap-12">
        <VotesDemo />
        <CountdownDemo />
        <ThumbsDemo />
      </div>
    </PocFrame>
  );
}

function Section({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6 border-t border-border pt-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="type-heading">{title}</h2>
        <p className="type-body-sm text-muted-foreground">{body}</p>
      </div>
      {children}
    </section>
  );
}

/* ---------- 득표 수 ---------- */

const INITIAL_VOTES = [3, 2, 1] as const;

function VotesDemo() {
  const [others, setOthers] = useState<number[]>([...INITIAL_VOTES]);
  const [mine, setMine] = useState<number | null>(0);
  const [turn, setTurn] = useState(0);
  const votes = others.map((v, i) => v + (mine === i ? 1 : 0));
  const participants =
    others.reduce((s, v) => s + v, 0) + (mine === null ? 0 : 1);

  return (
    <Section title={copy.votes.title} body={copy.votes.body}>
      <ul className="flex flex-col">
        {copy.votes.candidates.map((name, i) => (
          <li
            key={name}
            className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
          >
            <span className="min-w-0 flex-1 truncate type-label">{name}</span>
            <span className="type-numeric-md">
              <RollingNumber
                value={votes[i] ?? 0}
                from={0}
                suffix={copy.votes.unit}
              />
            </span>
            <Toggle
              pressed={mine === i}
              onPressedChange={(p) => setMine(p ? i : null)}
              aria-label={copy.votes.voteFor(name)}
            >
              {copy.votes.myVote}
            </Toggle>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-3">
        <span className="type-caption text-muted-foreground">
          {copy.votes.participants(participants)}
        </span>
        <Button
          size="sm"
          onClick={() => {
            // 결정적인 순서로 돌아가며 표를 더한다(디자인 랩 캡처가 매번 같게).
            setOthers((prev) =>
              prev.map((v, i) => (i === turn % prev.length ? v + 1 : v)),
            );
            setTurn((t) => t + 1);
          }}
        >
          {copy.votes.incoming}
        </Button>
      </div>
    </Section>
  );
}

/* ---------- 마감 카운트다운 ---------- */

function CountdownDemo() {
  // 디자인 랩 전용: 연 시각 기준으로 마감을 잡는다. 실제 투표방은 서버의 deadline_at(UTC)을 받는다.
  // 렌더 중 Date.now()는 프리렌더에 박히므로(cacheComponents) 마운트 뒤 첫 프레임에 잡는다.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [shortDeadline, setShortDeadline] = useState<number | null>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => setStartedAt(Date.now()));
    return () => cancelAnimationFrame(id);
  }, []);
  const origin = startedAt ?? 0;
  const long = new Date(origin + LONG_MS);
  const short = new Date(shortDeadline ?? origin + SHORT_MS);

  return (
    <Section title={copy.countdown.title} body={copy.countdown.body}>
      <dl className="flex flex-col gap-5">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="type-label text-muted-foreground">
            {copy.countdown.long}
          </dt>
          <dd className="type-numeric-lg">
            {startedAt === null ? null : <DeadlineCountdown deadline={long} />}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="type-label text-muted-foreground">
            {copy.countdown.short}
          </dt>
          <dd className="type-numeric-lg">
            {startedAt === null ? null : (
              <DeadlineCountdown
                deadline={short}
                className="data-[state=closed]:type-label data-[state=closed]:text-muted-foreground"
              />
            )}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setStartedAt(Date.now());
            setShortDeadline(null);
          }}
        >
          {copy.countdown.reset}
        </Button>
        <Button size="sm" onClick={() => setShortDeadline(Date.now() + 10_000)}>
          {copy.countdown.nearEnd}
        </Button>
      </div>
    </Section>
  );
}

/* ---------- 👍 비율 ---------- */

const INITIAL_THUMBS = { up: 14, total: 17 } as const; // 82%

function ThumbsDemo() {
  const [counts, setCounts] = useState<{ up: number; total: number }>(
    INITIAL_THUMBS,
  );
  const pct = thumbsUpPercent(counts.up, counts.total);

  return (
    <Section title={copy.thumbs.title} body={copy.thumbs.body}>
      <div className="flex items-end justify-between gap-4">
        {pct === null ? (
          <p className="type-body-sm text-muted-foreground">
            {copy.thumbs.empty}
          </p>
        ) : (
          <span className="type-numeric-lg">
            <RollingNumber value={pct} from={0} suffix="%" />
          </span>
        )}
        <span className="type-caption text-muted-foreground">
          {copy.thumbs.responses}{" "}
          <RollingNumber
            value={counts.total}
            suffix={copy.thumbs.responseUnit}
          />
        </span>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setCounts({ up: 0, total: 0 })}
        >
          {copy.thumbs.reset}
        </Button>
        <Button
          size="sm"
          onClick={() => setCounts((c) => ({ up: c.up, total: c.total + 1 }))}
        >
          {copy.thumbs.down}
        </Button>
        <Button
          size="sm"
          onClick={() =>
            setCounts((c) => ({ up: c.up + 1, total: c.total + 1 }))
          }
        >
          {copy.thumbs.up}
        </Button>
      </div>
    </Section>
  );
}
