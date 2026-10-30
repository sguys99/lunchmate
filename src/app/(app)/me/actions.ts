"use server";
// 나 탭 설정 서버 액션 (T4.23~T4.27, SET-01~05). 판단 흐름은 features/me/settings.ts(테스트 있음).
// - 사용자 세션(publishable 키 + 쿠키)으로 쓴다. RLS 본인 정책 + 열 단위 권한(T4.4 마이그레이션). service role 없음.
// - 입력은 zod strictObject로 다시 검사한다. 사무실은 핀 좌표(lat, lng)와 이름만 저장한다(T0.16, T0.18).
// - 서버 액션은 Next가 Origin 검사를 한다(CSRF). 설정 저장은 rate limit 대상이 아니다(CLAUDE.md 7장 목록 밖).
// - 성공하면 /me 아래 화면을 다시 그린다(revalidatePath).
import { revalidatePath } from "next/cache";
import {
  addOffice,
  deleteOffice,
  renameOffice,
  saveAvoid,
  saveCravings,
  saveNickname,
  savePrefs,
  setDefaultOffice,
  type SettingsDeps,
} from "@/features/me/settings";
import type {
  AddOfficeRequest,
  AvoidRequest,
  CravingRequest,
  CravingResult,
  DeleteOfficeResult,
  NicknameRequest,
  OfficeIdRequest,
  PrefsRequest,
  RenameOfficeRequest,
  SettingsResult,
} from "@/features/me/requests";
import { isEnabled } from "@/lib/flags";
import { createServerSupabase } from "@/lib/supabase/server";

type Supabase = NonNullable<Awaited<ReturnType<typeof createServerSupabase>>>;

function depsFor(supabase: Supabase): SettingsDeps {
  return {
    async currentUserId() {
      // getUser는 Auth 서버에 토큰을 검증받는다(쿠키 값만 믿지 않는다)
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    async updateNickname(userId, nickname) {
      const { data, error } = await supabase
        .from("profiles")
        .update({ nickname })
        .eq("user_id", userId)
        .select("user_id");
      return !error && data?.length === 1;
    },
    async listOffices(userId) {
      const { data, error } = await supabase
        .from("offices")
        .select("id, name, is_default, created_at")
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
    async insertOffice(userId, office) {
      const { error } = await supabase.from("offices").insert({
        user_id: userId,
        name: office.name,
        lat: office.lat,
        lng: office.lng,
      });
      if (!error) return "ok";
      return error.message.includes("offices_limit_exceeded")
        ? "limit"
        : "error";
    },
    async renameOffice(userId, id, name) {
      const { data, error } = await supabase
        .from("offices")
        .update({ name })
        .eq("user_id", userId)
        .eq("id", id)
        .select("id");
      return !error && data?.length === 1;
    },
    async setDefaultOffice(userId, id) {
      // 트리거(offices_switch_default)가 같은 사용자의 다른 기본을 한 요청 안에서 해제한다
      const { data, error } = await supabase
        .from("offices")
        .update({ is_default: true })
        .eq("user_id", userId)
        .eq("id", id)
        .select("id");
      return !error && data?.length === 1;
    },
    async deleteOffice(userId, id) {
      const { error } = await supabase
        .from("offices")
        .delete()
        .eq("user_id", userId)
        .eq("id", id);
      return !error;
    },
    async updatePrefs(userId, prefs) {
      const { data, error } = await supabase
        .from("preferences")
        .update({
          lunch_budget: prefs.lunch,
          dinner_budget: prefs.dinner,
          walk_minutes: prefs.walk,
        })
        .eq("user_id", userId)
        .select("user_id");
      return !error && data?.length === 1;
    },
    async listAvoid(userId) {
      const { data, error } = await supabase
        .from("avoid_rules")
        .select("id, kind, value")
        .eq("user_id", userId);
      if (error) throw error;
      return data.flatMap((r) =>
        r.kind === "food" || r.kind === "allergy" || r.kind === "custom"
          ? [{ id: r.id, kind: r.kind, value: r.value }]
          : [],
      );
    },
    async insertAvoid(userId, rows) {
      const { error } = await supabase
        .from("avoid_rules")
        .insert(rows.map((r) => ({ user_id: userId, ...r })));
      return !error;
    },
    async deleteAvoid(userId, ids) {
      const { error } = await supabase
        .from("avoid_rules")
        .delete()
        .eq("user_id", userId)
        .in("id", ids);
      return !error;
    },
    async readCravings(userId) {
      const { data, error } = await supabase
        .from("preferences")
        .select("craving_categories")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      return data.craving_categories;
    },
    async updateCravings(userId, categories) {
      const { data, error } = await supabase
        .from("preferences")
        .update({ craving_categories: categories })
        .eq("user_id", userId)
        .select("craving_until");
      if (error || data?.length !== 1) return undefined;
      return { until: data[0]?.craving_until ?? null };
    },
  };
}

/** 플래그, 연결 확인 → 흐름 실행 → 성공이면 /me 다시 그리기 */
async function run<R extends { ok: boolean }>(
  fn: (deps: SettingsDeps) => Promise<R>,
): Promise<R | { ok: false; error: "save" }> {
  if (!isEnabled("auth")) return { ok: false, error: "save" };
  const supabase = await createServerSupabase();
  if (!supabase) return { ok: false, error: "save" };
  const result = await fn(depsFor(supabase));
  if (result.ok) revalidatePath("/me", "layout");
  return result;
}

export async function saveNicknameAction(
  input: NicknameRequest,
): Promise<SettingsResult<{ nickname: string }>> {
  return run((deps) => saveNickname(input, deps));
}

export async function addOfficeAction(
  input: AddOfficeRequest,
): Promise<SettingsResult> {
  return run((deps) => addOffice(input, deps));
}

export async function renameOfficeAction(
  input: RenameOfficeRequest,
): Promise<SettingsResult> {
  return run((deps) => renameOffice(input, deps));
}

export async function setDefaultOfficeAction(
  input: OfficeIdRequest,
): Promise<SettingsResult> {
  return run((deps) => setDefaultOffice(input, deps));
}

export async function deleteOfficeAction(
  input: OfficeIdRequest,
): Promise<DeleteOfficeResult> {
  return run((deps) => deleteOffice(input, deps));
}

export async function savePrefsAction(
  input: PrefsRequest,
): Promise<SettingsResult> {
  return run((deps) => savePrefs(input, deps));
}

export async function saveAvoidAction(
  input: AvoidRequest,
): Promise<SettingsResult> {
  return run((deps) => saveAvoid(input, deps));
}

export async function saveCravingsAction(
  input: CravingRequest,
): Promise<CravingResult> {
  return run((deps) => saveCravings(input, deps));
}
