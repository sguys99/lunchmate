import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FLAGS,
  evaluateFlag,
  isEnabled,
  type FlagContext,
  type FlagDefinition,
} from "./flags";
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
  it("appShell은 개발, Preview, Production 모두 켜진다 (T2.6, 2026-10-31 해제)", () => {
    expect(evaluateFlag(FLAGS.appShell, ctx())).toBe(true);
    expect(evaluateFlag(FLAGS.appShell, ctx({ vercelEnv: "preview" }))).toBe(
      true,
    );
    expect(evaluateFlag(FLAGS.appShell, ctx({ vercelEnv: "production" }))).toBe(
      true,
    );
    // 서버에서 판정해 내려 주므로 브라우저 값은 쓰지 않지만, productionOff가 없어 같은 값이다
    expect(evaluateFlag(FLAGS.appShell, ctx({ inBrowser: true }))).toBe(true);
  });
  it("auth, pollEntry, adminConsole, betaFeedback은 개발, Preview, Production 모두 켜진다 (T9.2, 2026-11-02 해제)", () => {
    for (const key of [
      "auth",
      "pollEntry",
      "adminConsole",
      "betaFeedback",
    ] as const) {
      const def: FlagDefinition = FLAGS[key];
      expect(def.productionOff).toBeUndefined();
      expect(evaluateFlag(def, ctx())).toBe(true);
      expect(evaluateFlag(def, ctx({ vercelEnv: "preview" }))).toBe(true);
      expect(evaluateFlag(def, ctx({ vercelEnv: "production" }))).toBe(true);
    }
  });
  it("productionOff가 남은 플래그는 designLab뿐이다", () => {
    const off = Object.entries(FLAGS)
      .filter(([, def]) => (def as FlagDefinition).productionOff)
      .map(([key]) => key);
    expect(off).toEqual(["designLab"]);
  });
  it("userPlaceMemo는 T10.15 구현 뒤 모든 환경에서 켜진다(기본값은 false, 상수로 켬)", () => {
    const def: FlagDefinition = FLAGS.userPlaceMemo;
    expect(def.default).toBe(false);
    expect(def.owner).toContain("T10.15");
    expect(def.productionOff).toBeUndefined();
    expect(evaluateFlag(def, ctx())).toBe(true);
    expect(evaluateFlag(def, ctx({ vercelEnv: "production" }))).toBe(true);
  });
  it("menuReports는 T10.16h 전까지 개발 서버에서만 켜진다(빌드에서는 꺼짐)", () => {
    const def: FlagDefinition = FLAGS.menuReports;
    expect(def.default).toBe(false);
    expect(def.owner).toContain("T10.16");
    expect(def.productionOff).toBeUndefined();
    expect(def.source).toEqual({ type: "const", value: process.env.NODE_ENV === "development" });
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
  it("프로덕션 조합(VERCEL_ENV=production): 앱, 로그인, 투표, 관리자, 베타 의견 켜짐, 디자인 랩 꺼짐 (T9.2)", () => {
    vi.stubEnv("NEXT_PUBLIC_DESIGN_LAB", "true");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://lunchmate-kr.vercel.app");
    resetClientEnvCache();
    expect(isEnabled("appShell")).toBe(true);
    expect(isEnabled("auth")).toBe(true);
    expect(isEnabled("pollEntry")).toBe(true);
    expect(isEnabled("adminConsole")).toBe(true);
    expect(isEnabled("betaFeedback")).toBe(true);
    expect(isEnabled("designLab")).toBe(false);
  });
});
