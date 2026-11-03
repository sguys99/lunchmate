// 식당 메모 저장 검사와 흐름 (T10.15, D-32, D-33). 서버 액션(actions.ts)만 쓴다. Supabase는 주입받아 테스트한다.
//
// 규칙 (마이그레이션 20261103100000_t10_15_place_memos.sql 머리말과 같다)
// - 입력은 strictObject: place_id(숫자), place_url(그 id의 카카오맵 주소, 없어도 됨), body. 장소명, 좌표는 받지 않는다.
// - body는 normalizeMemo(공백과 제어 문자 덩어리를 한 칸, 앞뒤 공백 제거) 뒤 0~40자(코드 포인트). 금칙어, 연락처, 링크 거절
//   (T10.3b와 같은 판정, D-33 안건 3). 빈 글은 저장이 아니라 지우기다.
// - upsert를 쓰지 않는다: 열 권한이 update(body)뿐이라 on conflict merge가 막힌다.
//   update(본인 행, place_id 일치) → 0행이면 insert → insert가 23505(동시 저장)면 update를 한 번 더 한다.
// - 하루 30회, 300곳, 정지 계정은 DB 트리거가 판정한다. 오류 이름은 db-errors의 mapPlaceMemoError.
import * as z from "zod";
import { hasBannedIssue, withoutBannedContent } from "@/lib/moderation";
import {
  mapPlaceMemoError,
  type PgErrorLike,
  type PlaceMemoErrorCode,
} from "@/lib/supabase/db-errors";
import { MEMO_MAX, normalizeMemo } from "./model";

const placeIdSchema = z.string().regex(/^[0-9]{1,20}$/);

/** 정규화 뒤에도 남으면 안 되는 제어 문자(DB [[:cntrl:]]와 같은 범위) */
const CONTROL = /\p{Cc}/u;

const memoBodySchema = z
  .string()
  // 붙여 넣은 긴 글도 정규화 전에 한 번 자른다(요청 크기 상한)
  .max(400)
  .transform(normalizeMemo)
  .pipe(
    withoutBannedContent(
      z
        .string()
        .refine((v) => [...v].length <= MEMO_MAX)
        .refine((v) => !CONTROL.test(v) && v === v.trim()),
    ),
  );

export const setPlaceMemoSchema = z
  .strictObject({
    placeId: placeIdSchema,
    placeUrl: z.string().max(200).nullable().optional(),
    body: memoBodySchema,
  })
  .refine(
    (v) =>
      v.placeUrl == null ||
      v.placeUrl === `https://place.map.kakao.com/${v.placeId}` ||
      v.placeUrl === `http://place.map.kakao.com/${v.placeId}`,
  );

export type SetPlaceMemoRequest = z.input<typeof setPlaceMemoSchema>;

export type PlaceMemoError = PlaceMemoErrorCode | "disabled";

/** memo: 저장된 글(정규화 뒤), 지웠으면 null */
export type SetPlaceMemoResult =
  { ok: true; memo: string | null } | { ok: false; error: PlaceMemoError };

export type PlaceMemoRow = {
  user_id: string;
  place_id: string;
  place_url: string | null;
  body: string;
};

export type PlaceMemoDeps = {
  currentUserId: () => Promise<string | null>;
  /** 본인 행의 body만 바꾼다. 바뀐 행 수 */
  update: (
    userId: string,
    placeId: string,
    body: string,
  ) => Promise<{ count: number; error: PgErrorLike }>;
  insert: (row: PlaceMemoRow) => Promise<PgErrorLike>;
  remove: (userId: string, placeId: string) => Promise<PgErrorLike>;
};

const fail = (error: PlaceMemoError): SetPlaceMemoResult => ({
  ok: false,
  error,
});

const failFrom = (error: PgErrorLike): SetPlaceMemoResult =>
  fail(mapPlaceMemoError(error) ?? "save");

export async function setPlaceMemo(
  raw: unknown,
  deps: PlaceMemoDeps,
): Promise<SetPlaceMemoResult> {
  const parsed = setPlaceMemoSchema.safeParse(raw);
  if (!parsed.success)
    return fail(hasBannedIssue(parsed.error) ? "banned" : "invalid");
  const userId = await deps.currentUserId().catch(() => null);
  if (!userId) return fail("unauthenticated");
  const { placeId, placeUrl, body } = parsed.data;

  if (body === "") {
    const error = await deps.remove(userId, placeId);
    return error ? failFrom(error) : { ok: true, memo: null };
  }

  const first = await deps.update(userId, placeId, body);
  if (first.error) return failFrom(first.error);
  if (first.count > 0) return { ok: true, memo: body };

  const inserted = await deps.insert({
    user_id: userId,
    place_id: placeId,
    place_url: placeUrl ?? null,
    body,
  });
  if (!inserted) return { ok: true, memo: body };
  // 같은 식당을 두 탭에서 거의 동시에 처음 저장했다: 이미 생긴 행을 고친다
  if (inserted.code === "23505") {
    const again = await deps.update(userId, placeId, body);
    if (again.error) return failFrom(again.error);
    return again.count > 0 ? { ok: true, memo: body } : fail("save");
  }
  return failFrom(inserted);
}
