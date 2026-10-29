"use client";
// 홈 수정 시안 D3 "먼저 묻기" (G3 D 선택 뒤, 2026-10-30).
//
// 의도: 어제 간 곳이 있는 날은 큰 카드 자리를 어제 간 곳이 먼저 차지하고 묻는다. 답하거나 미루면 오늘의 추천으로 넘어간다.
//       피드백 응답률은 가장 높을 것으로 보지만, 피드백이 있는 날은 결정까지 한 탭이 더 든다(10초 원칙과 긴장).
// 구성(묻는 동안): 머리 → 어제 카드(큰 카드와 같은 모양: "어제 점심", 카테고리, 식당명 30px, 일러스트 152, "어땠어요?",
//       한 줄 설명, 안 갔어요) → 오늘의 한 곳 미리 보기 줄("나중에", 누르면 바로 오늘의 추천) → 하단 고정 줄에 👍 좋았어요 👎 별로였어요.
//       답 버튼이 엄지 자리(길찾기가 올 자리)에 있다. 올리브 면 버튼은 없다(답은 결정 행동이 아님).
// 답한 뒤: 오늘의 추천 화면(D1과 같은 큰 카드, 대안 두 장, 하단 행동 줄) 맨 위에 고마움 한 줄. 포커스는 고마움 줄로.
// 나중에: 고마움 없이 오늘의 추천으로. 포커스는 큰 카드로. 실제 앱에서는 FB-04(하루 1회)에 따라 그날 다시 묻지 않는다.
// 상태: 로딩이면 묻는 동안 미리 보기 줄만 스켈레톤(추천을 기다리는 시간에 답을 받는다). 빈 상태, 오류도 먼저 묻고,
//       오프라인은 묻지 않는다.
// 모션: 첫 화면은 어제 카드 CSS 페이드 하나. 넘어갈 때 새 화면이 CSS 페이드(카드 묶음 + 고마움 줄, 둘).
import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SkeletonLine } from "@/components/states";
import { focusRing } from "@/components/ui/interaction";
import { Skeleton } from "@/components/ui/skeleton";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import type { MockPlace } from "@/features/design-lab/mock";
import {
  getHomeContent,
  type HomeContent,
} from "@/features/design-lab/system/states";
import { CategoryIllustration } from "@/features/place/illustrations";
import { cn } from "@/lib/utils";
import { CategoryCaption } from "../shared/card-bits";
import {
  HomeColumn,
  HomeFrame,
  HomeMap,
  HomeStateMessage,
} from "../shared/frame";
import { firstEntranceClass } from "../shared/shuffle";
import {
  ActionBarSkeleton,
  BottomDock,
  CalmBadgeDefault,
  HERO_ART,
  TodayActionBar,
  TodayJustPickLayer,
  TodayPicks,
  TodayPicksSkeleton,
  useTodayPick,
} from "../shared/today-pick";
import {
  FeedbackThanks,
  SkippedButton,
  ThumbLabelButton,
  feedbackCopy,
  useYesterday,
  type FeedbackAnswer,
} from "../shared/yesterday";
import type { HomeVariantProps } from "../types";

const copy = designLabHomeCopy.screen;

export function HomeD3(props: HomeVariantProps) {
  return (
    <CalmBadgeDefault>
      <ScreenD3 {...props} />
    </CalmBadgeDefault>
  );
}

function ScreenD3({ state }: HomeVariantProps) {
  const content = getHomeContent(state);
  const t = useTodayPick("d3");
  const y = useYesterday();
  const [later, setLater] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const asking =
    y.place !== null &&
    y.answer === null &&
    !later &&
    content.kind !== "offline";

  // 나중에: 오늘의 추천이 나타난 뒤 포커스를 큰 카드로(누른 줄이 사라지므로)
  useEffect(() => {
    if (later) heroRef.current?.focus({ preventScroll: true });
  }, [later]);

  if (asking && y.place) {
    return (
      <HomeFrame
        map={
          <HomeMap picks={content.kind === "ready" ? t.lab.picks : undefined} />
        }
      >
        <HomeColumn className="pb-0 desktop:pt-8 desktop:pb-0">
          {t.header}
          <AskPanel
            place={y.place}
            content={content}
            hero={t.hero}
            onAnswer={y.setAnswer}
            onLater={() => {
              setLater(true);
              t.lab.announce(feedbackCopy.laterAnnounce);
            }}
          />
          <BottomDock label={feedbackCopy.label}>
            <div className="grid grid-cols-2 gap-2">
              <ThumbLabelButton kind="up" onAnswer={y.setAnswer} />
              <ThumbLabelButton kind="down" onAnswer={y.setAnswer} />
            </div>
          </BottomDock>
        </HomeColumn>
      </HomeFrame>
    );
  }

  const thanks = y.answer ? (
    <FeedbackThanks
      answer={y.answer}
      more
      compact
      focusOnMount
      className="mt-4 -mb-1"
    />
  ) : null;

  if (content.kind !== "ready") {
    const loading = content.kind === "loading";
    return (
      <HomeFrame>
        <HomeColumn
          className={cn("desktop:pt-8", loading && "pb-0 desktop:pb-0")}
        >
          {t.header}
          {thanks}
          {loading ? (
            <>
              <TodayPicksSkeleton label={content.label} className="mt-5" />
              <ActionBarSkeleton />
            </>
          ) : (
            <HomeStateMessage
              content={content}
              className="mt-auto pt-6 desktop:mt-12"
            />
          )}
        </HomeColumn>
      </HomeFrame>
    );
  }

  return (
    <HomeFrame map={<HomeMap picks={t.lab.picks} active={t.heroIndex} />}>
      <HomeColumn className="pb-0 desktop:pt-8 desktop:pb-0">
        {t.header}
        <p aria-live="polite" className="sr-only">
          {t.lab.announcement}
        </p>
        {thanks}
        <TodayPicks t={t} heroRef={heroRef} className="mt-5 pb-6" />
        <TodayActionBar t={t} />
        <TodayJustPickLayer t={t} />
      </HomeColumn>
    </HomeFrame>
  );
}

