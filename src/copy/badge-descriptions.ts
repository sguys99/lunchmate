// 배지 툴팁 설명 (T2.9, T5.17). place-badge-tooltip.tsx(지연 청크)만 부른다.
// badges.ts에서 나눈 까닭: 홈 카드 배지는 툴팁이 없으므로 설명 문장이 홈 첫 로드에 실릴 필요가 없다(bundle-log 11/01).
// 상태 안내라 습니다체. DEAL-02 고지는 제보와 할인 배지가 같은 문장을 쓴다.
import type { PlaceBadgeKind } from "@/components/badges/pick-badges";

const reportNotice = "사용자가 제보한 정보라 실제와 다를 수 있습니다.";

export const badgeDescriptions = {
  estimate: "제보된 가격이 없어 같은 종류 식당 기준으로 추정했습니다.",
  report: reportNotice,
  deal: reportNotice,
  waiting: "최근 30분 안에 들어온 제보만 보여 줍니다.",
  closedToday:
    "이번 끼니에 가 보니 문이 닫혀 있었다는 제보입니다. 끼니가 바뀌면 사라집니다.",
  avoidWarning:
    "참여자 중 이 식당 음식을 피하는 분이 있지만, 누구인지는 알리지 않습니다.",
} as const satisfies Record<PlaceBadgeKind, string>;
