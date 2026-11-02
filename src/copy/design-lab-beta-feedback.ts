// 베타 의견 보내기 시안 문구 (T9.4, /design-lab/beta-feedback/<a|b|c>, D-22). 실제 화면은 나 탭 + 시트(또는 /me/beta-feedback).
// 문체: 상태, 정책, 오류, 결과는 습니다체. 질문, 감사, 제안은 해요체. 버튼, 칩, 라벨은 명사형(비율 제외).
// 시안을 고른 뒤(T9.4) 실제 구현 때 src/copy/beta-feedback.ts로 옮긴다. 이 파일은 디자인 랩만 읽는다(홈 첫 로드 밖, T8.11).
import { commonCopy } from "./common";
import { historyCopy } from "./history";

export const BETA_FEEDBACK_MAX = 500;

export const betaFeedbackLabCopy = {
  names: {
    a: "베타 의견 시안 A 한 장 시트",
    b: "베타 의견 시안 B 두 단계 시트",
    c: "베타 의견 시안 C 전용 화면과 보낸 의견",
  },
  index: {
    title: "베타 의견 보내기 시안 (T9.4)",
    body: "나 탭 진입 자리와 의견 시트입니다. ?view=entry 로 진입 자리만 볼 수 있습니다.",
  },

  /** 나 탭 목업 */
  me: {
    greeting: historyCopy.greeting("test_민지"),
    title: historyCopy.title,
    settings: historyCopy.header.settings,
    tabs: [historyCopy.tabs.history, historyCopy.tabs.places, historyCopy.tabs.reviews],
    tabsLabel: historyCopy.tabs.label,
    rows: [
      { name: "정담국밥", meta: "어제 점심" },
      { name: "소담 비빔밥", meta: "10월 30일 점심" },
      { name: "모퉁이 우동", meta: "10월 29일 점심" },
    ],
  },

  /** 나 탭 진입 자리 */
  entry: {
    row: "베타 의견 보내기",
    badge: "베타",
    rowHint: "불편한 점, 좋은 점 모두 반갑습니다",
    headerButton: "의견",
    headerButtonLabel: "베타 의견 보내기",
    banner: "베타 기간입니다. 써 보며 느낀 점을 들려주세요.",
    bannerLink: "의견 보내기",
  },

  /** 시트와 화면 */
  sheet: {
    title: "베타 의견 보내기",
    pageTitle: "베타 의견",
    description: "보낸 의견은 운영자만 읽습니다.",
    close: commonCopy.actions.close,
    back: commonCopy.actions.back,
    loading: "의견 쓰는 칸을 준비하는 중입니다",
    categoryQuestion: "어떤 의견인가요?",
    categoryLabel: "의견 종류",
    categoryOptional: "고르지 않아도 됩니다",
    textLabel: "내용",
    textPlaceholder: "어떤 화면에서 무엇이 있었는지 적어 주세요.",
    count: (n: number, max: number) => `${n}/${max}`,
    countLabel: (n: number, max: number) => `${max}자 중 ${n}자`,
    needText: "내용을 한 글자 이상 적어 주세요.",
    tooLong: (max: number) => `${max}자까지 보낼 수 있습니다.`,
    attach: "지금 보던 화면 함께 보내기",
    attachDetail: (route: string, version: string) =>
      `함께 보내는 정보: ${route}, 앱 ${version}`,
    attachPrivacy: "위치, 초대 코드, 식당 정보는 보내지 않습니다.",
    send: "보내기",
    sending: "보내는 중입니다",
    stepLabel: (n: number, total: number) => `${total}단계 중 ${n}단계`,
  },

  /** 의견 종류 (beta_feedback.category) */
  categories: {
    bug: "버그",
    inconvenient: "불편해요",
    good: "좋아요",
    idea: "제안",
  },
  /** B안: 종류 줄의 한 줄 설명과 다음 질문 */
  categoryHints: {
    bug: "안 되거나 이상하게 보여요",
    inconvenient: "쓰기 번거로운 곳이 있어요",
    good: "마음에 드는 점이 있어요",
    idea: "이런 기능이 있으면 좋겠어요",
  },
  categoryPrompts: {
    bug: "무엇이 안 됐나요?",
    inconvenient: "어디가 불편했나요?",
    good: "어떤 점이 좋았나요?",
    idea: "어떤 기능이 있으면 좋을까요?",
  },
  categoryPlaceholders: {
    bug: "어떤 화면에서 무엇을 눌렀을 때 생겼는지 적어 주세요.",
    inconvenient: "어느 화면의 어떤 점이 번거로웠는지 적어 주세요.",
    good: "자주 쓰게 되는 기능이나 마음에 든 점을 적어 주세요.",
    idea: "있으면 좋을 기능과 쓰고 싶은 상황을 적어 주세요.",
  },

  /** 보낸 뒤 */
  sent: {
    title: "고마워요, 잘 받았어요",
    body: "보내 주신 의견은 운영자가 하나씩 읽습니다. 고친 내용은 다음 업데이트에 담습니다.",
    again: "하나 더 보내기",
    close: commonCopy.actions.close,
    toast: "의견을 보냈습니다.",
  },

  /** 오류, 한도, 오프라인 */
  states: {
    sendFailed: "의견을 보내지 못했습니다. 쓴 내용은 그대로 있으니 다시 보내 주세요.",
    retry: "다시 보내기",
    limit: "오늘은 의견을 10번 보냈습니다. 내일 다시 보낼 수 있습니다.",
    offline:
      "인터넷에 연결되어 있지 않습니다. 쓴 내용은 이 화면에 남아 있고, 연결되면 보낼 수 있습니다.",
    offlineToast: "연결되면 보낼 수 있습니다.",
  },

  /** C안: 내가 보낸 의견 */
  history: {
    title: "내가 보낸 의견",
    loading: "보낸 의견을 불러오는 중입니다",
    empty: {
      title: "아직 보낸 의견이 없습니다",
      body: "써 보다가 떠오른 점을 위 칸에 적어 볼까요?",
    },
    error: {
      title: "보낸 의견을 불러오지 못했습니다",
      body: "잠시 후 다시 시도해 주세요. 새 의견은 지금도 보낼 수 있습니다.",
    },
    status: { sent: "보냄", read: "읽음" },
    statusLabel: (s: string) => `상태 ${s}`,
    retention: "보낸 의견은 베타가 끝나고 6개월 뒤 지웁니다. 탈퇴하면 바로 지웁니다.",
  },
} as const;
