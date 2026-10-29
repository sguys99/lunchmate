"use client";
// 랜딩 시안 B "바로 해 보는 데모" (T3.4).
// - 히어로가 데모다. 예시 동네의 카드 3장을 처음부터 그려 두고(정적, LCP), "다시 뽑기"로 실제처럼 바꿔 본다.
// - Motion은 첫 상호작용 뒤에만: 버튼에 손을 올리거나 포커스하면 덩어리를 미리 받고, 누르면 셔플 모션 목록으로 바뀐다.
//   그 전까지 랜딩의 움직임은 CSS 손짓(다시 뽑기 아이콘이 2.4초 뒤 한 바퀴) 하나뿐이다.
// - 포인트 컬러 버튼은 "추천 먼저 받아 보기" 하나. 다시 뽑기는 테두리 버튼.
// - 상태: ?state=loading이면 데모 자리에 스켈레톤 3장, 오프라인이면 데모는 그대로 두고(목업이라 동작) 체험과 로그인만 막는다.
import { RotateCcw } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { commonCopy } from "@/copy/common";
import { landingLabCopy } from "@/copy/design-lab-landing";
import { MOCK_HOME_ALL_SETS, type MockPick } from "@/features/design-lab/mock";
import { cn } from "@/lib/utils";
import type { LandingParams } from "../shared/params";
import {
  LandingShell,
  LoginDivider,
  OfflineNote,
  TermsNote,
  TryButton,
  Wordmark,
} from "../shared/parts";
import { SocialLogin } from "../shared/social-login";
import { useLandingEnv } from "../shared/use-landing-env";
import { DemoCard, DemoCardSkeleton } from "../shared/demo-card";

const copy = landingLabCopy;
const loadMotionList = () => import("./demo-motion-list");
const DemoMotionList = lazy(loadMotionList);
const TOTAL = MOCK_HOME_ALL_SETS.length;

function StaticList({ picks }: { picks: MockPick }) {
  return (
    <ol aria-label={copy.b.demoLabel} className="flex flex-col gap-3">
      {picks.map((p) => (
        <li key={p.id}>
          <DemoCard place={p} />
        </li>
      ))}
    </ol>
  );
}

export function LandingB({ params }: { params: LandingParams }) {
  const env = useLandingEnv(params);
  const [round, setRound] = useState(0);
  const [animated, setAnimated] = useState(false);
  const [announce, setAnnounce] = useState("");
  const loading = env.state === "loading";
  const picks = MOCK_HOME_ALL_SETS[round % TOTAL] ?? MOCK_HOME_ALL_SETS[0]!;

  function reroll() {
    const next = round + 1;
    setAnimated(true);
    setRound(next);
    setAnnounce(copy.b.rerolled((next % TOTAL) + 1));
  }

  const preload = () => void loadMotionList();

  return (
    <LandingShell>
      <main
        aria-label={copy.common.homeLabel}
        className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-6 pb-10 desktop:max-w-[72rem] desktop:px-16 desktop:pt-10"
      >
        <header>
          <Wordmark />
        </header>

        <div className="flex flex-1 flex-col gap-10 pt-10 desktop:grid desktop:grid-cols-[minmax(0,26rem)_minmax(0,30rem)] desktop:items-center desktop:justify-between desktop:gap-20 desktop:pt-0">
          {/* 왼쪽(모바일 위): 제목과 행동 */}
          <div className="contents desktop:flex desktop:flex-col desktop:gap-10">
            <section className="order-1 flex flex-col gap-4">
              <p className="type-caption text-muted-foreground">
                {copy.b.eyebrow}
              </p>
              <h1 className="type-title break-keep desktop:type-display">
                {copy.b.headline}
              </h1>
              <p className="type-body-sm break-keep text-muted-foreground">
                {copy.b.body}
              </p>
            </section>

            <section className="order-3 flex flex-col gap-4">
              {env.offline ? <OfflineNote className="pb-1" /> : null}
              <div className="flex flex-col gap-2">
                <p className="type-body-sm text-foreground">{copy.b.tryHint}</p>
                <TryButton env={env} />
                <p className="type-caption text-muted-foreground">
                  {copy.common.tryNote}
                </p>
              </div>
              <LoginDivider className="pt-2" />
              <SocialLogin env={env} />
              <TermsNote className="pt-1" />
            </section>
          </div>

          {/* 오른쪽(모바일 가운데): 데모 */}
          <section
            aria-labelledby="landing-b-demo"
            className="order-2 flex flex-col gap-4"
          >
            <div className="flex items-baseline justify-between">
              <h2
                id="landing-b-demo"
                className="type-caption text-muted-foreground"
              >
                {copy.b.demoCaption}
              </h2>
              <span className="type-caption text-muted-foreground tabular-nums">
                {copy.b.round((round % TOTAL) + 1, TOTAL)}
              </span>
            </div>

            <p aria-live="polite" className="sr-only">
              {announce}
            </p>

            {loading ? (
              <div
                aria-busy
                aria-label={copy.b.loading}
                role="status"
                className="flex flex-col gap-3"
              >
                <span className="sr-only">
                  {commonCopy.states.loading.label}
                </span>
                <DemoCardSkeleton />
                <DemoCardSkeleton />
                <DemoCardSkeleton />
              </div>
            ) : animated ? (
              <Suspense fallback={<StaticList picks={picks} />}>
                <DemoMotionList
                  round={round}
                  picks={picks}
                  label={copy.b.demoLabel}
                />
              </Suspense>
            ) : (
              <StaticList picks={picks} />
            )}

            <button
              type="button"
              onClick={reroll}
              onPointerEnter={preload}
              onFocus={preload}
              aria-disabled={loading || undefined}
              className={cn(
                buttonClass("secondary"),
                "self-center pr-6 pl-5",
                loading && "pointer-events-none opacity-60",
              )}
            >
              <RotateCcw
                aria-hidden
                className={cn("size-4", !animated && !loading && "lm-nudge")}
                strokeWidth={1.5}
              />
              {copy.b.reroll}
            </button>
          </section>
        </div>
      </main>
    </LandingShell>
  );
}
