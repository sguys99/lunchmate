// 관리자 화면 데이터 모양과 순수 규칙 (T8.5, MOD-06). 브라우저와 서버 공용, React와 네트워크 의존 없음.
// - 응답 스키마: admin_* 보안 함수(20261101180000_t8_5_admin_moderation.sql)의 행을 zod로 검사해 화면 모양으로 바꾼다.
//   db:types 생성본이 생기기 전에도 같은 코드가 돌고, 생긴 뒤에도 jsonb 열(reasons, recent_items)은 여기서 검사한다.
// - 입력 스키마: 서버 액션이 브라우저 값을 다시 검사한다(CLAUDE.md 7장).
// - 시각 표시는 KST(src/lib/time). 장소 이름은 저장하지 않으므로 장소 번호만 다룬다(T0.16).
import * as z from "zod";
import type {
  AdminReportReason,
  AdminSuspendDuration,
  AdminSuspendReason,
} from "@/copy/admin";
import { getKstParts, isSameKstDay } from "@/lib/time";

export const ADMIN_SECTIONS = [
  "reviews",
  "closures",
  "users",
  "log",
  "beta",
] as const;
export type AdminSection = (typeof ADMIN_SECTIONS)[number];

export const REVIEW_REASONS = [
  "spam",
  "abuse",
  "privacy",
  "false",
  "other",
] as const satisfies readonly AdminReportReason[];
export const DEAL_REASONS = [
  "ad_false",
  "abuse",
  "privacy",
  "other",
] as const satisfies readonly AdminReportReason[];
const ALL_REASONS = [
  "spam",
  "abuse",
  "privacy",
  "false",
  "other",
  "ad_false",
] as const satisfies readonly AdminReportReason[];
export const SUSPEND_REASONS = [
  "repeated",
  "spam",
  "abuse",
  "privacy",
  "other",
] as const satisfies readonly AdminSuspendReason[];
export const SUSPEND_DURATIONS = [
  "d7",
  "d30",
  "indefinite",
] as const satisfies readonly AdminSuspendDuration[];

export const LOG_ACTIONS = [
  "review_hide",
  "review_restore",
  "deal_hide",
  "deal_restore",
  "closed_confirm",
  "closed_dismiss",
  "user_suspend",
  "user_unsuspend",
  "user_clear",
] as const;
export type LogAction = (typeof LOG_ACTIONS)[number];

/* ---------- 응답 스키마 (snake_case → 화면 모양) ---------- */

const ts = z.string().min(1);
const tsNullable = ts.nullable();
const int = z.number().int();

const reasonsSchema = z
  .record(z.string(), int)
  .transform((r) => {
    const out: Partial<Record<AdminReportReason, number>> = {};
    for (const k of ALL_REASONS) {
      const n = r[k];
      if (typeof n === "number" && n > 0) out[k] = n;
    }
    return out;
  });

export const reportedRowSchema = z
  .object({
    target_type: z.enum(["review", "deal"]),
    target_id: z.string(),
    place_id: z.string(),
    body: z.string().nullable(),
    rating: z.enum(["up", "down"]).nullable(),
    private_now: z.boolean(),
    auto_hidden: z.boolean(),
    reasons: reasonsSchema,
    notes: z.array(z.string()).nullable(),
    report_count: int,
    first_reported_at: ts,
    written_at: ts,
    author_id: z.string(),
    author_nickname: z.string().nullable(),
    author_provider: z.string().nullable(),
    author_joined_at: ts,
    author_status: z.enum(["active", "suspended"]),
    author_suspended_until: tsNullable,
    author_reports_received: int,
    author_hidden_count: int,
  })
  .transform((r) => ({
    key: `${r.target_type}:${r.target_id}`,
    targetType: r.target_type,
    targetId: r.target_id,
    placeId: r.place_id,
    body: r.body,
    rating: r.rating,
    privateNow: r.private_now,
    autoHidden: r.auto_hidden,
    reasons: r.reasons,
    notes: r.notes ?? [],
    reportCount: r.report_count,
    firstReportedAt: r.first_reported_at,
    writtenAt: r.written_at,
    author: {
      id: r.author_id,
      nickname: r.author_nickname,
      provider: r.author_provider,
      joinedAt: r.author_joined_at,
      status: r.author_status,
      suspendedUntil: r.author_suspended_until,
      reportsReceived: r.author_reports_received,
      hiddenCount: r.author_hidden_count,
    },
  }));
