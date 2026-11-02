// 베타 의견 순수 로직 (T9.4): 경로 지우기, zod 재검증, 저장 흐름, 기기 종류, 지금 보던 화면 기억.
import { afterEach, describe, expect, it, vi } from "vitest";
import { betaFeedbackCopy } from "@/copy/beta";
import { deviceInfoFrom } from "./device";
import { lastRoute, rememberRoute, resetLastRoute } from "./last-route";
import {
  betaFeedbackSchema,
  submitBetaFeedback,
  type BetaFeedbackDeps,
  type BetaFeedbackRow,
} from "./requests";
import { sanitizeRoute } from "./route-path";

describe("sanitizeRoute", () => {
  it("투표방 초대 코드를 자리 이름으로 바꾼다", () => {
    expect(sanitizeRoute("/poll/abc123xyz0")).toBe("/poll/[code]");
    expect(sanitizeRoute("/poll/abc123xyz0/result")).toBe("/poll/[code]/result");
    expect(
      sanitizeRoute("https://lunchmate-kr.vercel.app/poll/K7Qm2xPa9w?ref=kakao#v"),
    ).toBe("/poll/[code]");
  });

  it("쿼리와 해시는 통째로 버린다", () => {
    expect(sanitizeRoute("/today?lat=37.5&lng=127.0")).toBe("/today");
    expect(sanitizeRoute("/login?next=%2Fpoll%2Fabc123xyz0")).toBe("/login");
    expect(sanitizeRoute("/me?tab=reviews#x")).toBe("/me");
  });

  it("상세 경로의 장소 번호를 남기지 않는다", () => {
    expect(sanitizeRoute("/today/place/1840235701")).toBe("/today/[detail]");
    expect(sanitizeRoute("/map/place/1840235701")).toBe("/map/[detail]");
    expect(sanitizeRoute("/me/history/9f1c2d")).toBe("/me/[other]");
  });

  it("고정 경로는 그대로, 모르는 경로는 /[other]", () => {
    expect(sanitizeRoute("/poll/party")).toBe("/poll/party");
    expect(sanitizeRoute("/me/settings/")).toBe("/me/settings");
    expect(sanitizeRoute("/beta")).toBe("/beta");
    expect(sanitizeRoute("/")).toBe("/");
    expect(sanitizeRoute("/u/3f2a9b7e-1111-2222-3333-444455556666")).toBe("/[other]");
    expect(sanitizeRoute("/37.5665,126.978")).toBe("/[other]");
  });

  it("결과에 숫자 좌표나 코드가 남지 않고, DB route check 모양을 지킨다", () => {
    const inputs = [
      "/poll/abc123xyz0",
      "/today/place/1840235701?lat=37.56",
      "/map/37.5665/126.978",
      "/%2e%2e/poll/abc",
      "/ME/SETTINGS",
      "/한글/경로",
    ];
    for (const i of inputs) {
      const out = sanitizeRoute(i);
      expect(out).not.toMatch(/\d{3,}/);
      expect(out).not.toContain("abc");
      expect(out.length).toBeLessThanOrEqual(64);
      expect(out).toMatch(/^\/[a-z0-9/_[\]-]*$/);
    }
  });
});

const valid = {
  category: "bug",
  body: "  투표방에서 득표 바가 잠깐 비어 보였습니다.\r\n새로 고침하면 괜찮습니다.  ",
  route: "/poll/abc123xyz0?ref=kakao",
  device: "ios",
  inApp: false,
  standalone: true,
} as const;

describe("betaFeedbackSchema", () => {
  it("앞뒤 공백을 지우고 줄바꿈을 \\n으로 맞춘다", () => {
    const r = betaFeedbackSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.data?.body).toBe(
      "투표방에서 득표 바가 잠깐 비어 보였습니다.\n새로 고침하면 괜찮습니다.",
    );
  });
  it("종류는 선택(null), 정해진 값만", () => {
    expect(betaFeedbackSchema.safeParse({ ...valid, category: null }).success).toBe(true);
    expect(betaFeedbackSchema.safeParse({ ...valid, category: "praise" }).success).toBe(false);
  });
  it("내용은 1~500자(코드 포인트). 공백만, 501자, 제어 문자는 거절", () => {
    expect(betaFeedbackSchema.safeParse({ ...valid, body: "   " }).success).toBe(false);
    expect(betaFeedbackSchema.safeParse({ ...valid, body: "가".repeat(500) }).success).toBe(true);
    expect(betaFeedbackSchema.safeParse({ ...valid, body: "가".repeat(501) }).success).toBe(false);
    // 이모지 500개는 UTF-16으로 1000이지만 DB char_length로 500이라 받는다
    expect(betaFeedbackSchema.safeParse({ ...valid, body: "👍".repeat(500) }).success).toBe(true);
    expect(betaFeedbackSchema.safeParse({ ...valid, body: "a\u0000b" }).success).toBe(false);
    expect(betaFeedbackSchema.safeParse({ ...valid, body: "a\tb" }).success).toBe(true);
  });
  it("모르는 키(좌표, UA, 앱 버전)는 받지 않는다", () => {
    for (const extra of [
      { lat: 37.5 },
      { userAgent: "Mozilla/5.0" },
      { appVersion: "9.9.9" },
      { query: "?x=1" },
    ]) {
      expect(betaFeedbackSchema.safeParse({ ...valid, ...extra }).success).toBe(false);
    }
  });
  it("기기는 ios, android, desktop만", () => {
    expect(betaFeedbackSchema.safeParse({ ...valid, device: "windows" }).success).toBe(false);
  });
});

