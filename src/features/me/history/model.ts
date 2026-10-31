// 나 탭 기록 화면 모델 (T6.13, HIS-01~03, D-12, DESIGN.md 5장 "나 탭"). 순수 함수, React와 네트워크 의존 없음.
//
// - 날짜는 DB의 KST 날짜 키("YYYY-MM-DD")로만 계산한다(src/lib/time 규칙: Date 직접 비교 대신 키 차이).
// - 주 묶음은 월요일 시작(D-12 안건 2). 기록이 없는 주는 묶음을 만들지 않는다.
// - 이번 달 숫자(안건 10): 다녀온(visited) 방문만 센다. 평가 3개 미만이면 숫자 대신 문장, 0건이면 숨김.
//   이름 해석이 안 된 곳은 "자주 간 종류" 계산에서 빠진다(카테고리를 모른다).
// - 이름 해석 실패 대체(안건 6): 기록은 날짜와 끼니, 즐겨찾기는 "저장한 식당 N", 후기는 "남긴 후기 N"(날짜 중복을 피해 순번).
import { historyCopy as copy } from "@/copy/history";
import type { CategorySlug } from "@/features/place/categories";
import { dateKeyDiff, type Meal } from "@/lib/time";

/** 나 탭 세 탭. 주소 ?tab=으로 기억한다(기록은 기본이라 쓰지 않는다) */
export const ME_TABS = ["history", "places", "reviews"] as const;
export type MeTab = (typeof ME_TABS)[number];

export function parseMeTab(v: string | readonly string[] | undefined): MeTab {
  const s = typeof v === "string" ? v : v?.[0];
  return (ME_TABS as readonly string[]).includes(s ?? "")
    ? (s as MeTab)
    : "history";
}

export type Ymd = {
  readonly y: number;
  readonly m: number;
  readonly d: number;
};

