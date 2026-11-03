// 오늘(홈) 서버 데이터 (T5.15~T5.17). 서버 컴포넌트 전용, 사용자 세션(RLS 본인 정책)으로 읽는다.
//
// - 로그인: 사무실(핀 좌표), 예산과 도보 분, 못 먹는 음식, 요즘 땡겨요, 다시 안 갈 곳(blocklist place_id),
//   최근 90일 방문 기록과 내 평가(visits + reviews.rating, T6.11)를 읽는다. 방문 기록 읽기가 실패하면
//   오류 화면 대신 빈 기록(콜드 스타트)으로 추천한다.
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
import { FEEDBACK_LOOKBACK_DAYS } from "@/lib/reco/constants";
import { addKstDays, kstDateKey } from "@/lib/time";
import type { OfficeOption } from "./base-location";
import { ratingOf, visitStatusOf, type HistoryRow } from "./history";

export type TodayData = {
  signedIn: boolean;
  offices: OfficeOption[];
  prefs: Prefs;
  avoid: AvoidRule[];
  craving: { categories: string[]; until: string | null };
  /** 좋아하는 음식 slug (ONB-06, D-39). 비로그인이면 빈 배열 */
  liked: string[];
  /**
   * 홈 취향 띠(D-39) 판정 재료. 비로그인이면 null.
   * joinedAt은 preferences 행을 만든 시각(가입 시각), dismissedAt은 띠를 닫은 시각
   */
  tastePrompt: { joinedAt: string; dismissedAt: string | null } | null;
  blocked: string[];
  /** 최근 방문 기록과 내 평가(선호 P, 반복 R). 비로그인이면 빈 배열 */
  history: HistoryRow[];
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
    liked: [],
    tastePrompt: null,
    blocked: [],
    history: [],
    nowIso,
    loadFailed: false,
  };
}

type VisitRow = {
  place_id: string;
  visited_on: string;
  status: string;
  reviews: { rating: string } | { rating: string }[] | null;
};

function historyRows(rows: readonly VisitRow[]): HistoryRow[] {
  return rows.flatMap((r) => {
    const status = visitStatusOf(r.status);
    if (status === null) return [];
    const review = Array.isArray(r.reviews) ? r.reviews[0] : r.reviews;
    return [
      {
        placeId: r.place_id,
        visitedOn: r.visited_on,
        status,
        rating: ratingOf(review?.rating),
      },
    ];
  });
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

  const since = kstDateKey(
    addKstDays(new Date(nowIso), -FEEDBACK_LOOKBACK_DAYS),
  );
  const [offices, prefs, avoid, blocked, visits] = await Promise.all([
    supabase
      .from("offices")
      .select("id, name, is_default, lat, lng, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("preferences")
      .select(
        "lunch_budget, dinner_budget, walk_minutes, craving_categories, craving_until, liked_categories, taste_prompt_dismissed_at, created_at",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("avoid_rules").select("kind, value").eq("user_id", userId),
    supabase.from("blocklist").select("place_id").eq("user_id", userId),
    supabase
      .from("visits")
      .select("place_id, visited_on, status, reviews(rating)")
      .eq("user_id", userId)
      .gte("visited_on", since)
      .order("visited_on", { ascending: false })
      .limit(300),
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
    liked: prefs.data?.liked_categories ?? [],
    tastePrompt: prefs.data
      ? {
          joinedAt: prefs.data.created_at,
          dismissedAt: prefs.data.taste_prompt_dismissed_at,
        }
      : null,
    blocked: (blocked.data ?? []).map((b) => b.place_id),
    history: visits.error ? [] : historyRows(visits.data ?? []),
    nowIso,
    loadFailed: failed,
  };
}
