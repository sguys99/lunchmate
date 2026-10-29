"use client";
// 홈 수정 시안 D2 "큰 카드 위 질문 카드" (G3 D 선택 뒤, 2026-10-30).
//
// 의도: 어제 피드백을 큰 카드와 같은 폭, 같은 모양(1px 선, 라운드 24)의 얇은 카드로 큰 카드 바로 위에 둔다.
//       D1보다 존재감이 크고(식당명 세리프 22px, 글자 있는 버튼), 답하면 자리를 비워 오늘의 한 곳이 다시 주인공이 된다.
// 구성: 머리 → 질문 카드(아이콘 44 + "어제 점심" + "○○, 어땠어요?" + 안 갔어요 / 👍 좋았어요 👎 별로였어요) → 큰 카드
//       → 대안 두 장 → 하단 고정 행동 줄.
// 답한 뒤: 카드 안이 같은 높이 그대로 고마움 한 줄로 바뀌고(누른 결과를 눈으로 확인), 1.4초 뒤 카드가 흐려지며 높이가 0으로 줄고
//         큰 카드가 올라온다(base). 고마움은 화면 단위 aria-live로 한 번 읽고, 카드가 사라지면 포커스를 큰 카드로 옮긴다.
//         선택 입력(FB-02)은 이 안에서 열지 않는다(사라지는 카드에 조작을 두지 않음, WCAG 2.2.1).
// 상태: 로딩, 빈 상태, 오류에서도 카드를 보인다. 오프라인에서는 숨긴다.
// 모션: 첫 화면은 카드 묶음 CSS 페이드 하나. 질문 카드 접힘은 누른 뒤에만, 축소 모드면 1.4초 뒤 바로 사라진다.
import { useEffect, useRef, useState } from "react";
import { CategoryIllustration } from "@/features/place/illustrations";
import { getHomeContent } from "@/features/design-lab/system/states";
import { cn } from "@/lib/utils";
import {
  HomeColumn,
  HomeFrame,
  HomeMap,
  HomeStateMessage,
} from "../shared/frame";
import {
  ActionBarSkeleton,
  CalmBadgeDefault,
  TodayActionBar,
  TodayJustPickLayer,
  TodayPicks,
  TodayPicksSkeleton,
  useTodayPick,
} from "../shared/today-pick";
import {
  AutoHeight,
  FeedbackThanks,
  SkippedButton,
  ThumbLabelButton,
  feedbackCopy,
  useYesterday,
  type FeedbackAnswer,
  type Yesterday,
} from "../shared/yesterday";
import type { HomeVariantProps } from "../types";

/** 고마움 한 줄을 보여 주는 시간(ms). 조작이 없는 글자라 자동으로 사라져도 된다 */
const THANKS_MS = 1400;

export function HomeD2(props: HomeVariantProps) {
  return (
    <CalmBadgeDefault>
      <ScreenD2 {...props} />
    </CalmBadgeDefault>
  );
}

function ScreenD2({ state }: HomeVariantProps) {
  const content = getHomeContent(state);
  const t = useTodayPick("d2");
  const y = useYesterday();
  const heroRef = useRef<HTMLElement>(null);
  const [announcement, setAnnouncement] = useState("");

  function answer(a: FeedbackAnswer) {
    y.setAnswer(a);
    setAnnouncement(
      a === "skipped" ? feedbackCopy.announceSkipped : feedbackCopy.announce,
    );
  }

  const card =
    y.place && content.kind !== "offline" ? (
      <FeedbackCard
        y={y}
        onAnswer={answer}
        onGone={() => heroRef.current?.focus({ preventScroll: true })}
        className="mt-5"
      />
    ) : null;
  const live = (
    <p aria-live="polite" className="sr-only">
      {announcement || t.lab.announcement}
    </p>
  );

  if (content.kind !== "ready") {
    const loading = content.kind === "loading";
    return (
      <HomeFrame>
        <HomeColumn
          className={cn("desktop:pt-8", loading && "pb-0 desktop:pb-0")}
        >
          {t.header}
          {live}
          {card}
          {loading ? (
            <>
              <TodayPicksSkeleton
                label={content.label}
                className={card ? undefined : "mt-5"}
              />
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
        {live}
        {card}
        <TodayPicks
          t={t}
          heroRef={heroRef}
          className={cn("pb-6", !card && "mt-5")}
        />
        <TodayActionBar t={t} />
        <TodayJustPickLayer t={t} />
      </HomeColumn>
    </HomeFrame>
  );
}

/**
 * 큰 카드와 같은 폭의 질문 카드. 카드 아래 간격(20px)도 접히는 상자 안에 있어 사라지면 간격까지 없어진다.
 * 질문과 고마움을 같은 칸에 겹쳐 두어(grid stack) 답해도 카드 높이가 그대로다.
 */
function FeedbackCard({
  y,
  onAnswer,
  onGone,
  className,
}: {
  y: Yesterday;
  onAnswer: (answer: FeedbackAnswer) => void;
  onGone: () => void;
  className?: string;
}) {
  const [gone, setGone] = useState(false);
  const goneRef = useRef(onGone);
  useEffect(() => {
    goneRef.current = onGone;
  });
  useEffect(() => {
    if (!y.answer) return;
    const id = window.setTimeout(() => {
      setGone(true);
      goneRef.current();
    }, THANKS_MS);
    return () => window.clearTimeout(id);
  }, [y.answer]);

  const place = y.place;
  if (!place) return null;
  return (
    <AutoHeight collapsed={gone} className={className}>
      <div className="pb-5">
        <section
          aria-label={feedbackCopy.label}
          className="grid rounded-card border border-border bg-card px-5 py-4 @max-[23.75rem]/screen:px-4"
        >
          <div
            inert={y.answer !== null}
            className={cn(
              "col-start-1 row-start-1 flex flex-col",
              y.answer && "invisible",
            )}
          >
            <div className="flex items-center gap-3">
              <CategoryIllustration
                slug={place.category}
                size={44}
                className="-ml-1 shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center justify-between gap-3">
                  <span className="type-caption text-muted-foreground">
                    {feedbackCopy.eyebrow}
                  </span>
                  <SkippedButton onAnswer={onAnswer} className="-my-1.5" />
                </div>
                <p className="type-heading break-keep">
                  {feedbackCopy.questionShort(place.name)}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ThumbLabelButton kind="up" onAnswer={onAnswer} />
              <ThumbLabelButton kind="down" onAnswer={onAnswer} />
            </div>
          </div>
          {y.answer ? (
            <FeedbackThanks
              answer={y.answer}
              live={false}
              focusOnMount
              className="col-start-1 row-start-1 self-center"
            />
          ) : null}
        </section>
      </div>
    </AutoHeight>
  );
}
