// 탭 스와이프 순수 규칙 (T9.14). 세 시안이 같은 판정을 쓰고, 보이는 모양만 다르다. 고른 뒤 구현도 이 규칙을 옮겨 쓴다.
//
// - 시작: iOS Safari는 화면 좌우 가장자리 스와이프가 "뒤로 가기"다. 화면(뷰포트) 가장자리 EDGE_GUARD_PX 안에서 시작한 손가락은 받지 않는다.
// - 방향 잠금: 처음 SLOP_PX를 움직일 때까지 기다렸다가, 가로 이동이 세로의 AXIS_RATIO배를 넘으면 가로(탭 이동),
//   아니면 세로(브라우저 스크롤에 맡기고 이 손가락은 버린다). 컨테이너는 touch-action: pan-y라 세로 스크롤은 브라우저가 한다.
// - 넘어가기: 기준선(폭의 COMMIT_RATIO) 이상 밀었거나, 빠르게 튕겼을 때(속도 FLICK_VELOCITY px/ms 이상, 거리 FLICK_MIN_PX 이상).
//   튕긴 방향과 민 방향이 같아야 한다(밀었다가 되돌리며 놓으면 제자리).
// - 양 끝: 첫 탭(오늘)에서 오른쪽, 마지막 탭(나)에서 왼쪽으로 밀면 옆 탭이 없다. 1/4만 따라오고 RUBBER_MAX_PX에서 멈춘다.
// - 방향: 손가락을 왼쪽으로(dx < 0) 밀면 다음 탭(+1), 오른쪽으로(dx > 0) 밀면 이전 탭(-1). 하단 탭 순서와 같다.

export const EDGE_GUARD_PX = 24;
export const SLOP_PX = 10;
export const AXIS_RATIO = 1.5;
export const COMMIT_RATIO = 0.3;
export const FLICK_VELOCITY = 0.5;
export const FLICK_MIN_PX = 40;
export const RUBBER_FACTOR = 0.25;
export const RUBBER_MAX_PX = 48;

export type SwipeDir = 1 | -1;

/** 뷰포트 x 좌표에서 시작해도 되는가(가장자리 뒤로 가기 자리 제외) */
export function canStartAt(
  clientX: number,
  viewportWidth: number,
  guard = EDGE_GUARD_PX,
): boolean {
  return clientX >= guard && clientX <= viewportWidth - guard;
}

/** 방향 잠금. 아직 모르면 null */
export function lockAxis(dx: number, dy: number): "x" | "y" | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < SLOP_PX && ay < SLOP_PX) return null;
  return ax > ay * AXIS_RATIO ? "x" : "y";
}

/** 민 거리의 방향. 0이면 null */
export function dirOf(dx: number): SwipeDir | null {
  if (dx < 0) return 1;
  if (dx > 0) return -1;
  return null;
}

/** 옆 탭 순번. 없으면 null */
export function neighborIndex(
  index: number,
  dir: SwipeDir,
  count: number,
): number | null {
  const next = index + dir;
  return next >= 0 && next < count ? next : null;
}

/** 화면에 보일 이동량. 옆 탭이 없으면 고무줄처럼 버틴다 */
export function resist(dx: number, hasNeighbor: boolean): number {
  if (hasNeighbor) return dx;
  const v = Math.min(Math.abs(dx) * RUBBER_FACTOR, RUBBER_MAX_PX);
  return Math.sign(dx) * v;
}

/** 기준선까지 얼마나 왔는지(0~1) */
export function progressOf(dx: number, width: number): number {
  if (width <= 0) return 0;
  return Math.min(1, Math.abs(dx) / (width * COMMIT_RATIO));
}

export type SwipeDrag = {
  /** 화면에 보일 이동량(px, 고무줄 반영) */
  readonly offset: number;
  readonly dir: SwipeDir | null;
  /** 옆 탭 순번. 없으면 null(양 끝) */
  readonly target: number | null;
  /** 기준선까지 0~1. 양 끝이면 0 */
  readonly progress: number;
  /** 지금 놓으면 옮기는가(거리 기준. 튕김은 놓을 때 따로 본다) */
  readonly armed: boolean;
};

/** 민 거리(dx)로 화면 상태를 만든다 */
export function dragState(
  dx: number,
  index: number,
  count: number,
  width: number,
): SwipeDrag {
  const dir = dirOf(dx);
  const target = dir === null ? null : neighborIndex(index, dir, count);
  const progress = target === null ? 0 : progressOf(dx, width);
  return {
    offset: resist(dx, target !== null),
    dir,
    target,
    progress,
    armed: target !== null && progress >= 1,
  };
}

/** 손을 뗐을 때 옮길 탭. 제자리면 null */
export function releaseTarget(
  dx: number,
  velocity: number,
  index: number,
  count: number,
  width: number,
): number | null {
  const dir = dirOf(dx);
  if (dir === null) return null;
  const target = neighborIndex(index, dir, count);
  if (target === null) return null;
  const far = Math.abs(dx) >= width * COMMIT_RATIO;
  const flick =
    Math.abs(velocity) >= FLICK_VELOCITY &&
    Math.abs(dx) >= FLICK_MIN_PX &&
    Math.sign(velocity) === Math.sign(dx);
  return far || flick ? target : null;
}

/** 이 요소 안에서 시작한 손가락은 받지 않는다(지도 캔버스, 가로 스크롤 칩 줄, 안쪽 탭, 입력칸 등) */
export const SWIPE_IGNORE_SELECTOR =
  "[data-swipe-ignore], input, textarea, select, [contenteditable='true'], [role='slider']";

/** 시작 요소부터 컨테이너까지 올라가며 제외 요소나 가로로 스크롤되는 요소가 있는지 본다 */
export function isIgnoredTarget(
  target: Element | null,
  container: Element,
): boolean {
  if (!target) return true;
  if (target.closest(SWIPE_IGNORE_SELECTOR)) return true;
  let el: Element | null = target;
  while (el && el !== container) {
    if (el instanceof HTMLElement && el.scrollWidth > el.clientWidth + 1) {
      const overflowX = getComputedStyle(el).overflowX;
      if (overflowX === "auto" || overflowX === "scroll") return true;
    }
    el = el.parentElement;
  }
  return false;
}
