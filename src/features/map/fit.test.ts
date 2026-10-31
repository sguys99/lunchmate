import { describe, expect, it } from "vitest";
import type { Bounds, LatLng } from "@/lib/map/types";
import { centerForFocus, circleBounds, fitRadiusM, planFit } from "./fit";

const c = { lat: 37.5665, lng: 126.978 };
const M_PER_DEG_LAT = 111_320;

/** 네이버 지도처럼 확대 단계 z의 m/px(256px 타일 메르카토르) */
const naverMpp = (z: number, lat: number) =>
  (156_543.03 * Math.cos((lat * Math.PI) / 180)) / 2 ** z;
/** 단계 z, 가운데 center, 칸 크기에서 보이는 영역 */
function viewAt(center: LatLng, z: number, w: number, h: number): Bounds {
  const mpp = naverMpp(z, center.lat);
  const dLat = (h / 2) * (mpp / M_PER_DEG_LAT);
  const dLng =
    (w / 2) * (mpp / (M_PER_DEG_LAT * Math.cos((center.lat * Math.PI) / 180)));
  return {
    sw: { lat: center.lat - dLat, lng: center.lng - dLng },
    ne: { lat: center.lat + dLat, lng: center.lng + dLng },
  };
}

describe("지도 맞춤 (MAP-01)", () => {
  it("원 영역은 가운데를 중심으로 대칭이다", () => {
    const b = circleBounds(c, 515);
    expect((b.sw.lat + b.ne.lat) / 2).toBeCloseTo(c.lat, 6);
    expect((b.ne.lat - b.sw.lat) * 111_320).toBeCloseTo(1030, 0);
  });

  it("고른 식당은 보이는 칸 가운데로: 아래가 더 가리면 지도 가운데가 남쪽", () => {
    const bounds = circleBounds(c, 500);
    const out = centerForFocus(c, bounds, 800, { top: 64, bottom: 384 });
    expect(out.lat).toBeLessThan(c.lat);
    expect(out.lng).toBe(c.lng);
  });
});

describe("실기기 재현: 390x600 칸, 반쯤 시트, 도보 10분 원(515m) (2026-10-31)", () => {
  const size = { width: 390, height: 600 };
  const inset = { top: 64, bottom: 288 };
  const box = circleBounds(c, 515);
  const current = { zoom: 16, bounds: viewAt(c, 16, 390, 600) };
  // 보이는 칸: 위 64 ~ 아래 312, 여백 24를 빼면 200px. 원 1030m가 들어가려면 5.15m/px
  // 네이버 fitBounds는 내림해 14단계(7.6m/px), 원 지름 136px로 칸의 2/3였다(실측과 같다)

  it("정수 단계 공급자는 반올림해 원이 보이는 칸을 채운다(14가 아니라 15)", () => {
    const plan = planFit({
      box,
      size,
      pad: 24,
      inset,
      current,
      integerZoom: true,
    });
    expect(plan?.zoom).toBe(15);
    const diameterPx = 1030 / naverMpp(15, c.lat);
    const visible = size.height - inset.top - inset.bottom;
    expect(diameterPx).toBeGreaterThan(visible * 0.7);
    expect(diameterPx).toBeLessThan(visible * 1.42);
  });

  it("원 가운데가 보이는 칸 가운데(y=188)에 온다: 실제 단계의 m/px로 옮긴다", () => {
    const plan = planFit({
      box,
      size,
      pad: 24,
      inset,
      current,
      integerZoom: true,
    });
    if (!plan) throw new Error("plan");
    const view = viewAt(plan.center, plan.zoom, size.width, size.height);
    const y =
      ((view.ne.lat - c.lat) / (view.ne.lat - view.sw.lat)) * size.height;
    expect(y).toBeCloseTo((64 + (600 - 288)) / 2, 0);
  });

  it("소수 단계 공급자(디자인 랩 목업)는 계산한 단계를 그대로 쓴다", () => {
    const plan = planFit({
      box,
      size,
      pad: 24,
      inset,
      current,
      integerZoom: false,
    });
    expect(plan?.zoom).toBeGreaterThan(14.5);
    expect(plan?.zoom).toBeLessThan(14.6);
  });

  it("칸 크기를 모르면(마운트 직후 높이 0) 맞추지 않는다", () => {
    expect(
      planFit({
        box,
        size: { width: 390, height: 0 },
        pad: 24,
        inset,
        current,
        integerZoom: true,
      }),
    ).toBeNull();
  });

  it("아주 좁은 묶음은 0.2m/px보다 더 확대하지 않는다", () => {
    const tiny = circleBounds(c, 2);
    const plan = planFit({
      box: tiny,
      size,
      pad: 72,
      inset,
      current,
      integerZoom: true,
    });
    expect(naverMpp(plan!.zoom, c.lat)).toBeGreaterThanOrEqual(0.2);
  });
});

describe("맞출 반지름 (상한 45곳이 원 안쪽에 모일 때)", () => {
  const near = (m: number): { position: LatLng } => ({
    position: { lat: c.lat + m / M_PER_DEG_LAT, lng: c.lng },
  });

  it("상한이 아니면 걸어서 갈 수 있는 원 그대로", () => {
    expect(fitRadiusM(c, [near(100)], 515, false)).toBe(515);
  });

  it("상한이면 가장 먼 곳 + 10%로 좁힌다(강남역: 45곳 모두 160m 안)", () => {
    expect(fitRadiusM(c, [near(50), near(155)], 515, true)).toBe(180);
  });

  it("최소 120m, 최대 걷는 반경", () => {
    expect(fitRadiusM(c, [near(20)], 515, true)).toBe(120);
    expect(fitRadiusM(c, [near(700)], 515, true)).toBe(515);
    expect(fitRadiusM(c, [], 515, true)).toBe(515);
    expect(fitRadiusM(c, null, 515, true)).toBe(515);
  });
});
