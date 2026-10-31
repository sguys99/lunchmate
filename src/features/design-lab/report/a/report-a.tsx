"use client";
// 제보와 신고 시안 A "한 장 시트" (T6.3).
//
// 의도: 입력이 필요한 제보(할인 등록, 식당 정보, 후기 신고)는 모두 같은 모양의 바텀시트(Base UI Drawer) 한 장에 담는다.
//       필수는 위(유형, 내용, 사유), 선택은 아래나 접힘(요일과 시간), 기본값은 미리 골라 둔다(종료일 7일).
//       시트 바닥에 올리브 버튼 하나. 한 탭으로 끝나는 것(웨이팅, 아직 해요/끝났어요)은 시트 없이 상세 안에서 누르고
//       결과는 토스트 + "되돌리기"로 알린다.
// 중복 병합(DEAL-04): 유형 칩을 고르는 순간 같은 유형 제보가 있으면 시트 안 나머지 칸이 기존 제보 미리보기로 바뀌고
//       주 버튼이 "아직 해요로 확인"이 된다. 다른 내용이면 글자 버튼으로 새로 남긴다.
// 데스크톱: 시트가 좌 칸(40%) 바닥에 붙는다. 지도 칸은 가리지 않는다.
// 모션: 시트 열림 slow 300 enter, 닫힘 fast exit(drawer.tsx), 접힘 행 base, 토스트는 Sonner 기본. 축소 모드면 즉시.
import { ChevronDown, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerHandle,
  DrawerPopup,
  DrawerPortal,
  DrawerTitle,
  DrawerViewport,
} from "@/components/ui/drawer";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing } from "@/components/ui/interaction";
import { LazyToaster, toast } from "@/components/ui/lazy-toaster";
import { reportLabCopy as copy } from "@/copy/design-lab-report";
import { useDesignPortalContainer } from "@/features/design-lab/system/design-scope";
import { cn } from "@/lib/utils";
import {
  BANNED_TEXT,
  COOLDOWN_UNTIL_LABEL,
  DEALS,
  DEFAULT_UNTIL_DAYS,
  FILLED_TEXT,
  MY_WAIT,
  MY_WAIT_COOLDOWN_LABEL,
  NEW_DEAL,
  REPORTED_REVIEW_ID,
  STATS,
  STATS_EMPTY,
  type DealItem,
} from "../mock";
import type { PlaceReportKind, ReportFlow, ReportParams } from "../params";
import {
  CheckPair,
  DealListSkeleton,
  DealNotice,
  DealReportButton,
  DealRow,
  DealTextField,
  DealTypeChips,
  DetailFolds,
  DetailHead,
  EMPTY_WHEN,
  EtcField,
  FieldLabel,
  FormSkeleton,
  HiddenReview,
  LimitBlock,
  OfflineLine,
  PLACE_KINDS,
  PlaceKindDetail,
  RadioRows,
  ReportFrame,
  RestFooter,
  ReviewList,
  ReviewReportButton,
  SendFailed,
  UntilChips,
  WaitButtons,
  WhenFields,
  cls,
  enterClass,
  useScrollOnMount,
  nowSummaryOf,
  placeKindLabel,
  reasonOptions,
  untilText,
  useDealForm,
  whenLabel,
  type CheckValue,
  type DealForm,
  type ReasonKey,
  type WaitLevel,
} from "../shared";

type SheetFlow = "deal" | "place" | "review-report";

