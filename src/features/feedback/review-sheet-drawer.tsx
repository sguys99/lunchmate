"use client";
// 후기 시트 본체 (T6.9, T6.10, D-11 B 한 장 시트, DESIGN.md 5장 "식후 피드백"). Base UI Drawer.
// review-sheet.tsx가 누른 뒤에 동적 import한다(홈 첫 로드 밖, 로그인 유도 시트와 같은 Drawer 덩어리).
// - 모바일: 아래 시트(위 라운드 28, 손잡이, 딤, 최대 92dvh). 데스크톱(1024 이상): 가운데 대화상자(최대 448, 85dvh, 라운드 card, 1px border).
// - 열리면 시트 제목(항목 줄에서 열면 그 항목 첫 입력)으로 초점, Esc와 딤으로 닫힘, 닫히면 연 버튼(또는 finalFocus)으로 복귀.
// - 상세 시트 위에서 열면 중첩 Drawer다. 딤은 forceRender로 상세 위에 한 겹 더 깐다.
// - 저장: review-draft.ts submitReview(자동 재시도 1회). 성공하면 쿼리 무효화, feedback_submitted(새 평가 tap, 세부 detail), onSaved 뒤 닫는다.
//   실패하면 고른 값을 그대로 두고 바닥에 이유와 "다시 보내기"(D-11 안건 11). 금칙어는 한 줄 후기 칸 아래에 둔다.
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useRef, useState } from "react";
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
import { focusRing } from "@/components/ui/interaction";
import { feedbackCopy } from "@/copy/feedback";
import { moderationCopy } from "@/copy/moderation";
import type { CategorySlug } from "@/features/place/categories";
import { CategoryIllustration } from "@/features/place/illustrations";
import { track } from "@/lib/analytics/track";
import { useOnlineStatus } from "@/lib/network";
import { invalidateAfterWrite } from "@/lib/query/db-keys";
import type { WriteFailure } from "@/lib/supabase/write-result";
import { cn } from "@/lib/utils";
import {
  deleteReviewAction,
  rateVisitAction,
  updateReviewAction,
  writeFromDetailAction,
} from "./actions";
import type { ReviewRating } from "./labels";
import {
  canSubmit,
  draftFromReview,
  EMPTY_DRAFT,
  feedbackSubmittedEvents,
  needsRating,
  submitReview,
  withRetry,
  type ReviewDraft,
  type SheetMode,
} from "./review-draft";
import {
  BodyField,
  DeleteConfirm,
  FormError,
  PriceField,
  RatingField,
  TagsField,
  VisibilityField,
  textButton,
  type FieldKey,
} from "./review-form";

const copy = feedbackCopy.sheet;

export type ReviewSheetConfig = {
  readonly mode: SheetMode;
  /** 무효화할 식당 집계 (place_id만) */
  readonly placeId: string;
  /** 카테고리 그림. 이름 해석 실패면 null(그림 없이) */
  readonly category: CategorySlug | null;
  /** 세션 메모리의 식당명. 해석 실패면 null */
  readonly name: string | null;
  /** 가격 힌트와 칩 기준(원) */
  readonly price: {
    readonly value: number;
    readonly kind: "estimate" | "report";
  };
  /** 홈에서 열면 제목 아래 "모두 선택입니다" 한 줄 */
  readonly from: "home" | "detail";
  /** 내 후기 항목 줄에서 연 항목 (D-11 안건 6) */
  readonly focus?: FieldKey;
  /** 닫힌 뒤 초점을 둘 곳. null이면 기본(연 버튼) */
  readonly finalFocus?: () => HTMLElement | null;
  readonly onSaved?: (r: {
    reviewId: string;
    rating: ReviewRating;
    draft: ReviewDraft;
  }) => void;
  readonly onDeleted?: () => void;
};

export type ReviewSheetDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ReviewSheetConfig;
};

/** 쓰기 실패 → 화면 문장 (moderation.ts). 금칙어는 칸 아래로 따로 */
export function failureMessage(
  f: WriteFailure,
  mode: SheetMode,
): { title: string; body?: string } {
  if (f.error === "limit") return moderationCopy.limits[f.bucket];
  if (f.error === "cooldown") return moderationCopy.errors.save;
  if (f.error === "duplicate" && mode.kind === "write")
    return { title: copy.duplicateWrite };
  return moderationCopy.errors[f.error];
}

