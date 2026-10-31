"use client";
// 제보와 신고 시안 C "한 질문씩" (T6.3).
//
// 의도: 작은 시트(내용 높이만큼, Base UI Drawer)에 질문 하나만 둔다. 칩을 누르면 다음 질문으로 넘어가고,
//       선택 항목은 미리 채운 기본값(종료일 7일, 언제든)을 보여 주며 "다음"만 누르면 지나간다. 마지막은 확인 카드 한 장.
//       시트 위 가는 단계 막대가 남은 질문 수를 알려 준다. 끝나면 같은 시트 안에서 완료 표시.
// 중복 병합(DEAL-04): 유형을 고른 직후 같은 유형이 있으면 다음 질문 대신 "이미 제보된 정보가 있습니다" 단계가 끼어들고
//       기존 제보 카드 + 주 버튼 "아직 해요로 확인". 다른 내용이면 글자 버튼으로 내용 질문으로 간다.
// 한 탭(웨이팅): 누르면 버튼 줄이 "내 제보" 영수증으로 바뀐다. 남은 유효 시간(30분)을 고리 하나로 보여 주고,
//       같은 고리가 쿨다운(30분 1회)도 함께 알린다.
// 한 탭(아직 해요/끝났어요): 끝났어요 누적을 점 3개로 보여 준다(3명이면 숨김, AC-DEAL-3).
// 모션: 시트 높이 slow 300 enter, 질문 바뀜 base 페이드 + 4px, 단계 막대 채움 base, 고리는 정적. 축소 모드면 즉시.
import { ChevronLeft, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Chip, ChipGroup } from "@/components/ui/chip";
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
import { badgeCopy } from "@/copy/badges";
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
  type DealType,
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
  DoneMark,
  EtcField,
  FieldLabel,
  FormSkeleton,
  HiddenReview,
  LimitBlock,
  OfflineLine,
  PlaceKindDetail,
  RadioRows,
  ReportFrame,
  RestFooter,
  ReviewList,
  ReviewReportButton,
  SendFailed,
  UntilChips,
  WaitButtons,
  cls,
  enterClass,
  useScrollOnMount,
  nowSummaryOf,
  placeKindLabel,
  reasonOptions,
  untilText,
  type CheckValue,
  type ReasonKey,
  type WaitLevel,
  type WhenValue,
} from "../shared";

type SheetFlow = "deal" | "place" | "review-report";

/** "언제" 빠른 칩 (C는 요일과 시간대를 자주 쓰는 묶음 4개로 줄였다) */
const WHEN_QUICK: readonly { key: string; label: string; when: WhenValue }[] = [
  { key: "any", label: "언제든", when: { days: [], slots: [] } },
  {
    key: "weekdayLunch",
    label: "평일 점심",
    when: { days: ["월", "화", "수", "목", "금"], slots: ["lunch"] },
  },
  {
    key: "weekdayDinner",
    label: "평일 저녁",
    when: { days: ["월", "화", "수", "목", "금"], slots: ["dinner"] },
  },
  { key: "weekend", label: "주말", when: { days: ["토", "일"], slots: [] } },
];

/** 내용 질문의 추천 문장: 유형 + 가격 제보 가운데 값 */
const SUGGEST: Record<DealType, string> = {
  lunchSpecial: "점심특선 순대국 9천 원",
  discount: "포장하면 1천 원 할인",
  event: "오픈 기념 음료 한 잔 무료",
  happyHour: "오후 5시~7시 수육 반 접시 추가 무료",
  etc: "도장 10개 모으면 한 그릇 무료",
};

