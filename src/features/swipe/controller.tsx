"use client";
// 탭 스와이프 제어기 (T9.14, D-36 시안 A "따라오는 페이지"). app-shell/swipe-main이 첫 화면 뒤 유휴 시간에 받아 붙인다.
//
// 동작
// - 판정은 ./gesture.ts(시안과 같은 규칙, 단위 테스트). 터치와 펜만 받는다(데스크톱 마우스, 트랙패드는 하단 탭).
// - 받지 않는 때: 데스크톱 2단(뷰포트 1024px 이상), 열린 시트와 대화상자(role=dialog)가 있을 때, 가장자리 24px,
//   data-swipe-ignore 안(지도 캔버스, 지도 시트 손잡이, 나 안쪽 탭), 가로로 넘치는 스크롤 줄, 입력칸.
// - 미는 동안: 본문 <main>을 transform(translate3d)으로 옮긴다. 합성 단계에서만 움직여 매 프레임 레이아웃을 다시 하지 않는다
//   (T9.14 처음 구현은 style.left라 폰에서 프레임이 끊겼다). transform은 안쪽 fixed 요소의 기준을 본문으로 바꾸므로
//   오늘 행동 줄([data-slot=bottom-dock])은 transform을 거는 순간 한 번 재서 화면 자리로 되돌려 둔다(pinDock).
//   그 뒤로는 본문과 함께 움직인다. 위치 쓰기는 프레임당 한 번(requestAnimationFrame).
//   비켜난 띠에 옆 탭 아이콘과 이름(세리프), 기준선을 넘기면 "놓으면 옮깁니다"(Peek). 띠는 body에 붙인 화면 전체 면을
//   clip-path로 잘라 보여 준다(폭을 바꾸면 레이아웃이 다시 돈다).
// - 방향이 정해지면 옆 탭을 미리 받는다(router.prefetch).
// - 놓으면: 넘어가면 바로 router.push(탭 href)하고, 본문은 같은 방향으로 빠지며 흐려진다(fast, exit). 새 화면이 그동안
//   그려져도 빠지는 본문 안이라 보이지 않는다. 빠짐이 끝난 뒤 새 화면이 반대쪽 32px, 투명에서 제자리로(base, enter).
//   제자리면 본문이 돌아온다(base, enter). 옮기지 못하면(1.5초 안에 경로가 안 바뀜) 본문을 제자리로 되돌린다.
// - 축소 모드(앱 설정 또는 OS): 따라오지 않고 옆 탭 표시만, 놓으면 바로 옮긴다.
// - 가로로 민 뒤 이어지는 click은 막는다(손가락 밑 카드, 링크가 눌리지 않게).
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { APP_TABS } from "@/components/app-shell/tabs";
import { shellCopy } from "@/copy/shell";
import { useMotionPreference } from "@/lib/motion/preference";
import { cn } from "@/lib/utils";
import {
  canStartAt,
  dragState,
  isIgnoredTarget,
  lockAxis,
  releaseTarget,
  type SwipeDir,
} from "./gesture";

/** 이 폭 이상이면 데스크톱 2단 배치라 받지 않는다(globals.css desktop: 변형, 화면 컨테이너 64rem) */
const DESKTOP_MIN_PX = 1024;
const OUT_MS = 180;
const ENTER_MS = 260;
const NAV_FALLBACK_MS = 1500;
const ENTER_FROM_PX = 32;

type PeekState = { target: number; dir: SwipeDir; armed: boolean };
/** 그릴 때 쓰는 띠 상태. reveal은 상태가 바뀐 순간 보이는 폭(px)이라 띠가 처음 그려지는 프레임부터 맞게 잘린다.
 *  그 뒤 폭은 손가락을 따라 직접 쓴다(peekRef) */
type PeekView = PeekState & { reveal: number };

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

const DOCK = "[data-slot='bottom-dock']";

/**
 * 본문에 transform을 걸기 전에 오늘 행동 줄(fixed)이 화면에서 있던 자리를 재고, transform 기준으로 바뀐 뒤 자리와의 차이만큼
 * translate로 되돌려 둔다. 줄마다 한 번만 잰다(새 화면의 새 줄은 다시 잰다). 재는 동안은 전환을 끈다.
 */
