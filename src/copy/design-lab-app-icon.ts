// 앱 아이콘과 스플래시 확인 화면 문구 (/design-lab/app-icon/a, T8.1 시안 → D-18 선택, T8.2에서 B, C, D 삭제).
// 내부 확인 화면이지만 문구 규칙(tasks.md 2.2절)을 지킨다. 설명과 상태 안내는 습니다체.

export const appIconLabCopy = {
  names: {
    a: "아이콘 A 그릇 한 점",
  },
  intents: {
    a: "카테고리 일러스트의 옅은 원과 선 그릇을 아이콘 크기로 줄였습니다. 앱 안 그림과 같은 손이라 설치한 뒤에도 한 집처럼 보입니다.",
  },
  appName: "런치메이트",
  iconLabel: (name: string) => `런치메이트 앱 아이콘, ${name}`,

  page: {
    eyebrow: "T8.1 앱 아이콘과 스플래시 시안",
    toneLabel: "바탕",
    tones: { sand: "샌드 바탕", olive: "올리브 바탕" },
    toneNote:
      "바탕을 바꿔 보는 것은 같은 시안의 변형입니다. 구현한 아이콘은 샌드 바탕입니다.",

    homeHeading: "홈 화면",
    homeBody:
      "아이폰 홈 화면 크기(60px)와 둥근 사각 마스크입니다. 나머지 칸은 다른 앱 자리입니다.",
    wallLight: "밝은 배경화면",
    wallDark: "어두운 배경화면",

    sizesHeading: "크기별 원본",
    sizesBody:
      "매니페스트와 apple-touch-icon에 쓰는 크기입니다. 512는 절반 크기로 보여 줍니다. 작은 크기에서는 잔선을 빼고 선을 굵게 그립니다.",
    sizeLabels: {
      s512: "512 (매니페스트, 절반 크기로 표시)",
      s192: "192 (매니페스트)",
      s180: "180 (iOS 홈 화면)",
      s48: "48 (안드로이드 런처 최소)",
    },

    maskHeading: "안드로이드 마스크와 안전 영역",
    maskBody:
      "maskable 아이콘은 런처마다 다른 모양으로 잘립니다. 점선 원은 지름 80% 안전 영역이고 그림은 모두 그 안에 듭니다.",
    masks: {
      circle: "원형",
      squircle: "스쿼클",
      rounded: "둥근 사각",
      teardrop: "물방울",
    },

    faviconHeading: "파비콘",
    faviconBody:
      "브라우저 탭에 실제 크기(16px, 32px)로 넣었습니다. 오른쪽은 16px용 그림을 8배로 키운 모습입니다.",
    tabTitle: "오늘 뭐 먹지",
    tabLight: "밝은 탭",
    tabDark: "어두운 탭",
    favicon16: "16px",
    favicon32: "32px",
    faviconZoom: "16px 그림 8배",

    ogHeading: "OG 이미지 왼쪽 위 기호 (24px)",
    ogBody:
      "공유 이미지는 올리브를 한 군데에만 씁니다. 그래서 기호는 글자색 한 가지로 그렸습니다. 아래는 원본 비율과 카카오톡 말풍선 폭(260px)입니다.",
    ogFull: "원본 1200 x 600을 화면 폭에 맞춤",
    ogBubble: "말풍선 폭 260px (기호는 약 5px)",
    ogColor: "비교: 색 그대로 넣으면",
    ogTitle: "목요일 점심, 어디로 갈까요?",
    ogLabel: "점심 투표",

    splashHeading: "스플래시",
    splashBody:
      "홈 화면에서 앱을 열 때 첫 화면이 그려지기 전까지 보이는 모습입니다. 바탕은 앱 배경과 같은 색이라 넘어갈 때 번쩍임이 없습니다.",
    splashIosLight: "iOS 시작 이미지, 라이트",
    splashIosDark: "iOS 시작 이미지, 다크",
    splashAndroidLight: "안드로이드, background_color 라이트",
    splashAndroidDark: "안드로이드, 다크 (매니페스트 값은 하나)",
    androidDarkNote:
      "매니페스트 background_color는 값이 하나라 시스템 다크에서도 이 색이 나오지 않을 수 있습니다.",

    replayHeading: "스플래시에서 첫 화면으로",
    replayBody:
      "운영체제 스플래시가 사라지고 앱 첫 화면이 보이는 순간을 흉내 냈습니다. 바탕이 같아 그림만 180ms 동안 옅어집니다. 모션 줄이기를 켜면 바로 바뀝니다.",
    replay: "다시 보기",
    replayStatusSplash: "스플래시를 보여 주고 있습니다.",
    replayStatusShell: "첫 화면으로 넘어갔습니다.",
    shellTitle: "오늘",

    stateHeading: "이 상태에서 보는 것",
    states: {
      loading:
        "로딩: 스플래시를 멈춘 채로 보여 줍니다. 첫 화면이 그려지기 전 모습입니다.",
      empty:
        "빈 상태: 아이콘 화면에는 빈 상태가 없습니다. 기본 화면과 같습니다.",
      error:
        "오류: 아이콘을 잘못 만들었을 때 생기는 모습입니다. maskable이 아니면 안드로이드가 흰 원 안에 작게 줄여 넣습니다.",
      offline: "오프라인: 오프라인 첫 화면(T8.3)에 들어갈 아이콘 자리입니다.",
    },
    errorMaskable: "maskable 없이 원형 런처에 놓인 모습",
    errorGood: "maskable로 만든 모습",
    offlineTitle: "연결이 끊겼습니다",
    offlineBody: "연결되면 자동으로 새로고침합니다.",
  },
} as const;
