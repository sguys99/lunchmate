"use client";
// 탭 스와이프 제어기 (T9.14, D-36 시안 A "따라오는 페이지"). app-shell/swipe-main이 첫 화면 뒤 유휴 시간에 받아 붙인다.
//
// 동작
// - 판정은 ./gesture.ts(시안과 같은 규칙, 단위 테스트). 터치와 펜만 받는다(데스크톱 마우스, 트랙패드는 하단 탭).
// - 받지 않는 때: 데스크톱 2단(뷰포트 1024px 이상), 열린 시트와 대화상자(role=dialog)가 있을 때, 가장자리 24px,
//   data-swipe-ignore 안(지도 캔버스, 지도 시트 손잡이, 나 안쪽 탭), 가로로 넘치는 스크롤 줄, 입력칸.
// - 미는 동안: 본문 <main>은 style.left로, 오늘 행동 줄([data-slot=bottom-dock])은 같은 거리만큼 style.translate로 옮긴다.
//   (transform을 쓰지 않는 이유는 swipe-main.tsx 머리 주석.) 위치 쓰기는 프레임당 한 번(requestAnimationFrame).
//   비켜난 띠에 옆 탭 아이콘과 이름(세리프), 기준선을 넘기면 "놓으면 옮깁니다"(Peek, fixed). 본문과 겹치지 않는다.
// - 놓으면: 넘어가면 본문이 같은 방향으로 끝까지 빠진 뒤(fast, exit) router.push(탭 href). 새 탭 첫 화면이 그려지면
//   반대쪽 32px, 투명에서 제자리로(base, enter). 제자리면 본문이 돌아온다(base, enter).
//   옮기지 못하면(1.5초 안에 경로가 안 바뀜) 본문을 제자리로 되돌린다.
// - 축소 모드(앱 설정 또는 OS): 따라오지 않고 옆 탭 표시만, 놓으면 바로 옮긴다.
// - 가로로 민 뒤 이어지는 click은 막는다(손가락 밑 카드, 링크가 눌리지 않게).
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type RefObject } from "react";
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

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/** 본문과 행동 줄 위치, 투명도, 전환을 한 번에 쓴다. x=0, opacity=1이면 인라인 값을 지운다 */
function place(
  main: HTMLElement,
  x: number,
  opacity: number,
  transition: string,
) {
  const dock = main.querySelector<HTMLElement>("[data-slot='bottom-dock']");
  main.style.transition = transition;
  main.style.left = x === 0 ? "" : `${x}px`;
  main.style.opacity = opacity === 1 ? "" : String(opacity);
  if (dock) {
    dock.style.transition = transition.replaceAll("left", "translate");
    dock.style.translate = x === 0 ? "" : `${x}px 0`;
  }
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
  const [peek, setPeek] = useState<PeekState | null>(null);
  const peekRef = useRef<HTMLDivElement>(null);
  /** 옮기는 중인 방향(새 탭이 그려지면 들어오는 전환에 쓴다) */
  const pending = useRef<SwipeDir | null>(null);
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
    setPeek(null);
    if (reducedRef.current) {
      place(main, 0, 1, "");
      return;
    }
    place(main, dir === 1 ? ENTER_FROM_PX : -ENTER_FROM_PX, 0, "none");
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() =>
        place(
          main,
          0,
          1,
          `left ${ENTER_MS}ms var(--lm-ease-enter), opacity ${ENTER_MS}ms var(--lm-ease-enter)`,
        ),
      );
    });
    const clear = window.setTimeout(() => place(main, 0, 1, ""), ENTER_MS + 80);
    return () => {
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

    const showPeek = (next: PeekState | null, width: number) => {
      if (
        next?.target !== lastPeek?.target ||
        next?.armed !== lastPeek?.armed ||
        next?.dir !== lastPeek?.dir
      ) {
        lastPeek = next;
        setPeek(next);
      }
      if (peekRef.current) peekRef.current.style.width = `${width}px`;
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
          place(main!, 0, 1, `left ${ENTER_MS}ms var(--lm-ease-enter)`);
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
      if (reducedRef.current) {
        router.push(tab.href);
      } else {
        place(
          main!,
          dir === 1 ? -t.width : t.width,
          1,
          `left ${OUT_MS}ms var(--lm-ease-exit)`,
        );
        if (peekRef.current) {
          peekRef.current.style.transition = `width ${OUT_MS}ms var(--lm-ease-exit)`;
          peekRef.current.style.width = `${t.width}px`;
        }
        window.setTimeout(() => router.push(tab.href), OUT_MS);
      }
      // 경로가 바뀌지 않으면(오프라인, 느린 응답) 되돌린다. 바뀌면 이 제어기의 index 효과가 정리한다
      fallback = window.setTimeout(() => {
        if (pending.current === null) return;
        pending.current = null;
        place(main!, 0, 1, `left ${ENTER_MS}ms var(--lm-ease-enter)`);
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
  return (
    <div
      ref={peekRef}
      aria-hidden
      data-slot="swipe-peek"
      className={cn(
        "pointer-events-none fixed top-0 bottom-[calc(var(--lm-layout-tab-bar-height)+env(safe-area-inset-bottom,0px))] flex flex-col overflow-hidden bg-muted",
        peek.dir === 1 ? "right-0 items-end pr-5" : "left-0 items-start pl-5",
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
    </div>
  );
}