export function ReportC({ params }: { params: ReportParams }) {
  const offline = params.state === "offline";
  const loading = params.state === "loading";
  const empty = params.state === "empty";
  const stats = empty ? STATS_EMPTY : STATS;
  const done = params.phase === "done";
  const waitRef = useScrollOnMount<HTMLDivElement>(params.flow === "wait");
  const dealsRef = useScrollOnMount<HTMLElement>(params.flow === "deal-check");

  const [sheet, setSheet] = useState<SheetFlow | null>(
    params.flow === "deal" ||
      params.flow === "place" ||
      params.flow === "review-report"
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

  const openFlow = (flow: ReportFlow, k?: PlaceReportKind) => {
    if (k) setKind(k);
    if (flow === "deal" || flow === "place" || flow === "review-report")
      setSheet(flow);
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
    <div ref={waitRef} className="flex flex-col gap-4">
      {myWait ? (
        <WaitReceipt
          level={myWait.level}
          justNow={myWait.justNow}
          onUndo={myWait.justNow ? () => setMyWait(null) : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          <p className="type-body-sm">{nowSummaryOf(waiting, null, 0)}</p>
          <p className="type-caption text-muted-foreground">{copy.wait.ask}</p>
          <WaitButtons
            selected={null}
            disabled={offline}
            onPick={(level) => !offline && setMyWait({ level, justNow: true })}
          />
          <p className="type-caption break-keep text-muted-foreground">
            {copy.wait.peakNote}
          </p>
        </div>
      )}

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
              const ended = d.ended + (v === "ended" ? 1 : 0);
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
                    <div className="flex flex-col gap-2 pt-1">
                      <CheckPair
                        label={d.text}
                        value={v}
                        disabled={offline}
                        onPick={(nv) =>
                          setChecks((c) => ({
                            ...c,
                            [d.id]: c[d.id] === nv ? null : nv,
                          }))
                        }
                      />
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p
                          role={v ? "status" : undefined}
                          className="type-caption text-muted-foreground tabular-nums"
                        >
                          {v === "ended"
                            ? copy.check.endedDone
                            : v === "still"
                              ? copy.check.stillCountWithMe(still)
                              : copy.check.stillCount(still)}
                        </p>
                        <EndedTally count={ended} />
                      </div>
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
          onClick={() => !offline && setSheet("deal")}
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
    <ReportFrame
      footer={
        <RestFooter onFlow={openFlow} offline={offline} menuOpen={params.menu} />
      }
      overlay={
        <SheetC
          flow={sheet}
          onClose={() => setSheet(null)}
          params={params}
          kind={kind}
          target={target}
          deals={deals}
          onDealDone={(deal) => setDeals((list) => [deal, ...list])}
          onMerge={(id) => setChecks((c) => ({ ...c, [id]: "still" }))}
          onReported={() => {
            if (target === "review")
              setHidden((h) =>
                h.includes(REPORTED_REVIEW_ID) ? h : [...h, REPORTED_REVIEW_ID],
              );
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
  );
}

/* ---------- 한 탭 조각 ---------- */

/** 끝났어요 누적 점 3개 (3명이면 숨김) */
function EndedTally({ count }: { count: number }) {
  const n = Math.min(3, count);
  return (
    <span
      role="img"
      aria-label={copy.check.endedTally(n)}
      className="inline-flex items-center gap-1.5 type-caption text-muted-foreground"
    >
      <span aria-hidden className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "size-1.5 rounded-full border border-muted-foreground transition-colors duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
              i < n && "bg-muted-foreground",
            )}
          />
        ))}
      </span>
      <span aria-hidden className="tabular-nums">
        {copy.check.endedTally(n)}
      </span>
    </span>
  );
}

