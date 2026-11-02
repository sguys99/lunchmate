"use client";
// 베타 의견 보내기 시안 공용 조각 (T9.4). 세 안이 같은 입력 모델(종류, 내용, 화면 첨부)과 같은 상태 문구를 쓰고 배치만 다르다.
// - 시트는 Base UI Drawer(components/ui/drawer). 모바일은 아래 시트, 데스크톱(1024 이상)은 가운데 대화상자(후기 시트와 같은 문법).
//   디자인 랩에서는 포털을 시안 범위 요소(useDesignPortalContainer)로 보낸다.
// - "지금 보던 화면"은 sanitizeRoute로 경로 틀만 남긴다(초대 코드, 장소 번호, 쿼리 제거). 좌표는 애초에 모으지 않는다.
// - 보내기는 목업: 0.7초 뒤 성공(ready), 실패(error fail=send), 한도(error fail=limit).
import { Check, Settings, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MapPane, ShellSplit } from "@/components/app-shell/app-shell";
import { TabBarView } from "@/components/app-shell/tab-bar";
import { LoadingRegion, SkeletonLine } from "@/components/states";
import { buttonClass } from "@/components/ui/button-classes";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip, ChipGroup } from "@/components/ui/chip";
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerHandle,
  DrawerViewport,
} from "@/components/ui/drawer";
import { focusRing } from "@/components/ui/interaction";
import {
  BETA_FEEDBACK_MAX,
  betaFeedbackLabCopy,
} from "@/copy/design-lab-beta-feedback";
import { useDesignPortalContainer } from "@/features/design-lab/system/design-scope";
import { cn } from "@/lib/utils";
import { BETA_CATEGORIES, type BetaCategory, type BetaFeedbackParams } from "./params";
import { sanitizeRoute } from "@/features/beta-feedback/route-path";

const copy = betaFeedbackLabCopy;

/** 목업 앱 버전(실제는 package.json version을 빌드 때 넣는다) */
export const MOCK_APP_VERSION = "0.1.0";

const MOCK_TEXT =
  "투표방에서 후보를 하나 더 넣었더니 득표 바가 잠깐 비어 보였다가 다시 채워졌습니다. 새로 고침하면 괜찮습니다.";

export type SendStatus = "idle" | "sending" | "sent" | "error" | "limit";

export function useFeedbackDraft(p: BetaFeedbackParams, opts?: { defaultCategory?: BetaCategory | null }) {
  const [category, setCategory] = useState<BetaCategory | null>(
    p.state === "empty" ? null : (opts?.defaultCategory ?? p.cat),
  );
  const [text, setText] = useState(p.state === "empty" ? "" : MOCK_TEXT);
  const [attach, setAttach] = useState(true);
  const [status, setStatus] = useState<SendStatus>(
    p.flow === "sent"
      ? "sent"
      : p.state === "error"
        ? p.fail === "limit"
          ? "limit"
          : "error"
        : "idle",
  );
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const offline = p.state === "offline";
  const length = [...text].length;
  const trimmed = text.trim().length;
  const canSend =
    trimmed > 0 && length <= BETA_FEEDBACK_MAX && !offline && status !== "sending" && status !== "limit";

  function send() {
    if (!canSend) return;
    setStatus("sending");
    timer.current = window.setTimeout(() => {
      setStatus(p.state === "error" ? (p.fail === "limit" ? "limit" : "error") : "sent");
    }, 700);
  }

  function reset() {
    setText("");
    setCategory(null);
    setStatus("idle");
  }

  return {
    category,
    setCategory,
    text,
    setText,
    attach,
    setAttach,
    status,
    send,
    reset,
    canSend,
    offline,
    length,
    route: sanitizeRoute(p.from),
  };
}
export type FeedbackDraft = ReturnType<typeof useFeedbackDraft>;

/* ---------- 입력 ---------- */

export function CategoryChips({ draft, className }: { draft: FeedbackDraft; className?: string }) {
  const labelId = useId();
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p id={labelId} className="flex items-baseline justify-between gap-3">
        <span className="type-label">{copy.sheet.categoryQuestion}</span>
        <span className="type-caption text-muted-foreground">{copy.sheet.categoryOptional}</span>
      </p>
      <ChipGroup
        aria-labelledby={labelId}
        value={draft.category ? [draft.category] : []}
        onValueChange={(v: unknown[]) => {
          const next = v[0];
          draft.setCategory(
            (BETA_CATEGORIES as readonly unknown[]).includes(next) ? (next as BetaCategory) : null,
          );
        }}
      >
        {BETA_CATEGORIES.map((c) => (
          <Chip key={c} value={c}>
            {copy.categories[c]}
          </Chip>
        ))}
      </ChipGroup>
    </div>
  );
}

