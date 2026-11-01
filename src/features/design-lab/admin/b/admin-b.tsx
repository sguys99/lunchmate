"use client";
// 관리자 시안 B: 표와 일괄 처리 (T8.5a).
// 위에 구역 탭(검토 대기 수), 그 아래 상태 칩과 찾기 칸, 본문은 데이터 표. 줄 맨 앞 체크로 여러 건을 고르면
// 화면 아래에 일괄 처리 줄(N건 선택됨 + 숨기기 + 복구 + 선택 해제)이 올라온다. 숨기기와 복구는 확인 상자를 한 번 거친다.
// 내용 칸의 "펼치기"로 줄 아래에 글 전체, 기타 사유, 작성자를 연다. 처리한 줄은 흐려지며 빠진다.
// 390: 표 대신 같은 열을 쌓은 줄 목록(체크 + 제목 + 메타 한 줄). 일괄 처리 줄은 그대로 아래에 붙는다.
import { ChevronDown } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  EmptyState,
  ErrorState,
  LoadingRegion,
  SkeletonLine,
} from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminLabCopy as copy } from "@/copy/design-lab-admin";
import { cn } from "@/lib/utils";
import {
  closedCount,
  topReason,
  type AdminAuthor,
  type ClosureItem,
  type LogEntry,
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
  OfflineBanner,
  PlaceLine,
  ReasonTally,
  ReviewBody,
  SuspendDialog,
  reportTotal,
  sectionCount,
  useAdminLab,
  type AdminLab,
  type DoneItem,
} from "../shared";

