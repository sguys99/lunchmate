// 카드당 배지 최대 2개(DESIGN.md 5장 "배지", PRD REC-06)를 지키는 우선순위 헬퍼 (T2.9).
// React 의존 없는 순수 함수. 최종 우선순위 규칙은 T3.2(카드 정보 위계 실험)에서 확정하고,
// 그 전까지 아래 기본안을 쓴다. 바꿀 때는 BADGE_PRIORITY 한 곳만 고친다.

/** PLACE-07 웨이팅 3단계. 이름은 badgeCopy.waitingLevels 키와 같다 */
export type WaitingLevel = "walkIn" | "short" | "long";

export type PlaceBadge =
  | { kind: "avoidWarning" }
  | { kind: "waiting"; level: WaitingLevel; minutesAgo?: number }
  | { kind: "estimate" }
  | { kind: "deal" }
  | { kind: "report" };

export type PlaceBadgeKind = PlaceBadge["kind"];

/** 우선순위 키. 웨이팅은 단계마다 무게가 달라 단계별로 나눈다 */
type PriorityKey =
  Exclude<PlaceBadgeKind, "waiting"> | `waiting:${WaitingLevel}`;

/**
 * 작을수록 먼저 남는다. 기준은 "이 배지가 빠지면 결정이 실패할 위험"이 큰 순서다.
 * 1. avoidWarning: POLL-13. 같이 먹는 사람이 못 먹는 곳은 투표 실패 비용이 가장 크다.
 * 2. waiting:long: PLACE-07/08. 지금 가면 줄을 서야 하고 30분만 유효한 시간 민감 정보다.
 * 3. estimate: PLACE-02, REC-06. 카드의 가격 숫자가 추정이라는 표시라 빠지면 추정값을 사실로 읽는다.
 * 4. waiting:short: PLACE-07. 조금 기다리는 정도라 결정에 미치는 영향이 줄 길어요보다 작다.
 * 5. deal: DEAL-02. 표시만 하는 정보이고 제품 원칙 6(추천과 광고 분리)에 따라 결정 근거 배지보다 뒤에 둔다.
 * 6. waiting:walkIn: 좋은 소식이지만 없어도 실패하지 않는다.
 * 7. report: 출처 표시. 카드에서는 가장 뒤, 상세의 할인 목록에서는 출처 배지로 항상 함께 둔다(DEAL-02).
 */
export const BADGE_PRIORITY: readonly PriorityKey[] = [
  "avoidWarning",
  "waiting:long",
  "estimate",
  "waiting:short",
  "deal",
  "waiting:walkIn",
  "report",
];

export const MAX_CARD_BADGES = 2;

function priorityOf(badge: PlaceBadge): number {
  const key: PriorityKey =
    badge.kind === "waiting" ? `waiting:${badge.level}` : badge.kind;
  return BADGE_PRIORITY.indexOf(key);
}

/**
 * 후보 배지에서 우선순위가 높은 순서로 최대 `max`개를 고른다.
 * 같은 kind가 여러 번 들어오면 우선순위가 높은 하나만 남긴다(예: 웨이팅 제보 두 건이면 더 긴 쪽).
 * 입력 배열은 바꾸지 않는다.
 */
export function pickBadges(
  list: readonly PlaceBadge[],
  max: number = MAX_CARD_BADGES,
): PlaceBadge[] {
  if (max <= 0) return [];
  const sorted = list
    .map((badge, index) => ({ badge, index, rank: priorityOf(badge) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index);
  const seen = new Set<PlaceBadgeKind>();
  const picked: PlaceBadge[] = [];
  for (const { badge } of sorted) {
    if (seen.has(badge.kind)) continue;
    seen.add(badge.kind);
    picked.push(badge);
    if (picked.length === max) break;
  }
  return picked;
}
