// 식후 피드백과 후기 시안 문구 (T6.1, /design-lab/feedback/b, D-11에서 B를 골라 A, C 문구는 지움). FB-01~07, MOD-01 진입점, PRD 11.2.
// 묻기, 권유, 고마움은 해요체, 상태 안내, 고지, 오류, 결과는 습니다체 (tasks.md 2.2절, copy-guide 4.9, 4.10).
// 띠 질문과 한 탭 라벨은 홈 D1과 같은 말(design-lab-home.ts screen.feedback)을 그대로 쓴다.
// 시안을 고른 뒤(T6.4) 실제 화면(T6.8~T6.10)으로 옮길 때 src/copy/feedback.ts로 정리한다.

export const feedbackLabCopy = {
  names: {
    b: "시안 B 한 장 시트",
  },
  index: {
    title: "식후 피드백 시안 (T6.1)",
    body: "고른 B안(한 장 시트)만 남겼습니다. 한 탭 뒤 선택 입력과 상세의 쓰기, 수정을 쿼리로 흐름과 상태를 바꿔 볼 수 있습니다.",
  },

  /** 이름을 못 찾은 날 (T5.12a, copy-guide 4.9) */
  unnamed: {
    question: "어제 가신 곳은 어땠어요?",
    kakaoMap: "카카오맵에서 보기",
    kakaoMapLabel: "어제 간 곳을 카카오맵에서 보기",
  },

  /** 선택 입력 (FB-02, FB-03) */
  composer: {
    title: "조금 더 남겨볼까요?",
    titleFor: (placeName: string) => `${placeName} 후기`,
    titleUnnamed: "어제 간 곳 후기",
    hint: "모두 선택입니다. 남긴 만큼 다음 추천이 정확해집니다.",
    rating: "어땠어요?",
    price: "실제 1인 가격",
    priceHint: (estimate: string) => `이 식당 추정 가격은 ${estimate}입니다.`,
    priceUnit: "원",
    priceDecrease: "500원 내리기",
    priceIncrease: "500원 올리기",
    priceUnset: "아직 고르지 않았습니다",
    tags: "어떤 곳이었나요?",
    tagsHint: "여러 개 고를 수 있습니다.",
    /** 태그 8종 (FB-02, copy-guide 4.9) */
    tagList: [
      "혼밥 OK",
      "15분 컷",
      "웨이팅 적음",
      "룸 있음",
      "단체석",
      "가성비",
      "양 많음",
      "조용함",
    ],
    review: "한 줄 후기",
    reviewPlaceholder: "다음 사람에게 한 줄로 알려 주세요",
    reviewCount: (count: number, max: number) => `${count}/${max}`,
    visibility: "공개 범위",
    public: "공개",
    private: "나만 보기",
    publicNote: "닉네임과 방문 월만 함께 보입니다.",
    /** 비공개 후기 집계 포함 고지 (PRD 11.2, AC-FB-2, T6.28). 작성 화면에 늘 한 줄 */
    aggregateNote: "나만 보기를 골라도 가격, 만족 여부, 태그는 이름 없이 식당 집계에 들어갑니다.",
    submit: "남기기",
    save: "고친 내용 저장",
    cancel: "닫기",
    close: "후기 쓰기 닫기",
    saved: "남겼습니다. 다음 추천에 반영합니다.",
  },


  /** 띠가 묻는 동안 무시했을 때 (D-05 열린 안건) */
  later: {
    /** C: 나중에 버튼 */
    action: "나중에",
    /** B: 길찾기 뒤 접힌 한 줄 */
    folded: (placeName: string) => `어제 간 ${placeName}`,
    foldedUnnamed: "어제 간 곳",
    foldedAction: "남기기",
    foldedActionLabel: "어제 식사 피드백 남기기",
  },

  /** 오류와 오프라인 (PRD 12장) */
  states: {
    loadingLabel: "어제 식사 정보를 불러오는 중입니다",
    saveError: {
      title: "보내지 못했습니다",
      body: "고른 답은 이 화면에 남아 있습니다.",
      retry: "다시 보내기",
    },
    offline: {
      composer: "인터넷에 연결되면 남길 수 있습니다.",
      write: "연결되면 후기를 쓸 수 있습니다.",
    },
  },

  /** 상세에서 쓰기와 내 후기 (FB-06, FB-07) */
  detail: {
    write: "후기 쓰기",
    mine: "내 후기",
    mineMeta: (month: number) => `${month}월 방문, 공개`,
    mineMetaPrivate: (month: number) => `${month}월 방문, 나만 보기`,
    edit: "수정",
    editLabel: "내 후기 수정",
    removeLabel: "내 후기 삭제",
    confirm: {
      title: "후기를 지울까요?",
      body: "가격, 만족 여부, 태그도 식당 집계에서 빠집니다. 방문 기록은 남습니다.",
      confirm: "지우기",
      cancel: "그대로 두기",
    },
    removed: "후기를 지웠습니다.",
    /** C: 내 후기 항목 줄 이름 */
    rows: {
      rating: "만족",
      price: "1인 가격",
      tags: "태그",
      review: "한 줄 후기",
    },
    publicReviews: "다른 사람 후기",
    publicEmpty: "아직 다른 사람 후기가 없습니다.",
    publicOffline: "연결되면 후기를 불러옵니다.",
  },

  /** 후기 신고 진입점 (MOD-01, D-10 안건 11). 신고 시트 자체는 T6.3 */
  report: {
    menu: "후기 더 보기",
    action: "신고",
    actionLabel: (nickname: string) => `${nickname} 후기 신고`,
    pending: "신고 화면은 제보 시안(T6.3)에서 정합니다.",
  },
} as const;
