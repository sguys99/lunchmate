"use client";
// 관리자 화면 시안 공용 조각 (T8.5a). 세 안이 같은 목업 상태(useAdminLab)와 같은 처리 규칙을 쓰고, 배치와 흐름만 다르다.
//
// 처리 규칙(세 안 공통):
// - 숨기기는 사유를 고른 뒤 바로 반영하고 토스트 "되돌리기"(8초)를 준다. 처리 이력에도 남아 나중에 되돌릴 수 있다.
// - 정지, 정지 해제, 일괄 처리, 폐업 확인은 확인 상자를 한 번 거친다(되돌리기 쉬운 단건 숨김, 복구는 확인 없음).
// - 처리한 줄은 높이와 투명도가 base(260ms) exit로 줄며 빠진다. 축소 모드면 바로 빠진다.
// 장소 이름: 카카오 이름은 저장하지 않는다(T0.16). 이 브라우저 세션에서 찾은 이름만 보이고, 없으면 장소 번호 + 카카오맵 링크.
import { ExternalLink, WifiOff } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { focusRing } from "@/components/ui/interaction";
import { Toaster, toast } from "@/components/ui/sonner";
import { commonCopy } from "@/copy/common";
import { adminLabCopy as copy } from "@/copy/design-lab-admin";
import { useDesignPortalContainer } from "@/features/design-lab/system/design-scope";
import { cn } from "@/lib/utils";
import {
  ADMIN_NICK,
  AUTHORS,
  CLOSURES,
  DEAL_REASONS,
  LOG,
  REPORTED,
  REVIEW_REASONS,
  authorOf,
  placeUrl,
  reportTotal,
  sortQueue,
  type AdminAuthor,
  type ClosureItem,
  type LogAction,
  type LogEntry,
  type ReportReason,
  type ReportedItem,
} from "./mock";
import type { AdminParams, AdminSection } from "./params";

/* ---------- 목업 상태 ---------- */

export type DoneItem = { item: ReportedItem; result: "hidden" | "restored" };
export type SuspendDuration = keyof typeof copy.confirm.durations;
export type SuspendReason = keyof typeof copy.confirm.suspendReasons;

type Undo =
  | { kind: "item"; item: ReportedItem }
  | { kind: "closure"; closure: ClosureItem }
  | { kind: "user"; userId: string; prev: AdminAuthor };

const NOW = "11월 1일 14:40";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** 처리한 줄이 빠지는 시간. --lm-duration-base와 같다 */
export const LEAVE_MS = 260;

export function itemLabel(item: ReportedItem): string {
  return `${copy.target[item.targetType]}, ${item.placeName ?? copy.place.idLabel(item.placeId)}`;
}

export function closureLabel(c: ClosureItem): string {
  return c.placeName ?? copy.place.idLabel(c.placeId);
}

