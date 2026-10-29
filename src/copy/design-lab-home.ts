// 디자인 랩 오늘(홈) G3 선택안 D1 문구 (T3.1, design-decisions D-05).
// 공용 문구(homeCopy, commonCopy, badgeCopy)에 이미 있는 것은 그쪽을 쓰고, 시안에만 필요한 것만 둔다.
// 문체: 상태 안내와 설명은 습니다체, 피드백 요청과 제안은 해요체 (tasks.md 2.2절). 버튼과 라벨은 명사형.
// 실제 홈 구현(T5.17) 때 home.ts로 옮기고 이 파일은 지운다. 미선택 시안(A, B, C, D, D2, D3) 문구는 T3.8에서 지웠다.
import { homeCopy } from "./home";

export const designLabHomeCopy = {
  /** 단독 화면 제목 */
  metaTitle: "오늘(홈) D1",

  /** 시안 화면 안 문구 */
  screen: {
    title: "오늘의 추천",
    /** 예: "10월 28일 수요일" */
    dateLine: (month: number, day: number, weekday: string) =>
      `${month}월 ${day}일 ${weekday}요일`,

    meal: {
      label: "끼니",
      lunch: "점심",
      dinner: "저녁",
      changed: (meal: string) => `${meal} 추천으로 바꿨습니다.`,
    },

    location: {
      label: "기준 위치",
      options: {
        office: "기본 사무실",
        other: "다른 사무실",
        here: "현위치",
      },
      /** 칩의 스크린 리더 이름. 보이는 글자를 그대로 품는다 */
      chipLabel: (name: string) => `기준 위치 ${name}, 바꾸기`,
      changed: (name: string) => `${name} 기준으로 다시 추천했습니다.`,
    },

    actions: {
      directions: homeCopy.actions.directions,
      reroll: homeCopy.actions.reroll,
      justPick: "그냥 골라줘",
      detail: "상세",
      directionsTo: (name: string) => `${name} 길찾기`,
      detailOf: (name: string) => `${name} 상세`,
    },

    numbers: {
      walk: "도보",
      price: "1인",
      thumbs: "만족",
      walkUnit: "분",
      thumbsUnit: "%",
    },

    feedback: {
      label: "어제 식사",
      question: (name: string) => `어제 간 ${name}, 어땠어요?`,
      up: "좋았어요",
      down: "별로였어요",
      skipped: "안 갔어요",
      thanks: "알려 줘서 고마워요",
      thanksBody: "다음 추천에 반영합니다.",
      /** 안 갔어요: 부정 신호로 쓰지 않는다(FB-05) */
      skippedBody: "추천 점수에는 쓰지 않습니다.",
      /** 한 탭 뒤 선택 입력(FB-02) 진입 */
      more: "가격, 태그 남기기",
    },

    rerolled: "새 추천 세 곳을 불러왔습니다.",

    /** "그냥 골라줘" R1 연출과 결과 카드 (REC-12, T3.3, G3 D-05) */
    justPick: {
      dialogLabel: "그냥 골라줘 결과",
      picking: "세 곳 중에서 고르고 있습니다.",
      skip: "바로 보기",
      /** 결과 카드 위 세리프 한 줄 (축하, 해요체) */
      settled: "오늘은 여기로 가요.",
      /** 스크린 리더 결과 안내 */
      announce: (name: string) => `${name}, 오늘은 여기로 가요.`,
      again: "다시 고르기",
      close: "닫기",
    },

    /** 오늘의 한 곳 (큰 카드, 대안, 하단 행동 줄) */
    single: {
      eyebrow: "오늘의 한 곳",
      alternatives: "또는 이 두 곳",
      /** 대안 줄 버튼의 보이지 않는 끝말. 이름은 보이는 글자(식당명, 숫자) + 이 말이 된다(axe label-content-name-mismatch, T3.5) */
      swapHint: "크게 보기",
      swapped: (name: string) => `오늘의 한 곳을 바꿨습니다. ${name}입니다.`,
      /** 하단 고정 행동 줄 */
      actionsLabel: "오늘의 한 곳 행동",
    },
  },
} as const;
