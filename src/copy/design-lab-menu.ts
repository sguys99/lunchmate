// 메뉴 제보 시안 문구 (T10.16b, D-34, /design-lab/menu/<a|b|c>). 실제 화면은 홈 카드, 상세 시트, 식후 피드백 시트, 메뉴 알려주기 시트.
// 문체: 상태, 정책, 오류, 결과, 설명은 습니다체. 질문과 제안은 해요체. 버튼, 칩, 라벨은 명사형(비율 제외).
// 목업 식당 이름은 design-lab/mock의 지어낸 이름이다. 메뉴 이름과 가격은 사용자가 직접 쓴 제보를 흉내 낸 값이다.
import { moderationCopy } from "./moderation";
import { placeCopy } from "./place";

/** 메뉴 이름 길이 상한(PRD MENU-01, 코드 포인트) */
export const MENU_NAME_MAX = 20;

export const menuLabCopy = {
  names: {
    a: "메뉴 시안 A 가격 칸에 대표 메뉴",
    b: "메뉴 시안 B 이유 아래 메뉴 줄",
    c: "메뉴 시안 C 상세 메뉴판",
  },
  index: {
    title: "메뉴 제보 시안 (T10.16b)",
    body: "대표 메뉴와 메뉴별 가격을 보이는 곳, 남기는 곳입니다. ?view=home|detail|feedback|report, ?edit=1, ?fail=save|banned|limit 로 화면을 바꿉니다.",
  },

  menu: {
    /** 피드백 시트 질문 */
    ask: "뭐 드셨어요?",
    askHint: "고르면 그 메뉴 가격에서 시작합니다.",
    typed: "직접 쓰기",
    nameLabel: "메뉴 이름",
    namePlaceholder: "예: 김치찌개",
    priceLabel: "가격",
    priceUnit: "원",
    priceDecrease: "500원 내리기",
    priceIncrease: "500원 올리기",
    count: (n: number, max: number) => `${n}/${max}`,
    countLabel: (n: number, max: number) => `${max}자 가운데 ${n}자`,
    tooLong: (max: number) => `${max}자까지 쓸 수 있습니다.`,
    reports: (n: number) => `제보 ${n}`,
    reportsLabel: (n: number) => `제보 ${n}건`,
    popular: "많이 먹는 메뉴",
    title: "메뉴",
    boardTitle: "메뉴판",
    boardMeta: (n: number, month: string) => `제보 ${n}건 기준, 최근 ${month}`,
    boardNote: "먹어 본 사람이 알려 준 메뉴와 가격입니다. 실제와 다를 수 있습니다.",
    add: "메뉴 알려주기",
    addShort: "알려주기",
    addRow: "한 줄 더하기",
    addLabel: (name: string) => `${name} 메뉴 알려주기`,
    sheetTitle: "메뉴 알려주기",
    sheetBody: "먹어 본 메뉴와 가격을 알려 주세요. 이름 없이 메뉴 목록에 들어갑니다.",
    save: "알려주기",
    saving: "보내는 중",
    saved: "메뉴를 알려 주셔서 고맙습니다.",
    cancel: "취소",
    close: "닫기",
    done: "고르기",
    naver: "네이버 플레이스에서 전체 메뉴 보기",
    emptyTitle: "아직 알려진 메뉴가 없습니다.",
    emptyBody: "처음으로 알려 주시면 다음 사람이 메뉴를 보고 고를 수 있습니다.",
    needPrice: "메뉴를 고르면 가격도 함께 남겨 주세요.",
    priceOnly: "메뉴 없이 가격만 남겨도 됩니다.",
  },

  states: {
    loading: "메뉴를 불러오는 중입니다.",
    saveFailed: "보내지 못했습니다. 쓴 내용은 그대로 있으니 다시 눌러 주세요.",
    banned: moderationCopy.banned,
    limit: "오늘은 메뉴를 20번 알려 주셨습니다. 내일 다시 알려 주세요.",
    offline: "인터넷에 연결되어 있지 않아 메뉴를 남길 수 없습니다. 연결되면 다시 시도해 주세요.",
    retry: "다시 보내기",
  },

  /** 홈 목업 */
  home: {
    title: "오늘의 추천",
    date: "11월 3일 화요일 점심",
    eyebrow: "오늘의 한 곳",
    detail: "상세",
    directions: "길찾기",
    justPick: "그냥 골라줘",
    alternatives: "또는 이 두 곳",
  },

  /** 상세 목업 */
  detail: {
    close: placeCopy.detail.close,
    directions: "길찾기",
    favorite: (name: string) => `${name} 즐겨찾기`,
    more: "다른 행동 더 보기",
    myVisit: placeCopy.detail.myVisit("10월 24일", "up"),
    walk: placeCopy.numbers.walk,
    price: placeCopy.numbers.price,
    thumbs: placeCopy.numbers.thumbs,
    folds: ["가격", "만족도", "태그", "후기", "지금"],
  },

  /** 식후 피드백 시트 목업 (D-11 B 한 장 시트) */
  feedback: {
    title: (name: string) => `${name} 어땠어요?`,
    rating: "만족",
    ratingUp: "좋았어요",
    price: "1인 가격",
    tags: "태그",
    body: "한 줄 후기",
    tagsValue: "혼밥 OK, 15분 컷",
    bodyEmpty: "남기지 않음",
    save: "저장",
    saving: "저장하는 중",
    saved: "남겨 주셔서 고맙습니다.",
    menuRow: "먹은 메뉴",
    menuEmpty: "고르지 않음",
  },
} as const;
