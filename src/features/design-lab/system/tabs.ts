// 디자인 랩 화면별 활성 탭. 탭 데이터(경로, 라벨, 아이콘)와 막대는 앱 셸(src/components/app-shell, T2.6)을 그대로 쓴다.
import type { AppTabId } from "@/components/app-shell";

/** 화면별 활성 탭: 홈은 오늘, 상세 시트는 지도에서 연다 */
export const ACTIVE_TAB_BY_SCREEN = {
  home: "today",
  sheet: "map",
} as const satisfies Record<"home" | "sheet", AppTabId>;
