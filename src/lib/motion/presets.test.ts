/**
 * 모션 프리셋 (T2.11, T2.12)
 * - 생성물 tokens.generated.ts가 루트 DESIGN.md 프런트매터와 같다 (손으로 고치거나 pnpm tokens를 빠뜨리면 실패).
 * - 프리셋 transition 값이 토큰에서 온다.
 * - 오버슈트 없음: easing y 값 0~1, spring 감쇠비 1 이상 (DESIGN.md 7절).
 * - 축소 모드: 모든 프리셋이 즉시(duration 0), 움직임 없음, opacity만 남는다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseDesignDoc } from "@/lib/design/schema";
import { motionTokensFile } from "@/lib/design/to-ts";
import {
  INSTANT,
  MOTION_PRESET_NAMES,
  buildPresets,
  dampingRatio,
  getMotionPreset,
  motionPresets,
  motionTokens,
  reducePreset,
  reduceTransition,
  reducedMotionPresets,
  revealDelay,
  springOf,
  tweenOf,
  withDirection,
  type MotionPreset,
  type MotionTarget,
  type MotionTokens,
} from "./index";

const REPO = path.resolve(__dirname, "../../..");
const design = parseDesignDoc(
  readFileSync(path.join(REPO, "DESIGN.md"), "utf8"),
).tokens;

describe("토큰 생성물 = DESIGN.md", () => {
  it("motionTokens가 DESIGN.md 프런트매터 motion과 같다", () => {
    expect(motionTokens).toEqual(design.motion);
  });

  it("변환 함수 출력이 값을 그대로 담는다 (생성 경로 확인)", () => {
    expect(motionTokensFile(design)).toContain(JSON.stringify(design.motion));
  });
});

describe("프리셋 값은 토큰에서 온다", () => {
  const ms = (n: number) => n / 1000;
  const { duration, easing, spring } = design.motion;

  it("enter: base + enter 곡선", () => {
    expect(motionPresets.enter.transition).toEqual({
      type: "tween",
      duration: ms(duration.base),
      ease: easing.enter,
    });
  });

  it("exit: fast + exit 곡선", () => {
    expect(motionPresets.exit.transition).toEqual({
      type: "tween",
      duration: ms(duration.fast),
      ease: easing.exit,
    });
  });

  it("press: press 스프링, scale 0.98", () => {
    expect(motionPresets.press.transition).toEqual({
      type: "spring",
      ...spring.press,
    });
    expect(motionPresets.press.whileTap).toEqual({ scale: 0.98 });
  });

  it("spring-sheet: sheet 스프링", () => {
    expect(motionPresets["spring-sheet"].transition).toEqual({
      type: "spring",
      ...spring.sheet,
    });
  });

  it("spring-card: x는 swipe 스프링, opacity는 base 감속, 8px 이동", () => {
    expect(motionPresets["spring-card"].transition).toEqual({
      x: { type: "spring", ...spring.swipe },
      opacity: {
        type: "tween",
        duration: ms(duration.base),
        ease: easing.enter,
      },
    });
    expect(motionPresets["spring-card"].initial).toEqual({ opacity: 0, x: 8 });
  });

  it("spring-bar: bar 스프링", () => {
    expect(motionPresets["spring-bar"].transition).toEqual({
      type: "spring",
      ...spring.bar,
    });
  });

  it("reveal: slow 감속, 블록 지연은 stagger 간격", () => {
    expect(motionPresets.reveal.transition).toEqual(tweenOf("slow", "enter"));
    expect(revealDelay(2)).toBeCloseTo(ms(design.motion.stagger * 2));
  });

  it("다른 토큰을 넣으면 프리셋이 따라 바뀐다 (값을 코드에 박지 않았다)", () => {
    const edited: MotionTokens = {
      ...design.motion,
      duration: { fast: 100, base: 200, slow: 400 },
      spring: {
        ...design.motion.spring,
        sheet: { stiffness: 100, damping: 30, mass: 1 },
      },
    };
    const p = buildPresets(edited);
    expect(p.enter.transition).toMatchObject({ duration: 0.2 });
    expect(p.exit.transition).toMatchObject({ duration: 0.1 });
    expect(p["spring-sheet"].transition).toMatchObject({ stiffness: 100 });
  });
});

describe("오버슈트 없음 (DESIGN.md 7절)", () => {
  it.each(Object.entries(motionTokens.easing))(
    "easing %s: y1, y2가 0~1",
    (_, [, y1, , y2]) => {
      for (const y of [y1, y2]) {
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(1);
      }
    },
  );

  it.each(Object.entries(motionTokens.spring))(
    "spring %s: 감쇠비 1 이상",
    (_, s) => {
      expect(dampingRatio(s)).toBeGreaterThanOrEqual(1);
    },
  );

  it("감쇠비 계산: 임계 감쇠 c = 2√(km)이면 1", () => {
    expect(dampingRatio({ stiffness: 100, damping: 20, mass: 1 })).toBe(1);
  });

  it("프리셋이 쓰는 spring, easing도 모두 토큰 범위 안 (transition 전체 순회)", () => {
    const transitions: unknown[] = [];
    const walk = (v: unknown) => {
      if (!v || typeof v !== "object") return;
      const o = v as Record<string, unknown>;
      if (o.type === "spring" || o.type === "tween") transitions.push(o);
      Object.values(o).forEach(walk);
    };
    Object.values(motionPresets).forEach(walk);
    expect(transitions.length).toBeGreaterThan(8);
    for (const t of transitions as Record<string, unknown>[]) {
      if (t.type === "spring") {
        expect(
          dampingRatio(
            t as { stiffness: number; damping: number; mass: number },
          ),
        ).toBeGreaterThanOrEqual(1);
      } else {
        const [, y1, , y2] = t.ease as number[];
        expect([y1, y2].every((y) => y! >= 0 && y! <= 1)).toBe(true);
        expect(t.duration as number).toBeLessThanOrEqual(0.3);
      }
    }
  });
});

describe("축소 모드 (T2.12)", () => {
  const TRANSFORM = ["x", "y", "scale"] as const;
  const moves = (t?: MotionTarget) =>
    !!t && TRANSFORM.some((k) => t[k] !== undefined);

  it.each(MOTION_PRESET_NAMES)("%s: 즉시, 움직임과 눌림 없음", (name) => {
    const r = reducedMotionPresets[name];
    expect(r.transition).toEqual(INSTANT);
    expect(r.whileTap).toBeUndefined();
    expect(moves(r.initial)).toBe(false);
    expect(moves(r.exit)).toBe(false);
    expect(r.initial?.transition).toBeUndefined();
    expect(r.exit?.transition).toBeUndefined();
    expect(r.animate?.transition).toBeUndefined();
  });

  it("opacity 상태는 남긴다 (끝 상태가 같다)", () => {
    expect(reducedMotionPresets.enter).toEqual({
      initial: { opacity: 0 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0 },
      transition: INSTANT,
    });
    expect(reducedMotionPresets["spring-card"].exit).toEqual({ opacity: 0 });
  });

  it("바텀시트는 위치 이동 없이 바로 나타난다", () => {
    expect(reducedMotionPresets["spring-sheet"]).toEqual({
      initial: {},
      animate: { y: 0 },
      exit: {},
      transition: INSTANT,
    });
  });

  it("getMotionPreset은 축소 여부로 고른다, 원본은 바뀌지 않는다", () => {
    const before = structuredClone(motionPresets.press) as MotionPreset;
    expect(getMotionPreset("press", false)).toBe(motionPresets.press);
    expect(getMotionPreset("press", true)).toBe(reducedMotionPresets.press);
    reducePreset(motionPresets.press);
    expect(motionPresets.press).toEqual(before);
  });

  it("직접 만든 transition도 축소 모드면 즉시", () => {
    const t = springOf("swipe");
    expect(reduceTransition(t, false)).toBe(t);
    expect(reduceTransition(t, true)).toEqual({ duration: 0 });
  });
});

describe("withDirection", () => {
  it("-1이면 들어오고 나가는 x 부호가 바뀐다", () => {
    const back = withDirection(motionPresets["spring-card"], -1);
    expect(back.initial?.x).toBe(-8);
    expect(back.exit?.x).toBe(8);
    expect(withDirection(motionPresets["spring-card"], 1)).toBe(
      motionPresets["spring-card"],
    );
  });
});
