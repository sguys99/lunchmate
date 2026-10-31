import { describe, expect, it } from "vitest";
import { boundsOf, groupMarkers, toScreenPx } from "./cluster";

// 가로 0.01도, 세로 0.01도를 1000px x 1000px에 그린 화면
const view = {
  bounds: { sw: { lat: 37.5, lng: 127 }, ne: { lat: 37.51, lng: 127.01 } },
  size: { width: 1000, height: 1000 },
};
// px → 위경도(테스트용)
const at = (x: number, y: number) => ({
  lat: 37.51 - (y / 1000) * 0.01,
  lng: 127 + (x / 1000) * 0.01,
});

describe("클러스터 묶기 (MAP-02)", () => {
  it("위경도를 칸 px로 옮긴다", () => {
    const p = toScreenPx(at(250, 750), view.bounds, view.size);
    expect(p.x).toBeCloseTo(250);
    expect(p.y).toBeCloseTo(750);
  });

  it("알약 상자(가로 52, 세로 36) 안에 겹치면 하나로 묶는다", () => {
    const groups = groupMarkers(
      [
        { id: "a", position: at(100, 100) },
        { id: "b", position: at(130, 110) },
        { id: "c", position: at(140, 120) },
        { id: "far", position: at(600, 600) },
      ],
      view,
    );
    expect(groups).toHaveLength(2);
    const cluster = groups.find((g) => g.kind === "cluster");
    expect(cluster && cluster.kind === "cluster" && cluster.ids).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(groups.some((g) => g.kind === "single" && g.id === "far")).toBe(
      true,
    );
  });

  it("가로로 52px 넘게 떨어지면 묶지 않는다", () => {
    const groups = groupMarkers(
      [
        { id: "a", position: at(100, 100) },
        { id: "b", position: at(160, 100) },
      ],
      view,
    );
    expect(groups.every((g) => g.kind === "single")).toBe(true);
  });

  it("고른 마커(keep)는 묶음에 넣지 않는다", () => {
    const groups = groupMarkers(
      [
        { id: "a", position: at(100, 100) },
        { id: "b", position: at(110, 100) },
      ],
      view,
      new Set(["a"]),
    );
    expect(groups).toEqual([
      { kind: "single", id: "a" },
      { kind: "single", id: "b" },
    ]);
  });

  it("묶음 위치는 구성원 평균이다", () => {
    const groups = groupMarkers(
      [
        { id: "a", position: at(100, 100) },
        { id: "b", position: at(120, 100) },
      ],
      view,
    );
    const g = groups[0];
    expect(g?.kind).toBe("cluster");
    if (g?.kind === "cluster") {
      expect(g.position.lng).toBeCloseTo(at(110, 100).lng);
    }
  });

  it("화면 크기를 모르면 묶지 않는다", () => {
    const groups = groupMarkers(
      [
        { id: "a", position: at(100, 100) },
        { id: "b", position: at(101, 100) },
      ],
      null,
    );
    expect(groups.every((g) => g.kind === "single")).toBe(true);
  });

  it("영역은 구성원을 감싼다", () => {
    expect(boundsOf([at(0, 0), at(100, 200)])).toEqual({
      sw: at(0, 200),
      ne: at(100, 0),
    });
  });
});