export function ReportA({ params }: { params: ReportParams }) {
  const offline = params.state === "offline";
  const loading = params.state === "loading";
  const empty = params.state === "empty";
  const stats = empty ? STATS_EMPTY : STATS;
  const done = params.phase === "done";
  const waitRef = useScrollOnMount<HTMLDivElement>(params.flow === "wait");
  const dealsRef = useScrollOnMount<HTMLElement>(params.flow === "deal-check");

  const [sheet, setSheet] = useState<SheetFlow | null>(
    !done &&
      (params.flow === "deal" ||
        params.flow === "place" ||
        params.flow === "review-report")
      ? params.flow
      : null,
  );
  const [kind, setKind] = useState<PlaceReportKind>(params.kind);
  const [target, setTarget] = useState(params.target);
  const [deals, setDeals] = useState<DealItem[]>(() => {
    const base = empty ? [] : [...DEALS];
    return params.flow === "deal" && done ? [NEW_DEAL, ...base] : base;
  });
  const [checks, setChecks] = useState<Record<string, CheckValue>>(
    (): Record<string, CheckValue> =>
    params.flow === "deal-check" && done
      ? { d1: "still" }
      : params.flow === "deal-check" && params.phase === "ended"
        ? { d1: "ended" }
        : {},
  );
  const [myWait, setMyWait] = useState<{
    level: WaitLevel;
    justNow: boolean;
  } | null>(() =>
    params.flow === "wait" && done
      ? { level: "long", justNow: true }
      : params.flow === "wait" && params.phase === "cooldown"
        ? { level: "short", justNow: false }
        : null,
  );
  const [hidden, setHidden] = useState<string[]>(() =>
    params.flow === "review-report" && done && params.target === "review"
      ? [REPORTED_REVIEW_ID]
      : [],
  );

  // 보낸 뒤(done) 캡처: 결과 토스트를 한 번 띄운다
  const toasted = useRef(false);
  useEffect(() => {
    if (toasted.current || !done) return;
    toasted.current = true;
    const msg =
      params.flow === "deal"
        ? copy.deal.doneToast
        : params.flow === "deal-check"
          ? copy.check.stillToast
          : params.flow === "wait"
            ? copy.wait.doneToast
            : params.flow === "place"
              ? copy.place.doneToast
              : params.flow === "review-report"
                ? copy.reportReview.doneToast
                : null;
    if (msg) void toast(msg, undoAction(params.flow));
  }, [done, params.flow]);

  const openFlow = (flow: ReportFlow, k?: PlaceReportKind) => {
    if (k) setKind(k);
    if (flow === "deal" || flow === "place" || flow === "review-report")
      setSheet(flow);
  };

  const pickWait = (level: WaitLevel) => {
    if (myWait || offline) return;
    setMyWait({ level, justNow: true });
    void toast(copy.wait.doneToast, {
      action: { label: copy.wait.undo, onClick: () => setMyWait(null) },
    });
  };

  const pickCheck = (id: string, v: Exclude<CheckValue, null>) => {
    if (offline) return;
    const prev = checks[id] ?? null;
    if (prev === v) return;
    setChecks((c) => ({ ...c, [id]: v }));
    void toast(v === "still" ? copy.check.stillToast : copy.check.endedToast, {
      action: {
        label: copy.check.undo,
        onClick: () => setChecks((c) => ({ ...c, [id]: prev })),
      },
    });
  };

  const waiting =
    myWait?.justNow
      ? null
      : stats.waiting
        ? { level: stats.waiting.level, minutesAgo: stats.waiting.minutesAgo }
        : null;

  const now = loading ? (
    <DealListSkeleton />
  ) : (
    <div className="flex flex-col gap-4">
      <div ref={waitRef} className="flex flex-col gap-2.5">
        <p className="type-body-sm">
          {nowSummaryOf(
            myWait && !myWait.justNow
              ? {
                  level: myWait.level,
                  minutesAgo: MY_WAIT.minutesAgo,
                }
              : waiting,
            myWait?.justNow ? myWait.level : null,
            0,
          )}
        </p>
        <p className="type-caption break-keep text-muted-foreground">
          {myWait
            ? copy.wait.cooldown(
                myWait.justNow ? COOLDOWN_UNTIL_LABEL : MY_WAIT_COOLDOWN_LABEL,
              )
            : copy.wait.ask}
        </p>
        <WaitButtons
          selected={myWait?.level ?? null}
          disabled={offline || myWait !== null}
          onPick={pickWait}
        />
        <p className="type-caption break-keep text-muted-foreground">
          {copy.wait.peakNote}
        </p>
      </div>

      <section
        ref={dealsRef}
        className="flex flex-col border-t border-border pt-4"
      >
        <h4 className="type-label">{copy.deal.sectionTitle}</h4>
        {deals.length === 0 ? (
          <p className="mt-2 type-body-sm text-muted-foreground">
            {copy.deal.empty}
          </p>
        ) : (
          <ul className="flex flex-col">
            {deals.map((d) => {
              const v = checks[d.id] ?? null;
              const still = d.still + (v === "still" ? 1 : 0);
              return (
                <DealRow
                  key={d.id}
                  deal={d}
                  dim={v === "ended"}
                  className={d.id === "new" ? enterClass : undefined}
                  menu={
                    d.id === "new" ? null : (
                      <DealReportButton
                        disabled={offline}
                        onClick={() => {
                          setTarget("deal");
                          setSheet("review-report");
                        }}
                      />
                    )
                  }
                >
                  {d.id === "new" ? null : (
                    <div className="flex flex-col gap-1.5 pt-1">
                      <CheckPair
                        label={d.text}
                        value={v}
                        disabled={offline}
                        onPick={(nv) => pickCheck(d.id, nv)}
                      />
                      <p className="type-caption text-muted-foreground tabular-nums">
                        {v === "ended"
                          ? copy.check.endedDone
                          : v === "still"
                            ? copy.check.stillCountWithMe(still)
                            : copy.check.stillCount(still)}
                      </p>
                    </div>
                  )}
                </DealRow>
              );
            })}
          </ul>
        )}
        <DealNotice className="mt-3" />
        <button
          type="button"
          aria-disabled={offline || undefined}
          onClick={() => setSheet("deal")}
          className={cn(cls.text, "mt-1 self-start")}
        >
          {copy.deal.entry}
        </button>
      </section>
    </div>
  );

  const reviews = (
    <ReviewList
      reviews={stats.reviews ?? []}
      renderMenu={(r) => (
        <ReviewReportButton
          review={r}
          disabled={offline || hidden.includes(r.id)}
          onClick={() => {
            setTarget("review");
            setSheet("review-report");
          }}
        />
      )}
      renderBody={(r) =>
        hidden.includes(r.id) ? (
          <HiddenReview
            onShow={() => setHidden((h) => h.filter((x) => x !== r.id))}
          />
        ) : null
      }
    />
  );

  const open =
    params.flow === "review-report" && params.target === "review"
      ? "reviews"
      : params.flow === "none" || params.flow === "place"
        ? "thumbs"
        : "now";

  return (
    <>
      <ReportFrame
        footer={
          <RestFooter onFlow={openFlow} offline={offline} menuOpen={params.menu} />
        }
        overlay={
          <SheetA
            flow={sheet}
            onClose={() => setSheet(null)}
            params={params}
            kind={kind}
            onKind={setKind}
            target={target}
            deals={deals}
            onSubmitDeal={(form) => {
              setDeals((list) => [
                {
                  ...NEW_DEAL,
                  type: form.type ?? NEW_DEAL.type,
                  text: form.text || NEW_DEAL.text,
                  until: untilText(form.untilDays),
                  when:
                    form.when.days.length || form.when.slots.length
                      ? whenLabel(form.when)
                      : null,
                },
                ...list,
              ]);
              setSheet(null);
              void toast(copy.deal.doneToast);
            }}
            onMerge={(id) => {
              setChecks((c) => ({ ...c, [id]: "still" }));
              setSheet(null);
              void toast(copy.deal.mergedToast);
            }}
            onSubmitPlace={() => {
              setSheet(null);
              void toast(copy.place.doneToast);
            }}
            onSubmitReport={() => {
              if (target === "review") setHidden((h) => [...h, REPORTED_REVIEW_ID]);
              setSheet(null);
              void toast(copy.reportReview.doneToast);
            }}
          />
        }
      >
        {offline ? <OfflineLine className="mb-5" /> : null}
        <DetailHead
          stats={
            myWait?.justNow
              ? { ...stats, waiting: { level: myWait.level, minutesAgo: 1 } }
              : stats
          }
        />
        <DetailFolds
          stats={stats}
          open={open}
          reviews={reviews}
          now={now}
          nowSummary={nowSummaryOf(
            waiting,
            myWait?.justNow ? myWait.level : null,
            deals.length,
          )}
        />
      </ReportFrame>
      <LazyToaster />
    </>
  );
}

