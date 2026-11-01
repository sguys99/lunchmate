// 나 탭 시안 목업 (T6.2). 실제 데이터 모양을 따른다(supabase/migrations t5_14, 6단계 후기).
// - DB에서 오는 값: place_id, place_url, 방문일(KST), 끼니, 출처, 상태, 내 평가, 후기(가격, 태그, 글, 공개 여부)
// - 카카오에서 오는 값: 이름, 카테고리(세션 메모리, T5.12a). 못 찾으면 null이고 화면은 날짜나 순번 + 카카오맵 링크
// 날짜 계산은 시안용 순수 함수다(UTC 달력 산술, 실제 시각을 읽지 않음). 실제 화면은 src/lib/time을 쓴다.
import type { CategorySlug } from "@/features/place/categories";
import { getMockPlace, type MockPlaceId } from "@/features/design-lab/mock";

/** 시연 기준 오늘(KST). 금요일 */
export const MOCK_TODAY = { y: 2026, m: 10, d: 30 } as const;

export type Ymd = { y: number; m: number; d: number };
export type Meal = "lunch" | "dinner";
export type VisitSource = "rec" | "poll" | "map";
export type VisitStatus = "candidate" | "visited" | "not_visited";
export type Rating = "up" | "down";

export type PlaceRef = {
  placeId: string;
  placeUrl: string;
  /** 카카오 이름. null이면 해석 실패 */
  name: string | null;
  category: CategorySlug | null;
  /** 시안 지도 핀 위치 */
  pin: { left: string; top: string };
};

export type Visit = {
  id: string;
  date: Ymd;
  meal: Meal;
  source: VisitSource;
  status: VisitStatus;
  rating: Rating | null;
  place: PlaceRef;
};

export type MyReview = {
  id: string;
  date: Ymd;
  rating: Rating;
  priceKRW: number | null;
  tags: readonly string[];
  text: string | null;
  isPublic: boolean;
  place: PlaceRef;
};

export type SavedPlace = {
  place: PlaceRef;
  savedOn: Ymd;
  lastVisit: Ymd | null;
};

const KAKAO = "https://place.map.kakao.com/";

let pinSeed = 0;
const PINS = [
  { left: "38%", top: "40%" },
  { left: "58%", top: "34%" },
  { left: "46%", top: "58%" },
  { left: "66%", top: "52%" },
  { left: "30%", top: "62%" },
  { left: "52%", top: "24%" },
  { left: "72%", top: "68%" },
  { left: "24%", top: "30%" },
  { left: "62%", top: "78%" },
  { left: "42%", top: "74%" },
  { left: "78%", top: "38%" },
  { left: "34%", top: "48%" },
] as const;

function ref(
  placeId: string,
  name: string | null,
  category: CategorySlug | null,
): PlaceRef {
  const pin = PINS[pinSeed++ % PINS.length]!;
  return { placeId, placeUrl: `${KAKAO}${placeId}`, name, category, pin };
}

function mock(id: MockPlaceId, placeId: string): PlaceRef {
  const p = getMockPlace(id);
  return ref(placeId, p.name, p.category);
}

const P = {
  hansik: mock("mock-hansik", "1100000001"),
  asian: mock("mock-asian", "1100000002"),
  gukbap: mock("mock-gukbap", "1100000003"),
  yangsik: mock("mock-yangsik", "1100000004"),
  fastfood: mock("mock-fastfood", "1100000005"),
  ilsik: mock("mock-ilsik", "1100000006"),
  jungsik: mock("mock-jungsik", "1100000007"),
  salad: mock("mock-salad", "1100000008"),
  gogi: mock("mock-gogi", "1100000009"),
  bunsik: mock("mock-bunsik", "1100000010"),
  cafe: mock("mock-cafe", "1100000011"),
  pub: mock("mock-pub", "1100000012"),
  /** 기준점 주변 매칭에서도 찾지 못한 곳(사무실에서 멀거나 폐업) */
  lost: ref("1100000013", null, null),
  lost2: ref("1100000014", null, null),
  udon: ref("1100000015", "역전 우동집", "ilsik"),
} as const;

const ymd = (m: number, d: number, y = 2026): Ymd => ({ y, m, d });

let visitSeq = 0;
function v(
  date: Ymd,
  meal: Meal,
  source: VisitSource,
  status: VisitStatus,
  rating: Rating | null,
  place: PlaceRef,
): Visit {
  visitSeq += 1;
  return { id: `visit-${visitSeq}`, date, meal, source, status, rating, place };
}

