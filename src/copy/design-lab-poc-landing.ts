// /design-lab/poc/landing 문구 (T2.13). 내부용이지만 문구 규칙(tasks.md 2.2절)은 똑같이 지킨다.
// 랜딩 본문 예시는 실제 랜딩(T3) 문구가 아니라 효과를 보기 위한 자리 문구다.
export const pocLandingCopy = {
  title: "랜딩 효과 후보",
  description:
    "복사형 효과 세 가지를 Quiet Stone 랜딩 자리에 얹어 봅니다. 모두 모션 토큰(slow 300ms, 간격 70ms)을 따르고 모션을 줄이면 바로 보입니다.",
  replay: "다시 재생",
  inViewNote: "화면에 들어올 때 재생",
  blurOff: "흐림 끄기",

  effects: {
    a: { name: "A 단어 페이드", source: "Motion Primitives TextEffect, MIT" },
    b: { name: "B 블러 페이드", source: "Magic UI BlurFade, MIT" },
    c: { name: "C 느린 마퀴", source: "Magic UI Marquee, MIT" },
  },

  hero: {
    eyebrow: "점심 결정 앱",
    headline: "오늘 뭐 먹지, 10초면 정합니다.",
    body: "회사 근처 세 곳을 이유 한 줄과 함께 골라 드립니다. 그래도 고민되면 동료와 투표로 정해요.",
    cta: "카카오로 시작하기",
  },

  marquee: {
    label: "카테고리 12종",
    pause: "흐름 멈추기",
    play: "다시 흐르기",
  },

  steps: {
    title: "세 단계면 끝납니다",
    items: [
      {
        number: "1",
        title: "오늘의 세 곳",
        body: "걷는 거리와 지난 기록을 보고 세 곳만 보여 드립니다.",
      },
      {
        number: "2",
        title: "함께 정하기",
        body: "링크 하나로 투표를 열고 마감이 되면 1위로 확정합니다.",
      },
      {
        number: "3",
        title: "한 탭 기록",
        body: "다녀온 뒤 좋았는지만 남기면 다음 추천이 달라집니다.",
      },
    ],
  },
} as const;
