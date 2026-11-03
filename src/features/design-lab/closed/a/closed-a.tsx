"use client";
// 영업 제보 시안 A 상세 지금 행 (T9.18).
// - 상세 "지금" 행(웨이팅 3버튼이 있는 곳) 맨 위에 "가 보니 문이 닫혀 있었나요?" + [오늘 닫혀 있어요] 한 탭.
//   누르면 버튼 자리에 결과 줄 "12시 24분에 알렸습니다. 이번 점심 동안 다른 분들께 보입니다." + 취소(2분 안). 웨이팅과 같은 문법.
// - 지금 행 제목 옆에 "영업시간 보기"(네이버 플레이스). 카드에는 다른 분 제보가 있으면 배지 "오늘 쉰다는 제보".
// - 지금은 상세 → 더 보기 → 정보가 다른가요 → 문 닫았어요 → 오늘만 쉬어요(5번)인 길을 상세 한 번으로 줄인다.
import { useState } from "react";
import { buttonClass } from "@/components/ui/button-classes";
import { focusRing } from "@/components/ui/interaction";
import { cn } from "@/lib/utils";
import { pickView, type ClosedParams } from "../params";
import {
  ClosedBadge,
  copy,
  HomeMock,
  HoursLink,
  SheetOverlay,
} from "../shared";

const VIEWS = ["home", "sheet", "done"] as const;
const c = copy.a;

export function ClosedA({ p }: { p: ClosedParams }) {
  const [view, setView] = useState(pickView(p.view, VIEWS));
  return (
    <HomeMock
      state={p.state}
      heroBadge={view === "home" ? <ClosedBadge /> : null}
      overlay={
        view === "home" ? null : (
          <SheetOverlay label={c.sheetTitle}>
            <h2 className="type-title">{c.sheetTitle}</h2>
            <section
              aria-labelledby="closed-a-now"
              className="mt-5 flex flex-col gap-4 rounded-card border border-border px-4 py-4"
            >
              <div className="flex items-center justify-between">
                <h3 id="closed-a-now" className="type-label">
                  {c.nowTitle}
                </h3>
                <HoursLink />
              </div>

              <div className="flex flex-col gap-2">
                <p className="type-body-sm">{c.closedAsk}</p>
                {view === "done" ? (
                  <p
                    role="status"
                    className="ob-rise flex flex-wrap items-center gap-x-3 type-caption text-muted-foreground"
                  >
                    <span className="inline-flex h-9 items-center rounded-chip border border-primary px-4 type-label text-primary">
                      {c.closedButton}
                    </span>
                    <span className="break-keep">
                      {c.closedDone("12시 24분")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setView("sheet")}
                      className={cn(
                        "inline-flex h-11 items-center type-caption underline underline-offset-4",
                        focusRing,
                      )}
                    >
                      {c.undo}
                    </button>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setView("done")}
                    className={cn(buttonClass("secondary", "sm"), "self-start")}
                  >
                    {c.closedButton}
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <p className="type-body-sm">{c.waitTitle}</p>
                <div className="flex flex-wrap gap-2">
                  {c.wait.map((w) => (
                    <button
                      key={w}
                      type="button"
                      aria-disabled={view === "done" || undefined}
                      className={cn(
                        buttonClass("secondary", "sm"),
                        "aria-disabled:opacity-50",
                      )}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
              <p className="type-caption break-keep text-muted-foreground">
                {c.note}
              </p>
            </section>
          </SheetOverlay>
        )
      }
    />
  );
}
