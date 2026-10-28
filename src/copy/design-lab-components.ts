// /design-lab/components 컴포넌트 갤러리 문구 (T2.5 초안, T2.10 완성).
// T2.7 /design-lab/states, T2.9 /design-lab/badges 확인 화면 문구를 이 파일로 합쳤다(두 페이지는 삭제).
// 내부용 화면이지만 문구 규칙(tasks.md 2.2절)은 똑같이 지킨다. 컴포넌트 이름(specimen)은 코드 이름 그대로 둔다.
export const designLabComponentsCopy = {
  metaTitle: "컴포넌트 갤러리",
  eyebrow: "디자인 랩",
  title: "컴포넌트 갤러리",
  description:
    "공통 컴포넌트와 상태를 한 페이지에 모았습니다. 시각 회귀와 접근성 검사의 기준 화면입니다.",
  queryHint:
    "주소 끝에 ?theme=dark&motion=reduce&static=1 처럼 붙이면 상태가 고정됩니다.",
  backToLab: "디자인 랩",

  /** 상단 설정 막대 */
  toolbar: {
    label: "갤러리 보기 설정",
    theme: "테마",
    motion: "모션",
    still: "정지",
    themes: { system: "시스템", light: "라이트", dark: "다크" },
    motions: { system: "시스템", reduce: "줄이기" },
    stills: { off: "끄기", on: "켜기" },
  },
  tocLabel: "섹션 목차",

  /** 섹션 제목과 한 줄 설명. 키는 data-gallery-section 값과 같다 */
  sections: {
    foundations: {
      title: "기초",
      body: "타입 스케일과 핵심 색입니다. 전체 견본은 토큰 견본표에 있습니다.",
    },
    button: {
      title: "버튼",
      body: "올리브 주 버튼은 화면당 하나만 씁니다. 기본은 면 버튼입니다.",
    },
    chip: {
      title: "칩과 토글",
      body: "칩은 높이 40, 터치 영역 48입니다. 눌린 상태는 aria-pressed로 알립니다.",
    },
    badge: {
      title: "배지",
      body: "면 없이 1px 테두리와 글자 색으로만 의미를 나눕니다.",
    },
    input: {
      title: "입력과 슬라이더",
      body: "오류는 테두리와 아래 한 줄로 알리고, 다음 행동을 안내합니다.",
    },
    tabs: {
      title: "탭",
      body: "밑줄 탭과 세그먼트 두 가지입니다.",
    },
    overlay: {
      title: "대화상자, 시트, 툴팁, 토스트",
      body: "버튼을 누르면 열립니다. 모션을 줄이면 전환 없이 바로 나타납니다.",
    },
    avatar: {
      title: "아바타",
      body: "사진이 없으면 닉네임 첫 글자를 보여 줍니다.",
    },
    states: {
      title: "4상태",
      body: "스켈레톤 3종과 빈 상태, 오류, 오프라인입니다. 로딩은 스피너 대신 스켈레톤을 씁니다.",
    },
    placeBadges: {
      title: "도메인 배지",
      body: "추정, 제보, 할인, 웨이팅 3단계, 기피 경고입니다. 카드에는 우선순위로 2개까지만 보입니다.",
    },
    illustrations: {
      title: "카테고리 일러스트",
      body: "카드 크기와 리스트 아이콘 크기입니다. 큰 크기는 일러스트 페이지에서 봅니다.",
    },
    appShell: {
      title: "앱 셸 조각",
      body: "하단 탭과 페이지 헤더입니다. 미리보기라 눌러도 이동하지 않습니다.",
    },
  },

  /** 기초 섹션 */
  foundations: {
    typeSample: "오늘 점심은 여기 어때요",
    numericSample: "12",
    colors: {
      background: "background",
      card: "card",
      muted: "muted",
      primary: "primary",
      border: "border",
      skeleton: "skeleton",
    },
    tokensLink: "토큰 견본표",
    illustrationsLink: "일러스트 12종 자세히",
  },

  /** 각 견본 이름. 코드 이름이라 caption으로 작게 보인다 */
  specimens: {
    typeScale: "type-*",
    colors: "color",
    buttonVariants: "Button variant",
    buttonSizes: "Button size, disabled",
    chipGroup: "ChipGroup multiple",
    toggle: "Toggle quiet",
    badgeVariants: "Badge variant",
    input: "Input",
    inputError: "Input aria-invalid",
    slider: "Slider",
    sliderRange: "Slider range",
    sliderDisabled: "Slider disabled",
    tabsLine: "Tabs",
    tabsSegment: "Tabs segment",
    dialog: "Dialog",
    sheet: "Sheet side",
    drawer: "Drawer",
    tooltip: "Tooltip",
    toast: "toast()",
    avatarSizes: "Avatar size",
    avatarGroup: "AvatarGroup",
    cardSkeleton: "CardSkeleton",
    listSkeleton: "ListSkeleton",
    sheetSkeleton: "SheetSkeleton",
    empty: "EmptyState",
    emptyDomain: "EmptyState visual action",
    error: "ErrorState",
    offline: "OfflineState",
    online: "useOnlineStatus",
    badgeAll:
      "EstimateBadge, ReportBadge, DealBadge, WaitingBadge, AvoidWarningBadge",
    waiting: "WaitingBadge level",
    badgeTooltip: "withTooltip",
    placeBadges: "PlaceBadges",
    priority: "BADGE_PRIORITY",
    illustrationCard: "CategoryIllustration 96",
    illustrationIcon: "CategoryIllustration 40",
    tabBar: "TabBarView",
    tabBarNone: "TabBarView activeId null",
    pageHeader: "PageHeader",
    pageHeaderBack: "PageHeader backHref action",
  },

  samples: {
    directions: "길찾기",
    other: "다른 곳",
    quiet: "건너뛰기",
    link: "자세히",
    disabled: "길찾기",
    categoryGroup: "먹고 싶은 종류",
    categories: ["한식", "국밥", "일식", "분식", "샐러드"],
    disabledChip: "중식",
    save: "저장",
    badges: {
      default: "추정",
      muted: "제보",
      success: "할인",
      warning: "웨이팅",
      info: "새로 생김",
      destructive: "폐업 제보",
    },
    tabs: { visit: "방문", saved: "저장", reviews: "후기" },
    panel: {
      visit: "최근 방문한 식당이 여기에 보입니다.",
      saved: "저장한 식당이 여기에 보입니다.",
      reviews: "남긴 후기가 여기에 보입니다.",
    },
    segment: { list: "목록", map: "지도" },
    walk: "허용 거리",
    budget: "예산",
    nickname: "닉네임",
    nicknamePlaceholder: "점심 메이트",
    nicknameError: "닉네임은 2자 이상이어야 합니다.",
    tooltip: "정보",
    tooltipBody: "후기 3건 이상부터 추천에 반영합니다.",
    toast: "토스트",
    toastError: "오류 토스트",
    dialog: "대화상자",
    sheet: "오른쪽 시트",
    sheetBottom: "아래 시트",
    drawer: "바텀시트",
    sheetTitle: "필터",
    sheetBody: "조건을 고르면 추천을 다시 계산합니다.",
    drawerTitle: "을지로 할머니 국밥",
    drawerBody: "어제 고른 국밥집과 다른 곳이라 골랐습니다.",
    avatarLetters: ["민", "지", "하", "윤"],
    avatarGroup: ["가", "나", "다"],
    headerEyebrow: "10월 29일 수요일 점심",
    headerTitle: "오늘은 여기 어때요",
    headerDetailTitle: "방문 기록",
    headerAction: "편집",
    /** 미리보기 탭 바 두 개가 같은 이름의 nav 랜드마크가 되지 않게 따로 이름 붙인다(axe landmark-unique) */
    tabBarPreviewActive: "주요 메뉴 미리보기, 오늘 활성",
    tabBarPreviewNone: "주요 메뉴 미리보기, 활성 없음",
  },

  /** 4상태 섹션 (구 /design-lab/states) */
  states: {
    /** copy-guide 4.2 "반경 안 0곳" 예문 */
    emptySample: {
      title: "도보 10분 안에 조건에 맞는 식당이 없습니다",
      body: "15분까지 넓혀볼까요?",
      action: "15분까지 넓히기",
    },
    onlineNow:
      "온라인입니다. 기기의 네트워크를 끄면 이 자리가 오프라인 안내로 바뀝니다.",
    pressed: (label: string) => `${label} 버튼을 눌렀습니다.`,
  },

  /** 도메인 배지 섹션 (구 /design-lab/badges) */
  placeBadges: {
    tooltipHint: "배지에 포인터를 올리거나 Tab으로 이동하면 설명이 보입니다.",
    sampleName: "을지로 할머니 국밥",
    candidatesLabel: "후보 4개",
  },
} as const;

export type GallerySectionId = keyof typeof designLabComponentsCopy.sections;
