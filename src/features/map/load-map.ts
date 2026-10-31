// 지도 탭 서버 데이터 (T5.26~T5.28). 서버 컴포넌트 전용, 사용자 세션(RLS 본인 정책)으로 읽는다.
//
// 오늘(홈)과 같은 사용자 값(사무실 핀, 예산, 도보 분)을 쓰고, 지도 필터 "즐겨찾기만"(MAP-03)을 위해 즐겨찾기 place_id를 더 읽는다.
// 카카오 장소 값은 여기 없다(브라우저 세션 메모리에서만 받는다, CLAUDE.md 7장).
import "server-only";
import { loadToday, type TodayData } from "@/features/rec/load-today";
import { createServerSupabase } from "@/lib/supabase/server";

export type MapData = TodayData & {
  /** 즐겨찾기 place_id(카카오 값 중 저장 가능한 id뿐) */
  favorites: string[];
};

type Params = Record<string, string | string[] | undefined>;

export async function loadMap(params: Params): Promise<MapData> {
  const today = await loadToday(params);
  if (!today.signedIn || today.loadFailed) return { ...today, favorites: [] };
  const supabase = await createServerSupabase();
  const { data: claims } = (await supabase?.auth.getClaims()) ?? {
    data: null,
  };
  const userId = claims?.claims?.sub;
  if (!supabase || !userId) return { ...today, favorites: [] };
  const { data, error } = await supabase
    .from("favorites")
    .select("place_id")
    .eq("user_id", userId);
  return {
    ...today,
    // 즐겨찾기를 못 읽으면 칩만 비게 두고 지도는 그대로 보인다
    favorites: error ? [] : (data ?? []).map((f) => f.place_id),
  };
}
