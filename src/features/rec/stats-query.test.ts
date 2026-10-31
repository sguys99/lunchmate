import { describe, expect, it, vi } from "vitest";

vi.mock("./stats-source", () => ({ fetchPlaceStats: vi.fn() }));

const { statsBatches, PLACE_STATS_BATCH } = await import("./stats-load");
const { placeStatsQuery } = await import("./stats-query");

describe("statsBatches", () => {
  it("중복을 빼고 정렬해 60곳씩 나눈다", () => {
    const ids = Array.from({ length: 130 }, (_, i) => String(1000 + (i % 125)));
    const b = statsBatches([...ids].reverse());
    expect(b.map((x) => x.length)).toEqual([
      PLACE_STATS_BATCH,
      PLACE_STATS_BATCH,
      5,
    ]);
    expect(b.flat()).toEqual([...new Set(ids)].sort());
  });

  it("같은 후보 집합이면 순서와 상관없이 같은 쿼리 키(다시 뽑기는 다시 읽지 않는다)", () => {
    expect(placeStatsQuery(["2", "1", "3"]).queryKey).toEqual(
      placeStatsQuery(["3", "2", "1", "1"]).queryKey,
    );
  });
});

describe("loadStatsRows", () => {
  it("묶음 결과를 합치고, 한 묶음이라도 실패하면 오류(화면은 중립값으로 계속)", async () => {
    const { fetchPlaceStats } = await import("./stats-source");
    const { loadStatsRows } = await import("./stats-load");
    const mock = vi.mocked(fetchPlaceStats);
    mock.mockResolvedValueOnce({ ok: true, rows: [] });
    await expect(loadStatsRows(["1"])).resolves.toEqual([]);
    mock.mockResolvedValueOnce({ ok: false });
    await expect(loadStatsRows(["1"])).rejects.toThrow();
  });

  it("응답이 늦으면 시간 초과로 실패한다", async () => {
    vi.useFakeTimers();
    const { fetchPlaceStats } = await import("./stats-source");
    const { loadStatsRows, STATS_TIMEOUT_MS } = await import("./stats-load");
    vi.mocked(fetchPlaceStats).mockReturnValueOnce(new Promise(() => {}));
    const p = loadStatsRows(["1"]);
    const assertion = expect(p).rejects.toThrow("place_stats_timeout");
    await vi.advanceTimersByTimeAsync(STATS_TIMEOUT_MS + 1);
    await assertion;
    vi.useRealTimers();
  });
});
