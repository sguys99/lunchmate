// 식당 메모 시안 문구 (T10.15, D-32, /design-lab/memo/<a|b|c>). 실제 화면은 상세 시트, 홈 카드, 나 탭 즐겨찾기.
// 문체: 상태, 정책, 오류, 결과, 설명은 습니다체. 질문과 제안은 해요체. 버튼, 칩, 라벨은 명사형(비율 제외).
// 목업 식당 이름은 design-lab/mock의 지어낸 이름이다. 메모 예시는 사용자가 직접 쓴 글을 흉내 낸 것이고 장소명을 담지 않는다.
import { historyCopy } from "./history";
import { moderationCopy } from "./moderation";
import { placeCopy } from "./place";

/** 메모 길이 상한(기본안, 비교 문서 안건 2) */
export const MEMO_MAX = 40;

export const memoLabCopy = {
  names: {
    a: "메모 시안 A 상세 안 한 줄",
    b: "메모 시안 B 이름표 시트",
    c: "메모 시안 C 즐겨찾기 이름표",
  },
  index: {
    title: "식당 메모 시안 (T10.15)",
    body: "나만 보는 식당 메모를 쓰는 곳, 보이는 곳, 이름을 불러오지 못할 때의 대체 표시입니다. ?view=detail|home|favorites|outage, ?edit=1 로 화면을 바꿉니다.",
  },

  memo: {
    label: "내 메모",
    add: "메모 남기기",
    edit: "고치기",
    save: "저장",
    saving: "저장하는 중",
    cancel: "취소",
    remove: "메모 지우기",
    placeholder: "예: 깍두기가 맛있는 곳",
    privacy: "나만 볼 수 있습니다.",
    sheetTitle: "내 메모",
    sheetBody: "나만 보는 메모입니다. 이 식당이 다시 추천되거나 즐겨찾기에서 볼 때 함께 보입니다.",
    count: (n: number, max: number) => `${n}/${max}`,
    countLabel: (n: number, max: number) => `${max}자 가운데 ${n}자`,
    tooLong: (max: number) => `${max}자까지 쓸 수 있습니다.`,
    saved: "메모를 저장했습니다.",
    removed: "메모를 지웠습니다.",
    addLabel: (name: string) => `${name} 메모 남기기`,
    editLabel: (name: string) => `${name} 메모 고치기`,
    close: "닫기",
  },

  /** C안: 즐겨찾기 이름표 */
  tag: {
    label: "이름표",
    ask: "즐겨찾기에 넣었습니다. 이름표를 달아 둘까요?",
    later: "나중에",
    manage: "이름표 정리",
    done: "완료",
    add: "이름표 달기",
    inputLabel: (title: string) => `${title} 이름표`,
    needFavorite: "이름표는 즐겨찾기한 식당에만 달 수 있습니다.",
  },

  states: {
    loading: "메모를 불러오는 중입니다.",
    saveFailed: "메모를 저장하지 못했습니다. 쓴 내용은 그대로 있으니 다시 저장해 주세요.",
    banned: moderationCopy.banned,
    limit: "오늘은 메모를 30번 저장했습니다. 내일 다시 고칠 수 있습니다.",
    offline: "인터넷에 연결되어 있지 않아 메모를 고칠 수 없습니다. 연결되면 다시 시도해 주세요.",
    retry: "다시 저장",
    loadFailed: "메모를 불러오지 못했습니다.",
  },

  /** 카카오 장애나 이름 확인 실패 때 이름 자리 대체 */
  fallback: {
    note: "카카오에서 이름을 불러오지 못해 내 메모로 보여 드립니다.",
    noMemo: placeCopy.nameUnresolved,
    body: placeCopy.detail.nameUnresolvedBody,
    kakaoMap: placeCopy.openKakaoMap,
    listNote: historyCopy.unresolved.note,
    saved: historyCopy.unresolved.saved,
  },

  /** 홈 목업 */
  home: {
    title: "오늘의 추천",
    date: "11월 2일 월요일 점심",
    eyebrow: "오늘의 한 곳",
    detail: "상세",
    directions: "길찾기",
    justPick: "그냥 골라줘",
    reroll: "다시 뽑기",
    alternatives: "또는 이 두 곳",
    memoBadge: (memo: string) => `내 메모 ${memo}`,
    outageTitle: "추천을 불러오지 못했습니다",
    outageBody: "카카오 장소 검색이 잠시 응답하지 않습니다. 잠시 뒤 다시 시도해 주세요.",
    outageRetry: "다시 시도",
    outageNaver: "네이버 지도에서 주변 식당 보기",
    pickFromFavorites: "즐겨찾기에서 고르기",
    pickFromFavoritesNote: "이름표를 단 즐겨찾기만 보입니다. 누르면 카카오맵에서 엽니다.",
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

  /** 나 탭 목업 */
  me: {
    greeting: historyCopy.greeting("test_민지"),
    title: historyCopy.title,
    tabs: [historyCopy.tabs.history, historyCopy.tabs.places, historyCopy.tabs.reviews],
    tabsLabel: historyCopy.tabs.label,
    favorites: historyCopy.places.favorites,
    count: historyCopy.places.count,
    savedOn: historyCopy.places.savedOn,
    toggle: (name: string) => `${name} 즐겨찾기`,
  },
} as const;
