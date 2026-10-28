// 여러 화면이 함께 쓰는 문구. 컴포넌트 안에 문장을 직접 쓰지 않는다 (CLAUDE.md 4장).
// 도메인 파일(home.ts, map.ts ...)은 같은 뜻의 라벨을 새로 만들지 말고 여기 값을 쓴다.
// 문체 (tasks.md 2.2절): 상태 안내와 오류는 습니다체, 오류는 다음 행동을 함께 말한다.
// 빈 상태는 습니다체 설명 + 해요체 제안. 라벨은 명사형이라 비율에서 빠진다.

/** 서비스 이름과 메타 설명. 루트 metadata, OG 이미지, 공유 문구가 함께 쓴다. */
const tagline = "오늘 뭐 먹지를 10초 안에 정해 드립니다.";

export const siteCopy = {
  name: "런치메이트",
  tagline,
  /** <meta name="description">. 지금은 tagline과 같고, 따로 고칠 수 있게 키를 나눈다 */
  description: tagline,
} as const;

/** 버튼과 아이콘 버튼 라벨 */
const actions = {
  retry: "다시 시도",
  close: "닫기",
  previous: "이전",
  next: "다음",
  back: "뒤로",
  cancel: "취소",
  confirm: "확인",
  save: "저장",
  done: "완료",
  more: "더 보기",
  share: "공유",
  copyLink: "링크 복사",
} as const;

export const commonCopy = {
  /** 하단 탭 4개 (CLAUDE.md 6.2) */
  tabs: {
    today: "오늘",
    map: "지도",
    poll: "투표",
    me: "나",
  },
  /** 하단 탭 nav의 aria-label */
  tabBarLabel: "주요 메뉴",

  actions,

  /** 공통 컴포넌트(src/components/ui)의 보조 기술용 라벨 (T2.5) */
  a11y: {
    /** 토스트 영역(Sonner)의 이름 */
    notifications: "알림",
    closeNotification: "알림 닫기",
  },

  /**
   * 4상태 기본 문구. 도메인 화면에 더 구체적인 문구가 없을 때만 쓴다.
   * title은 지금 상태를 말하는 짧은 습니다체 문장(마침표 없음),
   * body는 다음에 일어날 일이나 할 일만 말한다(title을 되풀이하지 않는다).
   */
  states: {
    loading: {
      label: "불러오는 중입니다",
    },
    empty: {
      title: "아직 보여 드릴 내용이 없습니다",
      body: "조건을 바꿔 다시 찾아볼까요?",
    },
    error: {
      title: "정보를 불러오지 못했습니다",
      body: "잠시 뒤 아래 버튼으로 다시 시도할 수 있습니다.",
      action: actions.retry,
    },
    offline: {
      title: "인터넷에 연결되어 있지 않습니다",
      body: "연결되면 자동으로 다시 불러옵니다.",
      action: actions.retry,
    },
    notFound: {
      title: "찾는 페이지가 없습니다",
      body: "오늘 추천에서 다시 시작할까요?",
      action: "오늘 추천으로",
    },
  },

  /** 확인 대화상자. 질문은 해요체, 결과 안내는 습니다체 */
  dialogs: {
    discard: {
      title: "작성 중인 내용을 지울까요?",
      body: "지우면 되돌릴 수 없습니다.",
      confirm: "지우기",
    },
  },

  /** 짧은 알림(토스트) */
  toasts: {
    linkCopied: "링크를 복사했습니다.",
    copyFailed: "복사하지 못했습니다. 주소창의 링크를 직접 복사해 주세요.",
  },

  /** 숫자 단위 라벨. 숫자 포매팅 자체는 src/lib/format이 맡는다 */
  counts: {
    people: (n: number) => `${n}명`,
    items: (n: number) => `${n}건`,
    places: (n: number) => `${n}곳`,
    minutes: (n: number) => `${n}분`,
  },
} as const;
