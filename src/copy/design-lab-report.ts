// 제보와 신고 입력 시안 문구 (T6.3, /design-lab/report/c, D-13에서 C를 골라 A, B 문구는 지움). DEAL-01~04, PLACE-05, PLACE-07, MOD-01, MOD-04, MOD-05.
// 상태 안내, 결과, 오류, 정책은 습니다체, 질문, 제안, 감사는 해요체 (tasks.md 2.2절, copy-guide 4.12).
// 웨이팅 단계 라벨과 제보 3종 라벨은 badges.ts, place.ts 값을 쓴다. 시안을 고른 뒤(T6.4) 실제 구현 때 src/copy/report.ts로 옮긴다.

export const reportLabCopy = {
  names: {
    c: "시안 C 한 질문씩",
  },
  index: {
    title: "제보와 신고 입력 시안 (T6.3)",
    body: "고른 C안(한 질문씩)만 남겼습니다. 할인 제보, 할인 확인, 웨이팅 한 탭, 식당 정보 제보, 후기 신고를 flow 쿼리로 고릅니다.",
  },

  /** 상세 틀 (D-10 식당 상세를 줄여 그린 배경) */
  frame: {
    close: "상세 닫기",
    directions: "길찾기",
    favorite: "즐겨찾기",
    priceTitle: "가격",
    thumbsTitle: "만족도",
    reviewsTitle: "후기",
    nowTitle: "지금",
    foldsHeading: "자세히",
    reviewsCount: (n: number) => `후기 ${n}건`,
    priceMedian: (n: number) => `제보 ${n}건 가운데 값`,
    nowSummaryDeals: (n: number) => `할인 ${n}건`,
    loading: "식당 정보를 불러오는 중입니다",
  },

  /** 더 보기 메뉴 안 제보 묶음 */
  menu: {
    dealEntry: "할인 정보 알리기",
  },

  /** 할인 (DEAL-01~04) */
  deal: {
    sectionTitle: "할인 정보",
    entry: "할인 정보 알리기",
    sourceBadge: "제보",
    sourceBadgeSr: "사용자 제보",
    notice: "사용자가 제보한 정보라 실제와 다를 수 있습니다.",
    noScore: "할인 정보는 추천 순서에 쓰지 않습니다.",
    empty: "아직 알려진 할인 정보가 없습니다.",
    justNow: "방금 제보",
    meta: (reported: string, until: string) => `${reported}, ${until}까지`,
    types: {
      lunchSpecial: "점심특선",
      discount: "할인",
      event: "오픈, 기념 이벤트",
      happyHour: "해피아워",
      etc: "기타",
    },
    placeholders: {
      lunchSpecial: "예: 순대국 정식 9천 원",
      discount: "예: 포장하면 1천 원 할인",
      event: "예: 오픈 기념 음료 한 잔 무료",
      happyHour: "예: 오후 5시~7시 생맥주 반값",
      etc: "예: 도장 10개 모으면 한 그릇 무료",
    },

    // 등록 폼
    formTitle: "할인 정보 알리기",
    typeLabel: "유형",
    textCount: (n: number) => `${n}/60`,
    textCountSr: (n: number) => `60자 중 ${n}자`,
    untilLabel: "언제까지",
    untilDate: (date: string) => `${date}까지`,
    whenLabel: "요일과 시간",
    whenOptional: "선택",
    whenAny: "언제든",
    daysLabel: "요일",
    slotsLabel: "시간대",
    days: ["월", "화", "수", "목", "금", "토", "일"],
    weekdays: "평일",
    slots: {
      lunch: "점심",
      afternoon: "오후",
      dinner: "저녁",
    },
    slotHints: {
      lunch: "11~15시",
      afternoon: "15~17시",
      dinner: "17시부터",
    },
    submit: "제보하기",
    next: "다음",
    back: "이전 질문으로",
    stepOf: (n: number, total: number) => `${total}단계 중 ${n}단계`,

    // C 질문
    qType: "어떤 정보인가요?",
    qText: "무엇을 하나요?",
    qTextSuggest: "이렇게 적을까요?",
    qWhen: "언제까지 하나요?",
    qWhenLead: "모르면 그대로 두세요. 7일 뒤 자동으로 내려갑니다.",
    qConfirm: "이대로 알릴까요?",

    // 중복 병합 (DEAL-04)
    dupTitle: "이미 제보된 정보가 있습니다",
    dupBody: (type: string) =>
      `이 식당에는 ${type} 제보가 이미 있습니다. 같은 내용이면 아직 해요로 확인할까요?`,
    dupConfirm: "아직 해요로 확인",
    dupNew: "다른 내용이라 새로 남기기",
    dupMerged: "같은 식당 같은 유형 제보는 하나로 모아 보여 줍니다.",
    mergedBody: "확인이 쌓일수록 다른 분들이 믿고 볼 수 있습니다.",

    // 결과
    doneTitle: "할인 정보를 남겼습니다",
    doneBody: (until: string) => `${until}까지 상세에 보입니다.`,
    mergedToast: "기존 제보에 아직 해요로 더했습니다.",
  },

  /** 할인 최신성 확인 (DEAL-03) */
  check: {
    still: "아직 해요",
    ended: "끝났어요",
    stillCount: (n: number) => `${n}명이 아직 한다고 했습니다.`,
    stillCountWithMe: (n: number) => `나를 포함해 ${n}명이 아직 한다고 했습니다.`,
    endedDone: "끝났다고 알렸습니다. 3명이 알리면 숨겨집니다.",
    endedTally: (n: number) => `끝났어요 3명 중 ${n}명`,
    undo: "되돌리기",
    reportDeal: "이 할인 정보 신고",
  },

  /** 웨이팅 한 탭 (PLACE-07) */
  wait: {
    ask: "지금 줄이 어떤가요?",
    none: "최근 30분 동안 웨이팅 제보가 없습니다.",
    justNow: (level: string) => `방금, ${level}`,
    cooldown: (time: string) => `${time}부터 다시 알릴 수 있습니다.`,
    cooldownMine: (minutes: number, level: string) =>
      `내 제보 ${minutes}분 전, ${level}`,
    ringLabel: (left: number) => `내 제보가 ${left}분 더 보입니다`,
    ringLeft: (left: number) => `${left}분`,
    ringCaption: "남음",
    undo: "취소",
    peakNote: "줄 길어요는 점심 피크에 추천 순서를 조금 낮춥니다.",
    group: "웨이팅 알리기",
  },

  /** 식당 정보 제보 (PLACE-05, MOD-03) */
  place: {
    title: "정보가 다른가요?",
    qDetail: {
      closed: "어떻게 닫았나요?",
      price: "1인 얼마였나요?",
      wrong: "어떤 정보가 틀렸나요?",
    },
    closedOptions: {
      gone: "아예 닫았어요",
      moved: "다른 곳으로 옮겼어요",
      today: "오늘만 쉬어요",
    },
    priceLabel: "1인 가격",
    priceUnit: "원",
    pricePlaceholder: "예: 11000",
    wrongOptions: {
      name: "이름",
      location: "위치",
      phone: "전화번호",
      category: "음식 종류",
    },
    closedNote: "서로 다른 세 분이 알리면 추천에서 뺍니다.",
    submit: "보내기",
    submitSkip: "건너뛰고 보내기",
    doneTitle: "제보를 받았습니다",
    doneBody: "다른 분들의 제보와 함께 확인해서 반영합니다.",
  },

  /** 후기 신고 (MOD-01, DEAL-04) */
  reportReview: {
    title: "후기 신고",
    titleDeal: "할인 정보 신고",
    reviewMenu: (nickname: string) => `${nickname} 후기 신고`,
    qReason: "어떤 문제인가요?",
    reasonLabel: "신고 사유",
    reasons: {
      adSpam: "광고, 스팸",
      abuse: "욕설, 비방",
      privacy: "개인정보",
      false: "허위",
      etc: "기타",
      adFalse: "광고성, 허위",
    },
    reasonHints: {
      adSpam: "가게 홍보나 같은 글 반복",
      abuse: "사람이나 가게를 깎아내리는 말",
      privacy: "이름, 연락처처럼 누군지 알 수 있는 정보",
      false: "사실과 다른 내용",
      etc: "위에 없는 문제",
      adFalse: "가게 홍보 목적이거나 사실과 다른 할인",
    },
    etcLabel: "무엇이 문제인지 (선택)",
    confirmLine: (reason: string) => `${reason} 사유로 신고합니다`,
    note: "신고한 분은 알리지 않습니다. 세 분이 신고하면 바로 가리고 검토합니다.",
    submit: "신고하기",
    doneTitle: "신고를 받았습니다",
    doneBody: "검토한 뒤 처리합니다. 이 후기는 이제 나에게 보이지 않습니다.",
    hiddenForMe: "신고한 후기입니다. 나에게는 가려 둡니다.",
    show: "보기",
  },

  /** 오류와 한도 (MOD-04, MOD-05, DEAL-04, PLACE-07) */
  errors: {
    limitDealTitle: "오늘은 할인 제보를 더 남길 수 없습니다",
    limitDealBody:
      "할인 제보는 하루 10건까지입니다. 내일 다시 알려 주세요. 이미 있는 정보에는 아직 해요를 누를 수 있습니다.",
    limitReportTitle: "오늘은 신고를 더 남길 수 없습니다",
    limitReportBody:
      "신고와 제보는 하루 30건까지입니다. 급한 문제는 나 탭의 문의하기로 알려 주세요.",
    bannedWord: "쓸 수 없는 표현이 있습니다. 표현을 바꿔 다시 보내 주세요.",
    sendFailed: "보내지 못했습니다",
    sendFailedBody: "입력한 내용은 그대로 두었습니다. 다시 보내 주세요.",
    retry: "다시 보내기",
    offlineTitle: "인터넷에 연결되어 있지 않습니다",
    offlineBody: "연결되면 보낼 수 있습니다. 쓰던 내용은 그대로 둡니다.",
    offlineButton: "연결되면 보낼 수 있습니다",
    close: "닫기",
    thanks: "고마워요",
    loading: "제보 화면을 준비하는 중입니다",
  },
} as const;