export type ReportedItem = z.output<typeof reportedRowSchema>;
export type ItemAuthor = ReportedItem["author"];

export const closureRowSchema = z
  .object({
    place_id: z.string(),
    place_url: z.string().nullable(),
    gone: int,
    moved: int,
    today: int,
    unspecified: int,
    closed_count: int,
    first_reported_at: ts,
    last_reported_at: ts,
    dismissed_at: tsNullable,
  })
  .transform((r) => ({
    placeId: r.place_id,
    gone: r.gone,
    moved: r.moved,
    today: r.today,
    unspecified: r.unspecified,
    closedCount: r.closed_count,
    firstReportedAt: r.first_reported_at,
    lastReportedAt: r.last_reported_at,
    dismissedAt: r.dismissed_at,
  }));
export type ClosureItem = z.output<typeof closureRowSchema>;

const recentItemSchema = z
  .object({
    target_type: z.enum(["review", "deal"]),
    target_id: z.string(),
    place_id: z.string(),
    body: z.string().nullable(),
    private_now: z.boolean(),
    hidden: z.boolean(),
    report_count: int,
    written_at: ts,
  })
  .transform((r) => ({
    targetType: r.target_type,
    targetId: r.target_id,
    placeId: r.place_id,
    body: r.body,
    privateNow: r.private_now,
    hidden: r.hidden,
    reportCount: r.report_count,
  }));

export const userRowSchema = z
  .object({
    kind: z.enum(["candidate", "suspended", "match"]),
    user_id: z.string(),
    nickname: z.string().nullable(),
    provider: z.string().nullable(),
    joined_at: ts,
    role: z.enum(["user", "admin"]),
    status: z.enum(["active", "suspended"]),
    suspended_until: tsNullable,
    suspended_reason: z.string().nullable(),
    reports_received: int,
    hidden_count: int,
    hidden_since_review: int,
    recent_items: z.array(recentItemSchema).nullable(),
  })
  .transform((r) => ({
    kind: r.kind,
    id: r.user_id,
    nickname: r.nickname,
    provider: r.provider,
    joinedAt: r.joined_at,
    role: r.role,
    status: r.status,
    suspendedUntil: r.suspended_until,
    reportsReceived: r.reports_received,
    hiddenCount: r.hidden_count,
    hiddenSinceReview: r.hidden_since_review,
    recentItems: r.recent_items ?? [],
  }));
export type AdminUser = z.output<typeof userRowSchema>;

export const logRowSchema = z
  .object({
    id: z.string(),
    created_at: ts,
    action: z.enum(LOG_ACTIONS),
    target_type: z.enum(["review", "deal", "place", "user"]),
    target_id: z.string().nullable(),
    target_place_id: z.string().nullable(),
    target_user_id: z.string().nullable(),
    target_nickname: z.string().nullable(),
    reason: z.string().nullable(),
    duration: z.string().nullable(),
    by_system: z.boolean(),
    admin_nickname: z.string().nullable(),
    reverted_at: tsNullable,
    undoable: z.boolean(),
  })
  .transform((r) => ({
    id: r.id,
    at: r.created_at,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    targetPlaceId: r.target_place_id,
    targetUserId: r.target_user_id,
    targetNickname: r.target_nickname,
    reason: r.reason,
    duration: r.duration,
    bySystem: r.by_system,
    adminNickname: r.admin_nickname,
    reverted: r.reverted_at !== null,
    undoable: r.undoable,
  }));
export type LogEntry = z.output<typeof logRowSchema>;

export const decideRowSchema = z.object({
  action_id: z.string(),
  target_type: z.enum(["review", "deal"]),
  target_id: z.string(),
});

/** 베타 의견 (T9.4, admin_beta_feedback). 작성자는 익명 번호만, 화면 경로는 경로 틀만 */
export const BETA_FEEDBACK_CATEGORIES = [
  "bug",
  "inconvenient",
  "good",
  "idea",
] as const;
export type BetaFeedbackCategory = (typeof BETA_FEEDBACK_CATEGORIES)[number];

