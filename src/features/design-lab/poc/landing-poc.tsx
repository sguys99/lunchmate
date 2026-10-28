"use client";
// /design-lab/poc/landing (T2.13): 랜딩용 복사형 효과 후보 3개를 실제 랜딩 자리에 얹어 비교한다.
// A 단어 페이드(제목), B 블러 페이드(본문, 단계 블록 inView), C 느린 마퀴(카테고리 일러스트).
// 컴포넌트는 src/components/effects. 랜딩 화면 자체의 배치는 G3 시안(T3)에서 정한다.
import { useState, type ReactNode } from "react";
import { BlurFade, Marquee, WordFade } from "@/components/effects";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { pocLandingCopy as copy } from "@/copy/design-lab-poc-landing";
import { CATEGORY_SLUGS, categoryLabel } from "@/features/place/categories";
import { CategoryIllustration } from "@/features/place/illustrations";
import { revealDelay } from "@/lib/motion";
import { PocFrame } from "./poc-frame";

export function LandingPoc() {
  const [round, setRound] = useState(0);
  const [blurOff, setBlurOff] = useState(false);
  const blur = !blurOff;

  return (
    <PocFrame title={copy.title} description={copy.description}>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setRound((r) => r + 1)}>
          {copy.replay}
        </Button>
        <Toggle pressed={blurOff} onPressedChange={setBlurOff}>
          {copy.blurOff}
        </Toggle>
      </div>

      {/* key로 다시 마운트해 처음부터 재생한다 */}
      <div key={round} className="mt-10 flex flex-col gap-16">
        <section className="flex flex-col gap-6">
          <EffectTag effect="a" />
          <p className="type-caption text-muted-foreground">
            {copy.hero.eyebrow}
          </p>
          <WordFade
            as="h1"
            text={copy.hero.headline}
            blur={blur}
            className="type-display text-balance"
          />
          <EffectTag effect="b" />
          <BlurFade delay={revealDelay(5)} blur={blur}>
            <p className="max-w-prose type-body text-muted-foreground">
              {copy.hero.body}
            </p>
          </BlurFade>
          <BlurFade delay={revealDelay(6)} blur={blur}>
            <Button variant="primary">{copy.hero.cta}</Button>
          </BlurFade>
        </section>

        <section className="flex flex-col gap-4">
          <EffectTag effect="c" />
          <Marquee
            label={copy.marquee.label}
            pauseLabel={copy.marquee.pause}
            playLabel={copy.marquee.play}
          >
            {CATEGORY_SLUGS.map((slug) => (
              <span
                key={slug}
                className="flex shrink-0 items-center gap-2.5 text-muted-foreground"
              >
                <CategoryIllustration slug={slug} size={40} />
                <span className="type-caption">{categoryLabel(slug)}</span>
              </span>
            ))}
          </Marquee>
        </section>

        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <EffectTag effect="b" note={copy.inViewNote} />
            <h2 className="type-title">{copy.steps.title}</h2>
          </div>
          <ol className="flex flex-col gap-8">
            {copy.steps.items.map((item, i) => (
              <li key={item.number}>
                <BlurFade inView delay={revealDelay(i)} blur={blur}>
                  <Step number={item.number} title={item.title}>
                    {item.body}
                  </Step>
                </BlurFade>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </PocFrame>
  );
}

function EffectTag({
  effect,
  note,
}: {
  effect: keyof typeof copy.effects;
  note?: string;
}) {
  const e = copy.effects[effect];
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 type-caption text-muted-foreground">
      <span className="text-primary">{e.name}</span>
      <span>
        {e.source}
        {note ? `, ${note}` : null}
      </span>
    </p>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-5">
      <span className="type-numeric-md text-muted-foreground">{number}</span>
      <h3 className="type-heading">{title}</h3>
      <p className="type-body-sm text-muted-foreground">{children}</p>
    </div>
  );
}
