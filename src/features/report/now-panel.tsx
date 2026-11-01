"use client";
// 상세 "지금" 행 안: 웨이팅 한 탭 + 할인 목록과 아직 해요/끝났어요 (T6.20, T6.21, T6.24, D-10 안건 9, 12, D-13).
// - 웨이팅(B 결과 줄): 누르면 고른 버튼만 남고 아래 "12시 24분에 알렸습니다. 30분 동안 다른 분들께 보입니다." + 취소(2분 안).
//   2분이 지나면 "12시 54분부터 다시 알릴 수 있습니다." 취소하면 행을 지우고 30분 제한도 풀려 세 버튼이 돌아온다. 고리 없음.
// - 할인(B 결과 줄 + C 점 3개): 유형 + 출처 배지 + 내용 + 메타, 아직 해요/끝났어요를 누르면 버튼 자리에 결과 줄 + 되돌리기.
//   끝났어요 누적 점 3개(서로 다른 3명이면 DB가 바로 숨김), 끝났어요를 누른 줄은 흐려진다. 목록 끝에 고지 두 줄.
// - 토스트는 결과에 쓰지 않는다(오류와 오프라인 안내만). 오프라인이면 쓰기 버튼은 aria-disabled + 안내 토스트.
// - 할인은 표시만 한다. 추천 점수와 무관(원칙 6, AC-DEAL-2).
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { WaitingLevel } from "@/components/badges/pick-badges";
import { LoadingRegion, SkeletonLine } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/lazy-toaster";
import { badgeCopy } from "@/copy/badges";
import { moderationCopy } from "@/copy/moderation";
import { placeCopy } from "@/copy/place";
import { reportCopy } from "@/copy/report";
import type { PlaceDeal } from "@/features/place/place-stats-model";
import { usePlaceDeals } from "@/features/place/use-place-stats";
import { track } from "@/lib/analytics/track";
import { invalidateAfterWrite } from "@/lib/query/db-keys";
import type { WriteFailure } from "@/lib/supabase/write-result";
import { cn } from "@/lib/utils";
import {
  checkDealAction,
  reportWaitAction,
  undoDealCheckAction,
  undoWaitAction,
} from "./actions";
import {
  CheckPair,
  DealNotice,
  DealReportButton,
  DealRow,
  EndedTally,
  InlineResult,
  WaitButtons,
  enterClass,
  reportCls,
} from "./deal-parts";
import {
  clockText,
  dealCounts,
  dealMeta,
  msToNextWaitPhase,
  waitEventLevel,
  waitPhase,
  type DealAnswer,
  type MyWait,
} from "./flow";

const copy = reportCopy;

export type NowPanelProps = {
  placeId: string;
  /** 30분 안의 최신 웨이팅(집계) */
  waiting: { level: WaitingLevel; minutesAgo: number } | null;
  online: boolean;
  /** "지금" 행이 펼쳐져 있다(deal_viewed는 보일 때만) */
  active: boolean;
  onOpenDeal: (opener: HTMLElement) => void;
  onReportDeal: (deal: PlaceDeal, opener: HTMLElement) => void;
  onSignedOut: () => void;
};

function offlineToast() {
  void toast(copy.sheet.offlineToast);
}

/** 한 탭 쓰기 실패 안내(결과가 아니라 오류라 토스트) */
function failToast(f: WriteFailure, onSignedOut: () => void) {
  if (f.error === "unauthenticated") {
    onSignedOut();
    return;
  }
  if (f.error === "limit") {
    void toast(moderationCopy.limits[f.bucket].title, {
      description: moderationCopy.limits[f.bucket].body,
    });
    return;
  }
  if (f.error === "cooldown") return;
  const m = moderationCopy.errors[f.error];
  void toast(m.title, { description: m.body });
}

export function NowPanel(props: NowPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <WaitBlock {...props} />
      <DealSection {...props} />
    </div>
  );
}

/* ---------- 웨이팅 (PLACE-07) ---------- */

