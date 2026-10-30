// 약관 동의 모델 (T4.11, PRD AUTH-02, AUTH-06, D-08 안건 6, 12). 화면, 서버 액션, 테스트가 함께 쓰는 순수 함수.
// 항목은 필수 3개뿐이다(만 14세 이상, 이용약관, 개인정보 수집 이용). 마케팅 동의는 받지 않는다.
// zod 스키마는 브라우저 번들에 싣지 않으려고 terms-submit.ts(서버 액션 쪽)에 둔다.
import { loginContext } from "./login-params";

export const TERM_IDS = ["age", "service", "privacy"] as const;
export type TermId = (typeof TERM_IDS)[number];

export type TermItem = {
  id: TermId;
  /** 전문 페이지 경로. 만 14세 확인은 문서가 없다 */
  href: "/terms" | "/privacy" | null;
};

export const TERM_ITEMS: readonly TermItem[] = [
  { id: "age", href: null },
  { id: "service", href: "/terms" },
  { id: "privacy", href: "/privacy" },
];

export type Consent = Readonly<Record<TermId, boolean>>;

export const EMPTY_CONSENT: Consent = {
  age: false,
  service: false,
  privacy: false,
};
export const FULL_CONSENT: Consent = {
  age: true,
  service: true,
  privacy: true,
};

export type AllState = "none" | "some" | "all";

/** 모두 동의 체크 상태: 전부 all, 하나도 없음 none, 나머지 some(indeterminate) */
export function allState(consent: Consent): AllState {
  const values = TERM_IDS.map((id) => consent[id]);
  if (values.every(Boolean)) return "all";
  if (values.some(Boolean)) return "some";
  return "none";
}

/** 모두 동의: 전부 켜져 있으면 전부 끄고, 아니면 전부 켠다 */
export function toggleAll(consent: Consent): Consent {
  return allState(consent) === "all" ? EMPTY_CONSENT : FULL_CONSENT;
}

export function setItem(
  consent: Consent,
  id: TermId,
  checked: boolean,
): Consent {
  return { ...consent, [id]: checked };
}

/** 아직 동의하지 않은 필수 항목 (표시 순서대로) */
export function missingRequired(consent: Consent): TermId[] {
  return TERM_IDS.filter((id) => !consent[id]);
}

export function canSubmit(consent: Consent): boolean {
  return missingRequired(consent).length === 0;
}

/**
 * 동의 버튼이 이어 말할 행동 (D-08 C 버튼 문구). next가 가리키는 곳으로 정한다.
 * - /poll/new: 투표 만들기, /poll/<code>: 투표 참여하기, 그 밖: 시작하기
 * 문구는 src/copy/auth.ts terms.submit[action].
 */
export type TermsAction = "start" | "pollCreate" | "pollJoin";

export function termsAction(next: string): TermsAction {
  const pathname = next.split("?")[0]!;
  if (pathname === "/poll/new" || pathname.startsWith("/poll/new/"))
    return "pollCreate";
  if (loginContext(next) === "poll") return "pollJoin";
  return "start";
}

/**
 * 동의를 마친 뒤 갈 곳. 온보딩 연결 고리(T4.16): 사무실이 없으면 온보딩으로 보낸다.
 * 온보딩 화면이 생기기 전(ONBOARDING_PATH null)에는 next 그대로.
 * 온보딩 경로를 정하면 여기 한 줄만 바꾸면 된다(서버 액션은 hasOffice를 이미 넘긴다).
 */
export const ONBOARDING_PATH: string | null = null;

export function afterTermsLocation(input: {
  next: string;
  hasOffice: boolean;
  onboardingPath?: string | null;
}): string {
  const onboarding =
    input.onboardingPath === undefined ? ONBOARDING_PATH : input.onboardingPath;
  if (!input.hasOffice && onboarding) {
    return `${onboarding}?${new URLSearchParams({ next: input.next }).toString()}`;
  }
  return input.next;
}
