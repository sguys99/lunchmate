// 랜딩 데모 카드 한 장의 값 (T4.28). 예시 데이터라 카카오 값이 아니다(CLAUDE.md 7장).
// design-lab 목업(MockPlace)도 이 모양을 그대로 만족해서 시안 화면이 같은 DemoCard를 쓴다.
import type { CategorySlug } from "@/features/place/categories";

export type DemoPlace = {
  id: string;
  name: string;
  category: CategorySlug;
  /** 도보 분 (정수) */
  walkMinutes: number;
  /** 1인 가격 대표값 */
  priceKRW: number;
  /** 👍 비율 0~100. 후기 3건 미만이면 null */
  thumbsUpRate: number | null;
  /** 추천 이유 1줄 */
  reason: string;
};
