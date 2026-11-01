// 투표방 화면 문구 (T7.15~T7.24, POLL-05~13, DEAL-05). 정본 예문은 docs/copy-guide.md 4.7절, 화면 규칙은 DESIGN.md 5장 "투표방".
// 문체: 상태, 결과, 오류, 정책은 습니다체. 질문, 제안, 확정 축하는 해요체. 버튼과 라벨은 명사형(비율 제외).
// 제목과 식당 이름은 사용자 값이라 받침을 모른다. 조사는 withRo처럼 받침을 보고 붙이거나 쉼표로 잇는다(copy-guide 7.3).

export type PollKindCopyKey = "lunch" | "dinner" | "party";

export const pollCopy = {
  kind: {
    lunch: "점심 투표",
    dinner: "저녁 투표",
    party: "회식 투표",
  } satisfies Record<PollKindCopyKey, string>,

  /** 머리 */
  head: {
    question: (title: string) => `${title}, 어디로 갈까요?`,
    hostedBy: (nick: string) => `${nick} 님이 열었습니다`,
    hostedByUnknown: "참여자가 연 투표입니다",
    hostedByMe: "내가 연 투표입니다",
    deadlineAt: (hhmm: string) => `${hhmm} 마감`,
    deadlineOn: (date: string, hhmm: string) => `${date} ${hhmm} 마감`,
    untilDeadline: "마감까지",
    countdownLabel: (text: string) => `마감까지 ${text} 남았습니다`,
    closingNow: "마감하는 중입니다",
    votedOf: (voted: number, total: number) =>
      `${total}명 중 ${voted}명 골랐습니다`,
    participants: (n: number) => `${n}명 참여`,
    participantsOf: (n: number, limit: number) =>
      `${n}명 참여, 최대 ${limit}명`,
    multi: "여러 곳 고를 수 있습니다",
    single: "한 곳만 고릅니다",
    backLabel: "투표 목록으로",
    shareLabel: "투표 공유",
    moreLabel: "투표 관리 더 보기",
    moreShown: (n: number) => `외 ${n}명`,
    avatarsLabel: (voted: number, total: number) =>
      `${total}명 중 ${voted}명 투표함`,
    votedMark: "투표함",
    me: "나",
    anonymous: "알 수 없음",
  },

  /** 후보 */
  candidate: {
    votes: (n: number) => `${n}표`,
    mine: "내 선택",
    walk: "도보",
    price: "1인",
    tally: "득표",
    minuteUnit: "분",
    voteUnit: "표",
    unresolved: (order: number) => `후보 ${order}`,
    kakaoMap: "카카오맵에서 보기",
    kakaoMapLabel: (order: number) =>
      `후보 ${order}, 카카오맵에서 보기 (새 창)`,
    listLabel: (title: string) => `${title} 후보`,
    loadingName: "이름을 찾는 중",
  },

  /** 기피 경고 (POLL-13) */
  avoid: {
    note: "참여자 중 이 식당 음식을 피하는 분이 있습니다. 누구인지는 알리지 않습니다.",
  },

  /** 투표 행동 */
  actions: {
    vote: "투표하기",
    voteMulti: (n: number) => `${n}곳에 투표하기`,
    pickFirst: "후보를 골라 주세요",
    change: "선택 바꾸기",
    cancelChange: "그대로 두기",
    cancelVote: "투표 취소",
    decide: "결정하기",
    decideNow: "지금 결정하기",
    loginToVote: "로그인하고 투표하기",
    joinToVote: "참여하고 투표하기",
    suggest: "후보 제안",
    addCandidate: "후보 넣기",
    approve: "승인",
    reject: "거절",
    retrySend: "다시 보내기",
    directions: "길찾기",
    shareResult: "결과 공유",
    reconnect: "다시 연결",
    roulette: "룰렛에 맡기기",
    pickThis: (nameWithRo: string) => `${nameWithRo} 정하기`,
    retry: "다시 시도",
    toPollTab: "투표 탭으로",
    newPoll: "투표 만들기",
    openRoom: "투표방 열기",
    copyLink: "링크 복사",
    cancelPoll: "투표 취소하기",
  },

  /** 투표 뒤 상태 줄 */
  voted: {
    done: "투표했어요. 마감 전까지 바꿀 수 있습니다.",
    changing: "다른 곳을 골라 다시 투표해 볼까요?",
    canceled: "투표를 취소했어요.",
    sent: "투표했어요.",
    sendFailed: "투표를 보내지 못했습니다. 고른 곳은 그대로 있습니다.",
  },

  /** 비로그인 미리보기 (POLL-05) */
  guest: {
    body: "로그인하면 이 투표로 돌아옵니다.",
    hiddenTally: "득표는 참여한 뒤에 보입니다.",
    joining: "투표방에 들어가는 중입니다",
  },

  /** 후보 제안 (POLL-07) */
  suggest: {
    sent: "제안을 보냈어요. 방장이 승인하면 후보에 들어갑니다.",
    pendingTitle: "제안받은 후보",
    pendingBy: "참여자 제안",
    mineTitle: "내가 제안한 후보",
    mineWaiting: "방장 승인을 기다리는 중입니다",
    full: "후보는 5곳까지 담을 수 있습니다.",
    approved: "후보에 넣었어요.",
    rejected: "제안을 넘겼어요.",
    pickTitle: "어느 곳을 제안할까요?",
    pickBody:
      "투표방 기준 근처 식당에서 고릅니다. 방장이 승인하면 후보에 들어갑니다.",
    hostPickTitle: "어느 곳을 넣을까요?",
    hostPickBody:
      "투표방 기준 근처 식당에서 고릅니다. 고르면 바로 후보에 들어갑니다.",
    pickEmpty:
      "제안할 수 있는 곳이 없습니다. 이미 후보에 있는 곳은 빼고 보여 줍니다.",
    pickLoading: "근처 식당을 찾는 중입니다",
    close: "제안 닫기",
    waitingFull: "제안은 한 사람이 3곳까지 기다릴 수 있습니다.",
  },

  /** 방장 결정 (POLL-08) */
  decide: {
    confirmTitle: "지금 마감할까요?",
    confirmBody: "지금 1위인 곳으로 정하고 투표를 마감합니다.",
    confirm: "마감하고 정하기",
    keep: "더 기다리기",
  },

  /** 동점 (POLL-08, D-14 안건 7, 8) */
  tie: {
    hostTitle: (n: number) => `${n}곳이 동점입니다`,
    hostBody: "직접 고를까요, 룰렛에 맡길까요?",
    hostPick: "동점인 곳을 눌러 고르거나 룰렛에 맡겨 주세요.",
    memberTitle: "방장이 동점을 정하는 중입니다",
    autoNote: "30분 안에 정하지 않으면 룰렛으로 정합니다.",
    rolling: "룰렛을 돌리는 중입니다",
    tieBadge: "동점",
  },

  /** 마감과 결과 (POLL-08, POLL-09) */
  result: {
    celebrate: {
      lunch: "오늘 점심은 여기로 정했어요.",
      dinner: "오늘 저녁은 여기로 정했어요.",
      party: "회식은 여기로 정했어요.",
    } satisfies Record<PollKindCopyKey, string>,
    winner: (name: string) => `1위는 ${name}입니다`,
    tally: (votes: number, total: number) =>
      `${total}명 중 ${votes}명이 골랐습니다.`,
    allVotes: "득표 결과",
    visitNote:
      "참여한 분 모두의 방문 기록에 후보로 담았습니다. 내일 어땠는지 묻습니다.",
    byRoulette: "동점이라 룰렛으로 정했습니다.",
    byAuto: "방장이 정하지 않아 룰렛으로 정했습니다.",
    byHostTie: "동점이라 방장이 정했습니다.",
    byHost: "방장이 마감했습니다.",
    byTime: "마감 시각에 정해졌습니다.",
    noVotesTitle: "정해진 곳이 없습니다",
    noVotesBody:
      "아무도 투표하지 않은 채 마감되었습니다. 새 투표를 만들어볼까요?",
  },

  /** 실시간 연결 (AC-POLL-1, D-14 안건 10) */
  live: {
    on: "실시간",
    onLabel: "득표가 실시간으로 갱신됩니다",
    lost: "실시간 연결이 끊겼습니다. 다시 연결하는 중입니다.",
    someoneVoted: "다른 참여자가 투표했습니다",
  },

  /** 방장 메뉴 (POLL-12) */
  host: {
    cancelTitle: "투표를 취소할까요?",
    cancelBody: "참여한 분 모두에게 취소되었다고 보입니다. 되돌릴 수 없습니다.",
    cancelConfirm: "취소하기",
    cancelKeep: "그대로 두기",
  },

  /** 들어갈 수 없는 투표방 (POLL-11, POLL-12, PRD 12장) */
  notices: {
    notFound: {
      title: "투표를 찾을 수 없습니다",
      body: "링크가 정확한지 확인해 주세요. 받은 링크를 그대로 열면 들어갈 수 있어요.",
    },
    expired: {
      title: "마감된 투표입니다",
      body: "마감 후 하루가 지나 링크가 닫혔습니다. 결과는 참여한 분만 볼 수 있습니다.",
    },
    closed: {
      title: "마감된 투표입니다",
      body: "마감된 투표에는 새로 참여할 수 없습니다. 결과는 참여한 분만 볼 수 있습니다.",
    },
    full: {
      title: "참여 인원이 가득 찼습니다",
      body: "한 투표에는 30명까지 참여할 수 있습니다. 방장에게 새 투표를 부탁해 보세요.",
    },
    canceled: {
      title: "방장이 투표를 취소했습니다",
      body: "이 투표에는 더 참여할 수 없습니다. 새로 만들어볼까요?",
    },
  },

  /** 결과 공유 링크 /poll/<code>/result (POLL-09S, D-17 안건 7). 식당 이름 없음 */
  publicResult: {
    decided: (title: string) => `${title}, 정해졌어요`,
    openBody:
      "결과는 참여한 분만 볼 수 있습니다. 참여했다면 투표방에서 확인해 주세요.",
    stillOpen: (title: string) => `${title}, 아직 투표 중입니다`,
    stillOpenBody: "마감 전이라 지금 참여할 수 있어요.",
    noResult: (title: string) => `${title}, 마감되었습니다`,
  },

  /** 4상태와 오류 */
  states: {
    loading: "투표방을 불러오는 중입니다",
    empty: {
      title: "아직 투표한 사람이 없습니다",
      body: "먼저 골라볼까요?",
    },
    error: {
      title: "투표방을 불러오지 못했습니다",
      body: "잠시 후 다시 시도해 주세요.",
    },
    offline: {
      title: "오프라인입니다",
      body: "마지막으로 받은 득표입니다. 연결되면 투표할 수 있습니다.",
      button: "연결되면 투표할 수 있습니다",
      guestBody: "연결되면 투표방을 불러옵니다.",
    },
  },

  /** 쓰기 실패 (토스트 대신 화면 줄) */
  errors: {
    closed: "이미 마감된 투표입니다. 화면을 새로 고쳤습니다.",
    notHost: "방장만 할 수 있습니다.",
    full: "후보는 5곳까지 담을 수 있습니다.",
    exists: "이미 후보에 있는 곳입니다.",
    suggestionsFull: "제안은 한 사람이 3곳까지 기다릴 수 있습니다.",
    save: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    joinFailed: "투표방에 들어가지 못했습니다. 잠시 후 다시 시도해 주세요.",
  },
} as const;
