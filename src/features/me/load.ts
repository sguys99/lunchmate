// 나 탭 화면 데이터 읽기 (T4.23~T4.27). 서버 컴포넌트 전용, 사용자 세션(RLS 본인 정책)으로 읽는다.
// 세션이 없으면 로그인으로 보낸다(proxy가 먼저 막지만 화면도 한 번 더 본다). 읽기 실패는 null(화면이 오류 상태).
import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { loginUrl } from "@/features/auth/routes";
import {
  ALLERGY_CHIPS,
  FOOD_CHIPS,
  type AvoidChoice,
  type Prefs,
} from "@/features/onboarding/constants";
import { createServerSupabase } from "@/lib/supabase/server";
import type { OfficeSummary } from "./offices";

export type MeSession = {
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabase>>>;
  userId: string;
};

/** 요청 시점 세션. 없으면 로그인 화면으로(돌아올 곳 next) */
export async function requireMeSession(next: string): Promise<MeSession> {
  // supabase-js 클라이언트가 만들어질 때 Date.now()를 읽는다. 요청 시점 렌더임을 먼저 밝힌다(cacheComponents)
  await connection();
  const supabase = await createServerSupabase();
  if (!supabase) redirect(loginUrl(next, "failed"));
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect(loginUrl(next));
  return { supabase, userId };
}

export type ProfileData = {
  nickname: string | null;
  /** 프로필 사진(허용 CDN만, profiles_avatar_url_host). 나 탭 머리 얼굴(T9.10) */
  avatar_url: string | null;
  provider: string | null;
  /** 서버에서만 읽는 본인 역할(T9.10). 관리자 화면 줄을 보일지 서버가 정한다 */
  role: "user" | "admin";
};

export async function loadProfile({
  supabase,
  userId,
}: MeSession): Promise<ProfileData | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("nickname, avatar_url, provider, role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return { ...data, role: data.role === "admin" ? "admin" : "user" };
}

export async function loadOffices({
  supabase,
  userId,
}: MeSession): Promise<OfficeSummary[] | null> {
  const { data, error } = await supabase
    .from("offices")
    .select("id, name, is_default, created_at")
    .eq("user_id", userId);
  return error ? null : data;
}

export type PreferencesData = Prefs & {
  cravings: string[];
  cravingUntil: string | null;
  /** 좋아하는 음식 slug (SET-06, D-39) */
  liked: string[];
};

export async function loadPreferences({
  supabase,
  userId,
}: MeSession): Promise<PreferencesData | null> {
  const { data, error } = await supabase
    .from("preferences")
    .select(
      "lunch_budget, dinner_budget, walk_minutes, craving_categories, craving_until, liked_categories",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    lunch: data.lunch_budget,
    dinner: data.dinner_budget,
    walk: data.walk_minutes,
    cravings: data.craving_categories,
    cravingUntil: data.craving_until,
    liked: data.liked_categories,
  };
}

/** 저장된 규칙을 화면 선택 값으로. 칩 목록에 없는 옛 값은 빼고 읽는다(다시 저장하면 지워짐) */
export async function loadAvoid({
  supabase,
  userId,
}: MeSession): Promise<AvoidChoice | null> {
  const { data, error } = await supabase
    .from("avoid_rules")
    .select("kind, value, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) return null;
  const foods = new Set<string>(FOOD_CHIPS);
  const allergies = new Set<string>(ALLERGY_CHIPS);
  return {
    foods: data
      .filter((r) => r.kind === "food" && foods.has(r.value))
      .map((r) => r.value),
    allergies: data
      .filter((r) => r.kind === "allergy" && allergies.has(r.value))
      .map((r) => r.value),
    custom: data.filter((r) => r.kind === "custom").map((r) => r.value),
  };
}

export type OfficePin = OfficeSummary & { lat: number; lng: number };

/**
 * 사무실과 핀 좌표 (T6.13 나 탭 기록). 기본 사무실은 장소 이름 해석의 기준점(T5.12a)과 상세 도보 분, 길찾기 출발지다.
 * 좌표는 사용자가 지도에 직접 놓은 핀이고 본인 화면에만 내려간다(CLAUDE.md 7장).
 */
export async function loadOfficePins({
  supabase,
  userId,
}: MeSession): Promise<OfficePin[] | null> {
  const { data, error } = await supabase
    .from("offices")
    .select("id, name, is_default, created_at, lat, lng")
    .eq("user_id", userId);
  return error ? null : data;
}
