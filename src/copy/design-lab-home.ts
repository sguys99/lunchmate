// 디자인 랩 오늘(홈) 시안 문구 (T3.1). 시안 A~D와 시안 목록, 비교 스위처가 함께 쓴다.
// 공용 문구(homeCopy, commonCopy, badgeCopy)에 이미 있는 것은 그쪽을 쓰고, 시안에만 필요한 것만 둔다.
// 문체: 상태 안내와 설명은 습니다체, 피드백 요청과 제안은 해요체 (tasks.md 2.2절). 버튼과 라벨은 명사형.
// G3에서 고른 안의 문구는 구현 때 home.ts로 옮기고, 이 파일은 미선택 시안과 함께 지운다.
import { homeCopy } from "./home";

export const designLabHomeCopy = {
  /** /design-lab/home 시안 목록 */
  index: {
    metaTitle: "오늘(홈) 시안",
    eyebrow: "T3.1 G3",
    title: "오늘(홈) 시안",
    description:
      "같은 목업 데이터로 배치가 다른 네 안을 만들었습니다. 안마다 4상태, 다크, 핵심 모션을 담았습니다. D1~D3은 G3에서 고른 D에 어제 피드백 자리를 달리 둔 수정안입니다.",
    compareTitle: "나란히 바꿔 보기",
    compareBody:
      "한 화면에서 시안, 상태, 테마, 보기, 모션 줄이기를 바꿉니다. 선택값은 주소에 남습니다.",
    compareLink: "비교 스위처 열기",
    standalone: "단독 화면",
    states: "상태",
    noFeedback: "어제 피드백 없음",
    back: "디자인 랩",
  },

  /** 안별 이름과 한 줄 의도 */
  variants: {
    a: {
      name: "스와이프 스택",
      intent: "한 장씩 넘기며 고릅니다. 지금 보는 한 곳에만 집중합니다.",
    },
    b: {
      name: "피크 캐러셀",
      intent: "가운데 한 곳과 양옆 두 곳의 가장자리가 함께 보입니다.",
    },
    c: {
      name: "세로 3단 비교",
      intent: "세 곳의 숫자를 같은 열에 맞춰 한눈에 비교합니다.",
    },
    d: {
      name: "오늘의 한 곳",
      intent: "한 곳을 크게 권하고 대안 두 곳은 작은 줄로 둡니다.",
    },
    d1: {
      name: "D1 머리 아래 한 줄 띠",
      intent:
        "제목 바로 아래 한 줄 띠로 어제 간 곳을 묻습니다. 답하면 고맙다는 한 줄로 접힙니다.",
    },
    d2: {
      name: "D2 큰 카드 위 질문 카드",
      intent:
        "큰 카드 위에 같은 폭의 얇은 카드로 묻습니다. 답하면 카드가 사라지고 큰 카드가 올라옵니다.",
    },
    d3: {
      name: "D3 먼저 묻기",
      intent:
        "어제 간 곳이 있는 날은 첫 화면이 질문입니다. 답하거나 미루면 오늘의 추천으로 넘어갑니다.",
    },
  },

  /** /design-lab/home/compare 스위처 */
  switcher: {
    metaTitle: "오늘(홈) 시안 비교",
    toolbarLabel: "홈 시안 비교 설정",
    groups: {
      variant: "시안",
      state: "상태",
      theme: "테마",
      view: "보기",
      badges: "배지 색",
      deck: "카드",
      roulette: "골라줘",
      feedback: "어제",
    },
    /** 어제 피드백이 있는 날과 없는 날 (D1~D3) */
    feedbacks: {
      ask: { label: "있음", title: "어제 간 곳을 묻는 날" },
      none: { label: "없음", title: "물을 곳이 없는 날" },
    },
    /** T3.3 "그냥 골라줘" 연출 */
    roulettes: {
      auto: { label: "기본", title: "시안별 기본 연출" },
      r1: { label: "R1", title: "하이라이트 순회" },
      r2: { label: "R2", title: "이름 롤링" },
      r3: { label: "R3", title: "조용한 확정" },
    },
    /** T3.2 배지 색 체계 (D-04 안건) */
    badgePalettes: {
      auto: {
        label: "기본",
        title: "시안별 기본(A~D 지금, D1~D3 차분)",
      },
      current: {
        label: "지금",
        title: "의미 색 3가지(웨이팅, 할인, 바로 입장)",
      },
      calm: {
        label: "차분",
        title: "기피 경고만 의미 색, 나머지는 중립과 아이콘",
      },
    },
    /** T3.2 카드 세트 */
    decks: {
      today: { label: "기본", title: "오늘 추천 세트" },
      overflow: {
        label: "배지 넘침",
        title: "후보 배지가 3개 이상인 카드 세트",
      },
    },
    reduce: "모션 줄이기",
    shortcuts:
      "단축키: 1~7 시안, [ ] 상태, O/L/D 테마, F 보기, M 모션, B 배지 색, K 카드, R 골라줘, Y 어제",
  },

  /** 시안 화면 안 문구 */
  screen: {
    title: "오늘의 추천",
    /** 예: "10월 28일 수요일" */
    dateLine: (month: number, day: number, weekday: string) =>
      `${month}월 ${day}일 ${weekday}요일`,

    meal: {
      label: "끼니",
      lunch: "점심",
      dinner: "저녁",
      changed: (meal: string) => `${meal} 추천으로 바꿨습니다.`,
    },

    location: {
      label: "기준 위치",
      options: {
        office: "기본 사무실",
        other: "다른 사무실",
        here: "현위치",
      },
      /** 칩의 스크린 리더 이름. 보이는 글자를 그대로 품는다 */
      chipLabel: (name: string) => `기준 위치 ${name}, 바꾸기`,
      changed: (name: string) => `${name} 기준으로 다시 추천했습니다.`,
    },

    actions: {
      directions: homeCopy.actions.directions,
      reroll: homeCopy.actions.reroll,
      justPick: "그냥 골라줘",
      detail: "상세",
      pollWithFriends: homeCopy.actions.pollWithFriends,
      party: "회식 모드",
      directionsTo: (name: string) => `${name} 길찾기`,
      detailOf: (name: string) => `${name} 상세`,
    },

    entries: {
      label: "다른 방법으로 정하기",
      poll: "링크 하나로 같이 투표합니다",
      party: "인원과 예산으로 찾습니다",
    },

    numbers: {
      walk: "도보",
      price: "1인",
      thumbs: "만족",
      walkUnit: "분",
      thumbsUnit: "%",
    },

    feedback: {
      label: "어제 식사",
      question: (name: string) => `어제 간 ${name}, 어땠어요?`,
      up: "좋았어요",
      down: "별로였어요",
      skipped: "안 갔어요",
      thanks: "알려 줘서 고마워요",
      thanksBody: "다음 추천에 반영합니다.",
      /** 안 갔어요: 부정 신호로 쓰지 않는다(FB-05) */
      skippedBody: "추천 점수에는 쓰지 않습니다.",
      /** 스크린 리더 안내 (D2는 카드가 사라지므로 화면 단위 안내로) */
      announce: "알려 줘서 고마워요. 다음 추천에 반영합니다.",
      announceSkipped: "알려 줘서 고마워요. 추천 점수에는 쓰지 않습니다.",
      /** D1~D3: 질문 위 caption */
      eyebrow: "어제 점심",
      /** D3: 이름을 따로 크게 쓰고 묻는 말만 */
      ask: "어땠어요?",
      /** D2: 위에 "어제 점심" caption이 있어 "어제 간"을 뺀다 */
      questionShort: (name: string) => `${name}, 어땠어요?`,
      /** 한 탭 뒤 선택 입력(FB-02) 진입 */
      more: "가격, 태그 남기기",
      /** D3: 질문 아래 한 줄 설명 */
      lead: "한 번만 누르면 다음 추천이 더 잘 맞습니다.",
      /** D3: 오늘의 추천을 먼저 보는 줄 */
      later: "나중에",
      laterAnnounce: "오늘의 추천을 먼저 보여 드립니다.",
    },

    rerolled: "새 추천 세 곳을 불러왔습니다.",
    listLabel: "오늘 추천 세 곳",

    /** A 스와이프 스택, B 피크 캐러셀 */
    deck: {
      slide: (index: number, total: number) => `${total}곳 중 ${index}번째`,
      announce: (index: number, total: number, name: string) =>
        `${total}곳 중 ${index}번째, ${name}`,
      previous: "이전 식당",
      next: "다음 식당",
      hint: "옆으로 밀거나 화살표 키로 넘깁니다",
    },

    /** C 세로 3단 비교 */
    compare: {
      tableLabel: "오늘 추천 세 곳 비교",
      placeColumn: "식당",
      bestHint: "열마다 가장 나은 값을 진하게 표시합니다",
      best: "가장 나음",
      select: (name: string) => `${name} 고르기`,
      selected: (name: string) => `고른 곳은 ${name}입니다.`,
    },

    /** "그냥 골라줘" 연출과 결과 카드 (REC-12, T3.3) */
    justPick: {
      dialogLabel: "그냥 골라줘 결과",
      picking: "세 곳 중에서 고르고 있습니다.",
      skip: "바로 보기",
      skipHint: "화면을 누르거나 Esc로 바로 결과를 봅니다",
      /** 결과 카드 위 세리프 한 줄 (축하, 해요체) */
      settled: "오늘은 여기로 가요.",
      /** 스크린 리더 결과 안내 */
      announce: (name: string) => `${name}, 오늘은 여기로 가요.`,
      again: "다시 고르기",
      close: "닫기",
    },

    /** D 오늘의 한 곳 */
    single: {
      eyebrow: "오늘의 한 곳",
      alternatives: "또는 이 두 곳",
      /** 대안 줄 버튼의 보이지 않는 끝말. 이름은 보이는 글자(식당명, 숫자) + 이 말이 된다(axe label-content-name-mismatch, T3.5) */
      swapHint: "크게 보기",
      swapped: (name: string) => `오늘의 한 곳을 바꿨습니다. ${name}입니다.`,
      /** D1~D3 하단 고정 행동 줄 */
      actionsLabel: "오늘의 한 곳 행동",
    },
  },
} as const;
