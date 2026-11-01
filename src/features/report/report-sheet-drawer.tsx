"use client";
// 제보와 신고 질문 시트 (T6.15, T6.16, T6.19, T6.22, D-13 C 한 질문씩, DESIGN.md 5장 "제보와 신고"). Base UI Drawer.
// report-sheet.tsx가 누른 뒤에 동적 import한다(홈 첫 로드 밖, 상세 청크 밖).
// - 모바일: 내용 높이만큼(최대 80%) 아래 시트. 홈 상세 시트 위에서는 중첩 Drawer(딤 한 겹 더, forceRender).
// - 데스크톱(1024 이상): 좌 칸(40%) 바닥 시트, 딤도 좌 칸에만. 지도 칸은 덮지 않는다.
// - 머리 한 줄: 이전 질문(44) + 단계 막대 + 닫기(44). 질문이 바뀌면 새 내용이 4px 옆에서 페이드, 초점은 새 질문 제목.
// - 한도(열 때와 보낼 때), 금칙어(칸 아래), 실패(버튼 위 + 다시 보내기), 오프라인(위 안내 + 버튼 aria-disabled)은 같은 자리.
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/button-classes";
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
import { toast } from "@/components/ui/lazy-toaster";
import { moderationCopy } from "@/copy/moderation";
import { reportCopy, reportLabels } from "@/copy/report";
import { useDailyLimits } from "@/features/feedback/use-my-records";
import type { PlaceDeal } from "@/features/place/place-stats-model";
import {
  placeDealsQuery,
  usePlaceDeals,
} from "@/features/place/use-place-stats";
import { track } from "@/lib/analytics/track";
import { useOnlineStatus } from "@/lib/network";
import { invalidateAfterWrite } from "@/lib/query/db-keys";
import type { WriteFailure } from "@/lib/supabase/write-result";
import { cn } from "@/lib/utils";
import {
  checkDealAction,
  registerDealAction,
  reportDealAction,
  reportPlaceAction,
  reportReviewAction,
} from "./actions";
import { DealNotice, DealRow, enterClass, reportCls } from "./deal-parts";
import {
  canSubmitContent,
  dealDaysMask,
  dealEndRange,
  dealMeta,
  dealStepProgress,
  endsOnAfter,
  findDuplicate,
  flagNote,
  hasPlaceDetail,
  initialDealForm,
  isEndsOnInRange,
  LIMIT_WARN_AT,
  limitState,
  placeDetailValid,
  placeReportRequest,
  registerDealRequest,
  reportEventType,
  stepAfterType,
  untilChipOf,
  untilText,
  whenText,
  type DealForm,
  type DealStep,
  type FlagReason,
  type LimitState,
  type PlaceDetailInput,
} from "./flow";
import {
  DEAL_CONTENT_MAX,
  DEAL_REPORT_REASONS,
  REVIEW_REPORT_REASONS,
  type DealType,
} from "./labels";
import {
  ClosedChips,
  DealTextField,
  DealTypeChips,
  DoneMark,
  EtcField,
  FormError,
  FormSkeleton,
  InfoChips,
  LimitBlock,
  OfflineLine,
  PriceInput,
  RadioRows,
  UntilField,
  WhenFields,
} from "./report-fields";

const copy = reportCopy;

/** 칩을 누른 뒤 다음 질문으로 넘어가기 전 잠깐(고른 칩이 보이게). 축소 모드여도 남긴다(DESIGN.md) */
const ADVANCE_MS = 160;

export type ReportSheetConfig = (
  | { kind: "deal"; placeId: string; placeUrl: string | null }
  | {
      kind: "place";
      placeId: string;
      placeUrl: string | null;
      report: "closed" | "price" | "info";
    }
  | {
      kind: "flag";
      target: "review" | "deal";
      placeId: string;
      targetId: string;
      /** 신고할 글(후기 본문, 할인 내용). 화면에만 보이고 이벤트에 넣지 않는다 */
      quote: string;
    }
) & {
  /** 닫힌 뒤 초점(기본: 연 버튼) */
  finalFocus?: () => HTMLElement | null;
  /** 보내기에 성공했을 때 */
  onDone?: () => void;
};

export type ReportSheetDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ReportSheetConfig;
  /** 로그인이 필요할 때(시트를 닫고 로그인 유도 시트) */
  onSignedOut: () => void;
};

