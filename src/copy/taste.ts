// 홈 취향 띠와 시트 문구 (T9.17, D-39). 설정을 건너뛴 사용자를 가입 7일 안에 한 번 더 부른다.
// 문체: 질문, 부탁은 해요체, 안내와 결과는 습니다체. 버튼은 명사형.
import { onboardingCopy } from "./onboarding";

export const tasteCopy = {
  band: {
    title: "못 먹는 음식이 있나요?",
    body: "좋아하는 음식도 함께 알려 주세요.",
    action: "알려 주기",
    close: "닫기",
  },
  sheet: {
    label: "취향 알려 주기",
    steps: ["못 먹는 음식", "좋아하는 음식"] as const,
    progress: (n: number) => `2단계 중 ${n}단계`,
    avoidTitle: onboardingCopy.avoid.title,
    avoidBody: onboardingCopy.avoid.body,
    likedTitle: onboardingCopy.liked.title,
    likedBody: onboardingCopy.liked.body,
    next: onboardingCopy.actions.next,
    save: "저장",
    back: "뒤로",
    saving: "저장하고 있습니다",
    saved: "저장했습니다. 다음 추천부터 반영합니다",
    error: {
      title: "저장하지 못했습니다",
      body: "고른 값은 그대로 둡니다. 잠시 뒤 다시 저장해 주세요.",
    },
  },
} as const;
