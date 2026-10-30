// 온보딩 3단계 문구 (T4.16~T4.21, PRD ONB-01~05, D-07, copy-guide 4.6). 컴포넌트 안에 문장을 직접 쓰지 않는다 (CLAUDE.md 4장).
// 문체 (tasks.md 2.2절): 상태, 결과, 설명, 오류, 권한, 정책은 습니다체, 질문과 부탁은 해요체. 버튼, 칩, 라벨은 명사형.
// 시안 문구(design-lab-onboarding.ts)에서 옮겨 왔고, 실제 지도(누르거나 끌어서 핀 놓기, 안건 1)에 맞춰 안내를 고쳤다.

const STEP_TOTAL = 3;

export const onboardingCopy = {
  metaTitle: "처음 설정",
  screenLabel: "처음 설정",

  /** 진행 표시 */
  progress: {
    label: (current: number) => `${STEP_TOTAL}단계 중 ${current}단계`,
    steps: ["위치", "예산과 거리", "못 먹는 음식"] as const,
  },

  /** 이동 버튼 (명사형) */
  actions: {
    next: "다음",
    save: "이 위치로 저장",
    done: "완료",
    skip: "건너뛰기",
    add: "추가",
    widen: (minutes: number) => `${minutes}분으로 넓히기`,
    finishNow: "여기까지 하고 시작",
    retry: "다시 시도",
  },

  /** 1단계 사무실 위치 (ONB-01) */
  location: {
    title: "회사 위치부터 알려 주세요",
    body: "이 위치를 기준으로 근처 식당을 찾습니다.",
    searchLabel: "회사 주소나 건물명 검색",
    searchPlaceholder: "회사 주소나 건물명",
    searchSubmit: "검색",
    searchClear: "검색어 지우기",
    resultsLabel: "검색 결과",
    searching: "검색하는 중입니다",
    locateLabel: "현위치로 지도 옮기기",
    locating: "현위치를 찾는 중입니다",
    pinHint: "지도에서 회사 입구를 눌러 핀을 놓아 주세요.",
    pinPlaced: "핀을 놓았습니다. 핀을 끌거나 다른 곳을 누르면 옮겨집니다.",
    pinNotice:
      "검색 결과는 지도 이동에만 씁니다. 저장하는 것은 직접 놓은 핀 위치뿐입니다.",
    mapLabel: "회사 위치를 고르는 지도",
    mapKeysHint: "방향키로 지도를 움직이고 Enter 키로 가운데에 핀을 놓습니다.",
    pinLabel: "회사 핀",
    movedTo: (placeName: string) =>
      `${placeName} 근처로 지도를 옮겼습니다. 회사 입구를 눌러 핀을 놓아 주세요.`,
    movedToCurrent:
      "현위치 근처로 지도를 옮겼습니다. 회사 입구를 눌러 핀을 놓아 주세요.",
    placedAnnounce: "핀을 놓았습니다.",
    needPin: "핀을 놓으면 저장할 수 있습니다.",
    permDenied: {
      title: "위치 권한이 꺼져 있습니다",
      body: "현위치 대신 회사 주소나 건물명으로 검색해 주세요.",
    },
    locateFailed: {
      title: "현위치를 찾지 못했습니다",
      body: "회사 주소나 건물명으로 검색해 주세요.",
    },
    searchEmpty: {
      title: "주소를 찾지 못했습니다",
      body: "건물명이나 도로명으로 다시 검색해보세요.",
    },
    searchError: {
      title: "주소 검색이 잠시 안 됩니다",
      body: "지도를 직접 움직여 회사 입구에 핀을 놓아 주세요.",
    },
    mapError: {
      title: "지도를 불러오지 못했습니다",
      body: "연결을 확인한 뒤 다시 시도해 주세요.",
    },
    loading: "지도를 불러오는 중입니다",
  },

  /** 2단계 예산과 거리 (ONB-02). 저녁 예산도 묻기 때문에 제목은 "예산과 걷는 거리" (g4-comparison 6절) */
  budget: {
    title: "예산과 걷는 거리",
    body: "기본값 그대로 두어도 됩니다. 나중에 나 탭에서 바꿀 수 있습니다.",
    lunch: "점심 예산",
    dinner: "저녁 예산",
    walk: "걷는 거리",
    walkPrefix: "도보",
    walkUnit: "분",
    radius: (meters: number) => `반경 약 ${meters}m 안에서 찾습니다.`,
    nearby: (count: number) => `이 거리 안의 식당 약 ${count}곳`,
    nearbyAtLeast: (count: number) => `이 거리 안의 식당 ${count}곳 이상`,
    nearbyLoading: "근처 식당 수를 세는 중입니다",
    nearbyError: "근처 식당 수를 지금은 셀 수 없습니다.",
    nearbyEmpty: {
      title: "이 거리 안에는 식당이 없습니다",
      body: (minutes: number) => `${minutes}분까지 넓혀볼까요?`,
    },
  },

  /** 3단계 못 먹는 음식 (ONB-03) */
  avoid: {
    title: "못 먹는 음식이 있나요?",
    body: "고른 음식은 추천에서 뺍니다. 다른 사람에게는 보이지 않습니다.",
    foods: "음식 종류",
    allergies: "알레르기",
    custom: "직접 입력",
    customPlaceholder: "예: 고수, 오이",
    customHint: "입력한 말이 식당 이름이나 업종에 들어가면 뺍니다.",
    customRemove: (item: string) => `${item} 지우기`,
    customDuplicate: "이미 넣은 음식입니다.",
    customLimit: "직접 입력은 10개까지 넣을 수 있습니다.",
    /** 칩 목록은 시안 그대로 (D-07 안건 4). 서버가 이 목록으로 다시 검사한다 */
    foodChips: [
      "회",
      "해산물",
      "매운 음식",
      "양고기",
      "내장",
      "돼지고기",
      "닭고기",
      "날음식",
    ] as const,
    allergyChips: [
      "갑각류",
      "조개류",
      "땅콩",
      "견과류",
      "우유",
      "달걀",
      "밀",
      "메밀",
    ] as const,
  },

  /** 완료 (ONB-05): 저장 뒤 곧바로 오늘 추천으로 이동한다 */
  finishing: "설정을 저장하고 있습니다",

  /** 4상태와 저장 */
  states: {
    loading: "처음 설정 화면을 불러오는 중입니다",
    offline: {
      title: "인터넷에 연결되어 있지 않습니다",
      body: "고른 값은 그대로 둡니다. 연결되면 저장할 수 있습니다.",
    },
    saveError: {
      title: "설정을 저장하지 못했습니다",
      body: "고른 값은 그대로 있습니다. 잠시 후 다시 시도해 주세요.",
    },
  },
} as const;