function pinDock(main: HTMLElement) {
  const dock = main.querySelector<HTMLElement>(DOCK);
  if (!dock || dock.dataset.swipePinned !== undefined) return;
  const transform = main.style.transform;
  const transition = main.style.transition;
  main.style.transition = "none";
  main.style.transform = "";
  const before = dock.getBoundingClientRect();
  main.style.transform = "translate3d(0px, 0px, 0px)";
  const after = dock.getBoundingClientRect();
  main.style.transform = transform;
  main.style.transition = transition;
  dock.style.translate = `${before.left - after.left}px ${before.top - after.top}px`;
  dock.dataset.swipePinned = "";
}

/** 인라인 위치 값을 모두 지운다(제자리, 전환 끝) */
function release(main: HTMLElement) {
  main.style.transition = "";
  main.style.transform = "";
  main.style.opacity = "";
  main.style.willChange = "";
  const dock = main.querySelector<HTMLElement>(DOCK);
  if (dock) {
    dock.style.translate = "";
    delete dock.dataset.swipePinned;
  }
}

/** 본문 위치, 투명도, 전환을 한 번에 쓴다. x=0, opacity=1, 전환 없음이면 인라인 값을 지운다 */
function place(
  main: HTMLElement,
  x: number,
  opacity: number,
  transition: string,
) {
  if (x === 0 && opacity === 1 && transition === "") {
    release(main);
    return;
  }
  pinDock(main);
  main.style.willChange = "transform";
  main.style.transition = transition;
  main.style.transform = `translate3d(${x}px, 0px, 0px)`;
  main.style.opacity = opacity === 1 ? "" : String(opacity);
}

/** 옆 탭 띠: 화면 전체 면을 비켜난 폭만큼만 보이게 자른다 */
function peekClip(dir: SwipeDir, width: number): string {
  const hidden = `max(0px, calc(100% - ${Math.max(0, width)}px))`;
  return dir === 1 ? `inset(0 0 0 ${hidden})` : `inset(0 ${hidden} 0 0)`;
}

