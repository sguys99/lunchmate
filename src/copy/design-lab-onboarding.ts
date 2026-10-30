// 온보딩 3단계 시안 문구 (T4.1, PRD ONB-01~05, copy-guide 4.6). 컴포넌트 안에 문장을 직접 쓰지 않는다 (CLAUDE.md 4장).
// 문체 (tasks.md 2.2절): 상태, 결과, 설명, 오류, 권한, 정책은 습니다체, 질문과 부탁은 해요체. 버튼, 칩, 라벨은 명사형.
// 실제 화면 문구는 src/copy/onboarding.ts(T4.16~T4.21)로 옮겼다. 이 파일은 확인 화면 /design-lab/onboarding/b 전용이다.

const STEP_TOTAL = 3;

export const onboardingLabCopy = {
  /** 디자인 랩 단독 화면 제목과 시안 이름 */
  metaTitle: "온보딩 시안",
  names: {
    b: "B 지도 위 시트",
  },
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
    widen: "10분으로 넓히기",
    seeHome: "홈에서 이어 보기",
    restart: "처음부터 다시",
  },

  /** 1단계 사무실 위치 (ONB-01) */
  location: {
    title: "회사 위치부터 알려 주세요",
    body: "이 위치를 기준으로 근처 식당을 찾습니다.",
    searchLabel: "회사 주소나 건물명 검색",
    searchPlaceholder: "회사 주소나 건물명",
    searchClear: "검색어 지우기",
    resultsLabel: "검색 결과",
    locateLabel: "현위치로 지도 옮기기",
    pinHintCenter: "지도를 움직여 회사 입구를 가운데 핀에 맞춰 주세요.",
    pinPlacedCenter: "핀을 놓았습니다. 지도를 움직이면 다시 맞출 수 있습니다.",
    pinNotice:
      "검색 결과는 지도 이동에만 씁니다. 저장하는 것은 직접 놓은 핀 위치뿐입니다.",
    mapLabel: "회사 위치를 고르는 지도",
    mapKeysHint: "방향키로 지도를 움직이고 Enter 키로 가운데에 핀을 놓습니다.",
    pinLabel: "회사 핀",
    movedTo: (placeName: string) =>
      `${placeName} 근처로 지도를 옮겼습니다. 입구를 눌러 핀을 놓아 주세요.`,
    movedToCenter: (placeName: string) =>
      `${placeName} 근처로 지도를 옮겼습니다. 지도를 움직여 입구에 맞춰 주세요.`,
    movedToCurrent: "현위치 근처로 지도를 옮겼습니다.",
    placedAnnounce: "핀을 놓았습니다.",
    needPin: "핀을 놓으면 저장할 수 있습니다.",
    permDenied: {
      title: "위치 권한이 꺼져 있습니다",
      body: "현위치 대신 회사 주소나 건물명으로 검색해 주세요.",
    },
    searchEmpty: {
      title: "주소를 찾지 못했습니다",
      body: "건물명이나 도로명으로 다시 검색해 보세요.",
    },
    searchError: {
      title: "주소 검색이 잠시 안 됩니다",
      body: "지도를 직접 움직여 회사 입구에 핀을 놓아 주세요.",
    },
    mapOffline: "지도를 불러오지 못했습니다",
    loading: "지도를 불러오는 중입니다",
  },

  /** 2단계 예산과 거리 (ONB-02) */
  budget: {
    titleShort: "예산과 걷는 거리",
    body: "기본값 그대로 두어도 됩니다. 나중에 나 탭에서 바꿀 수 있습니다.",
    lunch: "점심 예산",
    dinner: "저녁 예산",
    walk: "걷는 거리",
    perPerson: "1인",
    walkPrefix: "도보",
    walkUnit: "분",
    defaultMark: "기본값",
    radius: (meters: number) => `반경 약 ${meters}m 안에서 찾습니다.`,
    nearby: (count: number) => `이 거리 안의 식당 약 ${count}곳`,
    nearbyEmpty: {
      title: "이 거리 안에는 식당이 없습니다",
      body: "10분까지 넓혀 볼까요?",
    },
    loading: "근처 식당 수를 세는 중입니다",
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
    loading: "고를 수 있는 음식을 불러오는 중입니다",
  },

  /** C에서 가져온 단축 (D-07 조합): 위치만 정하고 나머지는 기본값으로 바로 시작. 실제 화면 T4.17~T4.19에서 B 하단 줄에 붙인다 */
  shortcut: {
    finishNow: "여기까지 하고 시작",
  },

  /** 완료 직후 (ONB-05) */
  done: {
    eyebrow: "설정을 마쳤습니다",
    title: "오늘의 추천 3곳입니다",
    body: "설정은 나 탭에서 언제든 바꿀 수 있습니다.",
    listLabel: "첫 추천 세 곳",
  },

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

  /** 디자인 랩 첫 화면 소개 (이 시안 묶음) */
  index: {
    title: "온보딩 (D-07 선택안 B 지도 위 시트)",
    body: "쿼리: ?step=1|2|3|done, ?state=loading|empty|error|offline, ?perm=denied, ?pin=placed",
  },
} as const;