export const betaFeedbackRowSchema = z
  .object({
    id: z.string(),
    author_no: int,
    category: z.enum(BETA_FEEDBACK_CATEGORIES).nullable(),
    body: z.string(),
    route: z.string().nullable(),
    app_version: z.string(),
    algo_version: z.string(),
    device: z.enum(["ios", "android", "desktop"]),
    in_app: z.boolean(),
    standalone: z.boolean(),
    created_at: ts,
  })
  .transform((r) => ({
    id: r.id,
    authorNo: r.author_no,
    category: r.category,
    body: r.body,
    route: r.route,
    appVersion: r.app_version,
    algoVersion: r.algo_version,
    device: r.device,
    inApp: r.in_app,
    standalone: r.standalone,
    at: r.created_at,
  }));
export type BetaFeedbackItem = z.output<typeof betaFeedbackRowSchema>;
/** 한 번에 받는 최대 수(함수 상한과 같다) */
export const BETA_FEEDBACK_PAGE = 200;

/** 종류 필터. all이면 전부, none은 종류를 고르지 않은 의견 */
export type BetaFeedbackFilter = "all" | BetaFeedbackCategory | "none";
export function filterBetaFeedback(
  items: readonly BetaFeedbackItem[],
  filter: BetaFeedbackFilter,
): BetaFeedbackItem[] {
  if (filter === "all") return [...items];
  if (filter === "none") return items.filter((i) => i.category === null);
  return items.filter((i) => i.category === filter);
}

export type AdminSnapshot = {
  items: ReportedItem[];
  closures: ClosureItem[];
  users: AdminUser[];
  log: LogEntry[];
};

/* ---------- 입력 스키마 (서버 액션 재검증) ---------- */

const id = z.uuid();

export const decideItemInput = z
  .object({
    targetType: z.enum(["review", "deal"]),
    targetId: id,
    result: z.enum(["hide", "restore"]),
    reason: z.enum(ALL_REASONS).nullable(),
    includeAuthor: z.boolean(),
  })
  .refine((v) => v.result === "restore" || v.reason !== null)
  .refine((v) => !v.includeAuthor || v.result === "hide");
export type DecideItemInput = z.input<typeof decideItemInput>;

export const decideClosureInput = z.object({
  placeId: z.string().regex(/^[0-9]{1,20}$/),
  result: z.enum(["confirm", "dismiss"]),
});
export type DecideClosureInput = z.input<typeof decideClosureInput>;

export const setSuspensionInput = z.discriminatedUnion("status", [
  z.object({
    userId: id,
    status: z.literal("suspended"),
    duration: z.enum(SUSPEND_DURATIONS),
    reason: z.enum(SUSPEND_REASONS),
  }),
  z.object({ userId: id, status: z.literal("active") }),
]);
export type SetSuspensionInput = z.input<typeof setSuspensionInput>;

export const userIdInput = z.object({ userId: id });

export const undoInput = z.object({
  actionIds: z.array(id).min(1).max(50),
});

export const searchUsersInput = z.object({
  query: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .refine((v) => !/\p{Cc}/u.test(v)),
});

/* ---------- 처리 결과 코드 ---------- */

export type AdminErrorCode =
  | "forbidden"
  | "unavailable"
  | "conflict"
  | "undo_unavailable"
  | "admin_target"
  | "invalid"
  | "save";

export type AdminResult<T extends object = object> =
  ({ ok: true } & T) | { ok: false; error: AdminErrorCode };

/** Postgres 오류 이름(마이그레이션 raise 값) → 결과 코드 */
export function mapAdminError(
  error: { code?: string | null; message?: string | null } | null,
): AdminErrorCode | null {
  if (!error) return null;
  const msg = error.message ?? "";
  if (msg.includes("admin_only") || msg.includes("not_authenticated"))
    return "forbidden";
  if (msg.includes("moderation_undo_unavailable")) return "undo_unavailable";
  if (msg.includes("moderation_conflict")) return "conflict";
  if (msg.includes("moderation_admin_target")) return "admin_target";
  if (msg.includes("moderation_target_unavailable")) return "unavailable";
  if (msg.includes("admin_invalid_input")) return "invalid";
  if (error.code === "23505") return "conflict";
  if (error.code === "42501") return "forbidden";
  if (error.code === "23514" || error.code === "22P02") return "invalid";
  return "save";
}

