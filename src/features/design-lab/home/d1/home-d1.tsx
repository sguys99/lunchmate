"use client";
// 홈 G3 선택안 D1 "머리 아래 한 줄 띠" (D 선택 뒤 수정안, 2026-10-30 선택, design-decisions D-05).
// 규칙 정본은 DESIGN.md 5장 "오늘(홈) 화면". 실제 홈(/today) 구현은 T5.17에서 이 화면을 옮긴다.
//
// 의도: 결정 화면(D)은 그대로 두고, 어제 피드백을 제목 바로 아래 헤어라인 띠 한 줄로 올린다.
//       카드 면을 쓰지 않아 큰 카드보다 조용하고, 첫 화면에서 반드시 눈에 들어온다.
// 구성: 머리 → 어제 띠(아이콘 36 + "어제 간 ○○, 어땠어요?" + 안 갔어요 / 👍 👎) → 큰 카드 → 대안 두 장 → 하단 고정 행동 줄.
// 어제 띠: 한 탭이면 "알려 줘서 고마워요" 한 줄로 바뀌고 높이가 base(260ms)로 줄어든다(AutoHeight).
//          고마움 줄에는 선택 입력(FB-02) 글자 버튼 하나만. 띠는 그날 계속 남는다(답한 사실을 다시 확인할 수 있게).
// 상태: 로딩, 빈 상태, 오류에서도 띠를 보인다(추천과 따로 오는 정보). 오프라인에서는 보낼 수 없어 숨긴다.
// 모션: 첫 화면은 카드 묶음 CSS 페이드 하나. 띠 접힘은 누른 뒤에만.
import { CategoryIllustration } from "@/features/place/illustrations";
import type { DesignState } from "@/features/design-lab/mock";
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
  ThumbButton,
  feedbackCopy,
  useYesterday,
  type Yesterday,
} from "../shared/yesterday";

export type HomeD1Props = {
  state: DesignState;
};

export function HomeD1({ state }: HomeD1Props) {
  const content = getHomeContent(state);
  const t = useTodayPick();
  const y = useYesterday();
  const strip =
    y.place && content.kind !== "offline" ? (
      <FeedbackStrip y={y} className="mt-5 desktop:mt-4" />
    ) : null;

  if (content.kind !== "ready") {
    const loading = content.kind === "loading";
    return (
      <HomeFrame>
        <HomeColumn
          className={cn("desktop:pt-8", loading && "pb-0 desktop:pb-0")}
        >
          {t.header}
          {strip}
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
        {strip}
        <TodayPicks t={t} className="mt-5 pb-6 desktop:mt-4" />
        <TodayActionBar t={t} />
        <TodayJustPickLayer t={t} />
      </HomeColumn>
    </HomeFrame>
  );
}

/** 헤어라인 위아래 한 줄 띠. 답하면 고마움 한 줄로 접힌다 */
function FeedbackStrip({ y, className }: { y: Yesterday; className?: string }) {
  const place = y.place;
  if (!place) return null;
  return (
    <AutoHeight className={className}>
      <section
        aria-label={feedbackCopy.label}
        className={cn(
          "flex items-center gap-3 border-y border-border",
          y.answer ? "py-1" : "min-h-16 py-2.5",
        )}
      >
        {y.answer ? (
          <FeedbackThanks
            answer={y.answer}
            more
            compact
            focusOnMount
            className="flex-1"
          />
        ) : (
          <>
            <CategoryIllustration slug={place.category} size={36} />
            <div className="flex min-w-0 flex-1 flex-col items-start">
              <p className="type-body-sm break-keep">
                {feedbackCopy.question(place.name)}
              </p>
              <SkippedButton onAnswer={y.setAnswer} className="-ml-0.5" />
            </div>
            <div className="flex items-center gap-2">
              <ThumbButton kind="up" onAnswer={y.setAnswer} />
              <ThumbButton kind="down" onAnswer={y.setAnswer} />
            </div>
          </>
        )}
      </section>
    </AutoHeight>
  );
}
