"use client";
// 오늘(홈) 오프라인 "연결 전 결과" 한 줄 (T8.3, PRD APP-02). 탭이 열린 채 연결이 끊겨 세션 메모리의 카드를 그대로 보여 줄 때.
// 지도 목록의 오프라인 줄(map-screen)과 같은 문법(작은 wifi-off 선 아이콘 + caption). 연결되면 쿼리가 다시 부르고 줄은 사라진다.
// 홈 첫 로드 JS 예산(CLAUDE.md 9장) 때문에 따로 떼어 React.lazy로 부른다. 연결이 끊긴 뒤에는 청크를 받을 수 없으므로
// 카드가 뜬 뒤 온라인일 때 미리 받아 둔다(today-screen.tsx의 preloadStaleNote).
import { WifiOffIcon } from "@/components/states/wifi-off-icon";
import { offlineCopy } from "@/copy/offline";

export default function StaleNote({ className }: { className?: string }) {
  return (
    <p
      role="status"
      className={`flex items-center gap-1.5 type-caption text-muted-foreground${className ? ` ${className}` : ""}`}
    >
      <WifiOffIcon className="size-3.5 shrink-0" strokeWidth={1.5} />
      {offlineCopy.todayStale}
    </p>
  );
}
