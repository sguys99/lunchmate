// 신고, 식당 정보 제보, 할인, 웨이팅 저장 검사와 흐름 (T6.15~T6.24, T6.17, T6.18, PLACE-05, PLACE-07, MOD-01~05, DEAL-01~04).
// 서버 액션(actions.ts)만 쓴다. Supabase는 주입받아 테스트한다.
//
// 규칙
// - 입력은 strictObject. 카카오 값은 place_id, place_url만, 좌표와 장소명은 받지 않는다(CLAUDE.md 7장).
// - 자유 글은 신고 "기타"(100자)와 할인 내용(60자)뿐이고 둘 다 금칙어를 거른다(MOD-04, DEAL-04).
//   식당 정보 제보는 칩과 숫자만(PLACE-05, D-13 안건 9).
// - 하루 한도(신고 + 정보 제보 30, 할인 10), 같은 대상 1회, 자기 글 신고 금지, 끝난 할인은 DB가 판정한다.
// - 할인 등록은 register_deal: 같은 식당 같은 유형이 있으면 merged(중복 단계), replace면 바꿔 넣기(D-13 안건 2, 3).
// - 웨이팅은 report_wait: 30분 1회면 cooldown + retryAt, 되돌리기는 2분 안(RLS가 거른다, 지나면 undo_expired).
import * as z from "zod";
import { withoutBannedContent } from "@/lib/moderation";
import { mapPgError, type PgErrorLike } from "@/lib/supabase/db-errors";
import { fail, type WriteResult } from "@/lib/supabase/write-result";
import { addKstDays, DEAL_MAX_DAYS, kstDateKey, dateKeyDiff } from "@/lib/time";
import { parseInput } from "@/features/feedback/feedback-requests";
import { placeIdSchema } from "@/features/place/place-requests";
import {
  CLOSED_DETAILS,
  DEAL_CHECK_ANSWERS,
  DEAL_CONTENT_MAX,
  DEAL_REPORT_REASONS,
  DEAL_SLOTS,
  DEAL_TYPES,
  INFO_FIELDS,
  MENU_FLAG_REASONS,
  REPORT_NOTE_MAX,
  REVIEW_REPORT_REASONS,
  waitLevelToDb,
  type DealCheckAnswer,
  type MenuFlagReason,
  type WaitDbLevel,
} from "./labels";

/* ---------- 스키마 ---------- */

const unique = <T>(arr: readonly T[]) => new Set(arr).size === arr.length;
const noControl = (v: string) => !/\p{Cc}/u.test(v);

const placeUrl = z.string().max(200).nullable().optional();
function placeUrlMatches(v: { placeId: string; placeUrl?: string | null }) {
  if (v.placeUrl == null) return true;
  return (
    v.placeUrl === `https://place.map.kakao.com/${v.placeId}` ||
    v.placeUrl === `http://place.map.kakao.com/${v.placeId}`
  );
}

/** 신고 "기타" 글(선택, 100자). 빈 글은 없음 */
const note = withoutBannedContent(
  z.string().trim().max(REPORT_NOTE_MAX).refine(noControl),
)
  .nullable()
  .optional()
  .transform((v) => (v == null || v === "" ? null : v));

const onlyOtherHasNote = (v: { reason: string; note: string | null }) =>
  v.note === null || v.reason === "other";

/** 후기 신고 (MOD-01). 글은 사유가 기타일 때만 */
export const reportReviewSchema = z
  .strictObject({
    reviewId: z.uuid(),
    reason: z.enum(REVIEW_REPORT_REASONS),
    note,
  })
  .refine(onlyOtherHasNote);

/** 할인 신고 (DEAL-04) */
export const reportDealSchema = z
  .strictObject({
    dealId: z.uuid(),
    reason: z.enum(DEAL_REPORT_REASONS),
    note,
  })
  .refine(onlyOtherHasNote);

/** 메뉴 줄 신고 (T10.16f, MENU-05, D-37). 대상은 메뉴 줄(장소 + 비교 키), 사유 칩만, 글 없음 */
export const reportMenuSchema = z.strictObject({
  placeId: placeIdSchema,
  menuKey: z
    .string()
    .regex(/^\S{1,40}$/)
    .refine((v) => v === v.toLowerCase()),
  reason: z.enum(MENU_FLAG_REASONS),
});
export type ReportMenuRequest = z.input<typeof reportMenuSchema>;

