"use client";
// 관리자 화면 (T8.5, MOD-06). D-19: 시안 C "한 건씩 검토" + B 조각(같은 작성자 일괄 숨김) + A 조각(단축키 안내 묶음, 처리 이력 목록).
// - 데이터: 네 구역을 서버 액션 한 번으로 받아 TanStack Query 세션 메모리에만 둔다. 처리 뒤 다시 받는다.
// - 처리: 단건 숨김, 복구는 바로 반영 + 토스트 되돌리기(8초) + 처리 이력에서 되돌리기. 정지, 해제, 같은 작성자 일괄, 폐업 확인만 확인 상자(안건 8).
// - 카드가 바뀌면 새 카드 제목으로 초점을 옮기고 role="status"로 알린다(6절 품질 메모). 축소 모션이면 카드가 바로 바뀐다.
// - 390: 사유 단계는 글 바로 아래에 펼쳐 라디오가 첫 화면에 보이고, 결정 줄은 화면 아래 고정이다.
// - Motion은 쓰지 않는다(CSS 전환만). 토스트는 lazy-toaster.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  EmptyState,
  ErrorState,
  LoadingRegion,
  SkeletonLine,
} from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/lazy-toaster";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminCopy as copy, type AdminReportReason } from "@/copy/admin";
import { commonCopy } from "@/copy/common";
import { motionTokens } from "@/lib/motion/tokens.generated";
import { useOnlineStatus } from "@/lib/network/use-online-status";
import { cn } from "@/lib/utils";
import {
  clearUserAction,
  decideClosureAction,
  decideItemAction,
  loadAdminSnapshotAction,
  loadBetaFeedbackAction,
  searchUsersAction,
  setSuspensionAction,
  undoAction,
} from "./actions";
import {
  ADMIN_SECTIONS,
  BETA_FEEDBACK_CATEGORIES,
  BETA_FEEDBACK_PAGE,
  filterBetaFeedback,
  formatKstDate,
  formatKstDateTime,
  hiddenKeyOfLog,
  isExcluded,
  orderWithSkipped,
  sameAuthorOthers,
  sectionCounts,
  sortQueue,
  todaysEntries,
  topReason,
  type AdminErrorCode,
  type AdminSection,
  type AdminSnapshot,
  type AdminUser,
  type BetaFeedbackFilter,
  type BetaFeedbackItem,
  type ClosureItem,
  type LogEntry,
  type ReportedItem,
} from "./model";
import {
  AuthorSummary,
  ConfirmDialog,
  DecisionRow,
  HideReasonFieldset,
  ItemStatus,
  Kbd,
  LogLine,
  OfflineBanner,
  PlaceLine,
  Progress,
  ReasonTally,
  ReviewBody,
  ShortcutPanel,
  SuspendDialog,
  nicknameOf,
  useKeys,
  useShortcutsOff,
  type SuspendTarget,
} from "./parts";

const QUERY_KEY = ["admin", "snapshot"] as const;
/** 처리한 카드가 빠지는 시간. --lm-duration-base 토큰에서 읽는다(T8.7) */
const LEAVE_MS = motionTokens.duration.base;

const cardEnter =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-2 motion-safe:[animation-duration:var(--lm-duration-base)] motion-safe:[animation-timing-function:var(--lm-ease-enter)]";
const cardLeave =
  "transition-[opacity,translate] duration-(--lm-duration-base) ease-exit motion-reduce:transition-none";
const cardBox =
  "flex flex-col gap-7 rounded-card border border-border bg-card p-6 desktop:p-10";

