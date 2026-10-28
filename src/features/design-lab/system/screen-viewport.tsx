// 시안 화면을 담는 상자 (T1.14). 상자 바깥은 시안과 무관한 중립 스타일(전역 tokens.css)이다.
// - frame: 390x844 폰 프레임(pnpm shots 모바일 뷰포트와 같은 크기). full: 부모를 꽉 채우는 상자(1280 2단 확인용).
// - 두 경우 모두 transform을 걸어 안쪽 `position: fixed` 요소(시트 배경, 탭 바)가 상자 기준으로 붙게 한다.
// - 스크롤은 상자 안 DesignScope가 맡는다(overflow-y-auto). 하단 탭은 sticky bottom-0으로 붙인다.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ScreenView } from "./types";

export function ScreenViewport({
  view,
  children,
}: {
  view: ScreenView;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 [transform:translateZ(0)] overflow-hidden",
        view === "frame"
          ? "h-[844px] w-[390px] rounded-[2.5rem] border border-border shadow-lg"
          : "h-full w-full",
      )}
    >
      {children}
    </div>
  );
}
