// 가격 옆 "추정" 표시 (PLACE-02, T3.2 규칙, G3 calm 확정 design-decisions D-05).
// 추정은 배지 줄(최대 2칸)에 오지 않고 가격 칸 라벨("1인") 옆에 테두리 없는 caption 글자 하나로 붙는다.
// 색은 muted-foreground(라벨과 한 덩어리로 "1인 추정"). 스크린 리더는 "추정 가격"으로 읽는다.
// Tooltip을 쓰지 않아 홈 첫 로드에 무게를 더하지 않는다(place-badges.tsx와 따로 둔 이유).
import { badgeCopy } from "@/copy/badges";
import { cn } from "@/lib/utils";

export function EstimateMark({ className }: { className?: string }) {
  return (
    <span
      data-estimate-mark=""
      className={cn(
        "type-caption whitespace-nowrap text-muted-foreground",
        className,
      )}
    >
      <span aria-hidden>{badgeCopy.labels.estimate}</span>
      <span className="sr-only">{badgeCopy.ariaLabels.estimate}</span>
    </span>
  );
}
