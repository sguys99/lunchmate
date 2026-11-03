// @vitest-environment jsdom
// /beta 환영 페이지 (T9.3, D-23): 기기 판정, 단계와 주 버튼, 로그인 주소, 사이트맵 제외.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sitemapFor } from "@/features/landing/seo";
import { betaEnvFromUa, resolveBetaEnv, type BetaEnv } from "./env";
import { BetaWelcome } from "./welcome";

const KAKAO_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0";
const KAKAO_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; SM-S911N Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36;KAKAOTALK 2410800";
const SAFARI_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; SM-S911N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
const DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";

describe("기기 판정", () => {
  it("UA로 인앱, OS, 설치 방법 기기를 고른다", () => {
    expect(betaEnvFromUa(KAKAO_IOS)).toMatchObject({
      inApp: "kakaotalk",
      os: "ios",
      platform: "ios",
    });
    expect(betaEnvFromUa(KAKAO_ANDROID)).toMatchObject({
      inApp: "kakaotalk",
      os: "android",
      platform: "android",
    });
    expect(betaEnvFromUa(SAFARI_IOS)).toMatchObject({
      inApp: null,
      platform: "ios",
    });
    expect(betaEnvFromUa(CHROME_ANDROID)).toMatchObject({
      inApp: null,
      platform: "android",
    });
    expect(betaEnvFromUa(DESKTOP)).toMatchObject({
      inApp: null,
      platform: "desktop",
    });
    expect(betaEnvFromUa(null)).toMatchObject({ platform: null });
  });
  it("아이폰 Chrome은 Safari와 구분한다", () => {
    const CHROME_IOS =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/142.0.0.0 Mobile/15E148 Safari/604.1";
    expect(betaEnvFromUa(CHROME_IOS)).toMatchObject({
      inApp: null,
      platform: "ios",
      iosChrome: true,
    });
    expect(betaEnvFromUa(SAFARI_IOS)).toMatchObject({ iosChrome: false });
    expect(betaEnvFromUa(KAKAO_IOS)).toMatchObject({ iosChrome: false });
  });
  it("?device= 흉내는 개발 환경에서만", () => {
    expect(
      resolveBetaEnv({ device: "kakao-android" }, DESKTOP, true),
    ).toMatchObject({ inApp: "kakaotalk", os: "android" });
    expect(
      resolveBetaEnv({ device: "kakao-android" }, DESKTOP, false),
    ).toMatchObject({ inApp: null, platform: "desktop" });
    expect(resolveBetaEnv({ device: "app" }, null, true)).toMatchObject({
      forceStandalone: true,
    });
    expect(resolveBetaEnv({ device: "nope" }, SAFARI_IOS, true)).toMatchObject({
      platform: "ios",
    });
  });
  it("/beta는 사이트맵에 없다", () => {
    expect(sitemapFor("https://x.test").map((e) => e.url)).not.toContain(
      "https://x.test/beta",
    );
  });
});

function env(over: Partial<BetaEnv> = {}): BetaEnv {
  return {
    inApp: null,
    os: null,
    platform: "ios",
    forceStandalone: false,
    ...over,
  };
}

beforeEach(() => {
  window.matchMedia ??= ((q: string) => ({
    matches: false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});
afterEach(cleanup);

describe("BetaWelcome", () => {
  it("카카오톡 인앱: 주 버튼은 외부 브라우저로 열기, 글자 버튼은 카카오톡에서 바로 시작(로그인, 내부 경로)", () => {
    render(
      <BetaWelcome
        env={env({ inApp: "kakaotalk", os: "ios" })}
        signedIn={false}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "오늘 뭐 먹지를 10초 안에 정해 드립니다.",
    );
    expect(
      screen.getByRole("button", { name: "외부 브라우저로 열기" }),
    ).toBeInTheDocument();
    const stay = screen.getByRole("link", { name: "카카오톡에서 바로 시작" });
    expect(stay).toHaveAttribute("href", "/login?next=%2Ftoday");
    const steps = screen.getAllByRole("listitem");
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveAttribute("aria-current", "step");
    expect(screen.getByText(/화면 오른쪽 아래 메뉴/)).toBeInTheDocument();
  });

  it("안드로이드 카카오톡은 오른쪽 위 메뉴", () => {
    render(
      <BetaWelcome
        env={env({ inApp: "kakaotalk", os: "android", platform: "android" })}
        signedIn={false}
      />,
    );
    expect(screen.getByText(/화면 오른쪽 위 메뉴/)).toBeInTheDocument();
  });

  it("iOS Safari: 설치가 지금 단계, 주 버튼은 로그인하고 시작", () => {
    render(<BetaWelcome env={env()} signedIn={false} />);
    expect(
      screen.queryByRole("button", { name: "외부 브라우저로 열기" }),
    ).toBeNull();
    expect(
      screen.getByRole("link", { name: "로그인하고 시작" }),
    ).toHaveAttribute("href", "/login?next=%2Ftoday");
    const steps = screen.getAllByRole("listitem");
    expect(steps).toHaveLength(2);
    expect(steps[0]).toHaveAttribute("aria-current", "step");
    expect(
      screen.getByRole("img", { name: /공유 버튼 위치 그림/ }),
    ).toBeInTheDocument();
  });

  it("iOS Chrome: Chrome 공유 버튼 안내, Safari 그림 없음, 아이콘으로 열고 로그인 안내", () => {
    render(<BetaWelcome env={env({ iosChrome: true })} signedIn={false} />);
    expect(
      screen.getAllByText(/Chrome 주소창 오른쪽 공유 버튼/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByRole("img", { name: /공유 버튼 위치 그림/ }),
    ).toBeNull();
    expect(
      screen.getByText(/홈 화면에 생긴 아이콘으로 연 뒤 로그인/),
    ).toBeInTheDocument();
  });

  it("홈 화면 앱으로 열면 설치 단계는 마침, 로그인이 지금 단계", () => {
    render(
      <BetaWelcome env={env({ forceStandalone: true })} signedIn={false} />,
    );
    expect(screen.getByText("홈 화면 앱으로 열었습니다")).toBeInTheDocument();
    const steps = screen.getAllByRole("listitem");
    expect(steps[0]).not.toHaveAttribute("aria-current");
    expect(steps[0]).toHaveTextContent("마친 단계");
    expect(steps[1]).toHaveAttribute("aria-current", "step");
  });

  it("로그인한 사람은 주 버튼이 오늘 추천 보기(/today)", () => {
    render(<BetaWelcome env={env({ platform: "desktop" })} signedIn />);
    expect(
      screen.getByRole("link", { name: "오늘 추천 보기" }),
    ).toHaveAttribute("href", "/today");
  });

  it("기기를 모르면 기기 칩을 고르게 한다(빈 상태)", () => {
    render(<BetaWelcome env={env({ platform: null })} signedIn={false} />);
    expect(
      screen.getByText("쓰는 기기를 알아보지 못했습니다"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "안드로이드" }));
    expect(screen.getByText(/Chrome 메뉴에서/)).toBeInTheDocument();
  });
});
