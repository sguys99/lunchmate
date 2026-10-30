// 랜딩(/) 문구 (T4.28, PRD APP-04, G3 선택안 B, design-decisions D-06). design-lab-landing.ts에서 옮겼다.
// 컴포넌트 안에 문장을 직접 쓰지 않는다 (CLAUDE.md 4장).
// 문체 (tasks.md 2.2절): 설명, 상태, 정책은 습니다체, 질문과 제안은 해요체. 버튼과 라벨은 명사형.
// 로그인 버튼 레이블은 각 사 가이드 문구라 authCopy.providers를 쓴다(copy-guide 4.6).
// 메타 설명과 OG 문구는 copy-guide 4.13, 4.14 예문 그대로.
import type { DemoPlace } from "@/features/landing/types";

const brand = "런치메이트";

/**
 * 데모 카드 묶음 3개(다시 뽑기로 돌아감). 실제 식당이 아닌 예시다(카카오 데이터 아님, CLAUDE.md 7장).
 * 이유 문장은 도보 분을 빼고 쓴다(숫자 칸과 중복, 홈 카드와 같은 규칙).
 */
const demoSets: readonly (readonly [DemoPlace, DemoPlace, DemoPlace])[] = [
  [
    {
      id: "demo-gukbap",
      name: "정담국밥",
      category: "gukbap",
      walkMinutes: 4,
      priceKRW: 9000,
      thumbsUpRate: 87,
      reason: "지난주 👍한 국밥",
    },
    {
      id: "demo-asian",
      name: "사이공 골목",
      category: "asian",
      walkMinutes: 6,
      priceKRW: 11000,
      thumbsUpRate: null,
      reason: "아직 안 가본 쌀국수집",
    },
    {
      id: "demo-ilsik",
      name: "하루미 식당",
      category: "ilsik",
      walkMinutes: 8,
      priceKRW: 13000,
      thumbsUpRate: 78,
      reason: "이번 주 아직 안 먹은 일식",
    },
  ],
  [
    {
      id: "demo-hansik",
      name: "소담밥상",
      category: "hansik",
      walkMinutes: 5,
      priceKRW: 9500,
      thumbsUpRate: 91,
      reason: "동료 👍 비율이 높은 백반",
    },
    {
      id: "demo-yangsik",
      name: "모락 파스타",
      category: "yangsik",
      walkMinutes: 9,
      priceKRW: 14000,
      thumbsUpRate: 74,
      reason: "2주 동안 안 먹은 양식",
    },
    {
      id: "demo-salad",
      name: "초록접시",
      category: "salad",
      walkMinutes: 3,
      priceKRW: 10500,
      thumbsUpRate: null,
      reason: "가볍게 먹기 좋은 샐러드",
    },
  ],
  [
    {
      id: "demo-bunsik",
      name: "골목분식 두리",
      category: "bunsik",
      walkMinutes: 2,
      priceKRW: 6000,
      thumbsUpRate: 83,
      reason: "가장 가까운 분식",
    },
    {
      id: "demo-jungsik",
      name: "홍운각",
      category: "jungsik",
      walkMinutes: 7,
      priceKRW: 8500,
      thumbsUpRate: 69,
      reason: "지난달 👍한 짬뽕",
    },
    {
      id: "demo-gogi",
      name: "화로담",
      category: "gogi",
      walkMinutes: 10,
      priceKRW: 16000,
      thumbsUpRate: 65,
      reason: "점심 특선이 있는 고깃집",
    },
  ],
];

export const landingCopy = {
  brand,

  /** <head> 메타 (copy-guide 4.13, 4.14) */
  meta: {
    description:
      "회사 근처 점심을 10초 안에 정하는 앱입니다. 추천 3곳 중에서 고르거나 동료와 투표로 정합니다.",
    ogTitle: "오늘 뭐 먹지, 10초 안에 정합니다",
  },

  homeLabel: `${brand} 처음 화면`,
  /** 모바일 머리의 로그인 바로가기(로그인 버튼이 데모 아래 둘째 화면에 있어서, T3.5) */
  loginShortcut: "로그인",

  hero: {
    eyebrow: "직접 눌러 보세요",
    headline: "오늘 점심, 세 곳이면 충분해요",
    body: "예시 동네에서 뽑은 카드입니다. 마음에 안 들면 다시 뽑아 보세요.",
  },

  demo: {
    sets: demoSets,
    label: "예시 추천 세 곳",
    caption: "예시 식당입니다",
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
  },

  try: {
    hint: "내 위치로 해 볼까요?",
    cta: "추천 먼저 받아 보기",
    note: "로그인 없이 내 주변 세 곳을 봅니다.",
  },

  /** 앱 화면이 아직 닫혀 있는 환경(프로덕션 플래그 꺼짐)에서 체험과 로그인 자리에 보이는 안내 */
  soon: {
    title: "지금은 출시를 준비하고 있습니다",
    body: "문을 열면 이 자리에서 내 주변 추천을 바로 받아 볼 수 있습니다.",
  },

  login: {
    divider: "로그인하고 기록 남기기",
    groupLabel: "로그인 방법",
    /** 약관은 로그인 뒤 동의 화면(AUTH-02, D-08)에서 따로 받는다. 랜딩은 문서 위치만 알린다 */
    terms: {
      before: "로그인 뒤 ",
      termsLink: "이용약관",
      middle: "과 ",
      privacyLink: "개인정보 처리방침",
      after: " 동의를 한 번 받습니다.",
    },
  },

  offline: {
    title: "인터넷에 연결되어 있지 않습니다",
    body: "연결되면 추천 체험과 로그인을 바로 쓸 수 있습니다.",
  },
} as const;
