import { describe, expect, it } from "vitest";
import {
  detectInApp,
  detectOs,
  externalOpenUrl,
  googleBlocked,
  inAppGuide,
} from "./inapp";

// 실제 기기에서 수집된 형태의 UA (버전 숫자만 다를 수 있음)
const UA = {
  kakaoIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.5",
  kakaoAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.71 Mobile Safari/537.36;KAKAOTALK 2410830",
  instagramIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 339.0.3.12.91 (iPhone15,2; iOS 17_5_1; ko_KR; ko; scale=3.00; 1179x2556; 619461904)",
  instagramAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-S911N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.6422.165 Mobile Safari/537.36 Instagram 334.0.0.42.95 Android (34/14; 480dpi; 1080x2340; samsung; SM-S911N; dm1q; qcom; ko_KR; 606558400)",
  naverIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 NAVER(inapp; search; 2000; 12.6.3; 15PRO)",
  naverAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.122 Mobile Safari/537.36 NAVER(inapp; search; 2000; 12.7.3)",
  lineIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.10.0",
  facebookIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.37.106;FBBV/617245452;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBCR/;FBID/phone;FBLC/ko_KR;FBOP/80]",
  facebookAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.122 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/473.0.0.40.109;]",
  androidWebview:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230805.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.230 Mobile Safari/537.36",
  safariIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  chromeIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1",
  // 홈 화면에 추가한 PWA(standalone)는 Safari 토큰이 없다. 웹뷰로 보면 안 된다
  pwaIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  samsungAndroid:
    "Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
  chromeMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  // 이름에 line이 들어간 다른 토큰에 속지 않는다
  onlineLike:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Timeline/2.0",
};

describe("detectInApp", () => {
  it.each([
    ["kakaoIos", "kakaotalk"],
    ["kakaoAndroid", "kakaotalk"],
    ["instagramIos", "instagram"],
    ["instagramAndroid", "instagram"],
    ["naverIos", "naver"],
    ["naverAndroid", "naver"],
    ["lineIos", "line"],
    ["facebookIos", "facebook"],
    ["facebookAndroid", "facebook"],
    ["androidWebview", "webview"],
  ] as const)("%s → %s", (key, app) => {
    expect(detectInApp(UA[key])).toBe(app);
  });

  it.each([
    "safariIos",
    "chromeIos",
    "pwaIos",
    "chromeAndroid",
    "samsungAndroid",
    "chromeMac",
    "onlineLike",
  ] as const)("%s → 일반 브라우저(null)", (key) => {
    expect(detectInApp(UA[key])).toBeNull();
  });

  it("UA가 없으면 null", () => {
    expect(detectInApp(null)).toBeNull();
    expect(detectInApp("")).toBeNull();
  });
});

describe("detectOs", () => {
  it("iOS와 Android를 구분한다", () => {
    expect(detectOs(UA.kakaoIos)).toBe("ios");
    expect(detectOs(UA.kakaoAndroid)).toBe("android");
    expect(detectOs(UA.chromeMac)).toBeNull();
  });
});

describe("googleBlocked", () => {
  it("감지된 인앱은 모두 구글 안내(네이버 앱 포함, D-08 안건 11)", () => {
    expect(googleBlocked("naver")).toBe(true);
    expect(googleBlocked("kakaotalk")).toBe(true);
    expect(googleBlocked(null)).toBe(false);
  });
});

describe("externalOpenUrl", () => {
  const url = "https://lunchmate.example/login?next=%2Fpoll%2Fabc123defg";

  it("카카오톡은 iOS와 Android 모두 openExternal 스킴(D-08 안건 10)", () => {
    const expected = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
    expect(externalOpenUrl("kakaotalk", "ios", url)).toBe(expected);
    expect(externalOpenUrl("kakaotalk", "android", url)).toBe(expected);
  });

  it("라인은 공식 파라미터 openExternalBrowser=1", () => {
    const out = externalOpenUrl("line", "ios", url)!;
    const u = new URL(out);
    expect(u.searchParams.get("openExternalBrowser")).toBe("1");
    expect(u.searchParams.get("next")).toBe("/poll/abc123defg");
  });

  it("Android 인스타그램은 Chrome intent와 fallback 주소", () => {
    const out = externalOpenUrl("instagram", "android", url)!;
    expect(out.startsWith("intent://lunchmate.example/login?next=")).toBe(true);
    expect(out).toContain("scheme=https;package=com.android.chrome;");
    expect(out).toContain(
      `S.browser_fallback_url=${encodeURIComponent(url)};end`,
    );
  });

  it("iOS 인스타그램, 페이스북, 네이버 앱은 자동 열기 수단이 없다", () => {
    expect(externalOpenUrl("instagram", "ios", url)).toBeNull();
    expect(externalOpenUrl("facebook", "ios", url)).toBeNull();
    expect(externalOpenUrl("naver", "ios", url)).toBeNull();
  });
});

describe("inAppGuide", () => {
  it("카카오톡 iOS는 오른쪽 아래 메뉴, Android는 오른쪽 위", () => {
    expect(inAppGuide("kakaotalk", "ios")).toMatchObject({
      menu: "bottom-right",
      menuIcon: "horizontal",
      menuItem: "otherBrowser",
      canAutoOpen: true,
    });
    expect(inAppGuide("kakaotalk", "android")).toMatchObject({
      menu: "top-right",
      menuIcon: "vertical",
      canAutoOpen: true,
    });
  });

  it("인스타그램 iOS는 오른쪽 위 외부 브라우저 메뉴, 자동 열기 없음", () => {
    expect(inAppGuide("instagram", "ios")).toMatchObject({
      menu: "top-right",
      menuItem: "externalBrowser",
      canAutoOpen: false,
    });
  });

  it("OS를 모르면 iOS 안내", () => {
    expect(inAppGuide("naver", null)).toMatchObject({
      os: "ios",
      menu: "bottom-right",
      canAutoOpen: false,
    });
  });
});
