// 약관 동의 제출 검증과 처리 흐름 (T4.11, PRD AUTH-02, AUTH-06). 서버 액션(app/welcome/terms/actions.ts)이 쓴다.
// Supabase는 주입받아 테스트한다. 브라우저에서 import하지 않는다(zod를 홈 번들 밖에 둔다).
//
// 규칙
// - 필수 3개(age, service, privacy)가 모두 "on"이어야 한다. 하나라도 빠지면 저장하지 않는다(서버 재검증, CLAUDE.md 7장).
// - 동의 시각은 클라이언트가 보내지 않는다. 사용자 세션으로 terms_agreed_at, birth_confirmed_at에 값을 넣으면
//   DB 트리거가 서버 시각 now()로 바꾸고, 이미 있으면 그대로 둔다(되돌리기 불가, T4.4 마이그레이션).
// - next는 다시 sanitizeNext로 검사한다.
import * as z from "zod";
import { sanitizeNext } from "./redirect";
import { afterTermsLocation } from "./terms";

const on = z.literal("on");

export const termsFormSchema = z.object({
  age: on,
  service: on,
  privacy: on,
  next: z.string().max(2048).optional(),
});

export type TermsFormInput = Record<string, unknown>;

export type TermsSubmitResult =
  | { ok: true; location: string }
  | {
      ok: false;
      error: "invalid" | "unauthenticated" | "save";
      /** 다시 보여 줄 next */
      next: string;
    };

export type TermsSubmitDeps = {
  /** 세션 사용자 id(서버에서 검증), 없으면 null */
  currentUserId: () => Promise<string | null>;
  /** 동의 시각 기록. 1행이 바뀌었으면 true */
  recordConsent: (userId: string) => Promise<boolean>;
  /** 사무실이 1곳 이상 있는가(온보딩 연결 고리, T4.16) */
  hasOffice: (userId: string) => Promise<boolean>;
};

export function parseTermsForm(input: TermsFormInput) {
  return termsFormSchema.safeParse(input);
}

export async function submitTerms(
  input: TermsFormInput,
  deps: TermsSubmitDeps,
): Promise<TermsSubmitResult> {
  const rawNext = typeof input.next === "string" ? input.next : null;
  const next = sanitizeNext(rawNext);
  const parsed = parseTermsForm(input);
  if (!parsed.success) return { ok: false, error: "invalid", next };

  const userId = await deps.currentUserId().catch(() => null);
  if (!userId) return { ok: false, error: "unauthenticated", next };

  const saved = await deps.recordConsent(userId).catch(() => false);
  if (!saved) return { ok: false, error: "save", next };

  const hasOffice = await deps.hasOffice(userId).catch(() => true);
  return { ok: true, location: afterTermsLocation({ next, hasOffice }) };
}
