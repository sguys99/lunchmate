// 베타 문구 (T9.3 /beta 환영 페이지, T9.4 베타 의견 보내기, D-22, D-23).
// 문체: 상태, 설명, 방법 안내, 오류, 정책은 습니다체. 초대, 질문, 감사는 해요체. 버튼, 칩, 라벨은 명사형(비율 제외).
// 두 묶음을 따로 내보낸다. 나 탭은 betaFeedbackCopy만, /beta는 betaCopy만 읽는다(홈 첫 로드 밖).
import { authCopy } from "./auth";
import { commonCopy, siteCopy } from "./common";

const where = authCopy.inapp.where;
const menuItems = authCopy.inapp.menuItems;

/** 베타 의견 글자 수 한도(서버 zod, DB check와 같다) */
export const BETA_FEEDBACK_MAX = 500;
/** 하루 보낼 수 있는 의견 수(DB private.daily_quota_max 'beta_feedback'와 같다) */
export const BETA_FEEDBACK_DAILY = 10;

/* ---------- /beta 환영 페이지 (T9.3) ---------- */

export const betaCopy = {
  metaTitle: "베타 안내",
  eyebrow: "베타 초대",
  /** 마루 부리 큰 제목. 랜딩과 같은 태그라인(D-23 안건 18) */
  title: siteCopy.tagline,
  lead: "정식 출시 전에 먼저 써 보고 의견을 들려주세요.",
  loading: "쓰는 기기를 확인하는 중입니다",

  devices: {
    ios: "아이폰",
    android: "안드로이드",
    desktop: "컴퓨터",
  },
  devicePickLabel: "기기 고르기",
  otherDevices: "다른 기기 보기",
  hideOtherDevices: "다른 기기 접기",
  detected: (name: string) => `${name}에서 보고 있습니다`,
  detectedInApp: (app: string, os: string) =>
    `${app} 안에서 보고 있습니다 (${os})`,
  standalone: "홈 화면 앱으로 열었습니다",

  steps: {
    label: "시작하는 방법",
    external: {
      title: "외부 브라우저로 열기",
      body: (app: string, menu: "bottom-right" | "top-right", item: "otherBrowser" | "externalBrowser") =>
        `${app} 안에서는 홈 화면에 둘 수 없습니다. ${where[menu]} 메뉴에서 "${menuItems[item]}"를 골라 주세요.`,
      action: authCopy.inapp.openExternal,
      opening: authCopy.inapp.opening,
    },
    install: {
      title: "홈 화면에 추가",
      ios: 'Safari 아래쪽 공유 버튼을 누른 뒤 "홈 화면에 추가"를 골라 주세요.',
      android:
        '설치를 누르면 홈 화면에 바로 생깁니다. 버튼이 없으면 Chrome 메뉴에서 "홈 화면에 추가"를 골라 주세요.',
      androidAction: "설치",
      desktop:
        "컴퓨터에서는 따로 설치하지 않아도 됩니다. 휴대폰에서도 이 링크를 열어 두면 점심 때 더 빠릅니다.",
      done: "홈 화면 앱으로 열었습니다. 이 단계는 끝났습니다.",
    },
    login: {
      title: "로그인하고 시작",
      body: "카카오, 네이버, 구글 중 편한 것으로 로그인합니다. 처음 한 번 회사 위치를 고르면 바로 추천이 나옵니다.",
      done: "로그인되어 있습니다. 바로 오늘 추천을 볼 수 있습니다.",
    },
    done: "마친 단계",
    current: "지금 단계",
    stepNo: (n: number, total: number) => `${total}단계 중 ${n}단계`,
  },

  feedback: {
    title: "의견 보내기",
    body: '나 탭 맨 위 "베타 의견 보내기"에서 언제든 보낼 수 있습니다. 불편한 점일수록 큰 도움이 됩니다.',
    short: '써 보다가 불편하면 나 탭의 "베타 의견 보내기"로 알려 주세요.',
  },

  cta: {
    login: "로그인하고 시작",
    today: "오늘 추천 보기",
    stayInApp: (app: string) => `${app}에서 바로 시작`,
  },

  diagrams: {
    share: '공유 버튼 위치 그림. 공유 메뉴에서 "홈 화면에 추가"를 고릅니다.',
    shareItem: "홈 화면에 추가",
    me: '나 탭 그림. 맨 위 "베타 의견 보내기" 줄을 누릅니다.',
    meRow: "베타 의견 보내기",
  },

  states: {
    empty: {
      title: "쓰는 기기를 알아보지 못했습니다",
      body: "아래에서 기기를 고르면 맞는 방법을 보여 드립니다.",
    },
    error: {
      title: authCopy.inapp.openFailed,
      body: authCopy.inapp.openFailedBody,
      copyLink: authCopy.inapp.copyLink,
      copied: authCopy.inapp.copied,
      copyFailed: authCopy.inapp.copyFailed,
      linkLabel: authCopy.inapp.linkLabel,
    },
    offline: {
      title: "인터넷에 연결되어 있지 않습니다",
      body: "설치 방법은 지금 볼 수 있습니다. 로그인은 연결되면 할 수 있습니다.",
    },
  },

  desktopAside: {
    title: "휴대폰에서도 열어 두세요",
    body: "점심 직전에 휴대폰에서 바로 여는 것이 가장 빠릅니다. 카카오톡으로 받은 링크를 휴대폰에서 열면 됩니다.",
  },
} as const;