export function AdminB({ params }: { params: AdminParams }) {
  const lab = useAdminLab(params);
  const [section, setSection] = useState<AdminSection>(params.section);
  const offline = params.state === "offline";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 pt-5 desktop:px-10 desktop:pt-8">
          <div className="flex items-baseline justify-between gap-3">
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
              aria-label={copy.frame.navLabel}
              className="overflow-x-auto border-b-0"
            >
              {ADMIN_SECTIONS.map((s) => {
                const n = sectionCount(lab, s);
                return (
                  <TabsTrigger key={s} value={s}>
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
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-6 pb-28 desktop:px-10">
        {params.state === "loading" ? (
          <TableSkeleton />
        ) : params.state === "error" ? (
          <div className="py-10">
            <ErrorState
              title={copy.states.errorTitle}
              body={copy.states.errorBody}
              action={{ onClick: () => undefined }}
            />
          </div>
        ) : section === "reviews" ? (
          <ReviewsTable
            lab={lab}
            params={params}
            disabled={offline}
            onLog={() => setSection("log")}
          />
        ) : section === "closures" ? (
          <ClosuresTable lab={lab} params={params} disabled={offline} />
        ) : section === "users" ? (
          <UsersTable lab={lab} params={params} disabled={offline} />
        ) : (
          <LogTable lab={lab} />
        )}
      </main>
      <AdminToaster />
    </div>
  );
}

/* ---------- 반응형 표 ---------- */

type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  /** 390 줄 목록에서의 자리: title(윗줄), meta(아래 caption 줄), hide */
  mobile: "title" | "meta" | "body" | "hide";
  numeric?: boolean;
};

function DataTable<T extends { id: string }>({
  caption,
  rows,
  columns,
  leaving,
  select,
  expanded,
  renderExpanded,
  rowEnd,
}: {
  caption: string;
  rows: readonly T[];
  columns: readonly Column<T>[];
  leaving?: ReadonlySet<string>;
  select?: {
    selected: ReadonlySet<string>;
    toggle: (id: string) => void;
    toggleAll: () => void;
    label: (row: T) => string;
  };
  expanded?: ReadonlySet<string>;
  renderExpanded?: (row: T) => ReactNode;
  rowEnd?: (row: T) => ReactNode;
}) {
  const allChecked = select
    ? rows.length > 0 && rows.every((r) => select.selected.has(r.id))
    : false;
  const someChecked = select
    ? rows.some((r) => select.selected.has(r.id))
    : false;
  const colSpan = columns.length + (select ? 1 : 0) + (rowEnd ? 1 : 0);
  return (
    <>
      {/* 데스크톱 표 */}
      <div className="hidden desktop:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-border">
              {select ? (
                <th scope="col" className="w-12 py-3 pr-2">
                  <label className="flex min-h-11 items-center">
                    <span className="sr-only">{copy.actions.selectAll}</span>
                    <Checkbox
                      checked={allChecked}
                      indeterminate={someChecked && !allChecked}
                      onCheckedChange={select.toggleAll}
                    />
                  </label>
                </th>
              ) : null}
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    "py-3 pr-4 type-caption font-medium whitespace-nowrap text-muted-foreground",
                    c.numeric && "text-right",
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
              {rowEnd ? (
                <th scope="col" className="sr-only">
                  {copy.actions.more}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isLeaving = leaving?.has(row.id) ?? false;
              const checked = select?.selected.has(row.id) ?? false;
              const open = expanded?.has(row.id) ?? false;
              return (
                <RowGroup key={row.id}>
                  <tr
                    aria-hidden={isLeaving || undefined}
                    className={cn(
                      "border-b border-border align-top transition-[opacity,translate] duration-(--lm-duration-base) ease-exit motion-reduce:transition-none",
                      checked && "bg-card",
                      isLeaving && "translate-x-2 opacity-0",
                      open && "border-b-0",
                    )}
                  >
                    {select ? (
                      <td className="py-3 pr-2">
                        <label className="flex min-h-11 items-center">
                          <span className="sr-only">{select.label(row)}</span>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => select.toggle(row.id)}
                          />
                        </label>
                      </td>
                    ) : null}
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          "py-3.5 pr-4 type-body-sm",
                          c.numeric && "text-right tabular-nums",
                          c.className,
                        )}
                      >
                        {c.cell(row)}
                      </td>
                    ))}
                    {rowEnd ? (
                      <td className="py-2 text-right whitespace-nowrap">
                        {rowEnd(row)}
                      </td>
                    ) : null}
                  </tr>
                  {open && renderExpanded ? (
                    <tr
                      className={cn(
                        "border-b border-border",
                        checked && "bg-card",
                      )}
                    >
                      <td colSpan={colSpan} className="pb-6 pl-12">
                        <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)] motion-safe:slide-in-from-top-1">
                          {renderExpanded(row)}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </RowGroup>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 390 줄 목록 */}
      <ul
        aria-label={caption}
        className="flex flex-col border-t border-border desktop:hidden"
      >
        {rows.map((row) => {
          const isLeaving = leaving?.has(row.id) ?? false;
          const checked = select?.selected.has(row.id) ?? false;
          const open = expanded?.has(row.id) ?? false;
          const titles = columns.filter((c) => c.mobile === "title");
          const bodies = columns.filter((c) => c.mobile === "body");
          const metas = columns.filter((c) => c.mobile === "meta");
          return (
            <li
              key={row.id}
              aria-hidden={isLeaving || undefined}
              className={cn(
                "grid border-b border-border transition-[grid-template-rows,opacity] duration-(--lm-duration-base) ease-exit motion-reduce:transition-none",
                isLeaving ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr]",
                checked && "bg-card",
              )}
            >
              <div
                className={cn(
                  "flex min-h-0 gap-3 py-3",
                  isLeaving && "overflow-hidden",
                )}
              >
                {select ? (
                  <label className="flex min-h-11 shrink-0 items-start pt-2.5">
                    <span className="sr-only">{select.label(row)}</span>
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => select.toggle(row.id)}
                    />
                  </label>
                ) : null}
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    {titles.map((c) => (
                      <div key={c.key} className="min-w-0">
                        {c.cell(row)}
                      </div>
                    ))}
                  </div>
                  {bodies.map((c) => (
                    <div key={c.key} className="type-body-sm">
                      {c.cell(row)}
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 type-caption text-muted-foreground">
                    {metas.map((c) => (
                      <span
                        key={c.key}
                        className="inline-flex items-center gap-1"
                      >
                        {c.cell(row)}
                      </span>
                    ))}
                  </div>
                  {open && renderExpanded ? (
                    <div className="pt-2">{renderExpanded(row)}</div>
                  ) : null}
                  {rowEnd ? (
                    <div className="-ml-1 flex flex-wrap gap-2 pt-1">
                      {rowEnd(row)}
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function RowGroup({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/** 화면 아래 일괄 처리 줄 */
function BulkBar({ count, children }: { count: number; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)] motion-safe:slide-in-from-bottom-2">
      <div
        role="region"
        aria-label={copy.table.selected(count)}
        className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3 desktop:px-10 desktop:py-4"
      >
        <span className="type-label tabular-nums" aria-live="polite">
          {copy.table.selected(count)}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ---------- 신고된 후기 ---------- */

type Filter = "pending" | "auto" | "done";

function ReviewsTable({
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
  const [filter, setFilter] = useState<Filter>("pending");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        params.select || params.confirm === "bulk"
          ? lab.items.slice(0, 3).map((i) => i.id)
          : [],
      ),
  );
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(params.item ? [params.item] : []),
  );
  const [dialog, setDialog] = useState<"hide" | "restore" | null>(
    params.confirm === "bulk" ? "hide" : null,
  );
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [suspendUser, setSuspendUser] = useState<AdminAuthor | null>(null);

  const q = query.trim();
  const rows = useMemo(() => {
    const base =
      filter === "auto" ? lab.items.filter((i) => i.autoHidden) : lab.items;
    if (!q) return base;
    return base.filter(
      (i) =>
        i.placeId.includes(q) ||
        lab.userOf(i.authorId).nickname.includes(q) ||
        (i.placeName ?? "").includes(q),
    );
  }, [filter, lab, q]);
  const chosen = lab.items.filter((i) => selected.has(i.id));
  const presetReason = chosen[0] ? topReason(chosen[0]) : "other";
  const hideReason = reason ?? presetReason;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) =>
      rows.every((r) => prev.has(r.id))
        ? new Set()
        : new Set(rows.map((r) => r.id)),
    );
  const toggleOpen = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const apply = (result: "hidden" | "restored") => {
    lab.decide(chosen, result, result === "hidden" ? hideReason : null);
    setSelected(new Set());
    setReason(null);
  };

  const columns: Column<ReportedItem>[] = [
    {
      key: "target",
      header: copy.table.columns.target,
      mobile: "title",
      className: "w-44",
      cell: (i) => (
        <div className="flex flex-col gap-0.5">
          <span className="type-caption text-muted-foreground">
            {copy.target[i.targetType]}
          </span>
          <PlaceLine placeId={i.placeId} placeName={i.placeName} />
        </div>
      ),
    },
    {
      key: "body",
      header: copy.table.columns.body,
      mobile: "body",
      cell: (i) => (
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <ReviewBody item={i} clamp={!expanded.has(i.id)} />
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-expanded={expanded.has(i.id)}
            aria-label={
              expanded.has(i.id) ? copy.actions.collapse : copy.actions.expand
            }
            onClick={() => toggleOpen(i.id)}
            className="-mt-1.5 shrink-0 text-muted-foreground"
          >
            <ChevronDown
              aria-hidden
              className={cn(
                "size-4 transition-transform duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
                expanded.has(i.id) && "rotate-180",
              )}
            />
          </Button>
        </div>
      ),
    },
    {
      key: "reasons",
      header: copy.table.columns.reasons,
      mobile: "meta",
      className: "w-40",
      cell: (i) => <ReasonTally item={i} max={2} />,
    },
    {
      key: "count",
      header: copy.table.columns.count,
      mobile: "hide",
      numeric: true,
      className: "w-16",
      cell: (i) => <span className="type-numeric-md">{reportTotal(i)}</span>,
    },
    {
      key: "author",
      header: copy.table.columns.author,
      mobile: "meta",
      className: "w-28",
      cell: (i) => (
        <span className="break-keep">{lab.userOf(i.authorId).nickname}</span>
      ),
    },
    {
      key: "status",
      header: copy.table.columns.status,
      mobile: "meta",
      className: "w-24",
      cell: (i) => <ItemStatus item={i} />,
    },
    {
      key: "at",
      header: copy.table.columns.at,
      mobile: "meta",
      className: "w-28 whitespace-nowrap",
      cell: (i) => (
        <span className="text-muted-foreground tabular-nums">
          {i.firstReportedAt}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Toolbar
        filter={filter}
        onFilter={setFilter}
        query={query}
        onQuery={setQuery}
        counts={{
          pending: lab.items.length,
          auto: lab.items.filter((i) => i.autoHidden).length,
          done: lab.done.length,
        }}
      />
      {filter === "done" ? (
        <DoneTable done={lab.done} lab={lab} />
      ) : rows.length === 0 ? (
        <div className="py-10">
          <EmptyState
            title={copy.states.emptyTitle}
            body={copy.states.emptyBody}
            action={{ label: copy.states.emptyAction, onClick: onLog }}
          />
        </div>
      ) : (
        <DataTable
          caption={copy.table.caption}
          rows={rows}
          columns={columns}
          leaving={lab.leaving}
          expanded={expanded}
          select={{
            selected,
            toggle,
            toggleAll,
            label: (i) =>
              copy.actions.selectRow(
                `${copy.target[i.targetType]} ${i.placeName ?? i.placeId}`,
              ),
          }}
          renderExpanded={(i) => (
            <div className="flex max-w-2xl flex-col gap-4">
              {i.rating ? (
                <span className="type-caption text-muted-foreground">
                  {copy.review.rating[i.rating]},{" "}
                  {copy.review.writtenAt(i.writtenAt)}
                </span>
              ) : null}
              <ReasonTally item={i} />
              {i.notes.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <p className="type-caption text-muted-foreground">
                    {copy.noteTitle}
                  </p>
                  {i.notes.map((n) => (
                    <p key={n} className="type-body-sm">
                      {n}
                    </p>
                  ))}
                </div>
              ) : null}
              <AuthorSummary
                author={lab.userOf(i.authorId)}
                onSuspend={() => setSuspendUser(lab.userOf(i.authorId))}
                disabled={disabled}
              />
            </div>
          )}
        />
      )}

      <BulkBar count={chosen.length}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelected(new Set())}
        >
          {copy.actions.clearSelection}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setDialog("restore")}
          disabled={disabled}
        >
          {copy.actions.restore}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setDialog("hide")}
          disabled={disabled}
        >
          {copy.actions.hide}
        </Button>
      </BulkBar>

      <ConfirmDialog
        open={dialog === "hide" && chosen.length > 0}
        onOpenChange={(o) => !o && setDialog(null)}
        title={copy.confirm.bulkHideTitle(chosen.length)}
        body={copy.confirm.bulkHideBody}
        action={copy.actions.hideWithReason(copy.reasons[hideReason])}
        onConfirm={() => apply("hidden")}
      >
        {chosen[0] ? (
          <HideReasonFieldset
            item={chosen[0]}
            value={hideReason}
            onChange={setReason}
            showTitle={false}
          />
        ) : null}
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "restore" && chosen.length > 0}
        onOpenChange={(o) => !o && setDialog(null)}
        title={copy.confirm.bulkRestoreTitle(chosen.length)}
        body={copy.confirm.bulkRestoreBody}
        action={copy.actions.restore}
        onConfirm={() => apply("restored")}
      />
      <SuspendDialog
        user={suspendUser}
        open={suspendUser !== null}
        onOpenChange={(o) => !o && setSuspendUser(null)}
        onConfirm={(d, r) =>
          suspendUser && lab.setSuspended(suspendUser.id, "suspended", d, r)
        }
      />
    </div>
  );
}

function Toolbar({
  filter,
  onFilter,
  query,
  onQuery,
  counts,
}: {
  filter: Filter;
  onFilter: (f: Filter) => void;
  query: string;
  onQuery: (q: string) => void;
  counts: Record<Filter, number>;
}) {
  const labels: Record<Filter, string> = {
    pending: copy.status.pending,
    auto: copy.status.autoHidden,
    done: copy.status.done,
  };
  return (
    <div className="flex flex-col gap-3 desktop:flex-row desktop:items-center desktop:justify-between">
      <ChipGroup
        aria-label={copy.table.filterStatus}
        value={[filter]}
        onValueChange={(v) => {
          const next = v[0] as Filter | undefined;
          if (next) onFilter(next);
        }}
      >
        {(Object.keys(labels) as Filter[]).map((f) => (
          <Chip key={f} value={f}>
            {labels[f]}
            <span className="text-muted-foreground tabular-nums">
              {counts[f]}
            </span>
          </Chip>
        ))}
      </ChipGroup>
      <label className="flex flex-col gap-1 desktop:w-72">
        <span className="sr-only">{copy.table.searchLabel}</span>
        <Input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={copy.table.searchPlaceholder}
          className="h-11"
        />
      </label>
    </div>
  );
}

function DoneTable({
  done,
  lab,
}: {
  done: readonly DoneItem[];
  lab: AdminLab;
}) {
  if (done.length === 0) {
    return (
      <div className="py-10">
        <EmptyState
          title={copy.states.emptyTitle}
          body={copy.states.emptyBody}
        />
      </div>
    );
  }
  const rows = done.map((d) => ({ ...d, id: d.item.id }));
  return (
    <DataTable
      caption={copy.status.done}
      rows={rows}
      columns={[
        {
          key: "target",
          header: copy.table.columns.target,
          mobile: "title",
          cell: (d) => (
            <PlaceLine placeId={d.item.placeId} placeName={d.item.placeName} />
          ),
        },
        {
          key: "body",
          header: copy.table.columns.body,
          mobile: "body",
          cell: (d) => <ReviewBody item={d.item} clamp />,
        },
        {
          key: "status",
          header: copy.table.columns.status,
          mobile: "meta",
          cell: (d) => (
            <Badge variant="neutral">
              {d.result === "hidden"
                ? copy.status.hiddenByAdmin
                : copy.status.restored}
            </Badge>
          ),
        },
        {
          key: "author",
          header: copy.table.columns.author,
          mobile: "meta",
          cell: (d) => lab.userOf(d.item.authorId).nickname,
        },
      ]}
    />
  );
}

/* ---------- 폐업 제보 ---------- */

function ClosuresTable({
  lab,
  params,
  disabled,
}: {
  lab: AdminLab;
  params: AdminParams;
  disabled: boolean;
}) {
  const [confirm, setConfirm] = useState<ClosureItem | null>(
    params.confirm === "closed" ? (lab.closures[0] ?? null) : null,
  );
  if (lab.closures.length === 0) {
    return (
      <div className="py-10">
        <EmptyState
          title={copy.states.emptyTitle}
          body={copy.states.emptyBody}
        />
      </div>
    );
  }
  const num = (n: number) => <span className="type-numeric-md">{n}</span>;
  return (
    <div className="flex flex-col gap-5">
      <p className="type-body-sm text-muted-foreground">
        {copy.closures.todayNote}
      </p>
      <DataTable
        caption={copy.table.closuresCaption}
        rows={lab.closures}
        leaving={lab.leaving}
        columns={[
          {
            key: "place",
            header: copy.table.columns.target,
            mobile: "title",
            cell: (c) => (
              <PlaceLine placeId={c.placeId} placeName={c.placeName} />
            ),
          },
          {
            key: "gone",
            header: copy.closures.kinds.gone,
            mobile: "meta",
            numeric: true,
            className: "w-28",
            cell: (c) => (
              <MobileLabel label={copy.closures.kinds.gone}>
                {num(c.gone)}
              </MobileLabel>
            ),
          },
          {
            key: "moved",
            header: copy.closures.kinds.moved,
            mobile: "meta",
            numeric: true,
            className: "w-24",
            cell: (c) => (
              <MobileLabel label={copy.closures.kinds.moved}>
                {num(c.moved)}
              </MobileLabel>
            ),
          },
          {
            key: "today",
            header: copy.closures.kinds.today,
            mobile: "meta",
            numeric: true,
            className: "w-28",
            cell: (c) => (
              <MobileLabel label={copy.closures.kinds.today}>
                {num(c.today)}
              </MobileLabel>
            ),
          },
          {
            key: "status",
            header: copy.table.columns.status,
            mobile: "title",
            className: "w-32",
            cell: (c) => (
              <Badge variant={closedCount(c) >= 3 ? "default" : "muted"}>
                {closedCount(c) >= 3
                  ? copy.status.excluded
                  : copy.status.reported}
              </Badge>
            ),
          },
          {
            key: "at",
            header: copy.table.columns.at,
            mobile: "meta",
            className: "w-32 whitespace-nowrap",
            cell: (c) => (
              <span className="text-muted-foreground tabular-nums">
                {c.lastReportedAt}
              </span>
            ),
          },
        ]}
        rowEnd={(c) => (
          <span className="inline-flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => lab.decideClosure(c, "dismiss")}
              disabled={disabled}
            >
              {copy.actions.dismissClosed}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirm(c)}
              disabled={disabled}
            >
              {copy.actions.confirmClosed}
            </Button>
          </span>
        )}
      />
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={copy.confirm.closedTitle}
        body={copy.confirm.closedBody}
        action={copy.actions.confirmClosed}
        onConfirm={() => confirm && lab.decideClosure(confirm, "confirm")}
      />
    </div>
  );
}

/** 390 줄 목록에서만 숫자 앞에 라벨을 붙인다(표에서는 머리 칸이 라벨) */
function MobileLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <>
      <span className="desktop:sr-only">{label}</span>
      {children}
    </>
  );
}

