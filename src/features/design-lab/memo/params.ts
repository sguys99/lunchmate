// 식당 메모 시안 쿼리 (T10.15, D-32): /design-lab/memo/<a|b|c>?...
//   state=ready|loading|empty|error|offline   4상태 (pnpm shots --states 규약)
//     ready    메모가 있는 식당(정담국밥)
//     loading  상세 본문(세션 메모리)은 보이고 메모 자리만 스켈레톤(메모는 우리 DB 값이라 따로 온다)
//     empty    아직 메모가 없다. 쓰는 입구가 보인다
//     error    쓰는 중 저장 실패. fail=save(기본) | banned(금칙어) | limit(하루 한도)
//     offline  메모는 세션에 받은 값 그대로 보이고, 고치기는 aria-disabled + 위 안내
//   view=detail|home|favorites|outage   기본 detail
//     detail     홈 카드 "상세"로 연 상세 시트(끝까지 연 높이)
//     home       오늘(홈) 큰 카드에서 메모가 보이는지
//     favorites  나 탭 장소 패널 즐겨찾기 목록(이름 미해결 줄 하나 포함)
//     outage     카카오 장애나 이름 확인 실패. A, B는 상세 머리, C는 홈 오류 + 즐겨찾기에서 고르기
//   edit=1    쓰는 중 화면을 연 채로 시작(A 인라인 입력, B 작은 시트, C 이름표 줄)
import { parseDesignState, type DesignState } from "@/features/design-lab/mock";

export const MEMO_VIEWS = ["detail", "home", "favorites", "outage"] as const;
export type MemoView = (typeof MEMO_VIEWS)[number];

export type MemoFail = "save" | "banned" | "limit";

export type MemoParams = {
  state: DesignState;
  view: MemoView;
  edit: boolean;
  fail: MemoFail;
};

type Raw = Readonly<Record<string, string | readonly string[] | undefined>>;

function first(raw: Raw, key: string): string | undefined {
  const v = raw[key];
  const s = typeof v === "string" ? v : v?.[0];
  return s?.trim().toLowerCase();
}

export function parseMemoParams(raw: Raw): MemoParams {
  const view = first(raw, "view");
  const fail = first(raw, "fail");
  const state = parseDesignState(raw);
  return {
    state,
    view: (MEMO_VIEWS as readonly string[]).includes(view ?? "")
      ? (view as MemoView)
      : "detail",
    // 오류 상태는 쓰는 중에 나므로 편집을 연 채로 시작한다
    edit: first(raw, "edit") === "1" || state === "error",
    fail: fail === "banned" || fail === "limit" ? fail : "save",
  };
}
