"use client";
// 식후 피드백 시안 A "띠 펼침" (T6.1).
//
// 의도: 자리를 옮기지 않는다. 한 탭으로 접힌 고마움 줄의 "가격, 태그 남기기"를 누르면 같은 띠가 아래로 펼쳐져
//       가격 칩, 태그, (누르면) 한 줄 후기가 그 자리에 열린다. 화면을 덮지 않아 카드와 길찾기를 그대로 쓸 수 있다.
// 가격: 추정가 둘레 칩 4개(-1천, 추정, +1천, +2천) + "직접". 칩 한 번이면 끝.
// 한 줄 후기: 처음에는 글자 버튼 하나("한 줄 후기 쓰기"). 열면 글 칸과 공개 범위, 집계 포함 고지가 함께 나온다.
// 남기기: 테두리 버튼(화면의 올리브 면 버튼은 하단 길찾기 하나라서).
// 무시하면(D-05): 띠는 그날 그대로 남고 "나중에"는 없다. 묻는 띠 자체가 한 줄이라 지나쳐도 방해가 되지 않는다.
// 상세(FB-06, 07): 후기 자리 안에서 같은 펼침. 내 후기는 "수정"을 누르면 요약이 그 자리에서 입력으로 바뀐다.
// 신고 진입점(MOD-01): 다른 사람 후기 머리줄 오른쪽 끝 ⋯ 아이콘(이름 "○○ 후기 더 보기") → 작은 메뉴의 "신고".
// 모션: 띠 높이 base 260 standard(AutoHeight), 펼친 내용 페이드 base. 축소 모드는 즉시.
import { MoreHorizontal } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { buttonClass as rawButtonClass } from "@/components/ui/button-classes";
import { focusRing } from "@/components/ui/interaction";
import { feedbackLabCopy as copy } from "@/copy/design-lab-feedback";
import { AutoHeight } from "@/features/design-lab/home/shared/yesterday";
import { ReviewByline } from "@/features/design-lab/place/shared";
import type { DetailReview } from "@/features/design-lab/place/detail-mock";
import { cn } from "@/lib/utils";
import { MY_REVIEW, detailFor, pricePresets } from "../mock";
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
  MyReviewSummary,
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
  shortWon,
  useDraft,
  useReportNotice,
  type DraftApi,
} from "../shared";

/** 기본 border-transparent와 variant 테두리색이 겹쳐 cn으로 정리한다(테두리 버튼이 투명해지는 것 방지) */
const buttonClass = (...args: Parameters<typeof rawButtonClass>) =>
  cn(rawButtonClass(...args));

export function FeedbackA({ p }: { p: FeedbackParams }) {
  return p.view === "detail" ? <DetailA p={p} /> : <HomeA p={p} />;
}

/* ---------- 홈 ---------- */

function HomeA({ p }: { p: FeedbackParams }) {
  const mode = bandMode(p);
  const band =
    mode === "skeleton" ? (
      <BandSkeleton />
    ) : mode === "none" ? null : (
      <BandA p={p} />
    );
  return <FeedbackHome p={p} band={band} />;
}

function BandA({ p }: { p: FeedbackParams }) {
  const { place, name } = bandPlace(p);
  const saveFailed = p.state === "error" && p.fail === "save";
  const [answer, setAnswer] = useState<FeedbackAnswer | null>(
    saveFailed ? p.answer : initialAnswer(p),
  );
  const [open, setOpen] = useState(p.flow === "compose");
  const [saved, setSaved] = useState(p.flow === "saved");
  const [failed, setFailed] = useState(saveFailed && p.flow !== "compose");
  const [touched, setTouched] = useState(false);
  const draft = useDraft(EMPTY_DRAFT);
  const panelId = useId();

  let body;
  if (failed) {
    body = <BandError onRetry={() => setFailed(false)} />;
  } else if (answer === null) {
    body = (
      <BandAsk
        place={place}
        name={name}
        onAnswer={(a) => {
          setTouched(true);
          setAnswer(a);
        }}
      />
    );
  } else if (saved) {
    body = (
      <BandLine focusOnMount={touched}>{copy.composer.saved}</BandLine>
    );
  } else {
    body = (
      <>
        <BandThanks
          answer={answer}
          focusOnMount={touched && !open}
          action={
            <TextButton
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => {
                setTouched(true);
                setOpen((v) => !v);
              }}
            >
              {open ? copy.composer.collapse : bandCopy.more}
            </TextButton>
          }
        />
        {open && answer !== "skipped" ? (
          <div id={panelId}>
            <InlineComposer
              draft={draft}
              estimateKRW={place.priceKRW}
              error={saveFailed}
              headingLevel="h2"
              submitLabel={copy.composer.submit}
              onSubmit={() => {
                setOpen(false);
                setSaved(true);
              }}
              className="pt-3 pb-6"
            />
          </div>
        ) : null}
      </>
    );
  }

  return (
    <AutoHeight>
      <BandRule>{body}</BandRule>
    </AutoHeight>
  );
}

