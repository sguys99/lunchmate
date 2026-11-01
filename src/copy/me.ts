// 나 탭 문구 (T4.23~T4.27, SET-01~05). 문체 규칙: docs/tasks.md 2.2절, docs/copy-guide.md.
// 상태 안내, 결과, 오류는 습니다체, 제안과 질문은 해요체. 라벨은 명사형이라 비율에서 빠진다.
// 예산, 걷는 거리, 못 먹는 음식 칩과 라벨은 온보딩 문구(onboarding.ts)를 그대로 쓴다.

export const meCopy = {
  metaTitle: "나",
  title: "나",
  loading: "설정을 불러오는 중입니다",

  sections: {
    settings: "설정",
    display: "화면",
    account: "계정",
    legal: "문의와 정책",
  },

  /** 나 탭 첫 화면의 줄 이름과 요약 */
  rows: {
    offices: "사무실",
    budget: "예산과 거리",
    avoid: "못 먹는 음식",
    craving: "요즘 이게 땡겨요",
    name: "이름",
    account: "계정 관리",
    signOut: "로그아웃",
    contact: "문의하기",
    terms: "이용약관",
    privacy: "개인정보 처리방침",
    location: "위치정보 처리 안내",
  },
  summary: {
    officesNone: "없음",
    offices: (defaultName: string, count: number) =>
      count > 1 ? `${defaultName} 외 ${count - 1}곳` : defaultName,
    budget: (lunch: string, dinner: string, walk: number) =>
      `점심 ${lunch}, 저녁 ${dinner}, 도보 ${walk}분`,
    avoidNone: "없음",
    avoid: (count: number) => `${count}개`,
    cravingNone: "고르지 않음",
    cravingExpired: "기간 끝남",
    nameNone: "이름 없음",
  },

  /**
   * 문의하기 /me/contact (T8.6, MOD-07). 채널은 이메일 하나(사용자 결정 11/01).
   * 인앱 브라우저에서 메일 앱이 열리지 않을 수 있어 주소 복사가 주 동작, 메일 앱 열기는 보조.
   * 주소(NEXT_PUBLIC_CONTACT_EMAIL)가 비어 있으면 항목을 숨기지 않고 준비 중 안내를 보인다.
   */
  contact: {
    metaTitle: "문의하기",
    title: "문의하기",
    body: "오류, 신고 결과, 계정 문제처럼 앱에서 해결되지 않는 일은 이메일로 받습니다.",
    addressLabel: "문의 이메일",
    copy: "주소 복사",
    copied: "주소를 복사했습니다. 메일 앱에 붙여 넣어 보내 주세요.",
    copyFailed: "복사하지 못했습니다. 주소를 길게 눌러 직접 복사해 주세요.",
    openMail: "메일 앱 열기",
    mailSubject: "[런치메이트 문의]",
    inAppHint:
      "카카오톡 같은 앱 안에서 열었다면 메일 앱이 열리지 않을 수 있습니다. 그럴 때는 주소를 복사해 주세요.",
    includeTitle: "함께 적어 주시면 빨리 확인합니다",
    include: [
      "겪은 일과 그때 보던 화면",
      "쓰는 기기와 브라우저",
      "오류 화면에 보인 참고 번호",
    ],
    reply:
      "답장은 보내 주신 주소로 드립니다. 메일 주소와 내용은 답변에만 씁니다.",
    pending: {
      title: "문의 주소를 준비하고 있습니다",
      body: "정식 서비스를 시작하기 전에 이곳에 주소를 올립니다. 급한 문제는 베타 안내를 받은 곳으로 알려 주세요.",
    },
  },

  /** 화면 설정 (SET-04, D-04). 이 기기에만 저장한다 */
  display: {
    theme: "화면 모드",
    themeOptions: { system: "시스템", light: "라이트", dark: "다크" },
    themeHint: "이 기기에만 적용됩니다.",
    reduceMotion: "모션 줄이기",
    reduceMotionBody: "화면 전환과 카드 넘김의 움직임을 줄입니다.",
    haptics: "진동",
    hapticsBody: "결정을 확정할 때 짧게 진동합니다.",
    hapticsUnsupported: "이 기기에서는 진동이 울리지 않습니다.",
  },

  /** 이름 (계정 관리 화면 맨 위). 다른 사람에게 보이는 이름이라 수정할 수 있다 */
  name: {
    title: "이름",
    label: "이름",
    notice:
      "다른 사람에게 보일 이름입니다. 투표방 참여자 목록과 공개 후기에 이 이름이 나옵니다.",
    placeholder: "1~20자",
    save: "이름 저장",
    saving: "이름을 저장하는 중입니다",
    saved: "이름을 바꿨습니다",
    empty: "이름을 한 글자 이상 적어 주세요.",
    unchanged: "지금 이름과 같습니다.",
    none: "아직 이름이 없습니다. 투표방에서 보일 이름을 정해볼까요?",
  },

  /** 사무실 (SET-01) */
  offices: {
    metaTitle: "사무실",
    title: "사무실",
    body: "추천은 기본 사무실을 기준으로 계산합니다.",
    count: (count: number, max: number) => `${count}/${max}곳`,
    listLabel: "저장한 사무실",
    defaultMark: "기본",
    makeDefault: "기본으로",
    rename: "이름 바꾸기",
    delete: "삭제",
    more: (name: string) => `${name} 관리`,
    add: "사무실 추가",
    limit:
      "사무실은 5곳까지 저장할 수 있습니다. 쓰지 않는 곳을 지우면 추가할 수 있어요.",
    lastOne:
      "사무실이 한 곳뿐이라 지울 수 없습니다. 다른 사무실을 먼저 추가해볼까요?",
    renameTitle: "사무실 이름 바꾸기",
    nameLabel: "사무실 이름",
    namePlaceholder: "예: 본사, 판교 지점",
    deleteTitle: (name: string) => `"${name}" 사무실을 지울까요?`,
    deleteBody: "지운 사무실은 되돌릴 수 없습니다.",
    deleteDefaultBody:
      "기본 사무실입니다. 지우면 남은 곳 중 가장 먼저 저장한 곳이 기본이 됩니다.",
    saved: {
      default: "기본 사무실을 바꿨습니다",
      renamed: "이름을 바꿨습니다",
      deleted: "사무실을 지웠습니다",
      promoted: (name: string) =>
        `사무실을 지웠습니다. 이제 기본은 "${name}"입니다`,
      added: "사무실을 추가했습니다",
    },
    empty: {
      title: "저장한 사무실이 없습니다",
      body: "지도에서 회사 위치를 정해볼까요?",
    },
  },

  /** 사무실 추가 (지도에서 핀 놓기, ONB-01과 같은 규칙) */
  officeNew: {
    metaTitle: "사무실 추가",
    title: "새 사무실 위치",
    body: "검색이나 현위치로 지도를 옮긴 뒤, 지도를 누르거나 핀을 끌어 위치를 정해 주세요.",
    nameLabel: "사무실 이름",
    defaultName: (n: number) => `사무실 ${n}`,
    save: "이 위치로 저장",
    saving: "사무실을 저장하는 중입니다",
    close: "사무실 목록으로",
  },

  /** 예산과 거리 (SET-02) */
  budget: {
    metaTitle: "예산과 거리",
    title: "예산과 거리",
    body: "이 금액과 걷는 거리 안에서 추천합니다.",
    saved: "예산과 거리를 저장했습니다",
  },

  /** 못 먹는 음식 (SET-03) */
  avoid: {
    metaTitle: "못 먹는 음식",
    title: "못 먹는 음식",
    body: "고른 음식은 추천에서 뺍니다. 다른 사람에게는 보이지 않습니다.",
    saved: "못 먹는 음식을 저장했습니다",
  },

  /** 요즘 이게 땡겨요 (SET-05) */
  craving: {
    metaTitle: "요즘 이게 땡겨요",
    title: "요즘 이게 땡겨요",
    body: "고른 종류를 7일 동안 조금 더 자주 추천합니다.",
    groupLabel: "음식 종류, 3개까지",
    limit: "3개까지 고를 수 있어요. 하나를 빼고 골라 주세요.",
    picked: (n: number) => `${n}/3개`,
    daysLeft: (days: number) =>
      days > 0 ? `${days}일 남았습니다` : "오늘까지 반영합니다",
    expired: "기간이 끝나 지금은 반영하지 않습니다. 다시 저장해볼까요?",
    none: "고른 종류가 없습니다.",
    renewHint: "저장하면 오늘부터 7일 동안 반영합니다.",
    clear: "모두 빼기",
    saved: "저장했습니다. 7일 동안 반영합니다",
    cleared: "고른 종류를 모두 뺐습니다",
  },

  /** 공통 저장과 4상태 */
  save: "저장",
  cancel: "취소",
  saving: "저장하는 중입니다",
  states: {
    offline: {
      title: "인터넷에 연결되어 있지 않습니다",
      body: "고른 값은 그대로 둡니다. 연결되면 저장할 수 있습니다.",
    },
    saveError: {
      title: "저장하지 못했습니다",
      body: "고른 값은 그대로 둡니다. 잠시 후 다시 눌러 주세요.",
    },
    loadError: {
      title: "설정을 불러오지 못했습니다",
      body: "잠시 후 다시 시도해 주세요.",
    },
    limit: {
      title: "사무실을 더 저장할 수 없습니다",
      body: "쓰지 않는 사무실을 지운 뒤 다시 저장해 주세요.",
    },
  },
} as const;
