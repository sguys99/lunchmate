"use client";
// 영업 제보 시안 C 길찾기 뒤 확인 (T9.18).
// - 길찾기를 누르고 5분 넘게 지나 홈으로 돌아오면(같은 끼니) 하단 행동 줄 바로 위에 한 줄
//   "정담국밥, 문 열려 있었나요? [열려 있었어요] [닫혀 있었어요]". 묻지 않고 기다리지 않는다(답하지 않으면 그 끼니가 끝나면 사라짐).
// - 닫혀 있었어요: 제보를 남기고 그 자리에서 가까운 대안 한 곳을 바로 보여 준다(+ 여기로 길찾기).
// - 큰 카드 이유 줄 아래 "영업시간 보기"(길찾기 전에 확인할 수 있게).
// - 열려 있었어요는 신호로 쓰지 않는다(확인 한 줄만). 피드백 띠(어제)와 겹치지 않는다: 이건 오늘, 길찾기 뒤.
import { Check } from "lucide-react";
import { useState } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { getMockPlace } from "@/features/design-lab/mock";
import { CategoryIllustration } from "@/features/place/illustrations";
import { cn } from "@/lib/utils";
import { pickView, type ClosedParams } from "../params";
import { copy, HomeMock, HoursLink } from "../shared";

const VIEWS = ["ask", "done", "open"] as const;
const c = copy.c;

export function ClosedC({ p }: { p: ClosedParams }) {
  const [view, setView] = useState(pickView(p.view, VIEWS));
  const alt = getMockPlace("mock-asian");

  return (
    <HomeMock
      state={p.state}
      heroExtra={<HoursLink className="-mt-2 self-start" />}
      aboveDock={
        view === "ask" ? (
          <section
            aria-label={c.ask("정담국밥")}
            className="ob-rise flex flex-col gap-2 rounded-card border border-border bg-card px-4 py-3"
          >
            <p className="type-label break-keep">{c.ask("정담국밥")}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setView("open")}
                className={buttonClass("secondary", "sm")}
              >
                {c.open}
              </button>
              <button
                type="button"
                onClick={() => setView("done")}
                className={buttonClass("secondary", "sm")}
              >
                {c.closed}
              </button>
            </div>
          </section>
        ) : view === "open" ? (
          <p
            role="status"
            className="ob-rise flex min-h-11 items-center gap-2 type-caption text-muted-foreground"
          >
            <Check
              aria-hidden
              className="size-4 text-primary"
              strokeWidth={2}
            />
            {c.openThanks}
          </p>
        ) : (
          <section
            aria-label={c.doneTitle}
            className="ob-rise flex flex-col gap-2 rounded-card border border-border bg-card px-4 py-3"
          >
            <p
              role="status"
              className="type-caption break-keep text-muted-foreground"
            >
              {c.doneTitle}
            </p>
            <div className="flex items-center gap-3">
              <CategoryIllustration slug={alt.category} size={40} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="type-label">{alt.name}</span>
                <span className="type-caption text-muted-foreground">
                  {c.altWalk(alt.walkMinutes)}
                </span>
              </div>
              <button
                type="button"
                className={cn(buttonClass("secondary", "sm"), "shrink-0")}
              >
                {c.altDirections}
              </button>
            </div>
          </section>
        )
      }
    />
  );
}
