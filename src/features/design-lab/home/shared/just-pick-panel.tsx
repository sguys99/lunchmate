"use client";
// "그냥 골라줘" 결과 패널 (REC-12, G3 D-05). just-pick.tsx가 처음 누를 때 React.lazy로 받는다(홈 첫 로드 0).
//
// 열리는 때: 화면 카드 위 R1 순회가 멈춘 뒤(결과), 축소 모드면 누르자마자. 연출 중에는 열지 않는다.
// 모양: 모바일은 아래에 붙는 시트(엄지 쪽), 데스크톱(화면 1024px 이상)은 좌 리스트 칸만 덮고 그 칸 아래(하단 탭 위)에
//   카드를 띄운다(G3 안건 4). 지도 칸은 덮지 않아 결과 곳의 핀 강조(onSettle로 옮김)가 그대로 보인다. 뒤는 overlay 딤, 흐림 없음.
// 결과 카드: 세리프 한 줄("오늘은 여기로 가요.") + 닫기, 카테고리와 이름 + 일러스트 72, 이유(도보 분 제외) + 배지, 숫자 3칸, 길찾기와 다시 고르기.
// 등장은 패널 하나가 slow 페이드 + 8px 올라옴(CSS, 토큰 duration과 easing 변수). 닫힘은 fast. 축소 모드면 전환 없음.
// 조작: Esc, 딤, 닫기 버튼으로 닫는다. 포커스는 패널 안에서만 돈다.
import { RotateCcw, XIcon } from "lucide-react";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import type { MockPick, MockPlace } from "@/features/design-lab/mock";
import { CategoryIllustration } from "@/features/place/illustrations";
import { useMotionReduced } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { CardBadges, CategoryCaption, NumberGrid } from "./card-bits";
import type { JustPickRun } from "./just-pick";

const copy = designLabHomeCopy.screen;
const jp = copy.justPick;

const FOCUSABLE =
  'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])';

export type JustPickPanelProps = {
  run: JustPickRun;
  picks: MockPick;
  /** 결과 카드 이유 문장 */
  formatReason: (place: MockPlace) => string;
  onAgain: () => void;
  onClose: () => void;
};

export default function JustPickPanel({
  run,
  picks,
  formatReason,
  onAgain,
  onClose,
}: JustPickPanelProps) {
  const reduced = useMotionReduced();
  const dialog = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const place = picks[run.target] ?? picks[0];
  const closing = run.phase === "closing";

  useEffect(() => {
    dialog.current?.focus({ preventScroll: true });
  }, []);

  if (!place) return null;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape" && run.phase === "result") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !dialog.current) return;
    // 포커스 가두기: 결과 카드 버튼들 사이에서만 돈다
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

  const enter = !reduced
    ? "animate-in fade-in-0 slide-in-from-bottom-2 [animation-duration:var(--lm-duration-slow)] [animation-timing-function:var(--lm-ease-enter)]"
    : "";

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
        data-phase={run.phase}
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
        <ResultCard
          place={place}
          reason={formatReason(place)}
          onAgain={onAgain}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

function ResultCard({
  place,
  reason,
  onAgain,
  onClose,
}: {
  place: MockPlace;
  reason: string;
  onAgain: () => void;
  onClose: () => void;
}) {
  return (
    <article aria-label={place.name} className="flex flex-col">
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
          <CategoryCaption place={place} />
          <h3 className="flex h-11 items-center truncate type-title">
            {place.name}
          </h3>
        </div>
        <CategoryIllustration
          slug={place.category}
          size={72}
          className="-mr-2 shrink-0"
        />
      </div>

      <div className="mt-2">
        <p className="line-clamp-2 type-body-sm text-pretty text-muted-foreground">
          {reason}
        </p>
        <CardBadges place={place} className="mt-3 empty:hidden" />
      </div>

      <NumberGrid place={place} className="mt-6" />

      <div className="mt-8 flex flex-col gap-2">
        <Button
          variant="primary"
          aria-label={copy.actions.directionsTo(place.name)}
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
  );
}
