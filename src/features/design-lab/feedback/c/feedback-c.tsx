"use client";
// 식후 피드백 시안 C "한 번에 하나" (T6.1).
//
// 의도: 한 탭으로 손이 이미 띠에 와 있을 때 바로 한 가지만 더 묻는다. 고마움 줄 아래에서 띠가 질문 하나짜리 칸이 되고,
//       세리프 질문 하나와 답 칩만 보인다. 가격 칩을 누르면 다음 질문으로 넘어간다(답도 한 탭).
//       1인 얼마였어요? → 어떤 곳이었나요? → 한 줄 남길까요? 세 단계, 언제든 건너뛰기와 닫기.
// 가격: 추정가 둘레 칩 3개(-1천, 추정, +1천) + "직접". 칩은 고르는 즉시 다음 단계.
// 무시하면(D-05): 묻는 띠의 "안 갔어요" 옆에 "나중에"를 둔다. 누르면 띠가 "나 탭 기록에서 언제든 남길 수 있습니다." 한 줄로
//       바뀌고 그날은 다시 묻지 않는다. 누르지 않고 지나가면 띠는 그날 그대로.
// 상세(FB-06, 07): "후기 쓰기"는 같은 단계 칸(첫 단계에 한 탭 답이 더해져 4단계). 내 후기는 항목 줄(만족, 가격, 태그, 한 줄)로
//       보여 주고, 줄을 누르면 그 질문 하나만 그 자리에서 고친다. 삭제는 맨 아래 글자 버튼 + 확인.
// 신고 진입점(MOD-01): 다른 사람 후기를 누르면 전체 글이 펼쳐지고 그 끝에 "신고" 글자 버튼. 평소에는 보이지 않는다.
// 모션: 띠 높이 base(AutoHeight), 질문이 바뀔 때 새 질문이 4px 옆에서 페이드 base, 진행 막대 채움 fast. 축소 모드는 즉시.
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { buttonClass as rawButtonClass } from "@/components/ui/button-classes";
import { focusRing } from "@/components/ui/interaction";
import { feedbackLabCopy as copy } from "@/copy/design-lab-feedback";
import { AutoHeight } from "@/features/design-lab/home/shared/yesterday";
import { ReviewByline } from "@/features/design-lab/place/shared";
import type { DetailReview } from "@/features/design-lab/place/detail-mock";
import { formatWon } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MY_REVIEW, detailFor, pricePresets, type MyReview } from "../mock";
import type { FeedbackAnswer, FeedbackParams } from "../params";
import {
  BandAsk,
  BandError,
  BandLine,
  BandRule,
  BandSkeleton,
  BandThanks,
  ComposerError,
  DeleteConfirm,
  DetailFrame,
  EMPTY_DRAFT,
  FeedbackHome,
  FieldHead,
  PriceChips,
  RatingField,
  RemovedLine,
  ReviewField,
  SectionTitle,
  TagChips,
  TextButton,
  VisibilityField,
  WriteOffline,
  bandCopy,
  bandMode,
  bandPlace,
  draftFromReview,
  hasDetails,
  initialAnswer,
  useDraft,
  useReportNotice,
  type DraftApi,
} from "../shared";

/** 기본 border-transparent와 variant 테두리색이 겹쳐 cn으로 정리한다(테두리 버튼이 투명해지는 것 방지) */
const buttonClass = (...args: Parameters<typeof rawButtonClass>) =>
  cn(rawButtonClass(...args));

export function FeedbackC({ p }: { p: FeedbackParams }) {
  return p.view === "detail" ? <DetailC p={p} /> : <HomeC p={p} />;
}

/** 칩을 고른 뒤 다음 질문으로 넘어가기 전 잠깐(고른 칩이 보이게). 축소 모드여도 같다(움직임이 아니라 대기) */
const ADVANCE_DELAY_MS = 220;

type StepKey = "rating" | "price" | "tags" | "review";

/* ---------- 홈 ---------- */

function HomeC({ p }: { p: FeedbackParams }) {
  const mode = bandMode(p);
  const band =
    mode === "skeleton" ? (
      <BandSkeleton />
    ) : mode === "none" ? null : (
      <BandC p={p} />
    );
  return <FeedbackHome p={p} band={band} />;
}