function undoAction(flow: ReportFlow) {
  if (flow === "wait" || flow === "deal-check") {
    return { action: { label: copy.check.undo, onClick: () => undefined } };
  }
  return undefined;
}

/* ---------- 시트 ---------- */

function SheetA({
  flow,
  onClose,
  params,
  kind,
  onKind,
  target,
  deals,
  onSubmitDeal,
  onMerge,
  onSubmitPlace,
  onSubmitReport,
}: {
  flow: SheetFlow | null;
  onClose: () => void;
  params: ReportParams;
  kind: PlaceReportKind;
  onKind: (k: PlaceReportKind) => void;
  target: "review" | "deal";
  deals: readonly DealItem[];
  onSubmitDeal: (form: DealForm) => void;
  onMerge: (dealId: string) => void;
  onSubmitPlace: () => void;
  onSubmitReport: () => void;
}) {
  const container = useDesignPortalContainer();
  // 닫히는 동안에도 내용이 남아 있게 마지막 흐름을 기억한다
  const [shown, setShown] = useState<SheetFlow | null>(flow);
  if (flow && flow !== shown) setShown(flow);
  const title =
    shown === "deal"
      ? copy.deal.formTitle
      : shown === "place"
        ? copy.place.title
        : target === "deal"
          ? copy.reportReview.titleDeal
          : copy.reportReview.title;

  return (
    <Drawer open={flow !== null} onOpenChange={(o) => (o ? null : onClose())}>
      <DrawerPortal container={container ?? undefined}>
        <DrawerBackdrop className="z-40 min-[64rem]:right-auto min-[64rem]:w-2/5" />
        <DrawerViewport className="z-50 min-[64rem]:justify-start">
          <DrawerPopup className="max-h-[88%] data-ending-style:duration-(--lm-duration-fast) data-ending-style:ease-exit min-[64rem]:w-2/5 min-[64rem]:max-w-none">
            <DrawerHandle className="mt-3 mb-0 h-1 w-9" />
            <div className="flex items-start gap-3 px-(--lm-layout-gutter) pt-3 pb-2 min-[64rem]:px-10">
              <DrawerTitle className="min-w-0 flex-1 pt-1.5">{title}</DrawerTitle>
              <DrawerClose
                aria-label={copy.errors.close}
                className={cn(cls.ghostIcon, "-mr-2.5")}
              >
                <X aria-hidden className="size-5" strokeWidth={1.5} />
              </DrawerClose>
            </div>
            {shown === "deal" ? (
              <DealSheetBody
                params={params}
                deals={deals}
                onSubmit={onSubmitDeal}
                onMerge={onMerge}
              />
            ) : shown === "place" ? (
              <PlaceSheetBody
                params={params}
                kind={kind}
                onKind={onKind}
                onSubmit={onSubmitPlace}
              />
            ) : shown === "review-report" ? (
              <ReportSheetBody
                params={params}
                target={target}
                deals={deals}
                onSubmit={onSubmitReport}
              />
            ) : null}
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  );
}