function WaitBlock({ placeId, waiting, online, onSignedOut }: NowPanelProps) {
  const client = useQueryClient();
  const [mine, setMine] = useState<MyWait | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [busy, setBusy] = useState(false);
  const [undone, setUndone] = useState(false);
  const resultRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<"result" | "button" | null>(null);

  // 2분(취소) → 30분(다시 알림) 경계에서 다시 그린다
  useEffect(() => {
    const ms = msToNextWaitPhase(mine, new Date());
    if (ms === null) return;
    const id = setTimeout(() => setNow(new Date()), ms + 50);
    return () => clearTimeout(id);
  }, [mine, now]);

  useEffect(() => {
    if (focusNext.current === "result") resultRef.current?.focus();
    if (focusNext.current === "button") buttonRef.current?.focus();
    focusNext.current = null;
  });

  const phase = waitPhase(mine, now);

  async function pick(level: WaitingLevel) {
    if (!online) return offlineToast();
    if (busy || phase !== "idle") return;
    setBusy(true);
    setUndone(false);
    const r = await reportWaitAction({ placeId, level });
    setBusy(false);
    if (!r.ok) {
      if (r.error === "cooldown") {
        setMine({ kind: "cooldown", retryAt: r.retryAt });
        setNow(new Date());
        focusNext.current = "result";
      } else failToast(r, onSignedOut);
      return;
    }
    setMine({
      kind: "sent",
      level,
      reportId: r.reportId,
      reportedAt: r.reportedAt,
      undoUntil: r.undoUntil,
      retryAt: r.retryAt,
    });
    setNow(new Date());
    focusNext.current = "result";
    track({
      name: "wait_reported",
      properties: { place_id: placeId, level: waitEventLevel(level) },
    });
    void invalidateAfterWrite(client, "wait", placeId);
  }

  async function undo() {
    if (!mine || mine.kind !== "sent" || busy) return;
    if (!online) return offlineToast();
    setBusy(true);
    const r = await undoWaitAction({ reportId: mine.reportId });
    setBusy(false);
    if (!r.ok) {
      if (r.error === "undo_expired") {
        // 2분이 지났다: 취소를 거두고 30분 제한 줄로
        setMine({ ...mine, undoUntil: new Date().toISOString() });
        setNow(new Date());
      }
      failToast(r, onSignedOut);
      return;
    }
    setMine(null);
    setUndone(true);
    focusNext.current = "button";
    void invalidateAfterWrite(client, "wait", placeId);
  }

  const selected =
    phase !== "idle" && mine?.kind === "sent" ? mine.level : null;
  // 방금 내가 알렸으면 집계가 다시 오기 전에도 요약을 내 제보로
  const summary =
    selected !== null
      ? badgeCopy.waitingReport(0, badgeCopy.waitingLevels[selected])
      : waiting
        ? badgeCopy.waitingReport(
            waiting.minutesAgo,
            badgeCopy.waitingLevels[waiting.level],
          )
        : placeCopy.now.waitingNone;

  return (
    <div className="flex flex-col gap-2.5">
      <p className="type-body-sm">{summary}</p>
      {phase === "idle" ? (
        <p className="type-caption text-muted-foreground">{copy.wait.ask}</p>
      ) : null}
      <WaitButtons
        ref={buttonRef}
        selected={selected}
        locked={phase !== "idle"}
        disabled={!online}
        busy={busy}
        onPick={(level) => void pick(level)}
      />
      {phase === "undo" && mine?.kind === "sent" ? (
        <InlineResult
          ref={resultRef}
          action={
            <button
              type="button"
              aria-disabled={busy || !online || undefined}
              onClick={() => void undo()}
              className={reportCls.text}
            >
              {copy.wait.undo}
            </button>
          }
        >
          {copy.wait.doneLine(clockText(mine.reportedAt))}
        </InlineResult>
      ) : phase === "cooldown" && mine ? (
        <InlineResult ref={resultRef}>
          {moderationCopy.cooldown(clockText(mine.retryAt))}
        </InlineResult>
      ) : (
        <p className="type-caption break-keep text-muted-foreground">
          {copy.wait.peakNote}
        </p>
      )}
      <span role="status" className="sr-only">
        {undone ? copy.wait.undone : ""}
      </span>
    </div>
  );
}

/* ---------- 할인 (DEAL-02, DEAL-03) ---------- */

function DealSection({
  placeId,
  online,
  active,
  onOpenDeal,
  onReportDeal,
  onSignedOut,
}: NowPanelProps) {
  const deals = usePlaceDeals(placeId);
  const [now] = useState(() => new Date());
  const viewed = useRef(new Set<string>());

  // deal_viewed: "지금" 행이 펼쳐져 할인이 보일 때 할인마다 한 번(PRD 10.2)
  useEffect(() => {
    if (!active || !deals.data) return;
    for (const d of deals.data) {
      if (viewed.current.has(d.id)) continue;
      viewed.current.add(d.id);
      track({
        name: "deal_viewed",
        properties: { place_id: placeId, source: d.source, screen: "detail" },
      });
    }
  }, [active, deals.data, placeId]);

  let body;
  if (deals.isPending) {
    body = (
      <LoadingRegion
        label={placeCopy.states.loading}
        className="mt-2 flex flex-col gap-4"
      >
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <SkeletonLine type="caption" className="w-16" />
            <SkeletonLine type="body" className="w-52" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20 rounded-chip" />
              <Skeleton className="h-9 w-20 rounded-chip" />
            </div>
          </div>
        ))}
      </LoadingRegion>
    );
  } else if (deals.isError && !deals.data) {
    body = (
      <div className="mt-2 flex flex-wrap items-center gap-x-3">
        <p className="type-body-sm text-muted-foreground">
          {copy.deal.loadFailed}
        </p>
        <button
          type="button"
          onClick={() => void deals.refetch()}
          className={reportCls.text}
        >
          {copy.deal.retry}
        </button>
      </div>
    );
  } else if ((deals.data ?? []).length === 0) {
    body = (
      <p className="mt-2 type-body-sm text-muted-foreground">
        {copy.deal.empty}
      </p>
    );
  } else {
    body = (
      <ul className="flex flex-col">
        {(deals.data ?? []).map((d) => (
          <DealItem
            key={d.id}
            deal={d}
            now={now}
            placeId={placeId}
            online={online}
            onReport={onReportDeal}
            onSignedOut={onSignedOut}
          />
        ))}
      </ul>
    );
  }

  return (
    <section className="flex flex-col border-t border-border pt-4">
      <h4 className="type-label">{copy.deal.sectionTitle}</h4>
      {body}
      <DealNotice className="mt-3" />
      <button
        type="button"
        aria-haspopup="dialog"
        aria-disabled={!online || undefined}
        onClick={(e) => (online ? onOpenDeal(e.currentTarget) : offlineToast())}
        className={cn(reportCls.text, "mt-1 self-start")}
      >
        {copy.deal.entry}
      </button>
    </section>
  );
}

