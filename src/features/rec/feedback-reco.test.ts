// 피드백 → 다음 추천 E2E(e2e/feedback-reco.spec.ts, T6.30)가 쓰는 seed의 전제를 엔진으로 묶어 둔다.
// 가짜 카카오 45곳(e2e/helpers/kakao-places-fake.ts)과 같은 후보, 기본 설정(점심 1만, 저녁 2만, 도보 10분)에서
// 하루 중 어느 시각이든 점심, 저녁 모두 아래가 성립해야 E2E가 결정적이다. 가중치나 가짜 후보를 바꿔 실패하면 seed를 다시 고른다.
import { describe, expect, test } from "vitest";
import { drawDeck } from "./deck";
import { toCandidates } from "./candidates";
import { toVisits, type HistoryRow } from "./history";
import { kakaoCategorySlug } from "./kakao-category";

const CATEGORIES = [
  "음식점 > 한식 > 국밥",
  "음식점 > 중식 > 중화요리",
  "음식점 > 일식 > 초밥,롤",
  "음식점 > 양식 > 이탈리안",
  "음식점 > 분식",
  "음식점 > 아시아음식 > 베트남음식",
  "음식점 > 패스트푸드 > 햄버거",
  "음식점 > 샐러드",
  "음식점 > 한식 > 육류,고기 > 삼겹살",
  "음식점 > 한식 > 한정식",
];
const places = Array.from({ length: 45 }, (_, i) => ({
  id: String(9_100_000 + i),
  name: `테스트식당${i + 1}`,
  categoryName: CATEGORIES[i % CATEGORIES.length]!,
  address: "",
  position: { lat: 0, lng: 0 },
  distance: 30 + Math.round((i * 470) / 44),
  placeUrl: "",
}));
const candidates = toCandidates(places, { lat: 0, lng: 0 });
const categoryOf = (id: string) => {
  const p = places.find((x) => x.id === id);
  return p ? kakaoCategorySlug(p.categoryName) : null;
};

const SEED_DOWN = 2 ** 30 + 2;
const SEED_UP = 2 ** 30 + 5;
const SALAD = places[7]!.id;
const PASTA = places[3]!.id;

/** KST 2026-11-02 00:10 + hours */
const nowAt = (hours: number) =>
  new Date(Date.UTC(2026, 10, 1, 15, 10) + hours * 3_600_000);
/** now 기준 KST days일 전 날짜 키 */
const kstKey = (now: Date, days: number) =>
  new Date(now.getTime() + 9 * 3_600_000 - days * 86_400_000)
    .toISOString()
    .slice(0, 10);

type Row = {
  id: string;
  ago: number;
  status: HistoryRow["status"];
  rating: HistoryRow["rating"];
};

function deck(meal: "lunch" | "dinner", now: Date, rows: Row[], seed: number) {
  const history = {
    visits: toVisits(
      rows.map((r) => ({
        placeId: r.id,
        visitedOn: kstKey(now, r.ago),
        status: r.status,
        rating: r.rating,
      })),
      categoryOf,
    ),
    blocked: new Set<string>(),
  };
  const settings = {
    meal,
    budgetKRW: meal === "lunch" ? 10_000 : 20_000,
    walkMinutes: 10,
    avoid: [],
    craving: { categories: [], until: null },
  };
  return drawDeck(
    { candidates, settings, history, seen: new Set(), now },
    seed,
  ).result.picks.map((p) => p.candidate.id);
}

const cases = (["lunch", "dinner"] as const).flatMap((meal) =>
  [0, 6, 12, 18, 23].map((h) => ({ meal, h })),
);

describe("T6.30 E2E seed 전제", () => {
  test.each(cases)("$meal, $h시", ({ meal, h }) => {
    const now = nowAt(h);
    const open: Row[] = [
      { id: SALAD, ago: 4, status: "candidate", rating: null },
      { id: PASTA, ago: 4, status: "candidate", rating: null },
    ];
    const base = deck(meal, now, open, SEED_DOWN);
    expect(base).toContain(SALAD);
    // 반복 창 밖 안 갔어요: 묶음 그대로(FB-05)
    const skipped = deck(
      meal,
      now,
      [open[0]!, { ...open[1]!, status: "skipped" }],
      SEED_DOWN,
    );
    expect(skipped).toEqual(base);
    // 👎: 상위 10곳 밖이라 어떤 seed에서도 첫 묶음에 없다
    for (let s = 0; s < 200; s++) {
      const down = deck(
        meal,
        now,
        [
          { id: SALAD, ago: 4, status: "visited", rating: "down" },
          { ...open[1]!, status: "skipped" },
        ],
        SEED_DOWN + s,
      );
      expect(down).not.toContain(SALAD);
    }
    // 👍: 기준에 없던 곳이 큰 카드로
    expect(deck(meal, now, [open[0]!], SEED_UP)).not.toContain(SALAD);
    expect(
      deck(
        meal,
        now,
        [{ id: SALAD, ago: 4, status: "visited", rating: "up" }],
        SEED_UP,
      )[0],
    ).toBe(SALAD);
    // 홈 띠: 어제 답 없는 방문은 반복 감점으로 빠지고, 안 갔어요 뒤에는 돌아온다
    const yesterday: Row = {
      id: SALAD,
      ago: 1,
      status: "candidate",
      rating: null,
    };
    expect(deck(meal, now, [yesterday], SEED_DOWN)).not.toContain(SALAD);
    expect(
      deck(meal, now, [{ ...yesterday, status: "skipped" }], SEED_DOWN),
    ).toContain(SALAD);
  });
});
