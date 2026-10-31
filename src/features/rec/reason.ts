// 추천 이유 문장 다듬기 (G3 안건 6, design-decisions D-05, D-06). 카드에는 도보 칸이 따로 있어 이유 문장의 "도보 약 N분"이 겹친다.
// 그래서 이유 문장 앞의 도보 분을 뺀다. 홈 D1 카드와 결과 카드, 랜딩 B 데모 카드가 함께 쓰고,
// 실제 추천 이유 생성(T5.10)에서도 같은 규칙을 쓸 수 있게 React 의존 없는 순수 함수로 둔다.
// 이유는 "도보 약 4분, 지난주 👍한 국밥" 또는 기여도 순서에 따라 "새로 찾은 곳, 도보 약 5분" 꼴이라(T5.10 src/lib/reco/explain.ts)
// 앞이나 끝의 도보 조각을 지운다. 도보 말고 남는 말이 없으면 원문을 그대로 둔다.

const WALK_LEAD = /^도보 약 \d+분\s*,\s*/;
const WALK_TAIL = /\s*,\s*도보 약 \d+분$/;

export function reasonWithoutWalk(reason: string): string {
  const rest = reason.replace(WALK_LEAD, "").replace(WALK_TAIL, "").trim();
  return rest.length > 0 ? rest : reason;
}
