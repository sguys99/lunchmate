import { describe, expect, it } from "vitest";
import { centerForFocus, circleBounds, fitWithInset } from "./fit";

const c = { lat: 37.5665, lng: 126.978 };

describe("지도 맞춤 (MAP-01)", () => {
  it("원 영역은 가운데를 중심으로 대칭이다", () => {
    const b = circleBounds(c, 515);
    expect((b.sw.lat + b.ne.lat) / 2).toBeCloseTo(c.lat, 6);
    expect((b.ne.lat - b.sw.lat) * 111_320).toBeCloseTo(1030, 0);
  });

  it("아래가 가리면(시트) 영역 가운데를 남쪽으로 내려 원이 위 칸에 보이게 한다", () => {
    const box = circleBounds(c, 515);
    const out = fitWithInset(box, { width: 390, height: 780 }, 24, {
      top: 64,
      bottom: 374,
    });
    const centerLat = (out.sw.lat + out.ne.lat) / 2;
    expect(centerLat).toBeLessThan(c.lat);
    // 넓힌 영역은 원 영역을 모두 품는다
    expect(out.sw.lat).toBeLessThan(box.sw.lat);
    expect(out.ne.lat).toBeGreaterThan(box.ne.lat);
  });

  it("겹침이 없으면 가운데가 그대로다", () => {
    const box = circleBounds(c, 515);
    const out = fitWithInset(box, { width: 800, height: 800 }, 24, {
      top: 0,
      bottom: 0,
    });
    expect((out.sw.lat + out.ne.lat) / 2).toBeCloseTo(c.lat, 6);
  });

  it("고른 식당은 보이는 칸 가운데로: 아래가 더 가리면 지도 가운데가 남쪽", () => {
    const bounds = circleBounds(c, 500);
    const out = centerForFocus(c, bounds, 800, { top: 64, bottom: 384 });
    expect(out.lat).toBeLessThan(c.lat);
    expect(out.lng).toBe(c.lng);
  });
});
