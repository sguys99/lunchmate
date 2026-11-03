"use client";
// 취향 시안 B 한 화면 취향표 (T9.17).
// - 온보딩: 셋째 단계 "못 먹는 음식"을 "음식 취향"으로 바꾼다. 카테고리 11종마다 좋아요 / 보통 / 안 먹어요를 고른다(기본 보통).
//   좋아요는 P 시작값을 올리고, 안 먹어요는 기피 카테고리로 하드 필터에 넣는다. 재료 단위 기피(알레르기, 직접 입력)는 아래 펼침에 둔다.
//   단계 수는 3개 그대로다.
// - 홈: 취향을 하나도 고르지 않은 사용자에게 대안 목록 아래 조용한 칸. 카드보다 아래라 결정 흐름을 막지 않는다.
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useId, useState } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { focusRing } from "@/components/ui/interaction";
import { onboardingCopy } from "@/copy/onboarding";
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

type Level = "like" | "neutral" | "avoid";
const LEVELS: readonly Level[] = ["like", "neutral", "avoid"];
const c = copy.b;

const PRESET: Partial<Record<TasteCategory, Level>> = {
  gukbap: "like",
  ilsik: "like",
  asian: "avoid",
};

export function TasteB({ p }: { p: TasteParams }) {
  return p.view === "band" ? <BandB state={p.state} /> : <StepB p={p} />;
}

function StepB({ p }: { p: TasteParams }) {
  const [levels, setLevels] = useState<Partial<Record<TasteCategory, Level>>>(
    p.state === "empty" ? {} : PRESET,
  );
  const [moreOpen, setMoreOpen] = useState(false);
  const moreId = useId();
  const levelOf = (s: TasteCategory): Level => levels[s] ?? "neutral";
  const like = TASTE_CATEGORIES.filter((s) => levelOf(s) === "like").length;
  const avoid = TASTE_CATEGORIES.filter((s) => levelOf(s) === "avoid").length;

  return (
    <OnboardingFrame
      steps={c.steps}
      current={3}
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
      <p className="mt-6 type-caption text-muted-foreground" aria-hidden>
        {c.summary(like, avoid)}
      </p>
      <Announcer text={c.summary(like, avoid)} />
      <ul className="mt-2 flex flex-col divide-y divide-border">
        {TASTE_CATEGORIES.map((slug) => {
          const name = categoryLabel(slug).split("/")[0]!;
          const level = levelOf(slug);
          return (
            <li key={slug} className="flex min-h-16 items-center gap-3 py-2">
              <CategoryIllustration
                slug={slug}
                size={32}
                className={cn(
                  "transition-opacity duration-(--lm-duration-fast)",
                  level === "avoid" && "opacity-40",
                )}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 type-label break-keep",
                  level === "avoid" && "text-muted-foreground line-through",
                )}
              >
                {name}
              </span>
              <ChipGroup
                aria-label={c.rowLabel(name)}
                value={[level]}
                onValueChange={(v) => {
                  const next = v.map(String).at(-1) as Level | undefined;
                  setLevels((prev) => ({ ...prev, [slug]: next ?? "neutral" }));
                }}
                className="shrink-0 flex-nowrap gap-1.5"
              >
                {LEVELS.map((l) => (
                  <Chip key={l} value={l} className="h-9 px-3">
                    {c.levels[l]}
                  </Chip>
                ))}
              </ChipGroup>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 border-t border-border pt-2">
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-controls={moreId}
          onClick={() => setMoreOpen((o) => !o)}
          className={cn(
            "flex h-12 w-full items-center justify-between type-label",
            focusRing,
          )}
        >
          {c.more}
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-(--lm-duration-base)",
              moreOpen && "rotate-180",
            )}
            strokeWidth={1.75}
          />
        </button>
        <div
          id={moreId}
          hidden={!moreOpen}
          className="flex flex-col gap-4 pb-2"
        >
          <p className="type-caption break-keep text-muted-foreground">
            {c.moreBody}
          </p>
          <ChipGroup multiple aria-label={onboardingCopy.avoid.allergies}>
            {onboardingCopy.avoid.allergyChips.map((a) => (
              <Chip key={a} value={a}>
                {a}
              </Chip>
            ))}
          </ChipGroup>
          <Input
            aria-label={onboardingCopy.avoid.custom}
            placeholder={onboardingCopy.avoid.customPlaceholder}
            maxLength={20}
          />
        </div>
      </div>
    </OnboardingFrame>
  );
}

function BandB({ state }: { state: TasteParams["state"] }) {
  const [open, setOpen] = useState(true);
  const b = copy.band;
  return (
    <HomeFrame
      state={state}
      bottom={
        open ? (
          <section
            aria-label={b.bTitle}
            className="flex flex-col gap-3 rounded-card border border-dashed border-border px-5 py-4"
          >
            <div className="flex items-start gap-3">
              <SlidersHorizontal
                aria-hidden
                className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                strokeWidth={1.5}
              />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="type-label break-keep">{b.bTitle}</p>
                <p className="type-caption break-keep text-muted-foreground">
                  {b.bBody}
                </p>
              </div>
            </div>
            <div className="flex gap-2 pl-8">
              <button type="button" className={buttonClass("secondary", "sm")}>
                {b.bAction}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={buttonClass("ghost", "sm")}
              >
                {b.bLater}
              </button>
            </div>
          </section>
        ) : null
      }
    />
  );
}
