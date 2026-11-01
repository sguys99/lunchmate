// Lucide wifi-off 인라인 선 아이콘 (T8.3). 오프라인 기본 화면(/offline)과 오늘 "연결 전 결과" 줄이 쓴다.
// inline-icons.tsx는 루트 오류 경계를 거쳐 모든 라우트 첫 로드에 들어가므로 따로 둔다.
// 경로와 속성은 Lucide v1.62.0(ISC) 기본값과 같다(24 상자, currentColor, round 끝과 이음).
export function WifiOffIcon({
  className,
  strokeWidth = 2,
}: {
  className?: string;
  strokeWidth?: number;
}) {
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
      <path d="M12 20h.01" />
      <path d="M8.5 16.429a5 5 0 0 1 7 0" />
      <path d="M5 12.859a10 10 0 0 1 5.17-2.69" />
      <path d="M19 12.859a10 10 0 0 0-2.007-1.523" />
      <path d="M2 8.82a15 15 0 0 1 4.177-2.643" />
      <path d="M22 8.82a15 15 0 0 0-11.288-3.764" />
      <path d="m2 2 20 20" />
    </svg>
  );
}
