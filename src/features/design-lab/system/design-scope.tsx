"use client";
// 화면 범위 래퍼 (T1.14). 토큰은 루트 tokens.css(:root, 확정 DESIGN.md 생성물)를 그대로 쓴다(T1.20).
// - G1 확정 전에는 data-design으로 시안 토큰을 걸었지만, 확정 후에는 시안별 CSS 변수를 만들지 않는다.
// - 테마 강제는 이 요소가 아니라 <html>의 .light/.dark 클래스로 한다(useRootTheme). tokens.css가 그 선택자만 안다.
// - @container/screen: desktop: 변형(globals.css)이 이 요소 폭 1024px 이상에서 켜진다.
// - 포털(바텀시트, 토스트)은 useDesignPortalContainer()가 주는 이 요소로 보낸다. 390 프레임 안에 시트를 가두기 위해서다.
// - Motion: LazyMotion(domAnimation, strict) + MotionConfig(reducedMotion "user")를 함께 건다.
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { DesignMotionProvider } from "./motion";
import type { DesignTheme } from "./types";

const PortalContainerContext = createContext<HTMLElement | null>(null);

/** 시안 범위 요소. Drawer.Portal container 등에 넘긴다. 첫 렌더에서는 null. */
export function useDesignPortalContainer(): HTMLElement | null {
  return useContext(PortalContainerContext);
}

/**
 * 페이지 전체 테마 강제. light/dark면 <html>에 같은 이름의 클래스를 붙이고, system이면 둘 다 뗀다.
 * tokens.css(.dark, 시스템 다크는 :root:not(.light):not(.dark))와 globals.css의 dark: 변형이 함께 따른다.
 * 언마운트 시 원래대로 되돌린다.
 */
export function useRootTheme(theme: DesignTheme) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme === "dark");
    return () => {
      root.classList.remove("light", "dark");
    };
  }, [theme]);
}

export function DesignScope({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  return (
    <div
      ref={setContainer}
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
