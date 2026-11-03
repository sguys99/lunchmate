// 메모를 고친 뒤 캐시 맞추기 (T10.15): 홈 집계는 메모 표만 바뀌고 rows 참조와 지도 캐시는 그대로, 다시 읽지 않는다
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { placeUserStateKey } from "@/features/place/detail/user-state-key";
import { memoKeys } from "./keys";
import { applyMemo } from "./cache";

describe("applyMemo", () => {
  it("홈 집계의 memos만 바꾸고 rows는 같은 참조로 둔다", () => {
    const client = new QueryClient();
    const rows = [{ place_id: "1" }];
    const homeKey = ["placeStats", "1,2", "home-memos"];
    const mapKey = ["placeStats", "1,2"];
    client.setQueryData(homeKey, { rows, memos: { "2": "옛 메모" } });
    client.setQueryData(mapKey, rows);
    client.setQueryData(placeUserStateKey("1"), {
      signedIn: true,
      favorite: false,
      blocked: false,
      memo: null,
    });
    client.setQueryData(memoKeys.mine, { signedIn: true, memos: {} });
    client.setQueryData(memoKeys.favorites, []);

    applyMemo(client, "1", "깍두기");
    const home = client.getQueryData<{ rows: unknown; memos: object }>(homeKey);
    expect(home?.rows).toBe(rows);
    expect(home?.memos).toEqual({ "1": "깍두기", "2": "옛 메모" });
    expect(client.getQueryData(mapKey)).toBe(rows);
    expect(client.getQueryData(placeUserStateKey("1"))).toMatchObject({
      memo: "깍두기",
    });
    expect(client.getQueryData(memoKeys.mine)).toEqual({
      signedIn: true,
      memos: { "1": "깍두기" },
    });
    expect(client.getQueryData(memoKeys.favorites)).toBeUndefined();

    applyMemo(client, "2", null);
    expect(client.getQueryData<{ memos: object }>(homeKey)?.memos).toEqual({
      "1": "깍두기",
    });
  });
});