const deps = {
  rateVisit: rateVisitAction,
  updateReview: updateReviewAction,
  writeFromDetail: writeFromDetailAction,
};

export default function ReviewSheetDrawer({
  open,
  onOpenChange,
  config,
}: ReviewSheetDrawerProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const title =
    config.mode.kind === "edit"
      ? copy.titleEdit
      : config.name
        ? copy.titleFor(config.name)
        : copy.titleUnnamed;
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal>
        <DrawerBackdrop forceRender className="z-[60]" />
        <DrawerViewport className="z-[70] min-[64rem]:items-center min-[64rem]:p-8">
          <DrawerPopup
            ref={popupRef}
            initialFocus={() => {
              const f = config.focus;
              const el = f
                ? popupRef.current?.querySelector<HTMLElement>(
                    `[data-field="${f}"] [data-first]`,
                  )
                : null;
              return el ?? titleRef.current ?? true;
            }}
            finalFocus={() => config.finalFocus?.() ?? true}
            className={cn(
              "max-h-[92dvh] border-t border-border data-ending-style:duration-(--lm-duration-fast) data-ending-style:ease-exit",
              "min-[64rem]:max-h-[85dvh] min-[64rem]:max-w-md min-[64rem]:rounded-card min-[64rem]:border min-[64rem]:shadow-none",
              "min-[64rem]:transition-[transform,opacity] min-[64rem]:data-ending-style:[transform:translateY(0.5rem)] min-[64rem]:data-ending-style:opacity-0 min-[64rem]:data-starting-style:[transform:translateY(0.5rem)] min-[64rem]:data-starting-style:opacity-0",
            )}
          >
            <DrawerHandle className="mt-3 mb-0 h-1 w-9 min-[64rem]:hidden" />
            <div className="flex shrink-0 items-center gap-3 px-7 pt-4 pb-2 max-[23.75rem]:px-5 min-[64rem]:pt-6">
              {config.category && config.name ? (
                <CategoryIllustration slug={config.category} size={48} />
              ) : null}
              <DrawerTitle
                ref={titleRef}
                tabIndex={-1}
                className="min-w-0 flex-1 type-heading break-keep outline-none"
              >
                {title}
              </DrawerTitle>
              <DrawerClose
                aria-label={copy.close}
                className={cn(
                  "-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted active:text-foreground",
                  focusRing,
                )}
              >
                <X aria-hidden className="size-5" strokeWidth={1.5} />
              </DrawerClose>
            </div>
            <ReviewForm config={config} onDone={() => onOpenChange(false)} />
          </DrawerPopup>
        </DrawerViewport>
      </DrawerPortal>
    </Drawer>
  );
}

function initialDraft(mode: SheetMode): ReviewDraft {
  return mode.kind === "edit" ? draftFromReview(mode.review) : EMPTY_DRAFT;
}

