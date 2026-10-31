import { describe, expect, it } from "vitest";
import {
  addDaysToKey,
  groupVisitsByWeek,
  hasOlderVisits,
  mdLabel,
  mergeKept,
  mondayOf,
  monthRange,
  parseMeTab,
  reviewFallbackName,
  savedFallbackName,
  summarizeMonth,
  visitFallbackName,
  weekTitle,
  type SummaryVisit,
} from "./model";

// 2026-11-01은 일요일. 그 주 월요일은 10-26
const TODAY = "2026-11-01";

describe("주 묶음 (월요일 시작, D-12 안건 2)", () => {
  it("일요일은 그 주 월요일, 월요일은 자기 자신", () => {
    expect(mondayOf("2026-11-01")).toBe("2026-10-26");
    expect(mondayOf("2026-10-26")).toBe("2026-10-26");
    expect(mondayOf("2026-11-02")).toBe("2026-11-02");
    // 해 넘김
    expect(mondayOf("2027-01-01")).toBe("2026-12-28");
  });

  it("이번 주, 지난주, 그 전은 날짜 범위. 기록 없는 주는 묶음이 없다", () => {
    const visits = [
      { id: "a", visitedOn: "2026-10-30" },
      { id: "b", visitedOn: "2026-10-26" },
      { id: "c", visitedOn: "2026-10-23" },
      { id: "d", visitedOn: "2026-10-06" },
    ];
    const groups = groupVisitsByWeek(visits, TODAY);
    expect(
      groups.map((g) => [g.key, g.kind, g.visits.map((v) => v.id)]),
    ).toEqual([
      ["2026-10-26", "this", ["a", "b"]],
      ["2026-10-19", "last", ["c"]],
      ["2026-10-05", "older", ["d"]],
    ]);
    expect(weekTitle(groups[0]!)).toBe("이번 주");
    expect(weekTitle(groups[1]!)).toBe("지난주");
    expect(weekTitle(groups[2]!)).toBe("10월 5일~11일");
  });

  it("달이 걸친 주는 양쪽 달을 쓴다", () => {
    const [g] = groupVisitsByWeek([{ visitedOn: "2026-09-29" }], TODAY);
    expect(weekTitle(g!)).toBe("9월 28일~10월 4일");
  });

  it("형식이 틀린 날짜는 건너뛴다", () => {
    expect(groupVisitsByWeek([{ visitedOn: "bad" }], TODAY)).toEqual([]);
  });
});

describe("이번 달 숫자 (D-12 안건 10)", () => {
  const v = (
    visitedOn: string,
    status: SummaryVisit["status"],
    rating: "up" | "down" | null,
    placeId = "1",
  ): SummaryVisit => ({
    placeId,
    visitedOn,
    status,
    review: rating ? { rating } : null,
  });
  const none = () => null;

  it("이번 달 다녀온 곳이 없으면 null(숨김)", () => {
    expect(summarizeMonth([], TODAY, none)).toBeNull();
    expect(
      summarizeMonth(
        [v("2026-11-01", "candidate", null), v("2026-10-31", "visited", "up")],
        TODAY,
        none,
      ),
    ).toBeNull();
  });

  it("평가 3개 미만이면 upRate null(문장으로)", () => {
    const s = summarizeMonth(
      [v("2026-11-01", "visited", "up"), v("2026-11-01", "visited", null)],
      TODAY,
      none,
    );
    expect(s).toMatchObject({ visited: 2, rated: 1, up: 1, upRate: null });
  });

  it("평가 3개 이상이면 좋았어요 % (반올림), 안 갔어요와 확인 전은 세지 않는다", () => {
    const s = summarizeMonth(
      [
        v("2026-10-30", "visited", "up"),
        v("2026-10-29", "visited", "up"),
        v("2026-10-28", "visited", "down"),
        v("2026-10-27", "not_visited", null),
        v("2026-10-26", "candidate", null),
      ],
      "2026-10-31",
      none,
    );
    expect(s).toMatchObject({
      month: 10,
      visited: 3,
      rated: 3,
      up: 2,
      upRate: 67,
    });
  });

  it("자주 간 종류는 이름을 아는 곳만, 같은 수면 최근 쪽", () => {
    const cat = (id: string) =>
      id === "a" ? "ilsik" : id === "b" ? "hansik" : null;
    const s = summarizeMonth(
      [
        v("2026-11-01", "visited", "up", "b"),
        v("2026-11-01", "visited", "up", "a"),
        v("2026-11-01", "visited", "up", "x"),
        v("2026-11-01", "visited", "up", "x"),
      ],
      TODAY,
      cat,
    );
    expect(s?.topCategory).toBe("hansik");
    expect(
      summarizeMonth([v(TODAY, "visited", "up", "x")], TODAY, cat)?.topCategory,
    ).toBeNull();
  });

  it("이번 달 범위는 1일~오늘", () => {
    expect(monthRange("2026-11-01")).toEqual({
      from: "2026-11-01",
      to: "2026-11-01",
    });
    expect(monthRange("2026-10-31")).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
  });
});

describe("기록 더 보기 끝 판정 (D-12 안건 7)", () => {
  it("불러온 2주 밖에 더 오래된 방문이 있을 때만 더 있다", () => {
    // 1쪽 = 10-19~11-01
    expect(hasOlderVisits("2026-10-18", TODAY, 1, 14)).toBe(true);
    expect(hasOlderVisits("2026-10-19", TODAY, 1, 14)).toBe(false);
    expect(hasOlderVisits(null, TODAY, 1, 14)).toBe(false);
    expect(hasOlderVisits("2026-10-05", TODAY, 2, 14)).toBe(false);
    expect(hasOlderVisits("2026-10-04", TODAY, 2, 14)).toBe(true);
  });

  it("날짜 키 더하기는 달과 해를 넘긴다", () => {
    expect(addDaysToKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToKey("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("이름 해석 실패 대체 (D-12 안건 6, g6 6절)", () => {
  it("기록은 날짜와 끼니, 즐겨찾기와 후기는 순번", () => {
    expect(visitFallbackName({ visitedOn: "2026-10-22", meal: "lunch" })).toBe(
      "10월 22일 점심에 간 곳",
    );
    expect(visitFallbackName({ visitedOn: "2026-10-22", meal: "dinner" })).toBe(
      "10월 22일 저녁에 간 곳",
    );
    expect(savedFallbackName(6)).toBe("저장한 식당 7");
    expect(reviewFallbackName(2)).toBe("남긴 후기 3");
    expect(mdLabel("2026-01-05")).toBe("1월 5일");
  });
});

describe("화면에 남기는 목록", () => {
  it("서버에서 빠진 항목을 정렬 자리에 남기고 중복은 서버 쪽", () => {
    type P = { id: string; at: string; v: number };
    const server: P[] = [
      { id: "a", at: "3", v: 1 },
      { id: "c", at: "1", v: 1 },
    ];
    const kept: P[] = [
      { id: "b", at: "2", v: 0 },
      { id: "a", at: "3", v: 0 },
    ];
    const out = mergeKept(
      server,
      kept,
      (p) => p.id,
      (p) => p.at,
    );
    expect(out.map((p) => `${p.id}${p.v}`)).toEqual(["a1", "b0", "c1"]);
  });
});

describe("탭 주소", () => {
  it("모르는 값은 기록", () => {
    expect(parseMeTab("places")).toBe("places");
    expect(parseMeTab(["reviews"])).toBe("reviews");
    expect(parseMeTab("x")).toBe("history");
    expect(parseMeTab(undefined)).toBe("history");
  });
});
