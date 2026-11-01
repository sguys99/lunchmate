// 관리자 화면 시안 문구 (T8.5a, /design-lab/admin/<a|b|c>). MOD-01~MOD-03, MOD-06.
// 문체: 상태, 결과, 오류, 정책은 습니다체. 확인 질문과 제안은 해요체. 버튼, 탭, 라벨은 명사형(비율 제외).
// 목업 닉네임과 식당 이름, 후기 글은 모두 지어낸 값이다. 시안을 고른 뒤(T8.5) 실제 구현 때 src/copy/admin.ts로 옮긴다.

export const adminLabCopy = {
  /** T8.5 뒤 선택안 C만 남겼다(D-19). 실제 화면은 /admin, 문구는 src/copy/admin.ts */
  names: {
    c: "관리자 시안 C 한 건씩 검토 (선택안)",
  },
  index: {
    title: "관리자 화면 시안 (T8.5a)",
    body: "고른 시안 C를 확인 화면으로 남겼습니다. 실제 화면은 /admin에 있습니다.",
  },

  /** 공통 틀 */
  frame: {
    brand: "런치메이트 관리",
    signedInAs: (nick: string) => `${nick} 님, 관리자`,
    navLabel: "관리 메뉴",
    loading: "관리 목록을 불러오는 중입니다",
  },

  sections: {
    reviews: "신고된 후기",
    closures: "폐업 제보",
    users: "사용자",
    log: "처리 이력",
  },
  sectionCount: (label: string, n: number) => `${label}, 검토 대기 ${n}건`,

  /** 상태 묶음 */
  status: {
    autoHidden: "자동 숨김",
    autoHiddenHelp:
      "세 분이 신고해 자동으로 숨겼습니다. 숨김을 확정하거나 복구합니다.",
    open: "신고 접수",
    reported: "제보 접수",
    openHelp: "아직 다른 분들께 보이는 글입니다.",
    hiddenByAdmin: "숨김 확정",
    restored: "복구함",
    pending: "검토 대기",
    all: "전체",
    done: "처리됨",
    excluded: "추천 제외 중",
    confirmedClosed: "폐업 확인",
    dismissed: "영업 중으로 둠",
    active: "이용 중",
    suspended: "정지",
  },

  /** 신고 대상과 사유 (review_reports.reason) */
  target: {
    review: "후기",
    deal: "할인 정보",
  },
  reasons: {
    spam: "광고, 스팸",
    abuse: "욕설, 비방",
    privacy: "개인정보",
    false: "허위",
    other: "기타",
    ad_false: "광고성, 허위",
  },
  reasonCount: (label: string, n: number) => `${label} ${n}`,
  reportCount: (n: number) => `신고 ${n}건`,
  reportCountShort: (n: number) => `${n}건`,
  noteTitle: "기타 사유에 남긴 말",

  /** 장소 표시 (카카오 장소 이름은 저장하지 않는다, T0.16, T5.12a) */
  place: {
    idLabel: (id: string) => `장소 ${id}`,
    kakaoMap: "카카오맵에서 보기",
    kakaoMapLabel: (id: string) => `장소 ${id}를 카카오맵에서 보기 (새 창)`,
    unmatched: "이름을 찾지 못했습니다",
    matchedHint: "이 브라우저에서 찾은 이름입니다. 저장하지 않습니다.",
  },

  /** 후기 본문 */
  review: {
    rating: { up: "좋았어요", down: "아쉬웠어요" },
    noBody: "글 없이 평가만 남긴 후기입니다.",
    privateNow:
      "작성자가 신고 뒤 나만 보기로 바꿔 글을 볼 수 없습니다. 지금은 다른 분들께 보이지 않습니다.",
    privateNowShort: "작성자가 나만 보기로 바꾼 글",
    writtenAt: (when: string) => `${when} 작성`,
    firstReported: (when: string) => `첫 신고 ${when}`,
    bodyLabel: "후기 글",
  },

  /** 작성자 */
  author: {
    title: "작성자",
    received: (n: number) => `받은 신고 ${n}건`,
    hiddenBefore: (n: number) => `숨겨진 글 ${n}건`,
    joined: (when: string) => `${when} 가입`,
    suspendAuthor: "작성자 정지",
    deleted: "탈퇴한 사용자",
  },

  /** 처리 버튼 */
  actions: {
    hide: "숨기기",
    confirmHide: "숨김 확정",
    restore: "복구",
    keep: "문제없음",
    skip: "건너뛰기",
    suspend: "정지",
    unsuspend: "정지 해제",
    confirmClosed: "폐업 확인",
    dismissClosed: "영업 중으로 두기",
    undo: "되돌리기",
    expand: "펼치기",
    hideWithReason: (reason: string) => `${reason} 사유로 숨기기`,
  },

  /** 처리 결과 토스트와 줄 */
  done: {
    hidden: "후기를 숨겼습니다.",
    hiddenMany: (n: number) => `${n}건을 숨겼습니다.`,
    restored: "후기를 복구했습니다. 다시 다른 분들께 보입니다.",
    restoredMany: (n: number) => `${n}건을 복구했습니다.`,
    closedConfirmed: "폐업으로 확인했습니다. 추천에서 계속 뺍니다.",
    closedDismissed: "영업 중으로 두었습니다. 지금까지의 제보는 세지 않습니다.",
    suspended: (nick: string) => `${nick} 님을 정지했습니다.`,
    unsuspended: (nick: string) => `${nick} 님의 정지를 풀었습니다.`,
    undone: "되돌렸습니다.",
    undoHint: "처리 이력에서도 되돌릴 수 있습니다.",
  },

  /** 숨김 사유 고르기 */
  hideReason: {
    title: "어떤 사유로 숨길까요?",
    legend: "숨김 사유",
    preset: "가장 많이 받은 신고 사유를 미리 골랐습니다.",
  },

  /** 확인 상자 */
  confirm: {
    suspendTitle: (nick: string) => `${nick} 님을 정지할까요?`,
    suspendBody:
      "정지하면 후기, 신고, 제보, 투표를 새로 할 수 없고 공개 후기가 목록에서 빠집니다. 로그인과 탈퇴는 그대로 됩니다.",
    durationLegend: "정지 기간",
    durations: { d7: "7일", d30: "30일", indefinite: "해제할 때까지" },
    reasonLegend: "정지 사유",
    suspendReasons: {
      repeated: "신고 누적",
      spam: "광고 도배",
      abuse: "욕설, 비방",
      privacy: "개인정보 노출",
      other: "기타",
    },
    suspendAction: "정지하기",
    unsuspendTitle: (nick: string) => `${nick} 님의 정지를 풀까요?`,
    unsuspendBody:
      "바로 다시 후기와 제보를 남길 수 있습니다. 숨긴 글은 그대로 둡니다.",
    unsuspendAction: "정지 풀기",
    closedTitle: "폐업으로 확인할까요?",
    closedBody:
      "추천과 지도에서 계속 뺍니다. 처리 이력에서 되돌릴 수 있습니다.",
  },

  /** 폐업 제보 */
  closures: {
    kinds: { gone: "아예 닫았어요", moved: "옮겼어요", today: "오늘만 쉬어요" },
    reporters: (n: number) => `서로 다른 ${n}명`,
    todayNote: "오늘만 쉬어요는 폐업 수에 세지 않습니다.",
    excludedHelp:
      "서로 다른 세 분 이상이 알려 추천에서 빼고 있습니다. 확인하거나 영업 중으로 둡니다.",
    openHelp: "아직 추천에 나옵니다. 세 분이 알리면 자동으로 뺍니다.",
    lastReported: (when: string) => `마지막 제보 ${when}`,
    countLabel: "폐업 제보",
  },

  /** 사용자 */
  users: {
    candidates: "정지 검토가 필요한 분",
    candidatesHelp: "숨겨진 글이 2건 이상인 분을 먼저 보여 줍니다.",
    suspendedList: "정지 중",
    suspendedUntil: (when: string) => `${when}까지`,
    suspendedIndefinite: "해제할 때까지",
    provider: { kakao: "카카오", naver: "네이버", google: "구글" },
    columns: {
      nickname: "닉네임",
      provider: "로그인",
      received: "받은 신고",
      hidden: "숨겨진 글",
      status: "상태",
      joined: "가입",
    },
  },

  /** 처리 이력 */
  log: {
    title: "처리 이력",
    today: "오늘 처리한 것",
    todayCount: (n: number) => `오늘 처리한 것 ${n}건`,
    by: (nick: string) => `${nick} 님`,
    actions: {
      hide: "후기 숨김",
      restore: "후기 복구",
      closedConfirm: "폐업 확인",
      closedDismiss: "영업 중으로 둠",
      suspend: "사용자 정지",
      unsuspend: "정지 해제",
      autoHide: "자동 숨김 (신고 3건)",
    },
    undone: "되돌림",
    system: "자동",
    retention: "처리 이력은 1년 동안 보관합니다.",
    columns: {
      at: "시각",
      action: "처리",
      target: "대상",
      reason: "사유",
      by: "처리한 분",
    },
  },


  /** 한 건씩 검토 큐 */
  queue: {
    progress: (done: number, total: number) => `${total}건 중 ${done}건 처리`,
    remaining: (n: number) => `남은 ${n}건`,
    position: (i: number, n: number) => `${n}건 중 ${i}번째`,
    allDoneTitle: "오늘 검토할 것을 모두 마쳤습니다",
    allDoneBody: "새 신고가 들어오면 이 자리에 보입니다.",
    nextLabel: "다음 건",
  },

  /** 키보드 단축키 */
  keys: {
    title: "단축키",
    hide: "숨기기",
    keep: "문제없음, 복구",
    suspend: "작성자 정지",
    undo: "되돌리기",
  },

  /** 4상태 */
  states: {
    emptyTitle: "검토할 신고가 없습니다",
    emptyBody:
      "새 신고가 들어오면 여기에 보입니다. 처리 이력에서 지난 처리를 볼 수 있습니다.",
    emptyAction: "처리 이력 보기",
    errorTitle: "관리 목록을 불러오지 못했습니다",
    errorBody:
      "잠시 뒤 다시 시도해 주세요. 처리한 내용은 그대로 저장되어 있습니다.",
    offlineTitle: "오프라인입니다",
    offlineBody: "마지막으로 받은 목록입니다. 연결되면 처리할 수 있습니다.",
    offlineAction: "연결되면 처리할 수 있습니다",
  },
} as const;

export type AdminLabCopy = typeof adminLabCopy;
