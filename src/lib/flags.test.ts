import { afterEach, describe, expect, it, vi } from "vitest";
import { FLAGS, evaluateFlag, isEnabled, type FlagContext } from "./flags";
import { resetClientEnvCache } from "./env/client";

const ctx = (over: Partial<FlagContext> = {}): FlagContext => ({
  envValues: {},
  vercelEnv: undefined,
  inBrowser: false,
  ...over,
});

describe("evaluateFlag", () => {
  const lab = FLAGS.designLab;

  it("env 값이 없으면 default(false)", () => {
    expect(evaluateFlag(lab, ctx())).toBe(false);
  });
  it("env 값이 true 면 켜진다 (Preview, 로컬)", () => {
    const envValues = { NEXT_PUBLIC_DESIGN_LAB: true };
    expect(evaluateFlag(lab, ctx({ envValues }))).toBe(true);
    expect(evaluateFlag(lab, ctx({ envValues, vercelEnv: "preview" }))).toBe(
      true,
    );
  });
  it("Vercel Production 에서는 env 가 true 여도 항상 꺼진다", () => {
    const envValues = { NEXT_PUBLIC_DESIGN_LAB: true };
    expect(evaluateFlag(lab, ctx({ envValues, vercelEnv: "production" }))).toBe(
      false,
    );
  });
  it("브라우저에서는 productionOff 플래그를 항상 끈다", () => {
    const envValues = { NEXT_PUBLIC_DESIGN_LAB: true };
    expect(evaluateFlag(lab, ctx({ envValues, inBrowser: true }))).toBe(false);
  });
  it("const 플래그는 상수를 따른다", () => {
    expect(
      evaluateFlag(
        { ...FLAGS.pollEntry, source: { type: "const", value: true } },
        ctx(),
      ),
    ).toBe(true);
  });
  it("appShell은 개발과 Preview에서 켜지고 Production에서는 꺼진다 (T2.6)", () => {
    expect(evaluateFlag(FLAGS.appShell, ctx())).toBe(true);
    expect(evaluateFlag(FLAGS.appShell, ctx({ vercelEnv: "preview" }))).toBe(
      true,
    );
    expect(evaluateFlag(FLAGS.appShell, ctx({ vercelEnv: "production" }))).toBe(
      false,
    );
  });
  it("앞으로의 플래그는 모두 기본 false", () => {
    for (const key of ["pollEntry", "betaFeedback", "userPlaceMemo"] as const) {
      expect(evaluateFlag(FLAGS[key], ctx())).toBe(false);
    }
  });
});

describe("isEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetClientEnvCache();
  });

  it('NEXT_PUBLIC_DESIGN_LAB="true" 이면 켜진다', () => {
    vi.stubEnv("NEXT_PUBLIC_DESIGN_LAB", "true");
    vi.stubEnv("VERCEL_ENV", "preview");
    resetClientEnvCache();
    expect(isEnabled("designLab")).toBe(true);
  });
  it("VERCEL_ENV=production 이면 true 를 넣어도 꺼진다", () => {
    vi.stubEnv("NEXT_PUBLIC_DESIGN_LAB", "true");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://lunchmate.kr");
    resetClientEnvCache();
    expect(isEnabled("designLab")).toBe(false);
  });
  it("미설정이면 꺼진다", () => {
    vi.stubEnv("NEXT_PUBLIC_DESIGN_LAB", "");
    resetClientEnvCache();
    expect(isEnabled("designLab")).toBe(false);
  });
});
