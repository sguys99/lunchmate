// 식후 피드백과 후기 라벨 (T6.8~T6.10, FB-01~07, D-11, copy-guide 4.9). DB slug와 화면 라벨을 잇는다.
// 화면 문장(띠, 시트)은 각 화면 작업(T6.8, T6.9)에서 이 파일에 더한다. 라벨은 명사형이라 문체 비율에서 빠진다.
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
  /** 비공개 후기 집계 포함 고지 (PRD 11.2, D-11 안건 8, T6.28) */
  aggregateNote:
    "나만 보기를 골라도 가격, 만족 여부, 태그는 이름 없이 식당 집계에 들어갑니다.",
} as const;
