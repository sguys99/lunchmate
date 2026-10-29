"use client";
// "그냥 골라줘" 결과 패널 (REC-12, T3.3). just-pick.tsx가 처음 누를 때 React.lazy로 받는다(홈 첫 로드 0).
//
// 모양: 모바일은 아래에 붙는 시트(엄지 쪽), 데스크톱(화면 1024px 이상)은 가운데 카드. 뒤는 overlay 딤, 흐림 없음.
// placement="list"(D1~D3, G3 안건 4 추천안): 데스크톱에서 좌 리스트 칸만 덮고 그 칸 아래(하단 탭 위)에 카드를 띄운다.
//   지도 칸은 덮지 않아 결과 곳의 핀 강조(시안이 onSettle로 옮김)가 그대로 보인다.
// 패널 높이는 처음부터 결과 카드 높이로 고정한다. 결과 카드는 연출 중에도 보이지 않게 깔려 있고(inert),
// 연출 무대(r1 목록, r3 가는 선)는 그 위에 겹쳐 있다가 결과가 나오면 흐려진다. 그래서 결과로 넘어갈 때 패널이 출렁이지 않는다.
// - r1(panel): 세 줄 목록 위로 강조 테두리가 점점 느리게 옮겨 다니다 멈추고, 나머지 두 줄이 흐려진 뒤 결과 카드.
// - r2: 결과 카드의 식당명 자리가 한 줄 창이 되어 이름 띠가 세로로 감속하며 흐르다 멈춘다. 멈춘 이름이 그대로 결과 제목이 된다.
// - r3: 가는 선이 600ms 동안 차오른 뒤 결과 카드.
// 결과 카드 등장: 세리프 한 줄("오늘은 여기로 가요.") → 이름 → 이유 → 숫자 → 버튼이 slow 페이드, 70ms 간격(DESIGN.md 7장 다시 뽑기와 같은 리듬).
// 모든 전환은 CSS(토큰 duration, easing 변수). 축소 모드면 전환 없이 바로 결과(useJustPick이 연출을 건너뛴다).
// 조작: 연출 중에는 어디를 눌러도, Esc, Enter, Space로 건너뛴다(훅의 창 리스너). 결과에서는 Esc, 딤, 닫기 버튼으로 닫는다.
import { RotateCcw, XIcon } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import type { MockPick, MockPlace } from "@/features/design-lab/mock";
import { CategoryIllustration } from "@/features/place/illustrations";
import {
  QUIET,
  RESULT_OFFSET_MS,
  ROLL,
  rollingStrip,
} from "@/features/rec/roulette";
import { useMotionReduced } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { CardBadges, CategoryCaption, NumberGrid } from "./card-bits";
import type { JustPickRun } from "./just-pick";

const copy = designLabHomeCopy.screen;
const jp = copy.justPick;

/** r2 이름 창 한 줄 높이. 결과 제목도 같은 높이라 멈춘 이름과 결과 제목이 같은 자리다 */
const LINE = "2.75rem";

const FOCUSABLE =
  'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])';

export type JustPickPlacement = "center" | "list";

export type JustPickPanelProps = {
  run: JustPickRun;
  picks: MockPick;
  placement?: JustPickPlacement;
  /** 결과 카드 이유 문장. 생략하면 목업 이유 그대로 */
  formatReason?: (place: MockPlace) => string;
  cursor: number | null;
  landed: boolean;
  onSkip: () => void;
  onAgain: () => void;
  onClose: () => void;
};