export function useAdminLab(params: AdminParams) {
  const empty = params.state === "empty";
  const [items, setItems] = useState<ReportedItem[]>(() =>
    empty ? [] : sortQueue(REPORTED),
  );
  const [done, setDone] = useState<DoneItem[]>([]);
  const [closures, setClosures] = useState<ClosureItem[]>(() =>
    empty ? [] : [...CLOSURES],
  );
  const [users, setUsers] = useState<AdminAuthor[]>(() => [...AUTHORS]);
  const [log, setLog] = useState<LogEntry[]>(() => [...LOG]);
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(new Set());
  const undoMap = useRef(new Map<string, Undo>());
  const seq = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);

  /** 줄을 빠지는 모양으로 바꾼 뒤 LEAVE_MS 뒤에 실제로 지운다 */
  const leave = useCallback((ids: readonly string[], remove: () => void) => {
    if (prefersReducedMotion()) {
      remove();
      return;
    }
    setLeaving((prev) => new Set([...prev, ...ids]));
    const t = window.setTimeout(() => {
      remove();
      setLeaving((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }, LEAVE_MS);
    timers.current.push(t);
  }, []);

  const addLog = useCallback(
    (
      action: LogAction,
      target: string,
      reason: string | null,
      undo: Undo,
    ): string => {
      seq.current += 1;
      const id = `n${seq.current}`;
      undoMap.current.set(id, undo);
      setLog((prev) => [
        { id, at: NOW, action, target, reason, by: ADMIN_NICK },
        ...prev,
      ]);
      return id;
    },
    [],
  );

  const undo = useCallback((logIds: readonly string[]) => {
    for (const id of logIds) {
      const u = undoMap.current.get(id);
      if (!u) continue;
      undoMap.current.delete(id);
      if (u.kind === "item") {
        setDone((prev) => prev.filter((d) => d.item.id !== u.item.id));
        setItems((prev) =>
          prev.some((i) => i.id === u.item.id)
            ? prev
            : sortQueue([...prev, u.item]),
        );
      } else if (u.kind === "closure") {
        setClosures((prev) =>
          prev.some((c) => c.id === u.closure.id)
            ? prev
            : [...prev, u.closure].sort((a, b) => a.order - b.order),
        );
      } else {
        setUsers((prev) => prev.map((x) => (x.id === u.userId ? u.prev : x)));
      }
    }
    setLog((prev) =>
      prev.map((e) => (logIds.includes(e.id) ? { ...e, undone: true } : e)),
    );
    toast(copy.done.undone);
  }, []);

  const canUndo = useCallback(
    (logId: string) => undoMap.current.has(logId),
    [],
  );

  const showDone = useCallback(
    (message: string, logIds: readonly string[]) => {
      toast(message, {
        description: copy.done.undoHint,
        duration: 8000,
        action: { label: copy.actions.undo, onClick: () => undo(logIds) },
      });
    },
    [undo],
  );

  /** 후기, 할인 숨기기 또는 복구. 여러 건이면 일괄 */
  const decide = useCallback(
    (
      targets: readonly ReportedItem[],
      result: "hidden" | "restored",
      reason: ReportReason | null,
    ) => {
      if (targets.length === 0) return;
      const ids = targets.map((t) => t.id);
      const logIds = targets.map((t) =>
        addLog(
          result === "hidden" ? "hide" : "restore",
          itemLabel(t),
          reason ? copy.reasons[reason] : null,
          { kind: "item", item: t },
        ),
      );
      leave(ids, () => {
        setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
        setDone((prev) => [
          ...targets.map((item) => ({ item, result })),
          ...prev,
        ]);
      });
      const many = targets.length > 1;
      showDone(
        result === "hidden"
          ? many
            ? copy.done.hiddenMany(targets.length)
            : copy.done.hidden
          : many
            ? copy.done.restoredMany(targets.length)
            : copy.done.restored,
        logIds,
      );
    },
    [addLog, leave, showDone],
  );

  const decideClosure = useCallback(
    (c: ClosureItem, result: "confirm" | "dismiss") => {
      const logId = addLog(
        result === "confirm" ? "closedConfirm" : "closedDismiss",
        closureLabel(c),
        null,
        { kind: "closure", closure: c },
      );
      leave([c.id], () =>
        setClosures((prev) => prev.filter((x) => x.id !== c.id)),
      );
      showDone(
        result === "confirm"
          ? copy.done.closedConfirmed
          : copy.done.closedDismissed,
        [logId],
      );
    },
    [addLog, leave, showDone],
  );

  const setSuspended = useCallback(
    (
      userId: string,
      next: "suspended" | "active",
      duration?: SuspendDuration,
      reason?: SuspendReason,
    ) => {
      const prev = users.find((u) => u.id === userId);
      if (!prev) return;
      const until =
        duration === "d7" ? "11월 8일" : duration === "d30" ? "12월 1일" : null;
      const logId = addLog(
        next === "suspended" ? "suspend" : "unsuspend",
        prev.nickname,
        next === "suspended" && reason && duration
          ? `${copy.confirm.suspendReasons[reason]}, ${copy.confirm.durations[duration]}`
          : null,
        { kind: "user", userId, prev },
      );
      setUsers((list) =>
        list.map((u) =>
          u.id === userId
            ? {
                ...u,
                status: next,
                suspendedUntil: next === "suspended" ? until : null,
              }
            : u,
        ),
      );
      showDone(
        next === "suspended"
          ? copy.done.suspended(prev.nickname)
          : copy.done.unsuspended(prev.nickname),
        [logId],
      );
    },
    [addLog, showDone, users],
  );

  const userOf = useCallback(
    (id: string) => users.find((u) => u.id === id) ?? authorOf(id),
    [users],
  );

  return {
    items,
    done,
    closures,
    users,
    log,
    leaving,
    decide,
    decideClosure,
    setSuspended,
    undo,
    canUndo,
    userOf,
  };
}

export type AdminLab = ReturnType<typeof useAdminLab>;

/** 구역별 검토 대기 수 (사용자는 정지 검토 후보 수) */
export function sectionCount(
  lab: AdminLab,
  section: AdminSection,
): number | null {
  if (section === "reviews") return lab.items.length;
  if (section === "closures") return lab.closures.length;
  if (section === "users")
    return lab.users.filter((u) => u.status === "active" && u.hiddenCount >= 2)
      .length;
  return null;
}

/* ---------- 키보드 ---------- */

/** 단축키. 입력 칸과 확인 상자 안에서는 듣지 않는다 */
export function useKeys(
  handlers: Record<string, () => void>,
  enabled: boolean,
) {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [role=dialog]")) return;
      const fn = ref.current[e.key.toLowerCase()];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}

/* ---------- 줄이 빠지는 틀 ---------- */

/** 처리한 줄이 높이 0으로 접히며 빠진다. 빠지는 동안만 overflow-hidden(평소에는 포커스 링이 잘리지 않게) */
export function Leaving({
  leaving,
  children,
  className,
}: {
  leaving: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden={leaving || undefined}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-(--lm-duration-base) ease-exit motion-reduce:transition-none",
        leaving ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr]",
        className,
      )}
    >
      <div className={cn("min-h-0", leaving && "overflow-hidden")}>
        {children}
      </div>
    </div>
  );
}

