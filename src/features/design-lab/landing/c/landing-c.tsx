"use client";
// 랜딩 시안 C "스크롤 3장면" (T3.4).
// - 장면 1 고민("오늘 뭐 먹지?") → 장면 2 뽑기(카드 3장, 이유 한 줄) → 장면 3 같이 정하기(득표 바) → 시작.
// - 움직임은 모두 CSS(Motion 0KB). 첫 장면은 떠오른 고민 세 줄에 가는 선이 차례로 그어지는 것 하나(제목은 처음부터 보임).
//   장면 2, 3은 화면에 들어올 때 한 번 8px 떠오르며 나타나고(Reveal), 장면 3은 이어서 득표 바가 차오른다.
//   어느 순간에도 움직이는 효과는 2개 이하다(등장 + 바).
// - 포인트 컬러 버튼은 첫 장면의 "추천 먼저 받아 보기" 하나. 끝 장면의 체험은 테두리 버튼이라 같은 화면에 겹치지 않는다.
// - 머리의 "로그인"은 끝 장면(#landing-c-start)으로 내려가는 링크다.
import { ArrowDown } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { focusRing } from "@/components/ui/interaction";
import { landingLabCopy } from "@/copy/design-lab-landing";
import {
  MOCK_HOME_TODAY,
  MOCK_POLL,
  getMockPlace,
} from "@/features/design-lab/mock";
import { cn } from "@/lib/utils";
import { DemoCard } from "../shared/demo-card";
import type { LandingParams } from "../shared/params";
import {
  LandingShell,
  OfflineNote,
  TermsNote,
  TryButton,
  Wordmark,
} from "../shared/parts";
import { SocialLogin } from "../shared/social-login";
import { useLandingEnv } from "../shared/use-landing-env";
import { Reveal } from "./reveal";

const copy = landingLabCopy;
const START_ID = "landing-c-start";

const POLL_ROWS = MOCK_POLL.candidates.slice(0, 3).map((c) => ({
  place: getMockPlace(c.placeId),
  votes: c.votes,
}));
const POLL_MAX = Math.max(...POLL_ROWS.map((r) => r.votes), 1);
const POLL_VOTERS = POLL_ROWS.reduce((sum, r) => sum + r.votes, 0);

const linkClass = cn(
  "inline-flex h-11 min-w-11 items-center justify-center type-label underline decoration-muted-foreground underline-offset-3 hover:decoration-foreground",
  focusRing,
);

function SceneText({
  eyebrow,
  title,
  body,
  as: Heading = "h2",
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  as?: "h1" | "h2";
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="type-caption text-muted-foreground tabular-nums">
        {eyebrow}
      </p>
      <Heading
        className={cn(
          "break-keep",
          Heading === "h1"
            ? "type-display text-[2.875rem] leading-[1.15] desktop:text-[5rem] desktop:leading-[1.08]"
            : "type-title desktop:type-display",
        )}
      >
        {title}
      </Heading>
      <p className="max-w-[26rem] type-body-sm break-keep text-muted-foreground desktop:type-body">
        {body}
      </p>
      {children}
    </div>
  );
}

