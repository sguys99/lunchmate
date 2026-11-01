// 투표방 시안 문구 (T7.1, /design-lab/poll/<a|b|c>). 정본 예문은 docs/copy-guide.md 4.7절.
// 문체: 상태, 결과, 오류, 정책은 습니다체. 질문, 제안, 확정 축하는 해요체. 버튼과 라벨은 명사형(비율 제외).
// 목업 이름(식당, 닉네임)은 모두 지어낸 값이다.

export const pollLabCopy = {
  names: {
    a: "투표방 시안 A 목록과 바",
    b: "투표방 시안 B 한 장씩",
    c: "투표방 시안 C 모이는 자리",
  },

  /** 머리 */
  head: {
    eyebrow: "점심 투표",
    question: (title: string) => `${title}, 어디로 갈까요?`,
    hostedBy: (nick: string) => `${nick} 님이 열었습니다`,
    hostedByMe: "내가 연 투표입니다",
    me: "나",
    participants: (n: number) => `${n}명 참여`,
    votedOf: (voted: number, total: number) =>
      `${total}명 중 ${voted}명 골랐습니다`,
    deadlineAt: (hhmm: string) => `${hhmm} 마감`,
    untilDeadline: "마감까지",
    remainingMinutes: (min: number) => `${min}분 남음`,
    multi: "여러 곳 고를 수 있습니다",
    single: "한 곳만 고릅니다",
    backLabel: "투표 목록으로",
    shareLabel: "투표 공유",
    moreLabel: "투표 관리 더 보기",
    moreShown: (n: number) => `외 ${n}명`,
    avatarsLabel: (n: number) => `참여자 ${n}명`,
  },

  /** 후보 */
  candidate: {
    votes: (n: number) => `${n}표`,
    votesLabel: (name: string, n: number) => `${name}, ${n}표`,
    mine: "내 선택",
    leading: "1위",
    walk: "도보",
    price: "1인",
    tally: "득표",
    minuteUnit: "분",
    voteUnit: "표",
    unresolved: (order: number) => `후보 ${order}`,
    kakaoMap: "카카오맵에서 보기",
    kakaoMapLabel: (order: number) =>
      `후보 ${order}, 카카오맵에서 보기 (새 창)`,
    unresolvedNote:
      "이름을 불러오지 못한 후보입니다. 카카오맵에서 확인할 수 있습니다.",
    voterListLabel: (nameWithObject: string, n: number) =>
      `${nameWithObject} 고른 ${n}명`,
    noVoters: "아직 고른 사람이 없습니다",
    pager: (i: number, n: number) => `${i} / ${n}`,
    prevLabel: "이전 후보",
    nextLabel: "다음 후보",
    selectLabel: (name: string) => `${name} 고르기`,
    shareStripLabel: "후보별 득표 비율",
  },

  /** 기피 경고 (POLL-13) */
  avoid: {
    note: "참여자 중 이 식당 음식을 피하는 분이 있습니다. 누구인지는 알리지 않습니다.",
  },

  /** 투표 행동 */
  actions: {
    vote: "투표하기",
    voteFor: (name: string) => `${name}에 투표하기`,
    voteMulti: (n: number) => `${n}곳에 투표하기`,
    pickFirst: "후보를 골라 주세요",
    change: "선택 바꾸기",
    cancelVote: "투표 취소",
    decide: "결정하기",
    decideNow: "지금 결정하기",
    loginToVote: "로그인하고 투표하기",
    suggest: "후보 제안",
    approve: "승인",
    reject: "거절",
    retrySend: "다시 보내기",
    directions: "길찾기",
    shareResult: "결과 공유",
    reconnect: "다시 연결",
    pickMyself: "직접 고르기",
    roulette: "룰렛에 맡기기",
    pickThis: (nameWithRo: string) => `${nameWithRo} 정하기`,
  },

  /** 투표 뒤 상태 줄 */
  voted: {
    done: "투표했습니다. 마감 전까지 바꿀 수 있습니다.",
    canceled: "투표를 취소했습니다.",
    sendFailed: "투표를 보내지 못했습니다. 고른 곳은 그대로 있습니다.",
  },

  /** 비로그인 미리보기 (POLL-05) */
  guest: {
    title: "투표하려면 로그인이 필요합니다",
    body: "로그인하면 이 투표로 돌아옵니다.",
    hiddenTally: "득표는 참여한 뒤에 보입니다.",
  },

  /** 후보 제안 (POLL-07) */
  suggest: {
    sent: "제안을 보냈습니다. 방장이 승인하면 후보에 들어갑니다.",
    pendingTitle: "제안받은 후보",
    pendingBy: (nick: string) => `${nick} 님 제안`,
    full: "후보는 5곳까지 담을 수 있습니다.",
    approved: (nameWithObject: string) =>
      `${nameWithObject} 후보에 넣었습니다.`,
    rejected: "제안을 넘겼습니다.",
  },

  /** 방장 결정 (POLL-08) */
  decide: {
    confirmTitle: "지금 마감할까요?",
    confirmBody: "지금 1위인 곳으로 정하고 투표를 마감합니다.",
    confirm: "마감하고 정하기",
    keep: "더 기다리기",
  },

  /** 동점 (POLL-08) */
  tie: {
    hostTitle: (n: number) => `${n}곳이 동점입니다`,
    hostBody: "직접 고를까요, 룰렛에 맡길까요?",
    memberTitle: "방장이 동점을 정하는 중입니다",
    memberBody: "정해지면 이 화면에 바로 보입니다.",
    rolling: "룰렛을 돌리는 중입니다",
    tieBadge: "동점",
  },

  /** 마감과 결과 (POLL-08, POLL-09) */
  result: {
    celebrate: "오늘 점심은 여기로 정했어요.",
    closedTitle: "투표가 마감되었습니다",
    winner: (name: string) => `1위는 ${name}입니다.`,
    tally: (votes: number, total: number) =>
      `${total}명 중 ${votes}명이 골랐습니다.`,
    allVotes: "득표 결과",
    visitNote:
      "참여한 분 모두의 방문 기록에 후보로 담았습니다. 내일 어땠는지 묻습니다.",
    byRoulette: "동점이라 룰렛으로 정했습니다.",
    byHost: "방장이 마감했습니다.",
    byTime: "마감 시각에 정해졌습니다.",
  },

  /** 실시간 연결 (AC-POLL-1) */
  live: {
    on: "실시간",
    onLabel: "득표가 실시간으로 갱신됩니다",
    lost: "실시간 연결이 끊겼습니다. 다시 연결하는 중입니다.",
    incoming: (nick: string) => `${nick} 님이 투표했습니다`,
  },

  /** 방장 메뉴 (POLL-12) */
  host: {
    cancelPoll: "투표 취소하기",
    cancelTitle: "투표를 취소할까요?",
    cancelBody: "참여한 분 모두에게 취소되었다고 보입니다. 되돌릴 수 없습니다.",
    cancelConfirm: "취소하기",
    cancelKeep: "그대로 두기",
    copyLink: "링크 복사",
  },

  /** 들어갈 수 없는 투표방 (POLL-11, POLL-12, PRD 12장) */
  notices: {
    expired: {
      title: "마감된 투표입니다",
      body: "마감 후 하루가 지나 링크가 닫혔습니다. 결과는 참여한 분만 볼 수 있습니다.",
      action: "투표 탭으로",
    },
    full: {
      title: "참여 인원이 가득 찼습니다",
      body: "한 투표에는 30명까지 참여할 수 있습니다. 방장에게 새 투표를 부탁해 보세요.",
      action: "투표 탭으로",
    },
    canceled: {
      title: "방장이 투표를 취소했습니다",
      body: "이 투표에는 더 참여할 수 없습니다. 새로 만들어볼까요?",
      action: "투표 만들기",
    },
  },

  /** 4상태 */
  states: {
    loading: { label: "투표방을 불러오는 중입니다" },
    empty: {
      title: "아직 투표한 사람이 없습니다",
      body: "먼저 골라볼까요?",
    },
    error: {
      title: "투표방을 불러오지 못했습니다",
      body: "잠시 후 다시 시도해 주세요.",
      action: "다시 시도",
    },
    offline: {
      title: "오프라인입니다",
      body: "마지막으로 받은 득표입니다. 연결되면 투표할 수 있습니다.",
      button: "연결되면 투표할 수 있습니다",
    },
  },

  /** 시안 안내 (스크린 리더) */
  lab: {
    shareNotice: "공유 화면은 투표 만들기 시안(T7.2)에서 정합니다.",
    resultShareNotice:
      "결과 공유 이미지는 공유 이미지 시안(T7.4)에서 정합니다.",
    suggestNotice:
      "후보 고르기 화면은 투표 만들기 시안(T7.2)과 같은 시트를 씁니다.",
  },
} as const;
