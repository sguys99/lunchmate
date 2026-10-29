"use client";
// 랜딩 시안 A "한 화면 에디토리얼" (T3.4).
// - 스크롤 없이 첫 화면에서 끝난다(390x844 기준). 큰 세리프 한 줄 + 짧은 보조 문장 + 선화 한 점 + 시작 버튼들.
// - 움직임 2개, 모두 CSS(Motion 0KB): 제목 단어가 옅은 색에서 본문 색으로 가라앉고(잉크 번짐, LCP 요소지만
//   첫 프레임부터 보인다), 이어서 선화가 한 획씩 그려진다. 둘이 겹치는 순간에도 동시 효과는 2개다. 이후 멈춘다.
// - 모바일: 위 2/3 제목과 그림, 아래 1/3 행동(체험 버튼 1개 + 로그인 3개 + 약관). 데스크톱: 왼쪽 큰 제목, 오른쪽 행동 칸.
import { CategoryIllustration } from "@/features/place/illustrations";
import { landingLabCopy } from "@/copy/design-lab-landing";
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
import type { CSSProperties } from "react";

const copy = landingLabCopy;

export function LandingA({ params }: { params: LandingParams }) {
  const env = useLandingEnv(params);
  return (
    <LandingShell>
      <main
        aria-label={copy.common.homeLabel}
        className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-6 pb-8 desktop:max-w-[72rem] desktop:px-16 desktop:pt-10 desktop:pb-14"
      >
        <header className="flex items-center justify-between">
          <Wordmark />
        </header>

        <div className="flex flex-1 flex-col desktop:grid desktop:grid-cols-[minmax(0,1fr)_22rem] desktop:items-center desktop:gap-24">
          {/* 제목과 그림 */}
          <section className="relative flex flex-1 flex-col justify-center gap-6 py-8 desktop:gap-8 desktop:py-0">
            <CategoryIllustration
              slug="gukbap"
              size={112}
              className="lm-draw -ml-3 desktop:hidden"
            />
            <CategoryIllustration
              slug="gukbap"
              size={168}
              className="lm-draw -ml-5 hidden desktop:block"
            />
            <p className="type-caption text-muted-foreground">
              {copy.a.eyebrow}
            </p>
            <h1 className="type-display text-[2.625rem] leading-[1.18] break-keep desktop:text-[4.25rem] desktop:leading-[1.12]">
              {copy.a.headlineWords.map((word, i) => (
                <span key={word}>
                  <span
                    className="lm-ink-word"
                    style={{ "--lm-ink-i": i } as CSSProperties}
                  >
                    {word}
                  </span>
                  {/* 둘째 줄을 "10초면 정합니다."로 묶는다 */}
                  {i === 2 ? (
                    <br />
                  ) : i < copy.a.headlineWords.length - 1 ? (
                    " "
                  ) : null}
                </span>
              ))}
            </h1>
            <p className="max-w-[22rem] type-body-sm break-keep text-muted-foreground desktop:max-w-[28rem] desktop:type-body">
              {copy.a.body}
            </p>
          </section>

          {/* 행동: 화면 아래 1/3 */}
          <section className="flex flex-col gap-4 desktop:gap-5 desktop:border-l desktop:border-border desktop:pl-10">
            {env.offline ? <OfflineNote className="pb-1" /> : null}
            <div className="flex flex-col gap-2">
              <TryButton env={env} />
              <p className="text-center type-caption text-muted-foreground">
                {copy.common.tryNote}
              </p>
            </div>
            <LoginDivider className="pt-1" />
            <SocialLogin env={env} />
            <TermsNote className="pt-1" />
          </section>
        </div>
      </main>
    </LandingShell>
  );
}