/** 펼친 입력. 홈 띠 안과 상세 후기 자리가 같이 쓴다 */
function InlineComposer({
  draft,
  estimateKRW,
  withRating = false,
  error = false,
  submitLabel,
  onSubmit,
  onCancel,
  reviewOpen: reviewOpenInitially = false,
  headingLevel = "h3",
  className,
}: {
  headingLevel?: "h2" | "h3";
  draft: DraftApi;
  estimateKRW: number;
  withRating?: boolean;
  error?: boolean;
  submitLabel: string;
  onSubmit: () => void;
  onCancel?: () => void;
  reviewOpen?: boolean;
  className?: string;
}) {
  const ids = useId();
  const [reviewOpen, setReviewOpen] = useState(reviewOpenInitially);
  const ready = withRating ? draft.draft.thumb !== null : hasDetails(draft.draft);
  return (
    <div
      className={cn(
        "flex flex-col gap-7 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)]",
        className,
      )}
    >
      {withRating ? (
        <div className="flex flex-col gap-3">
          <FieldHead
            id={`${ids}-rating`}
            title={copy.composer.rating}
            as={headingLevel}
          />
          <RatingField
            value={draft.draft.thumb}
            onChange={(thumb) => draft.patch({ thumb })}
            labelledBy={`${ids}-rating`}
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-3">
        <FieldHead
          id={`${ids}-price`}
          as={headingLevel}
          title={copy.composer.price}
          hint={copy.composer.priceHint(shortWon(estimateKRW))}
        />
        <PriceChips
          draft={draft}
          presets={pricePresets(estimateKRW, 4)}
          labelledBy={`${ids}-price`}
        />
      </div>
      <div className="flex flex-col gap-3">
        <FieldHead
          id={`${ids}-tags`}
          as={headingLevel}
          title={copy.composer.tags}
          hint={copy.composer.tagsHint}
        />
        <TagChips draft={draft} labelledBy={`${ids}-tags`} />
      </div>
      {reviewOpen ? (
        <div className="flex flex-col gap-5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)]">
          <ReviewField
            draft={draft}
            label={copy.composer.review}
            autoFocus={!reviewOpenInitially}
          />
          <VisibilityField draft={draft} />
        </div>
      ) : (
        <TextButton onClick={() => setReviewOpen(true)} className="-mt-3">
          {copy.composer.reviewOpen}
        </TextButton>
      )}
      {error ? <ComposerError /> : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-disabled={!ready || undefined}
          onClick={ready ? onSubmit : undefined}
          className={cn(buttonClass("secondary"), "min-w-32")}
        >
          {submitLabel}
        </button>
        {onCancel ? (
          <TextButton onClick={onCancel}>{copy.composer.cancel}</TextButton>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- 상세 ---------- */

function DetailA({ p }: { p: FeedbackParams }) {
  const detail = detailFor(p);
  const offline = p.state === "offline";
  const saveFailed = p.state === "error" && p.fail === "save";
  const hasMine = p.mine && p.state !== "empty";
  const [mine, setMine] = useState<"view" | "edit" | "delete" | "removed">(
    p.flow === "edit" ? "edit" : p.flow === "delete" ? "delete" : "view",
  );
  const [writing, setWriting] = useState<"idle" | "open" | "saved">(
    p.flow === "compose" || (saveFailed && !hasMine) ? "open" : "idle",
  );
  const newDraft = useDraft(EMPTY_DRAFT);
  const editDraft = useDraft(draftFromReview(MY_REVIEW));
  const report = useReportNotice();
  const mineId = useId();

  return (
    <DetailFrame p={p} detail={detail}>
      {hasMine ? (
        <section
          aria-labelledby={mineId}
          className="flex flex-col gap-2 border-t border-border pt-3 pb-8"
        >
          <SectionTitle
            id={mineId}
            aside={
              mine === "view" && !offline ? (
                <div className="flex items-center gap-4">
                  <TextButton
                    aria-label={copy.detail.editLabel}
                    onClick={() => setMine("edit")}
                  >
                    {copy.detail.edit}
                  </TextButton>
                  <TextButton
                    aria-label={copy.detail.removeLabel}
                    onClick={() => setMine("delete")}
                  >
                    {copy.detail.remove}
                  </TextButton>
                </div>
              ) : null
            }
          >
            {copy.detail.mine}
          </SectionTitle>
          {mine === "edit" ? (
            <InlineComposer
              draft={editDraft}
              estimateKRW={detail.place.priceKRW}
              withRating
              reviewOpen
              error={saveFailed}
              submitLabel={copy.composer.save}
              onSubmit={() => setMine("view")}
              onCancel={() => setMine("view")}
              className="pt-2"
            />
          ) : mine === "delete" ? (
            <>
              <MyReviewSummary review={MY_REVIEW} />
              <DeleteConfirm
                onConfirm={() => setMine("removed")}
                onCancel={() => setMine("view")}
                className="mt-3"
              />
            </>
          ) : mine === "removed" ? (
            <RemovedLine />
          ) : (
            <MyReviewSummary review={MY_REVIEW} />
          )}
        </section>
      ) : (
        <section className="flex flex-col gap-2 border-t border-border pt-5 pb-8">
          {offline ? (
            <WriteOffline />
          ) : writing === "open" ? (
            <>
              <SectionTitle>{copy.detail.write}</SectionTitle>
              <InlineComposer
                draft={newDraft}
                estimateKRW={detail.place.priceKRW}
                withRating
                error={saveFailed}
                submitLabel={copy.composer.submit}
                onSubmit={() => setWriting("saved")}
                onCancel={() => setWriting("idle")}
                className="pt-2"
              />
            </>
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

      <PublicReviewsA reviews={detail.reviews} onReport={report.open} />
      {report.status}
    </DetailFrame>
  );
}

function PublicReviewsA({
  reviews,
  onReport,
}: {
  reviews: readonly DetailReview[] | null;
  onReport: () => void;
}) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3 border-t border-border pt-3"
    >
      <SectionTitle id={titleId}>{copy.detail.publicReviews}</SectionTitle>
      {reviews === null ? (
        <p className="type-body-sm text-muted-foreground">
          {copy.detail.publicOffline}
        </p>
      ) : reviews.length === 0 ? (
        <p className="type-body-sm text-muted-foreground">
          {copy.detail.publicEmpty}
        </p>
      ) : (
        <ul className="flex flex-col gap-5">
          {reviews.map((r) => (
            <li key={r.id} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1">
                <ReviewByline review={r} className="min-w-0 flex-1" />
                <ReviewMenu nickname={r.nickname} onReport={onReport} />
              </div>
              <p className="line-clamp-2 type-body-sm break-keep">{r.text}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** 후기 머리줄 ⋯ → 작은 메뉴(신고 하나). 실제 구현은 Base UI Menu(화살표 키, 밖 누르면 닫힘, 포커스 복귀) */
function ReviewMenu({
  nickname,
  onReport,
}: {
  nickname: string;
  onReport: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) itemRef.current?.focus();
  }, [open]);
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={copy.report.menuLabel(nickname)}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
          focusRing,
        )}
      >
        <MoreHorizontal aria-hidden className="size-5" strokeWidth={1.5} />
      </button>
      {open ? (
        <div
          id={menuId}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          className="absolute top-full right-0 z-10 mt-1 min-w-32 rounded-input border border-border bg-popover p-1 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-fast)]"
        >
          <button
            ref={itemRef}
            type="button"
            aria-label={copy.report.actionLabel(nickname)}
            onClick={() => {
              onReport();
              close();
            }}
            className={cn(
              "flex h-11 w-full items-center rounded-sm px-3 type-body-sm text-foreground hover:bg-muted",
              focusRing,
            )}
          >
            {copy.report.action}
          </button>
        </div>
      ) : null}
    </div>
  );
}
