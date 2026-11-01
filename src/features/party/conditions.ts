// 회식 조건 (T7.25, T7.26, PARTY-01, PARTY-02, D-16 안건 1, 6). 순수 함수, React와 네트워크 의존 없음.
//
// - 조건 4개(인원, 1인 예산, 룸/단체석, 주류)만 이 기기 브라우저 저장소에 남긴다(D-16 안건 6).
//   장소 값(이름, 좌표, 카테고리)은 넣지 않는다(CLAUDE.md 7장). 저장소가 막혀 있으면 조용히 기억하지 않는다.
// - 기억된 조건이 없으면 첫 사용 질문 2개(인원, 예산)를 묻는다. 자리와 주류는 결과의 조건 문장에서 켠다.
// - 끼니는 저녁 고정, 거리는 도보 15분 고정(PARTY-02).
import { searchRadiusFromWalkMinutes } from "@/lib/format/number";

export type PartyConditions = {
  /** 2~40 (PARTY-01) */
  headcount: number;
  /** 1인 예산(원), 1만~10만, 5천 단위 */
  budget: number;
  room: boolean;
  alcohol: boolean;
};

export const HEADCOUNT_MIN = 2;
export const HEADCOUNT_MAX = 40;
export const BUDGET_MIN = 10_000;
export const BUDGET_MAX = 100_000;
export const BUDGET_STEP = 5_000;
/** 첫 질문의 빠른 선택(DESIGN.md 5장 "회식 모드", 3개 이하 원칙) */
export const QUICK_HEADCOUNTS = [4, 6, 10] as const;
export const QUICK_BUDGETS = [20_000, 30_000, 40_000] as const;
/** 회식 후보 수 (PARTY-03) */
export const PARTY_RESULT_COUNT = 5;
/** 투표 후보 수 (POLL-01) */
export const POLL_MIN_PLACES = 2;
/** 회식은 저녁 고정, 도보 15분 고정 (PARTY-02) */
export const PARTY_WALK_MINUTES = 15;
export const PARTY_RADIUS_M = searchRadiusFromWalkMinutes(PARTY_WALK_MINUTES);
/** 10명 이상이면 단체석 근거를 앞에 보인다 (D-16 안건 4) */
export const LARGE_GROUP = 10;

/** 처음 기본값(D-16 안건 6): 6명, 1인 3만 원, 자리와 주류 끔 */
export const DEFAULT_CONDITIONS: PartyConditions = {
  headcount: 6,
  budget: 30_000,
  room: false,
  alcohol: false,
};

export const PARTY_CONDITIONS_KEY = "lm.party.conditions.v1";

export function clampHeadcount(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_CONDITIONS.headcount;
  return Math.min(HEADCOUNT_MAX, Math.max(HEADCOUNT_MIN, Math.round(n)));
}

export function clampBudget(krw: number): number {
  if (!Number.isFinite(krw)) return DEFAULT_CONDITIONS.budget;
  const stepped = Math.round(krw / BUDGET_STEP) * BUDGET_STEP;
  return Math.min(BUDGET_MAX, Math.max(BUDGET_MIN, stepped));
}

/** 저장소 문자열 → 조건. 모양이 틀리면 null(첫 사용처럼 다시 묻는다) */
export function parseConditions(raw: string | null): PartyConditions | null {
  if (!raw) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  if (
    typeof o.headcount !== "number" ||
    typeof o.budget !== "number" ||
    typeof o.room !== "boolean" ||
    typeof o.alcohol !== "boolean"
  ) {
    return null;
  }
  return {
    headcount: clampHeadcount(o.headcount),
    budget: clampBudget(o.budget),
    room: o.room,
    alcohol: o.alcohol,
  };
}

/** 조건 4개만 문자열로. 다른 키를 끼워 넣지 않는다 */
export function serializeConditions(c: PartyConditions): string {
  return JSON.stringify({
    headcount: clampHeadcount(c.headcount),
    budget: clampBudget(c.budget),
    room: c.room,
    alcohol: c.alcohol,
  });
}

type KeyValueStore = Pick<Storage, "getItem" | "setItem">;

function storage(): KeyValueStore | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** 기억된 조건. 없거나 저장소를 못 쓰면 null */
export function readSavedConditions(
  store: KeyValueStore | null = storage(),
): PartyConditions | null {
  try {
    return parseConditions(store?.getItem(PARTY_CONDITIONS_KEY) ?? null);
  } catch {
    return null;
  }
}

/** 조건 기억. 저장소가 막혀 있으면 아무 일도 하지 않는다 */
export function saveConditions(
  c: PartyConditions,
  store: KeyValueStore | null = storage(),
): void {
  try {
    store?.setItem(PARTY_CONDITIONS_KEY, serializeConditions(c));
  } catch {
    // 사생활 보호 모드, 저장소 꽉 참: 기억하지 않고 계속한다
  }
}