/** 식당 정보 제보 (PLACE-05). 세부는 모두 선택, 자유 글 없음 */
export const reportPlaceSchema = z
  .discriminatedUnion("kind", [
    z.strictObject({
      kind: z.literal("closed"),
      placeId: placeIdSchema,
      placeUrl,
      closed: z.enum(CLOSED_DETAILS).optional(),
    }),
    z.strictObject({
      kind: z.literal("price"),
      placeId: placeIdSchema,
      placeUrl,
      priceKrw: z.number().int().min(1000).max(100000).optional(),
    }),
    z.strictObject({
      kind: z.literal("info"),
      placeId: placeIdSchema,
      placeUrl,
      fields: z.array(z.enum(INFO_FIELDS)).min(1).max(4).refine(unique).optional(),
    }),
  ])
  .refine(placeUrlMatches);

/** 할인 등록 (DEAL-01). endsOn은 KST 날짜 키(오늘~오늘+30), 없으면 서버가 +7일 */
export const registerDealSchema = z
  .strictObject({
    placeId: placeIdSchema,
    placeUrl,
    type: z.enum(DEAL_TYPES),
    content: withoutBannedContent(
      z.string().trim().min(1).max(DEAL_CONTENT_MAX).refine(noControl),
    ),
    endsOn: z.iso.date().optional(),
    days: z.number().int().min(0).max(127).optional(),
    slots: z.array(z.enum(DEAL_SLOTS)).max(3).refine(unique).optional(),
    /** "다른 내용이라 새로 남기기": 기존 제보를 숨기고 바꿔 넣는다 */
    replace: z.boolean().optional(),
  })
  .refine(placeUrlMatches);

/** 아직 해요 / 끝났어요 (DEAL-03). 되돌리기는 dealIdSchema로 */
export const checkDealSchema = z.strictObject({
  dealId: z.uuid(),
  answer: z.enum(DEAL_CHECK_ANSWERS),
});
export const dealIdSchema = z.strictObject({ dealId: z.uuid() });

/** 웨이팅 한 탭 (PLACE-07). 단계는 배지 값(walkIn, short, long) */
export const reportWaitSchema = z.strictObject({
  placeId: placeIdSchema,
  level: z.enum(["walkIn", "short", "long"]),
});
export const waitReportIdSchema = z.strictObject({ reportId: z.uuid() });

export type ReportReviewRequest = z.input<typeof reportReviewSchema>;
export type ReportDealRequest = z.input<typeof reportDealSchema>;
export type ReportPlaceRequest = z.input<typeof reportPlaceSchema>;
export type RegisterDealRequest = z.input<typeof registerDealSchema>;
export type CheckDealRequest = z.input<typeof checkDealSchema>;
export type DealIdRequest = z.input<typeof dealIdSchema>;
export type ReportWaitRequest = z.input<typeof reportWaitSchema>;
export type WaitReportIdRequest = z.input<typeof waitReportIdSchema>;

/* ---------- 의존성 ---------- */

type Changed = { count: number; error: PgErrorLike };

export type ReportDeps = {
  currentUserId: () => Promise<string | null>;
  now: () => Date;
  insertReviewReport: (
    userId: string,
    row:
      | { target_type: "review"; review_id: string; reason: string; note: string | null }
      | { target_type: "deal"; deal_id: string; reason: string; note: string | null },
  ) => Promise<PgErrorLike>;
  insertMenuFlag: (
    userId: string,
    row: { place_id: string; menu_key: string; reason: MenuFlagReason },
  ) => Promise<PgErrorLike>;
  insertPlaceReport: (
    userId: string,
    row: {
      place_id: string;
      place_url: string | null;
      kind: "closed" | "price" | "info";
      detail: Record<string, string | number | string[]>;
    },
  ) => Promise<PgErrorLike>;
  registerDeal: (args: {
    p_place_id: string;
    p_place_url: string | null;
    p_type: string;
    p_content: string;
    p_ends_on: string | null;
    p_days: number;
    p_slots: string[];
    p_replace: boolean;
  }) => Promise<{
    data: { deal_id: string | null; merged_with: string | null; ends_on: string | null } | null;
    error: PgErrorLike;
  }>;
  insertDealCheck: (
    userId: string,
    dealId: string,
    answer: DealCheckAnswer,
  ) => Promise<PgErrorLike>;
  updateDealCheck: (
    userId: string,
    dealId: string,
    answer: DealCheckAnswer,
  ) => Promise<Changed>;
  deleteDealCheck: (userId: string, dealId: string) => Promise<Changed>;
  reportWait: (args: { p_place_id: string; p_level: WaitDbLevel }) => Promise<{
    data: {
      accepted: boolean;
      report_id: string | null;
      reported_at: string | null;
      retry_at: string | null;
    } | null;
    error: PgErrorLike;
  }>;
  deleteWaitReport: (userId: string, reportId: string) => Promise<Changed>;
};

