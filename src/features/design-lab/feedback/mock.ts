// 식후 피드백 시안 목업 (T6.1). 저장은 하지 않고 화면 상태만 바꾼다.
// 어제 간 곳의 이름과 카테고리는 카카오 세션 값이라 저장하지 않는다(CLAUDE.md 7장). 우리 DB에는 place_id, place_url과 내 답만 남는다.
import { getMockPlace, type MockPlace } from "@/features/design-lab/mock";
import {
  DETAIL_EMPTY,
  DETAIL_FULL,
  DETAIL_OFFLINE,
  type DetailReview,
  type PlaceDetail,
} from "@/features/design-lab/place/detail-mock";
import type { FeedbackParams } from "./params";

/** 어제 점심에 간 곳 (홈 띠) */
export const YESTERDAY: MockPlace = getMockPlace("mock-hansik");

/** 한 줄 후기 최대 글자 수 (FB-02) */
export const REVIEW_MAX = 100;

/** 가격 단계 (C안 직접 입력, B안 스테퍼) */
export const PRICE_STEP = 500;

/**
 * 추정 가격 둘레의 가격 칩 값. 천 원 단위로 맞춘 추정가를 가운데 두고 1천 원씩 벌린다.
 * 3개: 추정 -1천, 추정, +1천 / 4개: 여기에 +2천(밥값은 추정보다 비싸게 나오는 일이 잦다).
 * 1천 원 아래 값은 빼지 않고 1천 원으로 올린다(중복은 걸러 낸다).
 */
export function pricePresets(estimateKRW: number, count: 3 | 4): number[] {
  const base = Math.max(1000, Math.round(estimateKRW / 1000) * 1000);
  const offsets = count === 3 ? [-1000, 0, 1000] : [-1000, 0, 1000, 2000];
  const values = offsets.map((o) => Math.max(1000, base + o));
  return [...new Set(values)];
}

/** 내가 이미 남긴 후기 (FB-07, view=detail&mine=on) */
export type MyReview = {
  thumb: "up" | "down";
  priceKRW: number | null;
  tags: readonly string[];
  text: string;
  isPublic: boolean;
  visitMonth: number;
};

export const MY_REVIEW: MyReview = {
  thumb: "up",
  priceKRW: 9000,
  tags: ["혼밥 OK", "15분 컷"],
  text: "12시 전에 가면 바로 앉습니다. 깍두기가 맛있어요.",
  isPublic: true,
  visitMonth: 10,
};

/** 상세 화면 데이터: 상태에 따라 후기 목록이 바뀐다 */
export function detailFor(p: FeedbackParams): PlaceDetail {
  if (p.state === "empty") return DETAIL_EMPTY;
  if (p.state === "offline") return DETAIL_OFFLINE;
  return DETAIL_FULL;
}

/** 공개 후기 목록 (오프라인이면 null) */
export function publicReviews(d: PlaceDetail): readonly DetailReview[] | null {
  return d.reviews;
}
