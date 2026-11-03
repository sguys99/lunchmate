"use client";
// 영업 제보 시안 B 카드에서 바로 바꾸기 (T9.18).
// - 큰 카드 더 보기 메뉴 맨 위에 "문이 닫혀 있어요"(그다음 "영업시간 보기", 기존 즐겨찾기, 다시 안 갈래요, 투표에 추가).
// - 누르면 제보를 남기고 그 자리 카드를 바로 다른 곳으로 바꾼다(다시 안 갈래요의 자리 채우기와 같은 규칙).
//   카드 위 결과 줄 "정담국밥은 닫혀 있다고 알렸습니다. 다른 곳을 골랐습니다." + 되돌리기.
// - 가게 앞에서 문이 닫힌 걸 본 순간 "그럼 어디 가지?"까지 한 번에 푸는 것이 목적(10초 원칙).
import { CalendarClock, DoorClosed, Heart, Ban, Vote } from "lucide-react";
import { useState } from "react";
import { focusRing } from "@/components/ui/interaction";
import {
  CategoryCaption,
  NumberGrid,
} from "@/features/design-lab/home/shared/card-bits";
import { getMockPlace } from "@/features/design-lab/mock";
import { CategoryIllustration } from "@/features/place/illustrations";
import { cn } from "@/lib/utils";
import { pickView, type ClosedParams } from "../params";
import { copy, HomeMock, MoreButton } from "../shared";

const VIEWS = ["home", "menu", "done"] as const;
const c = copy.b;

export function ClosedB({ p }: { p: ClosedParams }) {
  const [view, setView] = useState(pickView(p.view, VIEWS));
  const swapped = getMockPlace("mock-hansik");

  if (view === "done") {
    return (
      <HomeMock
        state={p.state}
        hero={
          <div className="mt-4 flex flex-col gap-3">
            <p
              role="status"
              className="ob-rise flex min-h-11 items-center justify-between gap-3 rounded-card border border-border px-4 py-2 type-caption text-muted-foreground"
            >
              <span className="break-keep">{c.done}</span>
              <button
                type="button"
                onClick={() => setView("home")}
                className={cn(
                  "inline-flex h-11 shrink-0 items-center type-caption text-foreground underline underline-offset-4",
                  focusRing,
                )}
              >
                {c.undo}
              </button>
            </p>
            <article className="ob-rise flex flex-col gap-4 rounded-card border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-2">
                  <p className="type-caption text-muted-foreground">
                    {copy.home.spot} <CategoryCaption place={swapped} />
                  </p>
                  <h2 className="type-title break-keep">{swapped.name}</h2>
                </div>
                <CategoryIllustration slug={swapped.category} size={80} />
              </div>
              <p className="type-body-sm text-muted-foreground">
                {copy.home.reason}
              </p>
              <NumberGrid place={swapped} />
            </article>
          </div>
        }
      />
    );
  }

  const items = [
    { key: "closed", icon: DoorClosed, label: c.menu.closed, strong: true },
    { key: "hours", icon: CalendarClock, label: c.menu.hours },
    { key: "favorite", icon: Heart, label: c.menu.favorite },
    { key: "block", icon: Ban, label: c.menu.block },
    { key: "poll", icon: Vote, label: c.menu.poll },
  ] as const;

  return (
    <HomeMock
      state={p.state}
      moreSlot={
        <div className="relative">
          <MoreButton
            pressed={view === "menu"}
            onClick={() => setView(view === "menu" ? "home" : "menu")}
          />
          {view === "menu" ? (
            <ul
              role="menu"
              aria-label={c.menuLabel}
              className="ob-rise absolute top-12 right-0 z-30 w-56 overflow-hidden rounded-card border border-border bg-popover py-1 shadow-sheet"
            >
              {items.map(({ key, icon: Icon, label, ...rest }) => (
                <li key={key} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => key === "closed" && setView("done")}
                    className={cn(
                      "flex min-h-12 w-full items-center gap-3 px-4 text-left type-label hover:bg-muted",
                      "strong" in rest && "border-b border-border",
                      focusRing,
                    )}
                  >
                    <Icon
                      aria-hidden
                      className="size-4 text-muted-foreground"
                      strokeWidth={1.5}
                    />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      }
    />
  );
}
