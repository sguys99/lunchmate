// @vitest-environment jsdom
/**
 * 숫자 공용 컴포넌트 (T2.13)
 * - NumberFlow 타이밍은 DESIGN.md 모션 토큰에서 온다(base + standard, 오버슈트 없음).
 * - 축소 모드면 animated=false(즉시).
 * - 카운트다운: 시각을 모르면 자리만, 남은 시간은 role="timer" 이름으로, 마감이면 마감 문구.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { numbersCopy } from "@/copy/numbers";
import { MotionProvider, motionTokens } from "@/lib/motion";
import { DeadlineCountdown, RollingNumber, numberFlowTimings } from "./index";

afterEach(cleanup);

const DEADLINE = new Date("2026-10-29T03:00:00Z");
const at = (msBefore: number) => DEADLINE.getTime() - msBefore;

describe("numberFlowTimings", () => {
  it("이동과 회전은 base + standard, 투명도는 fast + enter", () => {
    const t = numberFlowTimings();
    const [x1, y1, x2, y2] = motionTokens.easing.standard;
    expect(t.transformTiming).toEqual({
      duration: motionTokens.duration.base,
      easing: `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`,
    });
    expect(t.spinTiming).toEqual(t.transformTiming);
    expect(t.opacityTiming.duration).toBe(motionTokens.duration.fast);
  });
});

describe("RollingNumber", () => {
  it("축소 모드면 애니메이션을 끈다", () => {
    const { container } = render(
      <MotionProvider preference="reduce">
        <RollingNumber value={3} />
      </MotionProvider>,
    );
    const el = container.querySelector("number-flow-react") as
      (HTMLElement & { animated?: boolean }) | null;
    expect(el).not.toBeNull();
    expect(el?.animated).toBe(false);
    expect(el?.className).toContain("tabular-nums");
  });
});

describe("DeadlineCountdown", () => {
  it("남은 시간을 timer 이름으로 준다 (1:02:05)", () => {
    render(
      <DeadlineCountdown
        deadline={DEADLINE}
        nowMs={at((3600 + 2 * 60 + 5) * 1000)}
      />,
    );
    expect(screen.getByRole("timer").getAttribute("aria-label")).toBe(
      numbersCopy.countdownLabel(1, 2, 5),
    );
  });

  it("1시간 미만이면 시를 읽지 않는다", () => {
    expect(numbersCopy.countdownLabel(0, 3, 12)).toBe("마감까지 3분 12초");
    expect(numbersCopy.countdownLabel(0, 0, 9)).toBe("마감까지 9초");
  });

  it("마감 정각이면 마감 문구", () => {
    render(<DeadlineCountdown deadline={DEADLINE} nowMs={at(0)} />);
    expect(screen.queryByRole("timer")).toBeNull();
    expect(screen.getByText(numbersCopy.countdownClosed)).toBeTruthy();
  });
});