function ReviewForm({
  config,
  onDone,
}: {
  config: ReviewSheetConfig;
  onDone: () => void;
}) {
  const { mode } = config;
  const client = useQueryClient();
  const online = useOnlineStatus();
  const [draft, setDraft] = useState<ReviewDraft>(() => initialDraft(mode));
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<WriteFailure | null>(null);
  // 접힌 줄에서 한 탭 답만 저장되고 세부가 실패했을 때(다시 보내기는 세부만)
  const savedReviewId = useRef<string | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const [deleteFailure, setDeleteFailure] = useState<WriteFailure | null>(null);
  const patch = (next: Partial<ReviewDraft>) => {
    setDraft((d) => ({ ...d, ...next }));
    // 금칙어 오류는 글을 고치면 지운다(다른 오류는 다시 보낼 때까지 둔다)
    if ("body" in next) setFailure((f) => (f?.error === "banned" ? null : f));
  };

  const ready = canSubmit(mode, draft);
  const focus = config.focus ?? null;

  async function submit() {
    if (busy || !ready || !online) return;
    setBusy(true);
    setFailure(null);
    const r = await submitReview(mode, draft, deps, savedReviewId.current);
    if (!r.ok) {
      if (r.savedReviewId) {
        savedReviewId.current = r.savedReviewId;
        void invalidateAfterWrite(client, "review", config.placeId);
      }
      setFailure(r);
      setBusy(false);
      return;
    }
    // 새 평가면 stage tap, 세부를 남겼으면 stage detail(2026-11-01). 가격, 태그, 글 여부는 detail로만 알 수 있다
    for (const properties of feedbackSubmittedEvents(mode, r.rating, draft)) {
      track({ name: "feedback_submitted", properties });
    }
    void invalidateAfterWrite(client, "review", config.placeId);
    config.onSaved?.({ reviewId: r.reviewId, rating: r.rating, draft });
    setBusy(false);
    onDone();
  }

  async function remove() {
    if (mode.kind !== "edit" || busy) return;
    setBusy(true);
    setDeleteFailure(null);
    const r = await withRetry(() =>
      deleteReviewAction({ reviewId: mode.reviewId }),
    );
    setBusy(false);
    if (!r.ok) {
      setDeleteFailure(r);
      return;
    }
    void invalidateAfterWrite(client, "review", config.placeId);
    config.onDeleted?.();
    onDone();
  }

  if (confirming && mode.kind === "edit") {
    const msg = deleteFailure ? failureMessage(deleteFailure, mode) : null;
    return (
      <DrawerContent className="px-7 pt-2 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] max-[23.75rem]:px-5">
        <DeleteConfirm
          busy={busy}
          error={msg ? <FormError title={msg.title} body={msg.body} /> : null}
          onConfirm={() => void remove()}
          onCancel={() => {
            setConfirming(false);
            setDeleteFailure(null);
          }}
        />
      </DrawerContent>
    );
  }

  const banned = failure?.error === "banned";
  const footerMsg = failure && !banned ? failureMessage(failure, mode) : null;
  const submitLabel =
    failure?.error === "save"
      ? moderationCopy.retry
      : mode.kind === "edit"
        ? copy.save
        : copy.submit;

  return (
    <>
      {/* 블록 사이 24: 390 × 844에서 공개 범위 고지 한 줄까지 첫 화면에 든다(D-11 6절, T6.9) */}
      <DrawerContent className="flex flex-col gap-6 px-7 pt-2 pb-8 max-[23.75rem]:px-5">
        {needsRating(mode) ? (
          <RatingField
            draft={draft}
            patch={patch}
            focus={focus}
            hint={mode.kind === "write" || mode.kind === "rate"}
          />
        ) : config.from === "home" ? (
          <p className="-mt-2 type-caption break-keep text-muted-foreground">
            {copy.hint}
          </p>
        ) : null}
        <PriceField
          draft={draft}
          patch={patch}
          focus={focus}
          estimate={config.price.value}
          estimateKind={config.price.kind}
        />
        <TagsField draft={draft} patch={patch} focus={focus} />
        <BodyField
          draft={draft}
          patch={patch}
          focus={focus}
          error={banned ? moderationCopy.banned : null}
        />
        <VisibilityField draft={draft} patch={patch} />
        {mode.kind === "edit" ? (
          <button
            type="button"
            aria-haspopup="true"
            aria-disabled={!online || undefined}
            onClick={online ? () => setConfirming(true) : undefined}
            className={cn(textButton, "-mt-2 text-destructive")}
          >
            {copy.remove}
          </button>
        ) : null}
      </DrawerContent>
      <div className="flex shrink-0 flex-col gap-3 border-t border-border bg-popover px-7 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] max-[23.75rem]:px-5 min-[64rem]:pb-5">
        {!online ? (
          <p
            role="status"
            className="type-caption break-keep text-muted-foreground"
          >
            {copy.offline}
          </p>
        ) : footerMsg ? (
          <FormError title={footerMsg.title} body={footerMsg.body} />
        ) : !ready && needsRating(mode) ? (
          <p className="sr-only" id="review-sheet-need">
            {copy.ratingRequired}
          </p>
        ) : null}
        <button
          type="button"
          aria-disabled={!ready || !online || busy || undefined}
          aria-busy={busy || undefined}
          aria-describedby={
            !ready && needsRating(mode) && online
              ? "review-sheet-need"
              : undefined
          }
          onClick={() => void submit()}
          className={cn(buttonClass("primary"), "w-full")}
        >
          {busy ? copy.sending : submitLabel}
        </button>
      </div>
    </>
  );
}
