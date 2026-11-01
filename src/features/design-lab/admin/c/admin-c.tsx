"use client";
// 관리자 시안 C: 한 건씩 검토 큐 (T8.5a).
// 목록을 보여 주지 않고 지금 볼 한 건만 큰 카드로 둔다. 후기 글이 카드의 주인공(heading 세리프)이고, 그 아래 사유와 작성자.
// 카드 아래 결정 줄: 숨기기(H, 사유 고르기 한 번) / 문제없음(R) / 건너뛰기(J, 큐 맨 뒤로). 결정하면 카드가 왼쪽으로 8px 밀리며
// 사라지고(base exit) 다음 카드가 오른쪽에서 들어온다(base enter). 위쪽에 "7건 중 2건 처리" 진행 막대.
// 데스크톱 오른쪽 칸은 "오늘 처리한 것" 타임라인(각 줄 되돌리기). 390에서는 타임라인이 카드 아래 접힌 묶음으로 내려간다.
import { useState } from "react";
import {
  EmptyState,
  ErrorState,
  LoadingRegion,
  SkeletonLine,
} from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { commonCopy } from "@/copy/common";
import { adminLabCopy as copy } from "@/copy/design-lab-admin";
import { cn } from "@/lib/utils";
import {
  REPORTED,
  closedCount,
  topReason,
  type AdminAuthor,
  type ReportReason,
} from "../mock";
import { ADMIN_SECTIONS, type AdminParams, type AdminSection } from "../params";
import {
  AdminToaster,
  AuthorSummary,
  ConfirmDialog,
  HideReasonFieldset,
  ItemStatus,
  Kbd,
  LogLine,
  OfflineBanner,
  PlaceLine,
  ReasonTally,
  ReviewBody,
  SuspendDialog,
  reportTotal,
  sectionCount,
  useAdminLab,
  useKeys,
  type AdminLab,
} from "../shared";

const cardEnter =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-2 motion-safe:[animation-duration:var(--lm-duration-base)] motion-safe:[animation-timing-function:var(--lm-ease-enter)]";
const cardLeave =
  "transition-[opacity,translate] duration-(--lm-duration-base) ease-exit motion-reduce:transition-none";

export function AdminC({ params }: { params: AdminParams }) {
  const lab = useAdminLab(params);
  const [section, setSection] = useState<AdminSection>(params.section);
  const offline = params.state === "offline";
  const today = lab.log.filter((e) => e.at.startsWith("11월 1일") && e.by);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 desktop:flex-row desktop:items-center desktop:justify-between desktop:px-10">
          <div className="flex items-baseline justify-between gap-3 desktop:flex-col desktop:gap-0.5">
            <p className="type-heading">{copy.frame.brand}</p>
            <p className="type-caption text-muted-foreground">
              {copy.frame.signedInAs("운영자")}
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
                const n = sectionCount(lab, s);
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
      {offline ? <OfflineBanner /> : null}
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 pt-8 pb-16 desktop:grid-cols-[1fr_20rem] desktop:gap-14 desktop:px-10 desktop:pt-12">
        <main className="flex min-w-0 flex-col">
          {params.state === "loading" ? (
            <CardSkeleton />
          ) : params.state === "error" ? (
            <ErrorState
              title={copy.states.errorTitle}
              body={copy.states.errorBody}
              action={{ onClick: () => undefined }}
            />
          ) : section === "reviews" ? (
            <ReviewQueue lab={lab} params={params} disabled={offline} />
          ) : section === "closures" ? (
            <ClosureQueue lab={lab} params={params} disabled={offline} />
          ) : section === "users" ? (
            <UserQueue lab={lab} params={params} disabled={offline} />
          ) : (
            <section className="flex flex-col gap-4">
              <h1 className="type-title">{copy.log.title}</h1>
              <Timeline lab={lab} entries={lab.log} />
              <p className="type-caption text-muted-foreground">
                {copy.log.retention}
              </p>
            </section>
          )}
        </main>
        {section !== "log" &&
        params.state !== "loading" &&
        params.state !== "error" ? (
          <aside aria-label={copy.log.today} className="min-w-0">
            <details className="group desktop:hidden" open={false}>
              <summary className="flex min-h-11 cursor-pointer items-center justify-between border-t border-border pt-3 type-label">
                {copy.log.todayCount(today.length)}
                <span className="type-caption text-muted-foreground group-open:hidden">
                  {copy.actions.expand}
                </span>
              </summary>
              <div className="pt-3">
                <Timeline lab={lab} entries={today} compact />
              </div>
            </details>
            <div className="hidden flex-col gap-4 desktop:sticky desktop:top-8 desktop:flex">
              <h2 className="type-caption text-muted-foreground">
                {copy.log.todayCount(today.length)}
              </h2>
              <Timeline lab={lab} entries={today} compact />
            </div>
          </aside>
        ) : null}
      </div>
      <AdminToaster />
    </div>
  );
}

