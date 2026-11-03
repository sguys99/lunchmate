// 식당 메모 쿼리 키 (T10.15). dbKeys.me 아래라 로그아웃, 탈퇴 때 clearMyData가 함께 지운다.
// 홈 첫 로드에 들어가는 db-keys.ts를 늘리지 않으려고 따로 둔다.
export const memoKeys = {
  /** 내 식당 메모 전부(나 탭 즐겨찾기 이름표). 고친 뒤에는 applyMemo가 setQueryData */
  mine: ["db", "me", "memos"] as const,
  /** 카카오 장애 때 홈 "즐겨찾기에서 고르기"(메모 있는 즐겨찾기 3곳) */
  favorites: ["db", "me", "favorite-memos"] as const,
};
