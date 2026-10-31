// 식당 상세와 장소 이름 해석 문구 (T5.12a, T5.33~T5.38, D-10, PLACE-01~07, NAV-01~04, DEAL-02).
// 상태 안내, 설명, 오류는 습니다체, 질문과 제안은 해요체 (tasks.md 2.2절, copy-guide 4.2, 4.3, 4.9, 4.12).
// 배지와 웨이팅 단계 라벨은 badges.ts를 쓴다.
export const placeCopy = {
  /** 장소 이름 해석 실패 대체 (T5.12a, PRD 12장) */
  nameUnresolved: "이름을 불러오지 못했습니다.",
  openKakaoMap: "카카오맵에서 보기",

  detail: {
    label: "식당 상세",
    close: "상세 닫기",
    /** 이름을 모를 때 시트 제목(스크린 리더) */
    unnamedLabel: "이름을 불러오지 못한 식당",
    nameUnresolvedBody: "후기와 가격 정보는 그대로 볼 수 있습니다.",
    myVisit: (dateLabel: string, rating: "up" | "down" | null) =>
      rating === "up"
        ? `${dateLabel}에 다녀왔고 👍를 남겼습니다.`
        : rating === "down"
          ? `${dateLabel}에 다녀왔고 👎를 남겼습니다.`
          : `${dateLabel}에 다녀왔습니다.`,
  },

  /** 숫자 3칸 (홈 카드와 같은 말) */
  numbers: {
    walk: "도보",
    walkUnit: "분",
    walkUnknown: "알 수 없음",
    price: "1인",
    thumbs: "만족",
    thumbsUnit: "%",
    thumbsEmpty: "후기 모으는 중",
    inBudget: "예산 안",
    overBudget: "예산 넘음",
  },

  /** 가격 (PLACE-02) */
  price: {
    title: "가격",
    medianOf: (count: number) => `제보 ${count}건 가운데 값`,
    estimateOf: (category: string) => `${category} 기준 추정`,
    estimateBody: (category: string) =>
      `제보된 가격이 없어 같은 ${category} 식당 기준으로 추정했습니다.`,
    sentenceReport: (count: number, won: string) =>
      `제보 ${count}건의 가운데 값은 ${won}입니다.`,
    sentenceRange: (low: string, high: string, quartile: boolean) =>
      quartile
        ? `제보의 가운데 절반이 ${low}~${high} 사이입니다.`
        : `${low}~${high} 사이로 제보됐습니다.`,
    budget: (meal: "lunch" | "dinner", won: string) =>
      `내 ${meal === "lunch" ? "점심" : "저녁"} 예산 ${won}`,
    scaleLabel: (count: number, won: string, budget: string) =>
      count > 0
        ? `가격 제보 ${count}건, 가운데 값 ${won}, 내 예산 ${budget}`
        : `추정 가격 ${won}, 내 예산 ${budget}`,
  },

  /** 👍 비율 (PLACE-03) */
  thumbs: {
    title: "만족도",
    up: (count: number) => `👍 ${count}`,
    down: (count: number) => `👎 ${count}`,
    reviewsOf: (count: number) => `후기 ${count}건`,
    few: (count: number) => `아직 ${count}건이라 비율은 3건부터 보여 드립니다.`,
    none: "아직 남긴 사람이 없습니다.",
    meterLabel: (percent: number, total: number) =>
      `후기 ${total}건 중 만족 ${percent}%`,
  },

  /** 태그 (PLACE-03) */
  tags: {
    title: "태그",
    none: "아직 태그가 없습니다.",
    count: (label: string, count: number) => `${label} ${count}회`,
  },

  /** 공개 후기 (PLACE-03, PRD 11.2: 닉네임과 방문 월만). 목록과 쓰기는 6단계 */
  reviews: {
    title: "후기",
    titleCount: (count: number) => `후기 ${count}건`,
    visitMonth: (month: number) => `${month}월 방문`,
    thumbUp: "좋았어요",
    thumbDown: "별로였어요",
    more: (count: number) => `후기 ${count}건 모두 보기`,
    emptyTitle: "아직 후기가 없습니다.",
    emptyBody: "다녀오셨다면 식후에 한 탭으로 남길 수 있어요.",
    offline: "연결되면 후기를 불러옵니다.",
  },

  /** 지금: 웨이팅(PLACE-07), 할인(DEAL-02) */
  now: {
    title: "지금",
    waitingNone: "최근 30분 동안 웨이팅 제보가 없습니다.",
    waitingAsk: "지금 줄이 어떤가요?",
    waitingSoon: "웨이팅 제보는 곧 열립니다.",
    dealMeta: (daysAgo: number, until: string | null) =>
      until ? `${daysAgo}일 전 제보, ${until}까지` : `${daysAgo}일 전 제보`,
    dealNotice: "사용자가 제보한 정보라 실제와 다를 수 있습니다.",
    dealNoScore: "할인 정보는 추천 순서에 쓰지 않습니다.",
  },

  /** 기본 정보 (PLACE-01) */
  info: {
    title: "정보",
    address: "주소",
    phone: "전화",
    noPhone: "전화번호가 없습니다.",
    naverNote: "영업시간과 메뉴는 네이버 플레이스에서 볼 수 있습니다.",
  },

  /** 버튼 (PLACE-04, NAV) */
  actions: {
    directions: "길찾기",
    directionsTo: (name: string) => `${name} 길찾기`,
    opening: "여는 중",
    favorite: "즐겨찾기",
    favoriteOn: (name: string) => `${name} 즐겨찾기`,
    more: "다른 행동 더 보기",
    call: "전화 걸기",
    share: "공유하기",
    naver: "네이버 플레이스에서 보기",
    kakaoMap: "카카오맵에서 보기",
    addToPoll: "투표에 추가",
    reportGroup: "정보가 다른가요?",
    reportClosed: "문 닫았어요",
    reportPrice: "가격이 달라요",
    reportWrong: "정보가 틀려요",
  },

  /** 길찾기 출발지 이름 (네이버 지도에 보이는 값) */
  origin: {
    office: "사무실",
    current: "현위치",
  },

  share: {
    title: (name: string) => `${name} 카카오맵`,
    text: (name: string) => `${name}, 런치메이트에서 골랐어요.`,
  },

  toasts: {
    favoriteOn: "즐겨찾기에 담았습니다.",
    favoriteOff: "즐겨찾기에서 뺐습니다.",
    favoriteBlocked:
      "다시 안 갈 곳에 있는 식당입니다. 나 탭에서 풀면 담을 수 있습니다.",
    favoriteLimit: "즐겨찾기는 300곳까지 담을 수 있습니다.",
    favoriteFailed: "즐겨찾기를 저장하지 못했습니다. 잠시 후 다시 눌러 주세요.",
    linkCopied: "카카오맵 링크를 복사했습니다.",
    shareFailed: "링크를 복사하지 못했습니다. 카카오맵에서 공유해 주세요.",
    reportSoon: "제보는 곧 열립니다. 조금만 기다려 주세요.",
    offline: "인터넷에 연결되면 다시 눌러 주세요.",
  },

  /** 4상태 */
  states: {
    loading: "식당 정보를 불러오는 중입니다",
    errorTitle: "식당 정보를 불러오지 못했습니다",
    errorBody:
      "잠시 후 다시 시도해 주세요. 네이버 지도에서 바로 찾아볼 수도 있습니다.",
    retry: "다시 시도",
    naverMap: "네이버 지도에서 보기",
    offlineTitle: "인터넷에 연결되어 있지 않습니다",
    offlineBody: "연결 전에 불러온 정보입니다. 길찾기는 그대로 쓸 수 있습니다.",
  },
} as const;