function deps(over: Partial<BetaFeedbackDeps> = {}) {
  const rows: BetaFeedbackRow[] = [];
  const d: BetaFeedbackDeps = {
    currentUserId: async () => "user-1",
    appVersion: "0.1.0",
    algoVersion: "2026-11-01.1",
    insert: async (row) => {
      rows.push(row);
      return null;
    },
    ...over,
  };
  return { d, rows };
}

describe("submitBetaFeedback", () => {
  it("경로는 서버에서 다시 경로 틀로, 앱 버전과 algo_version은 서버 값으로 넣는다", async () => {
    const { d, rows } = deps();
    expect(await submitBetaFeedback(valid, d)).toEqual({ ok: true });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      user_id: "user-1",
      category: "bug",
      body: "투표방에서 득표 바가 잠깐 비어 보였습니다.\n새로 고침하면 괜찮습니다.",
      route: "/poll/[code]",
      app_version: "0.1.0",
      algo_version: "2026-11-01.1",
      device: "ios",
      in_app: false,
      standalone: true,
    });
  });
  it("화면을 끄면 route null", async () => {
    const { d, rows } = deps();
    await submitBetaFeedback({ ...valid, route: null }, d);
    expect(rows[0]?.route).toBeNull();
  });
  it("검사 실패는 저장하지 않는다", async () => {
    const { d, rows } = deps();
    expect(await submitBetaFeedback({ ...valid, body: "" }, d)).toEqual({ ok: false, error: "invalid" });
    expect(rows).toHaveLength(0);
  });
  it("비로그인은 unauthenticated", async () => {
    const { d } = deps({ currentUserId: async () => null });
    expect(await submitBetaFeedback(valid, d)).toEqual({ ok: false, error: "unauthenticated" });
  });
  it("하루 한도, 정지, RLS 거절을 화면 코드로 바꾼다", async () => {
    const cases = [
      [{ code: "23514", message: "beta_feedback_daily_limit_exceeded" }, "limit"],
      [{ code: "42501", message: "account_suspended" }, "suspended"],
      [{ code: "42501", message: 'new row violates row-level security policy for table "beta_feedback"' }, "unauthenticated"],
      [{ code: "23514", message: "beta_feedback_body_length" }, "invalid"],
      [{ code: "XX000", message: "boom" }, "save"],
    ] as const;
    for (const [error, code] of cases) {
      const { d } = deps({ insert: async () => error });
      expect(await submitBetaFeedback(valid, d)).toEqual({ ok: false, error: code });
    }
  });
  it("연결 실패(코드 없음)는 한 번만 다시 보낸다", async () => {
    const insert = vi
      .fn<BetaFeedbackDeps["insert"]>()
      .mockResolvedValueOnce({ message: "fetch failed" })
      .mockResolvedValueOnce(null);
    expect(await submitBetaFeedback(valid, deps({ insert }).d)).toEqual({ ok: true });
    expect(insert).toHaveBeenCalledTimes(2);

    const always = vi.fn<BetaFeedbackDeps["insert"]>().mockRejectedValue(new Error("net"));
    expect(await submitBetaFeedback(valid, deps({ insert: always }).d)).toEqual({ ok: false, error: "save" });
    expect(always).toHaveBeenCalledTimes(2);

    const pg = vi.fn<BetaFeedbackDeps["insert"]>().mockResolvedValue({ code: "23514", message: "x" });
    await submitBetaFeedback(valid, deps({ insert: pg }).d);
    expect(pg).toHaveBeenCalledTimes(1);
  });
});

describe("deviceInfoFrom", () => {
  const IPHONE_KAKAO =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0";
  const ANDROID_CHROME =
    "Mozilla/5.0 (Linux; Android 14; SM-S911N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
  const MAC =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
  it("ios, android, desktop + 인앱 + 홈 화면 앱", () => {
    expect(deviceInfoFrom({ ua: IPHONE_KAKAO, maxTouchPoints: 5, standalone: false })).toEqual({
      device: "ios",
      inApp: true,
      standalone: false,
    });
    expect(deviceInfoFrom({ ua: ANDROID_CHROME, maxTouchPoints: 5, standalone: true })).toEqual({
      device: "android",
      inApp: false,
      standalone: true,
    });
    expect(deviceInfoFrom({ ua: MAC, maxTouchPoints: 0, standalone: false }).device).toBe("desktop");
  });
  it("맥 UA에 터치 지점이 있으면 아이패드(ios)", () => {
    expect(deviceInfoFrom({ ua: MAC, maxTouchPoints: 5, standalone: false }).device).toBe("ios");
  });
  it("결과에 UA 원문이 없다", () => {
    const info = deviceInfoFrom({ ua: IPHONE_KAKAO, maxTouchPoints: 5, standalone: false });
    expect(JSON.stringify(info)).not.toContain("Mozilla");
  });
});

describe("지금 보던 화면 기억", () => {
  afterEach(resetLastRoute);
  it("나 탭으로 바로 오면 /me", () => {
    rememberRoute("/me");
    expect(lastRoute()).toBe("/me");
  });
  it("나 탭 첫 화면은 적지 않고 그 직전 경로를 기억한다", () => {
    rememberRoute("/today");
    rememberRoute("/poll/abc123xyz0");
    rememberRoute("/me");
    expect(lastRoute()).toBe("/poll/abc123xyz0");
    expect(sanitizeRoute(lastRoute())).toBe("/poll/[code]");
  });
});

describe("문구", () => {
  it("종류별 예시 문구가 넷 모두 있다(D-23 B안 예시 문구)", () => {
    for (const c of ["bug", "inconvenient", "good", "idea"] as const) {
      expect(betaFeedbackCopy.placeholders[c].length).toBeGreaterThan(0);
    }
  });
});
