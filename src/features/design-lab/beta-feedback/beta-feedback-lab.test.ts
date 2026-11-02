// 베타 의견 시안 순수 로직 (T9.4): 화면 경로 지우기와 쿼리 해석.
import { describe, expect, it } from "vitest";
import { parseBetaFeedbackParams } from "./params";
import { sanitizeRoute } from "./route-path";

describe("sanitizeRoute", () => {
  it("투표방 초대 코드를 자리 이름으로 바꾼다", () => {
    expect(sanitizeRoute("/poll/abc123xyz0")).toBe("/poll/[code]");
    expect(sanitizeRoute("/poll/abc123xyz0/result")).toBe("/poll/[code]/result");
    expect(sanitizeRoute("https://lunchmate-kr.vercel.app/poll/K7Qm2xPa9w?ref=kakao#v")).toBe(
      "/poll/[code]",
    );
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
    expect(sanitizeRoute("/")).toBe("/");
    expect(sanitizeRoute("/u/3f2a9b7e-1111-2222-3333-444455556666")).toBe("/[other]");
    expect(sanitizeRoute("/37.5665,126.978")).toBe("/[other]");
  });

  it("결과에 숫자 좌표나 코드가 남지 않는다", () => {
    const inputs = [
      "/poll/abc123xyz0",
      "/today/place/1840235701?lat=37.56",
      "/map/37.5665/126.978",
      "/%2e%2e/poll/abc",
    ];
    for (const i of inputs) {
      const out = sanitizeRoute(i);
      expect(out).not.toMatch(/\d{3,}/);
      expect(out).not.toContain("abc");
    }
  });
});

describe("parseBetaFeedbackParams", () => {
  it("기본값", () => {
    const p = parseBetaFeedbackParams({});
    expect(p).toMatchObject({ state: "ready", fail: "send", view: null, flow: "compose", step: 2, cat: "bug" });
  });
  it("값 해석", () => {
    const p = parseBetaFeedbackParams({ state: "error", fail: "limit", view: "entry", step: "1", cat: "IDEA" });
    expect(p).toMatchObject({ state: "error", fail: "limit", view: "entry", step: 1, cat: "idea" });
  });
});
