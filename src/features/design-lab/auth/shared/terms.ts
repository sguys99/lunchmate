// 약관 동의 모델 (T4.2, AUTH-02, AUTH-06). 화면과 무관한 순수 함수라 세 시안이 함께 쓴다.
// 항목 구성(필수 3 + 선택 1)은 시안 기본안이다. 확정은 선택 게이트 T4.3과 약관 문서 작성 때 한다.
import type { AuthTermId } from "@/copy/design-lab-auth";

export type TermItem = {
  id: AuthTermId;
  required: boolean;
  /** 전문 보기 링크가 있는 항목 (만 14세 확인은 문서가 없다) */
  hasDocument: boolean;
};

export const TERM_ITEMS: readonly TermItem[] = [
  { id: "age", required: true, hasDocument: false },
  { id: "service", required: true, hasDocument: true },
  { id: "privacy", required: true, hasDocument: true },
  { id: "marketing", required: false, hasDocument: true },
];

export type Consent = Readonly<Record<AuthTermId, boolean>>;

export const EMPTY_CONSENT: Consent = {
  age: false,
  service: false,
  privacy: false,
  marketing: false,
};

export const FULL_CONSENT: Consent = {
  age: true,
  service: true,
  privacy: true,
  marketing: true,
};

export type AllState = "none" | "some" | "all";

/** 모두 동의 체크 상태: 전부 켜짐 all, 하나도 없음 none, 나머지 some(indeterminate) */
export function allState(consent: Consent): AllState {
  const values = TERM_ITEMS.map((t) => consent[t.id]);
  if (values.every(Boolean)) return "all";
  if (values.some(Boolean)) return "some";
  return "none";
}

/** 모두 동의를 누르면: 전부 켜져 있으면 전부 끄고, 아니면 전부 켠다(선택 항목 포함) */
export function toggleAll(consent: Consent): Consent {
  return allState(consent) === "all" ? EMPTY_CONSENT : FULL_CONSENT;
}

export function setItem(
  consent: Consent,
  id: AuthTermId,
  checked: boolean,
): Consent {
  return { ...consent, [id]: checked };
}

/** 아직 동의하지 않은 필수 항목 (표시 순서대로) */
export function missingRequired(consent: Consent): AuthTermId[] {
  return TERM_ITEMS.filter((t) => t.required && !consent[t.id]).map(
    (t) => t.id,
  );
}

export function canSubmit(consent: Consent): boolean {
  return missingRequired(consent).length === 0;
}
