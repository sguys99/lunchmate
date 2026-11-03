// 메뉴 제보 문구 (T10.16, PRD MENU, D-35 조합 A + C). 상세 메뉴판, 그 자리 한 줄 더하기, 식후 피드백 먹은 메뉴 칩, 홈 카드 가운데 칸.
// 문체: 상태, 정책, 오류, 결과, 설명은 습니다체. 질문("뭐 드셨어요?")과 부탁("알려 주세요")은 해요체. 버튼, 칩, 라벨은 명사형(비율 제외).
// Em dash, 중간점 금지. 자리표시자는 장소명이 아닌 일반 예시다(카카오 장소명 미리 채우기 금지, CLAUDE.md 7장).
// 홈 첫 로드에는 card만 실린다(menu-card.ts). 나머지는 상세와 피드백 시트 청크에만 들어간다.
import { MENU_DAILY } from "@/features/menu/model";
import { menuCardCopy } from "./menu-card";
import { moderationCopy } from "./moderation";

export const menuCopy = {
  card: menuCardCopy,

  board: {
    title: "메뉴판",
    meta: (count: number, month: number | null) =>
      month === null ? `제보 ${count}건 기준` : `제보 ${count}건 기준, 최근 ${month}월`,
    reportsLabel: (n: number) => `제보 ${n}건`,
    note: "먹어 본 사람이 알려 준 메뉴와 가격입니다. 실제와 다를 수 있습니다.",
    naver: "네이버 플레이스에서 전체 메뉴 보기",
    emptyTitle: "아직 알려진 메뉴가 없습니다.",
    emptyBody: "처음으로 알려 주시면 다음 사람이 메뉴를 보고 고를 수 있습니다.",
    add: "메뉴 알려주기",
    addRow: "한 줄 더하기",
    addLabel: (name: string) => `${name} 메뉴판 한 줄 더하기`,
    loading: "메뉴를 불러오는 중입니다.",
    loadFailed: "메뉴를 불러오지 못했습니다.",
    thisPlace: "이 식당",
  },

  form: {
    nameLabel: "메뉴 이름",
    placeholder: "예: 김치찌개",
    count: (n: number, max: number) => `${n}/${max}`,
    countLabel: (n: number, max: number) => `${max}자 가운데 ${n}자`,
    tooLong: (max: number) => `${max}자까지 쓸 수 있습니다.`,
    suggest: "이미 있는 메뉴",
    suggestPick: (name: string) => `${name}로 쓰기`,
    priceLabel: "가격",
    priceUnit: "원",
    priceDecrease: "500원 내리기",
    priceIncrease: "500원 올리기",
    cancel: "취소",
    save: "알려주기",
    saving: "보내는 중",
    retry: "다시 보내기",
    saved: "메뉴를 알려 주셔서 고맙습니다.",
  },

  feedback: {
    ask: "뭐 드셨어요?",
    askHint: "고르면 그 메뉴 가격에서 시작합니다.",
    askHintEmpty: "쓰면 가격과 함께 메뉴판에 들어갑니다.",
    typed: "직접 쓰기",
    chip: (name: string, price: string) => `${name} ${price}`,
    menuFailed: "후기는 남겼지만 메뉴를 저장하지 못했습니다. 상세 메뉴판에서 다시 알려 주세요.",
  },

  errors: {
    save: "보내지 못했습니다. 쓴 내용은 그대로 있으니 다시 눌러 주세요.",
    invalid: "메뉴 이름이나 가격에 쓸 수 없는 값이 있습니다. 고친 뒤 다시 눌러 주세요.",
    banned: moderationCopy.banned,
    daily: `오늘은 메뉴를 ${MENU_DAILY}번 알려 주셨습니다. 내일 다시 알려 주세요.`,
    duplicate: "오늘 이미 알려 주신 메뉴입니다.",
    suspended: "이용이 제한된 계정이라 지금은 메뉴를 남길 수 없습니다.",
    unauthenticated: "로그인이 풀렸습니다. 다시 로그인한 뒤 보내 주세요.",
    disabled: "지금은 메뉴를 남길 수 없습니다.",
    offline: "인터넷에 연결되어 있지 않아 메뉴를 남길 수 없습니다. 연결되면 다시 시도해 주세요.",
  },
} as const;
