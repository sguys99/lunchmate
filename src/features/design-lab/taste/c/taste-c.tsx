"use client";
// 취향 시안 C 둘 중 고르기 (T9.17).
// - 온보딩: 못 먹는 음식 뒤 넷째 단계 "취향 맞추기". 카테고리 두 개를 큰 그림으로 나란히 보여 주고 끌리는 쪽을 누른다. 3번이면 끝.
//   목록을 읽지 않고 그림만 보고 누르므로 가장 빠르다. 이긴 쪽은 P를 올리고, "둘 다 별로예요"는 두 쪽을 약하게 내린다(기피 아님).
// - 홈: 하루 한 번 제목 아래 같은 질문 하나(둘 중 고르기). 설정을 건너뛴 사용자뿐 아니라 모두에게 쓸 수 있어 학습이 이어진다.
//   고르면 고마움 한 줄로 접힌다. 오류, 오프라인, 로딩에서는 숨긴다.
import { Check } from "lucide-react";
import { useState } from "react";
import { focusRing, pressMotion } from "@/components/ui/interaction";
import { categoryLabel } from "@/features/place/categories";
import { CategoryIllustration } from "@/features/place/illustrations";
import { cn } from "@/lib/utils";
import type { TasteParams } from "../params";
import {
  Announcer,
  copy,
  HomeFrame,
  OnboardingFrame,
  QuietAction,
  StepNote,
  type TasteCategory,
} from "../shared";

const c = copy.c;
const ROUNDS: readonly (readonly [TasteCategory, TasteCategory])[] = [
  ["gukbap", "yangsik"],
  ["ilsik", "jungsik"],
  ["salad", "gogi"],
];
/** 캡처용 결과(demo=result): 첫째 판 국밥, 둘째 판 일식, 셋째 판 둘 다 별로 */
const DEMO_ANSWERS: readonly Answer[] = [0, 0, "neither"];

type Answer = 0 | 1 | "both" | "neither";
const short = (s: TasteCategory) => categoryLabel(s).split("/")[0]!;

export function TasteC({ p }: { p: TasteParams }) {
  return p.view === "band" ? (
    <BandC state={p.state} result={p.result} />
  ) : (
    <StepC p={p} />
  );
}

function StepC({ p }: { p: TasteParams }) {
  const [answers, setAnswers] = useState<Answer[]>(
    p.result ? [...DEMO_ANSWERS] : [],
  );
  const [flash, setFlash] = useState<0 | 1 | null>(null);
  const round = answers.length;
  const done = round >= ROUNDS.length;

  function answer(a: Answer) {
    if (done || flash !== null) return;
    if (a === 0 || a === 1) {
      // 고른 쪽을 잠깐 표시한 뒤 다음 판(축소 모드면 CSS 전환만 사라지고 순서는 같다)
      setFlash(a);
      window.setTimeout(() => {
        setFlash(null);
        setAnswers((prev) => [...prev, a]);
      }, 180);
      return;
    }
    setAnswers((prev) => [...prev, a]);
  }

  const liked: TasteCategory[] = [];
  const less: TasteCategory[] = [];
  answers.forEach((a, i) => {
    const pair = ROUNDS[i]!;
    if (a === 0 || a === 1) liked.push(pair[a]);
    else if (a === "both") liked.push(...pair);
    else less.push(...pair);
  });

  return (
    <OnboardingFrame
      steps={c.steps}
      current={4}
      state={p.state}
      title={done ? c.resultTitle : c.title}
      body={done ? c.resultBody : c.body}
      primary={{ label: copy.step.done }}
      secondary={
        done ? (
          <QuietAction onClick={() => setAnswers([])}>{c.again}</QuietAction>
        ) : null
      }
    >
      {p.state === "empty" ? (
        <StepNote
          title={copy.states.stepEmpty.title}
          body={copy.states.stepEmpty.body}
        />
      ) : null}
      {done ? (
        <dl className="ob-rise mt-6 flex flex-col divide-y divide-border rounded-card border border-border bg-card">
          <ResultRow label={c.resultLike} items={liked} />
          <ResultRow label={c.resultLess} items={less} />
        </dl>
      ) : (
        <Round
          key={round}
          index={round}
          pair={ROUNDS[round]!}
          flash={flash}
          onAnswer={answer}
        />
      )}
      <Announcer
        text={done ? c.resultTitle : c.roundLabel(round + 1, ROUNDS.length)}
      />
    </OnboardingFrame>
  );
}

