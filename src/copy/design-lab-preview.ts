// design-lab 비교 화면(T1.12, 시안 B 시트 화면)에서만 쓰는 투표와 상세 미리보기 문구.
// 원래 home.ts에 있었으나 홈 첫 로드에 실리지 않게 따로 뺐다(T8.11). 실제 투표방과 상세 문구는 poll.ts, place.ts에 있다.
// 투표 득표 바와 상세 바텀시트 문구 (design-lab 비교 화면 2, T1.12).
export const pollPreviewCopy = {
  participants: (count: number) => `${count}명 참여`,
  votes: (count: number) => `${count}표`,
  deadline: (hhmm: string) => `${hhmm} 마감`,
  minutesLeft: (minutes: number) => `${minutes}분 남음`,
  myVote: "내 선택",
  vote: "투표하기",
  /** 득표가 하나도 없을 때 (design-lab 시트 화면의 empty 상태) */
  noVotes: "아직 투표한 사람이 없습니다. 먼저 골라볼까요?",
} as const;

export const placeDetailCopy = {
  address: "주소",
  phone: "전화",
  hours: "영업시간",
  menu: "대표 메뉴",
  call: "전화 걸기",
  viewOnNaver: "네이버 플레이스에서 보기",
  addToPoll: "투표에 추가",
  favorite: "즐겨찾기",
  share: "공유",
  reviewCount: (count: number) => `후기 ${count}건`,
  priceReportCount: (count: number) => `제보 ${count}건`,
} as const;
