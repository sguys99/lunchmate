// 오늘(홈) 큰 카드의 메모 배지 (T10.15, D-33 안건 1, 시안 B). today-cards가 React.lazy로 받는다(홈 첫 로드 밖).
// - 카드 배지(웨이팅, 할인)가 2개 미만일 때만 보인다(showMemoBadge). 배지 줄 한 줄 안에서 말줄임, 카드 높이는 배지 줄 하나 그대로.
// - 모양은 공용 Badge neutral과 같다(1px input 선, caption, 높이 24). Badge(Base UI useRender)를 부르지 않고 같은 클래스로 그린다.
// - 스크린 리더: "내 메모" 앞머리 + 글. 전체 글은 title로도 둔다.
import { StickyNote } from "lucide-react";
import { memoCopy } from "@/copy/memo";
import { cn } from "@/lib/utils";

export default function MemoBadge({
  memo,
  className,
}: {
  memo: string;
  className?: string;
}) {
  return (
    <span
      title={memo}
      data-badge="memo"
      className={cn(
        "inline-flex h-6 max-w-full min-w-0 items-center gap-1 overflow-hidden rounded-badge border border-input bg-transparent px-2 type-caption whitespace-nowrap text-foreground",
        className,
      )}
    >
      <StickyNote
        aria-hidden
        className="size-3.5 shrink-0 text-muted-foreground"
        strokeWidth={1.75}
      />
      <span className="sr-only">{memoCopy.label} </span>
      <span className="truncate">{memo}</span>
    </span>
  );
}
