// 카드당 배지 최대 2개(DESIGN.md 5장 "배지", PRD REC-06)를 지키는 우선순위 헬퍼 (T2.9, 규칙 확정 T3.2).
// React 의존 없는 순수 함수. 규칙의 근거와 시안 비교는 docs/design/g3-card-rules.md.
// 바꿀 때는 BADGE_PRIORITY와 INLINE_BADGE_KINDS 두 곳만 고친다.

/** PLACE-07 웨이팅 3단계. 이름은 badgeCopy.waitingLevels 키와 같다 */
export type WaitingLevel = "walkIn" | "short" | "long";

export type PlaceBadge =
  | { kind: "avoidWarning" }
  | { kind: "waiting"; level: WaitingLevel; minutesAgo?: number }
  | { kind: "estimate" }
  | { kind: "deal" }
  | { kind: "report" };

export type PlaceBadgeKind = PlaceBadge["kind"];

/**
 * 배지 줄에 오지 않고 숫자 옆에 붙는 종류 (T3.2).
 * "추정"은 가격 숫자 하나를 설명하는 표시라 가격 칸("1인" 라벨 옆)에 붙인다(PRD REC-06 "가격대(제보/추정 배지)").
 * 배지 줄 2칸은 식당 전체의 지금 상태(기피, 웨이팅, 할인)에 쓴다.
 */
export const INLINE_BADGE_KINDS: ReadonlySet<PlaceBadgeKind> = new Set([
  "estimate",
]);

/** 우선순위 키. 웨이팅은 단계마다 무게가 달라 단계별로 나눈다 */
type PriorityKey =
  Exclude<PlaceBadgeKind, "waiting" | "estimate"> | `waiting:${WaitingLevel}`;

/**
 * 배지 줄의 우선순위. 작을수록 먼저 남는다. 규칙은 "기피 > 웨이팅 > 할인 > 제보".
 * 기준은 (1) 빠지면 결정이 실패할 위험, (2) 정보가 유효한 시간이 짧은 순서다.
 * 1. avoidWarning: POLL-13. 같이 먹는 사람이 못 먹는 곳은 투표 실패 비용이 가장 크다.
 * 2~4. waiting: PLACE-07/08. 30분만 유효하고 "지금 가도 되나"에 바로 답한다. 단계는 줄 길어요 > 조금 기다려요 > 바로 입장.
 *      바로 입장도 할인보다 앞이다. 할인은 종료일까지 며칠 남아 있고 상세에서도 보이지만 웨이팅은 30분 뒤 사라진다.
 * 5. deal: DEAL-02. 표시만 하는 정보이고 제품 원칙 6(추천과 광고 분리)에 따라 결정 근거 배지보다 뒤에 둔다.
 * 6. report: 출처 표시. 카드에서는 가장 뒤, 상세의 할인 목록에서는 출처 배지로 항상 함께 둔다(DEAL-02).
 * estimate는 이 표에 없다. INLINE_BADGE_KINDS라 배지 줄 대신 가격 옆에 붙는다.
 */
export const BADGE_PRIORITY: readonly PriorityKey[] = [
  "avoidWarning",
  "waiting:long",
  "waiting:short",
  "waiting:walkIn",
  "deal",
  "report",
];

export const MAX_CARD_BADGES = 2;

function priorityOf(badge: Exclude<PlaceBadge, { kind: "estimate" }>): number {
  const key: PriorityKey =
    badge.kind === "waiting" ? `waiting:${badge.level}` : badge.kind;
  return BADGE_PRIORITY.indexOf(key);
}

function isSlotBadge(
  badge: PlaceBadge,
): badge is Exclude<PlaceBadge, { kind: "estimate" }> {
  return !INLINE_BADGE_KINDS.has(badge.kind);
}

/** 후보에 숫자 옆 표시(추정)가 있는지. 가격 칸이 "추정"을 붙일지 정할 때 쓴다 */
export function hasInlineBadge(
  list: readonly PlaceBadge[],
  kind: PlaceBadgeKind,
): boolean {
  return INLINE_BADGE_KINDS.has(kind) && list.some((b) => b.kind === kind);
}

/**
 * 후보 배지에서 배지 줄에 올릴 것을 우선순위 순서로 최대 `max`개 고른다.
 * - 숫자 옆에 붙는 종류(추정)는 고르지 않는다.
 * - 같은 kind가 여러 번 들어오면 우선순위가 높은 하나만 남긴다(예: 웨이팅 제보 두 건이면 더 긴 쪽).
 * - 우선순위가 같으면 들어온 순서를 지킨다. 입력 배열은 바꾸지 않는다.
 */
export function pickBadges(
  list: readonly PlaceBadge[],
  max: number = MAX_CARD_BADGES,
): PlaceBadge[] {
  if (max <= 0) return [];
  const sorted = list
    .filter(isSlotBadge)
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
