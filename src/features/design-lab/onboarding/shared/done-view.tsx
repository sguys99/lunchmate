"use client";
// 완료 직후 첫 추천 (ONB-05, 첫 "아하" 순간). 실제 구현은 /today로 바로 이동한다(T4.21).
// 시안에서는 이동 대신 같은 자리에서 랜딩 데모 카드 세 장을 70ms 간격으로 띄워 "완료 즉시 추천"을 보여 준다.
// 포인트 컬러 버튼은 "홈에서 이어 보기" 하나.
import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { onboardingLabCopy } from "@/copy/design-lab-onboarding";
import { MOCK_HOME_TODAY } from "@/features/design-lab/mock";
import { DemoCard } from "@/features/design-lab/landing/shared/demo-card";
import { cn } from "@/lib/utils";

const copy = onboardingLabCopy;

export function DoneView({
  onRestart,
  animate,
  className,
}: {
  onRestart: () => void;
  /** 단계를 거쳐 왔을 때만 등장 모션(?step=done 첫 화면은 정적) */
  animate: boolean;
  className?: string;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (animate) titleRef.current?.focus({ preventScroll: true });
  }, [animate]);
  const rise = (i: number) =>
    animate
      ? { className: "ob-rise", style: { "--ob-i": i } as CSSProperties }
      : {};
  return (
    <section
      aria-labelledby="ob-done-title"
      className={cn("flex flex-col gap-6", className)}
    >
      <div className="flex flex-col gap-2">
        <p className="type-caption text-muted-foreground">
          {copy.done.eyebrow}
        </p>
        <h1
          id="ob-done-title"
          ref={titleRef}
          tabIndex={-1}
          className="type-title break-keep outline-none"
        >
          {copy.done.title}
        </h1>
      </div>
      {/* 데모 카드의 식당명이 h3라 목록 제목 h2를 둔다(읽기 순서용, 화면에는 숨김) */}
      <h2 id="ob-done-list" className="sr-only">
        {copy.done.listLabel}
      </h2>
      <ol aria-labelledby="ob-done-list" className="flex flex-col gap-3">
        {MOCK_HOME_TODAY.map((p, i) => {
          const r = rise(i + 1);
          return (
            <li key={p.id} className={r.className} style={r.style}>
              <DemoCard place={p} />
            </li>
          );
        })}
      </ol>
      <p className="type-caption text-muted-foreground">{copy.done.body}</p>
      <div className="flex flex-col gap-2">
        <Link
          href="/design-lab/home/d1"
          className={cn(buttonClass("primary"), "w-full")}
        >
          {copy.actions.seeHome}
        </Link>
        <button
          type="button"
          onClick={onRestart}
          className={cn(buttonClass("ghost"), "w-full")}
        >
          {copy.actions.restart}
        </button>
      </div>
    </section>
  );
}
