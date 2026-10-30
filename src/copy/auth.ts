// 로그인 화면(/login)과 약관 자리 문구 (T4.6~T4.9, PRD AUTH-01, AUTH-03, AUTH-07, DESIGN.md 5장 "로그인과 약관").
// 문체: 상태, 설명, 오류는 습니다체, 다시 해 보기 제안은 해요체. 버튼과 라벨은 명사형.
// 상태 안내와 이유 설명이 대부분이라 해요체 비율이 허용 범위(25~40%) 아래로 나올 수 있다(경고만, copy-guide 7.1).
// 로그인 버튼 레이블은 각 사 브랜드 가이드 문구가 앱 문구 규칙보다 우선한다(copy-guide 4.6).
// 인앱 안내(T4.10), 약관 동의(T4.11), 계정(T4.12), 로그인 유도 시트(T4.13) 문구도 이 파일에 둔다.

export const authCopy = {
  brand: "런치메이트",
  metaTitle: "로그인",

  /** 브랜드 버튼 레이블 (각 사 가이드, copy-guide 4.6) */
  providers: {
    kakao: "카카오 로그인",
    naver: "네이버 로그인",
    google: "Google 계정으로 로그인",
  },
  providerNames: {
    kakao: "카카오",
    naver: "네이버",
    google: "구글",
  },
  /** 브랜드 버튼을 누른 뒤 스크린 리더용 */
  pending: "연결하는 중입니다",

  login: {
    /** next가 가리키는 곳에 따라 맥락을 바꾼다. 맥락이 없으면 default */
    contexts: {
      default: {
        eyebrow: null,
        title: "로그인하고 기록을 이어 갈까요?",
        body: "카드를 넘기며 고르는 일은 로그인 없이도 됩니다. 투표방과 기록, 내 설정은 로그인 후 쓸 수 있습니다.",
      },
      poll: {
        eyebrow: "투표 참여",
        title: "투표는 로그인 후 참여할 수 있습니다",
        body: "누가 고른 표인지 알아야 한 사람이 한 번만 투표할 수 있습니다. 로그인이 끝나면 받은 투표방으로 바로 돌아갑니다.",
      },
      me: {
        eyebrow: "나",
        title: "내 설정은 로그인 후 볼 수 있습니다",
        body: "회사 위치, 예산, 못 먹는 음식을 계정에 저장해 두고 다른 기기에서도 그대로 씁니다.",
      },
    },
    benefitsLabel: "로그인하면",
    benefits: [
      { title: "투표방", body: "친구를 불러 함께 고릅니다" },
      { title: "기록", body: "다녀온 곳과 즐겨찾기가 남습니다" },
      { title: "추천", body: "남긴 평가가 다음 추천에 반영됩니다" },
    ],
    groupLabel: "로그인 방법",
    /** AUTH-03: 로그인 후 원래 화면으로 돌아온다는 약속 (DESIGN.md 5장, 시트와 같은 문장) */
    returnNote: "로그인이 끝나면 이 화면으로 돌아옵니다.",
    backLabel: "둘러보기로 돌아가기",
  },

  states: {
    redirecting: {
      title: (provider: string) => `${provider}로 이동하는 중입니다`,
      body: "잠시만 기다려 주세요. 화면이 바뀌지 않으면 다시 눌러 주세요.",
    },
    cancelled: {
      title: "로그인을 취소했습니다",
      body: "준비되면 다시 로그인해 볼까요?",
    },
    error: {
      title: "로그인하지 못했습니다",
      body: "잠시 후 다시 눌러 주세요. 계속되면 다른 방법으로 로그인해 주세요.",
    },
    offline: {
      title: "인터넷에 연결되어 있지 않습니다",
      body: "연결되면 바로 로그인할 수 있습니다.",
    },
  },

  /** 인앱 브라우저 안내 (T4.10, AUTH-04, AC-AUTH-2, research-notes T0.17). 메뉴 위치와 이름은 [실기기 확인 T4.14] */
  inapp: {
    appNames: {
      kakaotalk: "카카오톡",
      line: "라인",
      instagram: "인스타그램",
      facebook: "페이스북",
      naver: "네이버 앱",
      webview: "이 앱",
    },
    /** 로그인 화면에서 카카오를 먼저 권하는 한 줄 */
    kakaoHint: (app: string) => `${app}에서는 카카오 로그인이 가장 빠릅니다.`,
    googleNote: (app: string) =>
      `${app} 안에서는 구글 로그인을 쓸 수 없습니다. 누르면 다른 브라우저로 여는 방법을 알려 드립니다.`,
    eyebrow: "구글 로그인",
    title: "다른 브라우저에서 열어 주세요",
    body: (app: string) =>
      `${app} 안의 브라우저에서는 구글이 로그인을 막습니다. 지금 화면을 다른 브라우저에서 열거나 카카오 로그인을 이용해 주세요.`,
    stepsLabel: "여는 방법",
    where: {
      "bottom-right": "화면 오른쪽 아래",
      "top-right": "화면 오른쪽 위",
    },
    menuItems: {
      otherBrowser: "다른 브라우저로 열기",
      externalBrowser: "외부 브라우저에서 열기",
    },
    stepMenu: (where: string) => `${where} 메뉴 버튼을 눌러 주세요.`,
    stepPick: (item: string) => `"${item}"를 골라 주세요.`,
    stepGoogle: "열린 브라우저에서 구글 로그인을 다시 눌러 주세요.",
    diagramLabel: (where: string, item: string) =>
      `${where} 메뉴 버튼 위치 그림. 메뉴에서 ${item}를 고릅니다.`,
    openExternal: "외부 브라우저로 열기",
    opening: "외부 브라우저를 여는 중입니다",
    openingBody: "열리지 않으면 아래 방법으로 직접 열어 주세요.",
    openFailed: "외부 브라우저를 열지 못했습니다",
    openFailedBody: "아래 방법으로 직접 열어 주세요.",
    copyLink: "링크 복사",
    copied: "링크를 복사했습니다. 다른 브라우저 주소창에 붙여 넣어 주세요.",
    copyFailed:
      "링크를 복사하지 못했습니다. 아래 주소를 길게 눌러 복사해 주세요.",
    linkLabel: "이 화면 주소",
    orKakao: "또는 여기서 바로",
    offlineBody:
      "연결되면 다른 브라우저로 열 수 있습니다. 링크는 지금 복사해 둘 수 있습니다.",
    back: "로그인 방법으로 돌아가기",
  },

  /** 첫 로그인 약관 동의 (T4.11, AUTH-02, AUTH-06, D-08 안건 6~9, 12, copy-guide 4.6) */
  terms: {
    metaTitle: "약관 동의",
    title: "시작하기 전에 확인해 주세요",
    titleShort: "시작하기 전에",
    signedIn: (provider: string) => `${provider} 계정으로 로그인했습니다`,
    signedInUnknown: "로그인했습니다",
    body: "처음 한 번만 묻습니다. 필수 세 가지에 동의하면 바로 시작할 수 있습니다.",
    all: "모두 동의합니다",
    required: "필수",
    items: {
      age: "만 14세 이상입니다",
      service: "이용약관 동의",
      privacy: "개인정보 수집 이용 동의",
    },
    itemNotes: {
      age: "만 14세 미만은 가입할 수 없습니다.",
    } as Partial<Record<"age" | "service" | "privacy", string>>,
    view: "보기",
    viewLabel: (title: string) => `${title} 전문 보기, 새 창`,
    /** PRD 11.2: 가입 화면에 한 줄 고지 */
    reviewNotice:
      "비공개로 남긴 후기도 가격, 👍, 태그는 이름 없이 식당 집계에 들어갑니다.",
    /** 하려던 일을 잇는 동의 버튼 (D-08 C). 키는 features/auth/terms.ts termsAction */
    submit: {
      start: "동의하고 시작하기",
      pollCreate: "동의하고 투표 만들기",
      pollJoin: "동의하고 투표 참여하기",
    },
    missing: (n: number) => `필수 항목 ${n}개에 동의해 주세요`,
    ready: "필수 항목에 모두 동의했습니다",
    saving: "동의 내용을 저장하는 중입니다",
    loading: "약관을 불러오는 중입니다",
    error: "동의 내용을 저장하지 못했습니다",
    errorBody: "고른 항목은 그대로 두었습니다. 다시 눌러 주세요.",
    offline: "인터넷에 연결되어 있지 않습니다",
    offlineBody: "연결되면 고른 항목 그대로 이어서 시작할 수 있습니다.",
    later: "나중에 하기",
    laterNote:
      "나중에 하면 로그아웃하고 둘러보기로 돌아갑니다. 다음 로그인 때 다시 묻습니다.",
  },

  /** 둘러보기 중 로그인 유도 시트 (T4.13, AUTH-07, D-08 A 시트) */
  prompt: {
    reasons: {
      poll: {
        eyebrow: "투표 만들기",
        title: "투표는 로그인 후 만들 수 있습니다",
        body: "누가 만든 방인지 알아야 친구를 초대하고 마감할 수 있습니다.",
      },
      save: {
        eyebrow: "저장",
        title: "저장은 로그인 후 할 수 있습니다",
        body: "로그인하면 즐겨찾기와 기록이 저장됩니다. 다른 기기에서도 그대로 이어집니다.",
      },
      review: {
        eyebrow: "후기 남기기",
        title: "후기는 로그인 후 남길 수 있습니다",
        body: "누가 남긴 후기인지 알아야 고치거나 지울 수 있습니다. 비공개로 남길 수도 있습니다.",
      },
    },
    keepBrowsing: "계속 둘러보기",
    close: "닫기",
    loading: "로그인 방법을 불러오는 중입니다",
    loadFailed: "로그인 창을 열지 못했습니다",
    loadFailedBody: "로그인 화면으로 이동해 주세요.",
    goLogin: "로그인 화면으로",
  },

  /** 로그아웃과 회원 탈퇴 (T4.12, AUTH-05, PRD 11.4) */
  account: {
    metaTitle: "계정",
    title: "계정",
    signedInAs: (provider: string) => `${provider} 계정으로 로그인했습니다`,
    signOut: "로그아웃",
    signOutBody: "이 기기에서만 로그아웃합니다. 설정과 기록은 그대로 남습니다.",
    deleteSection: "회원 탈퇴",
    deleteBody:
      "프로필, 사무실, 예산과 거리 설정, 못 먹는 음식이 바로 삭제됩니다.",
    deleteOpen: "탈퇴하기",
    deleteTitle: "정말 탈퇴할까요?",
    deleteConfirmBody:
      "탈퇴하면 설정, 기록, 후기가 바로 삭제되고 되돌릴 수 없습니다. 같은 계정으로 다시 로그인하면 새 사용자로 시작합니다.",
    deleteConfirm: "탈퇴",
    cancel: "취소",
    loading: "계정 정보를 불러오는 중입니다",
    deleting: "탈퇴를 처리하는 중입니다",
    deleteFailed: "탈퇴를 처리하지 못했습니다",
    deleteFailedBody: "잠시 후 다시 시도해 주세요. 계속되면 문의해 주세요.",
    offline: "인터넷에 연결되어 있지 않습니다",
    offlineBody: "연결되면 로그아웃과 탈퇴를 할 수 있습니다.",
  },
} as const;

export type AuthLoginContext = keyof typeof authCopy.login.contexts;
export type AuthLoginError = "cancelled" | "failed";