export default function ReportSheetDrawer({
  open,
  onOpenChange,
  config,
  onSignedOut,
}: ReportSheetDrawerProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const close = () => onOpenChange(false);
  const signedOut = () => {
    close();
    onSignedOut();
  };
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal>
        <DrawerBackdrop
          forceRender
          className="z-[60] min-[64rem]:right-auto min-[64rem]:w-2/5"
        />
        <DrawerViewport className="z-[70] min-[64rem]:justify-start">
          <DrawerPopup
            ref={popupRef}
            initialFocus={() =>
              popupRef.current?.querySelector<HTMLElement>(
                "[data-question-title]",
              ) ?? true
            }
            finalFocus={() => config.finalFocus?.() ?? true}
            className={cn(
              "max-h-[80dvh] border-t border-border data-ending-style:duration-(--lm-duration-fast) data-ending-style:ease-exit",
              "min-[64rem]:w-2/5 min-[64rem]:max-w-none",
            )}
          >
            <DrawerHandle className="mt-3 mb-0 h-1 w-9" />
            {config.kind === "deal" ? (
              <DealQuestions config={config} onSignedOut={signedOut} />
            ) : config.kind === "place" ? (
              <PlaceQuestions config={config} onSignedOut={signedOut} />
            ) : (
              <FlagQuestions config={config} onSignedOut={signedOut} />
            )}
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  );
}

/* ---------- 질문 틀 ---------- */

/** 질문 한 장: 단계 막대 + 이전 + 제목(질문) + 본문 + 바닥. stepKey가 바뀌면 새 제목으로 초점 */
function Question({
  step,
  total,
  eyebrow,
  title,
  titleId,
  onBack,
  children,
  footer,
  stepKey,
}: {
  /** 0이면 단계 막대 없음(한도, 완료, 불러오는 중) */
  step: number;
  total: number;
  eyebrow?: string;
  title: string;
  titleId?: string;
  onBack?: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  stepKey: string;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  useEffect(() => {
    // 처음은 Drawer initialFocus가 맡는다
    if (first.current) {
      first.current = false;
      return;
    }
    titleRef.current?.focus({ preventScroll: true });
  }, [stepKey]);
  return (
    <>
      <div className="flex items-center gap-2 px-(--lm-layout-gutter) pt-2 min-[64rem]:px-10">
        {onBack ? (
          <button
            type="button"
            aria-label={copy.sheet.back}
            onClick={onBack}
            className={cn(reportCls.ghostIcon, "-ml-2.5")}
          >
            <ChevronLeft aria-hidden className="size-5" strokeWidth={1.5} />
          </button>
        ) : (
          <span className="-ml-2.5 size-11 shrink-0" aria-hidden />
        )}
        {step > 0 ? (
          <div
            role="progressbar"
            aria-label={copy.sheet.stepOf(step, total)}
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={step}
            className="flex flex-1 gap-1.5"
          >
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-0.5 flex-1 rounded-full bg-border transition-colors duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
                  i < step && "bg-primary",
                )}
              />
            ))}
          </div>
        ) : (
          <span className="flex-1" />
        )}
        <DrawerClose
          aria-label={copy.sheet.close}
          className={cn(reportCls.ghostIcon, "-mr-2.5")}
        >
          <X aria-hidden className="size-5" strokeWidth={1.5} />
        </DrawerClose>
      </div>
      <DrawerContent className="flex flex-col pt-3 pb-6 min-[64rem]:px-10">
        <div key={stepKey} className={cn("flex flex-col gap-5", enterClass)}>
          <div className="flex flex-col gap-1">
            {eyebrow ? (
              <p className="type-caption text-muted-foreground">{eyebrow}</p>
            ) : null}
            <DrawerTitle
              ref={titleRef}
              id={titleId}
              tabIndex={-1}
              data-question-title=""
              className="type-heading break-keep outline-none"
            >
              {title}
            </DrawerTitle>
          </div>
          {children}
        </div>
      </DrawerContent>
      {footer ? (
        <div className="flex shrink-0 flex-col gap-2 px-(--lm-layout-gutter) pt-1 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] min-[64rem]:px-10">
          {footer}
        </div>
      ) : null}
    </>
  );
}

function CloseButton() {
  return (
    <DrawerClose className={cn(buttonClass("secondary"), "w-full")}>
      {copy.sheet.close}
    </DrawerClose>
  );
}

