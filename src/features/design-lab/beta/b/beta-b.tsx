"use client";
// 베타 환영 시안 B: 세 장 넘기기 (T9.3).
// - 모바일: 카드 세 장(런치메이트는 / 홈 화면에 두기 / 의견 보내기)을 가로로 넘긴다. CSS scroll-snap이라 새 의존성 없음.
//   스와이프만으로 넘기지 않도록 아래에 이전(44) + 위치 "1 / 3" + 주 버튼(다음, 마지막 장은 로그인하고 시작)을 둔다.
//   오른쪽 위 "건너뛰기"는 로그인으로 바로 간다.
// - 데스크톱(1024 이상): 넘기지 않고 세 장을 한 줄에 펼친다. 주 버튼은 로그인 하나.
// - 모션: 넘김은 scroll-behavior smooth(축소 모드면 즉시), 위치 막대 폭 base 전환. 동시에 움직이는 것은 하나.
import { ChevronLeft } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing } from "@/components/ui/interaction";
import { Wordmark } from "@/features/auth/auth-parts";
import { CategoryIllustration } from "@/features/place/illustrations";
import { cn } from "@/lib/utils";
import { BETA_LOGIN_HREF, isKakao, type BetaParams } from "../params";
import {
  BetaSkeleton,
  betaCopy as copy,
  deviceLine,
  DevicePicker,
  ExternalButton,
  InstallBody,
  InstallDiagram,
  installTarget,
  LoginButton,
  MeDiagram,
  OfflineLine,
  OpenFailedBlock,
  useBetaLab,
  type BetaLab,
} from "../shared";

const TOTAL = 3;

export function BetaB({ p }: { p: BetaParams }) {
  const lab = useBetaLab(p);
  const scroller = useRef<HTMLDivElement>(null);
  const initial = p.state === "error" || p.state === "empty" ? 2 : p.card;
  const [index, setIndex] = useState(initial - 1);

  // 처음 보일 카드로 즉시 이동(캡처용 ?card=)
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = (initial - 1) * el.clientWidth;
  }, [initial]);

  function go(i: number) {
    const el = scroller.current;
    if (!el) return;
    const next = Math.max(0, Math.min(TOTAL - 1, i));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: next * el.clientWidth, behavior: reduced ? "auto" : "smooth" });
    setIndex(next);
  }

  function onScroll() {
    const el = scroller.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  const view = lab.view;
  const last = index === TOTAL - 1;

  return (
    <div className="@container/screen flex min-h-dvh flex-1 flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between px-(--lm-layout-gutter) desktop:px-16">
        <Wordmark />
        <a
          href={BETA_LOGIN_HREF}
          onClick={(e) => e.preventDefault()}
          aria-disabled={lab.offline || undefined}
          className={cn(
            "inline-flex min-h-11 items-center px-1 type-label text-muted-foreground hover:text-foreground desktop:hidden",
            focusRing,
          )}
        >
          {copy.cta.skip}
        </a>
      </header>

      <main className="mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col desktop:max-w-[72rem] desktop:px-16">
        <div className="flex flex-col gap-2 px-(--lm-layout-gutter) pt-2 desktop:px-0 desktop:pt-10">
          <p className="type-caption text-muted-foreground">{copy.eyebrow}</p>
          <h1 className="type-title font-heading break-keep">{copy.tagline}</h1>
        </div>

        {view.kind === "loading" ? (
          <BetaSkeleton className="px-(--lm-layout-gutter) pt-8" />
        ) : (
          <section
            aria-roledescription="carousel"
            aria-label={copy.cards.label}
            className="flex flex-1 flex-col"
          >
            <div
              ref={scroller}
              onScroll={onScroll}
              className="mt-6 flex items-start desktop:items-stretch snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] desktop:mt-10 desktop:grid desktop:grid-cols-3 desktop:gap-6 desktop:overflow-visible [&::-webkit-scrollbar]:hidden"
            >
              <Card n={1} title={copy.cards.what.title} active={index === 0}>
                <WhatCard />
              </Card>
              <Card n={2} title={copy.cards.install.title} active={index === 1}>
                <InstallCard lab={lab} />
              </Card>
              <Card n={3} title={copy.cards.feedback.title} active={index === 2}>
                <MeDiagram />
                <p className="type-body-sm break-keep text-muted-foreground">
                  {copy.feedback.body}
                </p>
              </Card>
            </div>
          </section>
        )}

        <div className="sticky bottom-0 flex flex-col gap-3 bg-background px-(--lm-layout-gutter) pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] desktop:static desktop:mx-auto desktop:w-full desktop:max-w-[22rem] desktop:px-0 desktop:pt-10">
          {lab.offline ? <OfflineLine /> : null}
          {/* 모바일: 이전 + 위치 + 다음(또는 로그인) */}
          <div className="flex items-center gap-3 desktop:hidden">
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={index === 0 || view.kind === "loading"}
              aria-label={copy.cta.prev}
              className={buttonClass("secondary", "icon")}
            >
              <ChevronLeft aria-hidden strokeWidth={1.75} />
            </button>
            <Position index={index} />
            {last ? (
              <LoginButton offline={lab.offline} className="flex-1" />
            ) : (
              <button
                type="button"
                onClick={() => go(index + 1)}
                disabled={view.kind === "loading"}
                className={cn(buttonClass("primary"), "flex-1")}
              >
                {copy.cta.next}
              </button>
            )}
          </div>
          <div className="hidden desktop:block">
            <LoginButton offline={lab.offline} />
          </div>
        </div>
      </main>
    </div>
  );
}

