"use server";
// 오늘(홈) 후보의 익명 집계 읽기 (T6.11, T6.15, T6.25). RPC public.place_stats(마이그레이션 20261101120000)를 부른다.
// - 비로그인도 부를 수 있는 함수다(anon 실행 권한). 세션 쿠키가 있으면 그대로 쓰고, 없으면 publishable 키로 부른다.
// - 요청에는 카카오 place_id만 있다(저장 가능한 값). 장소명, 좌표, 현위치는 오지 않는다(CLAUDE.md 7장).
// - 입력은 zod로 다시 검사한다: 숫자 place_id, 한 번에 60곳까지(RPC 한도).
// - 실패하면 ok: false. 화면은 중립값으로 추천을 계속한다(카드를 막지 않는다).
// - 돌려주는 열은 엔진이 쓰는 것만. 가격 값 목록과 태그는 상세(features/place)가 따로 읽는다.
// 상세 화면용 집계 읽기가 생기면 그 모듈과 합친다(오케스트레이터 정리 대상).
//
// 홈 메모 배지 (T10.15, D-33 안건 1): fetchHomeStats는 같은 요청 안에서 본인 메모(place_memos, place_id in 후보)를
// place_stats와 나란히 읽는다(브라우저 왕복은 그대로 1번). place_stats 함수는 바꾸지 않는다(익명 집계에 개인 메모를 섞지 않음).
// 메모는 오늘(홈)만 읽는다. 지도, 회식, 투표는 fetchPlaceStats(메모 없음)를 쓴다.
// 메모 읽기가 실패하면 메모 없이 집계만 돌려준다(배지는 덤이라 카드를 막지 않는다). RLS가 본인 행만 보이므로 user id를 따로 묻지 않는다.
//
// 홈 카드 대표 메뉴 (T10.16e, D-35 A + 안건 2): 같은 요청 안에서 익명 집계 place_menus를 나란히 읽고, 식당마다 1위 메뉴가
// 제보 2건 이상일 때만 돌려준다. 표시 전용이고 추천 엔진에 넘기지 않는다(AC-MENU-2). 실패하면 메뉴 없이 집계만 돌려준다.
import * as z from "zod";
import { isEnabled } from "@/lib/flags";
import {
  createServerSupabase,
  type ServerSupabase,
} from "@/lib/supabase/server";
import { cardMenu, type CardMenu } from "@/features/menu/card-menu-pick";
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
  return readStats(supabase, parsed.data);
}

export type HomeStatsResult =
  | {
      ok: true;
      rows: PlaceStatsRow[];
      memos: Record<string, string>;
      menus: Record<string, CardMenu>;
    }
  | { ok: false };

/** 오늘(홈) 집계 + 본인 메모(withMemos, 로그인 사용자만). 메모는 카드 배지 표시 전용이고 추천 엔진에 넘기지 않는다 */
export async function fetchHomeStats(
  placeIds: string[],
  withMemos: boolean,
): Promise<HomeStatsResult> {
  const parsed = idsSchema.safeParse(placeIds);
  if (!parsed.success) return { ok: false };
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false };
  const readMemos =
    withMemos && isEnabled("auth") && isEnabled("userPlaceMemo");
  const [stats, memos, menus] = await Promise.all([
    readStats(supabase, parsed.data),
    readMemos ? readOwnMemos(supabase, parsed.data) : Promise.resolve({}),
    isEnabled("menuReports")
      ? readCardMenus(supabase, parsed.data)
      : Promise.resolve({}),
  ]);
  if (!stats.ok) return { ok: false };
  return { ok: true, rows: stats.rows, memos, menus };
}

async function readCardMenus(
  supabase: ServerSupabase,
  placeIds: string[],
): Promise<Record<string, CardMenu>> {
  try {
    const { data, error } = await supabase.rpc("place_menus", {
      p_place_ids: placeIds,
    });
    if (error || !data) return {};
    const out: Record<string, CardMenu> = {};
    for (const r of data) {
      if (r.rank !== 1) continue;
      const m = cardMenu({
        name: r.menu_name,
        medianKrw: r.median_krw,
        count: r.report_count,
      });
      if (m) out[r.place_id] = m;
    }
    return out;
  } catch {
    return {};
  }
}

async function readOwnMemos(
  supabase: ServerSupabase,
  placeIds: string[],
): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabase
      .from("place_memos")
      .select("place_id, body")
      .in("place_id", placeIds);
    if (error || !data) return {};
    return Object.fromEntries(data.map((r) => [r.place_id, r.body]));
  } catch {
    return {};
  }
}

async function readStats(
  supabase: ServerSupabase,
  placeIds: string[],
): Promise<PlaceStatsResult> {
  const { data, error } = await supabase.rpc("place_stats", {
    p_place_ids: placeIds,
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
      closed_today: r.closed_today ?? 0,
      wait_level: r.wait_level ?? null,
      wait_reported_at: r.wait_reported_at ?? null,
      deal_count: r.deal_count ?? 0,
    })),
  };
}
