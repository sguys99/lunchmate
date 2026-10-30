// 둘러보기에서 고른 값 이어받기 (T4.20).
//
// 결정 (2026-10-30)
// - 지금 둘러보기 화면(/today, T5)에는 고를 수 있는 값이 아직 없다. 그래서 이어받는 통로만 정한다.
// - 통로는 URL이다. 저장소(localStorage, sessionStorage, 쿠키)를 쓰지 않는다. 로그인은 제공자 페이지를 거치는
//   전체 이동이라 메모리 상태는 사라지고, 이미 있는 복귀 경로(next, HttpOnly 쿠키 lm_auth_next, sanitizeNext)가
//   로그인 → 약관 → 온보딩까지 그대로 이어지기 때문이다.
// - T5 둘러보기 화면은 로그인 유도 시트를 열 때 next에 아래 키를 붙인다. 예: /today?lunch=12000&walk=15&avoid=회,땅콩
// - 이어받는 값은 사용자 취향(예산, 도보 분, 기피 칩)뿐이다. 좌표(현위치, 검색, 지도 중심)와 카카오 장소 값은
//   받지 않는다(알 수 없는 키는 버림). 값은 범위와 칩 목록으로 다시 검사하고, 어긋나면 기본값을 쓴다.
// - 서버 저장 때도 zod로 다시 검사한다(schema.ts). 온보딩이 끝나면 next에서 이 키들을 지운다.
import {
  ALLERGY_CHIPS,
  FOOD_CHIPS,
  PREF_DEFAULTS,
  PREF_RANGES,
  WALK_OPTIONS,
  type AvoidChoice,
  type Prefs,
} from "./constants";

export const HANDOFF_KEYS = ["lunch", "dinner", "walk", "avoid"] as const;

export type GuestHandoff = { prefs: Prefs; avoid: AvoidChoice };

function splitNext(next: string): { path: string; params: URLSearchParams } {
  const q = next.indexOf("?");
  return q < 0
    ? { path: next, params: new URLSearchParams() }
    : {
        path: next.slice(0, q),
        params: new URLSearchParams(next.slice(q + 1)),
      };
}

function intIn(
  raw: string | null,
  r: { min: number; max: number; step: number },
  fallback: number,
): number {
  if (raw === null || !/^\d{1,6}$/.test(raw)) return fallback;
  const v = Number(raw);
  return v >= r.min && v <= r.max && (v - r.min) % r.step === 0 ? v : fallback;
}

/** next(이미 sanitizeNext를 거친 내부 경로)의 쿼리에서 둘러보기 값을 읽는다 */
export function readGuestHandoff(next: string): GuestHandoff {
  const { params } = splitNext(next);
  const walkRaw = intIn(
    params.get("walk"),
    PREF_RANGES.walk,
    PREF_DEFAULTS.walk,
  );
  const walk = (WALK_OPTIONS as readonly number[]).includes(walkRaw)
    ? walkRaw
    : PREF_DEFAULTS.walk;
  const chips = (params.get("avoid") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 16);
  const foods = (FOOD_CHIPS as readonly string[]).filter((c) =>
    chips.includes(c),
  );
  const allergies = (ALLERGY_CHIPS as readonly string[]).filter((c) =>
    chips.includes(c),
  );
  return {
    prefs: {
      lunch: intIn(params.get("lunch"), PREF_RANGES.lunch, PREF_DEFAULTS.lunch),
      dinner: intIn(
        params.get("dinner"),
        PREF_RANGES.dinner,
        PREF_DEFAULTS.dinner,
      ),
      walk,
    },
    // 직접 입력은 이어받지 않는다(URL에 자유 입력 문자열을 싣지 않음)
    avoid: { foods, allergies, custom: [] },
  };
}

/** 온보딩을 마친 뒤 갈 곳: next에서 이어받기 키만 지운다 */
export function stripGuestHandoff(next: string): string {
  const { path, params } = splitNext(next);
  for (const k of HANDOFF_KEYS) params.delete(k);
  const rest = params.toString();
  return rest ? `${path}?${rest}` : path;
}