class AdminLoadError extends Error {
  constructor(readonly code: AdminErrorCode) {
    super(code);
  }
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

type Outcome =
  { ok: true; actionIds: string[] } | { ok: false; error: AdminErrorCode };

/* ---------- 화면 상태와 처리 ---------- */

function useAdminConsole() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<AdminSnapshot> => {
      const r = await loadAdminSnapshotAction();
      if (!r.ok) throw new AdminLoadError(r.error);
      return r.snapshot;
    },
    staleTime: 30_000,
    retry: 1,
  });
  // 이 화면에서 처리해 응답 전에 먼저 뺀 항목(다시 받으면 서버 목록에서도 빠진다)
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [leaving, setLeaving] = useState<string | null>(null);
  const [done, setDone] = useState({ reviews: 0, closures: 0 });
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);

  const refresh = () => client.invalidateQueries({ queryKey: QUERY_KEY });

  const hide = (keys: readonly string[]) =>
    setHidden((prev) => new Set([...prev, ...keys]));
  const unhide = (keys: readonly string[]) =>
    setHidden((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => next.delete(k));
      return next;
    });

  /** 카드를 빠지는 모양으로 바꾼 뒤 빼고, 서버 처리가 실패하면 되돌린다 */
  const leaveAndRun = (
    leadKey: string,
    keys: readonly string[],
    run: () => Promise<Outcome>,
    onDone: (ids: string[]) => void,
  ) => {
    const reduce = prefersReducedMotion();
    if (reduce) hide(keys);
    else {
      setLeaving(leadKey);
      timers.current.push(
        window.setTimeout(() => {
          hide(keys);
          setLeaving(null);
        }, LEAVE_MS),
      );
    }
    void run().then((r) => {
      if (!r.ok) {
        unhide(keys);
        setLeaving(null);
        void toast.error(copy.errors[r.error]);
      } else {
        onDone(r.actionIds);
      }
      void refresh();
    });
  };

  const undo = (
    actionIds: readonly string[],
    restoreKeys: readonly string[],
  ) => {
    void undoAction({ actionIds: [...actionIds] }).then((r) => {
      if (r.ok) {
        unhide(restoreKeys);
        void toast(copy.done.undone);
      } else {
        void toast.error(copy.errors[r.error]);
      }
      void refresh();
    });
  };

  const showDone = (
    message: string,
    actionIds: readonly string[],
    restoreKeys: readonly string[],
  ) => {
    void toast(message, {
      description: copy.done.undoHint,
      duration: 8000,
      action: {
        label: copy.actions.undo,
        onClick: () => undo(actionIds, restoreKeys),
      },
    });
  };

  const decideItem = (
    item: ReportedItem,
    result: "hide" | "restore",
    reason: AdminReportReason | null,
    others: readonly ReportedItem[] = [],
  ) => {
    const keys = [item.key, ...others.map((o) => o.key)];
    leaveAndRun(
      item.key,
      keys,
      () =>
        decideItemAction({
          targetType: item.targetType,
          targetId: item.targetId,
          result,
          reason: result === "hide" ? reason : null,
          includeAuthor: others.length > 0,
        }),
      (ids) => {
        setDone((d) => ({ ...d, reviews: d.reviews + ids.length }));
        showDone(
          result === "hide"
            ? ids.length > 1
              ? copy.done.hiddenMany(ids.length)
              : copy.done.hidden
            : item.autoHidden
              ? copy.done.restored
              : copy.done.kept,
          ids,
          keys,
        );
      },
    );
  };

  const decideClosure = (c: ClosureItem, result: "confirm" | "dismiss") => {
    const key = `place:${c.placeId}`;
    leaveAndRun(
      key,
      [key],
      () => decideClosureAction({ placeId: c.placeId, result }),
      (ids) => {
        setDone((d) => ({ ...d, closures: d.closures + 1 }));
        showDone(
          result === "confirm"
            ? copy.done.closedConfirmed
            : copy.done.closedDismissed,
          ids,
          [key],
        );
      },
    );
  };

  const setSuspension = (
    user: SuspendTarget,
    next: "suspended" | "active",
    duration: "d7" | "d30" | "indefinite",
    reason: "repeated" | "spam" | "abuse" | "privacy" | "other",
  ) => {
    const nick = nicknameOf(user.nickname);
    void setSuspensionAction(
      next === "suspended"
        ? { userId: user.id, status: "suspended", duration, reason }
        : { userId: user.id, status: "active" },
    ).then((r) => {
      if (r.ok) {
        showDone(
          next === "suspended"
            ? copy.done.suspended(nick)
            : copy.done.unsuspended(nick),
          r.actionIds,
          [],
        );
      } else {
        void toast.error(copy.errors[r.error]);
      }
      void refresh();
    });
  };

  const clearUser = (user: AdminUser) => {
    const key = `user:${user.id}`;
    leaveAndRun(
      key,
      [key],
      () => clearUserAction({ userId: user.id }),
      (ids) =>
        showDone(copy.done.cleared(nicknameOf(user.nickname)), ids, [key]),
    );
  };

  return {
    query,
    hidden,
    leaving,
    done,
    refresh,
    decideItem,
    decideClosure,
    setSuspension,
    clearUser,
    undo: (id: string) => {
      const entry = query.data?.log.find((e) => e.id === id);
      const key = entry ? hiddenKeyOfLog(entry) : null;
      undo([id], key ? [key] : []);
    },
  };
}

type Console = ReturnType<typeof useAdminConsole>;

/* ---------- 화면 ---------- */