/* ---------- 작은 부품 ---------- */

/** 키보드 단축키 표시 */
export function Kbd({
  children,
  onPrimary = false,
}: {
  children: ReactNode;
  /** 주 버튼(올리브 면) 안에서는 글자색을 따라간다(대비) */
  onPrimary?: boolean;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-sm border px-1.5 type-caption font-sans",
        onPrimary
          ? "border-primary-foreground/50 text-primary-foreground"
          : "border-border text-muted-foreground",
      )}
    >
      {children}
    </kbd>
  );
}

/** 장소 한 줄: 세션에서 찾은 이름 또는 장소 번호 + 카카오맵 링크 */
export function PlaceLine({
  placeId,
  placeName,
  size = "body",
  showHint = false,
}: {
  placeId: string;
  placeName: string | null;
  size?: "body" | "heading";
  showHint?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className={cn(
            "min-w-0 break-keep",
            size === "heading" ? "type-heading" : "type-label",
            !placeName && "tabular-nums",
          )}
        >
          {placeName ?? copy.place.idLabel(placeId)}
        </span>
        <a
          href={placeUrl(placeId)}
          target="_blank"
          rel="noreferrer"
          aria-label={copy.place.kakaoMapLabel(placeId)}
          className={cn(
            "inline-flex items-center gap-1 rounded-sm type-caption text-muted-foreground underline decoration-1 underline-offset-3 hover:text-foreground",
            focusRing,
          )}
        >
          {copy.place.kakaoMap}
          <ExternalLink aria-hidden className="size-3.5" />
        </a>
      </div>
      {showHint ? (
        <p className="type-caption text-muted-foreground">
          {placeName ? copy.place.matchedHint : copy.place.unmatched}
        </p>
      ) : null}
    </div>
  );
}

