// 투표 만들기 시안 문구 (T7.2, /design-lab/poll-create/<a|b|c>). POLL-01, POLL-02, POLL-03, PARTY-05, MOD-05.
// 묻기, 권유, 축하는 해요체, 상태 안내, 고지, 오류, 결과는 습니다체 (tasks.md 2.2절, copy-guide).
// 진입점 이름은 홈의 실제 문구(home.ts actions.pollWithFriends, party)와 같다.
// 시안을 고른 뒤(T7.5) 실제 화면(T7.11~T7.13)으로 옮길 때 src/copy/poll.ts로 정리한다.

export const pollCreateLabCopy = {
  names: {
    c: "투표 만들기 C 먼저 만들고 고치기 (G7 선택안, 확인 화면)",
  },
  index: {
    title: "투표 만들기 시안 (T7.2)",
    body: "빠른 투표(오늘 카드 3장), 상세에서 한 곳, 회식 후보 5곳으로 투표방을 만들고 친구에게 보내는 흐름입니다.",
  },

  /** 홈 진입점 (REC-10). 실제 홈과 같은 말 */
  entries: {
    label: "같이 정하기",
    friends: "친구랑 정하기",
    party: "회식 모드",
    detail: "투표에 추가",
    friendsHint: "오늘 세 곳으로 바로 투표를 만듭니다.",
  },

  sheet: {
    close: "투표 만들기 닫기",
    eyebrow: {
      home: "친구랑 정하기",
      detail: (name: string) => `${name}에서`,
      party: "회식 모드에서",
    },
  },

  title: {
    label: "제목",
    edit: "제목 바꾸기",
    done: "확인",
    inputLabel: "투표 제목",
    max: 20,
    empty: "제목을 적어 주세요.",
  },

  candidates: {
    title: "후보",
    count: (n: number) => `${n}곳`,
    countOf: (n: number, max: number) => `${n}/${max}`,
    hint: "2곳에서 5곳까지 넣을 수 있습니다.",
    remove: (name: string) => `${name} 빼기`,
    add: "후보 더 넣기",
    addClose: "목록 접기",
    needOne: "후보를 한 곳 더 넣어 주세요.",
    needMore: (n: number) => `후보를 ${n}곳 더 넣어 주세요.`,
    full: "후보는 5곳까지입니다. 하나를 빼면 더 넣을 수 있습니다.",
    fromToday: "오늘 추천",
    favorites: "즐겨찾기",
    recent: "최근 간 곳",
    /** 넣기 토글 버튼 끝에 스크린 리더만 읽는 말(눌림 상태가 후보에 들어 있음을 뜻한다) */
    pickHint: "후보에 넣기",
    fillToday: "오늘 추천 두 곳 함께 넣기",
    fromMap: "지도에서 고르기",
    walk: (min: number) => `도보 ${min}분`,
    emptyTitle: "넣을 후보가 아직 없습니다",
    emptyBody:
      "오늘 추천을 불러오지 못했고 즐겨찾기나 최근 간 곳도 없습니다. 지도에서 후보를 골라 주세요.",
    loading: "후보를 불러오는 중입니다",
    added: (name: string) => `${name}을 후보에 넣었습니다.`,
    removed: (name: string) => `${name}을 후보에서 뺐습니다.`,
  },

  deadline: {
    title: "마감",
    chips: {
      in10: "10분 뒤",
      in30: "30분 뒤",
      in60: "1시간 뒤",
      today18: "오늘 18:00",
      tomorrow12: "내일 12:00",
      custom: "직접",
    },
    at: (hhmm: string) => `${hhmm}에 마감합니다.`,
    atTomorrow: (hhmm: string) => `내일 ${hhmm}에 마감합니다.`,
    tileToday: "오늘",
    tileTomorrow: "내일",
    tomorrowAt: (hhmm: string) => `내일 ${hhmm}`,
    customLabel: "마감 시각",
    customTooSoon: "지금부터 10분 뒤 이후로 골라 주세요.",
    lateNote: "11:30이 지나 1시간 뒤를 대신 보여 줍니다.",
    summary: (label: string, hhmm: string) => `${label}, ${hhmm}`,
  },

  mode: {
    title: "고르는 방식",
    single: "한 곳만",
    multi: "여러 곳",
    singleNote: "한 사람이 한 곳에 표를 냅니다.",
    multiNote:
      "한 사람이 여러 곳에 표를 낼 수 있습니다. 1위는 표가 가장 많은 곳입니다.",
  },

  anchor: {
    label: "후보 이름 기준",
    office: "회사 핀 근처",
    note: "친구 화면에서 후보 이름을 이 위치 주변에서 찾습니다. 현위치는 쓰지 않습니다.",
    change: "기준 바꾸기",
  },

  kind: {
    party: "회식",
    partyNote: "회식 투표는 저녁으로 정해집니다.",
  },

  create: {
    submit: "만들고 보내기",
    submitPlain: "투표 만들기",
    next: "다음",
    back: "이전 단계",
    creating: "만드는 중",
    stepOf: (n: number, total: number) => `${total}단계 중 ${n}단계`,
  },

  /** B 단계 질문 */
  steps: {
    where: "어디 중에서 고를까요?",
    whereHint: "오늘 추천 세 곳을 먼저 넣어 두었습니다.",
    whereHintDetail: "한 곳 더 고르면 투표를 만들 수 있습니다.",
    whereHintParty: "회식 모드에서 고른 다섯 곳입니다.",
    when: "언제까지 정할까요?",
    whenHint: "마감이 지나면 1위로 정해지고 모두에게 알립니다.",
  },

  /** C: 만든 직후 시트 */
  instant: {
    title: "투표방을 만들었어요",
    body: "기본값으로 만들었습니다. 바꿀 것이 있으면 줄을 눌러 고쳐 주세요.",
    undo: "만들기 취소",
    undone: "투표방을 지웠습니다. 오늘 만들 수 있는 개수에서도 빠집니다.",
    rows: {
      title: "제목",
      deadline: "마감",
      candidates: "후보",
      mode: "방식",
    },
    editHint: "고치기",
    done: "다 고쳤어요",
    saved: "바꾼 내용을 투표방에 반영했습니다.",
    addInRoom: "투표방에서도 후보를 더 넣을 수 있습니다.",
    detailFilled:
      "오늘 추천 두 곳을 함께 넣었습니다. 줄을 눌러 바꿀 수 있습니다.",
    creating: "투표방을 만드는 중입니다",
    notCreated: "투표 만들기",
  },

  share: {
    title: "투표방을 만들었어요",
    body: (hhmm: string) =>
      `${hhmm}까지 표를 받습니다. 친구에게 링크를 보내 주세요.`,
    bodyTomorrow: (hhmm: string) =>
      `내일 ${hhmm}까지 표를 받습니다. 친구에게 링크를 보내 주세요.`,
    kakao: "카카오톡으로 보내기",
    webShare: "다른 앱으로",
    copy: "링크 복사",
    copied: "링크를 복사했습니다.",
    copiedShort: "복사함",
    goRoom: "투표방으로 가기",
    previewLabel: "친구에게 보이는 미리보기",
    previewBrand: "런치메이트",
    previewMeta: (count: number, hhmm: string) =>
      `후보 ${count}곳, ${hhmm} 마감`,
    previewMetaTomorrow: (count: number, hhmm: string) =>
      `후보 ${count}곳, 내일 ${hhmm} 마감`,
    previewNote:
      "미리보기에는 식당 이름이 나오지 않습니다. 이름은 링크를 연 뒤에 보입니다.",
    linkLabel: "초대 링크",
  },

  states: {
    saveError: {
      title: "투표방을 만들지 못했습니다",
      body: "고른 내용은 그대로 있습니다. 잠시 후 다시 시도해 주세요.",
      retry: "다시 만들기",
    },
    limit: {
      title: "오늘 만들 수 있는 투표를 모두 만들었습니다",
      body: "투표방은 하루 10개까지 만들 수 있습니다. 내일 다시 만들 수 있습니다.",
      goList: "진행 중인 투표 보기",
    },
    shareError: {
      title: "카카오톡을 열지 못했습니다",
      body: "링크를 복사해 대화방에 붙여 넣어 주세요.",
    },
    offline: {
      title: "연결되면 만들 수 있습니다",
      body: "고른 내용은 이 화면에 남아 있습니다.",
    },
    limitLeft: (n: number) => `오늘 ${n}개 더 만들 수 있습니다.`,
  },
} as const;
