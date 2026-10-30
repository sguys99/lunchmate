import { describe, expect, it } from "vitest";
import { externalOpenUrl, inAppGuide } from "./inapp";

describe("인앱 안내 모델", () => {
  it("카카오톡 iOS는 오른쪽 아래 메뉴, 자동 열기 없음", () => {
    expect(inAppGuide("kakao", "ios")).toMatchObject({
      menu: "bottom-right",
      menuIcon: "horizontal",
      menuItem: "다른 브라우저로 열기",
      canAutoOpen: false,
    });
  });

  it("카카오톡 Android는 오른쪽 위 세로 점 메뉴, 자동 열기 시도", () => {
    expect(inAppGuide("kakao", "android")).toMatchObject({
      menu: "top-right",
      menuIcon: "vertical",
      canAutoOpen: true,
    });
  });

  it("인스타그램은 iOS도 오른쪽 위", () => {
    expect(inAppGuide("instagram", "ios")).toMatchObject({
      menu: "top-right",
      menuItem: "외부 브라우저에서 열기",
    });
  });

  it("카카오톡은 openExternal 스킴, 그 밖은 Chrome intent", () => {
    const here = "https://lunchmate.vercel.app/poll/abc?x=1";
    expect(externalOpenUrl("kakao", here)).toBe(
      `kakaotalk://web/openExternal?url=${encodeURIComponent(here)}`,
    );
    expect(externalOpenUrl("instagram", here)).toMatch(
      /^intent:\/\/lunchmate\.vercel\.app\/poll\/abc\?x=1#Intent;scheme=https;/,
    );
  });
});
