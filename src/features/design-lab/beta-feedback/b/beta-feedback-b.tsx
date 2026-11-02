"use client";
// 베타 의견 시안 B: 두 단계 시트 (T9.4).
// - 진입: 나 탭 머리 오른쪽, 설정 톱니 왼쪽의 글자 버튼 "의견"(아이콘 + 글자, 높이 44). 탭 내용을 밀지 않는다.
// - 1단계: 종류 네 줄(아이콘 + 이름 + 한 줄 설명). 줄을 누르면 160ms 뒤 2단계로(고른 줄이 잠깐 보이게).
// - 2단계: 종류별 질문이 제목, 종류별 예시 문구, 내용(500자), 화면 함께 보내기(버그, 불편은 기본 켬, 좋아요, 제안은 기본 끔).
//   머리에 이전(44) + 단계 막대. 단계가 바뀌면 새 내용이 8px 옆에서 페이드(base), 축소 모드는 즉시.
// - 제보 시트(D-13 C 한 질문씩)와 같은 문법이라 배울 것이 없다.
import { Bug, ChevronLeft, ChevronRight, Lightbulb, Meh, MessageSquareText, ThumbsUp } from "lucide-react";
import { useRef, useState, type ComponentType } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing } from "@/components/ui/interaction";
import { rowPress } from "@/components/ui/row-press";
import { cn } from "@/lib/utils";
import { BETA_CATEGORIES, type BetaCategory, type BetaFeedbackParams } from "../params";
import {
  AttachRow,
  feedbackCopy as copy,
  FeedbackSheet,
  FeedbackText,
  FormSkeleton,
  MeTabMock,
  SendBar,
  SentView,
  useFeedbackDraft,
} from "../shared";

const ICONS: Record<BetaCategory, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  bug: Bug,
  inconvenient: Meh,
  good: ThumbsUp,
  idea: Lightbulb,
};

const ADVANCE_MS = 160;

export function BetaFeedbackB({ p }: { p: BetaFeedbackParams }) {
  const [open, setOpen] = useState(p.view !== "entry");
  const draft = useFeedbackDraft(p);
  const [step, setStep] = useState<1 | 2>(p.state === "empty" ? 1 : p.step);
  const timer = useRef<number | null>(null);
  const loading = p.state === "loading";
  const sent = draft.status === "sent";
  const cat = draft.category ?? "bug";

  function pick(c: BetaCategory) {
    draft.setCategory(c);
    draft.setAttach(c === "bug" || c === "inconvenient");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStep(2), ADVANCE_MS);
  }

  const title = sent ? copy.sheet.title : step === 1 ? copy.sheet.categoryQuestion : copy.categoryPrompts[cat];

  return (
    <>
      <MeTabMock
        headerExtra={
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={copy.entry.headerButtonLabel}
            className={cn(buttonClass("ghost", "sm"), "px-3")}
          >
            <MessageSquareText aria-hidden strokeWidth={1.5} />
            {copy.entry.headerButton}
          </button>
        }
      />
      <FeedbackSheet
        open={open}
        onOpenChange={setOpen}
        title={title}
        progress={loading || sent ? undefined : step / 2}
        headerStart={
          step === 2 && !sent && !loading ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              aria-label={copy.sheet.back}
              className={cn(
                "-ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-muted",
                focusRing,
              )}
            >
              <ChevronLeft aria-hidden className="size-5" strokeWidth={1.5} />
            </button>
          ) : undefined
        }
        footer={loading || sent || step === 1 ? undefined : <SendBar draft={draft} />}
      >
        <p className="sr-only">{copy.sheet.stepLabel(step, 2)}</p>
        {loading ? (
          <FormSkeleton />
        ) : sent ? (
          <SentView onClose={() => setOpen(false)} onAgain={() => { draft.reset(); setStep(1); }} className="pb-2" />
        ) : (
          <div
            key={step}
            className="flex flex-col gap-5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-2 motion-safe:[animation-duration:var(--lm-duration-base)] motion-safe:[animation-timing-function:var(--lm-ease-enter)]"
          >
            {step === 1 ? (
              <>
                <p className="-mt-2 type-caption text-muted-foreground">{copy.sheet.description}</p>
                <ul className="flex flex-col divide-y divide-border border-y border-border">
                  {BETA_CATEGORIES.map((c) => {
                    const Icon = ICONS[c];
                    const selected = draft.category === c;
                    return (
                      <li key={c}>
                        <button
                          type="button"
                          onClick={() => pick(c)}
                          aria-pressed={selected}
                          className={cn(
                            "flex min-h-16 w-full items-center gap-4 py-3 text-left",
                            focusRing,
                            rowPress,
                          )}
                        >
                          <Icon
                            className={cn("size-5 shrink-0", selected ? "text-primary" : "text-muted-foreground")}
                            strokeWidth={1.5}
                          />
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className={cn("type-body", selected && "text-primary")}>
                              {copy.categories[c]}
                            </span>
                            <span className="type-caption text-muted-foreground">
                              {copy.categoryHints[c]}
                            </span>
                          </span>
                          <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <>
                <FeedbackText
                  draft={draft}
                  label={copy.categoryPrompts[cat]}
                  labelHidden
                  placeholder={copy.categoryPlaceholders[cat]}
                  rows={5}
                />
                <AttachRow draft={draft} />
              </>
            )}
          </div>
        )}
      </FeedbackSheet>
    </>
  );
}