function DoneQuestion({ title, body }: { title: string; body: string }) {
  return (
    <Question
      step={0}
      total={0}
      stepKey="done"
      title={copy.sheet.thanks}
      footer={<CloseButton />}
    >
      <DoneMark title={title} body={body} />
    </Question>
  );
}

function LimitQuestion({
  title,
  bucket,
}: {
  title: string;
  bucket: "reports" | "deals";
}) {
  const m = moderationCopy.limits[bucket];
  return (
    <Question
      step={0}
      total={0}
      stepKey="limit"
      title={title}
      footer={<CloseButton />}
    >
      <LimitBlock title={m.title} body={m.body} />
    </Question>
  );
}

function LoadingQuestion({ title }: { title: string }) {
  return (
    <Question step={0} total={0} stepKey="loading" title={title}>
      <FormSkeleton />
    </Question>
  );
}

/** 열 때 남은 수가 적으면 한 줄 (D-13 안건 12) */
function RemainingLine({ limit }: { limit: LimitState }) {
  if (limit.kind !== "open" || limit.remaining > LIMIT_WARN_AT) return null;
  return (
    <p className="type-caption text-muted-foreground tabular-nums">
      {moderationCopy.remaining(limit.remaining)}
    </p>
  );
}

/** 바닥 주 버튼(화면의 유일한 올리브 면 버튼). 오프라인이면 aria-disabled + 안내 */
function PrimaryButton({
  children,
  disabled,
  busy,
  offline,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  busy?: boolean;
  offline: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-disabled={disabled || busy || offline || undefined}
      aria-busy={busy || undefined}
      onClick={() => {
        if (offline) {
          void toast(copy.sheet.offlineToast);
          return;
        }
        if (!disabled && !busy) onClick();
      }}
      className={cn(buttonClass("primary"), "w-full")}
    >
      {offline
        ? copy.sheet.offlineButton
        : busy
          ? copy.sheet.sending
          : children}
    </button>
  );
}

/** 보내기 결과 처리: 한도는 한도 화면, 로그인은 로그인 유도, 금칙어는 칸 아래, 나머지는 버튼 위 */
type Failure =
  | { kind: "limit" }
  | { kind: "banned" }
  | { kind: "line"; failure: WriteFailure };
function classify(f: WriteFailure, onSignedOut: () => void): Failure | null {
  if (f.error === "unauthenticated") {
    onSignedOut();
    return null;
  }
  if (f.error === "limit") return { kind: "limit" };
  if (f.error === "banned") return { kind: "banned" };
  return { kind: "line", failure: f };
}

function FailureLine({ failure }: { failure: WriteFailure }) {
  if (failure.error === "limit" || failure.error === "cooldown")
    return <FormError {...moderationCopy.errors.save} />;
  return <FormError {...moderationCopy.errors[failure.error]} />;
}

function useWriteLimit(bucket: "reports" | "deals") {
  const q = useDailyLimits();
  // 조회가 실패하면 열어 두고 보낼 때 서버가 판정한다
  return q.isError
    ? ({ kind: "open", remaining: 99 } as const)
    : limitState(q.data, bucket);
}

/** 비로그인으로 열렸으면 로그인 유도로 바꾼다 */
function useSignedOutRedirect(limit: LimitState, onSignedOut: () => void) {
  const done = useRef(false);
  useEffect(() => {
    if (limit.kind === "signedOut" && !done.current) {
      done.current = true;
      onSignedOut();
    }
  }, [limit.kind, onSignedOut]);
}

/* ---------- 할인 등록 3단계 + 중복 (DEAL-01, DEAL-04, D-13 안건 1~3) ---------- */

