"use client";
// 홈 어제 피드백 띠 본체 (T6.8, T6.12, FB-01, FB-04, FB-05, AC-FB-1, D-05 D1, D-11 안건 2, 3, 10~12, DESIGN.md 5장).
// band-slot.tsx가 React.lazy로 받는다(홈 첫 로드 밖). 시트(T6.9)는 "가격, 태그 남기기"나 접힌 줄 "남기기"를 누른 뒤 다시 지연 로딩.
//
// 모양 (band-model.ts bandView)
// - 묻는 띠: 그림 36 + "어제 간 ○○, 어땠어요?" + 아래 "안 갔어요" / 오른쪽 👍 👎 원형 44. 최소 높이 64.
//   이름 해석 실패(T5.12a)면 빈 원과 수저, "어제 가신 곳은 어땠어요?", 둘째 줄에 "카카오맵에서 보기"(place_url, 새 탭).
// - 접힌 줄: 답하지 않고 오늘 길찾기를 눌렀으면 그림 24 + "어제 간 ○○" + "남기기"(시트 맨 위 한 탭 답부터).
// - 고마움 줄: 체크 + "알려 줘서 고마워요"(뒷말은 스크린 리더만) + "가격, 태그 남기기"(안 갔어요면 없음, FB-05).
//   세부까지 남기면 "남겼습니다. 다음 추천에 반영합니다." 띠는 그날 남는다.
// - 저장 실패: 자동 재시도 1회 뒤 "보내지 못했습니다" + "다시 보내기", 고른 답 유지(D-11 안건 11).
// - 내 방문 쿼리가 실패하면 띠를 숨긴다(추천을 막지 않음, AC-FB-1). 불러오는 동안은 같은 높이 뼈대.
// 높이 전환은 base 260 standard(AutoHeight), 축소 모드면 즉시. 답한 뒤 누른 버튼이 사라지므로 초점은 상태 줄로 옮긴다.
// 분석: feedback_prompt_shown은 그날 처음 물을 때 한 번(물은 시각 기록과 함께), feedback_submitted는 답할 때.
// 데이터 규칙: 이름과 카테고리는 세션 메모리 값(이름 해석)이다. 저장, 이벤트에 넣지 않는다(CLAUDE.md 7장).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  ExternalLink,
  ThumbsDown,
  ThumbsUp,
  Utensils,
} from "lucide-react";
import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { focusRing, hitArea44, pressMotion } from "@/components/ui/interaction";
import { Skeleton } from "@/components/ui/skeleton";
import { feedbackCopy } from "@/copy/feedback";
import { moderationCopy } from "@/copy/moderation";
import type { CategorySlug } from "@/features/place/categories";
import { CategoryIllustration } from "@/features/place/illustrations";
import { CATEGORY_PRICE_ESTIMATE } from "@/features/place/price-estimate";
import { usePlaceNames } from "@/features/place/use-place-names";
import { kakaoCategorySlug } from "@/features/rec/kakao-category";
import { useReducedMotion } from "@/features/rec/use-reduced-motion";
import { track } from "@/lib/analytics/track";
import { kakaoPlaceUrl } from "@/lib/kakao/local";
import { dbKeys, invalidateAfterWrite } from "@/lib/query/db-keys";
import type { WriteFailure } from "@/lib/supabase/write-result";
import { kstDateKey } from "@/lib/time/kst";
import { cn } from "@/lib/utils";
import {
  feedbackBandAction,
  markFeedbackPromptedAction,
  markNotVisitedAction,
  rateVisitAction,
} from "./actions";
import {
  bandView,
  promptSource,
  type BandAnswer,
  type BandLocal,
} from "./band-model";
import type { FeedbackBandProps } from "./band-slot";
import type { MyVisit } from "./feedback-target";
import { feedbackSubmittedProps, hasDetails, withRetry } from "./review-draft";
import { useReviewSheet, type ReviewSheetConfig } from "./review-sheet";

const copy = feedbackCopy.band;

/** 이번 탭에서 이미 "물었음"을 보낸 방문(탭을 오가며 다시 마운트돼도 한 번만) */
const promptedThisSession = new Set<string>();

