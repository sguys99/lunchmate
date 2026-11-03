// 관리자 화면 문구 (T8.5, /admin). MOD-02, MOD-03, MOD-06, AC-FB-2. 시안 C 문구(design-lab-admin.ts)를 옮기고 실제 데이터용으로 다듬었다.
// 문체: 상태, 결과, 오류, 정책은 습니다체. 확인 질문과 제안은 해요체. 버튼, 탭, 라벨은 명사형(비율 제외).
// 장소 이름은 저장하지 않으므로(T0.16) 장소 번호 + 카카오맵 링크로 보인다.

export type AdminReportReason =
  "spam" | "abuse" | "privacy" | "false" | "other" | "ad_false";
export type AdminSuspendReason =
  "repeated" | "spam" | "abuse" | "privacy" | "other";
export type AdminSuspendDuration = "d7" | "d30" | "indefinite";

export const adminCopy = {
  metaTitle: "관리",

  frame: {
    brand: "런치메이트 관리",
    signedInAs: (nick: string) => `${nick} 님, 관리자`,
    navLabel: "관리 메뉴",
    loading: "관리 목록을 불러오는 중입니다",
    refresh: "새로고침",
  },

  sections: {
    reviews: "신고된 후기",
    closures: "폐업 제보",
    menus: "메뉴 제보",
    users: "사용자",
    log: "처리 이력",
    beta: "베타 의견",
  },

  /** 베타 의견 구역 (T9.4, D-23 안건 14). 읽음 처리 없음, 작성자는 익명 번호 */
  beta: {
    title: "베타 의견",
    filterLabel: "의견 종류",
    filters: {
      all: "전체",
      bug: "버그",
      inconvenient: "불편해요",
      good: "좋아요",
      idea: "제안",
      none: "종류 없음",
    },
    count: (n: number) => `${n}건`,
    author: (n: number) => `참여자 ${n}`,
    noRoute: "화면 안 보냄",
    devices: { ios: "아이폰", android: "안드로이드", desktop: "컴퓨터" },
    inApp: "앱 안 브라우저",
    standalone: "홈 화면 앱",
    app: (v: string) => `앱 ${v}`,
    algo: (v: string) => `추천 ${v}`,
    empty: "아직 받은 의견이 없습니다.",
    emptyFiltered: "이 종류의 의견이 없습니다.",
    emptyBody: "새 의견이 들어오면 이 자리에 최신순으로 보입니다.",
    capped: (n: number) => `최근 ${n}건만 보입니다.`,
    retention:
      "베타 의견은 베타가 끝나고 6개월 뒤 지웁니다. 보낸 사람이 탈퇴하면 바로 지웁니다.",
    errorTitle: "베타 의견을 불러오지 못했습니다",
    errorBody: "잠시 후 다시 시도해 주세요.",
  },

  status: {
    autoHidden: "자동 숨김",
    autoHiddenHelp:
      "세 분 이상이 신고해 자동으로 숨겼습니다. 숨김을 확정할지 복구할지 골라 주세요.",
    open: "신고 접수",
    reported: "제보 접수",
    openHelp: "아직 다른 분들께 보이는 글입니다.",
    excluded: "추천 제외 중",
    suspended: "정지",
  },

  target: {
    review: "후기",
    deal: "할인 정보",
  },

  /** 메뉴 제보 구역 (T10.16f, MENU-05, D-37 A 한 건씩 큐). 제보자 정보는 보이지 않는다(숫자만) */
  menus: {
    flagged: "신고된 메뉴",
    mergeKind: "합치기 후보",
    why: {
      contains: "한쪽 이름이 다른 쪽에 들어 있음",
      typo: "한 글자 차이",
    },
    pair: (from: string, to: string) => `${from}을 ${to}로`,
    reasons: {
      false: "가격이나 메뉴가 달라요",
      abuse: "욕설이나 비방",
      spam: "광고나 도배",
      other: "기타",
    },
    reports: (n: number) => `제보 ${n}건`,
    median: (won: string) => `중앙값 ${won}원`,
    range: (lo: string, hi: string) => `${lo}~${hi}원`,
    won: (v: string) => `${v}원`,
    last: (m: number) => `최근 ${m}월`,
    variants: "쓴 이름",
    variant: (name: string, n: number) => `${name} ${n}건`,
    autoHidden: "자동 숨김",
    autoHiddenHelp: "세 분이 신고해 메뉴판에서 내렸습니다. 숨김을 확정하거나 문제없음으로 되살립니다.",
    open: "신고 접수",
    openHelp: "아직 메뉴판에 보이는 줄입니다.",
    pickTarget: "어느 메뉴로 합칠까요?",
    pickTargetHelp: "같은 식당 메뉴만 고를 수 있습니다. 합친 뒤에도 원래 제보는 지우지 않습니다.",
    noOthers: "같은 식당에 합칠 다른 메뉴가 없습니다.",
    mergeInto: "다른 메뉴로 합치기",
    merge: "합치기",
    separate: "따로 두기",
    cancel: "취소",
    done: {
      hidden: (name: string) => `${name}을 메뉴판에서 내렸습니다.`,
      cleared: (name: string) => `${name}은 그대로 둡니다. 지금까지의 신고는 세지 않습니다.`,
      merged: (from: string, to: string) => `${from}을 ${to}로 합쳤습니다.`,
      separated: (from: string, to: string) => `${from}과 ${to}는 따로 둡니다.`,
    },
  },
  reasons: {
    spam: "광고, 스팸",
    abuse: "욕설, 비방",
    privacy: "개인정보",
    false: "허위",
    other: "기타",
    ad_false: "광고성, 허위",
  } satisfies Record<AdminReportReason, string>,
  reasonCount: (label: string, n: number) => `${label} ${n}`,
  reportCount: (n: number) => `신고 ${n}건`,
  noteTitle: "기타 사유에 남긴 말",

  place: {
    idLabel: (id: string) => `장소 ${id}`,
    kakaoMap: "카카오맵에서 보기",
    kakaoMapLabel: (id: string) => `장소 ${id}를 카카오맵에서 보기 (새 창)`,
    unnamedHint: "장소 이름은 저장하지 않습니다. 카카오맵에서 확인해 주세요.",
  },

  review: {
    rating: { up: "좋았어요", down: "별로였어요" },
    noBody: "글 없이 평가만 남긴 후기입니다.",
    privateNow:
      "작성자가 신고 뒤 나만 보기로 바꿔 글을 볼 수 없습니다. 지금은 다른 분들께 보이지 않습니다.",
    privateNowShort: "작성자가 나만 보기로 바꾼 글",
    writtenAt: (when: string) => `${when} 작성`,
    firstReported: (when: string) => `첫 신고 ${when}`,
  },

  author: {
    title: "작성자",
    noNickname: "이름 없음",
    received: (n: number) => `받은 신고 ${n}건`,
    hiddenBefore: (n: number) => `숨겨진 글 ${n}건`,
    joined: (when: string) => `${when} 가입`,
    suspendAuthor: "작성자 정지",
  },

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
    search: "찾기",
    hideWithReason: (reason: string) => `${reason} 사유로 숨기기`,
  },

  /** B 조각: 같은 작성자의 다른 신고 글 일괄 숨김 (D-19 조합 2) */
  sameAuthor: {
    label: (n: number) => `같은 작성자의 다른 신고 글 ${n}건도 함께 숨기기`,
    confirmTitle: (n: number) => `${n}건을 함께 숨길까요?`,
    confirmBody:
      "같은 작성자가 쓴 검토 대기 글을 모두 같은 사유로 숨깁니다. 처리 이력에서 하나씩 되돌릴 수 있습니다.",
    confirmAction: (n: number) => `${n}건 숨기기`,
  },

  done: {
    hidden: "숨김을 확정했습니다.",
    hiddenMany: (n: number) => `${n}건을 숨겼습니다.`,
    restored: "복구했습니다. 다시 다른 분들께 보입니다.",
    kept: "문제없음으로 넘겼습니다. 지금까지의 신고는 세지 않습니다.",
    closedConfirmed: "폐업으로 확인했습니다. 추천에서 계속 뺍니다.",
    closedDismissed: "영업 중으로 두었습니다. 지금까지의 제보는 세지 않습니다.",
    suspended: (nick: string) => `${nick} 님을 정지했습니다.`,
    unsuspended: (nick: string) => `${nick} 님의 정지를 풀었습니다.`,
    cleared: (nick: string) => `${nick} 님을 문제없음으로 넘겼습니다.`,
    undone: "되돌렸습니다.",
    undoHint: "처리 이력에서도 되돌릴 수 있습니다.",
  },

  /** 카드가 바뀔 때 스크린 리더 알림 (6절 품질 메모) */
  announce: {
    next: (left: number) => `다음 건입니다. 남은 ${left}건.`,
    allDone: "검토할 것을 모두 마쳤습니다.",
  },

  hideReason: {
    title: "어떤 사유로 숨길까요?",
    legend: "숨김 사유",
    preset: "가장 많이 받은 신고 사유를 미리 골라 두었어요.",
  },

  confirm: {
    suspendTitle: (nick: string) => `${nick} 님을 정지할까요?`,
    suspendBody:
      "정지하면 후기, 신고, 제보, 투표를 새로 할 수 없고 공개 후기가 목록에서 빠집니다. 로그인과 탈퇴는 그대로 됩니다.",
    durationLegend: "정지 기간",
    durations: {
      d7: "7일",
      d30: "30일",
      indefinite: "해제할 때까지",
    } satisfies Record<AdminSuspendDuration, string>,
    reasonLegend: "정지 사유",
    suspendReasons: {
      repeated: "신고 누적",
      spam: "광고 도배",
      abuse: "욕설, 비방",
      privacy: "개인정보 노출",
      other: "기타",
    } satisfies Record<AdminSuspendReason, string>,
    suspendAction: "정지하기",
    unsuspendTitle: (nick: string) => `${nick} 님의 정지를 풀까요?`,
    unsuspendBody:
      "바로 다시 후기와 제보를 남길 수 있습니다. 숨긴 글은 그대로 둡니다.",
    unsuspendAction: "정지 풀기",
    closedTitle: "폐업으로 확인할까요?",
    closedBody:
      "추천과 지도에서 계속 뺍니다. 처리 이력에서 되돌릴 수 있습니다.",
  },

  closures: {
    kinds: { gone: "아예 닫았어요", moved: "옮겼어요", today: "오늘만 쉬어요" },
    unspecified: (n: number) => `종류를 고르지 않은 제보 ${n}건이 더 있습니다.`,
    todayNote: '"오늘만 쉬어요"는 폐업 수에 세지 않습니다.',
    excludedHelp:
      "서로 다른 세 분 이상이 알려 추천에서 빼고 있습니다. 폐업을 확인할지 영업 중으로 둘지 골라 주세요.",
    openHelp: "아직 추천에 나옵니다. 세 분이 알리면 자동으로 뺍니다.",
    dismissedBefore: (when: string) =>
      `${when}에 영업 중으로 둔 곳입니다. 그 뒤의 제보만 셉니다.`,
    lastReported: (when: string) => `마지막 제보 ${when}`,
  },

  users: {
    searchLabel: "닉네임으로 찾기",
    searchPlaceholder: "닉네임",
    searchEmpty: "찾는 닉네임이 없습니다.",
    searchResults: (n: number) => `찾은 사용자 ${n}명`,
    candidates: "정지 검토가 필요한 분",
    candidatesHelp:
      "마지막 결정 뒤 숨겨진 글이 2건 이상인 분을 먼저 보여 줍니다.",
    suspendedList: "정지 중",
    suspendedNone: "정지 중인 분이 없습니다.",
    suspendedUntil: (when: string) => `${when}까지`,
    suspendedIndefinite: "해제할 때까지",
    provider: {
      "custom:kakao": "카카오",
      "custom:naver": "네이버",
      google: "구글",
    } as Readonly<Record<string, string>>,
    providerUnknown: "로그인 정보 없음",
    received: "받은 신고",
    hidden: "숨겨진 글",
    hiddenItem: "숨김",
    adminBadge: "관리자",
  },

  log: {
    title: "처리 이력",
    today: "오늘 처리한 것",
    todayCount: (n: number) => `오늘 처리한 것 ${n}건`,
    empty: "아직 처리한 것이 없습니다.",
    by: (nick: string) => `${nick} 님`,
    system: "자동",
    actions: {
      review_hide: "후기 숨김",
      review_restore: "후기 복구",
      deal_hide: "할인 정보 숨김",
      deal_restore: "할인 정보 복구",
      closed_confirm: "폐업 확인",
      closed_dismiss: "영업 중으로 둠",
      user_suspend: "사용자 정지",
      user_unsuspend: "정지 해제",
      user_clear: "정지 검토 문제없음",
      menu_hide: "메뉴 숨김",
      menu_clear: "메뉴 문제없음",
      menu_merge: "메뉴 합치기",
      menu_separate: "메뉴 따로 두기",
    },
    expired: "기간 만료",
    deletedUser: "탈퇴한 사용자",
    deletedTarget: "지워진 글",
    undone: "되돌림",
    retention: "처리 이력은 1년 동안 보관합니다.",
  },

  queue: {
    progress: (done: number, total: number) => `${total}건 중 ${done}건 처리`,
    remaining: (n: number) => `남은 ${n}건`,
    position: (i: number, n: number) => `${n}건 중 ${i}번째`,
    allDoneTitle: "검토할 것을 모두 마쳤습니다",
    allDoneBody: "새 신고가 들어오면 이 자리에 보여 드릴게요.",
  },

  /** A 조각: 단축키 안내 묶음 (안건 13, WCAG 2.1.4) */
  keys: {
    title: "단축키",
    hide: "숨기기",
    keep: "문제없음, 복구",
    skip: "건너뛰기",
    undo: "되돌리기",
    off: "단축키 끄기",
    offHelp: "한 글자 단축키가 다른 도구와 겹치면 꺼 두세요.",
  },

  states: {
    errorTitle: "관리 목록을 불러오지 못했습니다",
    errorBody:
      "잠시 후 다시 시도해 주세요. 처리한 내용은 그대로 저장되어 있습니다.",
    offlineTitle: "인터넷에 연결되어 있지 않습니다",
    offlineBody: "마지막으로 받은 목록입니다. 연결되면 처리할 수 있습니다.",
  },

  /** 처리 실패 (서버 액션 결과 코드) */
  errors: {
    forbidden: "관리자만 할 수 있습니다. 다시 로그인해 주세요.",
    unavailable: "이미 다른 처리가 반영된 항목입니다. 목록을 새로고침했습니다.",
    conflict: "같은 식당에 같은 종류의 새 할인 정보가 있어 되살릴 수 없습니다.",
    undo_unavailable:
      "그 뒤에 다른 처리가 있거나 이미 되돌린 항목이라 되돌릴 수 없습니다.",
    admin_target: "관리자 계정은 정지할 수 없습니다.",
    invalid: "보낼 수 없는 값이 있습니다. 다시 골라 주세요.",
    save: "반영하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  },
} as const;

export type AdminCopy = typeof adminCopy;
