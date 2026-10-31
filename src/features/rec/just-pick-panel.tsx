"use client";
// "그냥 골라줘" 결과 패널 (REC-12, T5.22, G3 D-05, DESIGN.md 5장 "그냥 골라줘"). just-pick.tsx가 처음 누를 때 React.lazy로 받는다.
//
// 모양: 모바일은 아래에 붙는 시트(위 라운드 28, 면 popover, 안쪽 28, 360px 20, 뒤 overlay 딤, 흐림 없음).
//   데스크톱(화면 1024px 이상)은 좌 리스트 칸만 덮고 그 칸 아래(하단 탭 위 24)에 카드(최대 폭 416, 라운드 24).
//   지도 칸은 덮지 않아 결과 곳의 핀 강조가 보인다(G3 안건 4).
// 결과 카드: 세리프 한 줄("오늘은 여기로 가요.") + 닫기, 카테고리와 이름 + 일러스트 72, 이유(도보 분 제외) + 배지,
//   숫자 3칸, 길찾기(primary)와 다시 고르기.
// 등장은 패널 하나가 slow 페이드 + 8px 올라옴(CSS), 닫힘은 fast. 축소 모드면 전환 없음.
// 접근성: role="dialog", 열리면 패널에 포커스, Tab은 패널 안에서만, Esc와 딤으로 닫고 버튼으로 포커스가 돌아간다.
import { RotateCcw, XIcon } from "lucide-react";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { homeCopy } from "@/copy/home";
import { CategoryIllustration } from "@/features/place/illustrations";
import { cn } from "@/lib/utils";
import { CardBadges, CategoryCaption, NumberGrid } from "./card-bits";
import type { TodayCard } from "./card-model";
import type { JustPickPhase } from "./just-pick";

const copy = homeCopy.today;
const jp = copy.justPick;

const FOCUSABLE =
  'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])';

export type JustPickPanelProps = {
  phase: JustPickPhase;
  card: TodayCard;
  reduced: boolean;
  onAgain: () => void;
  onClose: () => void;
  /** 길찾기(T5.20에서 연결). 없으면 버튼만 보인다 */
  onDirections?: (card: TodayCard) => void;
};

export default function JustPickPanel({
  phase,
  card,
  reduced,
  onAgain,
  onClose,
  onDirections,
}: JustPickPanelProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closing = phase === "closing";

  useEffect(() => {
    dialog.current?.focus({ preventScroll: true });
  }, []);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape" && phase === "result") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !dialog.current) return;
    const items = Array.from(
      dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    );
    const first = items[0];
    const last = items.at(-1);
    if (!first || !last) {
      e.preventDefault();
      return;
    }
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === dialog.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const enter = reduced
    ? ""
    : "animate-in fade-in-0 slide-in-from-bottom-2 [animation-duration:var(--lm-duration-slow)] [animation-timing-function:var(--lm-ease-enter)]";

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center",
        // 좌 리스트 칸(2fr / 5fr = 40%)만 덮는다. 카드는 하단 탭 위
        "desktop:right-[60%] desktop:px-8 desktop:pb-[calc(var(--lm-layout-tab-bar-height)+1.5rem)]",
      )}
    >
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-overlay transition-opacity duration-(--lm-duration-fast) ease-exit motion-reduce:transition-none",
          !reduced &&
            "animate-in fade-in-0 [animation-duration:var(--lm-duration-base)]",
          closing && "opacity-0",
        )}
      />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        data-phase={phase}
        className={cn(
          "relative w-full max-w-(--lm-layout-max-width) rounded-t-sheet border border-b-0 border-border bg-popover px-7 pt-7 pb-[calc(1.75rem+env(safe-area-inset-bottom))] text-popover-foreground shadow-sheet outline-none @max-[23.75rem]/screen:px-5",
          "desktop:max-w-[26rem] desktop:rounded-card desktop:border-b desktop:pb-7",
          "transition-[opacity,translate] duration-(--lm-duration-fast) ease-exit motion-reduce:transition-none",
          enter,
          closing && "translate-y-2 opacity-0",
        )}
      >
        <h2 id={titleId} className="sr-only">
          {jp.dialogLabel}
        </h2>
        <article aria-label={card.name} className="flex flex-col">
          <div className="flex min-h-11 items-start justify-between gap-3">
            <p className="min-w-0 flex-1 pt-2 type-heading text-muted-foreground">
              {jp.settled}
            </p>
            <Button
              variant="ghost"
              size="icon"
              aria-label={jp.close}
              onClick={onClose}
              className="-mt-2 -mr-3 shrink-0 text-muted-foreground"
            >
              <XIcon aria-hidden strokeWidth={1.5} />
            </Button>
          </div>

          <div className="mt-5 flex items-end justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <CategoryCaption category={card.category} />
              <h3 className="flex h-11 items-center truncate type-title">
                {card.name}
              </h3>
            </div>
            <CategoryIllustration
              slug={card.category}
              size={72}
              className="-mr-2 shrink-0"
            />
          </div>

          <div className="mt-2">
            <p className="line-clamp-2 type-body-sm text-pretty text-muted-foreground">
              {card.reason}
            </p>
            <CardBadges card={card} className="mt-3 empty:hidden" />
          </div>

          <NumberGrid card={card} className="mt-6" />

          <div className="mt-8 flex flex-col gap-2">
            <Button
              variant="primary"
              aria-label={copy.actions.directionsTo(card.name)}
              onClick={() => onDirections?.(card)}
              className="w-full"
            >
              {copy.actions.directions}
            </Button>
            <Button onClick={onAgain} className="w-full">
              <RotateCcw aria-hidden className="size-4" strokeWidth={1.5} />
              {jp.again}
            </Button>
          </div>
        </article>
      </div>
    </div>
  );
}
