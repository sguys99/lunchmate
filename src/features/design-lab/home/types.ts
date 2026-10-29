// 홈 시안(T3.1) 계약. 시안 화면 컴포넌트는 상태 하나만 받는다(?state= 쿼리 또는 비교 스위처).
import type { DesignState } from "@/features/design-lab/mock";

// d1~d3은 G3에서 D를 고른 뒤 "어제 피드백을 첫 화면에" 요청으로 만든 수정 시안(2026-10-30). 비교용으로 d를 남긴다.
export const HOME_VARIANT_IDS = ["a", "b", "c", "d", "d1", "d2", "d3"] as const;
export type HomeVariantId = (typeof HOME_VARIANT_IDS)[number];

export function isHomeVariantId(value: unknown): value is HomeVariantId {
  return (HOME_VARIANT_IDS as readonly unknown[]).includes(value);
}

export type HomeVariantProps = {
  state: DesignState;
};
