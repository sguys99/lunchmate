"use client";
// 시안 범위 래퍼 (T1.14). data-design으로 시안 토큰을, data-theme으로 테마 강제를 건다.
// - 같은 요소에 data-design과 data-theme을 함께 붙인다(FORMAT.md 3.2, design-candidates.css 선택자 규칙).
// - @container/screen: desktop: 변형(globals.css)이 이 요소 폭 1024px 이상에서 켜진다.
// - 포털(바텀시트, 토스트)은 useDesignPortalContainer()가 주는 이 요소로 보낸다. body로 보내면 토큰 범위를 벗어난다.
// - Motion: LazyMotion(domAnimation, strict) + MotionConfig(reducedMotion "user")를 함께 건다.
import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DesignMotionProvider } from "./motion";
import type { DesignId, DesignTheme } from "./types";

const PortalContainerContext = createContext<HTMLElement | null>(null);

/** 시안 범위 요소. Drawer.Portal container 등에 넘긴다. 첫 렌더에서는 null. */
export function useDesignPortalContainer(): HTMLElement | null {
  return useContext(PortalContainerContext);
}

export function DesignScope({
  design,
  theme = "system",
  className,
  children,
}: {
  design: DesignId;
  /** system이면 data-theme을 붙이지 않는다(prefers-color-scheme을 따름) */
  theme?: DesignTheme;
  className?: string;
  children: ReactNode;
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  return (
    <div
      ref={setContainer}
      data-design={design}
      data-theme={theme === "system" ? undefined : theme}
      className={cn(
        "@container/screen relative isolate flex flex-col bg-background type-body font-sans text-foreground",
        className,
      )}
    >
      <PortalContainerContext value={container}>
        <DesignMotionProvider>{children}</DesignMotionProvider>
      </PortalContainerContext>
    </div>
  );
}
