// 회식 모드 시안 쿼리 (T7.3): /design-lab/party/<a|b|c>?...
//   state=ready|loading|empty|error|offline  4상태 (pnpm shots --states 규약)
//     loading  후보를 찾는 중(목록 스켈레톤, 지도 자리)
//     empty    도보 15분 안에 조건에 맞는 곳 0곳
//     error    카카오 실패(재시도 1회 뒤). 다시 시도 + 네이버 지도에서 보기
//     offline  결과 자리는 오프라인 안내, 조건 입력은 보이되 찾기를 끈다
//   view=form|results   A, B의 단계(기본 form). C는 늘 results(결과 먼저)
//   q=1|2|3|4           B 질문 단계(view=form일 때). 1 인원, 2 예산, 3 자리, 4 주류
//   edit=people|budget|room|alcohol   C에서 조건 고치기 칸을 연 상태
//   few=on              조건에 맞는 곳이 5곳 미만(2곳)
//   cold=on             근거 대부분이 정보 없음인 콜드 스타트
//   active=1..5         고른 후보(지도 핀 강조, B는 펼친 줄)
import { parseDesignState, type DesignState } from "@/features/design-lab/mock";

export const PARTY_EDIT_FIELDS = [
  "people",
  "budget",
  "room",
  "alcohol",
] as const;
export type PartyEditField = (typeof PARTY_EDIT_FIELDS)[number];

export type PartyParams = {
  state: DesignState;
  view: "form" | "results";
  q: 1 | 2 | 3 | 4;
  edit: PartyEditField | null;
  few: boolean;
  cold: boolean;
  /** 0부터. 없으면 -1 */
  active: number;
};

type Raw = Readonly<Record<string, string | readonly string[] | undefined>>;

function first(raw: Raw, key: string): string | undefined {
  const v = raw[key];
  const s = typeof v === "string" ? v : v?.[0];
  return s?.trim().toLowerCase();
}

export function parsePartyParams(raw: Raw): PartyParams {
  const q = Number(first(raw, "q"));
  const active = Number(first(raw, "active"));
  const edit = first(raw, "edit");
  return {
    state: parseDesignState(raw),
    view: first(raw, "view") === "results" ? "results" : "form",
    q: q === 2 || q === 3 || q === 4 ? q : 1,
    edit:
      edit !== undefined &&
      (PARTY_EDIT_FIELDS as readonly string[]).includes(edit)
        ? (edit as PartyEditField)
        : null,
    few: first(raw, "few") === "on",
    cold: first(raw, "cold") === "on",
    active:
      Number.isInteger(active) && active >= 1 && active <= 5 ? active - 1 : -1,
  };
}