export function SwipeController({
  mainRef,
  index,
}: {
  mainRef: RefObject<HTMLElement | null>;
  index: number;
}) {
  const router = useRouter();
  const preference = useMotionPreference();
  const [peek, setPeek] = useState<PeekView | null>(null);
  const peekRef = useRef<HTMLDivElement>(null);
  /** 옮기는 중인 방향(새 탭이 그려지면 들어오는 전환에 쓴다) */
  const pending = useRef<SwipeDir | null>(null);
  /** 빠지는 전환이 끝나는 시각(performance.now). 새 화면은 그 뒤에 들어온다 */
  const exitEndsAt = useRef(0);
  const reducedRef = useRef(false);

  useEffect(() => {
    reducedRef.current = preference === "reduce" || prefersReducedMotion();
  }, [preference]);

  // 새 탭 첫 화면이 그려졌다: 반대쪽에서 들어온다
  useEffect(() => {
    const dir = pending.current;
    const main = mainRef.current;
    if (dir === null || !main) return;
    pending.current = null;
    if (reducedRef.current) {
      setPeek(null);
      place(main, 0, 1, "");
      return;
    }
    let raf1 = 0;
    let raf2 = 0;
    let clear = 0;
    const enter = () => {
      setPeek(null);
      place(main, dir === 1 ? ENTER_FROM_PX : -ENTER_FROM_PX, 0, "none");
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() =>
          place(
            main,
            0,
            1,
            `transform ${ENTER_MS}ms var(--lm-ease-enter), opacity ${ENTER_MS}ms var(--lm-ease-enter)`,
          ),
        );
      });
      clear = window.setTimeout(() => place(main, 0, 1, ""), ENTER_MS + 80);
    };
    // 캐시된 화면은 빠지는 도중에 그려진다. 빠짐이 끝난 뒤 들어온다
    const wait = Math.max(0, exitEndsAt.current - performance.now());
    const start = window.setTimeout(enter, wait);
    return () => {
      window.clearTimeout(start);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(clear);
    };
  }, [index, mainRef]);

  useEffect(() => {
    const main = mainRef.current;
    if (!main || index < 0) return;
    const count = APP_TABS.length;
    let track: {
      id: number;
      x0: number;
      y0: number;
      width: number;
      axis: "x" | "y" | null;
      samples: { x: number; t: number }[];
    } | null = null;
    let suppressClick = false;
    let raf = 0;
    let lastPeek: PeekState | null = null;
    let fallback = 0;
    let settle = 0;
    /** 이번 손가락에서 미리 받은 탭 */
    let prefetched = -1;

    const showPeek = (next: PeekState | null, width: number) => {
      if (
        next?.target !== lastPeek?.target ||
        next?.armed !== lastPeek?.armed ||
        next?.dir !== lastPeek?.dir
      ) {
        lastPeek = next;
        setPeek(next ? { ...next, reveal: width } : null);
      }
      if (peekRef.current && next)
        peekRef.current.style.clipPath = peekClip(next.dir, width);
    };

    const velocity = () => {
      const s = track?.samples ?? [];
      const last = s.at(-1);
      if (!last) return 0;
      const from = s.find((p) => last.t - p.t <= 100) ?? last;
      const dt = last.t - from.t;
      return dt > 0 ? (last.x - from.x) / dt : 0;
    };

    function down(e: PointerEvent) {
      suppressClick = false;
      if (track || !e.isPrimary) return;
      if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
      if (window.innerWidth >= DESKTOP_MIN_PX) return;
      if (document.querySelector("[role='dialog']")) return;
      if (!canStartAt(e.clientX, window.innerWidth)) return;
      if (isIgnoredTarget(e.target as Element, main!)) return;
      prefetched = -1;
      track = {
        id: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        width: main!.getBoundingClientRect().width,
        axis: null,
        samples: [{ x: e.clientX, t: e.timeStamp }],
      };
    }

    function move(e: PointerEvent) {
      const t = track;
      if (!t || e.pointerId !== t.id) return;
      const dx = e.clientX - t.x0;
      if (t.axis === null) {
        const axis = lockAxis(dx, e.clientY - t.y0);
        if (axis === null) return;
        if (axis === "y") {
          track = null;
          return;
        }
        t.axis = "x";
        window.clearTimeout(fallback);
        main!.setPointerCapture?.(e.pointerId);
      }
      t.samples.push({ x: e.clientX, t: e.timeStamp });
      if (t.samples.length > 12) t.samples.shift();
      const drag = dragState(dx, index, count, t.width);
      // 방향이 정해지면 옆 탭을 미리 받는다(놓자마자 그릴 수 있게). 같은 손가락에서 탭마다 한 번
      if (drag.target !== null && drag.target !== prefetched) {
        prefetched = drag.target;
        const href = APP_TABS[drag.target]?.href;
        if (href) router.prefetch(href);
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!reducedRef.current) place(main!, drag.offset, 1, "none");
        showPeek(
          drag.target !== null && drag.dir !== null
            ? { target: drag.target, dir: drag.dir, armed: drag.armed }
            : null,
          reducedRef.current
            ? Math.min(Math.abs(dx), t.width * 0.4)
            : Math.abs(drag.offset),
        );
      });
    }

    function end(e: PointerEvent, cancelled: boolean) {
      const t = track;
      if (!t || e.pointerId !== t.id) return;
      track = null;
      if (t.axis !== "x") return;
      cancelAnimationFrame(raf);
      suppressClick = true;
      const dx = e.clientX - t.x0;
      const target = cancelled
        ? null
        : releaseTarget(dx, velocity(), index, count, t.width);
      const tab = target === null ? null : APP_TABS[target];
      if (!tab || target === null) {
        // 제자리
        if (reducedRef.current) place(main!, 0, 1, "");
        else {
          place(main!, 0, 1, `transform ${ENTER_MS}ms var(--lm-ease-enter)`);
          // 돌아온 뒤 인라인 전환 값을 지운다(다음 손가락은 전환 없이 따라와야 한다)
          settle = window.setTimeout(() => {
            if (!track) place(main!, 0, 1, "");
          }, ENTER_MS + 80);
        }
        showPeek(null, 0);
        return;
      }
      const dir: SwipeDir = target > index ? 1 : -1;
      pending.current = dir;
      if (!reducedRef.current) {
        // 빠지면서 흐려진다. 새 화면이 빠지는 도중에 그려져도 보이지 않고, 빠짐이 끝난 뒤 들어온다(index 효과)
        exitEndsAt.current = performance.now() + OUT_MS;
        place(
          main!,
          dir === 1 ? -t.width : t.width,
          0,
          `transform ${OUT_MS}ms var(--lm-ease-exit), opacity ${OUT_MS}ms var(--lm-ease-exit)`,
        );
        const p = peekRef.current;
        if (p && lastPeek) {
          p.style.transition = `clip-path ${OUT_MS}ms var(--lm-ease-exit)`;
          p.style.clipPath = peekClip(lastPeek.dir, t.width);
        }
      }
      // 기다리지 않고 바로 옮긴다(미리 받아 둔 화면이면 빠지는 동안 준비가 끝난다)
      router.push(tab.href);
      // 경로가 바뀌지 않으면(오프라인, 느린 응답) 되돌린다. 바뀌면 이 제어기의 index 효과가 정리한다
      fallback = window.setTimeout(() => {
        if (pending.current === null) return;
        pending.current = null;
        place(
          main!,
          0,
          1,
          `transform ${ENTER_MS}ms var(--lm-ease-enter), opacity ${ENTER_MS}ms var(--lm-ease-enter)`,
        );
        settle = window.setTimeout(() => {
          if (!track) place(main!, 0, 1, "");
        }, ENTER_MS + 80);
        showPeek(null, 0);
      }, NAV_FALLBACK_MS);
    }

    const up = (e: PointerEvent) => end(e, false);
    const cancel = (e: PointerEvent) => end(e, true);
    const click = (e: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      e.preventDefault();
      e.stopPropagation();
    };

    // 받을 준비가 됐다는 표시(E2E가 지연 로드를 기다린다)
    main.dataset.swipeReady = "";
    main.addEventListener("pointerdown", down);
    main.addEventListener("pointermove", move);
    main.addEventListener("pointerup", up);
    main.addEventListener("pointercancel", cancel);
    main.addEventListener("click", click, true);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(fallback);
      window.clearTimeout(settle);
      delete main.dataset.swipeReady;
      main.removeEventListener("pointerdown", down);
      main.removeEventListener("pointermove", move);
      main.removeEventListener("pointerup", up);
      main.removeEventListener("pointercancel", cancel);
      main.removeEventListener("click", click, true);
    };
  }, [index, mainRef, router]);

  if (!peek) return null;
  const tab = APP_TABS[peek.target];
  if (!tab) return null;
  const Icon = tab.Icon;
  // body에 붙인다: 본문 <main>에 transform이 걸리면 안쪽 fixed는 본문을 따라 움직이기 때문이다
  return createPortal(
    <div
      ref={peekRef}
      aria-hidden
      data-slot="swipe-peek"
      style={{ clipPath: peekClip(peek.dir, peek.reveal) }}
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 bottom-[calc(var(--lm-layout-tab-bar-height)+env(safe-area-inset-bottom,0px))] flex flex-col overflow-hidden bg-muted",
        peek.dir === 1 ? "items-end pr-5" : "items-start pl-5",
      )}
    >
      <div
        className={cn(
          "mt-[38svh] flex flex-col gap-2 whitespace-nowrap",
          peek.dir === 1 ? "items-end text-right" : "items-start text-left",
          peek.armed ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <Icon className="size-7" strokeWidth={1.5} />
        <span className="type-heading font-serif">{tab.label}</span>
        {peek.armed ? (
          <span className="type-caption text-muted-foreground">
            {shellCopy.swipeRelease}
          </span>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
