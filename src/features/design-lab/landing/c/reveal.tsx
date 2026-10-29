"use client";
// 화면에 들어올 때 한 번 나타나는 블록 (T3.4, 랜딩 C). Motion 없이 IntersectionObserver + CSS 전환(landing.css .lm-reveal).
// - 서버 렌더와 JS 이전에는 그냥 보인다. 마운트 때 뷰포트 아래에 있을 때만 숨겨 두고(armed), 들어오면 보인다(shown).
//   이미 보이는 블록(첫 장면)은 숨기지 않으므로 LCP가 늦어지지 않는다.
// - 축소 모드는 CSS(prefers-reduced-motion)가 끝 상태로 바로 둔다.
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Reveal({
  children,
  index = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  /** 같은 장면 안 순서. 70ms 간격 */
  index?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) return; // 이미 보이는 블록은 그대로
    el.dataset.reveal = "armed";
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset.reveal = "shown";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      // 세 태그 모두 HTMLElement라 ref 타입을 넓혀 넘긴다
      ref={ref as React.Ref<never>}
      className={cn("lm-reveal", className)}
      style={{ "--lm-reveal-i": index } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
