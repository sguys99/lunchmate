// 랜딩 G3 선택안 B 문구 (T3.4, design-decisions D-06). 컴포넌트 안에 문장을 직접 쓰지 않는다 (CLAUDE.md 4장).
// 문체 (tasks.md 2.2절): 설명, 상태, 오류, 정책은 습니다체, 질문과 제안은 해요체. 버튼과 라벨은 명사형.
// 로그인 버튼 레이블은 각 사 가이드의 허용 문구를 따른다(카카오 "카카오 로그인", 네이버 "네이버 로그인",
// 구글 "Google 계정으로 로그인"). 근거와 출처는 copy-guide 4.6(G3 선택 후 가이드 문구로 고침).
// 실제 랜딩 구현(T4.28) 때 src/copy/landing.ts로 옮기고 이 파일은 지운다.

const brand = "런치메이트";

export const landingLabCopy = {
  brand,

  /** 디자인 랩 첫 화면 링크와 단독 화면 제목 */
  index: {
    title: "랜딩 (G3 선택안 B)",
    name: "B 바로 해 보는 데모",
    labLink: "랜딩 B 열기",
    labBody:
      "예시 카드 3장을 바로 다시 뽑아 보는 랜딩입니다. 상태는 주소 끝 쿼리 ?state=loading, offline, error와 ?inapp=kakao로 바꿉니다.",
  },

  /** 랜딩 공용 문구 (체험, 로그인, 오프라인, 약관) */
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

} as const;
