"use client";
// 어제 피드백 카드 (FB-01, T3.1): "어제 간 ○○, 어땠어요?" 👍 / 👎 / 안 갔어요 한 탭.
// 한 번 누르면 고맙다는 한 줄로 바뀐다(role=status). 다음 입력(가격, 태그)은 강요하지 않는다(제품 원칙 4).
// layout
// - card: 1px 선 카드, 질문 위 + 버튼 아래 (A, B)
// - line: 위아래 헤어라인만 있는 한 줄 띠, 질문 왼쪽 + 아이콘 버튼 오른쪽 (C, D)
// 👍 👎는 Lucide 선 아이콘 + aria-label(copy-guide 4.9: 좋았어요, 별로였어요).
import { Check, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { focusRing, hitArea44, pressMotion } from "@/components/ui/interaction";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import { getMockPlace } from "@/features/design-lab/mock";
import { CategoryIllustration } from "@/features/place/illustrations";
import { cn } from "@/lib/utils";

const copy = designLabHomeCopy.screen.feedback;
/** 목업: 어제 간 곳 */
const YESTERDAY = getMockPlace("mock-fastfood");

type Answer = "up" | "down" | "skipped";

const iconButton = cn(
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-foreground hover:bg-muted",
  pressMotion,
  focusRing,
);
const textButton = cn(
  "inline-flex h-11 shrink-0 items-center justify-center rounded-button px-3 type-label text-muted-foreground hover:text-foreground",
  hitArea44,
  pressMotion,
  focusRing,
);

export function YesterdayFeedback({
  layout = "card",
  className,
}: {
  layout?: "card" | "line";
  className?: string;
}) {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const question = copy.question(YESTERDAY.name);

  const buttons = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={copy.up}
        onClick={() => setAnswer("up")}
        className={iconButton}
      >
        <ThumbsUp aria-hidden className="size-[1.125rem]" strokeWidth={1.5} />
      </button>
      <button
        type="button"
        aria-label={copy.down}
        onClick={() => setAnswer("down")}
        className={iconButton}
      >
        <ThumbsDown aria-hidden className="size-[1.125rem]" strokeWidth={1.5} />
      </button>
      <button
        type="button"
        onClick={() => setAnswer("skipped")}
        className={textButton}
      >
        {copy.skipped}
      </button>
    </div>
  );

  const thanks = (
    <p
      role="status"
      className="flex min-h-11 items-center gap-2 type-body-sm text-muted-foreground motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)]"
    >
      <Check aria-hidden className="size-4 text-success" strokeWidth={1.75} />
      <span>
        <span className="text-foreground">{copy.thanks}</span> {copy.thanksBody}
      </span>
    </p>
  );

  if (layout === "line") {
    return (
      <section
        aria-label={copy.label}
        className={cn(
          "flex min-h-16 items-center gap-3 border-y border-border py-2.5",
          className,
        )}
      >
        {answer ? (
          thanks
        ) : (
          <>
            <CategoryIllustration slug={YESTERDAY.category} size={36} />
            <div className="flex min-w-0 flex-1 flex-col items-start">
              <p className="type-body-sm break-keep">{question}</p>
              <button
                type="button"
                onClick={() => setAnswer("skipped")}
                className={cn(
                  "-ml-0.5 inline-flex h-7 items-center rounded-sm px-0.5 type-caption text-muted-foreground underline decoration-border underline-offset-3 hover:text-foreground",
                  hitArea44,
                  focusRing,
                )}
              >
                {copy.skipped}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={copy.up}
                onClick={() => setAnswer("up")}
                className={iconButton}
              >
                <ThumbsUp
                  aria-hidden
                  className="size-[1.125rem]"
                  strokeWidth={1.5}
                />
              </button>
              <button
                type="button"
                aria-label={copy.down}
                onClick={() => setAnswer("down")}
                className={iconButton}
              >
                <ThumbsDown
                  aria-hidden
                  className="size-[1.125rem]"
                  strokeWidth={1.5}
                />
              </button>
            </div>
          </>
        )}
      </section>
    );
  }

  return (
    <section
      aria-label={copy.label}
      className={cn(
        "flex flex-col gap-3 rounded-card border border-border bg-card px-5 py-4",
        className,
      )}
    >
      {answer ? (
        thanks
      ) : (
        <>
          <div className="flex items-center gap-3">
            <CategoryIllustration slug={YESTERDAY.category} size={36} />
            <p className="min-w-0 flex-1 type-body-sm break-keep">{question}</p>
          </div>
          {buttons}
        </>
      )}
    </section>
  );
}
