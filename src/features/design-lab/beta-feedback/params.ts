// 베타 의견 시안 쿼리 (T9.4): /design-lab/beta-feedback/<a|b|c>?...
//   state=ready|loading|empty|error|offline   4상태 (pnpm shots --states 규약)
//     ready    글을 조금 쓴 채로 연다(A, B는 시트, C는 화면 + 보낸 의견 3건)
//     loading  A, B: 시트 안 칸 스켈레톤(청크와 오늘 한도 확인). C: 보낸 의견 목록 스켈레톤
//     empty    A, B: 아무것도 쓰지 않은 시트(보내기 꺼짐). C: 보낸 의견 0건
//     error    fail=send(기본) 보내기 실패 + 다시 보내기, fail=limit 오늘 한도 10건
//     offline  위 안내 + 보내기 aria-disabled. 쓴 글은 남는다
//   view=entry|sheet|page   entry: 나 탭 진입 자리만(시트 닫힘). 기본 A, B는 sheet, C는 page
//   flow=compose|sent       sent: 보낸 뒤 고마움 화면
//   step=1|2                B안 단계(기본 2: 종류를 고른 뒤 쓰는 단계)
//   cat=bug|inconvenient|good|idea   고른 종류(기본 bug)
//   from=<경로>             "지금 보던 화면" 원래 경로(목업). 기본 /poll/k7Qm2xPa9w
import { parseDesignState, type DesignState } from "@/features/design-lab/mock";

export const BETA_CATEGORIES = ["bug", "inconvenient", "good", "idea"] as const;
export type BetaCategory = (typeof BETA_CATEGORIES)[number];

export type BetaFeedbackParams = {
  state: DesignState;
  fail: "send" | "limit";
  view: "entry" | "sheet" | "page" | null;
  flow: "compose" | "sent";
  step: 1 | 2;
  cat: BetaCategory;
  from: string;
};

type Raw = Readonly<Record<string, string | readonly string[] | undefined>>;

function first(raw: Raw, key: string): string | undefined {
  const v = raw[key];
  const s = typeof v === "string" ? v : v?.[0];
  return s?.trim();
}

function oneOf<T extends string>(list: readonly T[], value: string | undefined): T | null {
  const v = value?.toLowerCase();
  return v && (list as readonly string[]).includes(v) ? (v as T) : null;
}

/** 목업 기본 경로: 투표방 초대 코드가 든 주소(지우는 규칙을 보이려고) */
export const DEFAULT_FROM = "/poll/k7Qm2xPa9w?ref=kakao";

export function parseBetaFeedbackParams(raw: Raw): BetaFeedbackParams {
  return {
    state: parseDesignState(raw),
    fail: first(raw, "fail")?.toLowerCase() === "limit" ? "limit" : "send",
    view: oneOf(["entry", "sheet", "page"] as const, first(raw, "view")),
    flow: first(raw, "flow")?.toLowerCase() === "sent" ? "sent" : "compose",
    step: first(raw, "step") === "1" ? 1 : 2,
    cat: oneOf(BETA_CATEGORIES, first(raw, "cat")) ?? "bug",
    from: first(raw, "from") || DEFAULT_FROM,
  };
}