/** 묻는 동안의 본문: 어제 카드 + 오늘의 한 곳 미리 보기 줄 */
function AskPanel({
  place,
  content,
  hero,
  onAnswer,
  onLater,
}: {
  place: MockPlace;
  content: HomeContent;
  hero: MockPlace;
  onAnswer: (answer: FeedbackAnswer) => void;
  onLater: () => void;
}) {
  return (
    <div className={cn("mt-5 flex flex-1 flex-col", firstEntranceClass)}>
      <section
        aria-labelledby="d3-ask"
        className="flex flex-col rounded-card border border-border bg-card p-6 text-card-foreground @max-[23.75rem]/screen:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col pt-1">
            <span className="type-caption text-muted-foreground">
              {feedbackCopy.eyebrow}
            </span>
            <CategoryCaption place={place} className="mt-4" />
            <h2 id="d3-ask" className="mt-1 flex flex-col break-keep">
              <span className="type-title">{place.name}</span>
              <span className="mt-1 type-heading text-muted-foreground">
                {feedbackCopy.ask}
              </span>
            </h2>
          </div>
          <CategoryIllustration
            slug={place.category}
            size={152}
            className={HERO_ART}
          />
        </div>
        <p className="mt-2 type-body-sm text-pretty text-muted-foreground">
          {feedbackCopy.lead}
        </p>
        <SkippedButton onAnswer={onAnswer} className="mt-2 -ml-0.5" />
      </section>
      {/* 남는 높이는 카드와 이 줄 사이로: "나중에"가 답 버튼 바로 위(엄지 자리)에 온다 */}
      <div aria-hidden className="min-h-5 flex-1" />

      <button
        type="button"
        onClick={onLater}
        className={cn(
          // 아래 선은 답 줄(BottomDock)의 위 선이 맡는다
          "group flex min-h-16 w-full items-center gap-3 border-t border-border py-2.5 text-left",
          focusRing,
        )}
      >
        <LaterLead content={content} hero={hero} />
        <span className="flex shrink-0 items-center gap-1 type-label text-muted-foreground group-hover:text-foreground">
          {feedbackCopy.later}
          <ChevronRight
            aria-hidden
            className="size-4 transition-transform duration-(--lm-duration-fast) ease-standard group-hover:translate-x-0.5 motion-reduce:transition-none"
            strokeWidth={1.5}
          />
        </span>
      </button>
    </div>
  );
}

/** 미리 보기 줄 왼쪽: 추천이 오면 오늘의 한 곳, 기다리는 중이면 스켈레톤, 없으면 "오늘의 추천" */
function LaterLead({
  content,
  hero,
}: {
  content: HomeContent;
  hero: MockPlace;
}) {
  if (content.kind === "loading") {
    return (
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <Skeleton aria-hidden className="size-9 shrink-0 rounded-full" />
        <span aria-hidden className="flex min-w-0 flex-1 flex-col">
          <SkeletonLine type="caption" className="w-16" />
          <SkeletonLine type="label" className="w-24" />
        </span>
        <span className="sr-only">{copy.title}</span>
      </span>
    );
  }
  const ready = content.kind === "ready";
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      {ready ? <CategoryIllustration slug={hero.category} size={36} /> : null}
      <span className="flex min-w-0 flex-col">
        <span className="type-caption text-muted-foreground">
          {ready ? copy.single.eyebrow : copy.title}
        </span>
        {ready ? (
          <span className="truncate type-label">{hero.name}</span>
        ) : null}
      </span>
    </span>
  );
}