/* ---------- 사용자 ---------- */

function UsersTable({
  lab,
  params,
  disabled,
}: {
  lab: AdminLab;
  params: AdminParams;
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<AdminAuthor | null>(
    params.confirm === "suspend"
      ? lab.userOf("u5")
      : params.confirm === "unsuspend"
        ? lab.userOf("u6")
        : null,
  );
  const q = query.trim();
  const rows = [...lab.users]
    .filter((u) => !q || u.nickname.includes(q))
    .sort(
      (a, b) =>
        b.hiddenCount - a.hiddenCount || b.reportsReceived - a.reportsReceived,
    );
  const current = target ? lab.userOf(target.id) : null;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 desktop:flex-row desktop:items-center desktop:justify-between">
        <p className="type-body-sm text-muted-foreground">
          {copy.users.candidatesHelp}
        </p>
        <label className="desktop:w-72">
          <span className="sr-only">{copy.users.searchLabel}</span>
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={copy.users.searchPlaceholder}
            className="h-11"
          />
        </label>
      </div>
      <DataTable
        caption={copy.table.usersCaption}
        rows={rows}
        columns={[
          {
            key: "nick",
            header: copy.users.columns.nickname,
            mobile: "title",
            cell: (u) => <span className="type-label">{u.nickname}</span>,
          },
          {
            key: "provider",
            header: copy.users.columns.provider,
            mobile: "meta",
            className: "w-24",
            cell: (u) => copy.users.provider[u.provider],
          },
          {
            key: "received",
            header: copy.users.columns.received,
            mobile: "meta",
            numeric: true,
            className: "w-24",
            cell: (u) => (
              <MobileLabel label={copy.users.columns.received}>
                <span className="type-numeric-md">{u.reportsReceived}</span>
              </MobileLabel>
            ),
          },
          {
            key: "hidden",
            header: copy.users.columns.hidden,
            mobile: "meta",
            numeric: true,
            className: "w-24",
            cell: (u) => (
              <MobileLabel label={copy.users.columns.hidden}>
                <span className="type-numeric-md">{u.hiddenCount}</span>
              </MobileLabel>
            ),
          },
          {
            key: "status",
            header: copy.users.columns.status,
            mobile: "title",
            className: "w-36",
            cell: (u) =>
              u.status === "suspended" ? (
                <Badge variant="default">
                  {copy.status.suspended},{" "}
                  {u.suspendedUntil
                    ? copy.users.suspendedUntil(u.suspendedUntil)
                    : copy.users.suspendedIndefinite}
                </Badge>
              ) : (
                <span className="text-muted-foreground">
                  {copy.status.active}
                </span>
              ),
          },
          {
            key: "joined",
            header: copy.users.columns.joined,
            mobile: "hide",
            className: "w-24 whitespace-nowrap",
            cell: (u) => (
              <span className="text-muted-foreground">{u.joined}</span>
            ),
          },
        ]}
        rowEnd={(u) =>
          u.status === "active" ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setTarget(u)}
              disabled={disabled}
            >
              {copy.actions.suspend}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setTarget(u)}
              disabled={disabled}
            >
              {copy.actions.unsuspend}
            </Button>
          )
        }
      />
      <SuspendDialog
        user={current}
        open={current !== null}
        onOpenChange={(o) => !o && setTarget(null)}
        onConfirm={(d, r) =>
          current &&
          lab.setSuspended(
            current.id,
            current.status === "active" ? "suspended" : "active",
            d,
            r,
          )
        }
      />
    </div>
  );
}