export function AdminConsole({ adminNickname }: { adminNickname: string }) {
  const c = useAdminConsole();
  const online = useOnlineStatus();
  const [section, setSection] = useState<AdminSection>("reviews");
  const [keysOff, setKeysOff] = useShortcutsOff();
  const data = c.query.data;
  const counts = sectionCounts(data);
  const disabled = !online;
  const now = new Date();
  const today = data ? todaysEntries(data.log, now) : [];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 desktop:flex-row desktop:items-center desktop:justify-between desktop:px-10">
          <div className="flex items-baseline justify-between gap-3 desktop:flex-col desktop:gap-0.5">
            <p className="type-heading">{copy.frame.brand}</p>
            <p className="type-caption text-muted-foreground">
              {copy.frame.signedInAs(adminNickname)}
            </p>
          </div>
          <Tabs
            value={section}
            onValueChange={(v) => setSection(v as AdminSection)}
            className="gap-0"
          >
            <TabsList
              variant="segment"
              aria-label={copy.frame.navLabel}
              className="max-w-full overflow-x-auto"
            >
              {ADMIN_SECTIONS.map((s) => {
                const n = counts[s];
                return (
                  <TabsTrigger key={s} value={s} className="px-3 desktop:px-4">
                    {copy.sections[s]}
                    {n ? (
                      <span className="type-caption text-muted-foreground tabular-nums">
                        {n}
                      </span>
                    ) : null}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      </header>
      {!online ? <OfflineBanner /> : null}
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 pt-8 pb-16 desktop:grid-cols-[1fr_20rem] desktop:gap-14 desktop:px-10 desktop:pt-12">
        <main className="flex min-w-0 flex-col">
          {section === "beta" ? (
            <BetaFeedbackSection />
          ) : c.query.isPending ? (
            <CardSkeleton />
          ) : !data ? (
            <>
              {/* 구역 제목은 목록 안에 있어 오류 화면에서는 화면 낭독기용 제목만 둔다 */}
              <h1 className="sr-only">{copy.sections[section]}</h1>
              <ErrorState
                title={copy.states.errorTitle}
                body={copy.states.errorBody}
                action={{ onClick: () => void c.query.refetch() }}
              />
            </>
          ) : section === "reviews" ? (
            <ReviewQueue
              c={c}
              data={data}
              disabled={disabled}
              keysEnabled={!keysOff}
              today={today}
            />
          ) : section === "closures" ? (
            <ClosureQueue c={c} data={data} disabled={disabled} />
          ) : section === "users" ? (
            <UserQueue c={c} data={data} disabled={disabled} />
          ) : (
            <section className="flex flex-col gap-4">
              <h1 className="type-title">{copy.log.title}</h1>
              <LogList entries={data.log} onUndo={c.undo} disabled={disabled} />
              <p className="type-caption text-muted-foreground">
                {copy.log.retention}
              </p>
            </section>
          )}
        </main>
        {section !== "log" && section !== "beta" && data ? (
          <aside aria-label={copy.log.today} className="min-w-0">
            <details className="group desktop:hidden">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between border-t border-border pt-3 type-label">
                {copy.log.todayCount(today.length)}
                <span className="type-caption text-muted-foreground group-open:hidden">
                  {copy.actions.expand}
                </span>
              </summary>
              <div className="pt-3">
                <Timeline entries={today} onUndo={c.undo} disabled={disabled} />
              </div>
            </details>
            <div className="hidden flex-col gap-6 desktop:sticky desktop:top-8 desktop:flex">
              <div className="flex flex-col gap-4">
                <h2 className="type-caption text-muted-foreground">
                  {copy.log.todayCount(today.length)}
                </h2>
                <Timeline entries={today} onUndo={c.undo} disabled={disabled} />
              </div>
              {section === "reviews" ? (
                <ShortcutPanel off={keysOff} onOffChange={setKeysOff} />
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function AllDone() {
  return (
    <EmptyState
      title={copy.queue.allDoneTitle}
      body={copy.queue.allDoneBody}
      className="py-10"
    />
  );
}

/** 카드가 바뀔 때 초점 이동과 알림. 처리로 바뀐 경우만(첫 화면에서는 초점을 빼앗지 않는다) */
function useCardFocus(currentKey: string | null, left: number) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const prevKey = useRef(currentKey);
  const [announce, setAnnounce] = useState("");
  useEffect(() => {
    if (prevKey.current === currentKey) return;
    prevKey.current = currentKey;
    if (!moved.current) return;
    moved.current = false;
    setAnnounce(currentKey ? copy.announce.next(left) : copy.announce.allDone);
    headingRef.current?.focus({ preventScroll: false });
  }, [currentKey, left]);
  return {
    headingRef,
    announce,
    markMoved: () => {
      moved.current = true;
    },
  };
}

/* ---------- 신고된 후기 큐 ---------- */

function ReviewQueue({
  c,
  data,
  disabled,
  keysEnabled,
  today,
}: {
  c: Console;
  data: AdminSnapshot;
  disabled: boolean;
  keysEnabled: boolean;
  today: LogEntry[];
}) {
  const [skipped, setSkipped] = useState<string[]>([]);
  const [reasonStep, setReasonStep] = useState(false);
  const [reason, setReason] = useState<AdminReportReason | null>(null);
  const [withAuthor, setWithAuthor] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const reasonRef = useRef<HTMLDivElement>(null);
  const radioRef = useRef<HTMLInputElement>(null);

  const visible = sortQueue(data.items.filter((i) => !c.hidden.has(i.key)));
  const queue = orderWithSkipped(visible, skipped);
  const current = queue[0] ?? null;
  const { headingRef, announce, markMoved } = useCardFocus(
    current?.key ?? null,
    queue.length,
  );
  const chosen = reason ?? (current ? topReason(current) : "other");
  const othersList = current
    ? visible.filter(
        (i) => i.author.id === current.author.id && i.key !== current.key,
      )
    : [];
  const others = current ? sameAuthorOthers(visible, current) : 0;
  const leaving = current !== null && c.leaving === current.key;
  const total = c.done.reviews + queue.length;

  const reset = () => {
    setReasonStep(false);
    setReason(null);
    setWithAuthor(false);
  };

  // 사유 단계를 열면 라디오 묶음이 보이게 하고 고른 라디오로 초점(390 첫 화면, 6절 품질 메모)
  useEffect(() => {
    if (!reasonStep) return;
    reasonRef.current?.scrollIntoView({
      block: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    radioRef.current?.focus({ preventScroll: true });
  }, [reasonStep]);

  const decide = (result: "hide" | "restore", includeAuthor = false) => {
    if (!current || disabled || leaving) return;
    markMoved();
    c.decideItem(
      current,
      result,
      result === "hide" ? chosen : null,
      includeAuthor ? othersList : [],
    );
    reset();
  };
  const hideNow = () => {
    if (withAuthor && others > 0) setBulkOpen(true);
    else decide("hide");
  };
  const skip = () => {
    if (!current || queue.length < 2) return;
    markMoved();
    setSkipped((prev) => [
      ...prev.filter((k) => k !== current.key),
      current.key,
    ]);
    reset();
  };
  const undoLast = () => {
    const last = today.find((e) => e.undoable && !e.reverted);
    if (last) c.undo(last.id);
  };

  useKeys(
    {
      h: () => (reasonStep ? hideNow() : setReasonStep(true)),
      r: () => decide("restore"),
      j: skip,
      escape: reset,
      z: undoLast,
    },
    keysEnabled && !disabled && !bulkOpen && !suspendOpen,
  );

  const live = (
    <p role="status" className="sr-only">
      {announce}
    </p>
  );

  if (!current) {
    return (
      <div className="flex flex-col gap-8">
        {live}
        <Progress
          done={c.done.reviews}
          total={total}
          label={copy.sections.reviews}
        />
        <AllDone />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {live}
      <Progress
        done={c.done.reviews}
        total={total}
        label={copy.sections.reviews}
      />
      <article
        key={current.key}
        aria-labelledby={`card-${current.key}`}
        className={cn(
          cardBox,
          cardEnter,
          cardLeave,
          leaving && "-translate-x-2 opacity-0",
        )}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="neutral">{copy.target[current.targetType]}</Badge>
          <ItemStatus autoHidden={current.autoHidden} />
          <span className="ml-auto type-caption text-muted-foreground tabular-nums">
            {copy.queue.remaining(queue.length)}
          </span>
        </div>
        <div className="flex flex-col gap-4">
          <h2
            id={`card-${current.key}`}
            ref={headingRef}
            tabIndex={-1}
            className="sr-only"
          >
            {copy.queue.position(1, queue.length)}
          </h2>
          <ReviewBody
            body={current.body}
            privateNow={current.privateNow}
            size="large"
          />
          <span className="type-caption text-muted-foreground tabular-nums">
            {current.rating ? `${copy.review.rating[current.rating]}, ` : ""}
            {copy.review.writtenAt(formatKstDateTime(current.writtenAt))}
          </span>
        </div>
        <PlaceLine placeId={current.placeId} showHint />

        {reasonStep ? (
          <div
            ref={reasonRef}
            className="flex scroll-mb-28 flex-col gap-4 border-t border-border pt-6 ease-enter motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)] motion-safe:slide-in-from-bottom-1"
          >
            <HideReasonFieldset
              item={current}
              value={chosen}
              onChange={setReason}
              firstRef={radioRef}
            />
            {others > 0 ? (
              <label className="flex min-h-11 cursor-pointer items-center gap-3 px-2">
                <input
                  type="checkbox"
                  checked={withAuthor}
                  onChange={(e) => setWithAuthor(e.target.checked)}
                  className="size-[1.125rem] accent-primary"
                />
                <span className="type-body-sm break-keep">
                  {copy.sameAuthor.label(others)}
                </span>
              </label>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-border pt-6">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="type-caption text-muted-foreground">
              {copy.reportCount(current.reportCount)}
            </h3>
            <span className="type-caption text-muted-foreground tabular-nums">
              {copy.review.firstReported(
                formatKstDateTime(current.firstReportedAt),
              )}
            </span>
          </div>
          <ReasonTally item={current} />
          {current.notes.map((n, i) => (
            <p
              key={i}
              className="type-body-sm [overflow-wrap:anywhere] break-keep"
            >
              <span className="text-muted-foreground">{copy.noteTitle}: </span>
              {n}
            </p>
          ))}
          <p className="type-body-sm break-keep text-muted-foreground">
            {current.autoHidden
              ? copy.status.autoHiddenHelp
              : copy.status.openHelp}
          </p>
        </div>
        <div className="flex flex-col gap-3 border-t border-border pt-6">
          <h3 className="type-caption text-muted-foreground">
            {copy.author.title}
          </h3>
          <AuthorSummary
            author={current.author}
            onSuspend={() => setSuspendOpen(true)}
            disabled={disabled}
          />
        </div>
      </article>

      {reasonStep ? (
        <DecisionRow>
          <Button variant="primary" onClick={hideNow} disabled={disabled}>
            {copy.actions.hideWithReason(copy.reasons[chosen])}
          </Button>
          <Button variant="ghost" onClick={reset}>
            {commonCopy.actions.cancel}
          </Button>
        </DecisionRow>
      ) : (
        <DecisionRow
          hint={
            keysEnabled ? (
              <>
                <Kbd>H</Kbd> {copy.keys.hide} <Kbd>R</Kbd> {copy.keys.keep}{" "}
                <Kbd>J</Kbd> {copy.keys.skip} <Kbd>Z</Kbd> {copy.keys.undo}
              </>
            ) : undefined
          }
        >
          <Button
            variant="primary"
            onClick={() => setReasonStep(true)}
            disabled={disabled}
            className="flex-1 desktop:flex-none"
          >
            {current.autoHidden ? copy.actions.confirmHide : copy.actions.hide}
          </Button>
          <Button
            variant="secondary"
            onClick={() => decide("restore")}
            disabled={disabled}
            className="flex-1 desktop:flex-none"
          >
            {current.autoHidden ? copy.actions.restore : copy.actions.keep}
          </Button>
          <Button
            variant="link"
            onClick={skip}
            disabled={queue.length < 2}
            className="desktop:ml-2"
          >
            {copy.actions.skip}
          </Button>
        </DecisionRow>
      )}

      <ConfirmDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title={copy.sameAuthor.confirmTitle(others + 1)}
        body={copy.sameAuthor.confirmBody}
        action={copy.sameAuthor.confirmAction(others + 1)}
        onConfirm={() => decide("hide", true)}
      />
      <SuspendDialog
        user={current.author}
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        onConfirm={(d, r) => c.setSuspension(current.author, "suspended", d, r)}
      />
    </div>
  );
}

/* ---------- 폐업 제보 큐 ---------- */

function ClosureQueue({
  c,
  data,
  disabled,
}: {
  c: Console;
  data: AdminSnapshot;
  disabled: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [skipped, setSkipped] = useState<string[]>([]);
  const open = data.closures.filter((x) => !c.hidden.has(`place:${x.placeId}`));
  // 건너뛴 장소는 맨 뒤로(후기 큐와 같은 규칙)
  const list = [
    ...open.filter((x) => !skipped.includes(x.placeId)),
    ...open.filter((x) => skipped.includes(x.placeId)),
  ];
  const current = list[0] ?? null;
  const { headingRef, announce, markMoved } = useCardFocus(
    current?.placeId ?? null,
    list.length,
  );
  const total = c.done.closures + list.length;
  const live = (
    <p role="status" className="sr-only">
      {announce}
    </p>
  );
  if (!current) {
    return (
      <div className="flex flex-col gap-8">
        {live}
        <Progress
          done={c.done.closures}
          total={total}
          label={copy.sections.closures}
        />
        <AllDone />
      </div>
    );
  }
  const leaving = c.leaving === `place:${current.placeId}`;
  const excluded = isExcluded(current);
  const cells = [
    [copy.closures.kinds.gone, current.gone],
    [copy.closures.kinds.moved, current.moved],
    [copy.closures.kinds.today, current.today],
  ] as const;
  const decide = (result: "confirm" | "dismiss") => {
    if (disabled || leaving) return;
    markMoved();
    c.decideClosure(current, result);
  };
  return (
    <div className="flex flex-col gap-6">
      {live}
      <Progress
        done={c.done.closures}
        total={total}
        label={copy.sections.closures}
      />
      <article
        key={current.placeId}
        aria-labelledby={`closure-${current.placeId}`}
        className={cn(
          cardBox,
          cardEnter,
          cardLeave,
          leaving && "-translate-x-2 opacity-0",
        )}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={excluded ? "default" : "muted"}>
            {excluded ? copy.status.excluded : copy.status.reported}
          </Badge>
          <span className="ml-auto type-caption text-muted-foreground tabular-nums">
            {copy.closures.lastReported(
              formatKstDateTime(current.lastReportedAt),
            )}
          </span>
        </div>
        <h2
          id={`closure-${current.placeId}`}
          ref={headingRef}
          tabIndex={-1}
          className="sr-only"
        >
          {copy.queue.position(1, list.length)}
        </h2>
        <PlaceLine placeId={current.placeId} size="heading" showHint />
        <dl className="grid grid-cols-3 divide-x divide-border">
          {cells.map(([label, n]) => (
            <div
              key={label}
              className="flex min-w-0 flex-col gap-1.5 px-4 first:pl-0"
            >
              <dt className="type-caption break-keep text-muted-foreground">
                {label}
              </dt>
              <dd className="type-numeric-lg tabular-nums">{n}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-1">
          {current.unspecified > 0 ? (
            <p className="type-body-sm break-keep text-muted-foreground">
              {copy.closures.unspecified(current.unspecified)}
            </p>
          ) : null}
          {current.dismissedAt ? (
            <p className="type-body-sm break-keep text-muted-foreground">
              {copy.closures.dismissedBefore(
                formatKstDate(current.dismissedAt),
              )}
            </p>
          ) : null}
          <p className="type-body-sm break-keep text-muted-foreground">
            {excluded ? copy.closures.excludedHelp : copy.closures.openHelp}{" "}
            {copy.closures.todayNote}
          </p>
        </div>
      </article>
      <DecisionRow>
        <Button
          variant="primary"
          onClick={() => setConfirmOpen(true)}
          disabled={disabled}
          className="flex-1 desktop:flex-none"
        >
          {copy.actions.confirmClosed}
        </Button>
        <Button
          variant="secondary"
          onClick={() => decide("dismiss")}
          disabled={disabled}
          className="flex-1 desktop:flex-none"
        >
          {copy.actions.dismissClosed}
        </Button>
        <Button
          variant="link"
          onClick={() => {
            markMoved();
            setSkipped((p) => [
              ...p.filter((id) => id !== current.placeId),
              current.placeId,
            ]);
          }}
          disabled={list.length < 2}
          className="desktop:ml-2"
        >
          {copy.actions.skip}
        </Button>
      </DecisionRow>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={copy.confirm.closedTitle}
        body={copy.confirm.closedBody}
        action={copy.actions.confirmClosed}
        onConfirm={() => decide("confirm")}
      />
    </div>
  );
}

/* ---------- 사용자 ---------- */

function providerLabel(p: string | null): string {
  return (p && copy.users.provider[p]) || copy.users.providerUnknown;
}

function UserQueue({
  c,
  data,
  disabled,
}: {
  c: Console;
  data: AdminSnapshot;
  disabled: boolean;
}) {
  const [dialogUser, setDialogUser] = useState<SuspendTarget | null>(null);
  const candidates = data.users.filter(
    (u) => u.kind === "candidate" && !c.hidden.has(`user:${u.id}`),
  );
  const suspended = data.users.filter((u) => u.kind === "suspended");
  const current = candidates[0] ?? null;
  const { headingRef, announce, markMoved } = useCardFocus(
    current?.id ?? null,
    candidates.length,
  );
  const leaving = current !== null && c.leaving === `user:${current.id}`;

  return (
    <div className="flex flex-col gap-10">
      <p role="status" className="sr-only">
        {announce}
      </p>
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="type-caption text-muted-foreground">
            {copy.users.candidates}
          </h1>
          <p className="type-body-sm text-muted-foreground">
            {copy.users.candidatesHelp}
          </p>
        </div>
        {current ? (
          <>
            <article
              key={current.id}
              aria-labelledby={`user-${current.id}`}
              className={cn(
                cardBox,
                cardEnter,
                cardLeave,
                leaving && "-translate-x-2 opacity-0",
              )}
            >
              <div className="flex flex-col gap-1">
                <h2
                  id={`user-${current.id}`}
                  ref={headingRef}
                  tabIndex={-1}
                  className="type-title break-all outline-none"
                >
                  {nicknameOf(current.nickname)}
                </h2>
                <p className="type-caption text-muted-foreground">
                  {providerLabel(current.provider)},{" "}
                  {copy.author.joined(formatKstDate(current.joinedAt))}
                </p>
              </div>
              <dl className="grid grid-cols-2 divide-x divide-border">
                <div className="flex flex-col gap-1.5 pr-4">
                  <dt className="type-caption text-muted-foreground">
                    {copy.users.received}
                  </dt>
                  <dd className="type-numeric-lg tabular-nums">
                    {current.reportsReceived}
                  </dd>
                </div>
                <div className="flex flex-col gap-1.5 px-4">
                  <dt className="type-caption text-muted-foreground">
                    {copy.users.hidden}
                  </dt>
                  <dd className="type-numeric-lg tabular-nums">
                    {current.hiddenCount}
                  </dd>
                </div>
              </dl>
              <RecentItems user={current} />
            </article>
            <DecisionRow>
              <Button
                variant="destructive"
                onClick={() => setDialogUser(current)}
                disabled={disabled}
                className="flex-1 desktop:flex-none"
              >
                {copy.actions.suspend}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (disabled || leaving) return;
                  markMoved();
                  c.clearUser(current);
                }}
                disabled={disabled}
                className="flex-1 desktop:flex-none"
              >
                {copy.actions.keep}
              </Button>
            </DecisionRow>
          </>
        ) : (
          <AllDone />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="type-caption text-muted-foreground">
          {copy.users.suspendedList}
        </h2>
        {suspended.length === 0 ? (
          <p className="type-body-sm text-muted-foreground">
            {copy.users.suspendedNone}
          </p>
        ) : (
          <UserList
            users={suspended}
            onPick={setDialogUser}
            disabled={disabled}
          />
        )}
      </section>

      <UserSearch onPick={setDialogUser} disabled={disabled} />

      <SuspendDialog
        user={dialogUser}
        open={dialogUser !== null}
        onOpenChange={(o) => !o && setDialogUser(null)}
        onConfirm={(d, r) =>
          dialogUser &&
          c.setSuspension(
            dialogUser,
            dialogUser.status === "active" ? "suspended" : "active",
            d,
            r,
          )
        }
      />
    </div>
  );
}

function RecentItems({ user }: { user: AdminUser }) {
  if (user.recentItems.length === 0) return null;
  return (
    <ul className="flex flex-col divide-y divide-border border-t border-border">
      {user.recentItems.map((r) => (
        <li key={r.targetId} className="flex flex-col gap-1 py-3">
          <span className="type-caption text-muted-foreground">
            {copy.target[r.targetType]}, {copy.place.idLabel(r.placeId)},{" "}
            {copy.reportCount(r.reportCount)}
            {r.hidden ? `, ${copy.users.hiddenItem}` : ""}
          </span>
          <ReviewBody body={r.body} privateNow={r.privateNow} clamp />
        </li>
      ))}
    </ul>
  );
}

function UserList({
  users,
  onPick,
  disabled,
}: {
  users: readonly AdminUser[];
  onPick: (u: SuspendTarget) => void;
  disabled: boolean;
}) {
  return (
    <ul className="flex flex-col divide-y divide-border border-y border-border">
      {users.map((u) => (
        <li key={u.id} className="flex items-center justify-between gap-4 py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="type-label break-all">
              {nicknameOf(u.nickname)}
              {u.role === "admin" ? (
                <Badge variant="muted" className="ml-2 align-middle">
                  {copy.users.adminBadge}
                </Badge>
              ) : null}
            </span>
            <span className="type-caption text-muted-foreground tabular-nums">
              {u.status === "suspended"
                ? u.suspendedUntil
                  ? copy.users.suspendedUntil(formatKstDate(u.suspendedUntil))
                  : copy.users.suspendedIndefinite
                : `${copy.author.received(u.reportsReceived)}, ${copy.author.hiddenBefore(u.hiddenCount)}`}
            </span>
          </div>
          {u.role === "user" ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPick(u)}
              disabled={disabled}
            >
              {u.status === "suspended"
                ? copy.actions.unsuspend
                : copy.actions.suspend}
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function UserSearch({
  onPick,
  disabled,
}: {
  onPick: (u: SuspendTarget) => void;
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<AdminErrorCode | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || busy) return;
    setBusy(true);
    const r = await searchUsersAction({ query: q });
    setBusy(false);
    if (r.ok) {
      setResult(r.users);
      setError(null);
    } else {
      setResult(null);
      setError(r.error);
    }
  };
  return (
    <section className="flex flex-col gap-3">
      <form onSubmit={submit} role="search" className="flex items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="type-caption text-muted-foreground">
            {copy.users.searchLabel}
          </span>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={copy.users.searchPlaceholder}
            maxLength={20}
            disabled={disabled}
          />
        </label>
        <Button type="submit" variant="secondary" disabled={disabled || busy}>
          {copy.actions.search}
        </Button>
      </form>
      <div role="status" className="flex flex-col gap-3">
        {error ? (
          <p className="type-body-sm text-destructive">{copy.errors[error]}</p>
        ) : result === null ? null : result.length === 0 ? (
          <p className="type-body-sm text-muted-foreground">
            {copy.users.searchEmpty}
          </p>
        ) : (
          <>
            <p className="type-caption text-muted-foreground">
              {copy.users.searchResults(result.length)}
            </p>
            <UserList users={result} onPick={onPick} disabled={disabled} />
          </>
        )}
      </div>
    </section>
  );
}

/* ---------- 처리 이력 ---------- */

function Timeline({
  entries,
  onUndo,
  disabled,
}: {
  entries: readonly LogEntry[];
  onUndo: (id: string) => void;
  disabled: boolean;
}) {
  if (entries.length === 0)
    return (
      <p className="type-body-sm text-muted-foreground">{copy.log.empty}</p>
    );
  return (
    <ol className="relative flex flex-col gap-5 border-l border-border pl-5">
      {entries.map((e) => (
        <li
          key={e.id}
          className="relative ease-enter motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)]"
        >
          <span
            aria-hidden
            className={cn(
              "absolute top-2 -left-[calc(1.5rem+0.5px)] size-2 rounded-full border border-muted-foreground bg-background",
              !e.reverted && "bg-muted-foreground",
            )}
          />
          <LogLine entry={e} onUndo={onUndo} disabled={disabled} compact />
        </li>
      ))}
    </ol>
  );
}

/** A 조각: 처리 이력 구역은 전체 폭 목록, 줄마다 되돌리기 */
function LogList({
  entries,
  onUndo,
  disabled,
}: {
  entries: readonly LogEntry[];
  onUndo: (id: string) => void;
  disabled: boolean;
}) {
  if (entries.length === 0)
    return (
      <p className="type-body-sm text-muted-foreground">{copy.log.empty}</p>
    );
  return (
    <ul className="flex flex-col divide-y divide-border border-y border-border">
      {entries.map((e) => (
        <li key={e.id} className="py-3">
          <LogLine entry={e} onUndo={onUndo} disabled={disabled} />
        </li>
      ))}
    </ul>
  );
}

/* ---------- 베타 의견 (T9.4) ---------- */

const BETA_QUERY_KEY = ["admin", "beta-feedback"] as const;
const BETA_FILTERS: readonly BetaFeedbackFilter[] = [
  "all",
  ...BETA_FEEDBACK_CATEGORIES,
  "none",
];

/**
 * D-19 C 문법의 목록: 최신순, 종류 필터(칩), 읽음 처리 없음(D-23 안건 14). 데이터는 admin_beta_feedback 보안 함수로만,
 * TanStack Query 세션 메모리에만 둔다. 작성자는 익명 번호(참여자 n), 화면은 경로 틀만.
 */
function BetaFeedbackSection() {
  const query = useQuery({
    queryKey: BETA_QUERY_KEY,
    queryFn: async (): Promise<BetaFeedbackItem[]> => {
      const r = await loadBetaFeedbackAction();
      if (!r.ok) throw new AdminLoadError(r.error);
      return r.items;
    },
    staleTime: 30_000,
    retry: 1,
  });
  const [filter, setFilter] = useState<BetaFeedbackFilter>("all");
  const b = copy.beta;

  if (query.isPending) return <CardSkeleton />;
  if (!query.data)
    return (
      <>
        <h1 className="sr-only">{b.title}</h1>
        <ErrorState
          title={b.errorTitle}
          body={b.errorBody}
          action={{ onClick: () => void query.refetch() }}
        />
      </>
    );
  const all = query.data;
  const items = filterBetaFeedback(all, filter);
  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="type-title">{b.title}</h1>
        <p className="type-caption text-muted-foreground tabular-nums">
          {b.count(items.length)}
        </p>
      </div>
      <ChipGroup
        aria-label={b.filterLabel}
        value={[filter]}
        onValueChange={(v: unknown[]) => {
          const next = v[0];
          setFilter(
            (BETA_FILTERS as readonly unknown[]).includes(next)
              ? (next as BetaFeedbackFilter)
              : "all",
          );
        }}
      >
        {BETA_FILTERS.map((f) => (
          <Chip key={f} value={f}>
            {b.filters[f]}
          </Chip>
        ))}
      </ChipGroup>
      {items.length === 0 ? (
        <EmptyState
          title={all.length === 0 ? b.empty : b.emptyFiltered}
          body={b.emptyBody}
          className="py-10"
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {items.map((i) => (
            <li key={i.id} className="flex flex-col gap-2 py-4">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 type-caption text-muted-foreground tabular-nums">
                <span className="type-label text-foreground">
                  {i.category ? b.filters[i.category] : b.filters.none}
                </span>
                <span>{b.author(i.authorNo)}</span>
                <span>{formatKstDateTime(i.at)}</span>
              </p>
              <p className="type-body break-keep whitespace-pre-line">{i.body}</p>
              <p className="flex flex-wrap gap-x-3 gap-y-1 type-caption break-all text-muted-foreground">
                <span>{i.route ?? b.noRoute}</span>
                <span>
                  {b.devices[i.device]}
                  {i.inApp ? `, ${b.inApp}` : ""}
                  {i.standalone ? `, ${b.standalone}` : ""}
                </span>
                <span>{b.app(i.appVersion)}</span>
                <span>{b.algo(i.algoVersion)}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
      {all.length >= BETA_FEEDBACK_PAGE ? (
        <p className="type-caption text-muted-foreground">
          {b.capped(BETA_FEEDBACK_PAGE)}
        </p>
      ) : null}
      <p className="type-caption text-muted-foreground">{b.retention}</p>
    </section>
  );
}

/* ---------- 로딩 ---------- */

function CardSkeleton() {
  return (
    <LoadingRegion label={copy.frame.loading} className="flex flex-col gap-6">
      <SkeletonLine type="caption" className="w-40" />
      <div className="flex flex-col gap-6 rounded-card border border-border bg-card p-6 desktop:p-10">
        <SkeletonLine type="caption" className="w-24" />
        <SkeletonLine type="heading" className="w-full max-w-lg" />
        <SkeletonLine type="heading" className="w-2/3" />
        <SkeletonLine type="label" className="w-40" />
        <SkeletonLine type="body-sm" className="w-56" />
      </div>
    </LoadingRegion>
  );
}
