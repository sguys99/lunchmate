// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Slider } from "./slider";

afterEach(cleanup);

const walk = (v: number) => `도보 ${v}분`;

describe("Slider", () => {
  it("라벨과 형식화한 현재 값을 보여 주고 손잡이에 같은 aria-valuetext를 준다", () => {
    render(
      <Slider
        label="거리"
        defaultValue={10}
        min={5}
        max={20}
        formatValue={walk}
      />,
    );
    // jsdom은 손잡이 위치를 재지 못해 visibility: hidden으로 남는다. 이름은 연결 속성으로 확인한다
    const thumb = screen.getByRole("slider", { hidden: true });
    const labelId = thumb.getAttribute("aria-labelledby") ?? "";
    expect(document.getElementById(labelId)).toHaveTextContent("거리");
    expect(thumb).toHaveAttribute("aria-valuetext", "도보 10분");
    expect(screen.getByText("도보 10분")).toHaveClass("type-numeric-md");
  });

  it("범위 슬라이더 값은 ~로 잇는다", () => {
    render(
      <Slider
        label="예산"
        defaultValue={[8000, 12000]}
        min={5000}
        max={20000}
        formatValue={(v) => `${v / 1000}천 원`}
      />,
    );
    expect(screen.getAllByRole("slider", { hidden: true })).toHaveLength(2);
    expect(screen.getByText("8천 원 ~ 12천 원")).toBeInTheDocument();
  });

  it("보이는 라벨이 없으면 thumbLabel이 손잡이 이름이 된다", () => {
    render(<Slider defaultValue={3} max={10} thumbLabel="허용 시간" />);
    expect(screen.getByRole("slider", { hidden: true })).toHaveAttribute(
      "aria-label",
      "허용 시간",
    );
  });
});