/* ---------- 베타 의견 보내기 (T9.4) ---------- */

export const betaFeedbackCopy = {
  entry: {
    row: "베타 의견 보내기",
    badge: "베타",
    rowHint: "불편한 점, 좋은 점 모두 반갑습니다",
  },

  sheet: {
    title: "베타 의견 보내기",
    description: "보낸 의견은 운영자만 읽습니다.",
    close: commonCopy.actions.close,
    loading: "의견 쓰는 칸을 준비하는 중입니다",
    loadFailed: "의견 쓰는 칸을 열지 못했습니다",
    loadFailedBody: "연결을 확인하고 다시 눌러 주세요.",
    categoryQuestion: "어떤 의견인가요?",
    categoryOptional: "고르지 않아도 됩니다",
    textLabel: "내용",
    textPlaceholder: "어떤 화면에서 무엇이 있었는지 적어 주세요.",
    count: (n: number, max: number) => `${n}/${max}`,
    countLabel: (n: number, max: number) => `${max}자 중 ${n}자`,
    needText: "내용을 한 글자 이상 적어 주세요.",
    tooLong: (max: number) => `${max}자까지 보낼 수 있습니다.`,
    attach: "지금 보던 화면 함께 보내기",
    /** 늘 함께 가는 정보와(앱 버전, 기기) 체크하면 더해지는 화면 경로를 그대로 보인다 */
    sentInfo: (parts: readonly string[]) =>
      `함께 보내는 정보: ${parts.join(", ")}`,
    screen: (route: string) => `화면 ${route}`,
    app: (version: string) => `앱 ${version}`,
    devices: {
      ios: "아이폰",
      android: "안드로이드",
      desktop: "컴퓨터",
    },
    inApp: "앱 안 브라우저",
    standalone: "홈 화면 앱",
    privacy: "위치, 초대 코드, 식당 정보는 보내지 않습니다.",
    retention: "보낸 의견은 베타가 끝나고 6개월 뒤 지웁니다. 탈퇴하면 바로 지웁니다.",
    send: "보내기",
    sending: "보내는 중입니다",
  },

  /** 의견 종류 (beta_feedback.category) */
  categories: {
    bug: "버그",
    inconvenient: "불편해요",
    good: "좋아요",
    idea: "제안",
  },
  /** 종류별 예시 문구 (D-23: B안에서 가져옴) */
  placeholders: {
    bug: "어떤 화면에서 무엇을 눌렀을 때 생겼는지 적어 주세요.",
    inconvenient: "어느 화면의 어떤 점이 번거로웠는지 적어 주세요.",
    good: "자주 쓰게 되는 기능이나 마음에 든 점을 적어 주세요.",
    idea: "있으면 좋을 기능과 쓰고 싶은 상황을 적어 주세요.",
  },

  sent: {
    title: "고마워요, 잘 받았어요",
    body: "보내 주신 의견은 운영자가 하나씩 읽습니다. 고친 내용은 다음 업데이트에 담습니다.",
    again: "하나 더 보내기",
    close: commonCopy.actions.close,
  },

  states: {
    sendFailed:
      "의견을 보내지 못했습니다. 쓴 내용은 그대로 있으니 다시 보내 주세요.",
    retry: "다시 보내기",
    limit: `오늘은 의견을 ${BETA_FEEDBACK_DAILY}번 보냈습니다. 내일 다시 보낼 수 있습니다.`,
    suspended: "이용이 제한된 계정이라 의견을 보낼 수 없습니다. 나 탭의 문의하기로 알려 주세요.",
    signedOut: "로그인이 끝나 의견을 보내지 못했습니다. 다시 로그인한 뒤 보내 주세요.",
    invalid: "보낼 수 없는 내용이 있습니다. 내용을 확인하고 다시 보내 주세요.",
    offline:
      "인터넷에 연결되어 있지 않습니다. 쓴 내용은 이 화면에 남아 있고, 연결되면 보낼 수 있습니다.",
  },
} as const;
