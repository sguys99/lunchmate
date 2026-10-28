// shadcn Skeleton, DESIGN.md "느린 호흡" 스켈레톤으로 재스타일 (T2.5).
// skeleton 면 위에 skeleton-highlight 막(::after)을 1.6초씩 왕복(3.2초 주기)으로 겹친다. 쉬머 대신 호흡.
// 모든 막대가 같은 박자라 한 개의 효과로 읽힌다(홈 첫 화면 동시 효과 수 규칙). reduced motion이면 정지.
// 키프레임은 globals.css의 --animate-skeleton-breathe. Motion 없이 CSS만 쓴다(홈 번들 0).
//
// 장식이라 기본 aria-hidden. 로딩 안내는 감싸는 영역이 aria-busy와 commonCopy.states.loading.label로 한다.
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-sm bg-skeleton",
        "after:absolute after:inset-0 after:animate-skeleton-breathe after:bg-skeleton-highlight after:opacity-0 motion-reduce:after:animate-none",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
