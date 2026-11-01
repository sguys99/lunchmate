"use client";
// 관리자 화면 조각 (T8.5). 시안 C(src/features/design-lab/admin)의 공용 조각을 실제 데이터 모양으로 옮겼다.
// - 의미 색은 쓰지 않는다: 자동 숨김은 채운 점 + foreground 글자, 신고 접수는 빈 점(DESIGN.md 2장, 주황은 기피 경고 전용).
// - 올리브 면 버튼은 화면에 하나(숨기기, 숨김 확정, 폐업 확인). 정지 최종 버튼만 destructive 글자색.
// - 장소 이름은 저장하지 않는다(T0.16). 장소 번호 + 카카오맵 링크(새 창).
import { ExternalLink, WifiOff } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
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
import { focusRing, pressMotion } from "@/components/ui/interaction";
import {
  adminCopy as copy,
  type AdminReportReason,
  type AdminSuspendDuration,
  type AdminSuspendReason,
} from "@/copy/admin";
import { commonCopy } from "@/copy/common";
import { cn } from "@/lib/utils";
import {
  formatKstDate,
  formatKstDateTime,
  kakaoPlaceUrl,
  reasonsFor,
  type ItemAuthor,
  type LogEntry,
  type ReportedItem,
} from "./model";

/* ---------- 키보드 ---------- */

const KEYS_OFF_STORAGE = "lm_admin_keys_off";

/** "단축키 끄기" 편의 설정(이 브라우저만, 안건 13). 저장소를 못 쓰면 켜진 채로 둔다 */
export function useShortcutsOff(): [boolean, (off: boolean) => void] {
  const [off, setOff] = useState(false);
  useEffect(() => {
    try {
      // 저장소 값은 마운트 뒤에만 읽을 수 있다(서버 렌더와 첫 화면을 맞춘다)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOff(window.localStorage.getItem(KEYS_OFF_STORAGE) === "1");
    } catch {
      // 비공개 창 등: 기본값(켜짐)
    }
  }, []);
  const update = (next: boolean) => {
    setOff(next);
    try {
      if (next) window.localStorage.setItem(KEYS_OFF_STORAGE, "1");
      else window.localStorage.removeItem(KEYS_OFF_STORAGE);
    } catch {
      // 저장 실패는 이번 화면에만 적용
    }
  };
  return [off, update];
}

/** 한 글자 단축키. 입력 칸, 확인 상자, 수정자 키와 함께 누른 경우는 듣지 않는다 */
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
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
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

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-sm border border-border px-1.5 type-caption font-sans text-muted-foreground">
      {children}
    </kbd>
  );
}

/** A 조각: 단축키 안내 묶음 + 끄기 스위치 (D-19 조합 3, 안건 13) */
export function ShortcutPanel({
  off,
  onOffChange,
}: {
  off: boolean;
  onOffChange: (off: boolean) => void;
}) {
  const id = useId();
  const rows: [string, string][] = [
    ["H", copy.keys.hide],
    ["R", copy.keys.keep],
    ["J", copy.keys.skip],
    ["Z", copy.keys.undo],
  ];
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="hidden flex-col gap-3 border-t border-border pt-4 desktop:flex"
    >
      <h2 id={`${id}-title`} className="type-caption text-muted-foreground">
        {copy.keys.title}
      </h2>
      <dl
        className={cn(
          "grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2",
          off && "opacity-50",
        )}
      >
        {rows.map(([k, label]) => (
          <div key={k} className="contents">
            <dt>
              <Kbd>{k}</Kbd>
            </dt>
            <dd className="type-caption text-muted-foreground">{label}</dd>
          </div>
        ))}
      </dl>
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={off}
          onChange={(e) => onOffChange(e.target.checked)}
          aria-describedby={`${id}-help`}
          className={cn("size-[1.125rem] accent-primary", focusRing)}
        />
        <span className="type-label">{copy.keys.off}</span>
      </label>
      <p id={`${id}-help`} className="type-caption text-muted-foreground">
        {copy.keys.offHelp}
      </p>
    </section>
  );
}

/* ---------- 작은 부품 ---------- */

export function PlaceLine({
  placeId,
  size = "body",
  showHint = false,
}: {
  placeId: string;
  size?: "body" | "heading";
  showHint?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className={cn(
            "min-w-0 break-all tabular-nums",
            size === "heading" ? "type-heading" : "type-label",
          )}
        >
          {copy.place.idLabel(placeId)}
        </span>
        <a
          href={kakaoPlaceUrl(placeId)}
          target="_blank"
          rel="noreferrer"
          aria-label={copy.place.kakaoMapLabel(placeId)}
          className={cn(
            "inline-flex min-h-11 items-center gap-1 rounded-sm type-caption text-muted-foreground underline decoration-1 underline-offset-3 hover:text-foreground active:text-foreground",
            focusRing,
          )}
        >
          {copy.place.kakaoMap}
          <ExternalLink aria-hidden className="size-3.5" />
        </a>
      </div>
      {showHint ? (
        <p className="type-caption text-muted-foreground">
          {copy.place.unnamedHint}
        </p>
      ) : null}
    </div>
  );
}

