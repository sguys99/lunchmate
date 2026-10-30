// 사무실 목록 규칙 (T4.23, SET-01). 순수 함수(React, 네트워크 없음). 화면, 서버 액션, 추천 기준점이 함께 쓴다.
//
// 기본 사무실 결정 (2026-10-30, T4.23)
// - DB는 첫 사무실만 자동으로 기본으로 만들고, 기본을 지워도 다른 곳을 올리지 않는다(T4.4 마이그레이션).
// - 그래서 기본을 지우는 서버 액션이 남은 곳 중 가장 먼저 저장한 곳을 곧바로 기본으로 지정한다(묻지 않음, 결과를 토스트로 알림).
//   사무실이 둘 이상일 때만 지울 수 있으므로 남은 곳이 늘 있다.
// - 지정 요청이 실패하거나 다른 기기에서 지워 기본이 비어 있으면, 읽는 쪽이 resolveDefaultOffice로
//   가장 먼저 저장한 곳을 기본처럼 쓴다(화면에는 "기본" 표시 없이). 다음 기본 지정 때 DB가 맞춰진다.
// - 마지막 한 곳은 지울 수 없다. 사무실이 없으면 온보딩을 마치지 않은 사용자로 보기 때문이다(로그인 콜백).

export const MAX_OFFICES = 5;

export type OfficeSummary = {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
};

function byCreated(a: OfficeSummary, b: OfficeSummary): number {
  const t = Date.parse(a.created_at) - Date.parse(b.created_at);
  return t !== 0 ? t : a.id.localeCompare(b.id);
}

/** 화면 순서: 저장한 순서(가장 먼저 저장한 곳이 위) */
export function sortOffices<T extends OfficeSummary>(rows: readonly T[]): T[] {
  return [...rows].sort(byCreated);
}

/** 기본 사무실. 기본 표시가 없으면 가장 먼저 저장한 곳. 목록이 비면 null */
export function resolveDefaultOffice<T extends OfficeSummary>(
  rows: readonly T[],
): T | null {
  return rows.find((o) => o.is_default) ?? sortOffices(rows)[0] ?? null;
}

/** 기본 사무실을 지운 뒤 새 기본이 될 곳: 남은 곳 중 가장 먼저 저장한 곳 */
export function pickFallbackDefault<T extends OfficeSummary>(
  rows: readonly T[],
  deletedId: string,
): T | null {
  return sortOffices(rows.filter((o) => o.id !== deletedId))[0] ?? null;
}

export function canAddOffice(count: number): boolean {
  return count < MAX_OFFICES;
}

/** 지울 수 있는가: 두 곳 이상일 때만 */
export function canDeleteOffice(count: number): boolean {
  return count > 1;
}
