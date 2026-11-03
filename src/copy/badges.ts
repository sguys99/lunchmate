// 공통 배지 문구 (T2.9). 홈 카드, 지도 시트, 식당 상세, 투표방이 함께 쓴다.
// 근거: PRD PLACE-02(추정), PLACE-07(웨이팅 3단계), DEAL-02(할인 고지), POLL-13(기피 경고),
// copy-guide 4.4절(배지와 설명), 4.12절(할인과 제보 고지).
// 배지 라벨은 명사형이라 문체 비율에서 빠진다. 툴팁 설명은 badge-descriptions.ts(툴팁 청크만 부른다, 홈 첫 로드 밖).
// 기피 경고는 PRD의 "⚠" 이모지 대신 Lucide 아이콘을 붙이므로 라벨에 기호를 넣지 않는다.

export const badgeCopy = {
  /** 화면에 보이는 배지 글자 */
  labels: {
    estimate: "추정",
    report: "제보",
    deal: "할인",
    waiting: "웨이팅",
    avoidWarning: "못 먹는 분 있음",
    closedToday: "오늘 쉰다는 제보",
  },
  /** PLACE-07 웨이팅 3단계 이름 */
  waitingLevels: {
    walkIn: "바로 입장",
    short: "조금 기다려요",
    long: "줄 길어요",
  },
  /** PLACE-07 웨이팅 표시. 예: "12분 전, 줄 길어요", 1분 미만은 "방금, 줄 길어요"(D-13 안건 14) */
  waitingReport: (minutesAgo: number, levelLabel: string) =>
    `${minutesAgo < 1 ? "방금" : `${minutesAgo}분 전`}, ${levelLabel}`,
  /**
   * 스크린 리더용 이름. 보이는 라벨을 그대로 품어(label in name) 음성 명령과 어긋나지 않게 하고,
   * 한 단어 배지에는 무엇에 대한 표시인지 덧붙인다.
   */
  ariaLabels: {
    estimate: "추정 가격",
    report: "사용자 제보",
    deal: "할인 정보 있음",
    waiting: (text: string) => `웨이팅 ${text}`,
    avoidWarning: "못 먹는 분 있음",
    closedToday: "이번 끼니에 문이 닫혀 있었다는 제보 있음",
  },
} as const;