function BandC({ p }: { p: FeedbackParams }) {
  const { place, name } = bandPlace(p);
  const saveFailed = p.state === "error" && p.fail === "save";
  const [answer, setAnswer] = useState<FeedbackAnswer | null>(
    saveFailed ? p.answer : initialAnswer(p),
  );
  const [later, setLater] = useState(p.flow === "later");
  // ask에서 답하면 바로 단계 칸이 열린다. ?flow=thanks는 단계를 닫은(건너뛴) 뒤의 고마움 줄
  const [stepsOpen, setStepsOpen] = useState(p.flow === "compose");
  const [saved, setSaved] = useState(p.flow === "saved");
  const [failed, setFailed] = useState(saveFailed && p.flow !== "compose");
  const [touched, setTouched] = useState(false);
  const draft = useDraft(EMPTY_DRAFT);

  let body: ReactNode;
  if (failed) {
    body = <BandError onRetry={() => setFailed(false)} />;
  } else if (later) {
    body = (
      <BandLine tone="quiet" focusOnMount={touched}>
        {copy.later.deferred}
      </BandLine>
    );
  } else if (answer === null) {
    body = (
      <BandAsk
        place={place}
        name={name}
        onAnswer={(a) => {
          setTouched(true);
          setAnswer(a);
          setStepsOpen(a !== "skipped");
        }}
        extra={
          <TextButton
            onClick={() => {
              setTouched(true);
              setLater(true);
            }}
          >
            {copy.later.action}
          </TextButton>
        }
      />
    );
  } else if (saved) {
    body = <BandLine focusOnMount={touched}>{copy.composer.saved}</BandLine>;
  } else if (stepsOpen && answer !== "skipped") {
    body = (
      <>
        <Steps
          headingLevel="h2"
          lead={
            <p
              role="status"
              className="flex min-w-0 items-center gap-2 type-body-sm"
            >
              <Check
                aria-hidden
                className="size-4 shrink-0 text-success"
                strokeWidth={1.75}
              />
              <span className="truncate">{bandCopy.thanks}</span>
              <span className="sr-only">{bandCopy.thanksBody}</span>
            </p>
          }
          keys={["price", "tags", "review"]}
          initialStep={p.step - 1}
          draft={draft}
          estimateKRW={place.priceKRW}
          error={saveFailed}
          focusOnMount={touched}
          onClose={() => setStepsOpen(false)}
          onDone={(any) => {
            setStepsOpen(false);
            if (any) setSaved(true);
          }}
          className="pt-1 pb-4"
        />
      </>
    );
  } else {
    body = (
      <BandThanks
        answer={answer}
        focusOnMount={touched}
        action={
          <TextButton onClick={() => setStepsOpen(true)}>
            {bandCopy.more}
          </TextButton>
        }
      />
    );
  }

  return (
    <AutoHeight>
      <BandRule>{body}</BandRule>
    </AutoHeight>
  );
}

/* ---------- 단계 칸 ---------- */

function Progress({ step, total }: { step: number; total: number }) {
  return (
    <div
      role="img"
      aria-label={copy.steps.progress(step + 1, total)}
      className="flex items-center gap-1"
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-0.5 w-5 rounded-full transition-colors duration-(--lm-duration-fast) ease-standard motion-reduce:transition-none",
            i <= step ? "bg-foreground" : "bg-border",
          )}
        />
      ))}
    </div>
  );
}

/**
 * 질문 하나씩. keys 순서대로 묻고, 마지막 단계에서 "마치기".
 * onDone(any): 무엇이든 남겼는지. onClose: 닫기(지금까지 고른 것은 남긴다고 보고 실제 구현에서 함께 보낸다).
 */
