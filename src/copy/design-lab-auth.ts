// 로그인 유도, 약관 동의, 인앱 브라우저 안내 시안 문구 (T4.2, PRD AUTH-02, AUTH-04, AUTH-06, AUTH-07).
// 컴포넌트 안에 문장을 직접 쓰지 않는다 (CLAUDE.md 4장).
// 문체 (tasks.md 2.2절): 상태, 설명, 오류, 정책은 습니다체, 질문과 제안은 해요체. 버튼과 라벨은 명사형.
// 약관 본문(documents)은 습니다체 100%. 로그인 버튼 레이블은 각 사 가이드 문구(copy-guide 4.6)라
// 랜딩 문구(src/copy/landing.ts, authCopy.providers)와 같다.
// 선택 게이트(T4.3) 뒤 src/copy/auth.ts로 옮기고 이 파일은 지운다.

const brand = "런치메이트";

/** 로그인을 부른 행동 (AUTH-07: 저장, 후기, 투표) */
export type AuthTrigger = "poll" | "save" | "review";
/** 인앱 브라우저 종류 (AUTH-04, research-notes T0.17) */
export type AuthInApp = "kakao" | "instagram" | "naver";
export type AuthOs = "ios" | "android";
export type AuthTermId = "age" | "service" | "privacy" | "marketing";

