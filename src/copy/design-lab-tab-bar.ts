// 하단 탭 활성 표시 시안 문구 (T9.15, /design-lab/tab-bar/<a|b|c>). 본문은 탭 스와이프 시안(design-lab-swipe)의 네 탭 목업을 그대로 쓴다.
// 문체: 안내는 습니다체. 이름은 명사형(비율 제외).
export const tabBarLabCopy = {
  names: {
    a: "탭 표시 시안 A 굵게와 넓은 막대",
    b: "탭 표시 시안 B 아이콘 알약",
    c: "탭 표시 시안 C 올리브 글자와 점",
  },
  index: {
    title: "하단 탭 활성 표시 시안 (T9.15)",
    body: "지금 어느 탭인지 더 잘 보이게 하는 세 안입니다. ?tab=today|map|poll|me, ?state=ready|loading|empty|error|offline 로 화면을 바꿉니다.",
  },
} as const;
