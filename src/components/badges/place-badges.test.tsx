// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { badgeCopy } from "@/copy/badges";
import {
  AvoidWarningBadge,
  DealBadge,
  EstimateBadge,
  PlaceBadges,
  ReportBadge,
  WaitingBadge,
} from "./place-badges";

afterEach(cleanup);

/** sr-only 이름으로 배지 루트(data-badge)를 찾는다 */
function badgeOf(srLabel: string) {
  const sr = screen
    .getAllByText(srLabel)
    .find((node) => node.classList.contains("sr-only"));
  const el = sr?.closest("[data-badge]");
  if (!el) throw new Error(`badge not found: ${srLabel}`);
  return el as HTMLElement;
}

describe("도메인 배지 라벨과 접근성 이름", () => {
  it.each([
    [<EstimateBadge key="e" />, "추정", "추정 가격", "border-warning"],
    [<ReportBadge key="r" />, "제보", "사용자 제보", "border-info"],
    [<DealBadge key="d" />, "할인", "할인 정보 있음", "border-info"],
    [
      <AvoidWarningBadge key="a" />,
      "못 먹는 분 있음",
      "못 먹는 분 있음",
      "border-warning",
    ],
  ])(
    "%#: 보이는 글자, sr-only 이름, 의미 색 테두리",
    (node, label, sr, border) => {
      const { container } = render(node);
      const visible = container.querySelector("[aria-hidden='true']:not(svg)");
      expect(visible?.textContent).toBe(label);
      const badge = badgeOf(sr);
      expect(badge.className).toContain(border);
      expect(badge.className).toContain("bg-transparent");
      // 보이는 라벨이 접근성 이름 안에 들어 있다(label in name)
      expect(sr).toContain(label);
    },
  );

  it("기피 경고는 이모지 대신 아이콘을 쓰고, 라벨에 기호가 없다", () => {
    const { container } = render(<AvoidWarningBadge />);
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(container.textContent).not.toMatch(/⚠/);
  });
});

describe("WaitingBadge", () => {
  it.each([
    ["walkIn", "바로 입장", "border-success"],
    ["short", "조금 기다려요", "border-warning"],
    ["long", "줄 길어요", "border-warning"],
  ] as const)("%s: PRD 3단계 이름과 아이콘", (level, label, border) => {
    const { container } = render(<WaitingBadge level={level} />);
    const badge = badgeOf(`웨이팅 ${label}`);
    expect(badge.className).toContain(border);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("단계마다 아이콘이 달라 색만으로 구분하지 않는다", () => {
    const icons = (["walkIn", "short", "long"] as const).map((level) => {
      const { container, unmount } = render(<WaitingBadge level={level} />);
      const cls = container.querySelector("svg")?.getAttribute("class") ?? "";
      unmount();
      return cls;
    });
    expect(new Set(icons).size).toBe(3);
  });

  it("minutesAgo가 있으면 '12분 전, 줄 길어요'", () => {
    render(<WaitingBadge level="long" minutesAgo={12} />);
    expect(screen.getByText("웨이팅 12분 전, 줄 길어요")).toBeInTheDocument();
    expect(screen.getByText("12분 전, 줄 길어요")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});

describe("툴팁", () => {
  it("withTooltip이면 포커스를 받고, 열리면 설명 문장을 보여준다", async () => {
    render(
      <TooltipProvider delay={0}>
        <DealBadge withTooltip />
      </TooltipProvider>,
    );
    const badge = badgeOf("할인 정보 있음");
    expect(badge).toHaveAttribute("tabindex", "0");
    fireEvent.mouseEnter(badge);
    fireEvent.pointerMove(badge);
    expect(
      await screen.findByText(badgeCopy.descriptions.deal),
    ).toBeInTheDocument();
  });

  it("기본은 툴팁 없이 포커스도 받지 않는다", () => {
    render(<EstimateBadge />);
    expect(badgeOf("추정 가격")).not.toHaveAttribute("tabindex");
  });
});

describe("PlaceBadges", () => {
  it("후보가 많아도 카드에는 우선순위 2개만, 추정은 배지 줄에서 빠진다", () => {
    render(
      <PlaceBadges
        badges={[
          { kind: "deal" },
          { kind: "report" },
          { kind: "waiting", level: "long", minutesAgo: 5 },
          { kind: "estimate" },
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("웨이팅 5분 전, 줄 길어요");
    expect(items[1]).toHaveTextContent("할인 정보 있음");
    expect(screen.queryByText("추정 가격")).not.toBeInTheDocument();
  });

  it("추정만 있으면 배지 줄을 그리지 않는다", () => {
    const { container } = render(
      <PlaceBadges badges={[{ kind: "estimate" }]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("후보가 없으면 아무것도 그리지 않는다", () => {
    const { container } = render(<PlaceBadges badges={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