/** 시트 본문 + 바닥 줄 */
function SheetLayout({
  children,
  footer,
}: {
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <>
      <DrawerContent className="flex flex-col gap-6 pt-2 pb-6 min-[64rem]:px-10">
        {children}
      </DrawerContent>
      <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-popover px-(--lm-layout-gutter) pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] min-[64rem]:px-10">
        {footer}
      </div>
    </>
  );
}

function initialDealForm(p: ReportParams): DealForm {
  if (p.error === "banned-word")
    return { type: "etc", text: BANNED_TEXT, untilDays: 7, when: EMPTY_WHEN };
  if (p.state === "error")
    return {
      type: "happyHour",
      text: FILLED_TEXT,
      untilDays: DEFAULT_UNTIL_DAYS,
      when: { days: ["월", "화", "수", "목", "금"], slots: ["dinner"] },
    };
  if (p.phase === "dup")
    return {
      type: "lunchSpecial",
      text: "",
      untilDays: DEFAULT_UNTIL_DAYS,
      when: EMPTY_WHEN,
    };
  return { type: null, text: "", untilDays: DEFAULT_UNTIL_DAYS, when: EMPTY_WHEN };
}

function DealSheetBody({
  params,
  deals,
  onSubmit,
  onMerge,
}: {
  params: ReportParams;
  deals: readonly DealItem[];
  onSubmit: (form: DealForm) => void;
  onMerge: (dealId: string) => void;
}) {
  const offline = params.state === "offline";
  const { form, set } = useDealForm(initialDealForm(params));
  const [banned, setBanned] = useState(params.error === "banned-word");
  const [skipDup, setSkipDup] = useState(false);
  const [whenOpen, setWhenOpen] = useState(params.state === "error");
  const typeId = useId();
  const textId = useId();
  const untilId = useId();
  const whenId = useId();
  const whenPanel = useId();

  if (params.state === "loading")
    return (
      <SheetLayout footer={<div className="h-12 rounded-button bg-muted" />}>
        <FormSkeleton />
      </SheetLayout>
    );
  if (params.error === "limit")
    return (
      <SheetLayout
        footer={
          <DrawerClose className={buttonClass("secondary")}>
            {copy.errors.close}
          </DrawerClose>
        }
      >
        <LimitBlock kind="deal" />
      </SheetLayout>
    );

  const dup = !skipDup
    ? (deals.find((d) => d.type === form.type && d.id !== "new") ?? null)
    : null;
  const ready = form.type !== null && form.text.trim().length > 0;

  return (
    <SheetLayout
      footer={
        dup ? (
          <>
            <button
              type="button"
              aria-disabled={offline || undefined}
              onClick={() => onMerge(dup.id)}
              className={buttonClass("primary")}
            >
              {copy.deal.dupConfirm}
            </button>
            <button
              type="button"
              onClick={() => setSkipDup(true)}
              className={cn(cls.text, "self-center")}
            >
              {copy.deal.dupNew}
            </button>
          </>
        ) : (
          <>
            {params.state === "error" ? <SendFailed className="mb-2" /> : null}
            <button
              type="button"
              aria-disabled={!ready || offline || banned || undefined}
              onClick={() => {
                if (!ready || offline || banned) return;
                onSubmit(form);
              }}
              className={buttonClass("primary")}
            >
              {offline
                ? copy.errors.offlineButton
                : params.state === "error"
                  ? copy.errors.retry
                  : copy.deal.submit}
            </button>
          </>
        )
      }
    >
      <p className="-mt-1 type-body-sm break-keep text-muted-foreground">
        {copy.deal.formLead}
      </p>
      {offline ? <OfflineLine /> : null}
      <div className="flex flex-col gap-2.5">
        <FieldLabel id={typeId}>{copy.deal.typeLabel}</FieldLabel>
        <DealTypeChips
          labelId={typeId}
          value={form.type}
          onChange={(t) => {
            set("type", t);
            setSkipDup(false);
          }}
        />
      </div>

      {dup ? (
        <section
          aria-labelledby={`${typeId}-dup`}
          className={cn(
            "flex flex-col gap-3 rounded-card border border-border bg-card p-5",
            enterClass,
          )}
        >
          <h3 id={`${typeId}-dup`} className="type-label">
            {copy.deal.dupTitle}
          </h3>
          <p className="type-body-sm break-keep text-muted-foreground">
            {copy.deal.dupBody(copy.deal.types[dup.type])}
          </p>
          <ul className="border-t border-border">
            <DealRow deal={dup} className="pb-0" />
          </ul>
          <p className="type-caption text-muted-foreground tabular-nums">
            {copy.check.stillCount(dup.still)}
          </p>
        </section>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            <FieldLabel id={textId}>{copy.deal.textLabel}</FieldLabel>
            <DealTextField
              labelId={textId}
              type={form.type}
              value={form.text}
              invalid={banned}
              onChange={(v) => {
                set("text", v);
                setBanned(false);
              }}
            />
          </div>
          <div className="flex flex-col gap-2.5">
            <FieldLabel id={untilId}>
              {copy.deal.untilLabel}
              <span className="type-caption text-muted-foreground tabular-nums">
                {copy.deal.untilDate(untilText(form.untilDays))}
              </span>
            </FieldLabel>
            <UntilChips
              labelId={untilId}
              value={form.untilDays}
              onChange={(d) => set("untilDays", d)}
            />
            <p className="type-caption break-keep text-muted-foreground">
              {copy.deal.untilHint}
            </p>
          </div>
          <div className="flex flex-col border-y border-border">
            <button
              type="button"
              id={whenId}
              aria-expanded={whenOpen}
              aria-controls={whenPanel}
              onClick={() => setWhenOpen((v) => !v)}
              className={cn(
                "flex min-h-12 items-center gap-3 py-2 text-left",
                focusRing,
              )}
            >
              <span className="type-label">{copy.deal.whenLabel}</span>
              <span className="type-caption text-muted-foreground">
                {copy.deal.whenOptional}
              </span>
              <span className="ml-auto truncate type-caption text-muted-foreground">
                {whenLabel(form.when)}
              </span>
              <ChevronDown
                aria-hidden
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
                  whenOpen && "rotate-180",
                )}
                strokeWidth={1.5}
              />
            </button>
            <div
              id={whenPanel}
              inert={!whenOpen}
              className={cn(
                "grid transition-[grid-template-rows] duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
                whenOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="pt-1 pb-5">
                  <WhenFields
                    value={form.when}
                    onChange={(w) => set("when", w)}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      <DealNotice />
    </SheetLayout>
  );
}

function PlaceSheetBody({
  params,
  kind,
  onKind,
  onSubmit,
}: {
  params: ReportParams;
  kind: PlaceReportKind;
  onKind: (k: PlaceReportKind) => void;
  onSubmit: () => void;
}) {
  const offline = params.state === "offline";
  const [detail, setDetail] = useState<string[]>([]);
  if (params.state === "loading")
    return (
      <SheetLayout footer={<div className="h-12 rounded-button bg-muted" />}>
        <FormSkeleton rows={2} />
      </SheetLayout>
    );
  if (params.error === "limit")
    return (
      <SheetLayout
        footer={
          <DrawerClose className={buttonClass("secondary")}>
            {copy.errors.close}
          </DrawerClose>
        }
      >
        <LimitBlock kind="report" />
      </SheetLayout>
    );
  return (
    <SheetLayout
      footer={
        <>
          {params.state === "error" ? <SendFailed className="mb-2" /> : null}
          <button
            type="button"
            aria-disabled={offline || undefined}
            onClick={() => !offline && onSubmit()}
            className={buttonClass("primary")}
          >
            {offline
              ? copy.errors.offlineButton
              : params.state === "error"
                ? copy.errors.retry
                : copy.place.submit}
          </button>
        </>
      }
    >
      <p className="-mt-1 type-body-sm break-keep text-muted-foreground">
        {copy.place.lead}
      </p>
      {offline ? <OfflineLine /> : null}
      <RadioRows
        name="place-kind"
        legend={copy.place.kindLabel}
        options={PLACE_KINDS.map((k) => ({ key: k, label: placeKindLabel(k) }))}
        value={kind}
        onChange={(k) => {
          onKind(k);
          setDetail([]);
        }}
        below={(k) => (
          <PlaceKindDetail kind={k} value={detail} onChange={setDetail} />
        )}
      />
    </SheetLayout>
  );
}

function ReportSheetBody({
  params,
  target,
  deals,
  onSubmit,
}: {
  params: ReportParams;
  target: "review" | "deal";
  deals: readonly DealItem[];
  onSubmit: () => void;
}) {
  const offline = params.state === "offline";
  const [reason, setReason] = useState<ReasonKey | null>(
    params.error === "banned-word" || params.state === "error" ? "etc" : null,
  );
  const [etc, setEtc] = useState(
    params.error === "banned-word" ? BANNED_TEXT.slice(0, 40) : "",
  );
  const [banned, setBanned] = useState(params.error === "banned-word");
  const quote =
    target === "deal"
      ? (deals.find((d) => d.id === "d1")?.text ?? "")
      : (STATS.reviews?.find((r) => r.id === REPORTED_REVIEW_ID)?.text ?? "");

  if (params.state === "loading")
    return (
      <SheetLayout footer={<div className="h-12 rounded-button bg-muted" />}>
        <FormSkeleton rows={2} />
      </SheetLayout>
    );
  if (params.error === "limit")
    return (
      <SheetLayout
        footer={
          <DrawerClose className={buttonClass("secondary")}>
            {copy.errors.close}
          </DrawerClose>
        }
      >
        <LimitBlock kind="report" />
      </SheetLayout>
    );
  const can = reason !== null && !offline && !banned;
  return (
    <SheetLayout
      footer={
        <>
          {params.state === "error" ? <SendFailed className="mb-2" /> : null}
          <button
            type="button"
            aria-disabled={!can || undefined}
            onClick={() => can && onSubmit()}
            className={buttonClass("primary")}
          >
            {offline
              ? copy.errors.offlineButton
              : params.state === "error"
                ? copy.errors.retry
                : copy.reportReview.submit}
          </button>
        </>
      }
    >
      <blockquote className="border-l-2 border-border pl-3 type-body-sm break-keep text-muted-foreground">
        {quote}
      </blockquote>
      {offline ? <OfflineLine /> : null}
      <RadioRows
        name="report-reason"
        legend={copy.reportReview.qReason}
        options={reasonOptions(target)}
        value={reason}
        onChange={setReason}
        below={(k) =>
          k === "etc" ? (
            <EtcField
              value={etc}
              invalid={banned}
              onChange={(v) => {
                setEtc(v);
                setBanned(false);
              }}
            />
          ) : null
        }
      />
      <p className="type-caption break-keep text-muted-foreground">
        {copy.reportReview.note}
      </p>
    </SheetLayout>
  );
}
