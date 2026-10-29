"use client";
// 랜딩 시안 B "바로 해 보는 데모" (T3.4).
// - 히어로가 데모다. 예시 동네의 카드 3장을 처음부터 그려 두고(정적, LCP), "다시 뽑기"로 실제처럼 바꿔 본다.
// - Motion을 쓰지 않는다(G3 선택 후). 셔플은 CSS 전환(landing.css lm-shuffle): 세 장이 함께 흐려지고(exit, fast)
//   새 세 장이 70ms 간격으로 떠오른다(reveal, slow). 축소 모드면 애니메이션 없이 바로 바꾼다.
//   첫 화면의 움직임은 CSS 손짓(다시 뽑기 아이콘이 2.4초 뒤 한 바퀴) 하나뿐이다.
// - 포인트 컬러 버튼은 "추천 먼저 받아 보기" 하나. 다시 뽑기는 테두리 버튼.
// - 상태: ?state=loading이면 데모 자리에 스켈레톤 3장, 오프라인이면 데모는 그대로 두고(목업이라 동작) 체험과 로그인만 막는다.
import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type AnimationEvent } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing } from "@/components/ui/interaction";
import { commonCopy } from "@/copy/common";
import { landingLabCopy } from "@/copy/design-lab-landing";
import { MOCK_HOME_ALL_SETS, type MockPick } from "@/features/design-lab/mock";
import { useMotionPreference } from "@/lib/motion/preference";
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
/** 퇴장 애니메이션 끝 이벤트가 오지 않을 때(탭 숨김 등) 바꿔 끼우는 안전 시간. exit fast(180ms)보다 넉넉하게 */
const EXIT_FALLBACK_MS = 400;
const TOTAL = MOCK_HOME_ALL_SETS.length;
const LOGIN_ID = "landing-b-login";

const headerLinkClass = cn(
  "inline-flex h-11 min-w-11 items-center justify-center type-label underline decoration-muted-foreground underline-offset-3 hover:decoration-foreground desktop:hidden",
  focusRing,
);

type Shuffle = "idle" | "leaving" | "entering";

function DemoList({
  picks,
  shuffle,
  onAnimationEnd,
}: {
  picks: MockPick;
  shuffle: Shuffle;
  onAnimationEnd?: (e: AnimationEvent<HTMLOListElement>) => void;
}) {
  return (
    <ol
      aria-label={copy.b.demoLabel}
      data-shuffle={shuffle}
      onAnimationEnd={onAnimationEnd}
      className="lm-shuffle flex flex-col gap-3"
    >
      {picks.map((p) => (
        <li key={p.id}>
          <DemoCard place={p} dedupeWalk />
        </li>
      ))}
    </ol>
  );
}

export function LandingB({ params }: { params: LandingParams }) {
  const env = useLandingEnv(params);
  const preference = useMotionPreference();
  const [round, setRound] = useState(0);
  const [shuffle, setShuffle] = useState<Shuffle>("idle");
  const [announce, setAnnounce] = useState("");
  const fallback = useRef<number | null>(null);
  const loading = env.state === "loading";
  const picks = MOCK_HOME_ALL_SETS[round % TOTAL] ?? MOCK_HOME_ALL_SETS[0]!;

  useEffect(
    () => () => {
      if (fallback.current !== null) window.clearTimeout(fallback.current);
    },
    [],
  );

  function show(next: number, nextShuffle: Shuffle) {
    if (fallback.current !== null) window.clearTimeout(fallback.current);
    fallback.current = null;
    setRound(next);
    setShuffle(nextShuffle);
    setAnnounce(copy.b.rerolled((next % TOTAL) + 1));
  }

  function reroll() {
    if (loading || shuffle === "leaving") return;
    const next = round + 1;
    const reduced =
      preference === "reduce" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      show(next, "idle");
      return;
    }
    setShuffle("leaving");
    fallback.current = window.setTimeout(
      () => show(next, "entering"),
      EXIT_FALLBACK_MS,
    );
  }

  // 퇴장은 세 장이 함께 끝나므로 아무 한 장의 끝 이벤트에서 새 묶음으로 바꾼다
  function onListAnimationEnd(e: AnimationEvent<HTMLOListElement>) {
    if (shuffle === "leaving" && e.animationName === "lm-shuffle-exit") {
      show(round + 1, "entering");
    }
  }

  return (
    <LandingShell>
      <main
        aria-label={copy.common.homeLabel}
        className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-6 pb-10 desktop:max-w-[72rem] desktop:px-16 desktop:pt-10"
      >
        {/* 모바일은 데모가 첫 화면을 차지해 로그인 버튼이 둘째 화면으로 내려간다. 머리에 바로가기 링크를 둔다(데스크톱은 첫 화면에 다 보여 숨김, T3.5) */}
        <header className="-my-3 flex items-center justify-between">
          <Wordmark />
          <a href={`#${LOGIN_ID}`} className={headerLinkClass}>
            {copy.b.login}
          </a>
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
              <LoginDivider className="scroll-mt-6 pt-2" id={LOGIN_ID} />
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
            ) : (
              <DemoList
                key={round}
                picks={picks}
                shuffle={shuffle}
                onAnimationEnd={onListAnimationEnd}
              />
            )}

            <button
              type="button"
              onClick={reroll}
              aria-disabled={loading || undefined}
              className={cn(
                buttonClass("secondary"),
                "self-center pr-6 pl-5",
                loading && "pointer-events-none opacity-60",
              )}
            >
              <RotateCcw
                aria-hidden
                className={cn("size-4", round === 0 && !loading && "lm-nudge")}
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
