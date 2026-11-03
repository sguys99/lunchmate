"use server";
// 메뉴 제보 서버 액션 (T10.16d, PRD MENU-01~03, D-35). 흐름과 zod 검사는 requests.ts(테스트 있음).
// - 쓰기는 사용자 세션(publishable 키 + 쿠키)으로 한다. RLS 본인 정책 + 열 단위 권한. service role 없음.
// - 요청에는 place_id, place_url, 메뉴 이름, 가격만 있다. 장소명, 좌표는 이 액션으로 오지 않는다(CLAUDE.md 7장).
// - 읽기(placeMenusAction)는 익명 집계 함수 place_menus. 비로그인도 부른다. 작성자는 돌려받지 않는다(AC-MENU-1).
// - flags.menuReports가 꺼지면 쓰기는 disabled, 읽기는 빈 결과(화면은 메뉴를 숨긴다).
// - 메뉴 이름과 가격은 로그, Sentry, PostHog에 넣지 않는다(이벤트 menu_reported는 화면이 place_id, source, picked만 보낸다).
import * as z from "zod";
import { isEnabled } from "@/lib/flags";
import { createServerSupabase } from "@/lib/supabase/server";
import type { MenuStat } from "./model";
import {
  groupMenus,
  reportMenu,
  setReviewMenu,
  type MenuDeps,
  type MenuWriteResult,
  type ReportMenuRequest,
  type SetReviewMenuRequest,
} from "./requests";

function readOn(): boolean {
  return isEnabled("menuReports");
}
function writeOn(): boolean {
  return isEnabled("auth") && isEnabled("menuReports");
}

const idsSchema = z.array(z.string().regex(/^[0-9]{1,20}$/)).min(1).max(60);

/** 식당별 메뉴 집계(최근 180일, 상위 3개). 실패하면 throw(쿼리가 오류 상태로) */
export async function placeMenusAction(
  placeIds: string[],
): Promise<Record<string, MenuStat[]>> {
  if (!readOn()) return {};
  const parsed = idsSchema.safeParse(placeIds);
  if (!parsed.success) return {};
  const supabase = await createServerSupabase();
  if (!supabase) throw new Error("load");
  const { data, error } = await supabase.rpc("place_menus", { p_place_ids: parsed.data });
  if (error) throw new Error("load");
  return groupMenus(data ?? []);
}

async function deps(): Promise<MenuDeps | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  return {
    async currentUserId() {
      // getUser는 Auth 서버에 토큰을 검증받는다(쿠키 값만 믿지 않는다)
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    async insert(row) {
      const { error } = await supabase.from("menu_reports").insert(row);
      return error;
    },
    async removeForReview(userId, reviewId) {
      const { error } = await supabase
        .from("menu_reports")
        .delete()
        .eq("user_id", userId)
        .eq("review_id", reviewId);
      return error;
    },
  };
}

/** 상세 "메뉴 알려주기" (MENU-02) */
export async function reportMenuAction(input: ReportMenuRequest): Promise<MenuWriteResult> {
  if (!writeOn()) return { ok: false, error: "disabled" };
  const d = await deps();
  if (!d) return { ok: false, error: "save" };
  try {
    return await reportMenu(input, d);
  } catch {
    return { ok: false, error: "save" };
  }
}

/** 식후 피드백의 먹은 메뉴 (MENU-01). 후기를 저장한 뒤 그 후기 id로 부른다 */
export async function setReviewMenuAction(
  input: SetReviewMenuRequest,
): Promise<MenuWriteResult> {
  if (!writeOn()) return { ok: false, error: "disabled" };
  const d = await deps();
  if (!d) return { ok: false, error: "save" };
  try {
    return await setReviewMenu(input, d);
  } catch {
    return { ok: false, error: "save" };
  }
}

const reviewIdSchema = z.string().uuid();

/** 내 후기에 붙은 메뉴(고치기 시트가 처음 값으로 쓴다). 없거나 꺼지면 null */
export async function myReviewMenuAction(
  reviewId: string,
): Promise<{ name: string; priceKrw: number } | null> {
  if (!writeOn() || !reviewIdSchema.safeParse(reviewId).success) return null;
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("menu_reports")
    .select("menu_name, price_krw")
    .eq("review_id", reviewId)
    .maybeSingle();
  if (error) throw new Error("load");
  return data ? { name: data.menu_name, priceKrw: data.price_krw } : null;
}
