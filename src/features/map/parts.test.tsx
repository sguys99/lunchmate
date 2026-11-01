// @vitest-environment jsdom
// 지도 마커와 목록 행의 할인 표시 (D-09 보강 2026-11-01, DEAL-02). 표시만, 묶음 알약에는 없다.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClusterPill, PlaceRow, WalkPill } from "./parts";
import type { MapPlace } from "./places";

afterEach(cleanup);

const place = (over: Partial<MapPlace> = {}): MapPlace => ({
  id: "1",
  placeUrl: "https://place.map.kakao.com/1",
  name: "정담국밥",
  category: "gukbap",
  address: "주소",
  phone: null,
  position: { lat: 37.5, lng: 127 },
  distanceM: 260,
  walkMinutes: 5,
  priceKRW: 9000,
  priceEstimate: false,
  thumbs: { up: 0, down: 0 },
  favorite: false,
  deal: false,
  ...over,
});

describe("지도 할인 표시", () => {
  it("할인이 있으면 알약 오른쪽 위 점과 이름의 할인 정보 있음", () => {
    const { container } = render(
      <WalkPill
        place={place({ deal: true })}
        selected={false}
        onSelect={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", {
        name: "정담국밥, 국밥/탕, 도보 약 5분, 할인 정보 있음",
      }),
    ).toBeInTheDocument();
    expect(container.querySelector("[data-deal-dot]")).not.toBeNull();
  });

  it("할인이 없으면 점도 이름 덧붙임도 없다", () => {
    const { container } = render(
      <WalkPill place={place()} selected onSelect={vi.fn()} />,
    );
    expect(
      screen.getByRole("button", { name: "정담국밥, 국밥/탕, 도보 약 5분" }),
    ).toBeInTheDocument();
    expect(container.querySelector("[data-deal-dot]")).toBeNull();
  });

  it("묶음 알약에는 점이 없다", () => {
    const { container } = render(<ClusterPill count={3} onOpen={vi.fn()} />);
    expect(container.querySelector("[data-deal-dot]")).toBeNull();
  });

  it("목록 행은 카드와 같은 할인 배지", () => {
    const { container, rerender } = render(
      <ul>
        <PlaceRow
          place={place({ deal: true })}
          selected={false}
          onSelect={vi.fn()}
        />
      </ul>,
    );
    expect(container.querySelector('[data-badge="deal"]')).not.toBeNull();
    rerender(
      <ul>
        <PlaceRow place={place()} selected={false} onSelect={vi.fn()} />
      </ul>,
    );
    expect(container.querySelector('[data-badge="deal"]')).toBeNull();
  });
});
