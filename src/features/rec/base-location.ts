// 오늘(홈) 기준 위치 (T5.16, REC-02, PRD 12장). 순수 함수.
//
// 선택지: 저장한 사무실(기본이 맨 앞) + 현위치. 비로그인 둘러보기는 현위치뿐이다.
// - 처음: 기본 사무실. 사무실이 없으면(둘러보기, 온보딩 전) 현위치.
// - 현위치를 고르면 브라우저 측위를 한 번 부른다. 좌표는 메모리에만 두고 추천 계산과 지도 중심에만 쓴다.
//   서버, PostHog, Sentry, 저장 API로 보내지 않는다(CLAUDE.md 7장, T0.18).
// - 권한 거부나 측위 실패: 사무실이 있으면 기본 사무실로 돌아가 안내(notice)를 보이고,
//   사무실도 없으면 위치를 알 수 없는 상태(needLocation)가 된다.
import type { LatLng } from "@/lib/map/types";

export type OfficeOption = {
  id: string;
  name: string;
  isDefault: boolean;
  /** 사용자가 지도에 직접 놓은 핀(저장 값) */
  position: LatLng;
};

export type BaseChoice = { kind: "office"; id: string } | { kind: "here" };

export type HereState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "ok"; position: LatLng }
  | { status: "denied" }
  | { status: "unavailable" };

/** 현위치를 못 써서 기본 사무실로 돌아왔다는 안내 */
export type BaseNotice = "denied" | "unavailable" | null;

/** 기본 사무실(없으면 가장 앞의 곳) */
export function defaultOffice(
  offices: readonly OfficeOption[],
): OfficeOption | null {
  return offices.find((o) => o.isDefault) ?? offices[0] ?? null;
}

/** 칩 메뉴 순서: 기본 사무실, 나머지 사무실(저장 순), 현위치 */
export function sortOffices(offices: readonly OfficeOption[]): OfficeOption[] {
  const d = defaultOffice(offices);
  return d ? [d, ...offices.filter((o) => o.id !== d.id)] : [];
}

export function initialChoice(offices: readonly OfficeOption[]): BaseChoice {
  const d = defaultOffice(offices);
  return d ? { kind: "office", id: d.id } : { kind: "here" };
}

export type ResolvedBase =
  | { kind: "office"; office: OfficeOption; center: LatLng }
  | { kind: "here"; state: HereState; center: LatLng | null };

/** 고른 값을 실제 기준점으로. 지운 사무실을 고르고 있었다면 기본 사무실로 */
export function resolveBase(
  choice: BaseChoice | null,
  offices: readonly OfficeOption[],
  here: HereState,
): ResolvedBase {
  const pick = choice ?? initialChoice(offices);
  if (pick.kind === "office") {
    const office =
      offices.find((o) => o.id === pick.id) ?? defaultOffice(offices);
    if (office) return { kind: "office", office, center: office.position };
  }
  return {
    kind: "here",
    state: here,
    center: here.status === "ok" ? here.position : null,
  };
}

/**
 * 측위 결과를 반영한 다음 선택. 실패하면 사무실이 있을 때 기본 사무실로 돌아가고 안내를 남긴다.
 * 사무실이 없으면 현위치에 머문다(화면이 needLocation 안내).
 */
export function afterLocate(
  result: HereState,
  offices: readonly OfficeOption[],
): { choice: BaseChoice; notice: BaseNotice } {
  if (result.status === "ok") return { choice: { kind: "here" }, notice: null };
  const d = defaultOffice(offices);
  if (d && (result.status === "denied" || result.status === "unavailable")) {
    return { choice: { kind: "office", id: d.id }, notice: result.status };
  }
  return { choice: { kind: "here" }, notice: null };
}