export function FeedbackText({
  draft,
  label = copy.sheet.textLabel,
  labelHidden = false,
  placeholder = copy.sheet.textPlaceholder,
  rows = 4,
  autoFocus,
}: {
  draft: FeedbackDraft;
  label?: string;
  labelHidden?: boolean;
  placeholder?: string;
  rows?: number;
  autoFocus?: boolean;
}) {
  const id = useId();
  const countId = `${id}-count`;
  const over = draft.length > BETA_FEEDBACK_MAX;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={labelHidden ? "sr-only" : "type-label"}>
        {label}
      </label>
      <div className="relative">
        <textarea
          id={id}
          rows={rows}
          autoFocus={autoFocus}
          aria-describedby={countId}
          aria-invalid={over || undefined}
          placeholder={placeholder}
          value={draft.text}
          onChange={(e) => draft.setText(e.target.value)}
          className={cn(
            "block w-full resize-none rounded-input border border-input bg-card px-4 pt-3 pb-8 type-body text-foreground outline-none placeholder:text-muted-foreground",
            "transition-[border-color] duration-(--lm-duration-fast) ease-standard focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid motion-reduce:transition-none",
            over && "border-destructive",
          )}
        />
        <span
          id={countId}
          className={cn(
            "pointer-events-none absolute right-4 bottom-2 type-caption tabular-nums",
            over ? "text-destructive" : "text-muted-foreground",
          )}
        >
          <span aria-hidden>{copy.sheet.count(draft.length, BETA_FEEDBACK_MAX)}</span>
          <span className="sr-only">{copy.sheet.countLabel(draft.length, BETA_FEEDBACK_MAX)}</span>
        </span>
      </div>
      {over ? (
        <p className="type-caption text-destructive">{copy.sheet.tooLong(BETA_FEEDBACK_MAX)}</p>
      ) : null}
    </div>
  );
}

/** "지금 보던 화면 함께 보내기" + 무엇이 가는지 그대로 보여 주는 줄 */
export function AttachRow({ draft, className }: { draft: FeedbackDraft; className?: string }) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <Checkbox
        id={id}
        checked={draft.attach}
        onCheckedChange={(v) => draft.setAttach(v === true)}
        aria-describedby={`${id}-detail`}
        className="mt-0.5"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor={id} className="type-body-sm">
          {copy.sheet.attach}
        </label>
        <p id={`${id}-detail`} className="type-caption break-keep text-muted-foreground">
          {draft.attach ? (
            <>
              <span className="break-all">{copy.sheet.attachDetail(draft.route, MOCK_APP_VERSION)}</span>
              <br />
            </>
          ) : null}
          {copy.sheet.attachPrivacy}
        </p>
      </div>
    </div>
  );
}

/** 보내기 줄: 상태 안내(오류, 한도, 오프라인) + 주 버튼 하나 */
export function SendBar({ draft, className }: { draft: FeedbackDraft; className?: string }) {
  const note =
    draft.offline
      ? copy.states.offline
      : draft.status === "limit"
        ? copy.states.limit
        : draft.status === "error"
          ? copy.states.sendFailed
          : null;
  const needText = draft.text.trim().length === 0;
  const hintId = useId();
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {note ? (
        <p
          role={draft.offline ? "status" : "alert"}
          className={cn(
            "type-caption break-keep",
            draft.offline ? "text-muted-foreground" : "text-destructive",
          )}
        >
          {note}
        </p>
      ) : needText ? (
        <p id={hintId} className="type-caption text-muted-foreground">
          {copy.sheet.needText}
        </p>
      ) : null}
      <button
        type="button"
        onClick={draft.send}
        aria-disabled={!draft.canSend || undefined}
        aria-describedby={needText && !note ? hintId : undefined}
        className={cn(buttonClass("primary"), "w-full")}
      >
        {draft.status === "sending"
          ? copy.sheet.sending
          : draft.status === "error"
            ? copy.states.retry
            : copy.sheet.send}
      </button>
    </div>
  );
}

