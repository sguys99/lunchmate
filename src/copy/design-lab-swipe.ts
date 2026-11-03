// 탭 스와이프 이동 시안 문구 (T9.14, /design-lab/swipe/<a|b|c>). 실제 화면은 앱 탭 4개(오늘, 지도, 투표, 나)의 본문과 하단 탭.
// 문체: 상태, 안내, 결과는 습니다체. 제안은 해요체. 탭 이름, 버튼, 칩은 명사형(비율 제외).
// 목업 식당 이름은 design-lab/mock의 지어낸 이름이다. 상태 title은 마침표 없는 짧은 습니다체(common.ts 규칙).
import { commonCopy } from "./common";
import { historyCopy } from "./history";

export const swipeLabCopy = {
  names: {
    a: "스와이프 시안 A 따라오는 페이지 (선택안)",
  },
  index: {
    title: "탭 스와이프 이동 시안 (T9.14)",
    body: "좌우로 밀어 옆 탭으로 옮깁니다. ?tab=today|map|poll|me, ?state=ready|loading|empty|error|offline, ?demo=drag|armed|end 로 화면을 바꿉니다.",
  },

  /** 스크린 리더 알림(탭을 옮긴 뒤 한 번) */
  moved: (label: string) => `${label} 탭으로 옮겼습니다.`,

  /** A 옆 탭 미리 보기 */
  hint: {
    release: "놓으면 옮깁니다",
  },

  today: {
    eyebrow: "11월 3일 화요일 점심",
    title: "오늘의 추천",
    place: "회사",
    spot: "오늘의 한 곳",
    reason: "걸어서 4분, 최근 2주 동안 가지 않은 곳입니다.",
    others: "또는 이 두 곳",
    walk: (m: number) => `${m}분`,
  },
  map: {
    summary: "도보 10분 안 32곳",
    sort: "가까운 순",
    chips: ["카테고리", "1만 원 이하", "도보 5분 안", "즐겨찾기"],
    chipsLabel: "목록 거르기",
    walk: (m: number) => `도보 ${m}분`,
    mapLabel: "지도",
  },
  poll: {
    title: "투표",
    live: "진행 중",
    past: "지난 투표",
    rows: [
      {
        title: "금요일 점심",
        meta: "후보 3곳 | 4명 참여",
        right: "오늘 12:30 마감",
      },
      {
        title: "팀 회식",
        meta: "후보 5곳 | 9명 참여",
        right: "내일 18:00 마감",
      },
    ],
    pastRows: [
      { title: "월요일 저녁", meta: "후보 3곳 | 2명 참여", right: "정담국밥" },
      {
        title: "지난주 금요일",
        meta: "후보 4곳 | 6명 참여",
        right: "소담밥상",
      },
    ],
  },
  me: {
    greeting: historyCopy.greeting("test_민지"),
    title: historyCopy.title,
    tabs: [
      historyCopy.tabs.history,
      historyCopy.tabs.places,
      historyCopy.tabs.reviews,
    ],
    tabsLabel: historyCopy.tabs.label,
    rows: [
      { name: "정담국밥", meta: "어제 점심" },
      { name: "소담밥상", meta: "10월 30일 점심" },
      { name: "모락 파스타", meta: "10월 29일 저녁" },
    ],
  },

  states: {
    empty: {
      today: {
        title: "조건에 맞는 곳이 없습니다",
        body: "도보 시간을 조금 늘려 보시겠어요?",
        action: "도보 15분으로 넓히기",
      },
      map: {
        title: "도보 10분 안에 식당이 없습니다",
        body: "지도를 옮기거나 도보 시간을 늘려 보세요.",
        action: "도보 15분으로 넓히기",
      },
      poll: {
        title: "진행 중인 투표가 없습니다",
        body: "오늘 화면의 친구랑 정하기로 만들어 보세요.",
        action: "오늘 추천 보기",
      },
      me: {
        title: "아직 다녀온 곳이 없습니다",
        body: "오늘 추천에서 길찾기를 누르면 그날 간 곳이 여기에 쌓입니다.",
        action: "오늘 추천 보기",
      },
    },
    error: {
      title: "목록을 불러오지 못했습니다",
      body: "잠시 뒤 다시 시도해 주세요.",
      action: commonCopy.states.error.action,
    },
    offline: {
      title: commonCopy.states.offline.title,
      body: commonCopy.states.offline.body,
      action: commonCopy.states.offline.action,
    },
  },
} as const;