function DealQuestions({
  config,
  onSignedOut,
}: {
  config: Extract<ReportSheetConfig, { kind: "deal" }>;
  onSignedOut: () => void;
}) {
  const client = useQueryClient();
  const online = useOnlineStatus();
  const offline = !online;
  const limit = useWriteLimit("deals");
  useSignedOutRedirect(limit, onSignedOut);
  const dealsQuery = usePlaceDeals(config.placeId);
  // 열린 동안 오늘 날짜를 고정한다(자정을 넘겨도 칩 값이 흔들리지 않게)
  const [now] = useState(() => new Date());
  const [form, setForm] = useState<DealForm>(() => initialDealForm(now));
  const [step, setStep] = useState<DealStep>("type");
  const [withDup, setWithDup] = useState(false);
  const [dupId, setDupId] = useState<string | null>(null);
  const [merged, setMerged] = useState(false);
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [banned, setBanned] = useState(false);
  const [failure, setFailure] = useState<WriteFailure | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [doneUntil, setDoneUntil] = useState<string | null>(null);
  const typeId = useId();
  const textId = useId();
  const editPanelId = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const deals: readonly PlaceDeal[] = dealsQuery.data ?? [];
  const range = dealEndRange(now);

  if (
    limit.kind === "unknown" ||
    limit.kind === "signedOut" ||
    (dealsQuery.isPending && step === "type")
  )
    return <LoadingQuestion title={copy.deal.formTitle} />;
  if (limit.kind === "blocked" || limitHit)
    return <LimitQuestion title={copy.deal.formTitle} bucket="deals" />;

  const set = (patch: Partial<DealForm>) =>
    setForm((f) => ({ ...f, ...patch }));
  const typeLabel = form.type ? reportLabels.dealTypes[form.type] : "";
  const progress = dealStepProgress(step, withDup);
  const dup =
    (dupId ? deals.find((d) => d.id === dupId) : null) ??
    (form.type ? findDuplicate(deals, form.type) : null);

  const pickType = (t: DealType) => {
    set({ type: t, replace: false });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const next = stepAfterType(deals, t);
      if (next === "dup") {
        setWithDup(true);
        setDupId(findDuplicate(deals, t)?.id ?? null);
      } else {
        setWithDup(false);
        setDupId(null);
      }
      setStep(next);
    }, ADVANCE_MS);
  };

  async function confirmStill() {
    if (!dup || busy) return;
    setBusy(true);
    setFailure(null);
    const r = await checkDealAction({ dealId: dup.id, answer: "still" });
    setBusy(false);
    if (!r.ok) {
      const c = classify(r, onSignedOut);
      if (c?.kind === "line") setFailure(c.failure);
      if (r.error === "unavailable")
        void invalidateAfterWrite(client, "deal", config.placeId);
      return;
    }
    track({
      name: "deal_checked",
      properties: { deal_id: dup.id, answer: "still" },
    });
    void invalidateAfterWrite(client, "deal", config.placeId);
    setMerged(true);
    setStep("done");
    config.onDone?.();
  }

  async function submit() {
    const req = registerDealRequest(form, config);
    if (!req || busy) return;
    setBusy(true);
    setFailure(null);
    const r = await registerDealAction(req);
    setBusy(false);
    if (!r.ok) {
      const c = classify(r, onSignedOut);
      if (c?.kind === "limit") setLimitHit(true);
      else if (c?.kind === "banned") {
        setBanned(true);
        setStep("text");
      } else if (c?.kind === "line") setFailure(c.failure);
      return;
    }
    if (r.status === "merged") {
      // 화면 목록이 늦었다: 서버가 찾은 같은 유형 제보로 중복 단계를 띄운다
      await client
        .fetchQuery({ ...placeDealsQuery(config.placeId), staleTime: 0 })
        .catch(() => null);
      setDupId(r.mergedWith);
      setWithDup(true);
      setStep("dup");
      return;
    }
    track({
      name: "deal_reported",
      properties: { place_id: config.placeId, type: req.type },
    });
    void invalidateAfterWrite(client, "deal", config.placeId);
    setDoneUntil(untilText(r.endsOn, now));
    setStep("done");
    config.onDone?.();
  }

  const failureLine = failure ? <FailureLine failure={failure} /> : null;

  switch (step) {
    case "type":
      return (
        <Question
          step={progress.step}
          total={progress.total}
          stepKey="type"
          title={copy.deal.qType}
          titleId={typeId}
        >
          {offline ? <OfflineLine /> : null}
          <DealTypeChips
            labelId={typeId}
            value={form.type}
            onChange={pickType}
          />
          <DealNotice />
          <RemainingLine limit={limit} />
        </Question>
      );
    case "dup":
      return (
        <Question
          step={progress.step}
          total={progress.total}
          stepKey="dup"
          eyebrow={typeLabel}
          title={copy.deal.dupTitle}
          onBack={() => setStep("type")}
          footer={
            <>
              {failureLine}
              <PrimaryButton
                offline={offline}
                busy={busy}
                disabled={!dup}
                onClick={() => void confirmStill()}
              >
                {copy.deal.dupConfirm}
              </PrimaryButton>
              <button
                type="button"
                onClick={() => {
                  set({ replace: true });
                  setFailure(null);
                  setStep("text");
                }}
                className={cn(reportCls.text, "self-center")}
              >
                {copy.deal.dupNew}
              </button>
            </>
          }
        >
          {offline ? <OfflineLine /> : null}
          <p className="-mt-2 type-body-sm break-keep text-muted-foreground">
            {copy.deal.dupBody(typeLabel)}
          </p>
          {dup ? (
            <div className="rounded-card border border-border bg-card px-5">
              <DealRow
                as="div"
                type={dup.type}
                content={dup.content}
                {...dealMeta(dup, now)}
              >
                <p className="type-caption text-muted-foreground tabular-nums">
                  {copy.check.stillCount(dup.stillCount)}
                </p>
              </DealRow>
            </div>
          ) : null}
          <p className="type-caption break-keep text-muted-foreground">
            {copy.deal.dupMerged}
          </p>
        </Question>
      );
    case "text":
      return (
        <Question
          step={progress.step}
          total={progress.total}
          stepKey="text"
          eyebrow={typeLabel}
          title={copy.deal.qText}
          titleId={textId}
          onBack={() => setStep(withDup ? "dup" : "type")}
          footer={
            <PrimaryButton
              offline={false}
              disabled={
                !canSubmitContent(form.content, DEAL_CONTENT_MAX) || banned
              }
              onClick={() => setStep("confirm")}
            >
              {copy.sheet.next}
            </PrimaryButton>
          }
        >
          {offline ? <OfflineLine /> : null}
          <DealTextField
            labelId={textId}
            type={form.type}
            value={form.content}
            banned={banned}
            onChange={(v) => {
              set({ content: v });
              setBanned(false);
            }}
            onEnter={() => {
              if (canSubmitContent(form.content, DEAL_CONTENT_MAX) && !banned)
                setStep("confirm");
            }}
          />
        </Question>
      );
    case "confirm": {
      const when = whenText(dealDaysMask(form.dayIndexes), form.slots);
      const until = untilText(form.endsOn, now);
      const chip = untilChipOf(form.endsOn, now);
      const validDate = isEndsOnInRange(form.endsOn, now);
      return (
        <Question
          step={progress.step}
          total={progress.total}
          stepKey="confirm"
          title={copy.deal.qConfirm}
          onBack={() => setStep("text")}
          footer={
            <>
              {failureLine}
              <PrimaryButton
                offline={offline}
                busy={busy}
                disabled={!validDate}
                onClick={() => void submit()}
              >
                {failure?.error === "save"
                  ? moderationCopy.retry
                  : copy.deal.submit}
              </PrimaryButton>
            </>
          }
        >
          {offline ? <OfflineLine /> : null}
          {/* 확인 카드: 상세에 보일 모습 그대로 */}
          <div className="rounded-card border border-border bg-card px-5">
            <DealRow
              as="div"
              type={form.type ?? "other"}
              content={form.content.trim()}
              meta={
                <span className="flex flex-wrap items-center justify-between gap-x-3">
                  <span>
                    {copy.deal.summary(until, when ?? copy.deal.whenAny)}
                  </span>
                  <button
                    type="button"
                    aria-expanded={editing}
                    aria-controls={editPanelId}
                    aria-label={copy.deal.editLabel}
                    onClick={() => setEditing((v) => !v)}
                    className={cn(reportCls.text, "-my-2")}
                  >
                    {copy.deal.edit}
                  </button>
                </span>
              }
            />
            <div
              id={editPanelId}
              hidden={!editing}
              className={cn(
                "flex flex-col gap-5 border-t border-border py-4",
                enterClass,
              )}
            >
              <UntilField
                chip={picking ? null : chip}
                endsOn={form.endsOn}
                range={range}
                picking={picking}
                onChip={(days) => {
                  setPicking(false);
                  set({ endsOn: endsOnAfter(now, days) });
                }}
                onPick={() => setPicking(true)}
                onDate={(key) => set({ endsOn: key })}
              />
              <WhenFields
                dayIndexes={form.dayIndexes}
                slots={form.slots}
                onDays={(v) => set({ dayIndexes: v })}
                onSlots={(v) => set({ slots: v })}
              />
            </div>
          </div>
          <DealNotice />
        </Question>
      );
    }
    case "done":
      return merged ? (
        <DoneQuestion
          title={copy.deal.mergedTitle}
          body={copy.deal.mergedBody}
        />
      ) : (
        <DoneQuestion
          title={copy.deal.doneTitle}
          body={copy.deal.doneBody(doneUntil ?? untilText(form.endsOn, now))}
        />
      );
  }
}

