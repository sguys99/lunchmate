"use client";
// 앱 본문 칸 <main> + 탭 스와이프 연결 (T9.14, D-36 시안 A "따라오는 페이지").
//
// - 첫 로드(홈 예산 201 KB)에는 이 껍데기만 들어간다. 판정과 포인터 처리(features/swipe/controller)는
//   탭 첫 화면(/today, /map, /poll, /me)에서 첫 화면이 뜬 직후(유휴 시간, 늦어도 0.5초) 받는다. 받기 전에 닿은 손가락은 무시된다.
// - 미는 동안 본문은 controller가 transform(translate3d)으로 옮긴다. 안쪽 fixed인 오늘 행동 줄은 controller가
//   transform을 거는 순간 화면 자리로 되돌려 둔다(pinDock). 손을 떼고 제자리면 인라인 값을 모두 지운다.
//   본문에 z-index를 주지 않는다(안쪽 전체 화면 오버레이가 하단 탭 아래로 깔리지 않게).
// - touch-action: pan-y. 세로 스크롤은 늘 브라우저가 하고, 가로 이동만 포인터 이벤트로 받는다.
//   가로 스크롤 줄(칩)은 그 줄이 스크롤 컨테이너라 이 값의 영향을 받지 않는다.
// - 데스크톱 2단(1024px 이상)에서는 controller가 손가락을 받지 않는다.
import { usePathname } from "next/navigation";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type RefObject,
} from "react";
import { rootTabIndex } from "./tabs";

type ControllerProps = {
  mainRef: RefObject<HTMLElement | null>;
  index: number;
};

export function SwipeMain({ children }: { children: ReactNode }) {
  const mainRef = useRef<HTMLElement>(null);
  return (
    <main
      ref={mainRef}
      data-slot="swipe-main"
      className="relative flex min-w-0 flex-1 touch-pan-y flex-col"
    >
      {children}
      {/* 경로(usePathname)는 요청 시점 값이라 Suspense 안에서만 읽는다(cacheComponents 사전 렌더링) */}
      <Suspense fallback={null}>
        <SwipeLoader mainRef={mainRef} />
      </Suspense>
    </main>
  );
}

/** 탭 첫 화면이면 제어기를 유휴 시간에 받아 붙인다 */
function SwipeLoader({ mainRef }: { mainRef: RefObject<HTMLElement | null> }) {
  const pathname = usePathname();
  const index = rootTabIndex(pathname);
  const [Controller, setController] =
    useState<ComponentType<ControllerProps> | null>(null);

  useEffect(() => {
    if (index === null || Controller) return;
    let cancelled = false;
    const load = () => {
      void import("@/features/swipe/controller")
        .then((m) => {
          if (!cancelled) setController(() => m.SwipeController);
        })
        .catch(() => {});
    };
    // iOS Safari는 requestIdleCallback이 없을 수 있다
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(load, { timeout: 500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }
    const id = globalThis.setTimeout(load, 300);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(id);
    };
  }, [index, Controller]);

  return Controller ? (
    <Controller mainRef={mainRef} index={index ?? -1} />
  ) : null;
}
