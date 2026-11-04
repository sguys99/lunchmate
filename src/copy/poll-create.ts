// 투표 만들기 시트와 투표 탭 문구 (T7.11~T7.13, T7.21, D-15, DESIGN.md 5장 "투표 만들기", copy-guide 4.7).
// 묻기, 권유, 축하는 해요체, 상태 안내, 고지, 오류, 결과는 습니다체 (tasks.md 2.2절). 버튼과 라벨은 명사형.
// 진입점 이름은 홈 문구(home.ts actions.pollWithFriends, party)와 같다.
// 제목과 식당 이름 뒤에는 조사를 붙이지 않는다(사용자 값이라 받침을 모른다, copy-guide 7.3).
import type { PollWriteError } from "@/features/poll/create/errors";

export const pollCreateCopy = {
  entries: {
    friends: "친구랑 정하기",
    friendsHint: "오늘 세 곳으로 바로 투표를 만듭니다.",
    detail: "투표에 추가",
    addTo: (title: string) => `${title} 투표에 넣기`,
    addToFull: (title: string) => `${title} 투표는 후보 5곳이 찼습니다`,
    newPoll: "새 투표 만들기",
    menuLabel: "투표에 추가",
    added: (title: string) => `${title} 투표에 넣었습니다.`,
    addFailed: "후보를 넣지 못했습니다. 잠시 후 다시 시도해 주세요.",
    alreadyIn: "이미 그 투표의 후보입니다.",
    noOffice: "회사 위치를 먼저 정해 주세요. 나 탭 설정에서 정할 수 있습니다.",
    needTwo: "추천이 두 곳 이상 있어야 투표를 만들 수 있습니다.",
  },

  sheet: {
    close: "투표 만들기 닫기",
    loading: "투표 만들기를 여는 중입니다",
    loadFailed: "투표 만들기를 열지 못했습니다",
    loadFailedBody: "연결을 확인한 뒤 다시 눌러 주세요.",
    eyebrow: {
      home: "친구랑 정하기",
      detail: "투표에 추가",
      party: "회식 모드에서",
      map: "지도에서",
    },
  },

  instant: {
    title: "투표방을 만들었어요",
    body: "기본값으로 만들었습니다. 바꿀 것이 있으면 줄을 눌러 고쳐 주세요.",
    detailBody: "오늘 추천을 함께 넣었습니다. 줄을 눌러 바꿀 수 있습니다.",
    partyBody:
      "회식 모드에서 고른 후보로 만들었습니다. 줄을 눌러 바꿀 수 있습니다.",
    undo: "만들기 취소",
    undone: "투표방을 지웠습니다. 오늘 만들 수 있는 개수에서도 빠집니다.",
    undoFailed:
      "링크를 보낸 투표라 여기서는 취소할 수 없습니다. 투표방에서 취소해 주세요.",
    creating: "투표방을 만드는 중입니다",
    rows: {
      title: "제목",
      deadline: "마감",
      candidates: "후보",
      mode: "방식",
    },
    editHint: "고치기",
    done: "다 고쳤어요",
    saved: "바꾼 내용을 투표방에 반영했습니다.",
    saving: "반영하는 중입니다",
  },

  confirm: {
    title: "투표를 만들까요?",
    body: "아래 내용으로 투표방을 만듭니다. 만든 뒤에도 고칠 수 있습니다.",
    submit: "투표 만들기",
  },

  title: {
    inputLabel: "투표 제목",
    max: 20,
    empty: "제목을 적어 주세요.",
    banned: "쓸 수 없는 표현이 있습니다. 제목을 바꿔 주세요.",
    suffix: { lunch: "점심", dinner: "저녁", party: "회식" },
  },

  candidates: {
    count: (n: number) => `${n}곳`,
    countOf: (n: number, max: number) => `${n}/${max}`,
    remove: (name: string) => `${name} 빼기`,
    needOne: "후보를 한 곳 더 넣어 주세요.",
    full: "후보는 5곳까지입니다. 하나를 빼면 더 넣을 수 있습니다.",
    min: "후보는 2곳 아래로 줄일 수 없습니다.",
    fromToday: "오늘 추천",
    /** 오늘(홈) 카드 묶음(세션 메모리). 홈에 다녀오지 않았으면 이 묶음은 없다 */
    today: "오늘 추천",
    favorites: "즐겨찾기",
    recent: "최근 간 곳",
    more: "더 보기",
    pickHint: "후보에 넣기",
    fromMap: "지도에서 고르기",
    fromMapHint:
      '지도에서 식당을 누르고 더 보기에서 "투표에 추가"를 눌러보세요.',
    walk: (min: number) => `도보 ${min}분`,
    loading: "후보를 불러오는 중입니다",
    nothingToAdd: "더 넣을 오늘 추천, 즐겨찾기, 최근 간 곳이 없습니다.",
    added: (name: string) => `${name}, 후보에 넣었습니다.`,
    removed: (name: string) => `${name}, 후보에서 뺐습니다.`,
    unnamed: (n: number) => `후보 ${n}`,
  },

  deadline: {
    title: "마감",
    in10: "10분 뒤",
    in30: "30분 뒤",
    in60: "1시간 뒤",
    today18: "오늘 18:00",
    tomorrow12: "내일 12:00",
    custom: "직접",
    tileToday: "오늘",
    tileTomorrow: "내일",
    at: (hhmm: string) => `${hhmm}에 마감합니다.`,
    atDay: (day: string, hhmm: string) => `${day} ${hhmm}에 마감합니다.`,
    dayLabel: (offset: number) =>
      offset === 1 ? "내일" : offset === 2 ? "모레" : `${offset}일 뒤`,
    customLabel: "마감 시각",
    customTooSoon: "10분 뒤보다 늦은 시각을 골라 주세요.",
    customPartyRange: "10분 뒤부터 7일 안에서 골라 주세요.",
    lateNote: (hhmm: string) =>
      `지금은 ${hhmm} 이후라 1시간 뒤를 대신 보여 줍니다.`,
  },

  mode: {
    single: "한 곳만",
    multi: "여러 곳",
    singleNote: "한 사람이 한 곳에 표를 냅니다.",
    multiNote:
      "한 사람이 여러 곳에 표를 낼 수 있습니다. 1위는 표가 가장 많은 곳입니다.",
  },

  anchor: {
    label: "후보 이름 기준",
    office: (name: string) => `${name} 핀 근처`,
    officeFallback: "회사 핀 근처",
    picked: "지도에서 찍은 곳 근처",
    note: "친구 화면에서 후보 이름을 이 위치 주변에서 찾습니다. 현위치는 쓰지 않습니다.",
    outside:
      "기준에서 먼 후보가 있어 친구 화면에 이름이 안 보일 수 있습니다. 기준을 바꿔 주세요.",
    change: "기준 바꾸기",
    pickTitle: "후보 이름 기준 고르기",
    pickBody: "지도를 움직여 가운데 점을 후보들 근처에 맞춰 주세요.",
    pickDone: "이 위치로",
    pickCancel: "그대로 두기",
    pickedNote: "기준을 바꿨습니다.",
  },

  share: {
    kakao: "카카오톡으로 보내기",
    webShare: "다른 앱으로",
    copy: "링크 복사",
    copied: "링크를 복사했습니다.",
    copiedShort: "복사함",
    goRoom: "투표방으로 가기",
    previewLabel: "친구에게 보이는 미리보기",
    previewBrand: "런치메이트",
    previewKind: {
      lunch: "점심 투표",
      dinner: "저녁 투표",
      party: "회식 투표",
    },
    previewCandidates: "후보",
    previewCandidatesUnit: "곳",
    previewDeadline: "마감",
    previewNote:
      "미리보기에는 식당 이름이 나오지 않습니다. 이름은 링크를 연 뒤에 보입니다.",
    limitLeft: (n: number) => `오늘 ${n}개 더 만들 수 있습니다.`,
    failed: {
      title: "카카오톡을 열지 못했습니다",
      body: "링크를 복사해 대화방에 붙여 넣어 주세요.",
    },
  },

  states: {
    saveError: {
      title: "투표방을 만들지 못했습니다",
      body: "고른 내용은 그대로 있습니다. 잠시 후 다시 시도해 주세요.",
      retry: "다시 만들기",
    },
    limit: {
      title: "오늘 만들 수 있는 투표를 모두 만들었습니다",
      body: "투표방은 하루 10개까지입니다. 내일 다시 만들어 주세요.",
      goList: "진행 중인 투표 보기",
    },
    offline: {
      title: "연결되면 만들 수 있습니다",
      body: "고른 내용은 이 화면에 남아 있습니다.",
    },
    signedOut: {
      title: "로그인이 필요합니다",
      body: "투표는 로그인한 뒤에 만들 수 있습니다.",
    },
  },

  /** 고치기 실패 한 줄 */
  editErrors: {
    invalid: "입력을 확인해 주세요.",
    unauthenticated: "다시 로그인해 주세요.",
    banned: "쓸 수 없는 표현이 있습니다. 제목을 바꿔 주세요.",
    limit: "오늘 만들 수 있는 투표를 모두 만들었습니다.",
    deadline:
      "마감은 1분 뒤부터 정할 수 있습니다. 점심과 저녁은 24시간, 회식은 7일 안입니다.",
    not_found: "투표방을 찾지 못했습니다.",
    closed: "이미 마감한 투표라 고칠 수 없습니다.",
    shared:
      "링크를 보낸 투표라 여기서는 취소할 수 없습니다. 투표방에서 취소해 주세요.",
    full: "후보는 5곳까지입니다.",
    min: "후보는 2곳 아래로 줄일 수 없습니다.",
    exists: "이미 넣은 후보입니다.",
    multi_votes: "이미 표가 있어 방식을 바꿀 수 없습니다.",
    no_office: "회사 위치를 먼저 정해 주세요. 나 탭 설정에서 정할 수 있습니다.",
    suspended: "이용이 제한된 계정이라 투표를 만들 수 없습니다.",
    save: "반영하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  } satisfies Record<PollWriteError, string>,

  /** 투표 탭 (POLL-10) */
  tab: {
    title: "투표",
    lead: "친구와 함께 고른 곳이 여기에 모입니다.",
    open: "진행 중",
    past: "지난 투표",
    partyLink: "회식 후보 찾기",
    newHint: '오늘 화면의 "친구랑 정하기"로 투표를 만들어보세요.',
    goToday: "오늘 추천 보기",
    loading: "투표 목록을 불러오는 중입니다",
    empty: {
      title: "아직 투표가 없습니다",
      body: "오늘 추천 세 곳으로 바로 투표를 만들어 친구에게 보내보세요.",
    },
    pastEmpty: "지난 투표가 없습니다.",
    error: {
      title: "투표 목록을 불러오지 못했습니다",
      body: "잠시 후 다시 시도해 주세요.",
      retry: "다시 불러오기",
    },
    offline: {
      title: "인터넷에 연결되어 있지 않습니다",
      body: "연결되면 투표 목록을 불러옵니다.",
    },
    kind: { lunch: "점심", dinner: "저녁", party: "회식" },
    host: "내가 연 투표",
    voted: "투표함",
    notVoted: "아직 안 고름",
    members: (n: number) => `${n}명 참여`,
    candidates: (n: number) => `후보 ${n}곳`,
    closesAt: (when: string) => `${when} 마감`,
    tie: "동점, 방장이 정하는 중",
    decided: "결과 나옴",
    noResult: "표 없이 마감",
    canceled: "취소됨",
    closedOn: (when: string) => `${when} 마감`,
    deleteLabel: (title: string) => `${title} 투표 기록 삭제`,
    deleteAsk: "이 투표를 내 목록에서 지울까요?",
    deleteBody:
      "내 목록에서만 지워지고 다른 참여자의 결과는 그대로 남습니다. 되돌릴 수 없습니다.",
    deleteConfirm: "지우기",
    keep: "그대로 두기",
    deleting: "투표 기록을 지우는 중입니다.",
    deleted: "투표 기록을 지웠습니다.",
    deleteFailed: "지우지 못했습니다. 잠시 후 다시 시도해 주세요.",
    offlineToast: "연결되면 지울 수 있습니다.",
  },
} as const;
