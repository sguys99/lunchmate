// 디자인 랩 화면 문구. 컴포넌트 안에 문장을 직접 쓰지 않는다 (CLAUDE.md 4장).
// 내부용 화면이지만 문구 규칙(tasks.md 2.2절)은 똑같이 지킨다.
export const designLabCopy = {
  metaTitle: "디자인 랩",
  title: "디자인 랩",
  description:
    "화면별 시안을 비교하는 내부용 공간입니다. 운영 환경에서는 열리지 않습니다.",

  /** /design-lab 첫 페이지 목록 */
  index: {
    systemTitle: "디자인 시스템 (G1 확정)",
    switcherLink: "화면 스위처",
    switcherBody:
      "같은 화면에서 상태, 테마, 보기를 바로 바꿔 봅니다. 선택값은 주소에 남습니다. 토큰은 루트 DESIGN.md를 따릅니다.",
    screensTitle: "단독 화면",
    screensBody:
      "캡처용 페이지입니다. 테마는 시스템 설정을 따르고, 주소 끝에 ?state=loading 처럼 상태를 붙입니다.",
    galleryTitle: "컴포넌트 갤러리",
    galleryBody:
      "공통 컴포넌트, 4상태, 배지, 일러스트, 앱 셸 조각을 한 페이지에서 봅니다. 테마와 모션을 페이지 안에서 바꿉니다.",
    galleryLink: "컴포넌트 갤러리",
    pocTitle: "동적 컴포넌트 PoC",
    pocBody:
      "스와이프 스택, 바텀시트 스냅, 셔플, 결정 축하, 숫자 롤링, 랜딩 효과를 따로 시험합니다. 각 화면에서 모션 줄이기를 켤 수 있습니다.",
    pocLink: "PoC 목록",
    illustrationsTitle: "카테고리 일러스트",
    illustrationsBody:
      "운영용 선화 12종을 카드, 큰 카드, 리스트 아이콘 크기로 봅니다. 라이트와 다크를 나란히 둡니다.",
    illustrationsLink: "일러스트 12종",
    archiveTitle: "보존 자료",
    archiveBody:
      "미선택 시안 A, C의 화면 코드는 지웠습니다. 시안 문서는 docs/design/candidates, 캡처는 docs/design/shots, 비교 자료는 docs/design/g1-comparison.md에 있습니다.",
    toolsTitle: "점검 도구",
    mapSmoke: "지도 연결 점검",
    tokensLink: "토큰 견본표",
    tokensBody:
      "확정본의 색, 대비, 타입 스케일, 라운드, 그림자, 모션을 봅니다. 값은 루트 DESIGN.md에서 읽습니다.",
    designLabel: (id: string, name: string) => `시안 ${id} ${name}`,
  },

  /** /design-lab/system 스위처 */
  switcher: {
    metaTitle: "시안 스위처",
    toolbarLabel: "시안 스위처 설정",
    groups: {
      design: "시안",
      screen: "화면",
      state: "상태",
      theme: "테마",
      view: "보기",
    },
    screens: {
      home: "오늘",
      sheet: "상세 시트",
    },
    states: {
      ready: "정상",
      loading: "로딩",
      empty: "빈 상태",
      error: "오류",
      offline: "오프라인",
    },
    themes: {
      system: "시스템",
      light: "라이트",
      dark: "다크",
    },
    views: {
      frame: "390 프레임",
      full: "전체 폭",
    },
    openStandalone: "단독 화면",
    shortcuts: "단축키: H/S 화면, [ ] 상태, O/L/D 테마, F 보기",
    shortcutsMulti:
      "단축키: 숫자 시안, H/S 화면, [ ] 상태, O/L/D 테마, F 보기",
    finalLabel: (name: string) => `확정 ${name}`,
  },

  /** 시안 화면이 채워지기 전 자리표시 */
  placeholder: {
    eyebrow: (id: string, screen: string) => `시안 ${id}, ${screen}`,
    body: "자리표시 화면입니다. 시안 담당이 실제 화면으로 채웁니다.",
    stateLabel: (state: string) => `상태: ${state}`,
  },

  /** /design-lab/system/tokens 견본표 (T1.16 보조 자료) */
  tokens: {
    metaTitle: "토큰 견본표",
    title: "G1 토큰 견본표",
    description:
      "루트 DESIGN.md(확정본) 값을 그대로 그립니다. 테마는 시스템 설정을 따르고, 대비비는 지금 보이는 테마의 값입니다.",
    designHeading: (name: string, version: string) =>
      `확정본 ${name} v${version}`,
    sections: {
      color: "색",
      contrast: "대비 쌍",
      category: "카테고리 색면",
      type: "타입 스케일",
      shape: "라운드와 그림자",
      motion: "모션",
    },
    contrastNote:
      "숫자는 WCAG 대비비이고 소수 둘째 자리에서 내립니다. 기준 미달이면 굵게 표시합니다.",
    alpha: "알파",
    reference: "참고",
    min: (min: number) => `기준 ${min}`,
    pairs: {
      body: "본문",
      card: "카드 글자",
      muted: "보조 글자",
      mutedOnCard: "카드 위 보조 글자",
      primaryButton: "포인트 버튼",
      primaryIcon: "포인트 아이콘",
      accent: "선택 칩",
      border: "경계선",
      destructive: "오류 글자",
      success: "성공 안내",
      warning: "주의 안내",
      info: "정보 안내",
      warningIcon: "주의 아이콘",
    },
    sampleText: "가나다 123",
    typeSamples: {
      display: "오늘 점심, 여기서 끝",
      title: "오늘은 이 세 곳입니다",
      heading: "정담국밥",
      body: "지난주에 좋아요를 누른 국밥집과 가깝습니다.",
      "body-sm": "도보 약 4분, 점심 세트 1천 원 할인",
      label: "길찾기",
      caption: "10월 28일 수요일 점심",
      "numeric-lg": "4분 9,000원",
      "numeric-md": "87% 23건",
    },
    serif: "세리프",
    sans: "산세리프",
    numeric: "숫자",
    radiusLabels: {
      card: "카드",
      button: "버튼",
      chip: "칩",
      sheet: "시트",
    },
    shadowNone: "없음",
    duration: "길이",
    spring: "스프링",
    stagger: "등장 간격",
    easing: "기본 이징",
    springValue: (stiffness: number, damping: number) =>
      `강성 ${stiffness}, 감쇠 ${damping}`,
    springLabels: {
      swipe: "스와이프",
      sheet: "시트",
      bar: "득표 바",
    },
  },

  /** 데스크톱 2단의 지도 자리 (실제 지도 없음) */
  mapPlaceholder: "지도 자리",

  /** /design-lab/illustrations 카테고리 일러스트 확인 (T2.8) */
  illustrations: {
    metaTitle: "카테고리 일러스트",
    eyebrow: "T2.8",
    title: "카테고리 일러스트",
    description:
      "음식과 그릇만 그린 선화 12종입니다. 바닥선, 시점, 선 굵기를 맞췄고 64px 미만에서는 잔선을 뺀 아이콘 변형을 씁니다.",
    light: "라이트",
    dark: "다크",
    cardSize: "카드 96px",
    largeSize: "큰 카드 144px",
    iconSize: "리스트 아이콘 40px, 32px",
    listSample: "리스트 예시",
    listMeta: (minutes: number) => `도보 약 ${minutes}분`,
  },
} as const;
