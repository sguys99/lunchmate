// 하단 탭 4개의 데이터와 아이콘 매핑 (CLAUDE.md 6.2). 스타일은 시안별로 정한다.
import {
  CircleUserRound,
  Map as MapIcon,
  Utensils,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { commonCopy } from "@/copy/common";

export const DESIGN_TAB_IDS = ["today", "map", "poll", "me"] as const;
export type DesignTabId = (typeof DESIGN_TAB_IDS)[number];

export type DesignTab = {
  id: DesignTabId;
  label: string;
  Icon: LucideIcon;
};

export const DESIGN_TABS: readonly DesignTab[] = [
  { id: "today", label: commonCopy.tabs.today, Icon: Utensils },
  { id: "map", label: commonCopy.tabs.map, Icon: MapIcon },
  { id: "poll", label: commonCopy.tabs.poll, Icon: Vote },
  { id: "me", label: commonCopy.tabs.me, Icon: CircleUserRound },
];

/** 화면별 활성 탭: 홈은 오늘, 상세 시트는 지도에서 연다 */
export const ACTIVE_TAB_BY_SCREEN = {
  home: "today",
  sheet: "map",
} as const satisfies Record<"home" | "sheet", DesignTabId>;
