// 취향 설정 시안 문구 (T9.17, /design-lab/taste/<a|b|c>). 온보딩 "좋아하는 음식" 단계와 설정을 건너뛴 사용자를 다시 부르는 홈 띠.
// 문체: 상태, 안내, 결과는 습니다체. 질문, 제안은 해요체. 버튼, 칩, 단계 이름은 명사형(비율 제외).
// 목업 식당 이름은 design-lab/mock의 지어낸 이름이다. 상태 title은 마침표 없는 짧은 습니다체(common.ts 규칙).
import { commonCopy } from "./common";
import { onboardingCopy } from "./onboarding";

export const tasteLabCopy = {
  names: {
    a: "취향 시안 A 좋아하는 음식 단계",
    b: "취향 시안 B 한 화면 취향표",
    c: "취향 시안 C 둘 중 고르기",
  },
  index: {
    title: "취향 설정 시안 (T9.17)",
    body: "온보딩에서 좋아하는 음식을 받고, 설정을 건너뛴 사용자를 홈에서 다시 부릅니다. ?view=step|band, ?state=ready|loading|empty|error|offline 로 화면을 바꿉니다.",
  },

  /** 온보딩 공통 */
  step: {
    skip: onboardingCopy.actions.skip,
    back: commonCopy.actions.back,
    done: onboardingCopy.actions.done,
    next: onboardingCopy.actions.next,
    screenLabel: onboardingCopy.screenLabel,
    loading: onboardingCopy.states.loading,
    mapLabel: "회사 주변 지도",
  },

  /** A: 넷째 단계 "좋아하는 음식" */
  a: {
    steps: ["위치", "예산과 거리", "못 먹는 음식", "좋아하는 음식"],
    title: "자주 끌리는 음식을 골라 주세요",
    body: "3개까지 고를 수 있습니다. 고른 음식은 추천에 조금 더 자주 나옵니다.",
    count: (n: number, max: number) => `${n}/${max}`,
    countLabel: (n: number, max: number) => `${max}개 중 ${n}개 골랐습니다.`,
    full: "3개를 모두 골랐습니다. 다른 음식을 고르려면 하나를 빼 주세요.",
    gridLabel: "좋아하는 음식",
    emptyNote: "아무것도 고르지 않아도 됩니다. 먹을수록 알아서 맞춰 갑니다.",
    startEmpty: "고르지 않고 시작",
  },

  /** B: 셋째 단계를 "음식 취향" 한 화면으로 */
  b: {
    steps: ["위치", "예산과 거리", "음식 취향"],
    title: "음식마다 어떤지 알려 주세요",
    body: "모두 보통으로 두어도 됩니다. 좋아요는 더 자주, 안 먹어요는 추천에서 뺍니다.",
    levels: { like: "좋아요", neutral: "보통", avoid: "안 먹어요" },
    rowLabel: (name: string) => `${name} 취향`,
    summary: (like: number, avoid: number) =>
      like + avoid === 0
        ? "아직 모두 보통입니다."
        : `좋아요 ${like}개, 안 먹어요 ${avoid}개를 골랐습니다.`,
    more: "알레르기와 직접 입력",
    moreBody: "갑각류, 땅콩처럼 재료로 빼야 하는 것은 여기에 적어 주세요.",
  },

  /** C: 둘 중 고르기 3번 */
  c: {
    steps: ["위치", "예산과 거리", "못 먹는 음식", "취향 맞추기"],
    title: "둘 중에 더 끌리는 쪽은요?",
    body: "세 번만 고르면 됩니다. 고른 쪽은 추천에 조금 더 자주 나옵니다.",
    round: (n: number, total: number) => `${n}/${total}`,
    roundLabel: (n: number, total: number) => `${total}번 중 ${n}번째`,
    either: "둘 다 좋아요",
    neither: "둘 다 별로예요",
    pairLabel: "둘 중 하나 고르기",
    resultTitle: "이렇게 맞춰 두었습니다",
    resultBody:
      "먹고 남긴 👍👎으로 계속 고쳐 갑니다. 나 탭에서 언제든 바꿀 수 있습니다.",
    resultLike: "더 자주",
    resultLess: "덜 자주",
    again: "다시 고르기",
  },

  /** 홈: 설정을 건너뛴 사용자 다시 부르기 */
  band: {
    title: "오늘의 추천",
    eyebrow: "11월 3일 화요일 점심",
    place: "회사",
    spot: "오늘의 한 곳",
    reason: "걸어서 4분, 최근 2주 동안 가지 않은 곳입니다.",
    others: "또는 이 두 곳",
    walk: (m: number) => `${m}분`,
    close: "닫기",

    /** A: 카드 위 한 줄 띠 */
    aLine: "못 먹는 음식이 있나요?",
    aSub: "알려 주시면 그 음식은 빼고 추천합니다.",
    aAction: "알려 주기",

    /** B: 대안 목록 아래 조용한 칸 */
    bTitle: "취향을 알려 주시면 추천이 더 맞습니다",
    bBody: "좋아하는 음식과 못 먹는 음식을 한 화면에서 고를 수 있습니다.",
    bAction: "취향 고르기",
    bLater: "나중에",

    /** C: 하루 한 번 둘 중 고르기 */
    cTitle: "오늘은 어느 쪽이 더 끌려요?",
    cDone: "알려 줘서 고마워요. 다음 추천부터 반영합니다.",
    cSkip: "오늘은 넘기기",
  },

  states: {
    stepEmpty: {
      title: "이 근처 식당 종류를 아직 모릅니다",
      body: "모든 종류를 보여 드립니다. 고른 음식이 근처에 없으면 추천에 나오지 않습니다.",
    },
    saveError: onboardingCopy.states.saveError,
    offline: onboardingCopy.states.offline,
    homeEmpty: {
      title: "조건에 맞는 곳이 없습니다",
      body: "도보 시간을 조금 늘려 보시겠어요?",
      action: "도보 15분으로 넓히기",
    },
    homeError: {
      title: "추천을 불러오지 못했습니다",
      body: "잠시 뒤 다시 시도해 주세요.",
      action: commonCopy.states.error.action,
    },
    homeOffline: {
      title: commonCopy.states.offline.title,
      body: commonCopy.states.offline.body,
      action: commonCopy.states.offline.action,
    },
  },
} as const;
