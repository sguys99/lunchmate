import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

const echo = vi.fn(async (...a: unknown[]) => ({ ok: true, a }));
const boom = vi.fn(async () => {
  throw new Error("load");
});
vi.mock("@/lib/read/table", () => ({ READS: { echo, boom } }));

const { POST } = await import("./route");

const call = (body: unknown) =>
  POST(
    new Request("http://x/api/read", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

describe("/api/read", () => {
  it("표의 함수에 인자를 그대로 넘기고 JSON으로 돌려준다", async () => {
    const res = await call({ fn: "echo", args: [["1", "2"], true] });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, a: [["1", "2"], true] });
  });

  it("표에 없는 이름, 프로토타입 이름, 배열이 아닌 인자는 404", async () => {
    for (const body of [
      { fn: "rateVisitAction", args: [] },
      { fn: "constructor", args: [] },
      { fn: "__proto__", args: [] },
      { fn: "echo", args: "x" },
      null,
    ]) {
      expect((await call(body)).status).toBe(404);
    }
  });

  it("함수가 던지면 500", async () => {
    expect((await call({ fn: "boom", args: [] })).status).toBe(500);
  });
});

describe("조회 표에는 쓰기 함수가 없다", () => {
  it("가져온 이름이 모두 조회 이름(my*, place*, fetch*, *Band, pollRoom, avoidFlags)", () => {
    const src = readFileSync(
      join(import.meta.dirname, "../../../lib/read/table.ts"),
      "utf8",
    );
    const names = [...src.matchAll(/^\s+(\w+),$/gm)].map((m) => m[1]!);
    expect(names.length).toBeGreaterThan(10);
    for (const n of names) {
      expect(n).toMatch(
        /^(my\w+|place(Stats|Reviews|Deals|Menus|UserState)Action|fetch\w+Stats|feedbackBandAction|pollRoomAction|avoidFlagsAction)$/,
      );
    }
  });
});