/** 최신순. 이번 주 4건(후보 1), 지난주 4건(미해결 1), 그 전 4주 */
export const MOCK_VISITS: readonly Visit[] = [
  v(ymd(10, 30), "lunch", "rec", "candidate", null, P.hansik),
  v(ymd(10, 29), "lunch", "poll", "visited", "up", P.asian),
  v(ymd(10, 28), "lunch", "rec", "visited", "up", P.gukbap),
  v(ymd(10, 27), "lunch", "map", "not_visited", null, P.yangsik),
  v(ymd(10, 26), "dinner", "rec", "visited", "down", P.fastfood),
  v(ymd(10, 26), "lunch", "rec", "visited", "up", P.ilsik),
  v(ymd(10, 23), "lunch", "poll", "visited", "up", P.jungsik),
  v(ymd(10, 22), "lunch", "rec", "visited", "up", P.lost),
  v(ymd(10, 21), "lunch", "rec", "visited", "up", P.hansik),
  v(ymd(10, 20), "lunch", "map", "visited", "up", P.salad),
  v(ymd(10, 16), "lunch", "rec", "visited", "up", P.gukbap),
  v(ymd(10, 15), "dinner", "poll", "visited", "up", P.gogi),
  v(ymd(10, 14), "lunch", "rec", "visited", "down", P.bunsik),
  v(ymd(10, 13), "lunch", "rec", "visited", "up", P.hansik),
  v(ymd(10, 8), "lunch", "rec", "visited", "up", P.hansik),
  v(ymd(10, 6), "lunch", "map", "visited", "up", P.ilsik),
  v(ymd(9, 30), "lunch", "rec", "visited", "up", P.gukbap),
  v(ymd(9, 25), "lunch", "rec", "visited", "down", P.fastfood),
];

const MOCK_REVIEWS: readonly MyReview[] = [
  {
    id: "review-1",
    date: ymd(10, 28),
    rating: "up",
    priceKRW: 9000,
    tags: ["혼밥 OK", "15분 컷"],
    text: "국물이 진하고 회전이 빨라 점심에 딱 좋았습니다.",
    isPublic: true,
    place: P.gukbap,
  },
  {
    id: "review-2",
    date: ymd(10, 23),
    rating: "up",
    priceKRW: 8500,
    tags: ["단체석"],
    text: "짬뽕이 맵지 않고 양이 많아요. 여럿이 가기 좋습니다.",
    isPublic: true,
    place: P.jungsik,
  },
  {
    id: "review-3",
    date: ymd(10, 22),
    rating: "up",
    priceKRW: 10000,
    tags: ["조용함"],
    text: null,
    isPublic: true,
    place: P.lost,
  },
  {
    id: "review-4",
    date: ymd(10, 15),
    rating: "up",
    priceKRW: 12000,
    tags: ["룸 있음", "조용함"],
    text: "점심 불고기 정식이 든든했습니다. 팀 회식 자리로 기억해 둡니다.",
    isPublic: false,
    place: P.gogi,
  },
  {
    id: "review-5",
    date: ymd(10, 14),
    rating: "down",
    priceKRW: 6500,
    tags: [],
    text: "라볶이가 너무 달았어요.",
    isPublic: true,
    place: P.bunsik,
  },
  {
    id: "review-6",
    date: ymd(9, 30),
    rating: "up",
    priceKRW: 9000,
    tags: ["가성비"],
    text: "수육 반 접시를 나눠 먹기 좋았습니다.",
    isPublic: true,
    place: P.gukbap,
  },
];

/** 즐겨찾기 12곳(최근 저장순). 7번째는 이름 미해결 */
const MOCK_FAVORITES: readonly SavedPlace[] = [
  { place: P.gukbap, savedOn: ymd(10, 28), lastVisit: ymd(10, 28) },
  { place: P.asian, savedOn: ymd(10, 29), lastVisit: ymd(10, 29) },
  { place: P.jungsik, savedOn: ymd(10, 23), lastVisit: ymd(10, 23) },
  { place: P.hansik, savedOn: ymd(10, 21), lastVisit: ymd(10, 21) },
  { place: P.salad, savedOn: ymd(10, 20), lastVisit: ymd(10, 20) },
  { place: P.gogi, savedOn: ymd(10, 15), lastVisit: ymd(10, 15) },
  { place: P.lost2, savedOn: ymd(10, 10), lastVisit: null },
  { place: P.ilsik, savedOn: ymd(10, 6), lastVisit: ymd(10, 26) },
  { place: P.cafe, savedOn: ymd(10, 8), lastVisit: null },
  { place: P.pub, savedOn: ymd(9, 19), lastVisit: null },
  { place: P.yangsik, savedOn: ymd(9, 12), lastVisit: null },
  { place: P.udon, savedOn: ymd(9, 3), lastVisit: null },
];