/** 내 웨이팅 제보 영수증: 남은 시간 고리 + 한 줄 + (방금이면) 취소 */
function WaitReceipt({
  level,
  justNow,
  onUndo,
}: {
  level: WaitLevel;
  justNow: boolean;
  onUndo?: () => void;
}) {
  const left = justNow ? 30 : MY_WAIT.left;
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div role="status" className={cn("flex items-center gap-4", enterClass)}>
      <span
        role="img"
        aria-label={copy.wait.ringLabel(left)}
        className="relative inline-flex size-16 shrink-0 items-center justify-center"
      >
        <svg aria-hidden viewBox="0 0 48 48" className="absolute inset-0 size-16 -rotate-90">
          <circle cx="24" cy="24" r={r} fill="none" strokeWidth="2" className="stroke-border" />
          <circle
            cx="24"
            cy="24"
            r={r}
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - left / 30)}
            className="stroke-primary"
          />
        </svg>
        <span aria-hidden className="flex flex-col items-center leading-none">
          <span className="type-caption font-medium text-foreground tabular-nums">
            {copy.wait.ringLeft(left)}
          </span>
          <span className="mt-0.5 text-[0.6875rem] text-muted-foreground">
            {copy.wait.ringCaption}
          </span>
        </span>
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="type-body-sm">
          {justNow
            ? copy.wait.justNow(badgeCopy.waitingLevels[level])
            : copy.wait.cooldownMine(
                MY_WAIT.minutesAgo,
                badgeCopy.waitingLevels[level],
              )}
        </p>
        <p className="type-caption break-keep text-muted-foreground">
          {copy.wait.cooldown(
            justNow ? COOLDOWN_UNTIL_LABEL : MY_WAIT_COOLDOWN_LABEL,
          )}
        </p>
        {onUndo ? (
          <button type="button" onClick={onUndo} className={cn(cls.text, "self-start")}>
            {copy.wait.undo}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- 질문 시트 ---------- */

type DealStep = "type" | "dup" | "text" | "when" | "confirm" | "done";

function initialDealStep(p: ReportParams): DealStep {
  if (p.phase === "done") return "done";
  if (p.phase === "dup") return "dup";
  if (p.error === "banned-word") return "text";
  if (p.state === "error") return "confirm";
  return (["type", "text", "when", "confirm"] as const)[p.step - 1] ?? "type";
}

function SheetC({
  flow,
  onClose,
  params,
  kind,
  target,
  deals,
  onDealDone,
  onMerge,
  onReported,
}: {
  flow: SheetFlow | null;
  onClose: () => void;
  params: ReportParams;
  kind: PlaceReportKind;
  target: "review" | "deal";
  deals: readonly DealItem[];
  onDealDone: (deal: DealItem) => void;
  onMerge: (dealId: string) => void;
  onReported: () => void;
}) {
  const container = useDesignPortalContainer();
  const [shown, setShown] = useState<SheetFlow | null>(flow);
  if (flow && flow !== shown) setShown(flow);
  return (
    <Drawer open={flow !== null} onOpenChange={(o) => (o ? null : onClose())}>
      <DrawerPortal container={container ?? undefined}>
        <DrawerBackdrop className="z-40 min-[64rem]:right-auto min-[64rem]:w-2/5" />
        <DrawerViewport className="z-50 min-[64rem]:justify-start">
          <DrawerPopup className="max-h-[80%] data-ending-style:duration-(--lm-duration-fast) data-ending-style:ease-exit min-[64rem]:w-2/5 min-[64rem]:max-w-none">
            <DrawerHandle className="mt-3 mb-0 h-1 w-9" />
            {shown === "deal" ? (
              <DealQuestions
                params={params}
                deals={deals}
                onDone={onDealDone}
                onMerge={onMerge}
              />
            ) : shown === "place" ? (
              <PlaceQuestions params={params} kind={kind} />
            ) : shown === "review-report" ? (
              <ReportQuestions
                params={params}
                target={target}
                deals={deals}
                onDone={onReported}
              />
            ) : null}
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  );
}

/** 질문 한 장: 단계 막대 + 뒤로 + 제목(질문) + 본문 + 바닥 */
function Question({
  step,
  total,
  eyebrow,
  title,
  onBack,
  children,
  footer,
  stepKey,
  titleId,
}: {
  /** 질문 제목 id. 입력칸 이름으로 쓴다(보이는 라벨) */
  titleId?: string;
  /** 0이면 단계 막대 없음(한도, 완료) */
  step: number;
  total: number;
  eyebrow?: string;
  title: string;
  onBack?: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  /** 바뀌면 본문 등장 효과를 다시 */
  stepKey: string;
}) {
  return (
    <>
      <div className="flex items-center gap-2 px-(--lm-layout-gutter) pt-2 min-[64rem]:px-10">
        {onBack ? (
          <button
            type="button"
            aria-label={copy.deal.back}
            onClick={onBack}
            className={cn(cls.ghostIcon, "-ml-2.5")}
          >
            <ChevronLeft aria-hidden className="size-5" strokeWidth={1.5} />
          </button>
        ) : (
          <span className="size-11 -ml-2.5" aria-hidden />
        )}
        {step > 0 ? (
          <div
            role="progressbar"
            aria-label={copy.deal.stepOf(step, total)}
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
        <DrawerClose aria-label={copy.errors.close} className={cn(cls.ghostIcon, "-mr-2.5")}>
          <X aria-hidden className="size-5" strokeWidth={1.5} />
        </DrawerClose>
      </div>
      <DrawerContent className="flex flex-col pt-3 pb-6 min-[64rem]:px-10">
        <div key={stepKey} className={cn("flex flex-col gap-5", enterClass)}>
          <div className="flex flex-col gap-1">
            {eyebrow ? (
              <p className="type-caption text-muted-foreground">{eyebrow}</p>
            ) : null}
            <DrawerTitle id={titleId}>{title}</DrawerTitle>
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

function LimitQuestion({ kind }: { kind: "deal" | "report" }) {
  return (
    <Question
      step={0}
      total={0}
      stepKey="limit"
      title={kind === "deal" ? copy.deal.formTitle : copy.reportReview.title}
      footer={
        <DrawerClose className={buttonClass("secondary")}>
          {copy.errors.close}
        </DrawerClose>
      }
    >
      <LimitBlock kind={kind} headingLevel="h3" />
    </Question>
  );
}

function LoadingQuestion({ title }: { title: string }) {
  return (
    <Question step={0} total={0} stepKey="loading" title={title}>
      <FormSkeleton rows={1} />
    </Question>
  );
}

function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-disabled={disabled || undefined}
      onClick={() => !disabled && onClick()}
      className={buttonClass("primary")}
    >
      {children}
    </button>
  );
}

function DealQuestions({
  params,
  deals,
  onDone,
  onMerge,
}: {
  params: ReportParams;
  deals: readonly DealItem[];
  onDone: (deal: DealItem) => void;
  onMerge: (dealId: string) => void;
}) {
  const offline = params.state === "offline";
  const [step, setStep] = useState<DealStep>(initialDealStep(params));
  const [type, setType] = useState<DealType | null>(
    params.phase === "dup"
      ? "lunchSpecial"
      : params.error === "banned-word"
        ? "etc"
        : params.state === "error" || params.step > 1
          ? "happyHour"
          : null,
  );
  const [text, setText] = useState(
    params.error === "banned-word"
      ? BANNED_TEXT
      : params.state === "error" || params.step > 2
        ? FILLED_TEXT
        : "",
  );
  const [banned, setBanned] = useState(params.error === "banned-word");
  const [untilDays, setUntilDays] = useState(DEFAULT_UNTIL_DAYS);
  const [whenKey, setWhenKey] = useState(
    params.state === "error" ? "weekdayDinner" : "any",
  );
  const [merged, setMerged] = useState(false);
  const typeId = useId();
  const textId = useId();
  const untilId = useId();
  const whenId = useId();

  if (params.state === "loading")
    return <LoadingQuestion title={copy.deal.formTitle} />;
  if (params.error === "limit") return <LimitQuestion kind="deal" />;

  const total = 4;
  const typeLabel = type ? copy.deal.types[type] : "";
  const dup = deals.find((d) => d.type === type && d.id !== "new") ?? null;
  const when = WHEN_QUICK.find((w) => w.key === whenKey);
  const preview: DealItem = {
    ...NEW_DEAL,
    type: type ?? NEW_DEAL.type,
    text: text || NEW_DEAL.text,
    until: untilText(untilDays),
    when: !when || when.key === "any" ? null : when.label,
  };

  switch (step) {
    case "type":
      return (
        <Question
          step={1}
          total={total}
          stepKey="type"
          title={copy.deal.qType}
          titleId={typeId}
        >
          {offline ? <OfflineLine /> : null}
          <DealTypeChips
            labelId={typeId}
            value={type}
            onChange={(t) => {
              setType(t);
              // 고르면 바로 다음 질문. 같은 유형이 있으면 병합 단계가 끼어든다
              setStep(deals.some((d) => d.type === t) ? "dup" : "text");
            }}
          />
          <p className="type-caption break-keep text-muted-foreground">
            {copy.deal.noScore}
          </p>
        </Question>
      );
    case "dup":
      return (
        <Question
          step={1}
          total={total}
          stepKey="dup"
          eyebrow={typeLabel}
          title={copy.deal.dupTitle}
          onBack={() => setStep("type")}
          footer={
            <>
              <PrimaryButton
                disabled={offline}
                onClick={() => {
                  if (dup) onMerge(dup.id);
                  setMerged(true);
                  setStep("done");
                }}
              >
                {offline ? copy.errors.offlineButton : copy.deal.dupConfirm}
              </PrimaryButton>
              <button
                type="button"
                onClick={() => setStep("text")}
                className={cn(cls.text, "self-center")}
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
            <ul className="rounded-card border border-border bg-card px-5">
              <DealRow deal={dup}>
                <p className="type-caption text-muted-foreground tabular-nums">
                  {copy.check.stillCount(dup.still)}
                </p>
              </DealRow>
            </ul>
          ) : null}
          <p className="type-caption break-keep text-muted-foreground">
            {copy.deal.dupMerged}
          </p>
        </Question>
      );
    case "text":
      return (
        <Question
          step={2}
          total={total}
          stepKey="text"
          eyebrow={typeLabel}
          title={copy.deal.qText}
          titleId={textId}
          onBack={() => setStep("type")}
          footer={
            <PrimaryButton
              disabled={!text.trim() || banned}
              onClick={() => setStep("when")}
            >
              {copy.deal.next}
            </PrimaryButton>
          }
        >
          {offline ? <OfflineLine /> : null}
          <DealTextField
            labelId={textId}
            type={type}
            value={text}
            invalid={banned}
            onChange={(v) => {
              setText(v);
              setBanned(false);
            }}
          />
          {type && !text ? (
            <div className="flex flex-col gap-2">
              <p className="type-caption text-muted-foreground">
                {copy.deal.qTextSuggest}
              </p>
              <button
                type="button"
                onClick={() => setText(SUGGEST[type])}
                className={cn(cls.pill, "self-start whitespace-normal text-left")}
              >
                {SUGGEST[type]}
              </button>
            </div>
          ) : null}
        </Question>
      );
    case "when":
      return (
        <Question
          step={3}
          total={total}
          stepKey="when"
          eyebrow={typeLabel}
          title={copy.deal.qWhen}
          onBack={() => setStep("text")}
          footer={
            <PrimaryButton onClick={() => setStep("confirm")}>
              {copy.deal.next}
            </PrimaryButton>
          }
        >
          <p className="-mt-2 type-body-sm break-keep text-muted-foreground">
            {copy.deal.qWhenLead}
          </p>
          <div className="flex flex-col gap-2.5">
            <FieldLabel id={untilId}>
              {copy.deal.untilLabel}
              <span className="type-caption text-muted-foreground tabular-nums">
                {copy.deal.untilDate(untilText(untilDays))}
              </span>
            </FieldLabel>
            <UntilChips labelId={untilId} value={untilDays} onChange={setUntilDays} />
          </div>
          <div className="flex flex-col gap-2.5">
            <FieldLabel id={whenId} optional>
              {copy.deal.whenLabel}
            </FieldLabel>
            <ChipGroup
              aria-labelledby={whenId}
              value={[whenKey]}
              onValueChange={(v) => {
                const next = v[0] as string | undefined;
                if (next) setWhenKey(next);
              }}
            >
              {WHEN_QUICK.map((w) => (
                <Chip key={w.key} value={w.key}>
                  {w.label}
                </Chip>
              ))}
            </ChipGroup>
          </div>
        </Question>
      );
    case "confirm":
      return (
        <Question
          step={4}
          total={total}
          stepKey="confirm"
          title={copy.deal.qConfirm}
          onBack={() => setStep("when")}
          footer={
            <>
              {params.state === "error" ? <SendFailed className="mb-2" /> : null}
              <PrimaryButton
                disabled={offline}
                onClick={() => {
                  onDone(preview);
                  setStep("done");
                }}
              >
                {offline
                  ? copy.errors.offlineButton
                  : params.state === "error"
                    ? copy.errors.retry
                    : copy.deal.submit}
              </PrimaryButton>
            </>
          }
        >
          {offline ? <OfflineLine /> : null}
          <ul className="rounded-card border border-border bg-card px-5">
            <DealRow deal={preview} />
          </ul>
          <DealNotice />
        </Question>
      );
    case "done":
      return (
        <Question
          step={0}
          total={0}
          stepKey="done"
          title={copy.errors.thanks}
          footer={
            <DrawerClose className={buttonClass("secondary")}>
              {copy.errors.close}
            </DrawerClose>
          }
        >
          <DoneMark
            headingLevel="h3"
            title={merged ? copy.deal.mergedToast : copy.deal.doneTitle}
            body={
              merged
                ? copy.deal.mergedBody
                : copy.deal.doneBody(untilText(untilDays))
            }
          />
        </Question>
      );
  }
}

function PlaceQuestions({
  params,
  kind,
}: {
  params: ReportParams;
  kind: PlaceReportKind;
}) {
  const offline = params.state === "offline";
  const [detail, setDetail] = useState<string[]>([]);
  const [sent, setSent] = useState(params.phase === "done");
  if (params.state === "loading")
    return <LoadingQuestion title={copy.place.title} />;
  if (params.error === "limit") return <LimitQuestion kind="report" />;
  if (sent)
    return (
      <Question
        step={0}
        total={0}
        stepKey="done"
        title={copy.errors.thanks}
        footer={
          <DrawerClose className={buttonClass("secondary")}>
            {copy.errors.close}
          </DrawerClose>
        }
      >
        <DoneMark
          headingLevel="h3"
          title={copy.place.doneTitle}
          body={copy.place.doneBody}
        />
      </Question>
    );
  return (
    <Question
      step={1}
      total={1}
      stepKey={`place-${kind}`}
      eyebrow={placeKindLabel(kind)}
      title={copy.place.qDetail[kind]}
      footer={
        <>
          {params.state === "error" ? <SendFailed className="mb-2" /> : null}
          <PrimaryButton disabled={offline} onClick={() => setSent(true)}>
            {offline
              ? copy.errors.offlineButton
              : params.state === "error"
                ? copy.errors.retry
                : detail.filter(Boolean).length
                  ? copy.place.submit
                  : copy.place.submitSkip}
          </PrimaryButton>
        </>
      }
    >
      {offline ? <OfflineLine /> : null}
      <PlaceKindDetail
        hideLabel
        kind={kind}
        value={detail}
        onChange={setDetail}
      />
    </Question>
  );
}

function ReportQuestions({
  params,
  target,
  deals,
  onDone,
}: {
  params: ReportParams;
  target: "review" | "deal";
  deals: readonly DealItem[];
  onDone: () => void;
}) {
  const offline = params.state === "offline";
  const [reason, setReason] = useState<ReasonKey | null>(
    params.error === "banned-word" || params.state === "error" || params.step > 1
      ? "etc"
      : null,
  );
  const [step, setStep] = useState<"reason" | "confirm" | "done">(
    params.phase === "done"
      ? "done"
      : params.error === "banned-word" || params.state === "error" || params.step > 1
        ? "confirm"
        : "reason",
  );
  const [etc, setEtc] = useState(
    params.error === "banned-word" ? BANNED_TEXT.slice(0, 40) : "",
  );
  const [banned, setBanned] = useState(params.error === "banned-word");

  if (params.state === "loading")
    return <LoadingQuestion title={copy.reportReview.title} />;
  if (params.error === "limit") return <LimitQuestion kind="report" />;
  const title =
    target === "deal" ? copy.reportReview.titleDeal : copy.reportReview.title;
  const quote =
    target === "deal"
      ? (deals.find((d) => d.id === "d1")?.text ?? "")
      : (STATS.reviews?.find((r) => r.id === REPORTED_REVIEW_ID)?.text ?? "");

  if (step === "done")
    return (
      <Question
        step={0}
        total={0}
        stepKey="done"
        title={copy.errors.thanks}
        footer={
          <DrawerClose className={buttonClass("secondary")}>
            {copy.errors.close}
          </DrawerClose>
        }
      >
        <DoneMark
          headingLevel="h3"
          title={copy.reportReview.doneTitle}
          body={copy.reportReview.doneBody}
        />
      </Question>
    );
  if (step === "reason")
    return (
      <Question
        step={1}
        total={2}
        stepKey="reason"
        eyebrow={title}
        title={copy.reportReview.qReason}
      >
        {offline ? <OfflineLine /> : null}
        <blockquote className="-mt-1 border-l-2 border-border pl-3 type-body-sm break-keep text-muted-foreground">
          {quote}
        </blockquote>
        <RadioRows
          name={`c-reason-${target}`}
          legend={copy.reportReview.reasonLabel}
          legendClassName="sr-only"
          options={reasonOptions(target)}
          value={reason}
          onChange={(k) => {
            setReason(k);
            setStep("confirm");
          }}
        />
      </Question>
    );
  const label = reason ? copy.reportReview.reasons[reason] : "";
  return (
    <Question
      step={2}
      total={2}
      stepKey="confirm"
      eyebrow={title}
      title={copy.reportReview.confirmLine(label)}
      onBack={() => setStep("reason")}
      footer={
        <>
          {params.state === "error" ? <SendFailed className="mb-2" /> : null}
          <PrimaryButton
            disabled={offline || banned}
            onClick={() => {
              onDone();
              setStep("done");
            }}
          >
            {offline
              ? copy.errors.offlineButton
              : params.state === "error"
                ? copy.errors.retry
                : copy.reportReview.submit}
          </PrimaryButton>
        </>
      }
    >
      {offline ? <OfflineLine /> : null}
      {reason === "etc" ? (
        <EtcField
          value={etc}
          invalid={banned}
          onChange={(v) => {
            setEtc(v);
            setBanned(false);
          }}
        />
      ) : null}
      <p className="type-caption break-keep text-muted-foreground">
        {copy.reportReview.note}
      </p>
    </Question>
  );
}