/** 보낸 뒤: 체크 + 해요체 감사 한 줄 + 설명 + 닫기(보조) */
export function SentView({
  onClose,
  onAgain,
  className,
}: {
  onClose?: () => void;
  onAgain?: () => void;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-start gap-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:[animation-duration:var(--lm-duration-slow)] motion-safe:[animation-timing-function:var(--lm-ease-enter)]",
        className,
      )}
    >
      <span
        aria-hidden
        className="inline-flex size-12 items-center justify-center rounded-full bg-muted text-foreground"
      >
        <Check className="size-6" strokeWidth={1.75} />
      </span>
      <p className="flex flex-col gap-2">
        <span className="type-heading font-heading break-keep">{copy.sent.title}</span>
        <span className="type-body-sm break-keep text-muted-foreground">{copy.sent.body}</span>
      </p>
      <div className="flex w-full flex-col gap-2 pt-2">
        {onClose ? (
          <button type="button" onClick={onClose} className={cn(buttonClass("secondary"), "w-full")}>
            {copy.sent.close}
          </button>
        ) : null}
        {onAgain ? (
          <button type="button" onClick={onAgain} className={cn(buttonClass("ghost"), "w-full")}>
            {copy.sent.again}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function FormSkeleton({ className }: { className?: string }) {
  return (
    <LoadingRegion label={copy.sheet.loading} className={cn("flex flex-col gap-5", className)}>
      <SkeletonLine type="label" className="w-[40%]" />
      <div aria-hidden className="flex gap-2">
        {[16, 20, 16, 14].map((w, i) => (
          <span key={i} className="h-10 rounded-chip bg-skeleton" style={{ width: `${w * 0.25}rem` }} />
        ))}
      </div>
      <span aria-hidden className="h-32 rounded-input bg-skeleton" />
      <SkeletonLine type="body-sm" className="w-[70%]" />
    </LoadingRegion>
  );
}

/* ---------- 시트 틀 ---------- */

export function FeedbackSheet({
  open,
  onOpenChange,
  title,
  headerStart,
  progress,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  headerStart?: ReactNode;
  /** B안 단계 막대 (0~1) */
  progress?: number;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const container = useDesignPortalContainer();
  if (!container) return null;
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal container={container}>
        <DrawerBackdrop className="z-[60]" />
        <DrawerViewport className="z-[70] min-[64rem]:items-center min-[64rem]:p-8">
          <DrawerPopup
            className={cn(
              "max-h-[92dvh] border-t border-border data-ending-style:duration-(--lm-duration-fast) data-ending-style:ease-exit",
              "min-[64rem]:max-h-[85dvh] min-[64rem]:max-w-md min-[64rem]:rounded-card min-[64rem]:border min-[64rem]:shadow-none",
              "min-[64rem]:transition-[transform,opacity] min-[64rem]:data-ending-style:[transform:translateY(0.5rem)] min-[64rem]:data-ending-style:opacity-0 min-[64rem]:data-starting-style:[transform:translateY(0.5rem)] min-[64rem]:data-starting-style:opacity-0",
            )}
          >
            <DrawerHandle className="mt-3 mb-0 h-1 w-9 min-[64rem]:hidden" />
            <div className="flex shrink-0 items-center gap-2 px-7 pt-3 pb-2 max-[23.75rem]:px-5 min-[64rem]:pt-6">
              {headerStart}
              <DrawerTitle className="min-w-0 flex-1 type-heading break-keep outline-none">
                {title}
              </DrawerTitle>
              <DrawerClose
                aria-label={copy.sheet.close}
                className={cn(
                  "-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted active:text-foreground",
                  focusRing,
                )}
              >
                <X aria-hidden className="size-5" strokeWidth={1.5} />
              </DrawerClose>
            </div>
            {progress !== undefined ? (
              <div aria-hidden className="mx-7 h-0.5 overflow-hidden rounded-full bg-border max-[23.75rem]:mx-5">
                <span
                  className="block h-full origin-left bg-primary transition-transform duration-(--lm-duration-base) ease-standard motion-reduce:transition-none"
                  style={{ transform: `scaleX(${progress})` }}
                />
              </div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-7 pt-4 pb-6 max-[23.75rem]:px-5">
              {children}
            </div>
            {footer ? (
              <div className="shrink-0 border-t border-border bg-popover px-7 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] max-[23.75rem]:px-5 min-[64rem]:pb-5">
                {footer}
              </div>
            ) : null}
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  );
}

/* ---------- 나 탭 목업 ---------- */

/** 나 탭 첫 화면 목업. entry는 진입 자리(A: 머리 아래 줄, B: 머리 버튼, C: 안내 줄) */
export function MeTabMock({
  headerExtra,
  entry,
  children,
}: {
  headerExtra?: ReactNode;
  entry?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <ShellSplit
      list={
        <main className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-10 pb-6 desktop:max-w-(--lm-layout-desktop-list-max-width) desktop:px-10 desktop:pt-14">
          <header className="flex items-end justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-2">
              <p className="truncate type-caption text-muted-foreground">{copy.me.greeting}</p>
              <h1 className="type-title break-keep text-foreground">{copy.me.title}</h1>
            </div>
            <div className="flex items-center gap-1">
              {headerExtra}
              <span
                aria-label={copy.me.settings}
                role="img"
                className="-mr-2.5 inline-flex size-11 items-center justify-center text-foreground"
              >
                <Settings aria-hidden className="size-[1.375rem]" strokeWidth={1.5} />
              </span>
            </div>
          </header>
          {entry}
          <div
            role="tablist"
            aria-label={copy.me.tabsLabel}
            className="relative mt-6 grid grid-cols-3 border-b border-border"
          >
            {copy.me.tabs.map((t, i) => (
              <span
                key={t}
                role="tab"
                aria-selected={i === 0}
                className={cn(
                  "flex h-12 items-center justify-center type-label",
                  i === 0 ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {t}
              </span>
            ))}
            <span aria-hidden className="absolute bottom-[-1px] left-0 h-px w-1/3 bg-foreground" />
          </div>
          <ul className="flex flex-col divide-y divide-border pt-2">
            {copy.me.rows.map((r) => (
              <li key={r.name} className="flex min-h-16 flex-col justify-center gap-0.5 py-3">
                <span className="type-body">{r.name}</span>
                <span className="type-caption text-muted-foreground">{r.meta}</span>
              </li>
            ))}
          </ul>
          {children}
        </main>
      }
      map={<MapPane />}
      tabBar={<TabBarView activeId="me" preview />}
    />
  );
}

export { copy as feedbackCopy };
