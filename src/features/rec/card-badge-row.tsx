// 오늘(홈) 카드 배지 줄 본체 (T5.17, T10.15). card-bits의 CardBadges가 React.lazy로 받는다(홈 첫 로드 밖).
// - 카드 배지: 공용 PlaceBadges(calm, 최대 2개, 툴팁 없음).
// - 내 메모 배지(T10.15, D-33 안건 1): 부르는 쪽이 카드 배지 2개 미만일 때만 memo를 넘긴다. 줄은 한 줄이고 메모가 남은 폭에서
//   말줄임이라 카드 높이가 배지 줄 하나보다 커지지 않는다(D-25 한 화면 압축).
import { PlaceBadges } from "@/components/badges/place-badges";
import type { PlaceBadge } from "@/components/badges/pick-badges";
import MemoBadge from "@/features/memo/memo-badge";
import { cn } from "@/lib/utils";

export default function CardBadgeRow({
  badges,
  memo,
  className,
}: {
  badges: readonly PlaceBadge[];
  memo?: string;
  className?: string;
}) {
  if (!memo) return <PlaceBadges badges={badges} className={className} />;
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      {badges.length > 0 ? (
        <PlaceBadges badges={badges} className="shrink-0 flex-nowrap" />
      ) : null}
      <MemoBadge memo={memo} />
    </div>
  );
}