const MOCK_BLOCKLIST: readonly SavedPlace[] = [
  { place: P.fastfood, savedOn: ymd(10, 26), lastVisit: ymd(10, 26) },
  { place: P.bunsik, savedOn: ymd(10, 14), lastVisit: ymd(10, 14) },
  { place: P.lost2, savedOn: ymd(9, 2), lastVisit: null },
];

/* ---------- 이름 해석 ---------- */

const unresolve = (p: PlaceRef): PlaceRef => ({
  ...p,
  name: null,
  category: null,
});

export type MeData = {
  visits: readonly Visit[];
  reviews: readonly MyReview[];
  favorites: readonly SavedPlace[];
  blocklist: readonly SavedPlace[];
};

/** names=fail이면 카카오 값(이름, 카테고리)을 모두 지운다 */
export function getMeData(namesFail: boolean): MeData {
  if (!namesFail) {
    return {
      visits: MOCK_VISITS,
      reviews: MOCK_REVIEWS,
      favorites: MOCK_FAVORITES,
      blocklist: MOCK_BLOCKLIST,
    };
  }
  return {
    visits: MOCK_VISITS.map((x) => ({ ...x, place: unresolve(x.place) })),
    reviews: MOCK_REVIEWS.map((x) => ({ ...x, place: unresolve(x.place) })),
    favorites: MOCK_FAVORITES.map((x) => ({ ...x, place: unresolve(x.place) })),
    blocklist: MOCK_BLOCKLIST.map((x) => ({ ...x, place: unresolve(x.place) })),
  };
}

/* ---------- 날짜 ---------- */

function utc({ y, m, d }: Ymd): number {
  return Date.UTC(y, m - 1, d);
}

const DAY = 86_400_000;

function fromUtc(ms: number): Ymd {
  const t = new Date(ms);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/** 0 일요일 ~ 6 토요일 */
export function weekdayOf(date: Ymd): number {
  return new Date(utc(date)).getUTCDay();
}

/** 그 주 월요일 */
export function weekStart(date: Ymd): Ymd {
  const w = weekdayOf(date);
  const back = (w + 6) % 7;
  return fromUtc(utc(date) - back * DAY);
}

function addDays(date: Ymd, days: number): Ymd {
  return fromUtc(utc(date) + days * DAY);
}

export type WeekGroup = {
  key: string;
  kind: "this" | "last" | "older";
  start: Ymd;
  end: Ymd;
  visits: Visit[];
};

/** 월요일 시작 주 단위로 묶는다(입력 순서 유지, 최신순 입력이면 최신 주부터) */
export function groupByWeek(visits: readonly Visit[], today: Ymd): WeekGroup[] {
  const thisStart = utc(weekStart(today));
  const groups: WeekGroup[] = [];
  for (const visit of visits) {
    const start = weekStart(visit.date);
    const key = `${start.y}-${start.m}-${start.d}`;
    let g = groups.find((x) => x.key === key);
    if (!g) {
      const diff = Math.round((thisStart - utc(start)) / (7 * DAY));
      g = {
        key,
        kind: diff === 0 ? "this" : diff === 1 ? "last" : "older",
        start,
        end: addDays(start, 6),
        visits: [],
      };
      groups.push(g);
    }
    g.visits.push(visit);
  }
  return groups;
}

/** 달력 칸(일요일 시작). 앞쪽 빈칸은 null */
export function monthGrid(y: number, m: number): (number | null)[] {
  const firstW = weekdayOf({ y, m, d: 1 });
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (number | null)[] = Array.from({ length: firstW }, () => null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/* ---------- 이번 달 요약 (C) ---------- */

type MonthStats = {
  /** 다녀온 곳(visited) 수 */
  visited: number;
  /** 평가를 남긴 수 */
  rated: number;
  up: number;
  /** 👍 비율. 평가 3개 미만이면 null(콜드 스타트 기준과 같은 3) */
  upRate: number | null;
  /** 이름을 아는 곳만 카테고리로 센다. 많은 순 최대 3 */
  topCategories: { slug: CategorySlug; count: number }[];
};

export function monthStats(
  visits: readonly Visit[],
  y: number,
  m: number,
): MonthStats {
  const inMonth = visits.filter(
    (x) => x.date.y === y && x.date.m === m && x.status === "visited",
  );
  const rated = inMonth.filter((x) => x.rating !== null);
  const up = rated.filter((x) => x.rating === "up").length;
  const counts = new Map<CategorySlug, number>();
  for (const x of inMonth) {
    if (x.place.category)
      counts.set(x.place.category, (counts.get(x.place.category) ?? 0) + 1);
  }
  const topCategories = [...counts.entries()]
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  return {
    visited: inMonth.length,
    rated: rated.length,
    up,
    upRate: rated.length >= 3 ? Math.round((up / rated.length) * 100) : null,
    topCategories,
  };
}
