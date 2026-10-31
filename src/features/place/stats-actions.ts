"use server";
// 식당 집계, 공개 후기, 할인 목록 읽기 서버 액션 (T6.6 함수 → T6.14, T6.20, 추천 T6.11, T6.25).
// - place_stats, place_deals_list는 비로그인도 부른다(개인 정보 없음). place_reviews는 로그인만(닉네임이 나간다).
// - 요청은 place_id만. 응답에 비공개 후기 글과 작성자 id는 없다(AC-FB-2, DB 보안 함수가 거른다).
// - 실패하면 throw(TanStack Query 오류 상태, 재시도 1회는 쿼리 기본값).
import * as z from "zod";
import { isEnabled } from "@/lib/flags";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  parsePlaceDealRow,
  parsePlaceReviewRow,
  parsePlaceStatsRow,
  type PlaceDeal,
  type PlaceReviewsResult,
  type PlaceStats,
} from "./place-stats-model";
import { placeIdSchema } from "./place-requests";

/** 한 번에 부를 수 있는 식당 수(DB place_stats와 같다) */
const MAX_IDS = 60;
const REVIEWS_PAGE = 10;

const statsSchema = z.array(placeIdSchema).max(MAX_IDS);
const reviewsSchema = z.strictObject({
  placeId: placeIdSchema,
  offset: z.number().int().min(0).max(200).optional(),
});
const dealsSchema = z.strictObject({ placeId: placeIdSchema });

async function client() {
  const supabase = await createServerSupabase();
  if (!supabase) throw new Error("unavailable");
  return supabase;
}

/** 식당 익명 집계(최대 60곳). 요청한 id마다 한 개(없으면 빈 집계) */
export async function placeStatsAction(
  placeIds: readonly string[],
): Promise<PlaceStats[]> {
  const parsed = statsSchema.safeParse([...new Set(placeIds)]);
  if (!parsed.success) throw new Error("invalid");
  if (parsed.data.length === 0) return [];
  const supabase = await client();
  const { data, error } = await supabase.rpc("place_stats", {
    p_place_ids: parsed.data,
  });
  if (error) throw new Error("load");
  return (data ?? []).flatMap((r) => {
    const s = parsePlaceStatsRow(r);
    return s ? [s] : [];
  });
}

export type PlaceReviewsRequest = z.input<typeof reviewsSchema>;

/**
 * 공개 후기 최신순 한 쪽(10건). 비로그인이면 목록 대신 login_required(평가 수는 place_stats에서).
 */
export async function placeReviewsAction(
  input: PlaceReviewsRequest,
): Promise<PlaceReviewsResult> {
  const parsed = reviewsSchema.safeParse(input);
  if (!parsed.success) throw new Error("invalid");
  const supabase = await client();
  const signedIn = isEnabled("auth")
    ? (await supabase.auth.getUser()).data.user !== null
    : false;
  if (!signedIn) {
    const { data } = await supabase.rpc("place_stats", {
      p_place_ids: [parsed.data.placeId],
    });
    const s = data?.[0] ? parsePlaceStatsRow(data[0]) : null;
    return {
      status: "login_required",
      ratingCount: (s?.thumbsUp ?? 0) + (s?.thumbsDown ?? 0),
    };
  }
  const { data, error } = await supabase.rpc("place_reviews", {
    p_place_id: parsed.data.placeId,
    p_limit: REVIEWS_PAGE,
    p_offset: parsed.data.offset ?? 0,
  });
  if (error) throw new Error("load");
  const rows = data ?? [];
  return {
    status: "ok",
    reviews: rows.flatMap((r) => {
      const v = parsePlaceReviewRow(r);
      return v ? [v] : [];
    }),
    hasMore: rows.length === REVIEWS_PAGE,
  };
}

export type PlaceDealsRequest = z.input<typeof dealsSchema>;

/** 지금 보이는 할인 목록(사장님 등록 먼저, 최신순). 종료일 지난 것은 DB가 뺀다(AC-DEAL-1) */
export async function placeDealsAction(
  input: PlaceDealsRequest,
): Promise<PlaceDeal[]> {
  const parsed = dealsSchema.safeParse(input);
  if (!parsed.success) throw new Error("invalid");
  const supabase = await client();
  const { data, error } = await supabase.rpc("place_deals_list", {
    p_place_id: parsed.data.placeId,
  });
  if (error) throw new Error("load");
  return (data ?? []).flatMap((r) => {
    const d = parsePlaceDealRow(r);
    return d ? [d] : [];
  });
}
