// '나' 탭과 기록 시안 문구 (T6.2, /design-lab/me/{a,b,c}). HIS-01~03, FB-07, SET-01~05, T5.12a.
// 상태 안내, 결과, 설명, 오류는 습니다체, 질문과 제안은 해요체 (tasks.md 2.2절, copy-guide 4.2, 4.3, 4.9).
// 설정 줄 이름은 me.ts(meCopy), 끼니 이름은 home.ts 값과 같은 말을 쓴다.
// 시안을 고른 뒤(T6.4) 실제 화면(T6.13)으로 옮길 때 src/copy/me.ts로 정리한다.

export const meLabCopy = {
  names: {
    a: "시안 A 기록 일지",
    b: "시안 B 달력",
    c: "시안 C 이번 달 돌아보기",
  },
  index: {
    title: "나 탭과 기록 시안 (T6.2)",
    body: "기록, 즐겨찾기, 다시 안 갈 곳, 내 후기와 설정을 한 탭에 담은 세 방향입니다. 쿼리로 상태와 하위 화면을 바꿔 볼 수 있습니다.",
  },

  title: "나",
  nickname: "test_점심러",
  greeting: (name: string) => `${name}님`,

  /** 머리줄 */
  header: {
    settings: "설정",
    back: "나 탭으로 돌아가기",
  },

  /** 끼니, 출처, 평가 (HIS-01) */
  meal: { lunch: "점심", dinner: "저녁" },
  source: { rec: "추천", poll: "투표", map: "지도" },
  sourceLong: { rec: "추천에서", poll: "투표로", map: "지도에서" },
  rating: {
    up: "좋았어요",
    down: "별로였어요",
    none: "평가 없음",
    notVisited: "안 갔어요",
  },
  weekday: ["일", "월", "화", "수", "목", "금", "토"],
  date: {
    md: (m: number, d: number) => `${m}월 ${d}일`,
    mdw: (m: number, d: number, w: string) => `${m}월 ${d}일 ${w}요일`,
    month: (m: number) => `${m}월`,
    monthYear: (y: number, m: number) => `${y}년 ${m}월`,
    weekRange: (m1: number, d1: number, m2: number, d2: number) =>
      m1 === m2 ? `${m1}월 ${d1}일~${d2}일` : `${m1}월 ${d1}일~${m2}월 ${d2}일`,
  },

  /** 이름 해석 실패 (T5.12a 3단계). 날짜나 순번 + 카카오맵 링크 */
  unresolved: {
    visit: (date: string, meal: string) => `${date} ${meal}에 간 곳`,
    saved: (n: number) => `저장한 식당 ${n}`,
    review: (date: string) => `${date}에 남긴 후기`,
    kakao: "카카오맵에서 보기",
    kakaoShort: "카카오맵",
    /** 카카오맵 링크 뒤에 붙는 스크린 리더 글자("카카오맵" + 이 값) */
    kakaoSr: (target: string) => ` 링크, ${target}`,
    note: "식당 이름을 불러오지 못했습니다. 카카오맵 링크로 어느 곳인지 확인할 수 있습니다.",
    glyph: "이름을 불러오지 못한 식당",
  },

  /** 방문 후보 확인 (status candidate). FB-01과 같은 세 가지 답 */
  confirm: {
    title: "다녀오셨나요?",
    ask: (name: string) => `${name}, 다녀오셨나요?`,
    pendingCount: (n: number) => `확인하지 않은 방문 ${n}곳`,
    up: "좋았어요",
    down: "별로였어요",
    no: "안 갔어요",
    thanks: "기록했습니다.",
    thanksNo: "안 간 곳으로 기록했습니다. 추천 점수에는 쓰지 않습니다.",
    hint: "길찾기만 누르고 아직 답하지 않은 곳입니다.",
  },

  /** 기록 (HIS-01) */
  history: {
    title: "기록",
    tab: "기록",
    thisWeek: "이번 주",
    lastWeek: "지난주",
    count: (n: number) => `${n}곳`,
    more: "지난 기록 더 보기",
    end: "처음 기록까지 모두 봤습니다.",
    all: "기록 모두 보기",
    recent: "최근 기록",
    openPlace: (name: string) => `${name} 상세 보기`,
    listLabel: "방문 기록",
  },

  /** 장소 (HIS-02) */
  places: {
    tab: "장소",
    favorites: "즐겨찾기",
    blocklist: "다시 안 갈 곳",
    favoritesCount: (n: number) => `${n}곳`,
    favoriteOn: (name: string) => `${name} 즐겨찾기`,
    favoriteRemoved: "즐겨찾기에서 뺐습니다.",
    favoriteAdded: "즐겨찾기에 다시 넣었습니다.",
    unblock: "해제",
    unblockLabel: (name: string) => `${name} 다시 안 갈 곳 해제`,
    unblocked: "다시 추천에 넣었습니다.",
    undo: "되돌리기",
    blockNote: "여기 있는 곳은 추천에 나오지 않습니다.",
    blockSummary: (n: number) => `${n}곳을 추천에서 빼고 있습니다.`,
    manage: "관리",
    all: (n: number) => `${n}곳 모두 보기`,
    more: "더 보기",
    favoritesEmpty:
      "아직 즐겨찾기한 곳이 없습니다. 상세에서 별을 눌러 모아 볼까요?",
    blocklistEmpty: "다시 안 갈 곳이 없습니다.",
    lastVisit: (date: string) => `마지막 방문 ${date}`,
    noVisit: "아직 다녀오지 않음",
    blockedOn: (date: string) => `${date}에 뺌`,
  },

  /** 내 후기 (HIS-03, FB-07) */
  reviews: {
    tab: "후기",
    title: "내 후기",
    count: (n: number) => `${n}개`,
    all: (n: number) => `${n}개 모두 보기`,
    public: "공개",
    private: "나만 보기",
    privateHint:
      "나만 보기 후기는 글만 숨깁니다. 가격, 👍, 태그는 식당 집계에 익명으로 들어갑니다.",
    edit: "수정",
    editLabel: (name: string) => `${name} 후기 수정`,
    delete: "삭제",
    deleteLabel: (name: string) => `${name} 후기 삭제`,
    deleteAsk: "이 후기를 지울까요?",
    deleteBody: "지우면 식당 집계에서도 빠지고 되돌릴 수 없습니다.",
    deleteConfirm: "지우기",
    cancel: "취소",
    deleted: "후기를 지웠습니다.",
    price: (won: string) => `1인 ${won}`,
    empty: "아직 남긴 후기가 없습니다. 다녀온 곳에 한 줄 남겨볼까요?",
    noText: "글 없이 평가만 남겼습니다.",
  },

  /** 이번 달 요약 (C) */
  summary: {
    title: (m: number) => `${m}월의 점심`,
    visits: "다녀온 횟수",
    visitsUnit: "번",
    thumbs: "좋았어요",
    thumbsUnit: "%",
    top: "자주 간",
    topNone: "아직 없음",
    categories: "자주 간 종류",
    categoryCount: (label: string, n: number) => `${label} ${n}번`,
    sentence: (n: number, up: number) =>
      `이번 달 ${n}번 다녀왔고 그중 ${up}번 좋았다고 남겼습니다.`,
    thumbsFew: "평가 3개부터",
  },

  /** 달력 (B) */
  calendar: {
    prev: "이전 달",
    next: "다음 달",
    label: (y: number, m: number) => `${y}년 ${m}월 방문 달력`,
    today: "오늘",
    dayLabel: (date: string, detail: string) =>
      detail ? `${date}, ${detail}` : `${date}, 기록 없음`,
    pendingMark: "확인 전",
    monthCount: (m: number, n: number) => `${m}월에 ${n}번 다녀왔습니다.`,
    noVisit: "이날은 기록이 없습니다.",
    lists: "목록",
    legendVisit: "다녀온 날",
    legendPending: "확인 전",
  },

  /** 설정 묶음 (기존 4단계 화면으로 가는 줄) */
  settings: {
    title: "설정",
    display: "화면",
    displayValue: "시스템, 모션 기본",
    account: "계정",
    officeValue: "본사",
    budgetValue: "점심 1만 원, 저녁 2만 원, 도보 10분",
    avoidValue: "2개",
    cravingValue: "고르지 않음",
    legal: "약관과 정책",
  },

  /** 데스크톱 오른쪽 칸 */
  side: {
    weekMap: "이번 주 다녀온 곳 지도",
    monthMap: "이번 달 다녀온 곳 지도",
    myMap: "즐겨찾기와 다녀온 곳 지도",
  },

  /** 상태 */
  states: {
    loading: "기록을 불러오는 중입니다",
    error: {
      title: "기록을 불러오지 못했습니다",
      body: "잠시 후 다시 시도해 주세요. 설정은 그대로 바꿀 수 있습니다.",
    },
    offline: {
      title: "인터넷에 연결되어 있지 않습니다",
      body: "연결 전에 불러온 기록입니다. 해제와 수정은 연결되면 할 수 있습니다.",
    },
    empty: {
      title: "아직 다녀온 곳이 없습니다",
      body: "오늘 추천에서 길찾기를 누르면 그날 간 곳이 여기에 쌓입니다.",
      steps: [
        "오늘 추천에서 한 곳을 고르고 길찾기를 누릅니다.",
        "다음 날 한 탭으로 어땠는지 남깁니다.",
        "남긴 평가로 다음 추천이 조금씩 나아집니다.",
      ],
      cta: "오늘 추천 보기",
      ask: "첫 점심을 기록해 볼까요?",
    },
    authOff: {
      title: "로그인하면 기록이 쌓입니다",
      body: "다녀온 곳, 즐겨찾기, 내 후기는 로그인한 뒤 볼 수 있습니다. 로그인은 곧 열립니다.",
      cta: "오늘 추천 보기",
      preview: "로그인하면 보이는 화면 예시",
      displayTitle: "화면 설정",
    },
  },
} as const;