function Round({
  index,
  pair,
  flash,
  onAnswer,
}: {
  index: number;
  pair: readonly [TasteCategory, TasteCategory];
  flash: 0 | 1 | null;
  onAnswer: (a: Answer) => void;
}) {
  return (
    <div className="ob-rise mt-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="type-caption text-muted-foreground tabular-nums">
          {c.round(index + 1, ROUNDS.length)}
        </span>
        <span aria-hidden className="flex gap-1.5">
          {ROUNDS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 w-6 rounded-full",
                i <= index ? "bg-primary" : "bg-border",
              )}
            />
          ))}
        </span>
      </div>
      <div
        role="group"
        aria-label={c.pairLabel}
        className="grid grid-cols-2 gap-3"
      >
        {pair.map((slug, i) => {
          const on = flash === i;
          return (
            <button
              key={slug}
              type="button"
              aria-pressed={on}
              onClick={() => onAnswer(i as 0 | 1)}
              className={cn(
                "relative flex min-h-44 flex-col items-center justify-center gap-3 rounded-card border bg-card px-2 py-5 transition-[border-color,transform] duration-(--lm-duration-fast)",
                on
                  ? "border-primary ring-[0.5px] ring-primary ring-inset"
                  : "border-border hover:bg-muted",
                focusRing,
                pressMotion,
              )}
            >
              <CategoryIllustration slug={slug} size={96} />
              <span
                className={cn(
                  "type-heading break-keep",
                  on ? "text-primary" : "text-foreground",
                )}
              >
                {short(slug)}
              </span>
              {on ? (
                <span
                  aria-hidden
                  className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                >
                  <Check className="size-3.5" strokeWidth={2.5} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="flex justify-center gap-6">
        <QuietAction onClick={() => onAnswer("both")}>{c.either}</QuietAction>
        <QuietAction onClick={() => onAnswer("neither")}>
          {c.neither}
        </QuietAction>
      </div>
    </div>
  );
}

function ResultRow({
  label,
  items,
}: {
  label: string;
  items: readonly TasteCategory[];
}) {
  return (
    <div className="flex min-h-16 items-center gap-4 px-5 py-3">
      <dt className="w-16 shrink-0 type-caption text-muted-foreground">
        {label}
      </dt>
      <dd className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
        {items.length === 0 ? (
          <span className="type-label text-muted-foreground">0</span>
        ) : (
          items.map((s) => (
            <span key={s} className="inline-flex items-center gap-2 type-label">
              <CategoryIllustration slug={s} size={28} />
              {short(s)}
            </span>
          ))
        )}
      </dd>
    </div>
  );
}

function BandC({
  state,
  result,
}: {
  state: TasteParams["state"];
  result: boolean;
}) {
  const [picked, setPicked] = useState<TasteCategory | null>(
    result ? "ilsik" : null,
  );
  const [hidden, setHidden] = useState(false);
  const b = copy.band;
  const pair: readonly [TasteCategory, TasteCategory] = ["ilsik", "hansik"];
  if (hidden) return <HomeFrame state={state} />;
  return (
    <HomeFrame
      state={state}
      top={
        picked ? (
          <p
            role="status"
            className="ob-rise flex min-h-11 items-center gap-2 type-caption text-muted-foreground"
          >
            <Check
              aria-hidden
              className="size-4 text-primary"
              strokeWidth={2}
            />
            {b.cDone}
          </p>
        ) : (
          <section
            aria-label={b.cTitle}
            className="ob-rise flex flex-col gap-2 rounded-card border border-border bg-card px-4 pt-3 pb-1"
          >
            <p className="type-label break-keep">{b.cTitle}</p>
            <div className="grid grid-cols-2 gap-2">
              {pair.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPicked(s)}
                  className={cn(
                    "flex min-h-14 items-center gap-3 rounded-input border border-border px-3 hover:bg-muted",
                    focusRing,
                    pressMotion,
                  )}
                >
                  <CategoryIllustration slug={s} size={36} />
                  <span className="type-label">{short(s)}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <QuietAction onClick={() => setHidden(true)}>
                {b.cSkip}
              </QuietAction>
            </div>
          </section>
        )
      }
    />
  );
}
