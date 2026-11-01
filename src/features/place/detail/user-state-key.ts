// 상세 즐겨찾기 상태 쿼리 키. 지도 탭이 상세 본문 없이 이 키만 쓰도록 떼어 둔다(T8.10).
export const placeUserStateKey = (placeId: string) =>
  ["place-user-state", placeId] as const;
