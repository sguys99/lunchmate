// 로그인 화면(/login)과 약관 자리 문구 (T4.6~T4.9, PRD AUTH-01, AUTH-03, AUTH-07, DESIGN.md 5장 "로그인과 약관").
// 문체: 상태, 설명, 오류는 습니다체, 다시 해 보기 제안은 해요체. 버튼과 라벨은 명사형.
// 상태 안내와 이유 설명이 대부분이라 해요체 비율이 허용 범위(25~40%) 아래로 나올 수 있다(경고만, copy-guide 7.1).
// 로그인 버튼 레이블은 각 사 브랜드 가이드 문구가 앱 문구 규칙보다 우선한다(copy-guide 4.6).
// 약관 동의 화면 실제 문구는 T4.11에서 이 파일에 더한다(design-lab-auth.ts의 terms를 옮겨 온다).

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

  /** 약관 동의 자리 (T4.11 전까지 개발 환경에서만 보이는 임시 화면) */
  termsPlaceholder: {
    metaTitle: "약관 동의",
    title: "약관 동의 화면은 준비 중입니다",
    body: "로그인은 끝났습니다. 동의 화면이 생기면 처음 한 번 여기서 묻습니다.",
    continue: "계속하기",
  },
} as const;

export type AuthLoginContext = keyof typeof authCopy.login.contexts;
export type AuthLoginError = "cancelled" | "failed";