/* ---------- 식당 정보 제보 (PLACE-05, D-13 안건 9) ---------- */

const PLACE_TITLES = {
  closed: reportLabels.placeKinds.closed,
  price: reportLabels.placeKinds.price,
  info: reportLabels.placeKinds.info,
} as const;

function PlaceQuestions({
  config,
  onSignedOut,
}: {
  config: Extract<ReportSheetConfig, { kind: "place" }>;
  onSignedOut: () => void;
}) {
  const client = useQueryClient();
  const online = useOnlineStatus();
  const offline = !online;
  const limit = useWriteLimit("reports");
  useSignedOutRedirect(limit, onSignedOut);
  const kind = config.report;
  const [detail, setDetail] = useState<PlaceDetailInput>({
    closed: null,
    price: "",
    fields: [],
  });
  const [sent, setSent] = useState(false);
  const [limitHit, setLimitHit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<WriteFailure | null>(null);
  const labelId = useId();

  if (limit.kind === "unknown" || limit.kind === "signedOut")
    return <LoadingQuestion title={PLACE_TITLES[kind]} />;
  if (limit.kind === "blocked" || limitHit)
    return <LimitQuestion title={PLACE_TITLES[kind]} bucket="reports" />;
  if (sent)
    return (
      <DoneQuestion title={copy.place.doneTitle} body={copy.place.doneBody} />
    );

  const valid = placeDetailValid(kind, detail);

  async function submit() {
    if (busy || !valid) return;
    setBusy(true);
    setFailure(null);
    const r = await reportPlaceAction(placeReportRequest(kind, detail, config));
    setBusy(false);
    if (!r.ok) {
      const c = classify(r, onSignedOut);
      if (c?.kind === "limit") setLimitHit(true);
      else if (c?.kind === "line") setFailure(c.failure);
      else if (c?.kind === "banned") setFailure({ ok: false, error: "banned" });
      return;
    }
    track({
      name: "report_submitted",
      properties: { type: reportEventType(kind) },
    });
    void invalidateAfterWrite(client, "place-report", config.placeId);
    setSent(true);
    config.onDone?.();
  }

  return (
    <Question
      step={1}
      total={1}
      stepKey={`place-${kind}`}
      eyebrow={PLACE_TITLES[kind]}
      title={copy.place.qDetail[kind]}
      titleId={labelId}
      footer={
        <>
          {failure ? <FailureLine failure={failure} /> : null}
          <PrimaryButton
            offline={offline}
            busy={busy}
            disabled={!valid}
            onClick={() => void submit()}
          >
            {failure?.error === "save"
              ? moderationCopy.retry
              : hasPlaceDetail(kind, detail)
                ? copy.place.submit
                : copy.place.submitSkip}
          </PrimaryButton>
        </>
      }
    >
      {offline ? <OfflineLine /> : null}
      {kind === "closed" ? (
        <ClosedChips
          labelId={labelId}
          value={detail.closed}
          onChange={(v) => setDetail((d) => ({ ...d, closed: v }))}
        />
      ) : kind === "info" ? (
        <InfoChips
          labelId={labelId}
          value={detail.fields}
          onChange={(v) => setDetail((d) => ({ ...d, fields: v }))}
        />
      ) : (
        <PriceInput
          value={detail.price}
          invalid={!valid}
          onChange={(v) => setDetail((d) => ({ ...d, price: v }))}
        />
      )}
      <RemainingLine limit={limit} />
    </Question>
  );
}

/* ---------- 후기 신고, 할인 신고 (MOD-01, DEAL-04, D-13 안건 10, 11) ---------- */

function FlagQuestions({
  config,
  onSignedOut,
}: {
  config: Extract<ReportSheetConfig, { kind: "flag" }>;
  onSignedOut: () => void;
}) {
  const client = useQueryClient();
  const online = useOnlineStatus();
  const offline = !online;
  const limit = useWriteLimit("reports");
  useSignedOutRedirect(limit, onSignedOut);
  const isDeal = config.target === "deal";
  const [reason, setReason] = useState<FlagReason | null>(null);
  const [step, setStep] = useState<"reason" | "confirm" | "done">("reason");
  const [etc, setEtc] = useState("");
  const [banned, setBanned] = useState(false);
  const [limitHit, setLimitHit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<WriteFailure | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const title = isDeal ? copy.flag.titleDeal : copy.flag.titleReview;

  if (limit.kind === "unknown" || limit.kind === "signedOut")
    return <LoadingQuestion title={title} />;
  if (limit.kind === "blocked" || limitHit)
    return <LimitQuestion title={title} bucket="reports" />;
  if (step === "done")
    return (
      <DoneQuestion
        title={copy.flag.doneTitle}
        body={isDeal ? copy.flag.doneBodyDeal : copy.flag.doneBodyReview}
      />
    );

  const options = isDeal
    ? DEAL_REPORT_REASONS.map((key) => ({
        key: key as FlagReason,
        label: reportLabels.dealReasons[key],
        hint: copy.flag.dealHints[key],
      }))
    : REVIEW_REPORT_REASONS.map((key) => ({
        key: key as FlagReason,
        label: reportLabels.reviewReasons[key],
        hint: copy.flag.reviewHints[key],
      }));

  if (step === "reason")
    return (
      <Question
        step={1}
        total={2}
        stepKey="reason"
        eyebrow={title}
        title={copy.flag.qReason}
      >
        {offline ? <OfflineLine /> : null}
        <blockquote className="-mt-1 line-clamp-3 border-l-2 border-border pl-3 type-body-sm break-keep text-muted-foreground">
          {config.quote}
        </blockquote>
        <RadioRows
          name={`report-reason-${config.target}`}
          legend={copy.flag.reasonLabel}
          options={options}
          value={reason}
          onChange={(k) => {
            setReason(k);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => setStep("confirm"), ADVANCE_MS);
          }}
        />
        <RemainingLine limit={limit} />
      </Question>
    );

  const label = options.find((o) => o.key === reason)?.label ?? "";

  async function submit() {
    if (!reason || busy || banned) return;
    setBusy(true);
    setFailure(null);
    const input = {
      reason,
      note: flagNote(reason, etc),
    };
    const r = isDeal
      ? await reportDealAction({
          dealId: config.targetId,
          ...(input as {
            reason: (typeof DEAL_REPORT_REASONS)[number];
            note: string | null;
          }),
        })
      : await reportReviewAction({
          reviewId: config.targetId,
          ...(input as {
            reason: (typeof REVIEW_REPORT_REASONS)[number];
            note: string | null;
          }),
        });
    setBusy(false);
    if (!r.ok) {
      const c = classify(r, onSignedOut);
      if (c?.kind === "limit") setLimitHit(true);
      else if (c?.kind === "banned") setBanned(true);
      else if (c?.kind === "line") setFailure(c.failure);
      return;
    }
    track({
      name: "report_submitted",
      properties: { type: reportEventType(config.target) },
    });
    void invalidateAfterWrite(client, "report", config.placeId);
    setStep("done");
    config.onDone?.();
  }

  return (
    <Question
      step={2}
      total={2}
      stepKey="confirm"
      eyebrow={title}
      title={copy.flag.confirmLine(label)}
      onBack={() => {
        setFailure(null);
        setStep("reason");
      }}
      footer={
        <>
          {failure ? <FailureLine failure={failure} /> : null}
          <PrimaryButton
            offline={offline}
            busy={busy}
            disabled={banned}
            onClick={() => void submit()}
          >
            {failure?.error === "save"
              ? moderationCopy.retry
              : copy.flag.submit}
          </PrimaryButton>
        </>
      }
    >
      {offline ? <OfflineLine /> : null}
      {reason === "other" ? (
        <EtcField
          value={etc}
          banned={banned}
          onChange={(v) => {
            setEtc(v);
            setBanned(false);
          }}
        />
      ) : null}
      <p className="type-caption break-keep text-muted-foreground">
        {copy.flag.note}
      </p>
    </Question>
  );
}
