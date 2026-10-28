// 공통 컴포넌트가 함께 쓰는 상호작용 클래스 (T2.5). 값은 모두 토큰(tokens.css, globals.css 테마)에서 온다.
// DESIGN.md 5장: 포커스는 2px ring + 바깥 2px 간격, 눌림은 scale 0.98(fast, standard), reduced motion이면 즉시 변화.
// cn(tailwind-merge)을 쓰지 않는다: 오류 화면처럼 첫 로드가 가벼워야 하는 곳도 이 상수를 쓴다 (T2.22).

/** 키보드 포커스 링. box-shadow가 아니라 outline이라 그림자 규칙(1px 선과 면 톤)과 겹치지 않는다. */
export const focusRing =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * 보이는 크기보다 넓은 터치 영역. 가운데 정렬된 투명 의사 요소가 최소 44px(기본) 정사각을 덮는다.
 * 부모에 overflow-hidden을 주면 잘리므로 쓰지 않는다.
 */
export const hitArea44 =
  "relative before:absolute before:top-1/2 before:left-1/2 before:h-[max(100%,2.75rem)] before:w-[max(100%,2.75rem)] before:-translate-x-1/2 before:-translate-y-1/2";

/** 칩처럼 세로 48px 터치가 필요한 요소 (DESIGN.md 칩: 높이 40, 터치 48) */
export const hitArea48 =
  "relative before:absolute before:top-1/2 before:left-1/2 before:h-[max(100%,3rem)] before:w-[max(100%,2.75rem)] before:-translate-x-1/2 before:-translate-y-1/2";

/** 색 전환과 눌림 축소. 움직임 길이와 곡선은 토큰 변수 */
export const pressMotion = [
  "transition-[background-color,border-color,color,box-shadow,filter,scale] duration-(--lm-duration-fast) ease-standard",
  "active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
].join(" ");
