// 베타 환영 페이지 시안 문구 (T9.3, /design-lab/beta/<a|b|c>, D-22). 실제 화면은 /beta.
// 문체: 상태, 설명, 방법 안내, 오류는 습니다체. 초대, 제안, 질문은 해요체. 버튼, 칩, 라벨은 명사형(비율 제외).
// T9.3 구현 뒤(D-23) 실제 문구는 src/copy/beta.ts. 이 파일은 남긴 확인 화면 A만 읽는다(B, C 문구는 지웠다).
import { authCopy } from "./auth";
import { siteCopy } from "./common";

const where = authCopy.inapp.where;
const menuItems = authCopy.inapp.menuItems;

export const betaLabCopy = {
  names: {
    a: "베타 환영 시안 A 기기별 단계 목록 (선택안)",
  },
  index: {
    title: "베타 환영 페이지 시안 (T9.3)",
    body: "카카오톡 초대 링크로 처음 여는 /beta 화면입니다. 기기는 ?device= 로 바꿔 볼 수 있습니다.",
  },

  eyebrow: "베타 초대",
  /** 서비스 한 줄 (siteCopy.tagline과 같은 말) */
  tagline: siteCopy.tagline,
  lead: "회사 근처에서 갈 만한 식당 세 곳을 이유와 함께 골라 드립니다. 정식 출시 전에 먼저 써 보고 의견을 들려주세요.",
  loading: "쓰는 기기를 확인하는 중입니다",

  /** 기기 이름 (칩, 라벨) */
  devices: {
    ios: "아이폰",
    android: "안드로이드",
    desktop: "컴퓨터",
  },
  devicePickLabel: "기기 고르기",
  otherDevices: "다른 기기 보기",
  hideOtherDevices: "다른 기기 접기",
  detected: (name: string) => `${name}에서 보고 있습니다`,
  detectedInApp: (os: string) => `카카오톡 안에서 보고 있습니다 (${os})`,

  /** 단계 이름과 설명 */
  steps: {
    label: "시작하는 방법",
    external: {
      title: "외부 브라우저로 열기",
      body: (os: "ios" | "android") =>
        `카카오톡 안에서는 홈 화면에 둘 수 없습니다. ${os === "ios" ? where["bottom-right"] : where["top-right"]} 메뉴에서 "${menuItems.otherBrowser}"를 골라 주세요.`,
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
      app: "홈 화면 앱으로 열었습니다. 이 단계는 끝났습니다.",
    },
    login: {
      title: "로그인하고 시작",
      body: "카카오, 네이버, 구글 중 편한 것으로 로그인합니다. 처음 한 번 회사 위치를 고르면 바로 추천이 나옵니다.",
    },
    done: "마친 단계",
    current: "지금 단계",
    stepNo: (n: number, total: number) => `${total}단계 중 ${n}단계`,
  },

  /** 피드백 방법 */
  feedback: {
    title: "의견 보내기",
    body: '나 탭 맨 위 "베타 의견 보내기"에서 언제든 보낼 수 있습니다. 불편한 점일수록 큰 도움이 됩니다.',
    short: '써 보다가 불편하면 나 탭의 "베타 의견 보내기"로 알려 주세요.',
  },

  /** 주 버튼 */
  cta: {
    login: "로그인하고 시작",
    stayInApp: "카카오톡에서 바로 시작",
  },

  /** 4상태 */
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
      linkLabel: authCopy.inapp.linkLabel,
    },
    offline: {
      title: "인터넷에 연결되어 있지 않습니다",
      body: "설치 방법은 지금 볼 수 있습니다. 로그인은 연결되면 할 수 있습니다.",
    },
  },

  /** 그림 이름 */
  cards: {
    diagramShare: '공유 버튼 위치 그림. 공유 메뉴에서 "홈 화면에 추가"를 고릅니다.',
    shareItem: "홈 화면에 추가",
    diagramMe: '나 탭 그림. 맨 위 "베타 의견 보내기" 줄을 누릅니다.',
    meRow: "베타 의견 보내기",
  },

  /** 데스크톱 오른쪽 칸 (A) */
  desktopAside: {
    title: "휴대폰에서도 열어 두세요",
    body: "점심 직전에 휴대폰에서 바로 여는 것이 가장 빠릅니다. 카카오톡으로 받은 링크를 휴대폰에서 열면 됩니다.",
  },
} as const;
