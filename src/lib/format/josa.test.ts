import { describe, expect, it } from "vitest";
import { withRo } from "./josa";

describe("withRo", () => {
  it("받침이 있으면 으로, 없거나 ㄹ이면 로", () => {
    expect(withRo("정담국밥")).toBe("정담국밥으로");
    expect(withRo("하루미 식당")).toBe("하루미 식당으로");
    expect(withRo("소담밥상")).toBe("소담밥상으로");
    expect(withRo("카페")).toBe("카페로");
    expect(withRo("사이공 골목")).toBe("사이공 골목으로");
    expect(withRo("서울")).toBe("서울로");
  });

  it("끝이 숫자면 읽는 소리로", () => {
    expect(withRo("식당1")).toBe("식당1로");
    expect(withRo("식당3")).toBe("식당3으로");
    expect(withRo("식당6")).toBe("식당6으로");
    expect(withRo("식당10")).toBe("식당10으로");
    expect(withRo("Cafe 9")).toBe("Cafe 9로");
  });

  it("영문 등 한글이 아니면 로", () => {
    expect(withRo("Cafe")).toBe("Cafe로");
    expect(withRo("")).toBe("로");
  });
});
