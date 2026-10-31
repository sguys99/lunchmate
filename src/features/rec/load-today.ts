// 오늘(홈) 서버 데이터 (T5.15~T5.17). 서버 컴포넌트 전용, 사용자 세션(RLS 본인 정책)으로 읽는다.
//
// - 로그인: 사무실(핀 좌표), 예산과 도보 분, 못 먹는 음식, 요즘 땡겨요, 다시 안 갈 곳(blocklist place_id)을 읽는다.
//   피드백과 방문 기록(visits, 후기)은 6단계라 아직 넘기지 않는다(콜드 스타트).
// - 비로그인 둘러보기: 저장된 값이 없다. URL의 이어받기 값(T4.20: lunch, dinner, walk, avoid 칩)만 다시 검사해 쓴다.
// - 읽기에 실패하면 loadFailed(화면이 오류 안내와 다시 시도).
// 화면으로 넘기는 값은 사용자 자신의 값이다. 카카오 장소 값은 여기 없다(브라우저 세션 메모리에서만 받는다).
import "server-only";
import { connection } from "next/server";
import { PREF_DEFAULTS, type Prefs } from "@/features/onboarding/constants";
import { readGuestHandoff } from "@/features/onboarding/guest-handoff";
import { isEnabled } from "@/lib/flags";
import { createServerSupabase } from "@/lib/supabase/server";
import type { AvoidRule } from "@/lib/reco/types";
import type { OfficeOption } from "./base-location";

export type TodayData = {
  signedIn: boolean;
  offices: OfficeOption[];
  prefs: Prefs;
  avoid: AvoidRule[];
  craving: { categories: string[]; until: string | null };
  blocked: string[];
  /** 서버가 본 지금 시각(ISO). 첫 화면 날짜와 끼니를 서버 HTML과 맞춘다 */
  nowIso: string;
  loadFailed: boolean;
};

type Params = Record<string, string | string[] | undefined>;

function guestQuery(params: Params): string {
  const qs = new URLSearchParams();
  for (const key of ["lunch", "dinner", "walk", "avoid"] as const) {
    const v = params[key];
    const value = typeof v === "string" ? v : v?.[0];
    if (value !== undefined) qs.set(key, value);
  }
  return `/today?${qs.toString()}`;
}

function guestData(params: Params, nowIso: string): TodayData {
  const { prefs, avoid } = readGuestHandoff(guestQuery(params));
  return {
    signedIn: false,
    offices: [],
    prefs,
    avoid: [
      ...avoid.foods.map((value) => ({ kind: "food" as const, value })),
      ...avoid.allergies.map((value) => ({ kind: "allergy" as const, value })),
    ],
    craving: { categories: [], until: null },
    blocked: [],
    nowIso,
    loadFailed: false,
  };
}

export async function loadToday(params: Params): Promise<TodayData> {
  // supabase-js와 new Date()가 요청 시점 값임을 먼저 밝힌다(cacheComponents)
  await connection();
  const nowIso = new Date().toISOString();
  // 로그인이 닫힌 환경(flags.auth 꺼짐, 프로덕션)은 세션 쿠키가 남아 있어도 둘러보기로 본다(저장 경로가 모두 닫혀 있다)
  if (!isEnabled("auth")) return guestData(params, nowIso);
  const supabase = await createServerSupabase();
  if (!supabase) return guestData(params, nowIso);
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return guestData(params, nowIso);

  const [offices, prefs, avoid, blocked] = await Promise.all([
    supabase
      .from("offices")
      .select("id, name, is_default, lat, lng, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("preferences")
      .select(
        "lunch_budget, dinner_budget, walk_minutes, craving_categories, craving_until",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("avoid_rules").select("kind, value").eq("user_id", userId),
    supabase.from("blocklist").select("place_id").eq("user_id", userId),
  ]);

  const failed =
    Boolean(offices.error) ||
    Boolean(prefs.error) ||
    Boolean(avoid.error) ||
    Boolean(blocked.error);

  return {
    signedIn: true,
    offices: (offices.data ?? []).map((o) => ({
      id: o.id,
      name: o.name,
      isDefault: o.is_default,
      position: { lat: o.lat, lng: o.lng },
    })),
    prefs: prefs.data
      ? {
          lunch: prefs.data.lunch_budget,
          dinner: prefs.data.dinner_budget,
          walk: prefs.data.walk_minutes,
        }
      : { ...PREF_DEFAULTS },
    avoid: (avoid.data ?? []).flatMap((r) =>
      r.kind === "food" || r.kind === "allergy" || r.kind === "custom"
        ? [{ kind: r.kind, value: r.value }]
        : [],
    ),
    craving: {
      categories: prefs.data?.craving_categories ?? [],
      until: prefs.data?.craving_until ?? null,
    },
    blocked: (blocked.data ?? []).map((b) => b.place_id),
    nowIso,
    loadFailed: failed,
  };
}