export function ReasonTally({ item }: { item: ReportedItem }) {
  const entries = (
    Object.entries(item.reasons) as [AdminReportReason, number][]
  ).sort((a, b) => b[1] - a[1]);
  return (
    <ul className="flex flex-wrap gap-1.5">
      {entries.map(([reason, n]) => (
        <li key={reason}>
          <Badge variant="neutral" className="tabular-nums">
            {copy.reasonCount(copy.reasons[reason], n)}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

export function ItemStatus({ autoHidden }: { autoHidden: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 type-caption text-muted-foreground">
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          autoHidden ? "bg-foreground" : "border border-muted-foreground",
        )}
      />
      <span className={autoHidden ? "text-foreground" : undefined}>
        {autoHidden ? copy.status.autoHidden : copy.status.open}
      </span>
    </span>
  );
}

/** 후기 글. 신고 뒤 비공개로 바뀌었으면 서버가 글을 주지 않는다(AC-FB-2) */
export function ReviewBody({
  body,
  privateNow,
  size = "body",
  clamp = false,
}: {
  body: string | null;
  privateNow: boolean;
  size?: "body" | "large";
  clamp?: boolean;
}) {
  if (privateNow) {
    return (
      <p
        className={cn(
          "type-body-sm break-keep text-muted-foreground",
          clamp && "line-clamp-1",
        )}
      >
        {clamp ? copy.review.privateNowShort : copy.review.privateNow}
      </p>
    );
  }
  if (!body) {
    return (
      <p className="type-body-sm text-muted-foreground">{copy.review.noBody}</p>
    );
  }
  return (
    <p
      className={cn(
        "[overflow-wrap:anywhere] break-keep text-foreground",
        size === "large" ? "type-heading" : "type-body",
        clamp && "line-clamp-1",
      )}
    >
      {body}
    </p>
  );
}

export function nicknameOf(n: string | null): string {
  return n ?? copy.author.noNickname;
}

export function AuthorSummary({
  author,
  onSuspend,
  disabled,
}: {
  author: ItemAuthor;
  onSuspend?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="type-label break-all">
          {nicknameOf(author.nickname)}
          {author.status === "suspended" ? (
            <Badge variant="muted" className="ml-2 align-middle">
              {copy.status.suspended}
            </Badge>
          ) : null}
        </span>
        <span className="type-caption text-muted-foreground tabular-nums">
          {copy.author.received(author.reportsReceived)},{" "}
          {copy.author.hiddenBefore(author.hiddenCount)},{" "}
          {copy.author.joined(formatKstDate(author.joinedAt))}
        </span>
      </div>
      {onSuspend && author.status === "active" ? (
        <Button variant="link" onClick={onSuspend} disabled={disabled}>
          {copy.author.suspendAuthor}
        </Button>
      ) : null}
    </div>
  );
}

export function OfflineBanner() {
  return (
    <div
      role="status"
      className="flex items-start gap-3 border-y border-border px-4 py-3 desktop:px-10"
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

/* ---------- 진행 막대와 결정 줄 ---------- */

export function Progress({
  done,
  total,
  label,
}: {
  done: number;
  total: number;
  label: string;
}) {
  const pct = total === 0 ? 100 : Math.round((done / total) * 100);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="type-caption text-muted-foreground">{label}</h1>
        <span className="type-caption text-muted-foreground tabular-nums">
          {copy.queue.progress(done, total)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label={copy.queue.progress(done, total)}
        className="h-0.5 w-full rounded-full bg-border"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-(--lm-duration-base) ease-standard motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** 390은 화면 아래 고정, 데스크톱은 카드 아래 흐름 */
export function DecisionRow({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t border-border bg-background px-4 py-4 desktop:static desktop:mx-0 desktop:border-0 desktop:bg-transparent desktop:px-0 desktop:py-0">
      <div className="flex flex-wrap items-center gap-3">{children}</div>
      {hint ? (
        <p className="hidden flex-wrap items-center gap-2 type-caption text-muted-foreground desktop:flex">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- 숨김 사유 ---------- */

export function HideReasonFieldset({
  item,
  value,
  onChange,
  firstRef,
}: {
  item: ReportedItem;
  value: AdminReportReason;
  onChange: (r: AdminReportReason) => void;
  /** 열릴 때 초점을 줄 선택된 라디오 */
  firstRef?: RefObject<HTMLInputElement | null>;
}) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 type-heading">{copy.hideReason.title}</legend>
      <p className="mb-2 type-caption text-muted-foreground">
        {copy.hideReason.preset}
      </p>
      {reasonsFor(item).map((r) => {
        const n = item.reasons[r] ?? 0;
        return (
          <label
            key={r}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-input px-2 hover:bg-muted active:bg-muted"
          >
            <input
              ref={value === r ? firstRef : undefined}
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

/* ---------- 확인 상자 ---------- */

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
              "relative inline-flex h-10 cursor-pointer items-center rounded-chip border px-4 type-label has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-focus-visible:outline-solid",
              pressMotion,
              value === k
                ? "border-primary text-primary ring-[0.5px] ring-primary ring-inset"
                : "border-border text-foreground hover:bg-muted active:bg-muted",
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

export type SuspendTarget = {
  id: string;
  nickname: string | null;
  status: "active" | "suspended";
};

/** 정지 또는 해제 확인. 첫 초점은 취소(되돌리기 어려운 처리라 실수로 Enter를 눌러도 실행되지 않게) */
export function SuspendDialog({
  user,
  open,
  onOpenChange,
  onConfirm,
}: {
  user: SuspendTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (
    duration: AdminSuspendDuration,
    reason: AdminSuspendReason,
  ) => void;
}) {
  const [duration, setDuration] = useState<AdminSuspendDuration>("d7");
  const [reason, setReason] = useState<AdminSuspendReason>("repeated");
  const cancelRef = useRef<HTMLButtonElement>(null);
  if (!user) return null;
  const suspending = user.status === "active";
  const nick = nicknameOf(user.nickname);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent initialFocus={cancelRef} className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {suspending
              ? copy.confirm.suspendTitle(nick)
              : copy.confirm.unsuspendTitle(nick)}
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
          <Button
            ref={cancelRef}
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {commonCopy.actions.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  action,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  action: string;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent initialFocus={cancelRef} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
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
          <Button
            ref={cancelRef}
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {commonCopy.actions.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- 처리 이력 줄 (A 조각: 목록 형태) ---------- */

export function logTarget(e: LogEntry): string {
  if (e.targetType === "user")
    return e.targetUserId ? nicknameOf(e.targetNickname) : copy.log.deletedUser;
  const place = e.targetPlaceId ? copy.place.idLabel(e.targetPlaceId) : "";
  if (e.targetType === "place") return place;
  const kind = copy.target[e.targetType];
  return e.targetId
    ? `${kind}, ${place}`
    : `${copy.log.deletedTarget}, ${place}`;
}

export function logDetail(e: LogEntry): string | null {
  if (e.action === "user_unsuspend" && e.reason === "expired")
    return copy.log.expired;
  const parts: string[] = [];
  if (e.reason && e.reason in copy.reasons && e.action.endsWith("_hide"))
    parts.push(copy.reasons[e.reason as AdminReportReason]);
  if (e.action === "user_suspend") {
    if (e.reason && e.reason in copy.confirm.suspendReasons)
      parts.push(copy.confirm.suspendReasons[e.reason as AdminSuspendReason]);
    if (e.duration && e.duration in copy.confirm.durations)
      parts.push(copy.confirm.durations[e.duration as AdminSuspendDuration]);
  }
  return parts.length ? parts.join(", ") : null;
}

export function LogLine({
  entry,
  onUndo,
  disabled,
  compact = false,
}: {
  entry: LogEntry;
  onUndo: (id: string) => void;
  disabled: boolean;
  compact?: boolean;
}) {
  const detail = logDetail(entry);
  const by = entry.bySystem
    ? copy.log.system
    : entry.adminNickname
      ? copy.log.by(entry.adminNickname)
      : null;
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span
          className={cn(
            "type-label break-keep",
            entry.reverted && "text-muted-foreground line-through",
          )}
        >
          {copy.log.actions[entry.action]}
          <span className="ml-2 font-normal break-all text-muted-foreground">
            {logTarget(entry)}
          </span>
        </span>
        <span className="type-caption text-muted-foreground tabular-nums">
          {formatKstDateTime(entry.at)}
          {detail ? `, ${detail}` : ""}
          {!compact && by ? `, ${by}` : ""}
          {entry.reverted ? `, ${copy.log.undone}` : ""}
        </span>
      </div>
      {entry.undoable && !entry.reverted ? (
        <Button
          variant="link"
          onClick={() => onUndo(entry.id)}
          disabled={disabled}
          className="shrink-0"
        >
          {copy.actions.undo}
        </Button>
      ) : null}
    </div>
  );
}
