// 식당 상세 시안 문구 (T5.2, /design-lab/place/c). PLACE-01~08, NAV-01~04.
// D-10에서 C안을 골라 A, B 화면과 그 안만 쓰던 문구는 지웠다(CLAUDE.md 6.1-5).
// 상태 안내와 설명은 습니다체, 제안과 피드백 요청은 해요체 (tasks.md 2.2절, copy-guide 4.2, 4.3, 4.9, 4.12).
// 배지, 버튼, 웨이팅 단계 같은 공용 라벨은 badges.ts, home.ts(placeDetailCopy), common.ts 값을 쓴다.
// 시안을 고른 뒤(T5.3) 실제 상세(T5.33~T5.35)로 옮길 때 src/copy/place.ts로 정리한다.

export const placeLabCopy = {
  names: {
    c: "시안 C 결정 집중형 (선택)",
    live: "실제 상세 확인",
  },
  index: {
    title: "식당 상세 시안 (T5.2, D-10 C안)",
    body: "고른 C안과 실제 상세 구현 확인 화면입니다. 쿼리로 상태와 진입 경로를 바꿔 볼 수 있습니다.",
  },

  /** 컨테이너 */
  container: {
    sheetLabel: "식당 상세",
    close: "상세 닫기",
    back: "오늘 추천으로 돌아가기",
    expand: "자세히 보기",
    collapse: "간단히 보기",
    mapPin: "지도에서 이 식당 위치",
  },

  /** 숫자 라벨 (홈 카드와 같은 말) */
  numbers: {
    walk: "도보",
    walkUnit: "분",
    price: "1인",
    thumbs: "만족",
    thumbsUnit: "%",
    thumbsEmpty: "후기 모으는 중",
  },

  /** 가격 (PLACE-02) */
  price: {
    title: "가격",
    medianOf: (count: number) => `제보 ${count}건 중앙값`,
    estimateOf: (category: string) => `${category} 평균 추정`,
    median: (won: string) => `가운데 값 ${won}`,
    range: (min: string, max: string) => `${min}~${max}`,
    estimateBody: (category: string) =>
      `제보된 가격이 없어 같은 ${category} 식당 기준으로 추정했습니다.`,
    sentenceReport: (count: number, won: string) =>
      `제보 ${count}건의 가운데 값은 ${won}입니다.`,
    sentenceRange: (min: string, max: string) =>
      `${min}~${max} 사이로 제보됐습니다.`,
    budget: (won: string) => `내 점심 예산 ${won}`,
    inBudget: "예산 안",
    overBudget: "예산 넘음",
    scaleLabel: (median: string, budget: string) =>
      `가운데 값 ${median}, 내 예산 ${budget}`,
  },

  /** 👍 비율 (PLACE-03) */
  thumbs: {
    title: "만족도",
    up: (count: number) => `👍 ${count}`,
    down: (count: number) => `👎 ${count}`,
    reviewsOf: (count: number) => `후기 ${count}건`,
    few: (count: number) => `아직 ${count}건이라 비율은 3건부터 보여 드립니다.`,
    none: "아직 남긴 사람이 없습니다.",
    meterLabel: (percent: number) => `10칸 중 만족 ${percent}%`,
  },

  /** 태그 상위 5개 (PLACE-03) */
  tags: {
    title: "자주 나온 태그",
    titleShort: "태그",
    none: "아직 태그가 없습니다.",
  },

  /** 공개 후기 최신순 (PLACE-03, PRD 11.2: 닉네임, 방문 월만) */
  reviews: {
    title: "후기",
    titleCount: (count: number) => `후기 ${count}건`,
    visitMonth: (month: number) => `${month}월 방문`,
    thumbUp: "좋았어요",
    thumbDown: "별로였어요",
    more: (count: number) => `후기 ${count}건 모두 보기`,
    write: "후기 쓰기",
    empty: {
      title: "아직 후기가 없습니다",
      body: "다녀오셨다면 첫 후기를 남겨볼까요?",
    },
    offline: "연결되면 후기를 불러옵니다.",
  },

  /** 지금 정보: 웨이팅(PLACE-07), 할인(DEAL-02) */
  now: {
    title: "지금",
    waitingNone: "최근 30분 동안 웨이팅 제보가 없습니다.",
    waitingAsk: "지금 줄이 어떤가요?",
    dealNotice: "사용자가 제보한 정보라 실제와 다를 수 있습니다.",
    dealMeta: (daysAgo: number, until: string) =>
      `${daysAgo}일 전 제보, ${until}까지`,
  },

  /** 기본 정보 (PLACE-01) */
  info: {
    title: "정보",
    address: "주소",
    phone: "전화",
    naverNote: "영업시간, 메뉴, 사진은 네이버 플레이스에서 볼 수 있습니다.",
  },

  /** 버튼 (PLACE-04, NAV) */
  actions: {
    directions: "길찾기",
    directionsTo: (name: string) => `${name} 길찾기`,
    naver: "네이버 플레이스",
    naverLong: "네이버 플레이스에서 보기",
    favorite: "즐겨찾기",
    share: "공유",
    call: "전화",
    callLong: "전화 걸기",
    addToPoll: "투표에 추가",
    more: "더 보기",
    moreLabel: "다른 행동 더 보기",
    kakaoMap: "카카오맵에서 보기",
  },

  /** 제보 진입점 (PLACE-05) */
  report: {
    title: "정보가 다른가요?",
    closed: "문 닫았어요",
    price: "가격이 달라요",
    wrong: "정보가 틀려요",
  },

  toasts: {
    favoriteOn: "즐겨찾기에 담았습니다",
    favoriteOff: "즐겨찾기에서 뺐습니다",
  },

  /** 4상태 */
  states: {
    loading: { label: "식당 정보를 불러오는 중입니다" },
    error: {
      title: "식당 정보를 불러오지 못했습니다",
      body: "잠시 후 다시 시도해 주세요.",
      retry: "다시 시도",
      naver: "네이버 지도에서 보기",
    },
    name: {
      title: "이름을 불러오지 못했습니다",
      body: "후기와 가격 정보는 그대로 볼 수 있습니다.",
      walkUnknown: "알 수 없음",
    },
    offline: {
      title: "인터넷에 연결되어 있지 않습니다",
      body: "연결 전에 불러온 정보입니다.",
    },
  },
} as const;
