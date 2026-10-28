// /design-lab/states 확인 화면 문구 (T2.7). 내부용이지만 문구 규칙(tasks.md 2.2절)은 똑같이 지킨다.
// 상태 문구 자체는 commonCopy.states(기본값)와 copy-guide 4.2~4.4 예문을 쓴다.
export const designLabStatesCopy = {
  title: "4상태 컴포넌트",
  description:
    "스켈레톤 3종과 빈 상태, 오류, 오프라인입니다. 테마는 시스템 설정을 따릅니다.",
  sections: {
    card: "추천 카드 스켈레톤",
    list: "리스트 행 스켈레톤",
    sheet: "바텀시트 상세 스켈레톤",
    empty: "빈 상태 (기본 문구)",
    emptyDomain: "빈 상태 (도메인 문구, 일러스트, 주 버튼)",
    error: "오류",
    offline: "오프라인",
    online: "지금 연결 상태",
  },
  /** copy-guide 4.2 "반경 안 0곳" 예문 */
  emptySample: {
    title: "도보 10분 안에 조건에 맞는 식당이 없습니다",
    body: "15분까지 넓혀볼까요?",
    action: "15분까지 넓히기",
  },
  onlineNow: "온라인입니다. 기기의 네트워크를 끄면 아래가 오프라인 안내로 바뀝니다.",
  pressed: (label: string) => `${label} 버튼을 눌렀습니다.`,
} as const;
