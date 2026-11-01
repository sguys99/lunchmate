// 제보, 신고, 할인 라벨 (T6.15, T6.16, T6.19~T6.24, PLACE-05, PLACE-07, MOD-01, DEAL-01~04, D-13).
// DB 값(src/features/report/labels.ts)과 화면 라벨을 잇는다. 라벨은 명사형이라 문체 비율에서 빠진다.
// 질문, 결과 줄 같은 화면 문장은 각 화면 작업에서 이 파일에 더한다. 웨이팅 단계 라벨은 badges.ts waitingLevels.
import type {
  ClosedDetail,
  DealReportReason,
  DealSlot,
  DealType,
  InfoField,
  PlaceReportKind,
  ReviewReportReason,
} from "@/features/report/labels";

export const reportLabels = {
  reviewReasons: {
    spam: "광고, 스팸",
    abuse: "욕설, 비방",
    privacy: "개인정보",
    false: "허위",
    other: "기타",
  } satisfies Record<ReviewReportReason, string>,
  dealReasons: {
    ad_false: "광고성, 허위",
    abuse: "욕설, 비방",
    privacy: "개인정보",
    other: "기타",
  } satisfies Record<DealReportReason, string>,
  placeKinds: {
    closed: "문 닫았어요",
    price: "가격이 달라요",
    info: "정보가 틀려요",
  } satisfies Record<PlaceReportKind, string>,
  closedDetails: {
    gone: "아예 닫았어요",
    moved: "다른 곳으로 옮겼어요",
    today: "오늘만 쉬어요",
  } satisfies Record<ClosedDetail, string>,
  infoFields: {
    name: "이름",
    location: "위치",
    phone: "전화번호",
    category: "음식 종류",
  } satisfies Record<InfoField, string>,
  dealTypes: {
    lunch_special: "점심특선",
    discount: "할인",
    event: "개업, 기념 이벤트",
    happy_hour: "해피아워",
    other: "기타",
  } satisfies Record<DealType, string>,
  dealSlots: {
    lunch: "점심",
    afternoon: "오후",
    dinner: "저녁",
  } satisfies Record<DealSlot, string>,
  /** 월(0)~일(6) */
  dealDays: ["월", "화", "수", "목", "금", "토", "일"],
  dealCheck: {
    still: "아직 해요",
    ended: "끝났어요",
  },
} as const;

/** 할인 종료일 빠른 칩 (D-13: 3일, 7일 기본, 2주, 30일) */
const untilOptions = [
  { days: 3, label: "3일" },
  { days: 7, label: "7일" },
  { days: 14, label: "2주" },
  { days: 30, label: "30일" },
] as const;

/**
 * 제보와 신고 화면 문장 (D-13, DESIGN.md 5장 "제보와 신고").
 * 상태 안내, 결과, 오류, 정책은 습니다체, 질문과 감사는 해요체(tasks.md 2.2절, copy-guide 4.12).
 * 한도와 금칙어, 쓰기 오류 문장은 src/copy/moderation.ts를 쓴다.
 */
