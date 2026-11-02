// 베타 의견 저장 검사와 흐름 (T9.4, D-23). 서버 액션(actions.ts)만 쓴다. Supabase는 주입받아 테스트한다.
//
// 규칙
// - 입력은 strictObject. 종류(선택), 내용 1~500자(코드 포인트, DB char_length와 같다), 화면 경로(선택), 기기 종류.
// - 화면 경로는 브라우저가 보낸 값을 믿지 않고 sanitizeRoute로 한 번 더 경로 틀로 바꾼다(쿼리, 동적 값 제거).
// - 앱 버전과 algo_version은 서버 값으로 채운다(브라우저가 보내지 않는다). UA 원문, 좌표는 받지 않는다.
// - 금칙어는 적용하지 않는다(운영자만 읽는 글, D-23 안건 13). 하루 10건과 정지 계정은 DB 트리거가 판정한다.
// - 저장 실패(네트워크처럼 Postgres 코드가 없는 오류)는 한 번만 다시 시도한다(CLAUDE.md 9장).
import * as z from "zod";
import { BETA_FEEDBACK_MAX } from "@/copy/beta";
import { mapPgError, type PgErrorLike } from "@/lib/supabase/db-errors";
import { BETA_DEVICES } from "./device";
import { sanitizeRoute } from "./route-path";

export const BETA_CATEGORIES = ["bug", "inconvenient", "good", "idea"] as const;
export type BetaCategory = (typeof BETA_CATEGORIES)[number];

/** 줄바꿈과 탭 말고는 제어 문자를 받지 않는다 */
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export function codePointLength(v: string): number {
  return [...v].length;
}

export const betaFeedbackSchema = z.strictObject({
  category: z.enum(BETA_CATEGORIES).nullable(),
  body: z
    .string()
    .transform((v) => v.replace(/\r\n?/g, "\n").trim())
    .pipe(
      z
        .string()
        .min(1)
        .refine((v) => codePointLength(v) <= BETA_FEEDBACK_MAX)
        .refine((v) => !CONTROL.test(v)),
    ),
  /** 지금 보던 화면(경로). 끄면 null. 저장 전에 경로 틀로 바꾼다 */
  route: z.string().max(2048).nullable(),
  device: z.enum(BETA_DEVICES),
  inApp: z.boolean(),
  standalone: z.boolean(),
});

export type BetaFeedbackRequest = z.input<typeof betaFeedbackSchema>;

export type BetaFeedbackError =
  "invalid" | "unauthenticated" | "limit" | "suspended" | "save";

export type BetaFeedbackResult =
  { ok: true } | { ok: false; error: BetaFeedbackError };

export type BetaFeedbackRow = {
  user_id: string;
  category: BetaCategory | null;
  body: string;
  route: string | null;
  app_version: string;
  algo_version: string;
  device: (typeof BETA_DEVICES)[number];
  in_app: boolean;
  standalone: boolean;
};

export type BetaFeedbackDeps = {
  currentUserId: () => Promise<string | null>;
  appVersion: string;
  algoVersion: string;
  insert: (row: BetaFeedbackRow) => Promise<PgErrorLike>;
};

export function mapBetaFeedbackError(error: PgErrorLike): BetaFeedbackError {
  const msg = error?.message ?? "";
  if (msg.includes("beta_feedback_daily_limit_exceeded")) return "limit";
  const mapped = mapPgError(error);
  if (!mapped) return "save";
  if (
    mapped.error === "invalid" ||
    mapped.error === "unauthenticated" ||
    mapped.error === "suspended"
  )
    return mapped.error;
  // 42501(RLS 거절)은 세션이 끝났거나 남의 id: 다시 로그인하게 한다
  if (error?.code === "42501") return "unauthenticated";
  return "save";
}

export async function submitBetaFeedback(
  raw: unknown,
  deps: BetaFeedbackDeps,
): Promise<BetaFeedbackResult> {
  const parsed = betaFeedbackSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const userId = await deps.currentUserId().catch(() => null);
  if (!userId) return { ok: false, error: "unauthenticated" };
  const v = parsed.data;
  const row: BetaFeedbackRow = {
    user_id: userId,
    category: v.category,
    body: v.body,
    route: v.route === null ? null : sanitizeRoute(v.route),
    app_version: deps.appVersion,
    algo_version: deps.algoVersion,
    device: v.device,
    in_app: v.inApp,
    standalone: v.standalone,
  };
  let error = await deps.insert(row).catch(() => ({ message: "fetch failed" }));
  // Postgres가 답한 오류(코드 있음)는 다시 보내도 같다. 연결 실패만 한 번 더
  if (error && !("code" in error && error.code)) {
    error = await deps.insert(row).catch(() => ({ message: "fetch failed" }));
  }
  if (!error) return { ok: true };
  return { ok: false, error: mapBetaFeedbackError(error) };
}
