// 공통 배지 문구 (T2.9). 홈 카드, 지도 시트, 식당 상세, 투표방이 함께 쓴다.
// 근거: PRD PLACE-02(추정), PLACE-07(웨이팅 3단계), DEAL-02(할인 고지), POLL-13(기피 경고),
// copy-guide 4.4절(배지와 설명), 4.12절(할인과 제보 고지).
// 배지 라벨은 명사형이라 문체 비율에서 빠지고, 설명(description)은 습니다체다.
// 기피 경고는 PRD의 "⚠" 이모지 대신 Lucide 아이콘을 붙이므로 라벨에 기호를 넣지 않는다.

/** DEAL-02 고지. 제보와 할인 배지가 같은 문장을 쓴다 */
const reportNotice = "사용자가 제보한 정보라 실제와 다를 수 있습니다.";

export const badgeCopy = {
  /** 화면에 보이는 배지 글자 */
  labels: {
    estimate: "추정",
    report: "제보",
    deal: "할인",
    waiting: "웨이팅",
    avoidWarning: "못 먹는 분 있음",
  },
  /** PLACE-07 웨이팅 3단계 이름 */
  waitingLevels: {
    walkIn: "바로 입장",
    short: "조금 기다려요",
    long: "줄 길어요",
  },
  /** PLACE-07 웨이팅 표시. 예: "12분 전, 줄 길어요" */
  waitingReport: (minutesAgo: number, levelLabel: string) =>
    `${minutesAgo}분 전, ${levelLabel}`,
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
  },
  /** 툴팁 설명. 상태 안내라 습니다체 */
  descriptions: {
    estimate: "제보된 가격이 없어 같은 종류 식당 기준으로 추정했습니다.",
    report: reportNotice,
    deal: reportNotice,
    waiting: "최근 30분 안에 들어온 제보만 보여줍니다.",
    avoidWarning:
      "참여자 중 이 식당 음식을 피하는 분이 있습니다. 누구인지는 알리지 않습니다.",
  },
} as const;