async function signedIn(deps: Pick<ReportDeps, "currentUserId">) {
  return deps.currentUserId().catch(() => null);
}

const done = (error: PgErrorLike): WriteResult =>
  error ? (mapPgError(error) ?? fail("save")) : { ok: true };

/* ---------- 흐름 ---------- */

/** 후기 신고 (MOD-01, MOD-02). 서로 다른 3명이면 DB가 자동 숨김 */
export async function reportReview(
  raw: unknown,
  deps: ReportDeps,
): Promise<WriteResult> {
  const p = parseInput(reportReviewSchema, raw);
  if (!p.ok) return fail(p.error);
  const userId = await signedIn(deps);
  if (!userId) return fail("unauthenticated");
  return done(
    await deps.insertReviewReport(userId, {
      target_type: "review",
      review_id: p.data.reviewId,
      reason: p.data.reason,
      note: p.data.note,
    }),
  );
}

/** 메뉴 줄 신고 (T10.16f). 서로 다른 3명이면 DB가 그 줄을 메뉴판에서 내린다 */
export async function reportMenu(
  raw: unknown,
  deps: ReportDeps,
): Promise<WriteResult> {
  const p = parseInput(reportMenuSchema, raw);
  if (!p.ok) return fail(p.error);
  const userId = await signedIn(deps);
  if (!userId) return fail("unauthenticated");
  return done(
    await deps.insertMenuFlag(userId, {
      place_id: p.data.placeId,
      menu_key: p.data.menuKey,
      reason: p.data.reason,
    }),
  );
}

/** 할인 신고 (DEAL-04) */
export async function reportDeal(
  raw: unknown,
  deps: ReportDeps,
): Promise<WriteResult> {
  const p = parseInput(reportDealSchema, raw);
  if (!p.ok) return fail(p.error);
  const userId = await signedIn(deps);
  if (!userId) return fail("unauthenticated");
  return done(
    await deps.insertReviewReport(userId, {
      target_type: "deal",
      deal_id: p.data.dealId,
      reason: p.data.reason,
      note: p.data.note,
    }),
  );
}

/** 식당 정보 제보 (PLACE-05, MOD-03). 같은 식당 같은 종류는 하루 1회(duplicate) */
export async function reportPlace(
  raw: unknown,
  deps: ReportDeps,
): Promise<WriteResult> {
  const p = parseInput(reportPlaceSchema, raw);
  if (!p.ok) return fail(p.error);
  const userId = await signedIn(deps);
  if (!userId) return fail("unauthenticated");
  const v = p.data;
  const detail: Record<string, string | number | string[]> = {};
  if (v.kind === "closed" && v.closed) detail.closed = v.closed;
  if (v.kind === "price" && v.priceKrw !== undefined) detail.price_krw = v.priceKrw;
  if (v.kind === "info" && v.fields) detail.fields = v.fields;
  return done(
    await deps.insertPlaceReport(userId, {
      place_id: v.placeId,
      place_url: v.placeUrl ?? null,
      kind: v.kind,
      detail,
    }),
  );
}

export type RegisterDealResult = WriteResult<
  | { status: "created"; dealId: string; endsOn: string }
  /** 같은 식당 같은 유형 제보가 이미 있다. 화면은 중복 단계를 띄운다 */
  | { status: "merged"; mergedWith: string }
>;

/** 할인 등록 (DEAL-01, DEAL-04). 종료일은 오늘(KST)~30일 */
export async function registerDeal(
  raw: unknown,
  deps: ReportDeps,
): Promise<RegisterDealResult> {
  const p = parseInput(registerDealSchema, raw);
  if (!p.ok) return fail(p.error);
  const v = p.data;
  if (v.endsOn) {
    const diff = dateKeyDiff(kstDateKey(deps.now()), v.endsOn);
    if (!(diff >= 0 && diff <= DEAL_MAX_DAYS)) return fail("invalid");
  }
  const userId = await signedIn(deps);
  if (!userId) return fail("unauthenticated");
  const { data, error } = await deps.registerDeal({
    p_place_id: v.placeId,
    p_place_url: v.placeUrl ?? null,
    p_type: v.type,
    p_content: v.content,
    p_ends_on: v.endsOn ?? null,
    p_days: v.days ?? 0,
    p_slots: v.slots ?? [],
    p_replace: v.replace ?? false,
  });
  if (error) return mapPgError(error) ?? fail("save");
  if (data?.merged_with) return { ok: true, status: "merged", mergedWith: data.merged_with };
  if (data?.deal_id && data.ends_on)
    return { ok: true, status: "created", dealId: data.deal_id, endsOn: data.ends_on };
  return fail("save");
}