export default function FeedbackBand({
  now,
  anchor,
  anchorPending,
  directedToday,
  className,
}: FeedbackBandProps & { className?: string }) {
  const client = useQueryClient();
  const todayKey = kstDateKey(now);
  // 날짜가 바뀌면 다시 묻는다. 키 접두가 내 방문(myVisitsAll)이라 쓰기 뒤 무효화에 함께 걸린다
  const visitsQuery = useQuery({
    queryKey: [...dbKeys.myVisitsAll, "band", todayKey],
    queryFn: () => feedbackBandAction(),
    staleTime: 60_000,
  });
  const band = visitsQuery.data?.signedIn ? visitsQuery.data : null;
  const visits = useMemo<readonly MyVisit[]>(() => band?.visits ?? [], [band]);

  const [local, setLocal] = useState<BandLocal | null>(null);
  const [failed, setFailed] = useState<{
    answer: BandAnswer;
    failure: WriteFailure;
  } | null>(null);
  // 다음 그리기 뒤 상태 줄로 초점을 옮길지(누른 버튼이 사라진다)
  const focusLine = useRef(false);
  const lineRef = useRef<HTMLDivElement>(null);
  const returnRef = useRef<HTMLElement | null>(null);
  const sheet = useReviewSheet();

  const view = useMemo(
    () =>
      bandView({
        visits,
        target: band?.target ?? null,
        now,
        local,
        directedLocal: directedToday,
      }),
    [visits, band, now, local, directedToday],
  );
  const visit = view.kind === "hidden" ? null : view.visit;

  // 이름 해석(T5.12a): 세션 메모리 → 기준점 주변 → 카카오맵 링크
  const refs = useMemo(
    () => (visit ? [{ placeId: visit.placeId, placeUrl: visit.placeUrl }] : []),
    [visit],
  );
  const names = usePlaceNames(refs, anchor, {
    enabled: refs.length > 0 && !anchorPending,
  });
  const resolved = names.data?.places[0];
  const place =
    resolved?.status === "resolved"
      ? {
          name: resolved.place.name,
          category: kakaoCategorySlug(resolved.place.categoryName),
        }
      : null;
  const placeUrl =
    resolved?.placeUrl ??
    visit?.placeUrl ??
    (visit ? kakaoPlaceUrl(visit.placeId) : "");

  // 그날 처음 물을 때 한 번: 물은 시각 기록(FB-04) + feedback_prompt_shown(D-11 안건 3)
  const askVisit =
    (view.kind === "ask" || view.kind === "collapsed") && view.isNewPrompt
      ? view.visit
      : null;
  const shown = askVisit !== null && names.isFetched;
  useEffect(() => {
    if (!shown || !askVisit) return;
    const key = `${todayKey}:${askVisit.id}`;
    if (promptedThisSession.has(key)) return;
    promptedThisSession.add(key);
    void markFeedbackPromptedAction({ visitId: askVisit.id }).catch(
      () => undefined,
    );
    const source = promptSource(askVisit);
    if (source) {
      track({
        name: "feedback_prompt_shown",
        properties: { visit_source: source },
      });
    }
  }, [shown, askVisit, todayKey]);

  // 답한 뒤 누른 버튼이 사라지므로 상태 줄로 초점을 옮긴다
  useEffect(() => {
    if (!focusLine.current || !lineRef.current) return;
    focusLine.current = false;
    lineRef.current.focus({ preventScroll: true });
  }, [local, failed]);

  async function send(answer: BandAnswer, target: MyVisit) {
    setFailed(null);
    setLocal({ visit: target, answer, reviewId: null, detailsSaved: false });
    focusLine.current = true;
    let reviewId: string | null = null;
    if (answer === "not_visited") {
      const r = await withRetry(() =>
        markNotVisitedAction({ visitId: target.id }),
      );
      if (!r.ok) {
        setFailed({ answer, failure: r });
        focusLine.current = true;
        return;
      }
    } else {
      const r = await withRetry(() =>
        rateVisitAction({ visitId: target.id, rating: answer }),
      );
      if (!r.ok) {
        setFailed({ answer, failure: r });
        focusLine.current = true;
        return;
      }
      reviewId = r.reviewId;
    }
    setLocal((l) =>
      l && l.visit.id === target.id ? { ...l, reviewId } : l,
    );
    track({
      name: "feedback_submitted",
      properties: feedbackSubmittedProps(answer, null),
    });
    void invalidateAfterWrite(client, "review", target.placeId);
  }

  function sheetConfig(
    target: MyVisit,
    mode: ReviewSheetConfig["mode"],
  ): ReviewSheetConfig {
    const category: CategorySlug = place?.category ?? "hansik";
    return {
      mode,
      placeId: target.placeId,
      category: place ? place.category : null,
      name: place?.name ?? null,
      price: {
        value: CATEGORY_PRICE_ESTIMATE[category][target.meal],
        kind: "estimate",
      },
      from: "home",
      finalFocus: () => returnRef.current,
      onSaved: ({ reviewId, rating, draft }) => {
        setFailed(null);
        setLocal({
          visit: target,
          answer: rating,
          reviewId,
          detailsSaved: hasDetails(draft) || !draft.isPublic,
        });
        // 시트가 닫히면 연 버튼 대신 상태 줄로(버튼이 사라진다)
        returnRef.current = lineRef.current;
      },
    };
  }

  /* ---------- 그리기 ---------- */

  if (visitsQuery.isPending) {
    return (
      <div className={className}>
        <BandSkeleton />
      </div>
    );
  }
  // 실패, 비로그인, 물을 곳 없음: 띠 없음(추천은 그대로)
  if (visitsQuery.isError || !visit || view.kind === "hidden") return null;
  if (names.isPending && !names.isFetched) {
    return (
      <div className={className}>
        <BandSkeleton />
      </div>
    );
  }

  let body: ReactNode;
  if (failed) {
    const msg =
      failed.failure.error === "limit"
        ? moderationCopy.limits[failed.failure.bucket]
        : failed.failure.error === "cooldown"
          ? moderationCopy.errors.save
          : moderationCopy.errors[failed.failure.error];
    body = (
      <StatusLine
        ref={lineRef}
        tone="error"
        srBody={msg.body}
        action={
          failed.failure.error === "save" ? (
            <button
              type="button"
              onClick={() => void send(failed.answer, visit)}
              className={textButton}
            >
              {moderationCopy.retry}
            </button>
          ) : undefined
        }
      >
        {msg.title}
      </StatusLine>
    );
  } else if (view.kind === "thanks") {
    const canMore = view.answer !== "not_visited" && !view.detailsSaved;
    body = view.detailsSaved ? (
      <StatusLine ref={lineRef}>{copy.saved}</StatusLine>
    ) : (
      <StatusLine
        ref={lineRef}
        srBody={
          view.answer === "not_visited" ? copy.notVisitedBody : copy.thanksBody
        }
        action={
          canMore ? (
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={copy.moreLabel}
              aria-disabled={view.reviewId === null || undefined}
              onPointerEnter={sheet.preload}
              onFocus={sheet.preload}
              onClick={(e) => {
                if (view.reviewId === null || view.answer === "not_visited")
                  return;
                returnRef.current = e.currentTarget;
                sheet.open(
                  sheetConfig(view.visit, {
                    kind: "details",
                    reviewId: view.reviewId,
                    rating: view.answer,
                  }),
                );
              }}
              className={textButton}
            >
              {copy.more}
            </button>
          ) : undefined
        }
      >
        {copy.thanks}
      </StatusLine>
    );
  } else if (view.kind === "collapsed") {
    body = (
      <div className="flex min-h-11 items-center gap-3 py-1">
        {place ? <CategoryIllustration slug={place.category} size={24} /> : null}
        <p className="min-w-0 flex-1 truncate type-body-sm text-muted-foreground">
          {place ? copy.folded(place.name) : copy.foldedUnnamed}
        </p>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={copy.foldedActionLabel}
          onPointerEnter={sheet.preload}
          onFocus={sheet.preload}
          onClick={(e) => {
            returnRef.current = e.currentTarget;
            sheet.open(sheetConfig(visit, { kind: "rate", visitId: visit.id }));
          }}
          className={textButton}
        >
          {copy.foldedAction}
        </button>
      </div>
    );
  } else {
    body = (
      <Ask
        name={place?.name ?? null}
        category={place?.category ?? null}
        placeUrl={placeUrl}
        onAnswer={(a) => void send(a, visit)}
      />
    );
  }

  return (
    <div className={className}>
      <AutoHeight>
        <section aria-label={copy.label} className="border-y border-border">
          {body}
        </section>
      </AutoHeight>
      {sheet.sheet}
    </div>
  );
}

