// 지도 시안 쿼리 (T5.1). 서버와 클라이언트 양쪽에서 쓰는 순수 함수.
//   ?state=loading|empty|error|offline   4상태 (scripts/shots.mjs 규약). error는 지도 로딩 실패 → 목록 보기(T5.32)
//   ?select=<식당 id>                   마커를 고른 상태로 연다
//   ?snap=peek|half|full                시트 높이 (안마다 쓰는 단계가 다르면 가까운 단계로 맞춘다)
//   ?filter=open                        필터 펼침(A 카테고리 줄, B 시트 안 카테고리 줄, C 필터 시트)
//   ?moved=1                            지도를 옮긴 뒤("이 지역에서 다시 찾기"가 보이는 상태)
//   ?map=naver                          실제 네이버 지도(MapProvider 네이버 구현체). 기본은 목업 지도
import {
  parseDesignState,
  type DesignState,
  type DesignStateSearchParams,
} from "@/features/design-lab/mock";
import { findMapPlace } from "./places";

export type SheetSnap = "peek" | "half" | "full";

export type MapLabParams = {
  state: DesignState;
  selectId: string | null;
  snap: SheetSnap | null;
  filterOpen: boolean;
  moved: boolean;
  provider: "lab" | "naver";
};

function first(searchParams: DesignStateSearchParams, key: string) {
  if (!searchParams) return undefined;
  const raw =
    searchParams instanceof URLSearchParams
      ? searchParams.get(key)
      : searchParams[key];
  const value = typeof raw === "string" ? raw : raw?.[0];
  return value?.trim();
}

export function parseMapLabParams(
  searchParams: DesignStateSearchParams,
): MapLabParams {
  const snap = first(searchParams, "snap")?.toLowerCase();
  const select = first(searchParams, "select") ?? null;
  return {
    state: parseDesignState(searchParams),
    selectId: findMapPlace(select) ? select : null,
    snap: snap === "peek" || snap === "half" || snap === "full" ? snap : null,
    filterOpen: first(searchParams, "filter")?.toLowerCase() === "open",
    moved: first(searchParams, "moved") === "1",
    provider:
      first(searchParams, "map")?.toLowerCase() === "naver" ? "naver" : "lab",
  };
}
