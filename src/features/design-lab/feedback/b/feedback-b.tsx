"use client";
// 식후 피드백 시안 B "한 장 시트" (T6.1).
//
// 의도: 띠는 D1 그대로 한 탭만 받고, 더 남길 것은 모두 모달 바텀시트 한 장에 모은다.
//       홈, 상세 "후기 쓰기", 내 후기 수정이 같은 시트(같은 순서, 같은 버튼)라 한 번 익히면 어디서나 같다.
// 시트: 머리(그림 48 + 세리프 제목 + 닫기) → (상세면) 한 탭 답 → 가격 스테퍼(큰 숫자, 500원 단계, 추정가 옅게) + 칩 3개
//       → 태그 2열 격자 → 한 줄 후기(늘 보임) → 공개 범위와 집계 포함 고지 → 하단 고정 "남기기"(올리브 면, 뒤 화면은 inert).
//       데스크톱은 가운데 대화상자(최대 448).
// 무시하면(D-05): 그날 오늘 결정(길찾기)을 하고 나면 띠가 한 줄("어제 간 ○○ 남기기")로 접힌다. 시트로 언제든 연다.
//       확인 화면은 ?flow=later. "나중에" 버튼은 두지 않는다(한 탭 선택지를 셋으로 유지).
// 상세(FB-06, 07): 후기 머리 오른쪽 "후기 쓰기" → 같은 시트. 내 후기 "수정" → 채워진 시트 + 시트 안 "후기 삭제" → 시트 안 확인.
// 신고 진입점(MOD-01): 다른 사람 후기 본문 아래 오른쪽 "신고" 글자 버튼(늘 보임).
// 모션: 시트 slow 300 enter(8px 올라오며 페이드), 딤 페이드 base. 닫힘은 바로. 축소 모드는 즉시.
import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { buttonClass as rawButtonClass } from "@/components/ui/button-classes";
import { focusRing } from "@/components/ui/interaction";
import { feedbackLabCopy as copy } from "@/copy/design-lab-feedback";
import { AutoHeight } from "@/features/design-lab/home/shared/yesterday";
import type { MockPlace } from "@/features/design-lab/mock";
import { ReviewByline } from "@/features/design-lab/place/shared";
import type { DetailReview } from "@/features/design-lab/place/detail-mock";
import { CategoryIllustration } from "@/features/place/illustrations";
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
  PriceStepper,
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
  type Draft,
  type DraftApi,
} from "../shared";

/** 기본 border-transparent와 variant 테두리색이 겹쳐 cn으로 정리한다(테두리 버튼이 투명해지는 것 방지) */
const buttonClass = (...args: Parameters<typeof rawButtonClass>) =>
  cn(rawButtonClass(...args));

export function FeedbackB({ p }: { p: FeedbackParams }) {
  return p.view === "detail" ? <DetailB p={p} /> : <HomeB p={p} />;
}

/* ---------- 홈 ---------- */

function HomeB({ p }: { p: FeedbackParams }) {
  const { place, name } = bandPlace(p);
  const saveFailed = p.state === "error" && p.fail === "save";
  const [answer, setAnswer] = useState<FeedbackAnswer | null>(
    saveFailed ? p.answer : initialAnswer(p),
  );
  const [folded] = useState(p.flow === "later");
  const [sheet, setSheet] = useState(p.flow === "compose");
  const [saved, setSaved] = useState(p.flow === "saved");
  const [failed, setFailed] = useState(saveFailed && p.flow !== "compose");
  const [touched, setTouched] = useState(false);
  const draft = useDraft(EMPTY_DRAFT);
  const mode = bandMode(p);

  const open = () => {
    setTouched(true);
    setSheet(true);
  };

  let body: ReactNode = null;
  if (failed) {
    body = <BandError onRetry={() => setFailed(false)} />;
  } else if (saved) {
    body = <BandLine focusOnMount={touched}>{copy.composer.saved}</BandLine>;
  } else if (answer === null && folded) {
    body = <FoldedLine place={place} name={name} onOpen={open} />;
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
  } else {
    body = (
      <BandThanks
        answer={answer}
        focusOnMount={touched}
        action={
          <TextButton aria-haspopup="dialog" onClick={open}>
            {bandCopy.more}
          </TextButton>
        }
      />
    );
  }

  const band =
    mode === "skeleton" ? (
      <BandSkeleton />
    ) : mode === "none" ? null : (
      <AutoHeight>
        <BandRule>{body}</BandRule>
      </AutoHeight>
    );

  return (
    <>
      <FeedbackHome p={p} band={band} inert={sheet} />
      {sheet && mode === "live" ? (
        <ComposerSheet
          place={place}
          title={
            name ? copy.composer.titleFor(name) : copy.composer.titleUnnamed
          }
          draft={draft}
          // 접힌 줄에서 연 경우는 아직 한 탭 답이 없어 시트 맨 위에서 묻는다
          withRating={answer === null}
          error={saveFailed && p.flow === "compose"}
          submitLabel={copy.composer.submit}
          onClose={() => setSheet(false)}
          onSubmit={(d) => {
            if (answer === null) setAnswer(d.thumb ?? "up");
            setSheet(false);
            setSaved(true);
          }}
        />
      ) : null}
    </>
  );
}

