// /design-lab/poc 동적 컴포넌트 PoC 문구 (T2.13). 내부용이지만 문구 규칙(tasks.md 2.2절)은 똑같이 지킨다.
// PoC마다 키를 나눈다. 다른 PoC(NumberFlow, 랜딩 효과 등)는 자기 키를 더한다.
export const designLabPocCopy = {
  metaTitle: "동적 컴포넌트 PoC",
  index: {
    title: "동적 컴포넌트 PoC",
    description:
      "2.4절 라이브러리를 실제 상호작용으로 확인하는 화면입니다. 결과는 T2.15에서 채택, 보류, 제외로 기록합니다.",
    back: "PoC 목록",
  },

  /** 모든 PoC 위에 붙는 축소 모드 토글 */
  frame: {
    reduceToggle: "모션 줄이기",
    reduceOn: "모션 줄이기를 켰습니다. 모든 전환이 즉시 바뀝니다.",
    reduceOff: "시스템 모션 설정을 따릅니다.",
  },

  swipe: {
    title: "스와이프 카드 스택",
    description:
      "카드를 좌우로 밀어 넘깁니다. 키보드 왼쪽, 오른쪽 화살표와 이전, 다음 버튼으로도 똑같이 넘길 수 있습니다.",
    regionLabel: "오늘 추천 카드",
    hint: "밀거나 화살표 키로 넘깁니다",
    slide: (index: number, total: number) => `${total}곳 중 ${index}번째`,
    announce: (index: number, total: number, name: string) =>
      `${total}곳 중 ${index}번째, ${name}`,
    previous: "이전 식당",
    next: "다음 식당",
  },

  sheet: {
    title: "바텀시트 스냅 포인트",
    description:
      "지도 위 식당 상세 시트입니다. 손잡이를 끌면 살짝, 절반, 전체 세 높이에 멈춥니다. 본문은 전체 높이에서만 스크롤됩니다.",
    open: "시트 열기",
    modalLabel: "지도 조작 막기",
    snapGroup: "시트 높이",
    snaps: { peek: "살짝", half: "절반", full: "전체" },
    snapAnnounce: {
      peek: "시트를 낮게 내렸습니다.",
      half: "시트를 절반까지 올렸습니다.",
      full: "시트를 전체 높이로 펼쳤습니다.",
    },
    close: "닫기",
    menuTitle: "대표 메뉴",
    infoTitle: "가게 정보",
    memoLabel: "메모",
    memoPlaceholder: "다음에 기억할 것",
    memoHelp: "키보드가 올라올 때 입력칸이 가려지지 않는지 확인하는 칸입니다.",
    filler: "후기 요약은 3건 이상 모이면 보여 줍니다.",
    devicesTitle: "실기기 확인 항목",
    devicesBody:
      "이 페이지는 일부러 길게 만들었습니다. 시트를 연 채 아래 항목을 iOS Safari와 카카오톡 인앱 브라우저에서 확인합니다.",
    devices: [
      "시트가 열린 동안 뒤 페이지가 스크롤되지 않습니다.",
      "살짝, 절반 높이에서 본문을 위로 끌면 시트가 커지고, 전체 높이에서만 본문이 스크롤됩니다.",
      "전체 높이에서 본문 맨 위를 아래로 끌면 시트가 내려갑니다.",
      "메모 칸을 누르면 키보드 위로 입력칸이 보입니다.",
      "시트를 닫은 뒤 페이지 스크롤이 원래대로 돌아옵니다.",
      "홈 인디케이터와 주소창이 시트 아래쪽을 가리지 않습니다.",
    ],
  },

  shuffle: {
    title: "다시 뽑기 셔플",
    description:
      "세 장이 함께 흐려졌다가 새 세 곳이 위에서부터 차례로 나타납니다. 한 번에 움직이는 효과는 하나뿐입니다.",
    listLabel: "오늘 추천 세 곳",
    reroll: "다시 뽑기",
    rerolled: (n: number) =>
      `새 추천 세 곳을 불러왔습니다. ${n}번째 묶음입니다.`,
    round: (n: number) => `${n}번째 묶음`,
  },

  celebrate: {
    title: "결정 축하",
    description:
      "투표가 확정되는 순간 작은 종이 조각이 짧게 흩어집니다. 모션 줄이기가 켜져 있으면 조각 없이 문장만 바뀝니다.",
    pending: "투표가 끝나면 1위로 확정합니다.",
    confirm: "이 집으로 확정",
    confirmTo: (name: string) => `${name}, 이 집으로 확정`,
    confirmed: "오늘 점심은 여기로 정했어요.",
    votes: (n: number) => `${n}표`,
    reset: "처음으로",
    loaded: "축하 효과 모듈을 불러왔습니다.",
    skipped: "모션 줄이기라 축하 효과를 생략했습니다.",
    unsupported:
      "이 브라우저에서 토큰 색을 읽지 못해 축하 효과를 생략했습니다.",
  },
} as const;
