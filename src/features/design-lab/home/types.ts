// 홈 시안(T3.1) 계약. 시안 화면 컴포넌트는 상태 하나만 받는다(?state= 쿼리 또는 비교 스위처).
import type { DesignState } from "@/features/design-lab/mock";

export const HOME_VARIANT_IDS = ["a", "b", "c", "d"] as const;
export type HomeVariantId = (typeof HOME_VARIANT_IDS)[number];

export function isHomeVariantId(value: unknown): value is HomeVariantId {
  return (HOME_VARIANT_IDS as readonly unknown[]).includes(value);
}

export type HomeVariantProps = {
  state: DesignState;
};
