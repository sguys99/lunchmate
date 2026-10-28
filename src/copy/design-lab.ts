// 디자인 랩 화면 문구. 컴포넌트 안에 문장을 직접 쓰지 않는다 (CLAUDE.md 4장).
// 내부용 화면이지만 문구 규칙(tasks.md 2.2절)은 똑같이 지킨다.
export const designLabCopy = {
  metaTitle: "디자인 랩",
  title: "디자인 랩",
  description:
    "화면별 시안을 비교하는 내부용 공간입니다. 운영 환경에서는 열리지 않습니다.",

  /** /design-lab 첫 페이지 목록 */
  index: {
    systemTitle: "디자인 시스템 (G1)",
    switcherLink: "시안 스위처",
    switcherBody:
      "같은 화면에서 시안, 상태, 테마를 바로 바꿔 봅니다. 선택값은 주소에 남습니다.",
    screensTitle: "시안별 단독 화면",
    screensBody:
      "캡처용 페이지입니다. 테마는 시스템 설정을 따르고, 주소 끝에 ?state=loading 처럼 상태를 붙입니다.",
    illustrationsTitle: "일러스트 확인",
    toolsTitle: "점검 도구",
    mapSmoke: "지도 연결 점검",
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
    shortcuts: "단축키: 1~3 시안, H/S 화면, [ ] 상태, O/L/D 테마, F 보기",
  },

  /** 시안 화면이 채워지기 전 자리표시 */
  placeholder: {
    eyebrow: (id: string, screen: string) => `시안 ${id}, ${screen}`,
    body: "자리표시 화면입니다. 시안 담당이 실제 화면으로 채웁니다.",
    stateLabel: (state: string) => `상태: ${state}`,
  },

  /** 데스크톱 2단의 지도 자리 (실제 지도 없음) */
  mapPlaceholder: "지도 자리",
} as const;
