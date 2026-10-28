"use client";
// PoC 공용 틀 (T2.13). 제목과 설명, "모션 줄이기" 토글, MotionProvider를 건다.
// 토글은 MotionProvider preference="reduce"로 넘겨 OS 설정을 바꾸지 않고도 축소 모드를 확인하게 한다.
// @container/screen: 시안 B 조각(NumberRow 등)의 좁은 화면 변형이 이 요소 폭을 본다.
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Toggle } from "@/components/ui/toggle";
import { designLabPocCopy as copy } from "@/copy/design-lab-poc";
import { MotionProvider } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function PocFrame({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  const [reduce, setReduce] = useState(false);
  return (
    <div className="@container/screen relative isolate flex flex-1 flex-col bg-background text-foreground">
      <MotionProvider preference={reduce ? "reduce" : "system"}>
        <main
          className={cn(
            "mx-auto flex w-full max-w-(--lm-layout-max-width) flex-1 flex-col px-(--lm-layout-gutter) pt-6 pb-10",
            className,
          )}
        >
          <header className="flex flex-col gap-3">
            <Link
              href="/design-lab/poc"
              className="-ml-1 inline-flex h-11 w-fit items-center gap-1 type-caption text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft aria-hidden className="size-4" strokeWidth={1.5} />
              {copy.index.back}
            </Link>
            <h1 className="type-title">{title}</h1>
            <p className="type-body-sm text-muted-foreground">{description}</p>
            <div className="flex items-center gap-3 pt-1">
              <Toggle
                pressed={reduce}
                onPressedChange={setReduce}
                aria-describedby="poc-reduce-state"
              >
                {copy.frame.reduceToggle}
              </Toggle>
              <p
                id="poc-reduce-state"
                className="type-caption text-muted-foreground"
              >
                {reduce ? copy.frame.reduceOn : copy.frame.reduceOff}
              </p>
            </div>
          </header>
          {children}
        </main>
      </MotionProvider>
    </div>
  );
}
