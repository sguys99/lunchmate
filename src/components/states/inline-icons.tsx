// 루트 오류, 404 화면용 인라인 선 아이콘 (T2.22).
// lucide-react의 Icon은 클라이언트 컴포넌트라 서버에서 그려도 런타임이 첫 로드에 들어간다. 루트 경계(error, global-error,
// not-found)는 모든 라우트 첫 로드에 들어가므로 같은 선을 SVG로 옮겨 그린다. 경로는 Lucide v1.62.0(ISC)와 같고,
// 속성은 Lucide 기본값(24 상자, currentColor, round 끝과 이음)과 같다. 다른 화면은 lucide-react를 그대로 쓴다.
import type { ReactNode } from "react";

type InlineIconProps = { className?: string; strokeWidth?: number };

function LineIcon({
  className,
  strokeWidth = 2,
  children,
}: InlineIconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

/** Lucide cloud-off. 오류 상태 기본 아이콘 */
export function CloudOffIcon(props: InlineIconProps) {
  return (
    <LineIcon {...props}>
      <path d="M10.94 5.274A7 7 0 0 1 15.71 10h1.79a4.5 4.5 0 0 1 4.222 6.057" />
      <path d="M18.796 18.81A4.5 4.5 0 0 1 17.5 19H9A7 7 0 0 1 5.79 5.78" />
      <path d="m2 2 20 20" />
    </LineIcon>
  );
}

/** Lucide utensils. 빈 상태와 찾을 수 없음 기본 아이콘 */
export function UtensilsIcon(props: InlineIconProps) {
  return (
    <LineIcon {...props}>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </LineIcon>
  );
}
