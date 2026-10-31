// 지도와 바텀시트 시안 문구 (T5.1, PRD MAP-01~06, PLACE-01~04). 컴포넌트 안에 문장을 직접 쓰지 않는다 (CLAUDE.md 4장).
// 문체 (tasks.md 2.2절): 상태, 결과, 설명, 오류는 습니다체, 제안과 질문은 해요체. 버튼, 칩, 라벨은 명사형.
// 시안 확인 화면 /design-lab/map/<a|b|c> 전용이다. 실제 지도 탭 문구는 src/copy/map.ts(T5.26~T5.32)로 옮긴다.
import { commonCopy } from "./common";
import { homeCopy } from "./home";

export const mapLabCopy = {
  metaTitle: "지도 시안",
  names: {
    a: "A 그림 핀과 3단 시트",
    b: "B 도보 분 알약과 2단 시트",
    c: "C 점 마커와 카드 넘기기",
  },
  /** 화면 제목(보조 기술용 h1) */
  screenTitle: "주변 식당 지도",

  /** 기준 위치 칩 (MAP-01) */
  base: {
    office: "회사 근처",
    label: (name: string) => `기준 위치 ${name}`,
  },
  /** 목록 머리의 개수. 카카오 상한(15건 x 3페이지)에 닿으면 "45곳 이상" */
  count: (minutes: number, n: number) =>
    n >= 45 ? `도보 ${minutes}분 안 45곳 이상` : `도보 ${minutes}분 안 ${n}곳`,
  sortHint: "가까운 순",

  /** 필터 (MAP-03) */
  filters: {
    label: "식당 거르기",
    category: "카테고리",
    categoryAll: "전체",
    categoryGroup: "카테고리 고르기",
    price: "1만 원 이하",
    walk: "도보 5분 안",
    top: "👍 상위",
    favorites: "즐겨찾기",
    open: "필터",
    openWithCount: (n: number) => `필터, ${n}개 적용됨`,
    sheetTitle: "필터",
    sheetBody: "조건을 고르면 지도와 목록이 함께 바뀝니다.",
    categoryTitle: "카테고리",
    priceTitle: "가격대",
    walkTitle: "걷는 시간",
    moreTitle: "더 고르기",
    priceOptions: { any: "상관없음", under10k: "1만 원 이하" },
    walkOptions: { any: "10분 안", under5: "5분 안" },
    reset: "모두 풀기",
    apply: (n: number) => `${n}곳 보기`,
    applyNone: "맞는 곳 없음",
    close: commonCopy.actions.close,
  },

  /** 지도 조작 (MAP-05) */
  research: "이 지역에서 다시 찾기",
  researched: "이 지역 식당을 다시 찾았습니다.",
  myLocation: "현위치로 지도 옮기기",
  myLocationDone: "지도를 현위치로 옮겼습니다. 기준 위치는 그대로입니다.",
  mapLabel: "식당 지도",
  mapKeysHint:
    "방향키로 지도를 움직입니다. 식당은 지도 아래 목록에서도 고를 수 있습니다.",
  markerLabel: (name: string, category: string, walk: number) =>
    `${name}, ${category}, 도보 약 ${walk}분`,
  clusterLabel: (n: number) => `식당 ${n}곳이 모인 곳, 눌러서 펼치기`,
  clusterUnit: "곳",
  clusterOpened: (n: number) => `식당 ${n}곳을 펼쳤습니다.`,
  officeLabel: "기준 위치",
  selected: (name: string) => `${name}, 선택됨`,

  /** 시트 (MAP-04) */
  sheet: {
    label: "주변 식당",
    snapGroup: "시트 높이",
    snaps: { peek: "작게", half: "반쯤", full: "끝까지" },
    snapAnnounce: {
      peek: "시트를 작게 내렸습니다.",
      half: "시트를 반쯤 열었습니다.",
      full: "시트를 끝까지 열었습니다.",
    },
    raise: "시트 올리기",
    lower: "시트 내리기",
  },

  list: {
    title: "주변 식당",
    back: "목록으로",
  },

  numbers: {
    walk: "도보",
    walkUnit: "분",
    price: "가격",
    thumbs: "👍",
    thumbsUnit: "%",
    thumbsEmpty: homeCopy.thumbsUpEmpty,
    estimate: "추정",
  },

  actions: {
    directions: "길찾기",
    detail: "자세히",
    close: commonCopy.actions.close,
    prev: "이전 식당",
    next: "다음 식당",
  },

  /** 끝까지 열림: 상세 내용 자리 (식당 상세 시안 T5.2가 채운다) */
  detail: {
    title: "상세 내용 자리",
    body: "식당 상세 시안(T5.2)이 이 자리에 들어옵니다. 기본 정보, 가격대, 👍 비율, 태그, 후기, 버튼이 여기에 놓입니다.",
    blocks: ["기본 정보와 전화", "가격대와 👍 비율", "태그와 후기", "버튼 줄"],
  },

  carousel: {
    label: "주변 식당 카드",
    position: (i: number, n: number) => `${n}곳 중 ${i}번째`,
  },

  states: {
    loading: "지도와 주변 식당을 불러오는 중입니다",
    empty: {
      title: (minutes: number) =>
        `도보 ${minutes}분 안에 조건에 맞는 식당이 없습니다.`,
      body: (minutes: number) => `${minutes}분까지 넓혀볼까요?`,
      action: (minutes: number) => `${minutes}분까지 넓히기`,
      filteredTitle: "고른 조건에 맞는 식당이 없습니다.",
      filteredBody: "필터를 하나 풀어볼까요?",
      filteredAction: "필터 모두 풀기",
    },
    mapError: {
      title: "지도를 불러오지 못해 목록으로 보여 드립니다.",
      body: "식당 정보는 그대로 볼 수 있습니다. 잠시 뒤 지도를 다시 불러와 주세요.",
      retry: "지도 다시 불러오기",
    },
    offline: {
      title: "인터넷에 연결되어 있지 않습니다.",
      body: "연결되면 주변 식당을 다시 찾습니다.",
      action: commonCopy.actions.retry,
      map: "지도를 불러올 수 없습니다",
    },
  },

  /** 디자인 랩 목록 페이지 */
  index: {
    title: "지도와 바텀시트 시안 (T5.1)",
    body: "마커 모양, 필터 칩 위치, 시트 높이 단계가 서로 다른 세 안입니다. 쿼리: ?state=, ?select=, ?snap=, ?filter=open, ?moved=1",
  },
} as const;
