// "지금 안 열었어요" 제보 시안 쿼리 (T9.18): /design-lab/closed/<a|b|c>?...
//   view   시안마다 화면 단계. 모르는 값이면 그 시안의 첫 단계
//     A: home(다른 분 제보가 있는 카드 배지) | sheet(상세 지금 행) | done(알린 뒤 결과 줄)
//     B: home | menu(카드 더 보기 메뉴) | done(카드를 바꾼 뒤 결과 줄)
//     C: ask(길찾기 뒤 돌아온 홈의 확인 줄) | done(닫혀 있었어요 뒤 가까운 대안)
//   state=ready|loading|empty|error|offline   4상태(pnpm shots --states 규약). 시안 조각은 ready에서만 보인다
import { parseDesignState, type DesignState } from "@/features/design-lab/mock";

export type ClosedParams = { view: string; state: DesignState };

type Raw = Readonly<Record<string, string | readonly string[] | undefined>>;

export function parseClosedParams(raw: Raw): ClosedParams {
  const v = raw.view;
  return {
    view: ((typeof v === "string" ? v : v?.[0]) ?? "").trim().toLowerCase(),
    state: parseDesignState(raw),
  };
}

export function pickView<T extends string>(
  view: string,
  options: readonly T[],
): T {
  return (options as readonly string[]).includes(view)
    ? (view as T)
    : options[0]!;
}