/* ---------- 진행 ---------- */

function Progress({
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

function DecisionRow({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-border bg-background px-4 py-4 desktop:static desktop:mx-0 desktop:border-0 desktop:bg-transparent desktop:px-0 desktop:py-0">
      <div className="flex flex-wrap items-center gap-3">{children}</div>
      {hint ? (
        <p className="hidden items-center gap-2 type-caption text-muted-foreground desktop:flex">
          {hint}
        </p>
      ) : null}
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

/* ---------- 후기 큐 ---------- */

function ReviewQueue({
  lab,
  params,
  disabled,
}: {
  lab: AdminLab;
  params: AdminParams;
  disabled: boolean;
}) {
  const [skipped, setSkipped] = useState<string[]>([]);
  const [reasonStep, setReasonStep] = useState(params.step === "reason");
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [suspendOpen, setSuspendOpen] = useState(params.confirm === "suspend");

  const queue = [
    ...lab.items.filter((i) => !skipped.includes(i.id)),
    ...skipped
      .map((id) => lab.items.find((i) => i.id === id))
      .filter((i) => i !== undefined),
  ];
  const total = REPORTED.length;
  const doneCount = lab.done.length;
  const current = queue[0];
  const author = current ? lab.userOf(current.authorId) : null;
  const chosen = reason ?? (current ? topReason(current) : "other");
  const leaving = current ? lab.leaving.has(current.id) : false;

  const reset = () => {
    setReasonStep(false);
    setReason(null);
  };
  const decide = (result: "hidden" | "restored") => {
    if (!current || disabled || leaving) return;
    lab.decide([current], result, result === "hidden" ? chosen : null);
    reset();
  };
  const skip = () => {
    if (!current || queue.length < 2) return;
    setSkipped((prev) => [
      ...prev.filter((id) => id !== current.id),
      current.id,
    ]);
    reset();
  };

  useKeys(
    {
      h: () => (reasonStep ? decide("hidden") : setReasonStep(true)),
      r: () => decide("restored"),
      j: skip,
      s: () => setSuspendOpen(true),
      escape: reset,
      z: () => {
        const last = lab.log.find((e) => !e.undone && lab.canUndo(e.id));
        if (last) lab.undo([last.id]);
      },
    },
    !disabled,
  );

  if (params.state === "empty" || !current || !author) {
    return (
      <div className="flex flex-col gap-8">
        <Progress
          done={doneCount}
          total={params.state === "empty" ? 0 : total}
          label={copy.sections.reviews}
        />
        <AllDone />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Progress done={doneCount} total={total} label={copy.sections.reviews} />
      <article
        key={current.id}
        aria-label={copy.queue.position(1, queue.length)}
        className={cn(
          "flex flex-col gap-7 rounded-card border border-border bg-card p-6 desktop:p-10",
          cardEnter,
          cardLeave,
          leaving && "-translate-x-2 opacity-0",
        )}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="neutral">{copy.target[current.targetType]}</Badge>
          <ItemStatus item={current} />
          <span className="ml-auto type-caption text-muted-foreground tabular-nums">
            {copy.queue.remaining(queue.length)}
          </span>
        </div>
        <div className="flex flex-col gap-4">
          <ReviewBody item={current} size="large" />
          {current.rating ? (
            <span className="type-caption text-muted-foreground">
              {copy.review.rating[current.rating]},{" "}
              {copy.review.writtenAt(current.writtenAt)}
            </span>
          ) : null}
        </div>
        <PlaceLine
          placeId={current.placeId}
          placeName={current.placeName}
          showHint
        />
        <div className="flex flex-col gap-3 border-t border-border pt-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="type-caption text-muted-foreground">
              {copy.reportCount(reportTotal(current))}
            </h2>
            <span className="type-caption text-muted-foreground tabular-nums">
              {copy.review.firstReported(current.firstReportedAt)}
            </span>
          </div>
          <ReasonTally item={current} />
          {current.notes.map((n) => (
            <p key={n} className="type-body-sm break-keep">
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
          <h2 className="type-caption text-muted-foreground">
            {copy.author.title}
          </h2>
          <AuthorSummary
            author={author}
            onSuspend={() => setSuspendOpen(true)}
            disabled={disabled}
          />
        </div>
        {reasonStep ? (
          <div className="border-t border-border pt-6 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)] motion-safe:slide-in-from-bottom-1">
            <HideReasonFieldset
              item={current}
              value={chosen}
              onChange={setReason}
            />
          </div>
        ) : null}
      </article>

      {reasonStep ? (
        <DecisionRow>
          <Button
            variant="primary"
            onClick={() => decide("hidden")}
            disabled={disabled}
          >
            {copy.actions.hideWithReason(copy.reasons[chosen])}
          </Button>
          <Button variant="ghost" onClick={reset}>
            {commonCopy.actions.cancel}
          </Button>
        </DecisionRow>
      ) : (
        <DecisionRow
          hint={
            <>
              <Kbd>H</Kbd> {copy.keys.hide} <Kbd>R</Kbd> {copy.keys.keep}{" "}
              <Kbd>J</Kbd> {copy.actions.skip} <Kbd>Z</Kbd> {copy.keys.undo}
            </>
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
            onClick={() => decide("restored")}
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

      <SuspendDialog
        user={author}
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        onConfirm={(d, r) => lab.setSuspended(author.id, "suspended", d, r)}
      />
    </div>
  );
}

/* ---------- 폐업 큐 ---------- */

function ClosureQueue({
  lab,
  params,
  disabled,
}: {
  lab: AdminLab;
  params: AdminParams;
  disabled: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(params.confirm === "closed");
  const current = lab.closures[0];
  const total = 3;
  const doneCount = total - lab.closures.length;
  if (!current) {
    return (
      <div className="flex flex-col gap-8">
        <Progress
          done={doneCount}
          total={params.state === "empty" ? 0 : total}
          label={copy.sections.closures}
        />
        <AllDone />
      </div>
    );
  }
  const leaving = lab.leaving.has(current.id);
  const excluded = closedCount(current) >= 3;
  const cells = [
    [copy.closures.kinds.gone, current.gone],
    [copy.closures.kinds.moved, current.moved],
    [copy.closures.kinds.today, current.today],
  ] as const;
  return (
    <div className="flex flex-col gap-6">
      <Progress done={doneCount} total={total} label={copy.sections.closures} />
      <article
        key={current.id}
        className={cn(
          "flex flex-col gap-7 rounded-card border border-border bg-card p-6 desktop:p-10",
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
            {copy.closures.lastReported(current.lastReportedAt)}
          </span>
        </div>
        <PlaceLine
          placeId={current.placeId}
          placeName={current.placeName}
          size="heading"
          showHint
        />
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
        <p className="type-body-sm break-keep text-muted-foreground">
          {excluded ? copy.closures.excludedHelp : copy.closures.openHelp}{" "}
          {copy.closures.todayNote}
        </p>
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
          onClick={() => lab.decideClosure(current, "dismiss")}
          disabled={disabled}
          className="flex-1 desktop:flex-none"
        >
          {copy.actions.dismissClosed}
        </Button>
      </DecisionRow>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={copy.confirm.closedTitle}
        body={copy.confirm.closedBody}
        action={copy.actions.confirmClosed}
        onConfirm={() => lab.decideClosure(current, "confirm")}
      />
    </div>
  );
}

/* ---------- 사용자 큐 ---------- */

function UserQueue({
  lab,
  params,
  disabled,
}: {
  lab: AdminLab;
  params: AdminParams;
  disabled: boolean;
}) {
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [dialogUser, setDialogUser] = useState<AdminAuthor | null>(
    params.confirm === "suspend"
      ? lab.userOf("u5")
      : params.confirm === "unsuspend"
        ? lab.userOf("u6")
        : null,
  );
  const candidates = lab.users.filter(
    (u) =>
      u.status === "active" && u.hiddenCount >= 2 && !reviewed.includes(u.id),
  );
  const suspended = lab.users.filter((u) => u.status === "suspended");
  const current = candidates[0];
  const theirs = current
    ? REPORTED.filter((r) => r.authorId === current.id)
    : [];
  const dialogTarget = dialogUser ? lab.userOf(dialogUser.id) : null;

  return (
    <div className="flex flex-col gap-10">
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
              className={cn(
                "flex flex-col gap-7 rounded-card border border-border bg-card p-6 desktop:p-10",
                cardEnter,
              )}
            >
              <div className="flex flex-col gap-1">
                <h2 className="type-title">{current.nickname}</h2>
                <p className="type-caption text-muted-foreground">
                  {copy.users.provider[current.provider]},{" "}
                  {copy.author.joined(current.joined)}
                </p>
              </div>
              <dl className="grid grid-cols-2 divide-x divide-border">
                <div className="flex flex-col gap-1.5 pr-4">
                  <dt className="type-caption text-muted-foreground">
                    {copy.users.columns.received}
                  </dt>
                  <dd className="type-numeric-lg tabular-nums">
                    {current.reportsReceived}
                  </dd>
                </div>
                <div className="flex flex-col gap-1.5 px-4">
                  <dt className="type-caption text-muted-foreground">
                    {copy.users.columns.hidden}
                  </dt>
                  <dd className="type-numeric-lg tabular-nums">
                    {current.hiddenCount}
                  </dd>
                </div>
              </dl>
              {theirs.length > 0 ? (
                <ul className="flex flex-col divide-y divide-border border-t border-border">
                  {theirs.map((r) => (
                    <li key={r.id} className="flex flex-col gap-1 py-3">
                      <span className="type-caption text-muted-foreground">
                        {copy.target[r.targetType]},{" "}
                        {r.placeName ?? copy.place.idLabel(r.placeId)},{" "}
                        {copy.reportCount(reportTotal(r))}
                      </span>
                      <ReviewBody item={r} clamp />
                    </li>
                  ))}
                </ul>
              ) : null}
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
                onClick={() => setReviewed((p) => [...p, current.id])}
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
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {suspended.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div className="flex flex-col gap-0.5">
                <span className="type-label">{u.nickname}</span>
                <span className="type-caption text-muted-foreground">
                  {u.suspendedUntil
                    ? copy.users.suspendedUntil(u.suspendedUntil)
                    : copy.users.suspendedIndefinite}
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDialogUser(u)}
                disabled={disabled}
              >
                {copy.actions.unsuspend}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <SuspendDialog
        user={dialogTarget}
        open={dialogTarget !== null}
        onOpenChange={(o) => !o && setDialogUser(null)}
        onConfirm={(d, r) =>
          dialogTarget &&
          lab.setSuspended(
            dialogTarget.id,
            dialogTarget.status === "active" ? "suspended" : "active",
            d,
            r,
          )
        }
      />
    </div>
  );
}

/* ---------- 타임라인 ---------- */

function Timeline({
  lab,
  entries,
  compact = false,
}: {
  lab: AdminLab;
  entries: AdminLab["log"];
  compact?: boolean;
}) {
  return (
    <ol className="relative flex flex-col gap-5 border-l border-border pl-5">
      {entries.map((e) => (
        <li
          key={e.id}
          className="relative motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)]"
        >
          <span
            aria-hidden
            className={cn(
              "absolute top-2 -left-[calc(1.5rem+0.5px)] size-2 rounded-full border border-muted-foreground bg-background",
              !e.undone && e.by && "bg-muted-foreground",
            )}
          />
          <LogLine entry={e} lab={lab} compact={compact} />
        </li>
      ))}
    </ol>
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
