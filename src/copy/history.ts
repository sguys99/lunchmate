// 나 탭 기록 문구 (T6.13, HIS-01~03, FB-07, D-12, DESIGN.md 5장 "나 탭"). 시안 문구(design-lab-me.ts)를 실제 화면용으로 옮겼다.
// 문체 (tasks.md 2.2절, copy-guide): 상태 안내, 결과, 설명, 오류는 습니다체, 질문과 제안은 해요체. 라벨은 명사형이라 비율에서 빠진다.
// 이름 해석 실패 대체 문구(날짜와 끼니, 순번)는 DESIGN.md가 copy/place.ts(T5.12a)로 옮기라고 했지만,
// 상세와 투표가 아직 쓰지 않고 place.ts는 다른 작업이 함께 고치는 중이라 여기 unresolved에 둔다(옮길 때 이 묶음 그대로).

export const historyCopy = {
  title: "나",
  greeting: (name: string) => `${name}님`,

  header: {
    settings: "설정",
  },

  tabs: {
    label: "나 탭 보기",
    history: "기록",
    places: "장소",
    reviews: "후기",
  },

  /** 끼니, 출처, 평가 (HIS-01) */
  meal: { lunch: "점심", dinner: "저녁" },
  source: {
    rec: "추천에서",
    poll: "투표로",
    map: "지도에서",
    detail: "상세에서",
  },
  rating: {
    up: "좋았어요",
    down: "별로였어요",
    none: "평가 없음",
    notVisited: "안 갔어요",
  },
  weekday: ["일", "월", "화", "수", "목", "금", "토"],
  date: {
    md: (m: number, d: number) => `${m}월 ${d}일`,
    weekRange: (m1: number, d1: number, m2: number, d2: number) =>
      m1 === m2 ? `${m1}월 ${d1}일~${d2}일` : `${m1}월 ${d1}일~${m2}월 ${d2}일`,
    month: (m: number) => `${m}월 방문`,
  },

  /** 이름 해석 실패 (T5.12a 3단계, D-12 안건 6). 날짜와 끼니, 또는 순번 + 카카오맵 링크 */
  unresolved: {
    visit: (date: string, meal: string) => `${date} ${meal}에 간 곳`,
    saved: (n: number) => `저장한 식당 ${n}`,
    review: (n: number) => `남긴 후기 ${n}`,
    kakao: "카카오맵",
    /** 링크 뒤 스크린 리더 글자("카카오맵" + 이 값) */
    kakaoSr: (target: string) => `에서 보기, ${target}`,
    note: "식당 이름을 불러오지 못했습니다. 카카오맵 링크로 어느 곳인지 확인할 수 있습니다.",
  },

  /** 확인 전 방문 (status candidate, D-12 안건 3) */
  confirm: {
    title: "다녀오셨나요?",
    ask: (name: string) => `${name}, 다녀오셨나요?`,
    pending: "확인 전",
    up: "좋았어요",
    down: "별로였어요",
    no: "안 갔어요",
    thanks: "기록했습니다.",
    thanksNo: "안 간 곳으로 기록했습니다. 추천 점수에는 쓰지 않습니다.",
  },

  /** 기록 탭 (HIS-01) */
  history: {
    listLabel: "방문 기록",
    thisWeek: "이번 주",
    lastWeek: "지난주",
    count: (n: number) => `${n}곳`,
    more: "지난 기록 더 보기",
    loadingMore: "지난 기록을 불러오는 중입니다.",
    end: "처음 기록까지 모두 봤습니다.",
    openPlace: (name: string) => `${name} 상세 보기`,
    settingsRow: "설정",
    settingsValue: "사무실, 예산, 화면",
  },

  /** 기록 탭 맨 위 이번 달 숫자 (D-12 안건 10) */
  summary: {
    title: (m: number) => `${m}월의 점심`,
    visits: "다녀온 횟수",
    visitsUnit: "번",
    thumbs: "좋았어요",
    thumbsUnit: "%",
    top: "자주 간 종류",
    topNone: "아직 없음",
    sentence: (n: number, up: number) =>
      `이번 달 ${n}번 다녀왔고 그중 ${up}번 좋았다고 남겼습니다.`,
  },

  /** 장소 탭 (HIS-02) */
  places: {
    favorites: "즐겨찾기",
    blocklist: "다시 안 갈 곳",
    count: (n: number) => `${n}곳`,
    favoriteToggle: (name: string) => `${name} 즐겨찾기`,
    favoriteRemoved: "즐겨찾기에서 뺐습니다. 별을 다시 누르면 되돌립니다.",
    favoriteAdded: "즐겨찾기에 다시 넣었습니다.",
    favoriteBlocked:
      "다시 안 갈 곳에 있는 식당이라 즐겨찾기에 넣지 못했습니다.",
    savedOn: (date: string) => `${date}에 저장`,
    unblock: "해제",
    unblockLabel: (name: string) => `${name} 다시 안 갈 곳 해제`,
    unblocked: "다시 추천에 넣었습니다.",
    undo: "되돌리기",
    undoLabel: (name: string) => `${name} 해제 되돌리기`,
    blockNote: "여기 있는 곳은 추천에 나오지 않습니다.",
    blockedOn: (date: string) => `${date}에 뺌`,
    more: "더 보기",
    favoritesEmpty:
      "아직 즐겨찾기한 곳이 없습니다. 상세에서 별을 눌러 모아 볼까요?",
    blocklistEmpty: "다시 안 갈 곳이 없습니다.",
  },

  /** 후기 탭 (HIS-03, FB-07) */
  reviews: {
    title: "내 후기",
    public: "공개",
    private: "나만 보기",
    privateHint:
      "나만 보기 후기는 글만 숨깁니다. 가격, 만족 여부, 태그는 이름 없이 식당 집계에 들어갑니다.",
    hidden: "신고가 쌓여 다른 사람에게는 보이지 않는 후기입니다.",
    edit: "수정",
    editLabel: (name: string) => `${name} 후기 수정`,
    delete: "삭제",
    deleteLabel: (name: string) => `${name} 후기 삭제`,
    deleteAsk: "이 후기를 지울까요?",
    deleteBody: "지우면 식당 집계에서도 빠지고 되돌릴 수 없습니다.",
    deleteConfirm: "지우기",
    keep: "그대로 두기",
    deleting: "후기를 지우는 중입니다.",
    deleted: "후기를 지웠습니다.",
    price: (won: string) => `1인 ${won}`,
    noText: "글 없이 평가만 남겼습니다.",
    more: "더 보기",
    empty: "아직 남긴 후기가 없습니다. 다녀온 곳에 한 줄 남겨 볼까요?",
  },

  /** 4상태 */
  states: {
    loading: "기록을 불러오는 중입니다",
    error: {
      title: "기록을 불러오지 못했습니다",
      body: "잠시 후 다시 시도해 주세요. 설정은 그대로 바꿀 수 있습니다.",
    },
    offline: {
      title: "인터넷에 연결되어 있지 않습니다",
      body: "연결 전에 불러온 기록입니다. 답하기와 해제, 수정은 연결되면 할 수 있습니다.",
    },
    offlineToast: "연결되면 할 수 있습니다",
    saveError: "저장하지 못했습니다. 잠시 후 다시 눌러 주세요.",
    empty: {
      title: "아직 다녀온 곳이 없습니다",
      body: "오늘 추천에서 길찾기를 누르면 그날 간 곳이 여기에 쌓입니다.",
      steps: [
        "오늘 추천에서 한 곳을 고르고 길찾기를 누릅니다.",
        "다음 날 한 탭으로 어땠는지 남깁니다.",
        "남긴 평가로 다음 추천이 조금씩 나아집니다.",
      ],
      ask: "첫 점심을 기록해 볼까요?",
      cta: "오늘 추천 보기",
    },
    /** 로그인 꺼짐 (D-12 안건 12, AUTH-07) */
    authOff: {
      title: "로그인하면 기록이 쌓입니다",
      body: "다녀온 곳, 즐겨찾기, 내 후기는 로그인한 뒤 볼 수 있습니다. 로그인은 곧 열립니다.",
      cta: "오늘 추천 보기",
      preview: "로그인하면 보이는 화면 예시",
      displayTitle: "화면 설정",
    },
  },

  /** 로그인 꺼짐 미리보기 예시(정적 그림, 실제 장소 아님) */
  preview: [
    { d: 27, w: "월", name: "골목 국밥집", slug: "gukbap" },
    { d: 28, w: "화", name: "초록 샐러드", slug: "salad" },
    { d: 30, w: "목", name: "작은 우동집", slug: "ilsik" },
  ],

  /** 설정 (/me/settings, D-12 안건 1) */
  settings: {
    metaTitle: "설정",
    title: "설정",
    display: "화면",
  },

  /** 화면 설정 (/me/display, D-12 안건 5) */
  display: {
    metaTitle: "화면",
    title: "화면",
    body: "화면 모드와 모션, 진동은 이 기기에만 저장합니다.",
    theme: { system: "시스템", light: "라이트", dark: "다크" },
    motionReduced: "모션 줄임",
  },
} as const;