function DealItem({
  deal,
  now,
  placeId,
  online,
  onReport,
  onSignedOut,
}: {
  deal: PlaceDeal;
  now: Date;
  placeId: string;
  online: boolean;
  onReport: (deal: PlaceDeal, opener: HTMLElement) => void;
  onSignedOut: () => void;
}) {
  const client = useQueryClient();
  const [local, setLocal] = useState<DealAnswer | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const resultRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<"result" | "button" | null>(null);
  useEffect(() => {
    if (focusNext.current === "result") resultRef.current?.focus();
    if (focusNext.current === "button") buttonRef.current?.focus();
    focusNext.current = null;
  });

  const c = dealCounts(deal, local);
  const { meta, when } = dealMeta(deal, now);

  async function pick(answer: "still" | "ended") {
    if (!online) return offlineToast();
    if (busy) return;
    setBusy(true);
    setLocal(answer);
    focusNext.current = "result";
    const r = await checkDealAction({ dealId: deal.id, answer });
    setBusy(false);
    if (!r.ok) {
      setLocal(undefined);
      focusNext.current = "button";
      failToast(r, onSignedOut);
      if (r.error === "unavailable")
        void invalidateAfterWrite(client, "deal", placeId);
      return;
    }
    track({ name: "deal_checked", properties: { deal_id: deal.id, answer } });
    void invalidateAfterWrite(client, "deal", placeId);
  }

  async function undo() {
    if (!online) return offlineToast();
    if (busy) return;
    const before = local;
    setBusy(true);
    setLocal(null);
    focusNext.current = "button";
    const r = await undoDealCheckAction({ dealId: deal.id });
    setBusy(false);
    if (!r.ok) {
      setLocal(before);
      focusNext.current = "result";
      failToast(r, onSignedOut);
      return;
    }
    // 되돌리기는 이벤트를 보내지 않는다(D-13 안건 16)
    void invalidateAfterWrite(client, "deal", placeId);
  }

  return (
    <DealRow
      type={deal.type}
      content={deal.content}
      meta={meta}
      when={when}
      dim={c.answer === "ended"}
      menu={
        deal.isMine ? null : (
          <DealReportButton
            disabled={!online}
            onClick={(opener) =>
              online ? onReport(deal, opener) : offlineToast()
            }
          />
        )
      }
    >
      {deal.isMine ? (
        <p className="type-caption text-muted-foreground tabular-nums">
          {copy.deal.mine(c.still)}
        </p>
      ) : (
        <div className="flex flex-col gap-2 pt-1">
          {c.answer === null ? (
            <CheckPair
              ref={buttonRef}
              label={deal.content}
              disabled={!online}
              busy={busy}
              onPick={(v) => void pick(v)}
            />
          ) : (
            <InlineResult
              ref={resultRef}
              action={
                <button
                  type="button"
                  aria-disabled={busy || !online || undefined}
                  onClick={() => void undo()}
                  className={reportCls.text}
                >
                  {copy.check.undo}
                </button>
              }
            >
              {c.answer === "still"
                ? copy.check.stillDone(c.still)
                : copy.check.endedDone}
            </InlineResult>
          )}
          <div
            className={cn(
              "flex flex-wrap items-center gap-x-3 gap-y-1",
              enterClass,
            )}
          >
            {c.answer === null ? (
              <p className="type-caption text-muted-foreground tabular-nums">
                {copy.check.stillCount(c.still)}
              </p>
            ) : null}
            <EndedTally count={c.ended} />
          </div>
        </div>
      )}
    </DealRow>
  );
}