export function LandingC({ params }: { params: LandingParams }) {
  const env = useLandingEnv(params);
  const s1 = copy.c.scene1;
  const s2 = copy.c.scene2;
  const s3 = copy.c.scene3;
  const fin = copy.c.final;

  return (
    <LandingShell>
      <header className="mx-auto flex w-full max-w-(--lm-layout-max-width) items-center justify-between px-(--lm-layout-gutter) pt-4 desktop:max-w-[72rem] desktop:px-16 desktop:pt-8">
        <Wordmark />
        <a href={`#${START_ID}`} className={linkClass}>
          {copy.c.login}
        </a>
      </header>

      <main
        aria-label={copy.common.homeLabel}
        className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-col px-(--lm-layout-gutter) desktop:max-w-[72rem] desktop:px-16"
      >
        {/* 장면 1: 고민 */}
        <section className="flex min-h-[calc(100dvh-4.25rem)] flex-col justify-between gap-10 pt-12 pb-8 desktop:min-h-[calc(100dvh-6rem)] desktop:justify-center desktop:gap-14 desktop:pt-0">
          {/* 모바일: 제목 덩어리를 머리와 체험 버튼 사이 가운데에 둔다. 버튼은 하단 1/3에 남기고 가운데 큰 빈칸을 위아래로 나눈다(T3.5) */}
          <div className="flex flex-1 flex-col justify-center desktop:flex-none">
            <SceneText
              as="h1"
              eyebrow={s1.eyebrow}
              title={s1.headline}
              body={s1.body}
            >
              <ul className="flex flex-col gap-2 pt-4 type-body text-muted-foreground desktop:flex-row desktop:gap-8">
                {s1.thoughts.map((t, i) => (
                  <li key={t}>
                    <span
                      className="lm-strike"
                      style={{ "--lm-strike-i": i } as CSSProperties}
                    >
                      {t}
                    </span>
                  </li>
                ))}
              </ul>
            </SceneText>
          </div>
          <div className="flex flex-col gap-4 desktop:max-w-[22rem]">
            {env.offline ? <OfflineNote /> : null}
            <TryButton env={env} />
            <a
              href="#landing-c-scene-2"
              className={cn(
                "inline-flex h-11 items-center justify-center gap-1.5 self-center type-caption text-muted-foreground hover:text-foreground desktop:self-start",
                focusRing,
              )}
            >
              {copy.c.scrollHint}
              <ArrowDown aria-hidden className="size-3.5" strokeWidth={1.5} />
            </a>
          </div>
        </section>

        {/* 장면 2: 뽑기 */}
        <section
          id="landing-c-scene-2"
          className="grid gap-8 border-t border-border py-16 desktop:grid-cols-[minmax(0,1fr)_30rem] desktop:items-center desktop:gap-20 desktop:py-28"
        >
          <Reveal>
            <SceneText
              eyebrow={s2.eyebrow}
              title={s2.headline}
              body={s2.body}
            />
          </Reveal>
          <ol aria-label={copy.b.demoLabel} className="flex flex-col gap-3">
            {MOCK_HOME_TODAY.map((p, i) => (
              <Reveal as="li" key={p.id} index={i + 1}>
                <DemoCard place={p} />
              </Reveal>
            ))}
          </ol>
        </section>

        {/* 장면 3: 같이 정하기 */}
        <section className="grid gap-8 border-t border-border py-16 desktop:grid-cols-[minmax(0,1fr)_30rem] desktop:items-center desktop:gap-20 desktop:py-28">
          <Reveal>
            <SceneText
              eyebrow={s3.eyebrow}
              title={s3.headline}
              body={s3.body}
            />
          </Reveal>
          <Reveal index={1}>
            <div className="flex flex-col gap-6 rounded-card border border-border bg-card p-6 text-card-foreground">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="type-heading">{MOCK_POLL.title}</h3>
                <span className="type-caption text-muted-foreground tabular-nums">
                  {s3.pollMeta(POLL_VOTERS)}
                </span>
              </div>
              <ul className="flex flex-col gap-4">
                {POLL_ROWS.map((r, i) => (
                  <li key={r.place.id} className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate type-label">
                        {r.place.name}
                      </span>
                      <span
                        className={cn(
                          "type-numeric-md",
                          i === 0 ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {s3.votes(r.votes)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-vote-bar-track">
                      <div
                        aria-hidden
                        className={cn(
                          "lm-bar h-full rounded-full",
                          i === 0 ? "bg-vote-bar" : "bg-chart-3",
                        )}
                        style={
                          {
                            "--lm-bar": r.votes / POLL_MAX,
                            "--lm-bar-i": i,
                          } as CSSProperties
                        }
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="border-t border-border pt-5 type-heading">
                {s3.decided}
              </p>
            </div>
          </Reveal>
        </section>

        {/* 끝: 시작 */}
        <section
          id={START_ID}
          className="grid scroll-mt-6 gap-8 border-t border-border pt-16 pb-14 desktop:grid-cols-[minmax(0,1fr)_22rem] desktop:items-start desktop:gap-20 desktop:pt-28 desktop:pb-24"
        >
          <Reveal>
            <SceneText
              eyebrow={fin.eyebrow}
              title={fin.headline}
              body={fin.body}
            />
          </Reveal>
          <Reveal index={1} className="flex flex-col gap-4">
            {env.offline ? (
              <OfflineNote className="pb-1" primary={false} />
            ) : null}
            <SocialLogin env={env} />
            <TryButton env={env} variant="secondary" label={fin.tryAlt} />
            <TermsNote className="pt-1" />
          </Reveal>
        </section>
      </main>
    </LandingShell>
  );
}
