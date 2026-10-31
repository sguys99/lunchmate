// 제보, 신고, 할인 라벨 (T6.15, T6.16, T6.19~T6.24, PLACE-05, PLACE-07, MOD-01, DEAL-01~04, D-13).
// DB 값(src/features/report/labels.ts)과 화면 라벨을 잇는다. 라벨은 명사형이라 문체 비율에서 빠진다.
// 질문, 결과 줄 같은 화면 문장은 각 화면 작업에서 이 파일에 더한다. 웨이팅 단계 라벨은 badges.ts waitingLevels.
import type {
  ClosedDetail,
  DealReportReason,
  DealSlot,
  DealType,
  InfoField,
  PlaceReportKind,
  ReviewReportReason,
} from "@/features/report/labels";

export const reportLabels = {
  reviewReasons: {
    spam: "광고, 스팸",
    abuse: "욕설, 비방",
    privacy: "개인정보",
    false: "허위",
    other: "기타",
  } satisfies Record<ReviewReportReason, string>,
  dealReasons: {
    ad_false: "광고성, 허위",
    abuse: "욕설, 비방",
    privacy: "개인정보",
    other: "기타",
  } satisfies Record<DealReportReason, string>,
  placeKinds: {
    closed: "문 닫았어요",
    price: "가격이 달라요",
    info: "정보가 틀려요",
  } satisfies Record<PlaceReportKind, string>,
  closedDetails: {
    gone: "아예 닫았어요",
    moved: "다른 곳으로 옮겼어요",
    today: "오늘만 쉬어요",
  } satisfies Record<ClosedDetail, string>,
  infoFields: {
    name: "이름",
    location: "위치",
    phone: "전화번호",
    category: "음식 종류",
  } satisfies Record<InfoField, string>,
  dealTypes: {
    lunch_special: "점심특선",
    discount: "할인",
    event: "오픈, 기념 이벤트",
    happy_hour: "해피아워",
    other: "기타",
  } satisfies Record<DealType, string>,
  dealSlots: {
    lunch: "점심",
    afternoon: "오후",
    dinner: "저녁",
  } satisfies Record<DealSlot, string>,
  /** 월(0)~일(6) */
  dealDays: ["월", "화", "수", "목", "금", "토", "일"],
  dealCheck: {
    still: "아직 해요",
    ended: "끝났어요",
  },
} as const;
