// 식후 피드백과 후기 문구 (T6.8~T6.10, T6.14, T6.28, FB-01~07, D-11, copy-guide 4.9). DB slug와 화면 라벨을 잇는다.
// 묻기, 권유, 고마움은 해요체, 상태 안내, 고지, 오류, 결과는 습니다체 (tasks.md 2.2절, copy-guide 4.9, 4.10).
// 띠 질문과 한 탭 라벨은 홈 D1 시안과 같은 말이다. 쓰기 오류(금칙어, 한도, 저장 실패)는 src/copy/moderation.ts.
import type { ReviewTag } from "@/features/feedback/labels";

/** 태그 8종 라벨 (FB-02). 순서는 시트 2열 격자 순서 */
export const reviewTagLabels: Readonly<Record<ReviewTag, string>> = {
  solo_ok: "혼밥 OK",
  quick_15: "15분 컷",
  short_wait: "웨이팅 적음",
  private_room: "룸 있음",
  group_seats: "단체석",
  good_value: "가성비",
  big_portion: "양 많음",
  quiet: "조용함",
};

export const feedbackCopy = {
  ratings: {
    up: "좋았어요",
    down: "별로였어요",
    notVisited: "안 갔어요",
  },
  /** 공개 범위 */
  visibility: {
    public: "공개",
    private: "나만 보기",
  },
  /** 비공개 후기 집계 포함 고지 (PRD 11.2, D-11 안건 8, T6.28). 작성 시트와 가입 약관 화면이 같은 말을 쓴다 */
  aggregateNote:
    "나만 보기를 골라도 가격, 만족 여부, 태그는 이름 없이 식당 집계에 들어갑니다.",

  /** 홈 어제 피드백 띠 (FB-01, FB-04, FB-05, D-05 D1, D-11 안건 2, 12) */
  band: {
    label: "어제 식사",
    loading: "어제 식사 정보를 불러오는 중입니다.",
    question: (name: string) => `어제 간 ${name}, 어땠어요?`,
    questionUnnamed: "어제 가신 곳은 어땠어요?",
    kakaoMap: "카카오맵에서 보기",
    kakaoMapLabel: "어제 간 곳을 카카오맵에서 보기, 새 창",
    thanks: "알려 줘서 고마워요",
    thanksBody: "다음 추천에 반영합니다.",
    /** 안 갔어요: 부정 신호로 쓰지 않는다 (FB-05) */
    notVisitedBody: "추천 점수에는 쓰지 않습니다.",
    /** 한 탭 뒤 선택 입력 (FB-02) */
    more: "가격, 태그 남기기",
    moreLabel: "가격, 태그, 한 줄 후기 남기기",
    /** 길찾기 뒤 접힌 한 줄 (D-11 안건 2) */
    folded: (name: string) => `어제 간 ${name}`,
    foldedUnnamed: "어제 간 곳",
    foldedAction: "남기기",
    foldedActionLabel: "어제 식사 피드백 남기기",
    saved: "남겼습니다. 다음 추천에 반영합니다.",
    sending: "보내는 중입니다.",
  },

  /** 선택 입력 시트 (FB-02, FB-03, FB-06, FB-07, D-11) */
  sheet: {
    titleFor: (name: string) => `${name} 후기`,
    titleUnnamed: "어제 간 곳 후기",
    titleEdit: "내 후기 수정",
    loading: "후기 쓰기 화면을 불러오는 중입니다.",
    loadFailed: "후기 쓰기 화면을 불러오지 못했습니다.",
    loadFailedBody: "연결을 확인하고 다시 눌러 주세요.",
    hint: "모두 선택입니다. 남긴 만큼 다음 추천이 정확해집니다.",
    rating: "어땠어요?",
    ratingHint: "다녀왔다면 방문 기록도 함께 남습니다.",
    ratingRequired: "만족 여부를 먼저 골라 주세요.",
    price: "실제 1인 가격",
    priceEstimateHint: (won: string) => `이 식당 추정 가격은 ${won}입니다.`,
    priceReportHint: (won: string) => `제보된 1인 가격은 보통 ${won}입니다.`,
    priceUnit: "원",
    priceDecrease: "500원 내리기",
    priceIncrease: "500원 올리기",
    priceUnset: "아직 고르지 않았습니다.",
    priceClear: "가격 지우기",
    tags: "어떤 곳이었나요?",
    tagsHint: "여러 개 고를 수 있습니다.",
    review: "한 줄 후기",
    reviewPlaceholder: "다음 사람에게 한 줄로 알려 주세요",
    reviewCount: (count: number, max: number) => `${count}/${max}`,
    reviewCountLabel: (count: number, max: number) =>
      `${max}자 중 ${count}자를 썼습니다.`,
    visibility: "공개 범위",
    publicNote: "닉네임과 방문 월만 함께 보입니다.",
    submit: "남기기",
    save: "고친 내용 저장",
    sending: "보내는 중",
    close: "후기 쓰기 닫기",
    offline: "인터넷에 연결되면 남길 수 있습니다.",
    savedEdit: "고친 내용을 저장했습니다.",
    remove: "내 후기 삭제",
    confirm: {
      title: "후기를 지울까요?",
      body: "가격, 만족 여부, 태그도 식당 집계에서 빠집니다. 방문 기록은 남습니다.",
      confirm: "지우기",
      cancel: "그대로 두기",
    },
    /** 상세에서 쓰는데 오늘 이 끼니 후기가 이미 있음 (writeFromDetail duplicate) */
    duplicateWrite: "오늘 이 끼니에 남긴 후기가 이미 있습니다. 내 후기에서 고칠 수 있습니다.",
  },

  /** 상세의 내 후기와 다른 사람 후기 (T6.10, T6.14, PLACE-03, PLACE-06, D-11 안건 6, 7) */
  detail: {
    mine: "내 후기",
    mineMeta: (month: number, isPublic: boolean) =>
      `${month}월 방문, ${isPublic ? "공개" : "나만 보기"}`,
    mineHidden: "신고가 쌓여 다른 사람에게는 보이지 않습니다.",
    rows: {
      rating: "만족",
      price: "1인 가격",
      tags: "태그",
      body: "한 줄 후기",
    },
    rowEmpty: "비어 있음",
    edit: "고치기",
    removed: "후기를 지웠습니다.",
    saved: "후기를 남겼습니다. 다음 추천에 반영합니다.",
    write: "후기 쓰기",
    writeOffline: "연결되면 후기를 쓸 수 있습니다.",
    listTitle: "다른 사람 후기",
    listEmpty: "아직 다른 사람 후기가 없습니다.",
    listOffline: "연결되면 후기를 불러옵니다.",
    listError: "후기를 불러오지 못했습니다.",
    listLoading: "후기를 불러오는 중입니다.",
    retry: "다시 시도",
    more: "후기 더 보기",
    loginToRead: (count: number) =>
      count > 0
        ? `후기 ${count}건은 로그인하면 볼 수 있습니다.`
        : "후기는 로그인하면 볼 수 있습니다.",
    login: "로그인하고 보기",
    visitMonth: (month: number) => `${month}월 방문`,
    menuLabel: (nickname: string) => `${nickname} 후기 더 보기`,
    report: "신고",
    /** 후기 신고 시트(D-13, T6.16) 전까지 쓰는 안내 */
    reportSoon: "후기 신고는 곧 열립니다.",
  },
} as const;
