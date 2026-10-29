// 랜딩 시안 3안 문구 (T3.4). 컴포넌트 안에 문장을 직접 쓰지 않는다 (CLAUDE.md 4장).
// 문체 (tasks.md 2.2절): 설명, 상태, 오류, 정책은 습니다체, 질문과 제안은 해요체. 버튼과 라벨은 명사형.
// 로그인 버튼 레이블은 각 사 가이드의 허용 문구를 따른다(카카오 "카카오 로그인", 네이버 "네이버 로그인",
// 구글 "Google 계정으로 로그인"). 근거와 출처는 copy-guide 4.6(G3 선택 후 가이드 문구로 고침).
// 시안이 정해지면 실제 랜딩 문구(src/copy/landing.ts)로 옮기고 이 파일은 지운다.

const brand = "런치메이트";

export const landingLabCopy = {
  brand,

  /** /design-lab/landing 목록 */
  index: {
    metaTitle: "랜딩 시안",
    eyebrow: "T3.4",
    title: "랜딩 시안 3안",
    description:
      "같은 요구사항으로 방향이 다른 세 안을 만들었습니다. 상태는 주소 끝 쿼리로 바꿉니다.",
    designs: {
      a: {
        name: "A 한 화면 에디토리얼",
        intent:
          "스크롤 없이 첫 화면에서 끝납니다. 큰 세리프 한 줄과 선화 한 점, 여백이 주인공입니다.",
      },
      b: {
        name: "B 바로 해 보는 데모",
        intent:
          "예시 카드 3장을 랜딩에서 바로 다시 뽑아 봅니다. 추천 체험의 가치를 먼저 보여 줍니다.",
      },
      c: {
        name: "C 스크롤 3장면",
        intent:
          "고민, 뽑기, 같이 정하기 세 장면이 스크롤에 맞춰 조용히 나타나고 끝에서 시작합니다.",
      },
    },
    statesTitle: "상태 쿼리",
    states: {
      ready: "정상",
      loading: "로딩 (?state=loading)",
      offline: "오프라인 (?state=offline)",
      error: "로그인 오류 (?state=error)",
      inapp: "카카오톡 인앱 (?inapp=kakao)",
    },
    back: "디자인 랩",
    labLink: "랜딩 시안 3안",
    labBody:
      "한 화면 에디토리얼, 바로 해 보는 데모, 스크롤 3장면을 비교합니다.",
  },

  /** 세 안이 함께 쓰는 문구 */
  common: {
    homeLabel: `${brand} 처음 화면`,
    tryCta: "추천 먼저 받아 보기",
    tryNote: "로그인 없이 내 주변 세 곳을 봅니다.",
    tryToast: "체험 흐름은 온보딩 시안에서 이어집니다",
    loginDivider: "로그인하고 기록 남기기",
    loginGroupLabel: "로그인 방법",
    kakao: "카카오 로그인",
    naver: "네이버 로그인",
    google: "Google 계정으로 로그인",
    kakaoShort: "로그인",
    naverShort: "로그인",
    googleShort: "로그인",
    pending: "연결하는 중입니다",
    labToast: "시안이라 실제 로그인은 하지 않습니다",
    loginError: "로그인을 시작하지 못했습니다",
    loginErrorBody:
      "잠시 후 다시 시도해 주세요. 계속되면 다른 방법으로 로그인해 주세요.",
    offlineTitle: "인터넷에 연결되어 있지 않습니다",
    offlineBody: "연결되면 추천 체험과 로그인을 바로 쓸 수 있습니다.",
    inappGoogle:
      "카카오톡 안에서는 구글 로그인을 쓸 수 없습니다. 외부 브라우저에서 열거나 카카오 로그인을 이용해 주세요.",
    inappOpen: "외부 브라우저로 열기",
    terms: {
      before: "시작하면 ",
      termsLink: "이용약관",
      middle: "과 ",
      privacyLink: "개인정보 처리방침",
      after: "에 동의하게 됩니다.",
    },
    labBack: "시안 목록",
  },

  /** A 한 화면 에디토리얼 */
  a: {
    eyebrow: "회사 근처 점심",
    headlineWords: ["오늘", "뭐", "먹지,", "10초면", "정합니다."],
    body: "가까운 세 곳을 이유 한 줄과 함께 골라 드립니다. 고민되면 동료와 투표로 정해요.",
  },

  /** B 바로 해 보는 데모 */
  b: {
    /** 모바일 머리의 로그인 바로가기(로그인 버튼이 데모 아래 둘째 화면에 있어서, T3.5) */
    login: "로그인",
    eyebrow: "직접 눌러 보세요",
    headline: "오늘 점심, 세 곳이면 충분해요",
    body: "예시 동네에서 뽑은 카드입니다. 마음에 안 들면 다시 뽑아 보세요.",
    demoLabel: "예시 추천 세 곳",
    demoCaption: "예시 식당입니다",
    reroll: "다시 뽑기",
    round: (n: number, total: number) => `${n}/${total}`,
    rerolled: (n: number) => `새로운 세 곳을 뽑았습니다. ${n}번째 묶음입니다.`,
    loading: "예시 카드를 불러오는 중입니다",
    numbers: {
      walk: "도보",
      walkUnit: "분",
      price: "1인",
      thumbs: "만족",
      thumbsUnit: "%",
      thumbsEmpty: "후기 모으는 중",
    },
    tryHint: "내 위치로 해 볼까요?",
  },

  /** C 스크롤 3장면 */
  c: {
    login: "로그인",
    scene1: {
      eyebrow: "12시 5분 전",
      headline: "오늘 뭐 먹지?",
      body: "매일 같은 고민에 점심시간이 줄어듭니다.",
      thoughts: ["어제도 국밥", "거긴 줄이 길고", "다들 아무거나"],
    },
    scene2: {
      eyebrow: "하나",
      headline: "세 곳만 뽑아 드립니다",
      body: "걷는 거리, 예산, 지난 기록을 보고 고릅니다. 카드마다 왜 이 집인지 한 줄로 알려 드립니다.",
    },
    scene3: {
      eyebrow: "둘",
      headline: "같이 가면 투표로",
      body: "링크 하나로 투표를 열고, 마감되면 1위로 확정합니다.",
      pollMeta: (n: number) => `${n}명 참여`,
      votes: (n: number) => `${n}표`,
      decided: "오늘 점심은 여기로 정했어요.",
    },
    final: {
      eyebrow: "셋",
      headline: "이제 시작해 볼까요?",
      body: "로그인하면 즐겨찾기와 기록이 저장됩니다.",
      tryAlt: "로그인 없이 체험",
    },
    scrollHint: "아래로 넘겨 보기",
  },
} as const;
