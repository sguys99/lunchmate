import { describe, expect, it } from "vitest";
import { FILTERED, scrubCoordinates, scrubString } from "./scrub";

describe("scrubString", () => {
  it("URL 쿼리의 좌표 파라미터를 가리고 나머지는 보존한다", () => {
    expect(scrubString("/map?lat=37.5665&lng=126.9780&q=김치찌개")).toBe(
      `/map?lat=${FILTERED}&lng=${FILTERED}&q=김치찌개`,
    );
    expect(scrubString("https://x.kr/a?x=127.02&y=37.49#top")).toBe(
      `https://x.kr/a?x=${FILTERED}&y=${FILTERED}#top`,
    );
  });

  it("위경도 숫자 쌍을 가린다", () => {
    expect(scrubString("현위치 37.5665, 126.9780 에서")).toBe(
      `현위치 ${FILTERED} 에서`,
    );
    expect(scrubString("37.56650,126.97800")).toBe(FILTERED);
    expect(scrubString("37.5665%2C126.9780")).toBe(FILTERED);
    expect(scrubString("-33.8688/151.2093")).toBe(FILTERED);
  });

  it("좌표가 아닌 숫자는 건드리지 않는다", () => {
    expect(scrubString("v1.2.3")).toBe("v1.2.3");
    expect(scrubString("가격 12.5 와 3.14")).toBe("가격 12.5 와 3.14");
    expect(scrubString("/poll/abcdef1234?tab=votes")).toBe(
      "/poll/abcdef1234?tab=votes",
    );
    expect(scrubString("")).toBe("");
  });
});

describe("scrubCoordinates", () => {
  it("좌표 키의 값을 통째로 가린다", () => {
    const out = scrubCoordinates({
      lat: 37.5,
      lng: 127,
      latitude: 1,
      Longitude: 2,
      x: 1,
      y: 2,
      coords: { a: 1 },
      keep: "ok",
    });
    expect(out).toEqual({
      lat: FILTERED,
      lng: FILTERED,
      latitude: FILTERED,
      Longitude: FILTERED,
      x: FILTERED,
      y: FILTERED,
      coords: FILTERED,
      keep: "ok",
    });
  });

  it("중첩 객체, 배열, 문자열 값 안의 좌표를 가린다", () => {
    const event = {
      request: { url: "https://a.kr/?lat=37.1&lng=127.1" },
      breadcrumbs: [
        { message: "move to 37.5665, 126.9780", data: { position: [1, 2] } },
      ],
      extra: { deep: { a: { latitude: 37.5 } } },
    };
    const out = scrubCoordinates(event);
    expect(JSON.stringify(out)).not.toMatch(/37\.\d|126\.\d|127\.\d/);
    expect(out.request.url).toContain(`lat=${FILTERED}`);
  });

  it("입력을 바꾸지 않는다", () => {
    const input = { lat: 37.5, url: "/m?lat=37.5" };
    scrubCoordinates(input);
    expect(input).toEqual({ lat: 37.5, url: "/m?lat=37.5" });
  });

  it("순환 참조와 깊은 중첩에서 터지지 않는다", () => {
    const a: Record<string, unknown> = { name: "a" };
    a.self = a;
    expect(() => scrubCoordinates(a)).not.toThrow();
    let deep: Record<string, unknown> = {};
    const root = deep;
    for (let i = 0; i < 50; i++) {
      deep.n = {};
      deep = deep.n as Record<string, unknown>;
    }
    expect(() => scrubCoordinates(root)).not.toThrow();
  });

  it("원시값, null, Date, Error는 그대로 통과한다", () => {
    const d = new Date();
    const e = new Error("x");
    expect(scrubCoordinates(null)).toBeNull();
    expect(scrubCoordinates(3)).toBe(3);
    expect(scrubCoordinates(d)).toBe(d);
    expect(scrubCoordinates(e)).toBe(e);
  });
});