export default function JustPickPanel({
  run,
  picks,
  placement = "center",
  formatReason,
  cursor,
  landed,
  onSkip,
  onAgain,
  onClose,
}: JustPickPanelProps) {
  const reduced = useMotionReduced();
  const dialog = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const place = picks[run.target] ?? picks[0];
  const rolling = run.phase === "rolling";
  const closing = run.phase === "closing";
  /** 이 패널이 결과 상태로 처음 열렸다(r1 page, 축소 모드): 블록 순차 등장 없이 패널 페이드 하나 */
  const [openedAtResult] = useState(!rolling);

  useEffect(() => {
    dialog.current?.focus({ preventScroll: true });
  }, []);

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
    ).filter((el) => !el.closest("[inert]"));
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
        placement === "center"
          ? "desktop:items-center desktop:p-10"
          : // 좌 리스트 칸(2fr / 5fr = 40%)만 덮는다. 카드는 하단 탭 위
            "desktop:right-[60%] desktop:px-8 desktop:pb-[calc(var(--lm-layout-tab-bar-height)+1.5rem)]",
      )}
    >
      <div
        aria-hidden
        onClick={rolling ? onSkip : onClose}
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
        data-mode={run.mode}
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

        <div className="relative">
          {/* 결과 카드: 처음부터 깔려 있어 패널 높이를 정한다. 연출 중에는 보이지 않고 조작되지 않는다 */}
          <div inert={rolling}>
            <ResultCard
              run={run}
              place={place}
              picks={picks}
              revealed={!rolling}
              instant={openedAtResult || reduced}
              reason={(formatReason ?? defaultReason)(place)}
              onAgain={onAgain}
              onClose={onClose}
            />
          </div>

          {run.mode === "r1" ? (
            <Stage visible={rolling} reduced={reduced}>
              <HighlightList
                picks={picks}
                cursor={cursor}
                landed={landed}
                target={run.target}
              />
            </Stage>
          ) : null}
          {run.mode === "r2" ? (
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0",
                !reduced &&
                  "transition-opacity duration-(--lm-duration-fast) ease-exit",
                !rolling && "opacity-0",
              )}
            >
              <SkipHint />
            </div>
          ) : null}
          {run.mode === "r3" ? (
            <Stage visible={rolling} reduced={reduced}>
              <QuietThinking reduced={reduced} />
            </Stage>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ---------- 결과 카드 ---------- */

/** i번째로 나타나는 블록. revealed가 되면 slow 페이드, i × stagger 지연 */
function Reveal({
  index,
  revealed,
  instant,
  className,
  children,
}: {
  index: number;
  revealed: boolean;
  instant: boolean;
  className?: string;
  children: ReactNode;
}) {
  const style: CSSProperties | undefined =
    revealed && !instant
      ? {
          transitionDelay: `calc(${RESULT_OFFSET_MS}ms + var(--lm-stagger) * ${index})`,
        }
      : undefined;
  return (
    <div
      style={style}
      className={cn(
        !instant &&
          "transition-opacity duration-(--lm-duration-slow) ease-enter",
        revealed ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

const defaultReason = (place: MockPlace) => place.reason;

function ResultCard({
  run,
  place,
  picks,
  revealed,
  instant,
  reason,
  onAgain,
  onClose,
}: {
  run: JustPickRun;
  place: MockPlace;
  picks: MockPick;
  revealed: boolean;
  instant: boolean;
  reason: string;
  onAgain: () => void;
  onClose: () => void;
}) {
  const r2 = run.mode === "r2";
  return (
    <article aria-label={place.name} className="flex flex-col">
      <div className="flex min-h-11 items-start justify-between gap-3">
        <div className="relative min-w-0 flex-1 pt-2">
          {/* r2 연출 중에는 같은 자리에 "고르고 있습니다"가 있다가 세리프 한 줄로 바뀐다 */}
          {r2 ? (
            <p
              aria-hidden
              className={cn(
                "absolute inset-x-0 top-2 type-caption text-muted-foreground transition-opacity duration-(--lm-duration-fast) ease-exit motion-reduce:transition-none",
                revealed && "opacity-0",
              )}
            >
              {jp.picking}
            </p>
          ) : null}
          <Reveal index={0} revealed={revealed} instant={instant}>
            <p className="type-heading text-muted-foreground">{jp.settled}</p>
          </Reveal>
        </div>
        <Reveal
          index={3}
          revealed={revealed}
          instant={instant}
          className="-mt-2 -mr-3 shrink-0"
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label={jp.close}
            onClick={onClose}
            className="text-muted-foreground"
          >
            <XIcon aria-hidden strokeWidth={1.5} />
          </Button>
        </Reveal>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Reveal index={1} revealed={revealed} instant={instant}>
            <CategoryCaption place={place} />
          </Reveal>
          {r2 ? (
            <NameRoll
              picks={picks}
              target={run.target}
              start={run.start}
              rolling={!revealed}
            />
          ) : (
            <Reveal index={1} revealed={revealed} instant={instant}>
              <h3
                className="flex items-center truncate type-title"
                style={{ height: LINE }}
              >
                {place.name}
              </h3>
            </Reveal>
          )}
        </div>
        <Reveal
          index={1}
          revealed={revealed}
          instant={instant}
          className="-mr-2 shrink-0"
        >
          <CategoryIllustration slug={place.category} size={72} />
        </Reveal>
      </div>

      <Reveal index={2} revealed={revealed} instant={instant} className="mt-2">
        <p className="line-clamp-2 type-body-sm text-pretty text-muted-foreground">
          {reason}
        </p>
        <CardBadges place={place} className="mt-3 empty:hidden" />
      </Reveal>

      <Reveal index={3} revealed={revealed} instant={instant} className="mt-6">
        <NumberGrid place={place} size="md" />
      </Reveal>

      <Reveal
        index={3}
        revealed={revealed}
        instant={instant}
        className="mt-8 flex flex-col gap-2"
      >
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
      </Reveal>
    </article>
  );
}

/* ---------- r2 이름 롤링 ---------- */

function NameRoll({
  picks,
  target,
  start,
  rolling,
}: {
  picks: MockPick;
  target: number;
  start: number;
  rolling: boolean;
}) {
  const [{ order, stopAt }] = useState(() =>
    rollingStrip(picks.length, target, start),
  );
  const [moving, setMoving] = useState(false);

  // 첫 프레임은 시작 이름에 두고, 다음 프레임에 목표로 옮겨 CSS 전환 하나로 감속시킨다
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setMoving(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  // 건너뛰면 띠를 전환 없이 끝으로 보낸다
  const settled = !rolling;
  const at = moving || settled ? stopAt : 0;
  return (
    <div
      className={cn(
        "relative overflow-hidden border-y transition-colors duration-(--lm-duration-base) ease-standard",
        rolling ? "border-border" : "border-transparent",
      )}
      style={{ height: LINE }}
    >
      {settled ? (
        <h3
          className="flex items-center truncate type-title"
          style={{ height: LINE }}
        >
          {picks[target]?.name}
        </h3>
      ) : (
        <ul
          aria-hidden
          className="will-change-transform"
          style={{
            transform: `translateY(calc(${LINE} * ${-at}))`,
            transition: moving
              ? `transform ${ROLL.durationMs}ms ${ROLL.easing}`
              : "none",
          }}
        >
          {order.map((idx, k) => (
            <li
              key={k}
              className="flex items-center truncate type-title"
              style={{ height: LINE }}
            >
              {picks[idx]?.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- 연출 무대 (r1 목록, r3 가는 선) ---------- */

function Stage({
  visible,
  reduced,
  children,
}: {
  visible: boolean;
  reduced: boolean;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute inset-0 flex flex-col justify-center",
        !reduced &&
          "transition-opacity duration-(--lm-duration-fast) ease-exit",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <p className="type-caption text-muted-foreground">{jp.picking}</p>
      {children}
      <SkipHint />
    </div>
  );
}

/** 연출 중 아래쪽 안내(버튼 자리). 패널 어디를 눌러도 건너뛴다 */
function SkipHint() {
  return (
    <p className="absolute inset-x-0 bottom-3 text-center type-caption text-muted-foreground">
      {jp.skipHint}
    </p>
  );
}

function HighlightList({
  picks,
  cursor,
  landed,
  target,
}: {
  picks: MockPick;
  cursor: number | null;
  landed: boolean;
  target: number;
}) {
  return (
    <ul className="mt-4 flex flex-col gap-2">
      {picks.map((p, i) => {
        const on = cursor === i;
        return (
          <li
            key={p.id}
            className={cn(
              "flex min-h-16 items-center gap-4 rounded-card border px-4 transition-[border-color,background-color,opacity] duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
              on ? "border-primary bg-card" : "border-transparent",
              landed && i !== target && "opacity-30",
            )}
          >
            <CategoryIllustration slug={p.category} size={40} />
            <span className="min-w-0 flex-1 truncate type-heading">
              {p.name}
            </span>
            <span className="type-caption text-muted-foreground tabular-nums">
              {copy.numbers.walk} {p.walkMinutes}
              {copy.numbers.walkUnit}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** 축소 모드면 선이 차오르지 않는다(무대가 보이지 않아도 전환을 돌리지 않게, T3.5) */
function QuietThinking({ reduced }: { reduced: boolean }) {
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setFilled(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);
  return (
    <div className="mt-5 h-px w-full overflow-hidden bg-border">
      <div
        className="h-full origin-left bg-primary"
        style={{
          transform: `scaleX(${filled ? 1 : 0})`,
          transition: reduced
            ? "none"
            : `transform ${QUIET.thinkMs}ms var(--lm-ease-standard)`,
        }}
      />
    </div>
  );
}