/* ---------- 조각 ---------- */

/** 띠 뼈대: 같은 높이(64)의 그림 원, 글자 막대, 원형 버튼 두 개 */
function BandSkeleton() {
  return (
    <div
      role="status"
      aria-label={copy.loading}
      className="border-y border-border"
    >
      <div aria-hidden className="flex min-h-16 items-center gap-3 py-2.5">
        <Skeleton className="size-9 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-44 max-w-full" />
          <Skeleton className="h-3 w-14" />
        </div>
        <Skeleton className="size-11 rounded-full" />
        <Skeleton className="size-11 rounded-full" />
      </div>
    </div>
  );
}

const textButton = cn(
  "inline-flex h-7 w-fit shrink-0 items-center gap-1 rounded-sm px-0.5 type-caption text-muted-foreground underline decoration-border underline-offset-3 hover:text-foreground aria-disabled:pointer-events-none aria-disabled:opacity-60",
  hitArea44,
  focusRing,
);

function Ask({
  name,
  category,
  placeUrl,
  onAnswer,
}: {
  name: string | null;
  category: CategorySlug | null;
  placeUrl: string;
  onAnswer: (a: BandAnswer) => void;
}) {
  const named = name !== null && category !== null;
  const links = (
    <div className="-ml-0.5 flex flex-wrap items-center gap-x-4">
      <button
        type="button"
        onClick={() => onAnswer("not_visited")}
        className={textButton}
      >
        {feedbackCopy.ratings.notVisited}
      </button>
      {named ? null : (
        <a
          href={placeUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={copy.kakaoMapLabel}
          className={textButton}
        >
          {copy.kakaoMap}
          <ExternalLink aria-hidden className="size-3" strokeWidth={1.75} />
        </a>
      )}
    </div>
  );
  return (
    <div className={cn("flex flex-col py-2.5", !named && "pb-1.5")}>
      <div className="flex min-h-11 items-center gap-3">
        {named ? (
          <CategoryIllustration slug={category} size={36} />
        ) : (
          <span
            aria-hidden
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-input text-muted-foreground"
          >
            <Utensils className="size-4" strokeWidth={1.5} />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col items-start">
          <h2 className="type-body-sm break-keep">
            {named ? copy.question(name) : copy.questionUnnamed}
          </h2>
          {named ? links : null}
        </div>
        <div className="flex items-center gap-2">
          <Thumb kind="up" onAnswer={onAnswer} />
          <Thumb kind="down" onAnswer={onAnswer} />
        </div>
      </div>
      {named ? null : <div className="pl-12">{links}</div>}
    </div>
  );
}

function Thumb({
  kind,
  onAnswer,
}: {
  kind: "up" | "down";
  onAnswer: (a: BandAnswer) => void;
}) {
  const Icon = kind === "up" ? ThumbsUp : ThumbsDown;
  return (
    <button
      type="button"
      aria-label={feedbackCopy.ratings[kind]}
      onClick={() => onAnswer(kind)}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted",
        pressMotion,
        focusRing,
      )}
    >
      <Icon aria-hidden className="size-[1.125rem]" strokeWidth={1.5} />
    </button>
  );
}

/** 한 줄 상태(체크 또는 오류 + 문장). 초점을 받을 수 있다(tabIndex -1) */
const StatusLine = forwardRef<
  HTMLDivElement,
  {
    children: ReactNode;
    srBody?: string;
    action?: ReactNode;
    tone?: "done" | "error";
  }
>(function StatusLine({ children, srBody, action, tone = "done" }, ref) {
  const Icon = tone === "error" ? AlertCircle : Check;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="flex min-h-11 items-center gap-3 py-1 outline-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:[animation-duration:var(--lm-duration-base)]"
    >
      <p
        role={tone === "error" ? "alert" : "status"}
        className="flex min-w-0 flex-1 items-center gap-2 type-body-sm"
      >
        <Icon
          aria-hidden
          className={cn(
            "size-4 shrink-0",
            tone === "error" ? "text-destructive" : "text-success",
          )}
          strokeWidth={1.75}
        />
        <span
          className={cn(
            "min-w-0 break-keep",
            tone === "error" ? "text-destructive" : "text-foreground",
          )}
        >
          {children}
          {srBody ? <span className="sr-only"> {srBody}</span> : null}
        </span>
      </p>
      {action}
    </div>
  );
});

/** 안의 높이가 바뀌면 그 높이로 부드럽게 맞춘다(base 260 standard). 움직이는 동안만 잘라 포커스 링을 지킨다 */
function AutoHeight({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  const last = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const next = el.offsetHeight;
      if (last.current !== null && last.current !== next && !reduced)
        setMoving(true);
      last.current = next;
      setHeight(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [reduced]);
  return (
    <div
      style={height === null ? undefined : { height }}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget) setMoving(false);
      }}
      className={cn(
        "transition-[height] duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
        moving && "overflow-hidden",
      )}
    >
      <div ref={inner}>{children}</div>
    </div>
  );
}