const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDateKey(key: string): Ymd | null {
  const m = KEY_RE.exec(key);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

const toUtc = (k: Ymd) => Date.UTC(k.y, k.m - 1, k.d);

function fromUtc(ms: number): Ymd {
  const d = new Date(ms);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateKey(v: Ymd): string {
  return `${v.y}-${pad(v.m)}-${pad(v.d)}`;
}

/** 날짜 키에 n일 더하기(음수 가능) */
export function addDaysToKey(key: string, days: number): string {
  const v = parseDateKey(key);
  if (!v) return key;
  return toDateKey(fromUtc(toUtc(v) + days * 86_400_000));
}

/** 0 = 일요일 */
export function weekdayOfKey(key: string): number {
  const v = parseDateKey(key);
  return v ? new Date(toUtc(v)).getUTCDay() : 0;
}

/** 그 날이 속한 주의 월요일 */
export function mondayOf(key: string): string {
  const back = (weekdayOfKey(key) + 6) % 7;
  return addDaysToKey(key, -back);
}

export type WeekKind = "this" | "last" | "older";

export type WeekGroup<V> = {
  /** 그 주 월요일 날짜 키 */
  readonly key: string;
  readonly kind: WeekKind;
  readonly start: Ymd;
  readonly end: Ymd;
  readonly visits: readonly V[];
};

/**
 * 방문을 월요일 시작 주로 묶는다. 입력 순서(최신순)를 그대로 지킨다.
 * todayKey의 주가 "이번 주", 그 전 주가 "지난주", 나머지는 날짜 범위로 부른다.
 */
export function groupVisitsByWeek<V extends { readonly visitedOn: string }>(
  visits: readonly V[],
  todayKey: string,
): WeekGroup<V>[] {
  const thisMonday = mondayOf(todayKey);
  const groups = new Map<string, { kind: WeekKind; visits: V[] }>();
  for (const v of visits) {
    if (!parseDateKey(v.visitedOn)) continue;
    const key = mondayOf(v.visitedOn);
    let g = groups.get(key);
    if (!g) {
      const weeks = Math.round(dateKeyDiff(key, thisMonday) / 7);
      g = {
        kind: weeks <= 0 ? "this" : weeks === 1 ? "last" : "older",
        visits: [],
      };
      groups.set(key, g);
    }
    g.visits.push(v);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([key, g]) => ({
      key,
      kind: g.kind,
      start: parseDateKey(key)!,
      end: parseDateKey(addDaysToKey(key, 6))!,
      visits: g.visits,
    }));
}

export function weekTitle(
  g: Pick<WeekGroup<unknown>, "kind" | "start" | "end">,
): string {
  if (g.kind === "this") return copy.history.thisWeek;
  if (g.kind === "last") return copy.history.lastWeek;
  return copy.date.weekRange(g.start.m, g.start.d, g.end.m, g.end.d);
}

export function weekRangeLabel(
  g: Pick<WeekGroup<unknown>, "start" | "end">,
): string {
  return copy.date.weekRange(g.start.m, g.start.d, g.end.m, g.end.d);
}

/** "10월 22일" */
export function mdLabel(key: string): string {
  const v = parseDateKey(key);
  return v ? copy.date.md(v.m, v.d) : key;
}

/** "10월 방문" */
export function visitMonthLabel(key: string): string {
  const v = parseDateKey(key);
  return v ? copy.date.month(v.m) : "";
}

export function weekdayLabel(key: string): string {
  return copy.weekday[weekdayOfKey(key)] ?? "";
}

/* ---------- 이번 달 숫자 ---------- */

/** 이번 달 범위(1일~오늘, KST 날짜 키) */
export function monthRange(todayKey: string): { from: string; to: string } {
  return { from: `${todayKey.slice(0, 8)}01`, to: todayKey };
}

export type SummaryVisit = {
  readonly placeId: string;
  readonly visitedOn: string;
  readonly status: "candidate" | "visited" | "not_visited";
  readonly review: { readonly rating: "up" | "down" } | null;
};

export type MonthSummary = {
  readonly month: number;
  readonly visited: number;
  readonly rated: number;
  readonly up: number;
  /** 평가 3개 이상일 때만 숫자(%). 그 밖에는 null(문장으로 대신) */
  readonly upRate: number | null;
  /** 이름을 아는 곳 중 가장 많이 간 종류. 같으면 최근 방문 쪽 */
  readonly topCategory: CategorySlug | null;
};

/** 평가가 이보다 적으면 숫자 대신 한 줄 문장 (콜드 스타트 기준 3과 같다) */
export const SUMMARY_MIN_RATED = 3;

/** 이번 달 숫자 한 줄. 이번 달 다녀온 곳이 없으면 null(숨김) */
export function summarizeMonth(
  visits: readonly SummaryVisit[],
  todayKey: string,
  categoryOf: (placeId: string) => CategorySlug | null,
): MonthSummary | null {
  const prefix = todayKey.slice(0, 8);
  const month = parseDateKey(todayKey)?.m ?? 0;
  const inMonth = visits.filter(
    (v) => v.status === "visited" && v.visitedOn.startsWith(prefix),
  );
  if (inMonth.length === 0) return null;
  const rated = inMonth.filter((v) => v.review !== null);
  const up = rated.filter((v) => v.review?.rating === "up").length;
  const counts = new Map<CategorySlug, number>();
  // 최신순 입력이라 같은 수면 먼저 센(최근) 종류가 앞선다
  for (const v of inMonth) {
    const c = categoryOf(v.placeId);
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  let topCategory: CategorySlug | null = null;
  let best = 0;
  for (const [slug, n] of counts) {
    if (n > best) {
      best = n;
      topCategory = slug;
    }
  }
  return {
    month,
    visited: inMonth.length,
    rated: rated.length,
    up,
    upRate:
      rated.length >= SUMMARY_MIN_RATED
        ? Math.round((up / rated.length) * 100)
        : null,
    topCategory,
  };
}

/* ---------- 기록 "더 보기" ---------- */

/** useMyVisitHistory 한 쪽의 날짜 수(use-my-records.ts HISTORY_PAGE_DAYS와 같다) */
export function loadedFromKey(
  todayKey: string,
  pages: number,
  pageDays: number,
): string {
  return addDaysToKey(todayKey, -pages * pageDays + 1);
}

/** 불러온 쪽 바깥에 더 오래된 기록이 있는가. oldest는 가장 오래된 방문일(없으면 null) */
export function hasOlderVisits(
  oldest: string | null,
  todayKey: string,
  pages: number,
  pageDays: number,
): boolean {
  if (!oldest || pages === 0) return false;
  return oldest < loadedFromKey(todayKey, pages, pageDays);
}

/* ---------- 이름 해석 실패 대체 ---------- */

export function visitFallbackName(v: {
  visitedOn: string;
  meal: Meal;
}): string {
  return copy.unresolved.visit(mdLabel(v.visitedOn), copy.meal[v.meal]);
}

/** 순번은 1부터 */
export function savedFallbackName(index: number): string {
  return copy.unresolved.saved(index + 1);
}

/** 순번은 1부터 */
export function reviewFallbackName(index: number): string {
  return copy.unresolved.review(index + 1);
}

/* ---------- 화면에 남겨 두는 목록 ---------- */

/**
 * 서버 목록에 화면에서 바꾼 항목(빠졌어도 떠날 때까지 남길 것)을 합친다. 정렬 키 내림차순, id 중복 없음.
 * 즐겨찾기 끈 줄(안건 8), 해제한 다시 안 갈 곳, 지운 후기 줄이 다시 불러와도 그 자리에 남게 한다.
 */
export function mergeKept<T>(
  server: readonly T[],
  kept: readonly T[],
  idOf: (item: T) => string,
  sortKey: (item: T) => string,
): T[] {
  const ids = new Set(server.map(idOf));
  const out = [...server, ...kept.filter((k) => !ids.has(idOf(k)))];
  return out.sort((a, b) => {
    const ka = sortKey(a);
    const kb = sortKey(b);
    return ka < kb ? 1 : ka > kb ? -1 : 0;
  });
}
