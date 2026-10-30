// 온보딩 값의 기본값, 범위, 칩 목록 (ONB-02, ONB-03, D-07 안건 2, 4). 화면, 서버 검증, 테스트가 함께 쓴다.
// 범위는 DB 제약(T4.4 마이그레이션 preferences_*, avoid_rules_*)과 같아야 한다.
import { onboardingCopy } from "@/copy/onboarding";

export const PREF_DEFAULTS = {
  lunch: 10_000,
  dinner: 20_000,
  walk: 10,
} as const;

export const PREF_RANGES = {
  lunch: { min: 5_000, max: 30_000, step: 1_000 },
  dinner: { min: 10_000, max: 60_000, step: 1_000 },
  walk: { min: 5, max: 20, step: 5 },
} as const;

export const WALK_OPTIONS = [5, 10, 15, 20] as const;

export type Prefs = { lunch: number; dinner: number; walk: number };

export const FOOD_CHIPS = onboardingCopy.avoid.foodChips;
export const ALLERGY_CHIPS = onboardingCopy.avoid.allergyChips;
export type FoodChip = (typeof FOOD_CHIPS)[number];
export type AllergyChip = (typeof ALLERGY_CHIPS)[number];

/** 직접 입력: 한 항목 1~20자(DB avoid_rules_value_len), 최대 10개 */
export const CUSTOM_AVOID_MAX_LENGTH = 20;
export const CUSTOM_AVOID_MAX_ITEMS = 10;

export type AvoidChoice = {
  foods: string[];
  allergies: string[];
  custom: string[];
};

export const EMPTY_AVOID: AvoidChoice = {
  foods: [],
  allergies: [],
  custom: [],
};

/** 첫 사무실 이름(나 탭에서 바꿀 수 있음, SET-01) */
export const DEFAULT_OFFICE_NAME = "회사";

function inRange(v: number, r: { min: number; max: number; step: number }) {
  return (
    Number.isInteger(v) &&
    v >= r.min &&
    v <= r.max &&
    (v - r.min) % r.step === 0
  );
}

export function isValidPrefs(p: Prefs): boolean {
  return (
    inRange(p.lunch, PREF_RANGES.lunch) &&
    inRange(p.dinner, PREF_RANGES.dinner) &&
    (WALK_OPTIONS as readonly number[]).includes(p.walk)
  );
}
