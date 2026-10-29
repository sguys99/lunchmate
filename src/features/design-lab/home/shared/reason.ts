// 추천 이유 문장 다듬기 (G3 안건 6, D1~D3). 큰 카드에서 이유를 숫자 칸 위에 두면 "도보 약 N분"이 바로 아래 도보 칸과 겹친다.
// 그래서 이유 문장 앞의 도보 분을 뺀다. 실제 추천 이유 생성(REC 이유 문구, T5)에서도 같은 규칙을 쓸 수 있게 순수 함수로 둔다.
// 목업 이유는 "도보 약 4분, 지난주 👍한 국밥" 꼴이라 앞 조각만 지운다. 도보 말고 남는 말이 없으면 원문을 그대로 둔다.

const WALK_LEAD = /^도보 약 \d+분\s*,\s*/;

export function reasonWithoutWalk(reason: string): string {
  const rest = reason.replace(WALK_LEAD, "").trim();
  return rest.length > 0 ? rest : reason;
}