/* ---------- 큐 규칙 ---------- */

/** 가장 많이 받은 사유. 숨김 사유 기본값(시안 공통 규칙) */
export function topReason(item: ReportedItem): AdminReportReason {
  let best: AdminReportReason = item.targetType === "deal" ? "ad_false" : "other";
  let max = 0;
  for (const r of reasonsFor(item)) {
    const n = item.reasons[r] ?? 0;
    if (n > max) {
      best = r;
      max = n;
    }
  }
  return best;
}

export function reasonsFor(item: {
  targetType: "review" | "deal";
}): readonly AdminReportReason[] {
  return item.targetType === "deal" ? DEAL_REASONS : REVIEW_REASONS;
}

/** 큐 순서: 자동 숨김 먼저, 신고 많은 순, 첫 신고 오래된 순 (서버 순서와 같다. 되돌린 항목을 다시 끼울 때 쓴다) */
export function sortQueue(items: readonly ReportedItem[]): ReportedItem[] {
  return [...items].sort(
    (a, b) =>
      Number(b.autoHidden) - Number(a.autoHidden) ||
      b.reportCount - a.reportCount ||
      Date.parse(a.firstReportedAt) - Date.parse(b.firstReportedAt),
  );
}

/** 건너뛴 항목은 큐 맨 뒤로 */
export function orderWithSkipped(
  items: readonly ReportedItem[],
  skipped: readonly string[],
): ReportedItem[] {
  const rest = items.filter((i) => !skipped.includes(i.key));
  const back = skipped
    .map((k) => items.find((i) => i.key === k))
    .filter((i): i is ReportedItem => i !== undefined);
  return [...rest, ...back];
}

/** 같은 작성자의 다른 검토 대기 글 수 (B 조각 일괄 숨김) */
export function sameAuthorOthers(
  items: readonly ReportedItem[],
  current: ReportedItem,
): number {
  return items.filter(
    (i) => i.author.id === current.author.id && i.key !== current.key,
  ).length;
}

export const CANDIDATE_MIN_HIDDEN = 2;

/** 구역별 검토 대기 수 (사용자는 정지 검토 후보 수, 이력은 없음) */
export function sectionCounts(
  s: AdminSnapshot | undefined,
): Record<AdminSection, number | null> {
  return {
    reviews: s ? s.items.length : null,
    closures: s ? s.closures.length : null,
    users: s ? s.users.filter((u) => u.kind === "candidate").length : null,
    log: null,
    // 읽음 처리가 없어 검토 대기 수를 두지 않는다(D-23 안건 14)
    beta: null,
  };
}

/** 오늘(KST) 관리자가 처리한 것. 시스템 처리(만료 해제)는 빼고 최신순 */
export function todaysEntries(
  log: readonly LogEntry[],
  now: Date,
): LogEntry[] {
  return log.filter(
    (e) => !e.bySystem && e.adminNickname !== null && isSameKstDay(new Date(e.at), now),
  );
}

/** 처리 이력 줄 → 화면이 먼저 뺀 항목 키(되돌리면 다시 보이게). 정지와 해제는 목록에서 빼지 않으므로 null */
export function hiddenKeyOfLog(e: LogEntry): string | null {
  if ((e.targetType === "review" || e.targetType === "deal") && e.targetId)
    return `${e.targetType}:${e.targetId}`;
  if (e.targetType === "place" && e.targetPlaceId)
    return `place:${e.targetPlaceId}`;
  if (e.action === "user_clear" && e.targetUserId)
    return `user:${e.targetUserId}`;
  return null;
}

/** 폐업 수: 오늘만 쉬어요는 세지 않는다. 3 이상이면 지금 추천 제외 중 */
export function isExcluded(c: ClosureItem): boolean {
  return c.closedCount >= 3;
}

/* ---------- 시각 표시 (KST) ---------- */

/** "11월 1일 14:40" */
export function formatKstDateTime(iso: string): string {
  const p = getKstParts(new Date(iso));
  return `${p.month}월 ${p.day}일 ${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

/** "11월 8일" */
export function formatKstDate(iso: string): string {
  const p = getKstParts(new Date(iso));
  return `${p.month}월 ${p.day}일`;
}

export function kakaoPlaceUrl(placeId: string): string {
  return `https://place.map.kakao.com/${placeId}`;
}