/** 아직 해요 / 끝났어요 (DEAL-03). 이미 답했으면 바꾼다. 끝났어요 3명이면 DB가 숨긴다 */
export async function checkDeal(
  raw: unknown,
  deps: ReportDeps,
): Promise<WriteResult<{ answer: DealCheckAnswer }>> {
  const p = parseInput(checkDealSchema, raw);
  if (!p.ok) return fail(p.error);
  const userId = await signedIn(deps);
  if (!userId) return fail("unauthenticated");
  const { dealId, answer } = p.data;
  const inserted = await deps.insertDealCheck(userId, dealId, answer);
  if (!inserted) return { ok: true, answer };
  const failure = mapPgError(inserted) ?? fail("save");
  if (failure.error !== "duplicate") return failure;
  const changed = await deps.updateDealCheck(userId, dealId, answer);
  if (changed.error) return mapPgError(changed.error) ?? fail("save");
  return changed.count === 1 ? { ok: true, answer } : fail("not_found");
}

/** 아직 해요 / 끝났어요 되돌리기 (D-13 안건 5: 행 삭제) */
export async function undoDealCheck(
  raw: unknown,
  deps: ReportDeps,
): Promise<WriteResult> {
  const p = parseInput(dealIdSchema, raw);
  if (!p.ok) return fail(p.error);
  const userId = await signedIn(deps);
  if (!userId) return fail("unauthenticated");
  const changed = await deps.deleteDealCheck(userId, p.data.dealId);
  if (changed.error) return mapPgError(changed.error) ?? fail("save");
  return { ok: true };
}

/** 되돌리기 가능 시간 (PLACE-07, D-13 안건 8) */
export const WAIT_UNDO_MS = 2 * 60 * 1000;

export type ReportWaitResult = WriteResult<{
  reportId: string;
  reportedAt: string;
  /** 이 시각까지 되돌릴 수 있다 */
  undoUntil: string;
  /** 이 시각부터 같은 식당에 다시 알릴 수 있다 */
  retryAt: string;
}>;

/** 웨이팅 한 탭 (PLACE-07). 30분 안에 같은 식당에 낸 제보가 있으면 cooldown */
export async function reportWait(
  raw: unknown,
  deps: ReportDeps,
): Promise<ReportWaitResult> {
  const p = parseInput(reportWaitSchema, raw);
  if (!p.ok) return fail(p.error);
  const userId = await signedIn(deps);
  if (!userId) return fail("unauthenticated");
  const { data, error } = await deps.reportWait({
    p_place_id: p.data.placeId,
    p_level: waitLevelToDb(p.data.level),
  });
  if (error) return mapPgError(error) ?? fail("save");
  if (!data) return fail("save");
  if (!data.accepted) {
    return data.retry_at
      ? { ok: false, error: "cooldown", retryAt: data.retry_at }
      : fail("save");
  }
  if (!data.report_id || !data.reported_at || !data.retry_at) return fail("save");
  return {
    ok: true,
    reportId: data.report_id,
    reportedAt: data.reported_at,
    undoUntil: new Date(Date.parse(data.reported_at) + WAIT_UNDO_MS).toISOString(),
    retryAt: data.retry_at,
  };
}

/** 웨이팅 되돌리기 (2분 안). 지우면 30분 제한도 풀린다 */
export async function undoWait(
  raw: unknown,
  deps: ReportDeps,
): Promise<WriteResult> {
  const p = parseInput(waitReportIdSchema, raw);
  if (!p.ok) return fail(p.error);
  const userId = await signedIn(deps);
  if (!userId) return fail("unauthenticated");
  const changed = await deps.deleteWaitReport(userId, p.data.reportId);
  if (changed.error) return mapPgError(changed.error) ?? fail("save");
  return changed.count === 1 ? { ok: true } : fail("undo_expired");
}

/** 오늘 KST 기준 할인 종료일 기본값과 최대값 (화면의 날짜 고르기 범위) */
export function dealEndRange(now: Date): { min: string; defaultValue: string; max: string } {
  return {
    min: kstDateKey(now),
    defaultValue: kstDateKey(addKstDays(now, 7)),
    max: kstDateKey(addKstDays(now, DEAL_MAX_DAYS)),
  };
}