function Steps({
  keys,
  lead,
  headingLevel = "h3",
  initialStep = 0,
  draft,
  estimateKRW,
  error = false,
  focusOnMount = false,
  onClose,
  onDone,
  className,
}: {
  keys: readonly StepKey[];
  /** 맨 윗줄 왼쪽(홈: 고마움 한 줄) */
  lead?: ReactNode;
  /** 홈은 h1(오늘의 추천) 아래라 h2, 상세는 섹션 h2 아래라 h3 */
  headingLevel?: "h2" | "h3";
  initialStep?: number;
  draft: DraftApi;
  estimateKRW: number;
  error?: boolean;
  focusOnMount?: boolean;
  onClose: () => void;
  onDone: (any: boolean) => void;
  className?: string;
}) {
  const ids = useId();
  const [step, setStep] = useState(
    Math.min(Math.max(initialStep, 0), keys.length - 1),
  );
  const headRef = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const key = keys[step] ?? "price";
  const last = step === keys.length - 1;

  useEffect(() => {
    // 질문이 바뀌면(또는 처음 열리면) 질문으로 포커스를 옮겨 스크린 리더가 새 질문을 읽게 한다
    if (moved.current || focusOnMount)
      headRef.current?.focus({ preventScroll: true });
  }, [step, focusOnMount]);

  const go = (next: number) => {
    moved.current = true;
    if (next >= keys.length) {
      onDone(hasDetails(draft.draft) || draft.draft.thumb !== null);
      return;
    }
    setStep(Math.max(0, next));
  };
  const advanceSoon = () => window.setTimeout(() => go(step + 1), ADVANCE_DELAY_MS);

  const headId = `${ids}-q`;
  const question =
    key === "rating"
      ? copy.composer.rating
      : key === "price"
        ? copy.steps.price
        : key === "tags"
          ? copy.steps.tags
          : copy.steps.review;
  const needsRating = key === "rating" && draft.draft.thumb === null;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex min-h-11 items-center gap-3">
        {step > 0 ? (
          <button
            type="button"
            aria-label={copy.steps.back}
            onClick={() => go(step - 1)}
            className={cn(
              "-ml-3 inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
              focusRing,
            )}
          >
            <ChevronLeft aria-hidden className="size-5" strokeWidth={1.5} />
          </button>
        ) : null}
        {lead ? <div className="min-w-0 flex-1">{lead}</div> : null}
        <Progress step={step} total={keys.length} />
        <button
          type="button"
          aria-label={copy.composer.close}
          onClick={onClose}
          className={cn(
            "-mr-3",
            !lead && "ml-auto",
            " inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
            focusRing,
          )}
        >
          <X aria-hidden className="size-5" strokeWidth={1.5} />
        </button>
      </div>

      <div
        key={key}
        ref={headRef}
        tabIndex={-1}
        role="group"
        aria-labelledby={headId}
        className="flex flex-col gap-4 outline-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-1 motion-safe:[animation-duration:var(--lm-duration-base)] motion-safe:[animation-timing-function:var(--lm-ease-enter)]"
      >
        <FieldHead
          id={headId}
          title={question}
          as={headingLevel}
          serif
          hint={key === "tags" ? copy.composer.tagsHint : undefined}
        />
        {key === "rating" ? (
          <RatingField
            value={draft.draft.thumb}
            onChange={(thumb) => {
              draft.patch({ thumb });
              advanceSoon();
            }}
            labelledBy={headId}
            size="lg"
          />
        ) : key === "price" ? (
          <PriceChips
            draft={draft}
            presets={pricePresets(estimateKRW, 3)}
            labelledBy={headId}
            onPicked={advanceSoon}
          />
        ) : key === "tags" ? (
          <TagChips draft={draft} labelledBy={headId} />
        ) : (
          <div className="flex flex-col gap-5">
            <ReviewField
              draft={draft}
              label={copy.composer.review}
              labelHidden
            />
            <VisibilityField draft={draft} />
          </div>
        )}
      </div>

      {error && last ? <ComposerError /> : null}
      <div className="flex min-h-11 items-center justify-between gap-3">
        {key === "rating" ? (
          <span />
        ) : (
          <TextButton onClick={() => go(step + 1)}>
            {copy.steps.skip}
          </TextButton>
        )}
        {key === "tags" || key === "review" || (key === "price" && draft.draft.customPrice) ? (
          <button
            type="button"
            onClick={() => go(step + 1)}
            className={cn(buttonClass("secondary", "sm"), "min-w-24")}
          >
            {last ? copy.steps.done : copy.steps.next}
          </button>
        ) : needsRating ? null : key === "rating" ? (
          <button
            type="button"
            onClick={() => go(step + 1)}
            className={cn(buttonClass("secondary", "sm"), "min-w-24")}
          >
            {copy.steps.next}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- 상세 ---------- */

function DetailC({ p }: { p: FeedbackParams }) {
  const detail = detailFor(p);
  const offline = p.state === "offline";
  const saveFailed = p.state === "error" && p.fail === "save";
  const hasMine = p.mine && p.state !== "empty";
  const [writing, setWriting] = useState<"idle" | "open" | "saved">(
    p.flow === "compose" || (saveFailed && !hasMine) ? "open" : "idle",
  );
  const newDraft = useDraft(EMPTY_DRAFT);
  const report = useReportNotice();
  const reviewsId = useId();

  return (
    <DetailFrame p={p} detail={detail}>
      {hasMine ? (
        <MyReviewC
          p={p}
          estimateKRW={detail.place.priceKRW}
          error={saveFailed}
          offline={offline}
        />
      ) : (
        <section className="flex flex-col border-t border-border pt-5 pb-8">
          {offline ? (
            <WriteOffline />
          ) : writing === "open" ? (
            <AutoHeight>
              <SectionTitle>{copy.detail.write}</SectionTitle>
              <Steps
                keys={["rating", "price", "tags", "review"]}
                initialStep={p.step - 1}
                draft={newDraft}
                estimateKRW={detail.place.priceKRW}
                error={saveFailed}
                onClose={() => setWriting("idle")}
                onDone={(any) => setWriting(any ? "saved" : "idle")}
              />
            </AutoHeight>
          ) : writing === "saved" ? (
            <BandLine focusOnMount>{copy.composer.saved}</BandLine>
          ) : (
            <div className="flex flex-col items-start gap-2">
              <button
                type="button"
                onClick={() => setWriting("open")}
                className={buttonClass("secondary", "sm")}
              >
                {copy.detail.write}
              </button>
              <p className="type-caption text-muted-foreground">
                {copy.detail.writeHint}
              </p>
            </div>
          )}
        </section>
      )}

      <section
        aria-labelledby={reviewsId}
        className="flex flex-col gap-1 border-t border-border pt-3"
      >
        <SectionTitle id={reviewsId}>{copy.detail.publicReviews}</SectionTitle>
        <PublicReviewsC reviews={detail.reviews} onReport={report.open} />
      </section>
      {report.status}
    </DetailFrame>
  );
}

/** 내 후기: 항목 줄 넷. 줄을 누르면 그 질문 하나만 그 자리에서 고친다 */
function MyReviewC({
  p,
  estimateKRW,
  error,
  offline,
}: {
  p: FeedbackParams;
  estimateKRW: number;
  error: boolean;
  offline: boolean;
}) {
  const titleId = useId();
  const draft = useDraft(draftFromReview(MY_REVIEW));
  const [editing, setEditing] = useState<StepKey | null>(
    p.flow === "edit" || error ? "price" : null,
  );
  const [state, setState] = useState<"view" | "delete" | "removed">(
    p.flow === "delete" ? "delete" : "view",
  );
  const d = draft.draft;
  const review: MyReview = {
    ...MY_REVIEW,
    thumb: d.thumb ?? MY_REVIEW.thumb,
    priceKRW: d.priceKRW,
    tags: d.tags,
    text: d.text,
    isPublic: d.isPublic,
  };

  const rows: { key: StepKey; label: string; value: string }[] = [
    {
      key: "rating",
      label: copy.detail.rows.rating,
      value: review.thumb === "up" ? bandCopy.up : bandCopy.down,
    },
    {
      key: "price",
      label: copy.detail.rows.price,
      value:
        review.priceKRW === null ? copy.detail.rowEmpty : formatWon(review.priceKRW),
    },
    {
      key: "tags",
      label: copy.detail.rows.tags,
      value: review.tags.length === 0 ? copy.detail.rowEmpty : review.tags.join(", "),
    },
    {
      key: "review",
      label: copy.detail.rows.review,
      value: review.text === "" ? copy.detail.rowEmpty : review.text,
    },
  ];

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col border-t border-border pt-3 pb-8"
    >
      <SectionTitle id={titleId}>
        {copy.detail.mine}
      </SectionTitle>
      <p className="-mt-1 pb-2 type-caption text-muted-foreground">
        {review.isPublic
          ? copy.detail.mineMeta(review.visitMonth)
          : copy.detail.mineMetaPrivate(review.visitMonth)}
      </p>
      {state === "removed" ? (
        <RemovedLine />
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-border border-y border-border">
            {rows.map((row) => (
              <li key={row.key}>
                {editing === row.key ? (
                  <AutoHeight>
                    <SingleEdit
                      stepKey={row.key}
                      draft={draft}
                      estimateKRW={estimateKRW}
                      error={error}
                      onClose={() => setEditing(null)}
                    />
                  </AutoHeight>
                ) : (
                  <button
                    type="button"
                    aria-disabled={offline || undefined}
                    onClick={offline ? undefined : () => setEditing(row.key)}
                    className={cn(
                      "flex min-h-14 w-full items-center gap-3 py-3 text-left hover:bg-muted/50 aria-disabled:pointer-events-none",
                      focusRing,
                    )}
                  >
                    <span className="w-20 shrink-0 type-caption text-muted-foreground">
                      {row.label}
                    </span>
                    <span className="min-w-0 flex-1 truncate type-body-sm">
                      {row.value}
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground"
                      strokeWidth={1.5}
                    />
                    <span className="sr-only">{copy.detail.edit}</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
          {state === "delete" ? (
            <DeleteConfirm
              onConfirm={() => setState("removed")}
              onCancel={() => setState("view")}
              className="mt-4"
            />
          ) : offline ? null : (
            <TextButton
              onClick={() => setState("delete")}
              className="mt-2 text-destructive"
            >
              {copy.detail.removeLabel}
            </TextButton>
          )}
        </>
      )}
    </section>
  );
}

/** 내 후기 한 항목만 고치기 */
function SingleEdit({
  stepKey,
  draft,
  estimateKRW,
  error,
  onClose,
}: {
  stepKey: StepKey;
  draft: DraftApi;
  estimateKRW: number;
  error: boolean;
  onClose: () => void;
}) {
  const ids = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  const headId = `${ids}-q`;
  const title =
    stepKey === "rating"
      ? copy.composer.rating
      : stepKey === "price"
        ? copy.steps.price
        : stepKey === "tags"
          ? copy.steps.tags
          : copy.composer.review;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="group"
      aria-labelledby={headId}
      className="flex flex-col gap-4 py-5 outline-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)]"
    >
      <FieldHead id={headId} title={title} serif />
      {stepKey === "rating" ? (
        <RatingField
          value={draft.draft.thumb}
          onChange={(thumb) => draft.patch({ thumb })}
          labelledBy={headId}
        />
      ) : stepKey === "price" ? (
        <PriceChips
          draft={draft}
          presets={pricePresets(estimateKRW, 3)}
          labelledBy={headId}
        />
      ) : stepKey === "tags" ? (
        <TagChips draft={draft} labelledBy={headId} />
      ) : (
        <div className="flex flex-col gap-5">
          <ReviewField draft={draft} label={copy.composer.review} />
          <VisibilityField draft={draft} />
        </div>
      )}
      {error ? <ComposerError /> : null}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className={cn(buttonClass("secondary", "sm"), "min-w-24")}
        >
          {copy.composer.save}
        </button>
        <TextButton onClick={onClose}>{copy.composer.cancel}</TextButton>
      </div>
    </div>
  );
}

/** 다른 사람 후기: 누르면 전체 글이 펼쳐지고 끝에 신고 */
function PublicReviewsC({
  reviews,
  onReport,
}: {
  reviews: readonly DetailReview[] | null;
  onReport: () => void;
}) {
  if (reviews === null) {
    return (
      <p className="type-body-sm text-muted-foreground">
        {copy.detail.publicOffline}
      </p>
    );
  }
  if (reviews.length === 0) {
    return (
      <p className="type-body-sm text-muted-foreground">
        {copy.detail.publicEmpty}
      </p>
    );
  }
  return (
    <ul className="flex flex-col">
      {reviews.map((r) => (
        <ReviewItemC key={r.id} review={r} onReport={onReport} />
      ))}
    </ul>
  );
}

function ReviewItemC({
  review,
  onReport,
}: {
  review: DetailReview;
  onReport: () => void;
}) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  return (
    <li className="flex flex-col gap-1.5 py-3">
      <ReviewByline review={review} />
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group flex min-h-11 items-start gap-2 rounded-sm text-left",
          focusRing,
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 type-body-sm break-keep",
            !open && "line-clamp-2",
          )}
        >
          {review.text}
          <span className="sr-only"> {copy.report.expand}</span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-(--lm-duration-fast) motion-reduce:transition-none",
            open && "rotate-180",
          )}
          strokeWidth={1.5}
        />
      </button>
      <div id={bodyId} hidden={!open} className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate type-caption text-muted-foreground">
          {review.tags.join(", ")}
        </p>
        <TextButton
          aria-label={copy.report.actionLabel(review.nickname)}
          onClick={onReport}
        >
          {copy.report.action}
        </TextButton>
      </div>
    </li>
  );
}