function Card({
  n,
  title,
  active,
  children,
}: {
  n: number;
  title: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={copy.cards.positionLabel(n, TOTAL)}
      data-active={active || undefined}
      className="flex w-full shrink-0 snap-center flex-col px-(--lm-layout-gutter) desktop:px-0"
    >
      <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-5 desktop:h-full desktop:p-6">
        <h2 className="flex items-baseline gap-2 type-heading break-keep">
          <span aria-hidden className="type-caption text-muted-foreground tabular-nums">
            {String(n).padStart(2, "0")}
          </span>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

function Position({ index }: { index: number }) {
  return (
    <div className="flex min-w-16 flex-col items-center gap-1.5" aria-live="polite">
      <span className="type-caption text-muted-foreground tabular-nums">
        <span className="sr-only">{copy.cards.positionLabel(index + 1, TOTAL)}</span>
        <span aria-hidden>{copy.cards.position(index + 1, TOTAL)}</span>
      </span>
      <span aria-hidden className="flex gap-1">
        {Array.from({ length: TOTAL }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-0.5 rounded-full transition-[width,background-color] duration-(--lm-duration-base) ease-standard motion-reduce:transition-none",
              i === index ? "w-5 bg-primary" : "w-2 bg-border",
            )}
          />
        ))}
      </span>
    </div>
  );
}

function WhatCard() {
  const slugs = ["gukbap", "ilsik", "salad"] as const;
  return (
    <>
      <div aria-hidden className="flex flex-col gap-2">
        {slugs.map((slug, i) => (
          <div
            key={slug}
            className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
          >
            <CategoryIllustration slug={slug} size={36} />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="h-2.5 w-20 rounded-full bg-muted-foreground/25" />
              <span className="truncate type-caption text-muted-foreground">
                {copy.cards.what.sample[i]}
              </span>
            </span>
          </div>
        ))}
      </div>
      <p className="type-body-sm break-keep text-muted-foreground">{copy.cards.what.body}</p>
    </>
  );
}

function InstallCard({ lab }: { lab: BetaLab }) {
  const view = lab.view;
  if (view.kind === "pick") {
    return (
      <div className="flex flex-col gap-3">
        <p className="flex flex-col gap-1">
          <span className="type-label">{copy.states.empty.title}</span>
          <span className="type-body-sm break-keep text-muted-foreground">
            {copy.states.empty.body}
          </span>
        </p>
        <DevicePicker value={lab.picked} onChange={lab.setPicked} />
      </div>
    );
  }
  if (view.kind !== "guide") return null;
  const d = view.device;
  if (view.openFailed) return <OpenFailedBlock />;
  return (
    <>
      <p className="type-caption text-muted-foreground">{deviceLine(d)}</p>
      <InstallDiagram device={d} />
      {isKakao(d) ? (
        <>
          <p className="type-body-sm break-keep text-muted-foreground">
            {copy.steps.external.body(d === "kakao-ios" ? "ios" : "android")}
          </p>
          <ExternalButton lab={lab} variant="secondary" />
        </>
      ) : (
        <InstallBody target={installTarget(d)} />
      )}
    </>
  );
}