export const reportCopy = {
  /** 질문 시트 공통 */
  sheet: {
    close: "닫기",
    back: "이전 질문으로",
    next: "다음",
    stepOf: (n: number, total: number) => `${total}단계 중 ${n}단계`,
    thanks: "고마워요",
    sending: "보내는 중",
    loading: "제보 화면을 준비하는 중입니다",
    loadFailed: "제보 화면을 열지 못했습니다",
    loadFailedBody: "연결을 확인한 뒤 다시 열어 주세요.",
    offlineTitle: "인터넷에 연결되어 있지 않습니다",
    offlineBody: "연결되면 보낼 수 있습니다. 고른 내용은 그대로 둡니다.",
    offlineButton: "연결되면 보낼 수 있습니다",
    /** 오프라인에서 쓰기 버튼을 눌렀을 때 */
    offlineToast: "인터넷에 연결되면 남길 수 있습니다.",
    optional: "선택",
  },

  /** 할인 (DEAL-01~04) */
  deal: {
    sectionTitle: "할인 정보",
    entry: "할인 정보 알리기",
    empty: "아직 알려진 할인 정보가 없습니다.",
    /** "지금" 행 요약 */
    summaryCount: (n: number) => `할인 ${n}건`,
    loadFailed: "할인 정보를 불러오지 못했습니다.",
    retry: "다시 불러오기",
    sourceBadge: "제보",
    sourceBadgeSr: "사용자 제보",
    notice: "사용자가 제보한 정보라 실제와 다를 수 있습니다.",
    noScore: "할인 정보는 추천 순서에 쓰지 않습니다.",
    reportedToday: "오늘 제보",
    reportedAgo: (days: number) => `${days}일 전 제보`,
    untilToday: "오늘까지",
    until: (date: string) => `${date}까지`,
    meta: (reported: string, until: string) => `${reported}, ${until}`,
    mine: (n: number) =>
      n > 0
        ? `내가 남긴 제보입니다. ${n}명이 아직 한다고 했습니다.`
        : "내가 남긴 제보입니다.",
    placeholders: {
      lunch_special: "예: 순대국 정식 9천 원",
      discount: "예: 포장하면 1천 원 할인",
      event: "예: 개업 기념 음료 한 잔 무료",
      happy_hour: "예: 오후 5시~7시 생맥주 반값",
      other: "예: 도장 10개 모으면 한 그릇 무료",
    },

    // 질문
    formTitle: "할인 정보 알리기",
    qType: "어떤 정보인가요?",
    qText: "무엇을 하나요?",
    qConfirm: "이대로 알릴까요?",
    textCount: (n: number, max: number) => `${n}/${max}`,
    textCountSr: (n: number, max: number) => `${max}자 중 ${n}자`,
    textRequired: "내용을 적으면 다음으로 넘어갑니다.",

    // 확인 카드의 언제
    whenAny: "언제든",
    weekdays: "평일",
    weekend: "주말",
    summary: (until: string, when: string) => `${until}, ${when}`,
    edit: "바꾸기",
    editLabel: "언제까지와 요일, 시간대 바꾸기",
    untilLabel: "언제까지",
    untilOptions,
    untilPick: "날짜 고르기",
    untilPickLabel: "끝나는 날",
    untilHint:
      "최대 30일까지 고를 수 있습니다. 날짜가 지나면 자동으로 내려갑니다.",
    daysLabel: "요일",
    slotsLabel: "시간대",
    slotHints: {
      lunch: "11~15시",
      afternoon: "15~17시",
      dinner: "17시부터",
    },
    submit: "제보하기",

    // 중복 (DEAL-04, D-13 안건 2, 3)
    dupTitle: "이미 제보된 정보가 있습니다",
    dupBody: (type: string) =>
      `이 식당에는 ${type} 제보가 이미 있습니다. 같은 내용이면 "아직 해요"로 확인할까요?`,
    dupConfirm: "아직 해요로 확인",
    dupNew: "다른 내용이라 새로 남기기",
    dupMerged:
      "같은 식당 같은 유형 제보는 하나로 모아 보여 줍니다. 새로 남기면 기존 제보 대신 새 제보가 보입니다.",

    // 결과
    doneTitle: "할인 정보를 남겼습니다",
    doneBody: (until: string) => `${until} 상세에 보입니다.`,
    mergedTitle: '기존 제보에 "아직 해요"를 더했습니다',
    mergedBody: "확인이 쌓일수록 다른 분들이 믿고 볼 수 있습니다.",
  },

  /** 아직 해요 / 끝났어요 (DEAL-03) */
  check: {
    stillCount: (n: number) =>
      n > 0 ? `${n}명이 아직 한다고 했습니다.` : "아직 확인한 사람이 없습니다.",
    stillDone: (n: number) =>
      `아직 한다고 알렸습니다. 나를 포함해 ${n}명이 아직 한다고 했습니다.`,
    endedDone: "끝났다고 알렸습니다. 3명이 알리면 숨겨집니다.",
    endedTally: (n: number) => `끝났어요 3명 중 ${n}명`,
    undo: "되돌리기",
    reportDeal: "이 할인 정보 신고",
  },

  /** 웨이팅 한 탭 (PLACE-07, D-13 안건 8, 14, 15) */
  wait: {
    ask: "지금 줄이 어떤가요?",
    group: "웨이팅 알리기",
    doneLine: (time: string) =>
      `${time}에 알렸습니다. 30분 동안 다른 분들께 보입니다.`,
    undo: "취소",
    undone: "웨이팅 제보를 취소했습니다.",
    peakNote: '"줄 길어요"는 점심 피크에 추천 순서를 조금 낮춥니다.',
    clock: (hour: number, minute: number) => `${hour}시 ${minute}분`,
  },

  /** 식당 정보 제보 (PLACE-05, MOD-03) */
  place: {
    qDetail: {
      closed: "어떻게 닫았나요?",
      price: "1인 얼마였나요?",
      info: "어떤 정보가 틀렸나요?",
    },
    closedNote: "서로 다른 세 분이 알리면 추천에서 뺍니다.",
    priceLabel: "1인 가격",
    priceUnit: "원",
    pricePlaceholder: "예: 11000",
    priceRange: "1,000원에서 100,000원 사이로 적어 주세요.",
    priceNote:
      "가격 제보는 관리자가 확인하고, 식당 가격 집계에는 넣지 않습니다.",
    submit: "보내기",
    submitSkip: "건너뛰고 보내기",
    doneTitle: "제보를 받았습니다",
    doneBody: "다른 분들의 제보와 함께 확인해서 반영합니다.",
  },

  /** 후기 신고, 할인 신고 (MOD-01, DEAL-04) */
  flag: {
    titleReview: "후기 신고",
    titleDeal: "할인 정보 신고",
    qReason: "어떤 문제인가요?",
    reasonLabel: "신고 사유",
    reviewHints: {
      spam: "식당 홍보나 같은 글 반복",
      abuse: "사람이나 식당을 깎아내리는 말",
      privacy: "이름, 연락처처럼 누구인지 알 수 있는 정보",
      false: "사실과 다른 내용",
      other: "위에 없는 문제",
    },
    dealHints: {
      ad_false: "식당 홍보 목적이거나 사실과 다른 할인",
      abuse: "사람이나 식당을 깎아내리는 말",
      privacy: "이름, 연락처처럼 누구인지 알 수 있는 정보",
      other: "위에 없는 문제",
    },
    etcLabel: "무엇이 문제인지 (선택)",
    etcCountSr: (n: number, max: number) => `${max}자 중 ${n}자`,
    confirmLine: (reason: string) => `${reason} 사유로 신고합니다`,
    note: "신고한 분은 알리지 않습니다. 세 분이 신고하면 바로 가리고 검토합니다.",
    submit: "신고하기",
    doneTitle: "신고를 받았습니다",
    doneBodyReview:
      "검토한 뒤 처리합니다. 이 후기는 이제 나에게 보이지 않습니다.",
    doneBodyDeal: "검토한 뒤 처리합니다. 세 분이 신고하면 바로 내려갑니다.",
  },
} as const;