export const authLabCopy = {
  brand,

  index: {
    title: "로그인과 약관 (D-08 선택안 B + A 시트)",
    names: {
      a: "A 이어지는 시트",
      b: "B 전용 화면",
      sheet: "로그인 유도 시트 (T4.13 실제 구현)",
    },
  },

  /** 둘러보기 화면(로그인을 부르는 맥락, 목업) */
  context: {
    screenLabel: "둘러보기 화면",
    guestBadge: "둘러보는 중",
    date: "10월 30일 목요일 점심",
    title: "오늘의 추천",
    pickCaption: "오늘의 한 곳",
    actionsLabel: "이 식당으로 할 수 있는 일",
    actions: {
      poll: "투표 만들기",
      save: "저장",
      review: "후기 남기기",
    },
    /** 접근성 이름: 보이는 글자 + 로그인이 필요하다는 사실 */
    needsLogin: "로그인 필요",
  },

  /** 로그인 유도 (AUTH-07). 행동마다 왜 로그인이 필요한지 말한다 */
  prompt: {
    reasons: {
      poll: {
        eyebrow: "투표 만들기",
        title: "투표는 로그인 후 만들 수 있습니다",
        body: "누가 만든 방인지 알아야 친구를 초대하고 마감할 수 있습니다. 고른 식당은 후보로 그대로 이어집니다.",
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
    } satisfies Record<
      AuthTrigger,
      { eyebrow: string; title: string; body: string }
    >,
    /** AUTH-03: 로그인 후 원래 화면으로 돌아온다는 약속 */
    returnNote: "로그인이 끝나면 이 화면으로 돌아옵니다.",
    returnNoteShort: "끝나면 이 화면으로 돌아옵니다",
    groupLabel: "로그인 방법",
    keepBrowsing: "계속 둘러보기",
    close: "닫기",
    back: "뒤로",
    /** 인앱일 때 카카오를 먼저 권하는 한 줄 (AUTH-04) */
    inappHint: (app: string) => `${app}에서는 카카오 로그인이 가장 빠릅니다.`,
    googleBlocked: (app: string) =>
      `${app} 안에서는 구글 로그인을 쓸 수 없습니다. 누르면 여는 방법을 알려 드립니다.`,
    redirecting: (provider: string) => `${provider}로 이동하는 중입니다`,
    redirectingBody:
      "잠시만 기다려 주세요. 화면이 바뀌지 않으면 다시 눌러 주세요.",
    cancelled: "로그인을 취소했습니다",
    cancelledBody: "준비되면 다시 로그인해 볼까요?",
    error: "로그인하지 못했습니다",
    errorBody:
      "잠시 후 다시 눌러 주세요. 계속되면 다른 방법으로 로그인해 주세요.",
    offline: "인터넷에 연결되어 있지 않습니다",
    offlineBody: "연결되면 바로 로그인할 수 있습니다.",
    labToast: "시안이라 실제 로그인은 하지 않습니다",
    /** B 데스크톱 왼쪽 열: 로그인하면 되는 일 세 가지 */
    benefitsLabel: "로그인하면",
    benefits: [
      { title: "투표방", body: "친구를 불러 함께 고릅니다" },
      { title: "기록", body: "다녀온 곳과 즐겨찾기가 남습니다" },
      { title: "추천", body: "남긴 평가가 다음 추천에 반영됩니다" },
    ],
  },

  providerNames: {
    kakao: "카카오",
    naver: "네이버",
    google: "구글",
  },

  /** 약관 동의 (AUTH-02, AUTH-06) */
  terms: {
    title: "시작하기 전에 확인해 주세요",
    titleShort: "시작하기 전에",
    signedIn: (provider: string) => `${provider} 계정으로 로그인했습니다`,
    body: "처음 한 번만 묻습니다. 필수 세 가지만 골라도 시작할 수 있어요.",
    all: "모두 동의합니다",
    allNote: "선택 항목을 포함한 전체 동의입니다",
    required: "필수",
    optional: "선택",
    view: "보기",
    viewLabel: (title: string) => `${title} 전문 보기`,
    items: {
      age: "만 14세 이상입니다",
      service: "이용약관 동의",
      privacy: "개인정보 수집 이용 동의",
      marketing: "혜택과 소식 알림 받기",
    } satisfies Record<AuthTermId, string>,
    itemNotes: {
      age: "만 14세 미만은 가입할 수 없습니다.",
      marketing:
        "새 기능과 이벤트를 앱 알림으로 받습니다. 언제든 끌 수 있습니다.",
    } as Partial<Record<AuthTermId, string>>,
    /** PRD 11.2: 가입 화면에 한 줄 고지 */
    reviewNotice:
      "비공개로 남긴 후기도 가격, 👍, 태그는 이름 없이 식당 집계에 들어갑니다.",
    submit: "동의하고 시작하기",
    /** C에서 가져온 문구 (D-08 조합): 하려던 행동을 동의 버튼에 잇는다. 실제 화면 T4.11에서 쓴다 */
    submitContinue: (action: string) => `동의하고 ${action}`,
    missing: (n: number) => `필수 항목 ${n}개에 동의해 주세요`,
    ready: "필수 항목에 모두 동의했습니다",
    loading: "약관을 불러오는 중입니다",
    error: "동의 내용을 저장하지 못했습니다",
    errorBody: "고른 항목은 그대로 두었습니다. 다시 눌러 주세요.",
    offline: "인터넷에 연결되어 있지 않습니다",
    offlineBody: "연결되면 고른 항목 그대로 이어서 시작할 수 있습니다.",
    doneToast: "다음은 온보딩입니다. 시안은 여기까지입니다",
    later: "나중에 하기",
    laterNote: "동의하지 않으면 로그인이 끝나지 않고 둘러보기로 돌아갑니다.",
  },

  /** 약관 전문(목업). 약관은 습니다체 100% */
  documents: {
    service: {
      title: "이용약관",
      updated: "시행일 2026년 12월 1일",
      sections: [
        {
          heading: "제1조 목적",
          body: "이 약관은 런치메이트가 제공하는 식당 추천과 투표 서비스의 이용 조건과 절차를 정합니다.",
        },
        {
          heading: "제2조 서비스",
          body: "회사는 추천, 지도, 투표, 후기 기능을 제공합니다. 추천에는 광고와 할인 정보가 반영되지 않습니다.",
        },
        {
          heading: "제3조 이용자의 의무",
          body: "이용자는 사실과 다른 후기나 제보를 남기지 않습니다. 신고가 3건 쌓인 후기는 숨겨지고 관리자가 다시 판단합니다.",
        },
      ],
    },
    privacy: {
      title: "개인정보 수집 이용",
      updated: "시행일 2026년 12월 1일",
      sections: [
        {
          heading: "수집 항목",
          body: "소셜 계정 식별자, 닉네임, 프로필 사진을 수집합니다. 이메일과 전화번호는 수집하지 않습니다.",
        },
        {
          heading: "이용 목적",
          body: "로그인, 투표 참여자 표시, 후기 작성자 표시에 씁니다.",
        },
        {
          heading: "위치 정보",
          body: "현위치는 기기 안에서 추천 계산과 지도 이동에만 쓰고 서버로 보내지 않습니다. 저장하는 위치는 직접 지도에 놓은 사무실 핀뿐입니다.",
        },
        {
          heading: "보관 기간",
          body: "탈퇴하면 바로 삭제합니다. 법령상 따로 보관하는 정보는 없습니다.",
        },
      ],
    },
    marketing: {
      title: "혜택과 소식 알림",
      updated: "시행일 2026년 12월 1일",
      sections: [
        {
          heading: "받는 내용",
          body: "새 기능과 이벤트 소식을 앱 알림으로 보냅니다.",
        },
        {
          heading: "철회",
          body: "나 탭의 설정에서 언제든 끌 수 있습니다. 동의하지 않아도 모든 기능을 쓸 수 있습니다.",
        },
      ],
    },
    close: "닫기",
    back: "약관 동의로",
  },

  /** 인앱 브라우저 안내 (AUTH-04, AC-AUTH-2, research-notes T0.17) */
  inapp: {
    appNames: {
      kakao: "카카오톡",
      instagram: "인스타그램",
      naver: "네이버 앱",
    } satisfies Record<AuthInApp, string>,
    title: "구글 로그인은 다른 브라우저에서 열어 주세요",
    titleShort: "다른 브라우저에서 열어 주세요",
    body: (app: string) =>
      `${app} 안의 브라우저에서는 구글이 로그인을 막습니다. 지금 보던 화면 그대로 다른 브라우저에서 열 수 있습니다.`,
    stepsLabel: "여는 방법",
    /** 메뉴 위치와 메뉴 이름은 앱과 OS마다 다르다([실기기 확인]) */
    stepMenu: (where: string) => `${where} 메뉴 버튼을 눌러 주세요.`,
    stepPick: (item: string) => `"${item}"를 골라 주세요.`,
    stepGoogle: "열린 브라우저에서 구글 로그인을 다시 눌러 주세요.",
    where: {
      "bottom-right": "화면 오른쪽 아래",
      "top-right": "화면 오른쪽 위",
    },
    diagramLabel: (where: string, item: string) =>
      `${where} 메뉴 버튼 위치 그림. 메뉴에서 ${item}를 고릅니다.`,
    openExternal: "외부 브라우저로 열기",
    opening: "외부 브라우저를 여는 중입니다",
    openingBody: "열리지 않으면 아래 방법으로 직접 열어 주세요.",
    openFailed: "외부 브라우저를 열지 못했습니다",
    openFailedBody: "아래 방법으로 직접 열어 주세요.",
    copyLink: "링크 복사",
    copied: "링크를 복사했습니다. 다른 브라우저 주소창에 붙여 넣어 주세요.",
    copyFailed: "링크를 복사하지 못했습니다. 메뉴에서 열기를 이용해 주세요.",
    orKakao: "또는 여기서 바로",
    kakaoFaster: "구글 대신 여기서 바로 카카오 로그인을 해 볼까요?",
    offlineBody:
      "연결되면 다른 브라우저로 열 수 있습니다. 링크는 지금 복사해 둘 수 있습니다.",
    manualTitle: "직접 여는 방법",
    androidAuto: "누르면 지금 화면이 기본 브라우저에서 열립니다.",
  },

  /** 시안 공통 */
  lab: {
    loginDone: "로그인한 셈 치고 약관 동의로 넘어갑니다",
  },
} as const;
