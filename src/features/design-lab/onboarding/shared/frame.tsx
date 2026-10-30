"use client";
// 온보딩 시안 공용 틀 조각 (T4.1): 단계 제목, 주 버튼, 화면 읽기 안내.
import { useEffect, useRef, type ReactNode } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { onboardingLabCopy } from "@/copy/design-lab-onboarding";
import { cn } from "@/lib/utils";
import type { Onboarding } from "./use-onboarding";

const copy = onboardingLabCopy;

/** 단계 제목(title 30 세리프) + 설명. 단계가 바뀌면 제목으로 포커스를 옮긴다(첫 화면 제외) */
export function StepTitle({
  title,
  body,
  focusKey,
  visited,
  as: Tag = "h1",
  size = "title",
  className,
}: {
  title: string;
  body?: string;
  focusKey: string | number;
  visited: number;
  as?: "h1" | "h2";
  size?: "title" | "heading";
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (visited > 0) ref.current?.focus({ preventScroll: true });
  }, [focusKey, visited]);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Tag
        ref={ref}
        tabIndex={-1}
        className={cn(
          "text-balance break-keep outline-none",
          size === "title" ? "type-title" : "type-heading",
        )}
      >
        {title}
      </Tag>
      {body ? (
        <p className="type-body-sm break-keep text-muted-foreground">{body}</p>
      ) : null}
    </div>
  );
}

/** 단계별 주 버튼 하나(화면의 유일한 올리브 면). 막힌 이유는 aria-describedby로 잇는다 */
export function PrimaryAction({
  ob,
  className,
  describedBy,
}: {
  ob: Onboarding;
  className?: string;
  describedBy?: string;
}) {
  const step = ob.step;
  const blocked =
    ob.loading ||
    (step === 1 && (!ob.office.pin || ob.offline)) ||
    (step === 3 && ob.offline);
  const label =
    step === 1
      ? copy.actions.save
      : step === 2
        ? copy.actions.next
        : copy.actions.done;
  return (
    <button
      type="button"
      aria-disabled={blocked || undefined}
      aria-describedby={blocked ? describedBy : undefined}
      onClick={() => {
        if (blocked) return;
        if (step === 1) ob.saveOffice();
        else ob.next();
      }}
      className={cn(buttonClass("primary"), "w-full", className)}
    >
      {label}
    </button>
  );
}

/** 지도 이동, 핀 놓기 같은 결과를 화면 읽기 프로그램에 알린다 */
export function Announcer({ text }: { text: string }) {
  return (
    <p aria-live="polite" className="sr-only">
      {text}
    </p>
  );
}

export function SkipButton({
  ob,
  className,
  children,
}: {
  ob: Onboarding;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={ob.skip}
      aria-disabled={(ob.step === 3 && ob.offline) || undefined}
      className={cn(
        "inline-flex h-11 items-center px-1 type-label text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground aria-disabled:opacity-50",
        "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
        className,
      )}
    >
      {children ?? copy.actions.skip}
    </button>
  );
}
