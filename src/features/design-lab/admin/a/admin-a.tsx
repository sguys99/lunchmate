"use client";
// 관리자 시안 A: 받은편지함 (T8.5a).
// 데스크톱: 좌 메뉴(구역과 검토 대기 수) + 가운데 목록 + 우 상세와 처리 버튼. 키보드로 J/K 이동, H 숨기기, R 복구, S 작성자 정지, Z 되돌리기.
// 390: 목록 한 칸. 줄을 누르면 상세가 그 자리를 대신하고 "목록으로"로 돌아온다. 처리 버튼은 화면 아래에 붙는다.
// 처리하면 목록 줄이 접히며 빠지고 다음 건이 자동으로 골라진다. 숨기기는 사유 고르기(가장 많은 신고 사유를 미리 고름)를 한 번 거친다.
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  EmptyState,
  ErrorState,
  LoadingRegion,
  SkeletonLine,
} from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { focusRing } from "@/components/ui/interaction";
import { commonCopy } from "@/copy/common";
import { adminLabCopy as copy } from "@/copy/design-lab-admin";
import { cn } from "@/lib/utils";
import {
  REPORTED,
  closedCount,
  topReason,
  type AdminAuthor,
  type ClosureItem,
  type ReportReason,
  type ReportedItem,
} from "../mock";
import { ADMIN_SECTIONS, type AdminParams, type AdminSection } from "../params";
import {
  AdminToaster,
  AuthorSummary,
  ConfirmDialog,
  HideReasonFieldset,
  ItemStatus,
  Kbd,
  Leaving,
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

export function AdminA({ params }: { params: AdminParams }) {
  const lab = useAdminLab(params);
  const [section, setSection] = useState<AdminSection>(params.section);
  const offline = params.state === "offline";

  return (
    <div className="flex min-h-dvh flex-col desktop:flex-row">
      <SideNav lab={lab} section={section} onSection={setSection} />
      <main className="flex min-w-0 flex-1 flex-col">
        {offline ? <OfflineBanner /> : null}
        {params.state === "loading" ? (
          <ListDetailSkeleton />
        ) : params.state === "error" ? (
          <div className="px-6 py-14 desktop:px-14">
            <ErrorState
              title={copy.states.errorTitle}
              body={copy.states.errorBody}
              action={{ onClick: () => undefined }}
            />
          </div>
        ) : section === "reviews" ? (
          <ReviewsPane
            lab={lab}
            params={params}
            disabled={offline}
            onLog={() => setSection("log")}
          />
        ) : section === "closures" ? (
          <ClosuresPane lab={lab} params={params} disabled={offline} />
        ) : section === "users" ? (
          <UsersPane lab={lab} params={params} disabled={offline} />
        ) : (
          <LogPane lab={lab} />
        )}
      </main>
      <AdminToaster />
    </div>
  );
}

/* ---------- 메뉴 ---------- */

function SideNav({
  lab,
  section,
  onSection,
}: {
  lab: AdminLab;
  section: AdminSection;
  onSection: (s: AdminSection) => void;
}) {
  return (
    <header className="flex shrink-0 flex-col border-b border-border desktop:sticky desktop:top-0 desktop:h-dvh desktop:w-60 desktop:border-r desktop:border-b-0">
      <div className="flex items-baseline justify-between gap-3 px-6 pt-5 pb-3 desktop:flex-col desktop:items-start desktop:gap-1 desktop:pt-8 desktop:pb-6">
        <p className="type-heading">{copy.frame.brand}</p>
        <p className="type-caption text-muted-foreground">
          {copy.frame.signedInAs("운영자")}
        </p>
      </div>
      <nav
        aria-label={copy.frame.navLabel}
        className="overflow-x-auto px-4 desktop:px-3"
      >
        <ul className="flex gap-1 desktop:flex-col">
          {ADMIN_SECTIONS.map((s) => {
            const n = sectionCount(lab, s);
            const active = s === section;
            return (
              <li key={s}>
                <button
                  type="button"
                  aria-current={active ? "page" : undefined}
                  aria-label={
                    n !== null
                      ? copy.sectionCount(copy.sections[s], n)
                      : undefined
                  }
                  onClick={() => onSection(s)}
                  className={cn(
                    "relative flex min-h-11 w-full items-center justify-between gap-3 rounded-input px-3 type-label whitespace-nowrap transition-colors duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
                    active
                      ? "text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary desktop:bg-card desktop:after:inset-x-auto desktop:after:inset-y-2.5 desktop:after:left-0 desktop:after:h-auto desktop:after:w-0.5"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    focusRing,
                  )}
                >
                  {copy.sections[s]}
                  {n !== null && n > 0 ? (
                    <span className="type-caption text-muted-foreground tabular-nums">
                      {n}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-auto hidden flex-col gap-2 px-6 pb-8 desktop:flex">
        <p className="type-caption text-muted-foreground">{copy.keys.title}</p>
        <KeyHint k="J K" label={copy.keys.move} />
        <KeyHint k="H" label={copy.keys.hide} />
        <KeyHint k="R" label={copy.keys.keep} />
        <KeyHint k="S" label={copy.keys.suspend} />
        <KeyHint k="Z" label={copy.keys.undo} />
      </div>
    </header>
  );
}

function KeyHint({ k, label }: { k: string; label: string }) {
  return (
    <p className="flex items-center gap-2 type-caption text-muted-foreground">
      <span className="flex gap-1">
        {k.split(" ").map((x) => (
          <Kbd key={x}>{x}</Kbd>
        ))}
      </span>
      {label}
    </p>
  );
}

/* ---------- 목록 + 상세 틀 ---------- */

function ListDetail({
  list,
  detail,
  detailOpen,
  onBack,
}: {
  list: ReactNode;
  detail: ReactNode;
  /** 390에서 상세를 보이는지 */
  detailOpen: boolean;
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 desktop:grid desktop:grid-cols-[22rem_1fr]">
      <div
        className={cn(
          "min-w-0 flex-1 desktop:block desktop:border-r desktop:border-border",
          detailOpen && "hidden",
        )}
      >
        {list}
      </div>
      <div
        className={cn(
          "min-w-0 flex-1 flex-col desktop:flex",
          detailOpen ? "flex" : "hidden",
        )}
      >
        <div className="px-4 pt-3 desktop:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="-ml-2 gap-1.5 px-3"
          >
            <ArrowLeft aria-hidden className="size-4" />
            {copy.frame.back}
          </Button>
        </div>
        {detail}
      </div>
    </div>
  );
}

function ListRow({
  selected,
  onSelect,
  leaving,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  leaving: boolean;
  children: ReactNode;
}) {
  return (
    <Leaving leaving={leaving}>
      <li>
        <button
          type="button"
          aria-current={selected ? "true" : undefined}
          onClick={onSelect}
          className={cn(
            "relative flex w-full items-start gap-3 border-b border-border px-6 py-4 text-left transition-colors duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
            selected
              ? "bg-card before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-primary"
              : "hover:bg-muted",
            focusRing,
            "focus-visible:-outline-offset-2",
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">{children}</div>
          <ChevronRight
            aria-hidden
            className="mt-1 size-4 shrink-0 text-muted-foreground desktop:hidden"
          />
        </button>
      </li>
    </Leaving>
  );
}

function PaneHead({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border px-6 py-4">
      <h1 className="type-heading">{title}</h1>
      {count !== undefined ? (
        <span className="type-caption text-muted-foreground tabular-nums">
          {copy.status.pending} {count}
        </span>
      ) : null}
    </div>
  );
}

function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 mt-auto flex flex-wrap items-center gap-3 border-t border-border bg-background px-6 py-4 desktop:px-10">
      {children}
    </div>
  );
}

/* ---------- 신고된 후기 ---------- */

function ReviewsPane({
  lab,
  params,
  disabled,
  onLog,
}: {
  lab: AdminLab;
  params: AdminParams;
  disabled: boolean;
  onLog: () => void;
}) {
  const initial =
    params.item && REPORTED.some((r) => r.id === params.item)
      ? params.item
      : null;
  const [selectedId, setSelectedId] = useState<string | null>(
    initial ?? lab.items[0]?.id ?? null,
  );
  const [detailOpen, setDetailOpen] = useState(initial !== null);
  const [reasonStep, setReasonStep] = useState(params.step === "reason");
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [suspendOpen, setSuspendOpen] = useState(params.confirm === "suspend");

  const items = lab.items;
  const index = Math.max(
    0,
    items.findIndex((i) => i.id === selectedId),
  );
  const selected: ReportedItem | undefined =
    items.find((i) => i.id === selectedId) ?? items[0];
  const author = selected ? lab.userOf(selected.authorId) : null;
  const chosen = reason ?? (selected ? topReason(selected) : "other");

  const select = (id: string | undefined) => {
    setSelectedId(id ?? null);
    setReasonStep(false);
    setReason(null);
  };
  const move = (d: 1 | -1) => {
    const next = items[Math.min(items.length - 1, Math.max(0, index + d))];
    if (next) select(next.id);
  };
  const decide = (result: "hidden" | "restored") => {
    if (!selected || disabled) return;
    const next = items[index + 1] ?? items[index - 1];
    lab.decide([selected], result, result === "hidden" ? chosen : null);
    select(next?.id);
  };

  useKeys(
    {
      j: () => move(1),
      arrowdown: () => move(1),
      k: () => move(-1),
      arrowup: () => move(-1),
      h: () => (reasonStep ? decide("hidden") : setReasonStep(true)),
      r: () => decide("restored"),
      s: () => setSuspendOpen(true),
      escape: () => setReasonStep(false),
      z: () => {
        const last = lab.log.find((e) => !e.undone && lab.canUndo(e.id));
        if (last) lab.undo([last.id]);
      },
    },
    !disabled,
  );

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <PaneHead title={copy.sections.reviews} count={0} />
        <div className="px-6 py-14 desktop:px-14">
          <EmptyState
            title={copy.states.emptyTitle}
            body={copy.states.emptyBody}
            action={{ label: copy.states.emptyAction, onClick: onLog }}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <ListDetail
        detailOpen={detailOpen}
        onBack={() => setDetailOpen(false)}
        list={
          <>
            <PaneHead title={copy.sections.reviews} count={items.length} />
            <ul aria-label={copy.table.caption}>
              {items.map((item) => (
                <ListRow
                  key={item.id}
                  selected={item.id === selected?.id}
                  leaving={lab.leaving.has(item.id)}
                  onSelect={() => {
                    select(item.id);
                    setDetailOpen(true);
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <ItemStatus item={item} />
                    <span className="type-caption text-muted-foreground tabular-nums">
                      {item.firstReportedAt}
                    </span>
                  </div>
                  <span className="type-label break-keep">
                    {copy.target[item.targetType]}
                    <span className="font-normal text-muted-foreground">
                      {"  "}
                      {item.placeName ?? copy.place.idLabel(item.placeId)}
                    </span>
                  </span>
                  <span className="line-clamp-1 type-body-sm text-muted-foreground">
                    {item.privateNow
                      ? copy.review.privateNowShort
                      : (item.body ?? copy.review.noBody)}
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <ReasonTally item={item} max={2} />
                    <span className="type-caption text-muted-foreground tabular-nums">
                      {copy.reportCount(reportTotal(item))}
                    </span>
                  </div>
                </ListRow>
              ))}
            </ul>
          </>
        }
        detail={
          selected && author ? (
            <>
              <article
                key={selected.id}
                aria-label={copy.review.bodyLabel}
                className="flex flex-col gap-8 px-6 pt-5 pb-10 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)] desktop:px-10 desktop:pt-10"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="neutral">
                      {copy.target[selected.targetType]}
                    </Badge>
                    <ItemStatus item={selected} />
                    <span className="type-caption text-muted-foreground tabular-nums">
                      {copy.review.firstReported(selected.firstReportedAt)}
                    </span>
                  </div>
                  <PlaceLine
                    placeId={selected.placeId}
                    placeName={selected.placeName}
                    size="heading"
                    showHint
                  />
                  <p className="type-body-sm break-keep text-muted-foreground">
                    {selected.autoHidden
                      ? copy.status.autoHiddenHelp
                      : copy.status.openHelp}
                  </p>
                </div>

                <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-6">
                  {selected.rating ? (
                    <span className="type-caption text-muted-foreground">
                      {copy.review.rating[selected.rating]},{" "}
                      {copy.review.writtenAt(selected.writtenAt)}
                    </span>
                  ) : null}
                  <ReviewBody item={selected} size="large" />
                </div>

                <section className="flex flex-col gap-3">
                  <h2 className="type-caption text-muted-foreground">
                    {copy.reportCount(reportTotal(selected))}
                  </h2>
                  <ReasonTally item={selected} />
                  {selected.notes.length > 0 ? (
                    <div className="flex flex-col gap-1 pt-2">
                      <p className="type-caption text-muted-foreground">
                        {copy.noteTitle}
                      </p>
                      {selected.notes.map((n) => (
                        <p key={n} className="type-body-sm break-keep">
                          {n}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </section>

                <section className="flex flex-col gap-3 border-t border-border pt-6">
                  <h2 className="type-caption text-muted-foreground">
                    {copy.author.title}
                  </h2>
                  <AuthorSummary
                    author={author}
                    onSuspend={() => setSuspendOpen(true)}
                    disabled={disabled}
                  />
                </section>

                {reasonStep ? (
                  <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)] motion-safe:slide-in-from-bottom-1">
                    <HideReasonFieldset
                      item={selected}
                      value={chosen}
                      onChange={setReason}
                    />
                  </div>
                ) : null}
              </article>
              <ActionBar>
                {reasonStep ? (
                  <>
                    <Button
                      variant="primary"
                      onClick={() => decide("hidden")}
                      disabled={disabled}
                    >
                      {copy.actions.hideWithReason(copy.reasons[chosen])}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setReasonStep(false)}
                    >
                      {commonCopy.actions.cancel}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="primary"
                      onClick={() => setReasonStep(true)}
                      disabled={disabled}
                      className="gap-3"
                    >
                      {selected.autoHidden
                        ? copy.actions.confirmHide
                        : copy.actions.hide}
                      <span className="hidden desktop:inline-flex">
                        <Kbd onPrimary>H</Kbd>
                      </span>
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => decide("restored")}
                      disabled={disabled}
                      className="gap-3"
                    >
                      {selected.autoHidden
                        ? copy.actions.restore
                        : copy.actions.keep}
                      <span className="hidden desktop:inline-flex">
                        <Kbd>R</Kbd>
                      </span>
                    </Button>
                  </>
                )}
                <span className="ml-auto hidden type-caption text-muted-foreground tabular-nums desktop:inline">
                  {copy.queue.position(index + 1, items.length)}
                </span>
              </ActionBar>
            </>
          ) : null
        }
      />
      <SuspendDialog
        user={author}
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        onConfirm={(d, r) =>
          author && lab.setSuspended(author.id, "suspended", d, r)
        }
      />
    </>
  );
}

/* ---------- 폐업 제보 ---------- */

function ClosuresPane({
  lab,
  params,
  disabled,
}: {
  lab: AdminLab;
  params: AdminParams;
  disabled: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    lab.closures[0]?.id ?? null,
  );
  const [detailOpen, setDetailOpen] = useState(params.item !== null);
  const [confirmOpen, setConfirmOpen] = useState(params.confirm === "closed");
  const list = lab.closures;
  const index = Math.max(
    0,
    list.findIndex((c) => c.id === selectedId),
  );
  const selected: ClosureItem | undefined = list[index];

  const decide = (result: "confirm" | "dismiss") => {
    if (!selected || disabled) return;
    const next = list[index + 1] ?? list[index - 1];
    lab.decideClosure(selected, result);
    setSelectedId(next?.id ?? null);
  };

  if (list.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <PaneHead title={copy.sections.closures} count={0} />
        <div className="px-6 py-14 desktop:px-14">
          <EmptyState
            title={copy.states.emptyTitle}
            body={copy.states.emptyBody}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <ListDetail
        detailOpen={detailOpen}
        onBack={() => setDetailOpen(false)}
        list={
          <>
            <PaneHead title={copy.sections.closures} count={list.length} />
            <ul aria-label={copy.table.closuresCaption}>
              {list.map((c) => (
                <ListRow
                  key={c.id}
                  selected={c.id === selected?.id}
                  leaving={lab.leaving.has(c.id)}
                  onSelect={() => {
                    setSelectedId(c.id);
                    setDetailOpen(true);
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <ClosureStatus c={c} />
                    <span className="type-caption text-muted-foreground tabular-nums">
                      {c.lastReportedAt}
                    </span>
                  </div>
                  <span
                    className={cn("type-label", !c.placeName && "tabular-nums")}
                  >
                    {c.placeName ?? copy.place.idLabel(c.placeId)}
                  </span>
                  <span className="type-caption text-muted-foreground tabular-nums">
                    {copy.closures.countLabel} {closedCount(c)},{" "}
                    {copy.closures.kinds.today} {c.today}
                  </span>
                </ListRow>
              ))}
            </ul>
          </>
        }
        detail={
          selected ? (
            <>
              <article
                key={selected.id}
                className="flex flex-col gap-8 px-6 pt-5 pb-10 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)] desktop:px-10 desktop:pt-10"
              >
                <div className="flex flex-col gap-3">
                  <ClosureStatus c={selected} />
                  <PlaceLine
                    placeId={selected.placeId}
                    placeName={selected.placeName}
                    size="heading"
                    showHint
                  />
                  <p className="type-body-sm break-keep text-muted-foreground">
                    {closedCount(selected) >= 3
                      ? copy.closures.excludedHelp
                      : copy.closures.openHelp}
                  </p>
                </div>
                <ClosureNumbers c={selected} />
                <p className="type-caption text-muted-foreground">
                  {copy.closures.todayNote}
                </p>
              </article>
              <ActionBar>
                <Button
                  variant="primary"
                  onClick={() => setConfirmOpen(true)}
                  disabled={disabled}
                >
                  {copy.actions.confirmClosed}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => decide("dismiss")}
                  disabled={disabled}
                >
                  {copy.actions.dismissClosed}
                </Button>
              </ActionBar>
            </>
          ) : null
        }
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={copy.confirm.closedTitle}
        body={copy.confirm.closedBody}
        action={copy.actions.confirmClosed}
        onConfirm={() => decide("confirm")}
      />
    </>
  );
}

function ClosureStatus({ c }: { c: ClosureItem }) {
  const excluded = closedCount(c) >= 3;
  return (
    <span className="inline-flex items-center gap-1.5 type-caption text-muted-foreground">
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          excluded ? "bg-foreground" : "border border-muted-foreground",
        )}
      />
      <span className={excluded ? "text-foreground" : undefined}>
        {excluded ? copy.status.excluded : copy.status.reported}
      </span>
    </span>
  );
}

export function ClosureNumbers({ c }: { c: ClosureItem }) {
  const cells = [
    [copy.closures.kinds.gone, c.gone],
    [copy.closures.kinds.moved, c.moved],
    [copy.closures.kinds.today, c.today],
  ] as const;
  return (
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
  );
}

/* ---------- 사용자 ---------- */

function UsersPane({
  lab,
  params,
  disabled,
}: {
  lab: AdminLab;
  params: AdminParams;
  disabled: boolean;
}) {
  const ordered = [...lab.users].sort(
    (a, b) =>
      Number(b.status === "suspended") - Number(a.status === "suspended") ||
      b.hiddenCount - a.hiddenCount ||
      b.reportsReceived - a.reportsReceived,
  );
  const [selectedId, setSelectedId] = useState<string>(
    params.confirm === "unsuspend"
      ? "u6"
      : (ordered.find((u) => u.status === "active")?.id ?? "u1"),
  );
  const [detailOpen, setDetailOpen] = useState(params.item !== null);
  const [dialogOpen, setDialogOpen] = useState(
    params.confirm === "suspend" || params.confirm === "unsuspend",
  );
  const selected: AdminAuthor = lab.userOf(selectedId);
  const theirs = REPORTED.filter((r) => r.authorId === selected.id);

  return (
    <>
      <ListDetail
        detailOpen={detailOpen}
        onBack={() => setDetailOpen(false)}
        list={
          <>
            <PaneHead title={copy.sections.users} />
            <ul aria-label={copy.table.usersCaption}>
              {ordered.map((u) => (
                <ListRow
                  key={u.id}
                  selected={u.id === selectedId}
                  leaving={false}
                  onSelect={() => {
                    setSelectedId(u.id);
                    setDetailOpen(true);
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="type-label">{u.nickname}</span>
                    {u.status === "suspended" ? (
                      <Badge variant="muted">{copy.status.suspended}</Badge>
                    ) : null}
                  </div>
                  <span className="type-caption text-muted-foreground tabular-nums">
                    {copy.author.received(u.reportsReceived)},{" "}
                    {copy.author.hiddenBefore(u.hiddenCount)}
                  </span>
                </ListRow>
              ))}
            </ul>
          </>
        }
        detail={
          <>
            <article
              key={selected.id}
              className="flex flex-col gap-8 px-6 pt-5 pb-10 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)] desktop:px-10 desktop:pt-10"
            >
              <div className="flex flex-col gap-2">
                <h2 className="type-title">{selected.nickname}</h2>
                <p className="type-caption text-muted-foreground">
                  {copy.users.provider[selected.provider]},{" "}
                  {copy.author.joined(selected.joined)}
                  {selected.status === "suspended"
                    ? `, ${copy.status.suspended} ${selected.suspendedUntil ? copy.users.suspendedUntil(selected.suspendedUntil) : copy.users.suspendedIndefinite}`
                    : ""}
                </p>
              </div>
              <dl className="grid grid-cols-2 divide-x divide-border">
                <div className="flex flex-col gap-1.5 pr-4">
                  <dt className="type-caption text-muted-foreground">
                    {copy.users.columns.received}
                  </dt>
                  <dd className="type-numeric-lg tabular-nums">
                    {selected.reportsReceived}
                  </dd>
                </div>
                <div className="flex flex-col gap-1.5 px-4">
                  <dt className="type-caption text-muted-foreground">
                    {copy.users.columns.hidden}
                  </dt>
                  <dd className="type-numeric-lg tabular-nums">
                    {selected.hiddenCount}
                  </dd>
                </div>
              </dl>
              {theirs.length > 0 ? (
                <section className="flex flex-col gap-3">
                  <h3 className="type-caption text-muted-foreground">
                    {copy.sections.reviews}
                  </h3>
                  <ul className="flex flex-col divide-y divide-border border-y border-border">
                    {theirs.map((r) => (
                      <li key={r.id} className="flex flex-col gap-1 py-3">
                        <span className="type-caption text-muted-foreground">
                          {copy.target[r.targetType]},{" "}
                          {r.placeName ?? copy.place.idLabel(r.placeId)}
                        </span>
                        <ReviewBody item={r} clamp />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </article>
            <ActionBar>
              {selected.status === "active" ? (
                <Button
                  variant="destructive"
                  onClick={() => setDialogOpen(true)}
                  disabled={disabled}
                >
                  {copy.actions.suspend}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => setDialogOpen(true)}
                  disabled={disabled}
                >
                  {copy.actions.unsuspend}
                </Button>
              )}
            </ActionBar>
          </>
        }
      />
      <SuspendDialog
        user={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={(d, r) =>
          lab.setSuspended(
            selected.id,
            selected.status === "active" ? "suspended" : "active",
            d,
            r,
          )
        }
      />
    </>
  );
}

/* ---------- 처리 이력 ---------- */

function LogPane({ lab }: { lab: AdminLab }) {
  return (
    <div className="flex flex-1 flex-col">
      <PaneHead title={copy.log.title} />
      <ul
        aria-label={copy.table.logCaption}
        className="flex flex-col divide-y divide-border px-6 desktop:max-w-3xl desktop:px-10"
      >
        {lab.log.map((e) => (
          <li key={e.id} className="py-4">
            <LogLine entry={e} lab={lab} />
          </li>
        ))}
      </ul>
      <p className="px-6 py-6 type-caption text-muted-foreground desktop:px-10">
        {copy.log.retention}
      </p>
    </div>
  );
}

/* ---------- 로딩 ---------- */

function ListDetailSkeleton() {
  return (
    <LoadingRegion
      label={copy.frame.loading}
      className="flex flex-1 desktop:grid desktop:grid-cols-[22rem_1fr]"
    >
      <div className="flex-1 desktop:border-r desktop:border-border">
        <div className="border-b border-border px-6 py-4">
          <SkeletonLine type="heading" className="w-32" />
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-2 border-b border-border px-6 py-4"
          >
            <SkeletonLine type="caption" className="w-20" />
            <SkeletonLine type="label" className="w-40" />
            <SkeletonLine type="body-sm" className="w-56" />
          </div>
        ))}
      </div>
      <div className="hidden flex-col gap-6 px-10 pt-10 desktop:flex">
        <SkeletonLine type="caption" className="w-28" />
        <SkeletonLine type="heading" className="w-60" />
        <SkeletonLine type="body" className="w-full max-w-xl" />
        <SkeletonLine type="body" className="w-3/4 max-w-lg" />
      </div>
    </LoadingRegion>
  );
}