/** 길찾기를 누른 뒤(오늘 결정을 마친 뒤) 접힌 한 줄 (D-05 B안 답) */
function FoldedLine({
  place,
  name,
  onOpen,
}: {
  place: MockPlace;
  name: string | null;
  onOpen: () => void;
}) {
  return (
    <div className="flex min-h-11 items-center gap-3 py-1">
      {name ? (
        <CategoryIllustration slug={place.category} size={24} />
      ) : null}
      <p className="min-w-0 flex-1 truncate type-body-sm text-muted-foreground">
        {name ? copy.later.folded(name) : copy.later.foldedUnnamed}
      </p>
      <TextButton
        aria-haspopup="dialog"
        aria-label={copy.later.foldedActionLabel}
        onClick={onOpen}
      >
        {copy.later.foldedAction}
      </TextButton>
    </div>
  );
}

/* ---------- 시트 ---------- */

/**
 * 모달 바텀시트 (시안은 CSS 틀, 실제는 Base UI Drawer를 연 뒤 지연 로딩, tasks 2.4절).
 * 열리면 제목으로 포커스, Esc와 딤 누르기로 닫힘, 닫히면 연 버튼으로 포커스가 돌아간다.
 */
function ComposerSheet({
  place,
  title,
  draft,
  withRating,
  error,
  submitLabel,
  onClose,
  onSubmit,
  onDelete,
  startWithDelete = false,
}: {
  place: MockPlace;
  title: string;
  draft: DraftApi;
  withRating: boolean;
  error: boolean;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (d: Draft) => void;
  onDelete?: () => void;
  startWithDelete?: boolean;
}) {
  const ids = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const opener = useRef<Element | null>(null);
  const [confirming, setConfirming] = useState(startWithDelete);

  useEffect(() => {
    opener.current = document.activeElement;
    titleRef.current?.focus({ preventScroll: true });
    const prev = opener;
    return () => {
      const el = prev.current;
      if (el instanceof HTMLElement) el.focus({ preventScroll: true });
    };
  }, []);

  const ready = withRating
    ? draft.draft.thumb !== null
    : hasDetails(draft.draft) || onDelete !== undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center desktop:items-center desktop:p-8"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-overlay motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${ids}-title`}
        className={cn(
          "relative flex max-h-[92dvh] w-full max-w-(--lm-layout-max-width) flex-col rounded-t-sheet border-t border-border bg-popover",
          "desktop:max-h-[85dvh] desktop:max-w-md desktop:rounded-card desktop:border",
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:[animation-duration:var(--lm-duration-slow)] motion-safe:[animation-timing-function:var(--lm-ease-enter)]",
        )}
      >
        <span
          aria-hidden
          className="mx-auto mt-3 h-1 w-9 shrink-0 rounded-full bg-border desktop:hidden"
        />
        <div className="flex items-center gap-3 px-7 pt-4 pb-2 @max-[23.75rem]/screen:px-5 desktop:pt-6">
          <CategoryIllustration slug={place.category} size={48} />
          <h2
            id={`${ids}-title`}
            ref={titleRef}
            tabIndex={-1}
            className="min-w-0 flex-1 type-heading break-keep outline-none"
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label={copy.composer.close}
            onClick={onClose}
            className={cn(
              "-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
              focusRing,
            )}
          >
            <X aria-hidden className="size-5" strokeWidth={1.5} />
          </button>
        </div>

        {confirming && onDelete ? (
          <div className="px-7 pt-2 pb-8 @max-[23.75rem]/screen:px-5">
            <DeleteConfirm
              onConfirm={onDelete}
              onCancel={() => setConfirming(false)}
            />
          </div>
        ) : (
          <>
            <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-7 pt-3 pb-8 @max-[23.75rem]/screen:px-5">
              {withRating ? (
                <div className="flex flex-col gap-3">
                  <FieldHead id={`${ids}-rating`} title={copy.composer.rating} />
                  <RatingField
                    value={draft.draft.thumb}
                    onChange={(thumb) => draft.patch({ thumb })}
                    labelledBy={`${ids}-rating`}
                  />
                </div>
              ) : (
                <p className="-mt-2 type-caption break-keep text-muted-foreground">
                  {copy.composer.hint}
                </p>
              )}
              <div className="flex flex-col gap-4">
                <FieldHead
                  id={`${ids}-price`}
                  title={copy.composer.price}
                  hint={copy.composer.priceHint(shortWon(place.priceKRW))}
                />
                <PriceStepper
                  draft={draft}
                  estimateKRW={place.priceKRW}
                  presets={pricePresets(place.priceKRW, 3)}
                  labelledBy={`${ids}-price`}
                />
              </div>
              <div className="flex flex-col gap-3">
                <FieldHead
                  id={`${ids}-tags`}
                  title={copy.composer.tags}
                  hint={copy.composer.tagsHint}
                />
                <TagChips
                  draft={draft}
                  labelledBy={`${ids}-tags`}
                  className="grid grid-cols-2"
                  chipClassName="w-full"
                />
              </div>
              <ReviewField draft={draft} label={copy.composer.review} />
              <VisibilityField draft={draft} />
              {onDelete ? (
                <TextButton
                  onClick={() => setConfirming(true)}
                  className="text-destructive"
                >
                  {copy.detail.removeLabel}
                </TextButton>
              ) : null}
            </div>
            <div className="flex flex-col gap-3 border-t border-border px-7 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] @max-[23.75rem]/screen:px-5 desktop:pb-5">
              {error ? <ComposerError /> : null}
              <button
                type="button"
                aria-disabled={!ready || undefined}
                onClick={ready ? () => onSubmit(draft.draft) : undefined}
                className={cn(buttonClass("primary"), "w-full")}
              >
                {submitLabel}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- 상세 ---------- */

function DetailB({ p }: { p: FeedbackParams }) {
  const detail = detailFor(p);
  const offline = p.state === "offline";
  const saveFailed = p.state === "error" && p.fail === "save";
  const hasMine = p.mine && p.state !== "empty";
  const [sheet, setSheet] = useState<"none" | "write" | "edit" | "delete">(
    p.flow === "compose" || (saveFailed && !hasMine)
      ? "write"
      : p.flow === "edit" || (saveFailed && hasMine)
        ? "edit"
        : p.flow === "delete"
          ? "delete"
          : "none",
  );
  const [mine, setMine] = useState<"view" | "removed">("view");
  const [written, setWritten] = useState(false);
  const newDraft = useDraft(EMPTY_DRAFT);
  const editDraft = useDraft(draftFromReview(MY_REVIEW));
  const report = useReportNotice();
  const mineId = useId();
  const reviewsId = useId();

  const writeButton = offline ? null : (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => setSheet("write")}
      className={buttonClass("secondary", "sm")}
    >
      {copy.detail.write}
    </button>
  );

  return (
    <>
      <DetailFrame p={p} detail={detail} inert={sheet !== "none"}>
        {hasMine ? (
          <section
            aria-labelledby={mineId}
            className="flex flex-col gap-2 border-t border-border pt-3 pb-8"
          >
            <SectionTitle
              id={mineId}
              aside={
                mine === "view" && !offline ? (
                  <TextButton
                    aria-haspopup="dialog"
                    aria-label={copy.detail.editLabel}
                    onClick={() => setSheet("edit")}
                  >
                    {copy.detail.edit}
                  </TextButton>
                ) : null
              }
            >
              {copy.detail.mine}
            </SectionTitle>
            {mine === "removed" ? (
              <RemovedLine />
            ) : (
              <MyReviewSummary review={MY_REVIEW} />
            )}
          </section>
        ) : null}

        <section
          aria-labelledby={reviewsId}
          className="flex flex-col gap-3 border-t border-border pt-3"
        >
          <SectionTitle
            id={reviewsId}
            aside={hasMine || written ? null : writeButton}
          >
            {copy.detail.publicReviews}
          </SectionTitle>
          {offline && !hasMine ? <WriteOffline /> : null}
          {written ? (
            <BandLine focusOnMount>{copy.composer.saved}</BandLine>
          ) : null}
          <PublicReviewsB reviews={detail.reviews} onReport={report.open} />
        </section>
        {report.status}
      </DetailFrame>

      {sheet === "write" ? (
        <ComposerSheet
          place={detail.place}
          title={copy.composer.titleFor(detail.place.name)}
          draft={newDraft}
          withRating
          error={saveFailed}
          submitLabel={copy.composer.submit}
          onClose={() => setSheet("none")}
          onSubmit={() => {
            setSheet("none");
            setWritten(true);
          }}
        />
      ) : sheet === "edit" || sheet === "delete" ? (
        <ComposerSheet
          place={detail.place}
          title={copy.detail.editLabel}
          draft={editDraft}
          withRating
          error={saveFailed}
          submitLabel={copy.composer.save}
          startWithDelete={sheet === "delete"}
          onClose={() => setSheet("none")}
          onSubmit={() => setSheet("none")}
          onDelete={() => {
            setSheet("none");
            setMine("removed");
          }}
        />
      ) : null}
    </>
  );
}

function PublicReviewsB({
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
    <ul className="flex flex-col divide-y divide-border">
      {reviews.map((r) => (
        <li key={r.id} className="flex flex-col gap-1.5 py-4 first:pt-1">
          <ReviewByline review={r} />
          <p className="line-clamp-2 type-body-sm break-keep">{r.text}</p>
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate type-caption text-muted-foreground">
              {r.tags.join(", ")}
            </p>
            <TextButton
              aria-label={copy.report.actionLabel(r.nickname)}
              onClick={onReport}
            >
              {copy.report.action}
            </TextButton>
          </div>
        </li>
      ))}
    </ul>
  );
}
