"use server";
// 식당 메모 서버 액션 (T10.15, D-32, D-33). 흐름과 zod 검사는 requests.ts(테스트 있음).
// - 사용자 세션(publishable 키 + 쿠키)으로 읽고 쓴다. RLS 본인 정책 + 열 단위 권한. service role 없음.
// - 요청에는 place_id, place_url, 메모 글만 있다. 장소명, 좌표는 이 액션으로 오지 않는다(CLAUDE.md 7장).
// - flags.userPlaceMemo가 꺼지면 쓰기는 disabled, 읽기는 빈 결과(화면은 메모를 숨긴다, D-33 기본안: 숨기기만).
// - 분석 이벤트는 보내지 않는다(D-33 안건 10). 메모 글은 로그, Sentry, PostHog에 넣지 않는다.
import { isEnabled } from "@/lib/flags";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  setPlaceMemo,
  type SetPlaceMemoRequest,
  type SetPlaceMemoResult,
} from "./requests";

function memoOn(): boolean {
  return isEnabled("auth") && isEnabled("userPlaceMemo");
}

/** 메모 저장, 고침, 지우기(빈 글). 결과의 memo는 정규화된 글 */
export async function setPlaceMemoAction(
  input: SetPlaceMemoRequest,
): Promise<SetPlaceMemoResult> {
  if (!memoOn()) return { ok: false, error: "disabled" };
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, error: "save" };
  try {
    return await setPlaceMemo(input, {
      async currentUserId() {
        // getUser는 Auth 서버에 토큰을 검증받는다(쿠키 값만 믿지 않는다)
        const { data } = await supabase.auth.getUser();
        return data.user?.id ?? null;
      },
      async update(userId, placeId, body) {
        const { data, error } = await supabase
          .from("place_memos")
          .update({ body })
          .eq("user_id", userId)
          .eq("place_id", placeId)
          .select("place_id");
        return { count: data?.length ?? 0, error };
      },
      async insert(row) {
        const { error } = await supabase.from("place_memos").insert(row);
        return error;
      },
      async remove(userId, placeId) {
        const { error } = await supabase
          .from("place_memos")
          .delete()
          .eq("user_id", userId)
          .eq("place_id", placeId);
        return error;
      },
    });
  } catch {
    return { ok: false, error: "save" };
  }
}

export type MyPlaceMemosResult =
  { signedIn: false } | { signedIn: true; memos: Record<string, string> };

/** 내 메모 전부(place_id → 글, 최대 300곳). 나 탭 즐겨찾기 이름표가 쓴다 */
export async function myPlaceMemosAction(): Promise<MyPlaceMemosResult> {
  if (!memoOn()) return { signedIn: true, memos: {} };
  const supabase = await createServerSupabase();
  if (!supabase) return { signedIn: false };
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { signedIn: false };
  const { data, error } = await supabase
    .from("place_memos")
    .select("place_id, body")
    .eq("user_id", userId)
    .limit(300);
  if (error) throw new Error("load");
  return {
    signedIn: true,
    memos: Object.fromEntries((data ?? []).map((r) => [r.place_id, r.body])),
  };
}

export type FavoriteMemo = {
  placeId: string;
  placeUrl: string | null;
  memo: string;
};

/**
 * 카카오 장애 때 홈 "즐겨찾기에서 고르기"(D-33 안건 4). 메모가 있는 즐겨찾기 3곳까지, 최근에 고친 순.
 * 카카오 오류가 난 뒤에만 부른다. 비로그인, 플래그 꺼짐은 빈 목록.
 */
export async function myFavoriteMemosAction(): Promise<FavoriteMemo[]> {
  if (!memoOn()) return [];
  const supabase = await createServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("my_favorite_memos");
  if (error) throw new Error("load");
  return (data ?? []).slice(0, 3).map((r) => ({
    placeId: r.place_id,
    placeUrl: r.place_url,
    memo: r.body,
  }));
}