/** 사유별 신고 수 배지. 많은 순 */
export function ReasonTally({
  item,
  max,
}: {
  item: ReportedItem;
  max?: number;
}) {
  const entries = (Object.entries(item.reasons) as [ReportReason, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  const shown = max ? entries.slice(0, max) : entries;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {shown.map(([reason, n]) => (
        <li key={reason}>
          <Badge variant="neutral" className="tabular-nums">
            {copy.reasonCount(copy.reasons[reason], n)}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

/** 자동 숨김 / 신고 접수 표시. 자동 숨김만 점(foreground)으로 무게를 준다. 의미 색은 쓰지 않는다 */
export function ItemStatus({ item }: { item: ReportedItem }) {
  return (
    <span className="inline-flex items-center gap-1.5 type-caption text-muted-foreground">
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          item.autoHidden ? "bg-foreground" : "border border-muted-foreground",
        )}
      />
      <span className={item.autoHidden ? "text-foreground" : undefined}>
        {item.autoHidden ? copy.status.autoHidden : copy.status.open}
      </span>
    </span>
  );
}

/** 후기 글. 신고 뒤 비공개로 바뀌었으면 글을 보이지 않는다(AC-FB-2) */
export function ReviewBody({
  item,
  size = "body",
  clamp,
}: {
  item: ReportedItem;
  size?: "body" | "large";
  clamp?: boolean;
}) {
  if (item.privateNow) {
    if (clamp)
      return (
        <p className="line-clamp-1 type-body-sm text-muted-foreground">
          {copy.review.privateNowShort}
        </p>
      );
    return (
      <p className="type-body-sm break-keep text-muted-foreground">
        {copy.review.privateNow}
      </p>
    );
  }
  if (!item.body) {
    return (
      <p className="type-body-sm text-muted-foreground">{copy.review.noBody}</p>
    );
  }
  return (
    <p
      className={cn(
        "break-keep text-foreground",
        size === "large" ? "type-heading" : "type-body",
        clamp && "line-clamp-1",
      )}
    >
      {item.body}
    </p>
  );
}

/** 작성자 요약 (닉네임, 받은 신고, 숨겨진 글, 상태) */
export function AuthorSummary({
  author,
  onSuspend,
  disabled,
}: {
  author: AdminAuthor;
  onSuspend?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="type-label">
          {author.nickname}
          {author.status === "suspended" ? (
            <Badge variant="muted" className="ml-2 align-middle">
              {copy.status.suspended}
            </Badge>
          ) : null}
        </span>
        <span className="type-caption text-muted-foreground tabular-nums">
          {copy.author.received(author.reportsReceived)},{" "}
          {copy.author.hiddenBefore(author.hiddenCount)},{" "}
          {copy.author.joined(author.joined)}
        </span>
      </div>
      {onSuspend && author.status === "active" ? (
        <Button
          variant="link"
          onClick={onSuspend}
          disabled={disabled}
          className="type-label"
        >
          {copy.author.suspendAuthor}
        </Button>
      ) : null}
    </div>
  );
}

/** 오프라인 안내 줄 (위아래 헤어라인) */
export function OfflineBanner() {
  return (
    <div
      role="status"
      className="flex items-start gap-3 border-y border-border px-6 py-3"
    >
      <WifiOff
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
      />
      <p className="type-body-sm break-keep">
        <span className="text-foreground">{copy.states.offlineTitle}.</span>{" "}
        <span className="text-muted-foreground">{copy.states.offlineBody}</span>
      </p>
    </div>
  );
}

/* ---------- 숨김 사유 ---------- */

export function reasonsFor(item: ReportedItem): readonly ReportReason[] {
  return item.targetType === "deal" ? DEAL_REASONS : REVIEW_REASONS;
}

export function HideReasonFieldset({
  item,
  value,
  onChange,
  showTitle = true,
}: {
  item: ReportedItem;
  value: ReportReason;
  onChange: (r: ReportReason) => void;
  showTitle?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className={cn(showTitle ? "mb-1 type-heading" : "sr-only")}>
        {showTitle ? copy.hideReason.title : copy.hideReason.legend}
      </legend>
      {showTitle ? (
        <p className="mb-2 type-caption text-muted-foreground">
          {copy.hideReason.preset}
        </p>
      ) : null}
      {reasonsFor(item).map((r) => {
        const n = item.reasons[r] ?? 0;
        return (
          <label
            key={r}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-input px-2 hover:bg-muted"
          >
            <input
              type="radio"
              name={name}
              value={r}
              checked={value === r}
              onChange={() => onChange(r)}
              className={cn("size-[1.125rem] accent-primary", focusRing)}
            />
            <span className="flex-1 type-body">{copy.reasons[r]}</span>
            {n > 0 ? (
              <span className="type-caption text-muted-foreground tabular-nums">
                {copy.reportCount(n)}
              </span>
            ) : null}
          </label>
        );
      })}
    </fieldset>
  );
}

/* ---------- 라디오 칩 묶음 (정지 기간, 사유) ---------- */

function RadioPills<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: Readonly<Record<T, string>>;
  value: T;
  onChange: (v: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 type-caption text-muted-foreground">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">
        {(Object.entries(options) as [T, string][]).map(([k, label]) => (
          <label
            key={k}
            className={cn(
              "relative inline-flex h-10 cursor-pointer items-center rounded-chip border px-4 type-label transition-colors duration-(--lm-duration-fast) ease-standard has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-focus-visible:outline-solid motion-reduce:transition-none",
              value === k
                ? "border-primary text-primary ring-[0.5px] ring-primary ring-inset"
                : "border-border text-foreground hover:bg-muted",
            )}
          >
            <input
              type="radio"
              name={name}
              value={k}
              checked={value === k}
              onChange={() => onChange(k)}
              className="sr-only"
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/* ---------- 확인 상자 ---------- */

export function SuspendDialog({
  user,
  open,
  onOpenChange,
  onConfirm,
}: {
  user: AdminAuthor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (duration: SuspendDuration, reason: SuspendReason) => void;
}) {
  const container = useDesignPortalContainer();
  const [duration, setDuration] = useState<SuspendDuration>("d7");
  const [reason, setReason] = useState<SuspendReason>("repeated");
  if (!user) return null;
  const suspending = user.status === "active";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent portalContainer={container} className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {suspending
              ? copy.confirm.suspendTitle(user.nickname)
              : copy.confirm.unsuspendTitle(user.nickname)}
          </DialogTitle>
          <DialogDescription>
            {suspending ? copy.confirm.suspendBody : copy.confirm.unsuspendBody}
          </DialogDescription>
        </DialogHeader>
        {suspending ? (
          <div className="flex flex-col gap-5">
            <RadioPills
              legend={copy.confirm.reasonLegend}
              options={copy.confirm.suspendReasons}
              value={reason}
              onChange={setReason}
            />
            <RadioPills
              legend={copy.confirm.durationLegend}
              options={copy.confirm.durations}
              value={duration}
              onChange={setDuration}
            />
          </div>
        ) : null}
        <DialogFooter>
          <Button
            variant={suspending ? "destructive" : "primary"}
            onClick={() => {
              onConfirm(duration, reason);
              onOpenChange(false);
            }}
          >
            {suspending
              ? copy.confirm.suspendAction
              : copy.confirm.unsuspendAction}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {commonCopy.actions.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 단순 확인 상자 (일괄 숨김, 일괄 복구, 폐업 확인) */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  action,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  action: string;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  const container = useDesignPortalContainer();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent portalContainer={container} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button
            variant="primary"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {action}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {commonCopy.actions.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 관리자 화면은 하단 탭이 없어 토스트를 화면 아래 24px에 띄운다 */
export function AdminToaster() {
  return (
    <Toaster
      offset={{ bottom: "1.5rem" }}
      mobileOffset={{ bottom: "1rem", left: "1rem", right: "1rem" }}
    />
  );
}

/* ---------- 처리 이력 줄 ---------- */

export function LogLine({
  entry,
  lab,
  compact = false,
}: {
  entry: LogEntry;
  lab: AdminLab;
  compact?: boolean;
}) {
  const undoable = !entry.undone && lab.canUndo(entry.id);
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span
          className={cn(
            "type-label break-keep",
            entry.undone && "text-muted-foreground line-through",
          )}
        >
          {copy.log.actions[entry.action]}
          <span className="font-normal text-muted-foreground">
            {"  "}
            {entry.target}
          </span>
        </span>
        <span className="type-caption text-muted-foreground tabular-nums">
          {entry.at}
          {entry.reason ? `, ${entry.reason}` : ""}
          {!compact && entry.by ? `, ${copy.log.by(entry.by)}` : ""}
          {entry.undone ? `, ${copy.log.undone}` : ""}
        </span>
      </div>
      {undoable ? (
        <Button
          variant="link"
          onClick={() => lab.undo([entry.id])}
          className="shrink-0"
        >
          {copy.actions.undo}
        </Button>
      ) : null}
    </div>
  );
}

export { reportTotal };