/* ---------- 처리 이력 ---------- */

function LogTable({ lab }: { lab: AdminLab }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="type-body-sm text-muted-foreground">{copy.log.retention}</p>
      <DataTable<LogEntry>
        caption={copy.table.logCaption}
        rows={lab.log}
        columns={[
          {
            key: "at",
            header: copy.log.columns.at,
            mobile: "meta",
            className: "w-32 whitespace-nowrap",
            cell: (e) => (
              <span className="text-muted-foreground tabular-nums">{e.at}</span>
            ),
          },
          {
            key: "action",
            header: copy.log.columns.action,
            mobile: "title",
            className: "w-44",
            cell: (e) => (
              <span
                className={cn(
                  "type-label",
                  e.undone && "text-muted-foreground line-through",
                )}
              >
                {copy.log.actions[e.action]}
              </span>
            ),
          },
          {
            key: "target",
            header: copy.log.columns.target,
            mobile: "body",
            cell: (e) => e.target,
          },
          {
            key: "reason",
            header: copy.log.columns.reason,
            mobile: "meta",
            className: "w-40",
            cell: (e) => e.reason ?? "",
          },
          {
            key: "by",
            header: copy.log.columns.by,
            mobile: "meta",
            className: "w-24",
            cell: (e) => e.by ?? copy.log.system,
          },
        ]}
        rowEnd={(e) =>
          !e.undone && lab.canUndo(e.id) ? (
            <LogLineUndo entry={e} lab={lab} />
          ) : null
        }
      />
    </div>
  );
}

function LogLineUndo({ entry, lab }: { entry: LogEntry; lab: AdminLab }) {
  return (
    <Button variant="link" onClick={() => lab.undo([entry.id])}>
      {copy.actions.undo}
    </Button>
  );
}

/* ---------- 로딩 ---------- */

function TableSkeleton() {
  return (
    <LoadingRegion label={copy.frame.loading} className="flex flex-col gap-5">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <SkeletonLine
            key={i}
            type="label"
            className="h-10 w-24 rounded-chip"
          />
        ))}
      </div>
      <div className="flex flex-col border-t border-border">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center gap-6 border-b border-border py-4"
          >
            <SkeletonLine type="caption" className="size-5" />
            <SkeletonLine type="label" className="w-32" />
            <SkeletonLine type="body-sm" className="w-full max-w-md" />
            <SkeletonLine
              type="caption"
              className="hidden w-20 desktop:block"
            />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}
