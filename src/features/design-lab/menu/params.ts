// 메뉴 제보 시안 쿼리 (T10.16b, D-34): /design-lab/menu/<a|b|c>?...
//   state=ready|loading|empty|error|offline   4상태 (pnpm shots --states 규약)
//     ready    제보된 메뉴가 3개 있는 식당(정담국밥)
//     loading  카드와 상세 본문(세션 메모리)은 보이고 메뉴 자리만 스켈레톤(메뉴 집계는 우리 DB 값이라 따로 온다)
//     empty    아직 제보된 메뉴가 없다. 카드는 지금처럼 가격대, 상세는 알려주기 입구와 네이버 링크
//     error    보내는 중 실패. fail=save(기본) | banned(금칙어) | limit(하루 20건)
//     offline  메뉴는 세션에 받은 값 그대로 보이고, 남기기는 aria-disabled + 위 안내
//   view=home|detail|feedback|report   기본 home
//     home      오늘(홈) 큰 카드에서 대표 메뉴가 보이는 자리
//     detail    홈 카드 "상세"로 연 상세 시트(끝까지 연 높이)의 메뉴 목록
//     feedback  식후 피드백 시트의 "뭐 드셨어요?"(MENU-01)
//     report    상세 "메뉴 알려주기"(MENU-02)
//   edit=1    report에서 시트를 연 채로 시작(오류 상태는 늘 연 채로)
import { parseDesignState, type DesignState } from "@/features/design-lab/mock";

export const MENU_VIEWS = ["home", "detail", "feedback", "report"] as const;
export type MenuView = (typeof MENU_VIEWS)[number];

export type MenuFail = "save" | "banned" | "limit";

export type MenuParams = {
  state: DesignState;
  view: MenuView;
  edit: boolean;
  fail: MenuFail;
};

type Raw = Readonly<Record<string, string | readonly string[] | undefined>>;

function first(raw: Raw, key: string): string | undefined {
  const v = raw[key];
  const s = typeof v === "string" ? v : v?.[0];
  return s?.trim().toLowerCase();
}

export function parseMenuParams(raw: Raw): MenuParams {
  const view = first(raw, "view");
  const fail = first(raw, "fail");
  const state = parseDesignState(raw);
  return {
    state,
    view: (MENU_VIEWS as readonly string[]).includes(view ?? "")
      ? (view as MenuView)
      : "home",
    edit: first(raw, "edit") === "1" || state === "error",
    fail: fail === "banned" || fail === "limit" ? fail : "save",
  };
}
