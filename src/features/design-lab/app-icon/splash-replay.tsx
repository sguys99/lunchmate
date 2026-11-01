"use client";
// 스플래시 → 첫 화면 전환 흉내 (T8.1). 운영체제 스플래시가 사라지는 순간만 보여 준다.
// 앱 안에 스플래시 오버레이를 새로 두자는 뜻이 아니다(LCP, 10초 원칙. 비교 문서 안건 참고).
// CSS 전환만 쓴다(Motion 0). 180ms 페이드, motion-reduce면 즉시. 캡처가 흔들리지 않게 자동 재생하지 않는다.
import { useEffect, useRef, useState } from "react";
import { appIconLabCopy } from "@/copy/design-lab-app-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AppIconArt, type IconTone, type IconVariant } from "./art";

const t = appIconLabCopy.page;

/** 첫 화면이 그려질 때까지 걸린다고 치는 시간 */
const SPLASH_MS = 700;

export function SplashReplay({
  variant,
  tone,
  hold = false,
}: {
  variant: IconVariant;
  tone: IconTone;
  /** true면 스플래시에 멈춘 채로 둔다(?state=loading) */
  hold?: boolean;
}) {
  const [phase, setPhase] = useState<"splash" | "shell">("splash");
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  function replay() {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setPhase("splash");
    timer.current = window.setTimeout(() => setPhase("shell"), SPLASH_MS);
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <PhoneFrame>
        <AppShell />
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-background transition-opacity duration-[180ms] ease-out motion-reduce:transition-none",
            phase === "shell" && "pointer-events-none opacity-0",
          )}
        >
          <span className="overflow-hidden rounded-[22.37%]">
            <AppIconArt variant={variant} tone={tone} size={56} />
          </span>
        </div>
      </PhoneFrame>
      <p role="status" className="type-caption text-muted-foreground">
        {phase === "splash" ? t.replayStatusSplash : t.replayStatusShell}
      </p>
      {hold ? null : (
        <button
          type="button"
          onClick={replay}
          className="inline-flex min-h-11 items-center rounded-full border border-input px-4 type-label text-foreground hover:bg-muted"
        >
          {t.replay}
        </button>
      )}
    </div>
  );
}

export function PhoneFrame({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative h-[422px] w-[195px] shrink-0 overflow-hidden rounded-[30px] border border-border bg-background text-foreground",
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}

/** 오늘(홈) 첫 화면을 줄인 모형: 제목, 큰 카드, 대안 두 장, 행동 줄, 하단 탭 */
function AppShell() {
  return (
    <div aria-hidden className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-2.5 px-3 pt-8">
        <p className="font-heading text-lg">{t.shellTitle}</p>
        <Skeleton className="h-36 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-1.5">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
      </div>
      <div className="flex gap-1.5 border-t border-border px-3 py-2">
        <div className="h-6 flex-1 rounded-full bg-primary" />
        <div className="h-6 w-14 rounded-full border border-input" />
      </div>
      <div className="grid h-9 grid-cols-4 border-t border-border">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-center">
            <div className="size-2.5 rounded-full bg-muted-foreground/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
