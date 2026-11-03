// 메뉴 제보 검사와 흐름 (T10.16d, PRD MENU-01, MENU-02, D-35). 서버 액션(actions.ts)만 쓴다. Supabase는 주입받아 테스트한다.
//
// 규칙 (마이그레이션 20261103200000_t10_16c_menu_reports.sql 머리말과 같다)
// - 입력은 strictObject. 장소명, 좌표, 카테고리는 받지 않는다(CLAUDE.md 7장). place_url은 그 id의 카카오맵 주소만.
// - 이름은 normalizeMenuName 뒤 1~20자(코드 포인트), 제어 문자 없음. 금칙어, 연락처, 링크 거절(T10.3b와 같은 판정).
// - 가격은 1천~10만 원, 500원 단위.
// - 상세 알려주기(source detail): 한 행 insert.
// - 피드백(source feedback): 그 후기의 메뉴를 바꾼다. 기존 행을 지우고 새 행을 넣는다(고치기 권한 없음, 후기 하나에 메뉴 하나).
//   이름이 null이면 지우기만 한다. 새 행이 같은 날 같은 메뉴 제보와 겹치면(23505) duplicate.
// - 하루 20건, 같은 메뉴 하루 1회, 정지 계정, 본인 후기 확인은 DB 트리거와 제약이 판정한다. 오류 이름은 mapMenuReportError.
import * as z from "zod";
import { hasBannedIssue, withoutBannedContent } from "@/lib/moderation";
import {
  mapMenuReportError,
  type MenuReportErrorCode,
  type PgErrorLike,
} from "@/lib/supabase/db-errors";
import {
  MENU_NAME_MAX,
  MENU_PRICE_MAX,
  MENU_PRICE_MIN,
  MENU_PRICE_STEP,
  normalizeMenuName,
} from "./model";

const placeIdSchema = z.string().regex(/^[0-9]{1,20}$/);
const uuidSchema = z.string().uuid();
const CONTROL = /\p{Cc}/u;

const nameSchema = z
  .string()
  // 붙여 넣은 긴 글도 정규화 전에 한 번 자른다(요청 크기 상한)
  .max(200)
  .transform(normalizeMenuName)
  .pipe(
    withoutBannedContent(
      z
        .string()
        .refine((v) => {
          const n = [...v].length;
          return n >= 1 && n <= MENU_NAME_MAX;
        })
        .refine((v) => !CONTROL.test(v) && v === v.trim()),
    ),
  );

const priceSchema = z
  .number()
  .int()
  .min(MENU_PRICE_MIN)
  .max(MENU_PRICE_MAX)
  .refine((v) => v % MENU_PRICE_STEP === 0);

const placeUrlSchema = z.string().max(200).nullable().optional();

function placeUrlMatches(v: { placeId: string; placeUrl?: string | null }) {
  return (
    v.placeUrl == null ||
    v.placeUrl === `https://place.map.kakao.com/${v.placeId}` ||
    v.placeUrl === `http://place.map.kakao.com/${v.placeId}`
  );
}

/** 상세 "메뉴 알려주기" (MENU-02) */
export const reportMenuSchema = z
  .strictObject({
    placeId: placeIdSchema,
    placeUrl: placeUrlSchema,
    name: nameSchema,
    priceKrw: priceSchema,
  })
  .refine(placeUrlMatches);

/** 식후 피드백의 먹은 메뉴 (MENU-01). name null이면 그 후기의 메뉴를 지운다 */
export const setReviewMenuSchema = z
  .strictObject({
    reviewId: uuidSchema,
    placeId: placeIdSchema,
    placeUrl: placeUrlSchema,
    name: nameSchema.nullable(),
    priceKrw: priceSchema.nullable(),
  })
  .refine(placeUrlMatches)
  .refine((v) => v.name === null || v.priceKrw !== null);

export type ReportMenuRequest = z.input<typeof reportMenuSchema>;
export type SetReviewMenuRequest = z.input<typeof setReviewMenuSchema>;

export type MenuReportError = MenuReportErrorCode | "disabled";

export type MenuWriteResult =
  { ok: true; name: string | null } | { ok: false; error: MenuReportError };

export type MenuInsertRow = {
  user_id: string;
  place_id: string;
  place_url: string | null;
  menu_name: string;
  price_krw: number;
  source: "feedback" | "detail";
  review_id: string | null;
};

export type MenuDeps = {
  currentUserId: () => Promise<string | null>;
  insert: (row: MenuInsertRow) => Promise<PgErrorLike>;
  /** 본인 행 가운데 그 후기에서 온 메뉴를 지운다 */
  removeForReview: (userId: string, reviewId: string) => Promise<PgErrorLike>;
};

const fail = (error: MenuReportError): MenuWriteResult => ({ ok: false, error });
const failFrom = (error: PgErrorLike): MenuWriteResult =>
  fail(mapMenuReportError(error) ?? "save");

function parse<S extends z.ZodType>(
  schema: S,
  raw: unknown,
): { ok: true; data: z.output<S> } | { ok: false; error: MenuReportError } {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, error: hasBannedIssue(parsed.error) ? "banned" : "invalid" };
}

export async function reportMenu(raw: unknown, deps: MenuDeps): Promise<MenuWriteResult> {
  const p = parse(reportMenuSchema, raw);
  if (!p.ok) return fail(p.error);
  const userId = await deps.currentUserId().catch(() => null);
  if (!userId) return fail("unauthenticated");
  const { placeId, placeUrl, name, priceKrw } = p.data;
  const error = await deps.insert({
    user_id: userId,
    place_id: placeId,
    place_url: placeUrl ?? null,
    menu_name: name,
    price_krw: priceKrw,
    source: "detail",
    review_id: null,
  });
  return error ? failFrom(error) : { ok: true, name };
}

export async function setReviewMenu(raw: unknown, deps: MenuDeps): Promise<MenuWriteResult> {
  const p = parse(setReviewMenuSchema, raw);
  if (!p.ok) return fail(p.error);
  const userId = await deps.currentUserId().catch(() => null);
  if (!userId) return fail("unauthenticated");
  const { reviewId, placeId, placeUrl, name, priceKrw } = p.data;
  const removed = await deps.removeForReview(userId, reviewId);
  if (removed) return failFrom(removed);
  if (name === null || priceKrw === null) return { ok: true, name: null };
  const error = await deps.insert({
    user_id: userId,
    place_id: placeId,
    place_url: placeUrl ?? null,
    menu_name: name,
    price_krw: priceKrw,
    source: "feedback",
    review_id: reviewId,
  });
  return error ? failFrom(error) : { ok: true, name };
}

/** place_menus 한 줄 → 화면 모양 */
export type PlaceMenusRow = {
  place_id: string;
  menu_key: string;
  menu_name: string;
  median_krw: number;
  report_count: number;
  last_month: string;
  rank: number;
};

export function groupMenus(rows: readonly PlaceMenusRow[]) {
  const out: Record<
    string,
    { key: string; name: string; medianKrw: number; count: number; lastMonth: string }[]
  > = {};
  const sorted = [...rows].sort((a, b) => a.rank - b.rank);
  for (const r of sorted) {
    (out[r.place_id] ??= []).push({
      key: r.menu_key,
      name: r.menu_name,
      medianKrw: r.median_krw,
      count: r.report_count,
      lastMonth: r.last_month,
    });
  }
  return out;
}
