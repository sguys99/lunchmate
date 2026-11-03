// 앱 셸(하단 탭, 페이지 헤더, 지도 자리) 전용 문구 (T2.6). 탭 이름 자체는 commonCopy.tabs를 쓴다.
// 문체 (tasks.md 2.2절): 상태 안내는 습니다체. 라벨은 명사형이라 비율에서 빠진다.

export const shellCopy = {
  /** 데스크톱 오른쪽 지도 칸의 보조 기술용 이름. 실제 지도(T5)가 들어오기 전 자리 */
  mapPane: "지도 영역",
  /** 데스크톱 오른쪽 칸 랜드마크(aside) 이름 */
  mapRegion: "지도",
} as const;
