"use client";
// 취향 시안 A 좋아하는 음식 단계 (T9.17).
// - 온보딩: 못 먹는 음식 뒤에 넷째 단계를 더한다. 카테고리 11종을 그림 타일 3열로 보여 주고 3개까지 고른다.
//   고른 카테고리는 P 시작값을 조금 올린다(만료 없음, 요즘 땡겨요와 별개). 지금 온보딩 흐름을 그대로 두고 한 칸만 늘린다.
// - 홈: 못 먹는 음식을 건너뛴 사용자에게 제목 아래 한 줄 띠. "알려 주기"는 셋째, 넷째 단계만 담은 시트를 연다.
//   닫으면 다시 보이지 않는다. 오류, 오프라인, 로딩에서는 띠를 숨긴다.
import { Ban, Check, X } from "lucide-react";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button-classes";
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
  StepNote,
  TASTE_CATEGORIES,
  type TasteCategory,
} from "../shared";

const MAX = 3;
const c = copy.a;

export function TasteA({ p }: { p: TasteParams }) {
  return p.view === "band" ? <BandA state={p.state} /> : <StepA p={p} />;
}

function StepA({ p }: { p: TasteParams }) {
  const [picked, setPicked] = useState<TasteCategory[]>(
    p.state === "empty" ? [] : ["gukbap", "ilsik"],
  );
  const [announce, setAnnounce] = useState("");
  const full = picked.length >= MAX;

  function toggle(slug: TasteCategory) {
    if (picked.includes(slug)) {
      const next = picked.filter((s) => s !== slug);
      setPicked(next);
      setAnnounce(c.countLabel(next.length, MAX));
      return;
    }
    if (full) {
      setAnnounce(c.full);
      return;
    }
    const next = [...picked, slug];
    setPicked(next);
    setAnnounce(c.countLabel(next.length, MAX));
  }

  return (
    <OnboardingFrame
      steps={c.steps}
      current={4}
      state={p.state}
      title={c.title}
      body={c.body}
      primary={{ label: copy.step.done }}
    >
      {p.state === "empty" ? (
        <StepNote
          title={copy.states.stepEmpty.title}
          body={copy.states.stepEmpty.body}
        />
      ) : null}
      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="type-caption text-muted-foreground">{c.gridLabel}</h2>
        <span
          aria-hidden
          className="type-caption text-muted-foreground tabular-nums"
        >
          {c.count(picked.length, MAX)}
        </span>
      </div>
      <ul
        aria-label={c.gridLabel}
        className="mt-3 grid grid-cols-3 gap-2 @min-[34rem]/screen:grid-cols-4 desktop:grid-cols-3"
      >
        {TASTE_CATEGORIES.map((slug) => {
          const on = picked.includes(slug);
          const dim = full && !on;
          return (
            <li key={slug}>
              <button
                type="button"
                aria-pressed={on}
                aria-disabled={dim || undefined}
                onClick={() => toggle(slug)}
                className={cn(
                  "relative flex min-h-24 w-full flex-col items-center justify-center gap-1.5 rounded-card border bg-card px-1 py-3 transition-[border-color,opacity] duration-(--lm-duration-fast)",
                  on
                    ? "border-primary ring-[0.5px] ring-primary ring-inset"
                    : "border-border hover:bg-muted",
                  dim && "opacity-55",
                  focusRing,
                  pressMotion,
                )}
              >
                <CategoryIllustration slug={slug} size={48} />
                <span
                  className={cn(
                    "text-center type-label break-keep",
                    on ? "text-primary" : "text-foreground",
                  )}
                >
                  {categoryLabel(slug).split("/")[0]}
                </span>
                {on ? (
                  <span
                    aria-hidden
                    className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  >
                    <Check className="size-3" strokeWidth={2.5} />
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 type-caption break-keep text-muted-foreground">
        {full ? c.full : c.emptyNote}
      </p>
      <Announcer text={announce} />
    </OnboardingFrame>
  );
}

function BandA({ state }: { state: TasteParams["state"] }) {
  const [open, setOpen] = useState(true);
  const b = copy.band;
  return (
    <HomeFrame
      state={state}
      top={
        open ? (
          <section
            aria-label={b.aLine}
            className="ob-rise flex min-h-16 items-center gap-3 rounded-card border border-border bg-card py-2 pr-1 pl-4"
          >
            <Ban
              aria-hidden
              className="size-5 shrink-0 text-muted-foreground"
              strokeWidth={1.5}
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="type-label break-keep">{b.aLine}</p>
              <p className="type-caption break-keep text-muted-foreground">
                {b.aSub}
              </p>
            </div>
            <button
              type="button"
              className={cn(buttonClass("secondary", "sm"), "shrink-0")}
            >
              {b.aAction}
            </button>
            <button
              type="button"
              aria-label={b.close}
              onClick={() => setOpen(false)}
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground",
                focusRing,
              )}
            >
              <X aria-hidden className="size-4" strokeWidth={1.75} />
            </button>
          </section>
        ) : null
      }
    />
  );
}
