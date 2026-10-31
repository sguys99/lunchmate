"use server";
// 식당 상세 서버 액션 (T5.35 즐겨찾기, T5.38 NAV-04 방문 후보, T5.20 REC-08 다시 안 갈래요). 흐름과 zod 검사는 place-requests.ts(테스트 있음).
// - 사용자 세션(publishable 키 + 쿠키)으로 쓴다. RLS 본인 정책 + 열 단위 권한(마이그레이션 20261031120000). service role 없음.
// - 요청에는 place_id, place_url, 끼니, 출처만 있다. 장소명, 좌표, 현위치는 이 액션으로 오지 않는다(CLAUDE.md 7장).
// - 서버 액션은 Next가 Origin 검사를 한다(CSRF). 남용 제한은 DB 트리거(방문 하루 20건, 즐겨찾기와 다시 안 갈 곳 각 300곳).
// - 비로그인이면 저장 없이 unauthenticated를 돌려준다. 길찾기는 저장 결과와 무관하게 진행된다.
import { isEnabled } from "@/lib/flags";
import {
  createServerSupabase,
  type ServerSupabase,
} from "@/lib/supabase/server";
import {
  readPlaceUserState,
  saveVisit,
  setBlocked,
  setFavorite,
  type BlockDeps,
  type BlockRequest,
  type BlockResult,
  type FavoriteRequest,
  type FavoriteResult,
  type InsertOutcome,
  type PlaceDeps,
  type PlaceStateRequest,
  type PlaceUserState,
  type VisitRequest,
  type VisitResult,
} from "./place-requests";

function outcomeOf(
  error: { code?: string; message?: string } | null,
  limitName: string,
): InsertOutcome {
  if (!error) return "ok";
  if (error.code === "23505") return "duplicate";
  if (error.message?.includes(limitName)) return "limit";
  return "error";
}

function depsFor(supabase: ServerSupabase): PlaceDeps & BlockDeps {
  return {
    async currentUserId() {
      // getUser는 Auth 서버에 토큰을 검증받는다(쿠키 값만 믿지 않는다)
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    async insertVisit(userId, row) {
      const { error } = await supabase
        .from("visits")
        .insert({ user_id: userId, ...row });
      return outcomeOf(error, "visits_daily_limit_exceeded");
    },
    async isFavorite(userId, placeId) {
      const { data } = await supabase
        .from("favorites")
        .select("place_id")
        .eq("user_id", userId)
        .eq("place_id", placeId)
        .maybeSingle();
      return data !== null;
    },
    async isBlocked(userId, placeId) {
      const { data } = await supabase
        .from("blocklist")
        .select("place_id")
        .eq("user_id", userId)
        .eq("place_id", placeId)
        .maybeSingle();
      return data !== null;
    },
    async insertFavorite(userId, row) {
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: userId, ...row });
      return outcomeOf(error, "favorites_limit_exceeded");
    },
    async deleteFavorite(userId, placeId) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", userId)
        .eq("place_id", placeId);
      return !error;
    },
    async insertBlock(userId, row) {
      const { error } = await supabase
        .from("blocklist")
        .insert({ user_id: userId, ...row });
      return outcomeOf(error, "blocklist_limit_exceeded");
    },
    async deleteBlock(userId, placeId) {
      const { error } = await supabase
        .from("blocklist")
        .delete()
        .eq("user_id", userId)
        .eq("place_id", placeId);
      return !error;
    },
  };
}

async function withDeps<R>(
  fallback: R,
  fn: (deps: PlaceDeps & BlockDeps) => Promise<R>,
): Promise<R> {
  if (!isEnabled("auth")) return fallback;
  const supabase = await createServerSupabase();
  if (!supabase) return fallback;
  try {
    return await fn(depsFor(supabase));
  } catch {
    return fallback;
  }
}

/** NAV-04: 길찾기 누른 식당을 오늘의 방문 후보로 */
export async function saveVisitAction(
  input: VisitRequest,
): Promise<VisitResult> {
  return withDeps<VisitResult>(
    { ok: false, error: "unauthenticated" },
    (deps) => saveVisit(input, deps),
  );
}

/** PLACE-04: 즐겨찾기 담기, 빼기 */
export async function setFavoriteAction(
  input: FavoriteRequest,
): Promise<FavoriteResult> {
  return withDeps<FavoriteResult>({ ok: false, error: "save" }, (deps) =>
    setFavorite(input, deps),
  );
}

/** REC-08: 다시 안 갈래요 넣기(즐겨찾기에 있으면 빼고), 되돌리기(빼기) */
export async function setBlockedAction(
  input: BlockRequest,
): Promise<BlockResult> {
  return withDeps<BlockResult>({ ok: false, error: "save" }, (deps) =>
    setBlocked(input, deps),
  );
}

/** 상세를 열 때 로그인 여부와 즐겨찾기 상태 */
export async function placeUserStateAction(
  input: PlaceStateRequest,
): Promise<PlaceUserState> {
  return withDeps<PlaceUserState>({ signedIn: false }, (deps) =>
    readPlaceUserState(input, deps),
  );
}
