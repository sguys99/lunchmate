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

  it("JSON 문자열, 앞에 ?가 없는 쿼리, 인코딩된 중첩 URL의 좌표를 가린다", () => {
    expect(scrubString('{"lat":37.5665,"lng":"126.978","q":1}')).toBe(
      `{"lat":"${FILTERED}","lng":"${FILTERED}","q":1}`,
    );
    expect(scrubString("x=126.978&y=37.5665&page=2")).toBe(
      `x=${FILTERED}&y=${FILTERED}&page=2`,
    );
    expect(scrubString("/login?next=%2Fmap%3Flat%3D37.5665%26tab%3D1")).toBe(
      `/login?next=%2Fmap%3Flat%3D${FILTERED}%26tab%3D1`,
    );
  });

  it("소수점 3자리 좌표 쌍과 한국 범위 단독 좌표 숫자 문자열을 가린다", () => {
    expect(scrubString("37.566,126.978")).toBe(FILTERED);
    expect(scrubString("moved 37.566535")).toBe(`moved ${FILTERED}`);
    expect(scrubString("126.9779692")).toBe(FILTERED);
    expect(scrubString("-37.566535")).toBe(FILTERED);
  });

  it("타임스탬프, 금액, 짧은 소수는 건드리지 않는다", () => {
    expect(scrubString("1730000000.123 1730000001.456")).toBe(
      "1730000000.123 1730000001.456",
    );
    expect(scrubString("37.5 126.9")).toBe("37.5 126.9");
    expect(scrubString("37.5665")).toBe("37.5665");
    expect(scrubString("12000원")).toBe("12000원");
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

  it("접미형 좌표 키를 가리고 비슷한 단어는 남긴다", () => {
    expect(
      scrubCoordinates({
        office_lat: 37.5,
        centerLng: 127,
        user_longitude: 1,
        flat: "yes",
        salon: "ok",
        origin: "office",
      }),
    ).toEqual({
      office_lat: FILTERED,
      centerLng: FILTERED,
      user_longitude: FILTERED,
      flat: "yes",
      salon: "ok",
      origin: "office",
    });
  });

  it("position은 정수(카드 순서)만 남기고 좌표 값은 가린다", () => {
    expect(scrubCoordinates({ position: 2 })).toEqual({ position: 2 });
    expect(scrubCoordinates({ position: 37.5665 })).toEqual({
      position: FILTERED,
    });
    expect(scrubCoordinates({ position: [37.5, 127.0] })).toEqual({
      position: FILTERED,
    });
  });

  it("[키, 값] 쌍 배열의 좌표 값을 가린다", () => {
    expect(
      scrubCoordinates([
        ["lat", "37.5"],
        ["q", "a"],
      ]),
    ).toEqual([
      ["lat", FILTERED],
      ["q", "a"],
    ]);
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
