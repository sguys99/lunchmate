// 관리자 화면 시안 쿼리 (T8.5a): /design-lab/admin/<a|b|c>?...
//   state=ready|loading|empty|error|offline   4상태 (empty는 검토할 신고 0건)
//   section=reviews|closures|users|log        처음 열 구역. 기본 reviews
//   item=<id>                                  A안: 처음 고른 항목(390에서는 상세가 열린 채로)
//   confirm=suspend|unsuspend|bulk|closed      확인 상자를 연 채로 (캡처용)
//   select=some                                B안: 행 3개를 고른 채로(일괄 처리 줄)
//   step=reason                                C안, A안: 숨김 사유 고르기 단계를 연 채로
import { parseDesignState, type DesignState } from "@/features/design-lab/mock";

export const ADMIN_SECTIONS = ["reviews", "closures", "users", "log"] as const;
export type AdminSection = (typeof ADMIN_SECTIONS)[number];

const CONFIRMS = ["suspend", "unsuspend", "bulk", "closed"] as const;
export type AdminConfirm = (typeof CONFIRMS)[number];

export type AdminParams = {
  state: DesignState;
  section: AdminSection;
  item: string | null;
  confirm: AdminConfirm | null;
  select: boolean;
  step: "reason" | null;
};

type Raw = Readonly<Record<string, string | readonly string[] | undefined>>;

function first(raw: Raw, key: string): string | undefined {
  const v = raw[key];
  const s = typeof v === "string" ? v : v?.[0];
  return s?.trim().toLowerCase();
}

function oneOf<T extends string>(
  list: readonly T[],
  value: string | undefined,
): T | null {
  return value && (list as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

export function parseAdminParams(raw: Raw): AdminParams {
  const item = first(raw, "item");
  return {
    state: parseDesignState(raw),
    section: oneOf(ADMIN_SECTIONS, first(raw, "section")) ?? "reviews",
    item: item && /^[a-z0-9]{1,8}$/.test(item) ? item : null,
    confirm: oneOf(CONFIRMS, first(raw, "confirm")),
    select: first(raw, "select") === "some",
    step: first(raw, "step") === "reason" ? "reason" : null,
  };
}
