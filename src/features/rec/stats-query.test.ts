import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { PlaceStatsRow } from "./place-stats";

vi.mock("@/lib/read", () => ({ read: vi.fn() }));

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
    const { read } = await import("@/lib/read");
    const { loadStatsRows } = await import("./stats-load");
    const mock = vi.mocked(read);
    mock.mockResolvedValueOnce({ ok: true, rows: [] });
    await expect(loadStatsRows(["1"])).resolves.toEqual([]);
    mock.mockResolvedValueOnce({ ok: false });
    await expect(loadStatsRows(["1"])).rejects.toThrow();
  });

  it("응답이 늦으면 시간 초과로 실패한다", async () => {
    vi.useFakeTimers();
    const { read } = await import("@/lib/read");
    const { loadStatsRows, STATS_TIMEOUT_MS } = await import("./stats-load");
    vi.mocked(read).mockReturnValueOnce(new Promise(() => {}));
    const p = loadStatsRows(["1"]);
    const assertion = expect(p).rejects.toThrow("place_stats_timeout");
    await vi.advanceTimersByTimeAsync(STATS_TIMEOUT_MS + 1);
    await assertion;
    vi.useRealTimers();
  });
});

describe("loadHomeStats 카드 대기 상한", () => {
  const row = { place_id: "1" } as unknown as PlaceStatsRow;

  it("상한 안에 오면 받은 집계를 그대로 쓴다", async () => {
    const { read } = await import("@/lib/read");
    const { loadHomeStats } = await import("./stats-load");
    vi.mocked(read).mockResolvedValueOnce({
      ok: true,
      rows: [row],
      memos: {},
      menus: {},
    });
    await expect(loadHomeStats(["1"], false)).resolves.toMatchObject({
      rows: [row],
    });
  });

  it("상한을 넘기면 빈 집계(중립값)로 카드를 내고, 늦게 온 집계는 지도 캐시에만 넣는다", async () => {
    vi.useFakeTimers();
    const { read } = await import("@/lib/read");
    const { loadHomeStats, HOME_STATS_WAIT_MS } = await import("./stats-load");
    type Result = {
      ok: true;
      rows: PlaceStatsRow[];
      memos: Record<string, string>;
      menus: Record<string, never>;
    };
    let arrive: (v: Result) => void = () => {};
    vi.mocked(read).mockReturnValueOnce(
      new Promise<never>((r) => {
        arrive = r as unknown as (v: Result) => void;
      }),
    );
    const client = new QueryClient();
    const p = loadHomeStats(["1"], false, client);
    await vi.advanceTimersByTimeAsync(HOME_STATS_WAIT_MS + 1);
    await expect(p).resolves.toEqual({ rows: [], memos: {}, menus: {} });
    arrive({ ok: true, rows: [row], memos: {}, menus: {} });
    await vi.advanceTimersByTimeAsync(0);
    expect(client.getQueryData(["placeStats", "1"])).toEqual([row]);
    vi.useRealTimers();
  });
});
