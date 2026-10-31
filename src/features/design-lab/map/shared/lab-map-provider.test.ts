import { describe, expect, it } from "vitest";
import {
  fitZoom,
  fromMeters,
  metersPerPx,
  toMeters,
  zoomForMetersPerPx,
} from "./lab-map-provider";

const O = { lat: 37.5665, lng: 126.978 };

describe("목업 지도 좌표", () => {
  it("m ↔ 위경도 왕복", () => {
    const m = { x: 120, y: -340 };
    const back = toMeters(O, fromMeters(O, m));
    expect(back.x).toBeCloseTo(m.x, 6);
    expect(back.y).toBeCloseTo(m.y, 6);
  });

  it("zoom이 한 단계 오르면 m/px가 절반", () => {
    expect(metersPerPx(17)).toBeCloseTo(metersPerPx(16) / 2);
    expect(zoomForMetersPerPx(metersPerPx(15.3))).toBeCloseTo(15.3);
  });

  it("fitZoom: 영역이 여백 안쪽에 다 들어온다", () => {
    const sw = fromMeters(O, { x: -500, y: 500 });
    const ne = fromMeters(O, { x: 500, y: -500 });
    const z = fitZoom(O, { sw, ne }, { width: 390, height: 780 }, 24);
    // 가로가 좁으므로 1000m가 390 - 48 = 342px에 맞는다
    expect(1000 / metersPerPx(z)).toBeCloseTo(342, 0);
  });
});
