// 시안 B 선화 일러스트 공통 틀 (T1.5).
// - viewBox 96, 선 1.4 균일, round cap/join, 채우기 없음.
// - 모든 그림에 같은 자리(왼쪽 위로 비켜 난 원)의 옅은 색면 한 조각을 깐다. "물가의 돌" 같은 이 원이 12종을 한 가족으로 묶는다.
// - 색은 CSS 변수만 쓴다: 선은 var(--cat-<slug>-ink), 색면은 var(--cat-<slug>-surface). 하드코딩 색 금지.
import type { CategorySlug } from "@/features/place/categories";

export const STROKE_WIDTH = 1.4;

export function Frame({
  category,
  className,
  children,
}: {
  category: CategorySlug;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 96 96"
      className={className}
      aria-hidden="true"
      focusable="false"
      style={{ color: `var(--cat-${category}-ink)` }}
    >
      <circle cx="40" cy="42" r="25" fill={`var(--cat-${category}-surface)`} />
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
    </svg>
  );
}
