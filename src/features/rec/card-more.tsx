"use client";
// 오늘(홈) 큰 카드 "상세" 옆 더 보기 버튼 (REC-08, T5.20). 길찾기만 포인트 컬러(하단 줄)이고 나머지 카드 행동은 여기 모은다.
// 홈 첫 로드에는 모양만 같은 버튼이 있고, 메뉴(Base UI Menu, 즐겨찾기 상태 읽기, 서버 액션)는 버튼에 손이나
// 포커스가 닿으면 받기 시작한다(card-menu.tsx). 마우스가 닿으면 같은 자리의 진짜 트리거로 바꾸고, 그 전에 눌렀으면
// (키보드 포함) 받자마자 연다. 메뉴가 닫히면 포커스는 진짜 트리거로 돌아온다.
import { MoreHorizontal } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { focusRing, hitArea44 } from "@/components/ui/interaction";
import { homeCopy } from "@/copy/home";
import { cn } from "@/lib/utils";
import type { CardMenuProps } from "./card-menu";

const loadMenu = () => import("./card-menu");
const CardMenu = lazy(loadMenu);

const trigger = cn(
  "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground data-popup-open:text-foreground",
  hitArea44,
  focusRing,
);

type Props = Omit<CardMenuProps, "label" | "triggerClassName" | "defaultOpen">;

export function CardMore(props: Props) {
  const [stage, setStage] = useState<"idle" | "ready" | "open">("idle");
  const label = homeCopy.today.actions.moreOf(props.card.name);
  const placeholder = (
    <button
      type="button"
      aria-label={label}
      aria-haspopup="menu"
      // 마우스가 닿으면 진짜 트리거로 바꿔 둔다. 포커스는 받기만 한다(바꾸면 버튼이 새로 그려져 포커스를 잃는다)
      // 터치는 pointerenter 직후 click이 와서 바꾸지 않는다(누른 자리의 버튼이 바뀌면 열림이 꼬인다)
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse")
          setStage((s) => (s === "idle" ? "ready" : s));
      }}
      onFocus={() => void loadMenu().catch(() => undefined)}
      onClick={() => setStage("open")}
      className={trigger}
    >
      <MoreHorizontal aria-hidden className="size-4" strokeWidth={1.5} />
    </button>
  );
  if (stage === "idle") return placeholder;
  return (
    <Suspense fallback={placeholder}>
      <CardMenu
        {...props}
        label={label}
        triggerClassName={trigger}
        defaultOpen={stage === "open"}
      />
    </Suspense>
  );
}
