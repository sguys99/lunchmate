// /design-lab/poc/number-flow 문구 (T2.13). 내부용이지만 문구 규칙(tasks.md 2.2절)은 똑같이 지킨다.
export const pocNumbersCopy = {
  title: "숫자 롤링",
  description:
    "NumberFlow로 득표 수, 마감 카운트다운, 👍 비율을 굴립니다. 속도는 모션 토큰 base이고, 모션을 줄이면 애니메이션 없이 바로 바뀝니다.",

  votes: {
    title: "득표 수",
    body: "내 표를 옮기거나 다른 사람의 표가 들어오면 숫자가 굴러갑니다. 처음 열 때는 0에서 시작합니다.",
    candidates: ["을지로 국밥집", "청계 쌀국수", "삼각지 분식"],
    unit: "표",
    myVote: "내 표",
    voteFor: (name: string) => `${name}에 투표`,
    incoming: "다른 사람 표 받기",
    participants: (n: number) => `참여 ${n}명`,
  },

  countdown: {
    title: "마감 카운트다운",
    body: "시, 분, 초를 따로 굴립니다. 분과 초의 십의 자리는 0에서 5까지만 돕니다.",
    long: "한 시간 넘게 남은 투표",
    short: "한 시간 안에 끝나는 투표",
    nearEnd: "10초 남기기",
    reset: "처음부터",
  },

  thumbs: {
    title: "👍 비율",
    body: "한 탭 피드백이 쌓이면 비율이 바뀝니다. 반올림은 src/lib/format 규칙을 따릅니다.",
    up: "좋았어요",
    down: "아쉬웠어요",
    responses: "응답",
    responseUnit: "건",
    empty: "아직 응답이 없습니다",
    reset: "비우기",
  },
} as const;
