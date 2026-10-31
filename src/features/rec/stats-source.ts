"use server";
// 오늘(홈) 후보의 익명 집계 읽기 (T6.11, T6.15, T6.25). RPC public.place_stats(마이그레이션 20261101120000)를 부른다.
// - 비로그인도 부를 수 있는 함수다(anon 실행 권한). 세션 쿠키가 있으면 그대로 쓰고, 없으면 publishable 키로 부른다.
// - 요청에는 카카오 place_id만 있다(저장 가능한 값). 장소명, 좌표, 현위치는 오지 않는다(CLAUDE.md 7장).
// - 입력은 zod로 다시 검사한다: 숫자 place_id, 한 번에 60곳까지(RPC 한도).
// - 실패하면 ok: false. 화면은 중립값으로 추천을 계속한다(카드를 막지 않는다).
// - 돌려주는 열은 엔진이 쓰는 것만. 가격 값 목록과 태그는 상세(features/place)가 따로 읽는다.
// 상세 화면용 집계 읽기가 생기면 그 모듈과 합친다(오케스트레이터 정리 대상).
import * as z from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import type { PlaceStatsRow } from "./place-stats";

const idsSchema = z
  .array(z.string().regex(/^[0-9]{1,20}$/))
  .min(1)
  .max(60);

export type PlaceStatsResult =
  { ok: true; rows: PlaceStatsRow[] } | { ok: false };

export async function fetchPlaceStats(
  placeIds: string[],
): Promise<PlaceStatsResult> {
  const parsed = idsSchema.safeParse(placeIds);
  if (!parsed.success) return { ok: false };
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false };
  const { data, error } = await supabase.rpc("place_stats", {
    p_place_ids: parsed.data,
  });
  if (error || !data) return { ok: false };
  return {
    ok: true,
    rows: data.map((r) => ({
      place_id: r.place_id,
      price_count: r.price_count ?? 0,
      price_median: r.price_median ?? null,
      thumbs_up: r.thumbs_up ?? 0,
      thumbs_down: r.thumbs_down ?? 0,
      closed_reports: r.closed_reports ?? 0,
      closed: r.closed ?? false,
      wait_level: r.wait_level ?? null,
      wait_reported_at: r.wait_reported_at ?? null,
      deal_count: r.deal_count ?? 0,
    })),
  };
}
