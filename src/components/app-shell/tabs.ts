// 하단 탭 4개의 경로, 라벨, 아이콘 (CLAUDE.md 6.2, PRD APP-03). 경로 판정은 순수 함수라 테스트한다.
//
// 경로 (PRD에 URL 정의가 없어 정한 기본안, T2.6)
// - `/`는 랜딩(public)이라 오늘 탭은 `/today`.
// - 투표 탭은 `/poll`(목록, POLL-10). 투표방 `/poll/[code]`도 투표 탭으로 본다.
import {
  CircleUserRound,
  Map as MapIcon,
  Utensils,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { commonCopy } from "@/copy/common";

export const APP_TAB_IDS = ["today", "map", "poll", "me"] as const;
export type AppTabId = (typeof APP_TAB_IDS)[number];

export type AppTab = {
  id: AppTabId;
  href: `/${string}`;
  label: string;
  Icon: LucideIcon;
};

export const APP_TABS: readonly AppTab[] = [
  { id: "today", href: "/today", label: commonCopy.tabs.today, Icon: Utensils },
  { id: "map", href: "/map", label: commonCopy.tabs.map, Icon: MapIcon },
  { id: "poll", href: "/poll", label: commonCopy.tabs.poll, Icon: Vote },
  { id: "me", href: "/me", label: commonCopy.tabs.me, Icon: CircleUserRound },
];

/**
 * 경로에 해당하는 탭. 탭 경로와 같거나 그 아래 경로(`/poll/abc`)면 그 탭, 아니면 null.
 * `/mention`처럼 접두만 같은 경로는 `/me`로 보지 않는다. 끝 슬래시, 쿼리, 해시는 무시한다.
 */
export function matchTab(pathname: string | null | undefined): AppTabId | null {
  if (!pathname) return null;
  const [bare = ""] = pathname.split(/[?#]/);
  const path = bare.replace(/\/+$/, "") || "/";
  const tab = APP_TABS.find(
    ({ href }) => path === href || path.startsWith(`${href}/`),
  );
  return tab?.id ?? null;
}
