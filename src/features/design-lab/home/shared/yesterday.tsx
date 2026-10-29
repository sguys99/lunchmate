"use client";
// 어제 피드백 조각 (FB-01, FB-05, 홈 D1 한 줄 띠, G3 D-05).
// "어제 간 ○○, 어땠어요?" 👍 / 👎 / 안 갔어요 한 탭. 답의 저장은 목업이라 화면 상태만 바꾼다.
// - useYesterday: 물을 곳(목업 번하우스)과 답. ?feedback=none이면 물을 곳이 없는 날(FB-04).
// - ThumbButton: 👍 👎 선 아이콘 원형 버튼(44px). aria-label은 copy-guide 4.9(좋았어요, 별로였어요).
// - FeedbackThanks: 답한 뒤 한 줄. 안 갔어요는 "점수에 쓰지 않는다"로 바꿔 말한다(FB-05).
//   선택 입력(FB-02, 가격과 태그)은 글자 버튼 하나로만 열어 둔다(제품 원칙 4: 강요하지 않음).
// - AutoHeight: 안의 높이가 바뀌면 그 높이로 부드럽게 맞춘다(base 260ms, standard).
//   움직이는 동안만 overflow를 잘라 포커스 링과 터치 영역이 평소에는 잘리지 않게 한다. 축소 모드는 바로 바뀐다.
import { Check, ThumbsDown, ThumbsUp, type LucideIcon } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { focusRing, hitArea44, pressMotion } from "@/components/ui/interaction";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import { getMockPlace, type MockPlace } from "@/features/design-lab/mock";
import { useMotionReduced } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useHomeLabOptions } from "./lab-options-context";

export const feedbackCopy = designLabHomeCopy.screen.feedback;

export type FeedbackAnswer = "up" | "down" | "skipped";

/** 목업: 어제 점심에 간 곳 */
const YESTERDAY = getMockPlace("mock-fastfood");

export type Yesterday = {
  /** 물을 곳. 없는 날이면 null */
  place: MockPlace | null;
  answer: FeedbackAnswer | null;
  setAnswer: (answer: FeedbackAnswer) => void;
};

export function useYesterday(): Yesterday {
  const { feedback } = useHomeLabOptions();
  const [answer, setAnswer] = useState<FeedbackAnswer | null>(null);
  return {
    place: feedback === "none" ? null : YESTERDAY,
    answer,
    setAnswer,
  };
}

const THUMBS: Record<"up" | "down", { Icon: LucideIcon; label: string }> = {
  up: { Icon: ThumbsUp, label: feedbackCopy.up },
  down: { Icon: ThumbsDown, label: feedbackCopy.down },
};

/** 👍 👎 원형 아이콘 버튼(44px, 보이는 글자 없음 → aria-label) */
export function ThumbButton({
  kind,
  onAnswer,
  className,
}: {
  kind: "up" | "down";
  onAnswer: (answer: FeedbackAnswer) => void;
  className?: string;
}) {
  const { Icon, label } = THUMBS[kind];
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onAnswer(kind)}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted",
        pressMotion,
        focusRing,
        className,
      )}
    >
      <Icon aria-hidden className="size-[1.125rem]" strokeWidth={1.5} />
    </button>
  );
}

/** "안 갔어요" 밑줄 글자 버튼. 터치 영역 44 */
export function SkippedButton({
  onAnswer,
  className,
}: {
  onAnswer: (answer: FeedbackAnswer) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onAnswer("skipped")}
      className={cn(
        "inline-flex h-7 w-fit items-center rounded-sm px-0.5 type-caption text-muted-foreground underline decoration-border underline-offset-3 hover:text-foreground",
        hitArea44,
        focusRing,
        className,
      )}
    >
      {feedbackCopy.skipped}
    </button>
  );
}

/**
 * 답한 뒤 한 줄. focusOnMount면 나타날 때 포커스를 받아(누른 버튼이 사라지므로) 키보드 위치를 잃지 않는다.
 * more면 선택 입력(FB-02) 글자 버튼을 오른쪽에 둔다(안 갔어요에는 두지 않는다).
 */
export function FeedbackThanks({
  answer,
  more = false,
  focusOnMount = false,
  compact = false,
  className,
}: {
  answer: FeedbackAnswer;
  more?: boolean;
  /** true면 "알려 줘서 고마워요" 한 줄만 보이고 뒷말은 스크린 리더에만(D1 접힌 띠) */
  compact?: boolean;
  focusOnMount?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusOnMount) ref.current?.focus({ preventScroll: true });
  }, [focusOnMount]);
  const body =
    answer === "skipped" ? feedbackCopy.skippedBody : feedbackCopy.thanksBody;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className={cn(
        "flex min-h-11 items-center gap-3 outline-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)]",
        className,
      )}
    >
      <p
        role="status"
        className={cn(
          "flex min-w-0 flex-1 items-start gap-2 type-body-sm text-muted-foreground",
          compact && "items-center whitespace-nowrap",
        )}
      >
        <Check
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-success",
            !compact && "mt-[0.2rem]",
          )}
          strokeWidth={1.75}
        />
        <span className="break-keep">
          <span className="text-foreground">{feedbackCopy.thanks}</span>{" "}
          <span className={cn(compact && "sr-only")}>{body}</span>
        </span>
      </p>
      {more && answer !== "skipped" ? (
        <button
          type="button"
          className={cn(
            "inline-flex h-7 shrink-0 items-center rounded-sm px-0.5 type-caption text-muted-foreground underline decoration-border underline-offset-3 hover:text-foreground",
            hitArea44,
            focusRing,
          )}
        >
          {feedbackCopy.more}
        </button>
      ) : null}
    </div>
  );
}

/** 안의 높이 변화를 부드럽게 따라가는 상자 */
export function AutoHeight({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useMotionReduced();
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  const last = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const next = el.offsetHeight;
      if (last.current !== null && last.current !== next && !reduced)
        setMoving(true);
      last.current = next;
      setHeight(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [reduced]);

  return (
    <div
      style={height === null ? undefined : { height }}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget) setMoving(false);
      }}
      className={cn(
        // 축소 모드 판정(useMotionReduced)은 서버와 달라 클래스는 CSS 미디어 쿼리로만 끈다(하이드레이션 일치)
        "transition-[height] duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
        moving && "overflow-hidden",
        className,
      )}
    >
      <div ref={inner}>{children}</div>
    </div>
  );
}
