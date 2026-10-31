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
  it("auth는 여전히 Production에서 꺼진다 (appShell 해제와 무관)", () => {
    expect(evaluateFlag(FLAGS.auth, ctx({ vercelEnv: "production" }))).toBe(
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
  it("프로덕션 조합(VERCEL_ENV=production): appShell 켜짐 + auth 꺼짐 (5단계 마무리)", () => {
    // 이 조합에서 /poll, /me는 곧 열립니다 안내, 로그인 유도는 토스트(app/(app)/coming-soon.tsx, login-prompt/gate.tsx)
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://lunchmate.kr");
    resetClientEnvCache();
    expect(isEnabled("appShell")).toBe(true);
    expect(isEnabled("auth")).toBe(false);
  });
});
