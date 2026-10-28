// 앱 전역 서체 (T1.19). 루트 layout이 두 변수를 <html>에 붙이고, tokens.css의 --lm-font-* 가 이 변수를 가리킨다.
// next/font는 family를 해시된 이름으로 등록하므로 DESIGN.md의 font.*.cssVar로 연결한다(FORMAT.md 2.5절).
// 결정과 전송량 기록: docs/design/bundle-log.md
import localFont from "next/font/local";

// Pretendard Variable (OFL-1.1). KS X 1001 한글 2,350자 + 라틴 + 기호 서브셋, 539,268바이트.
// 본문, 버튼, 숫자 서체. 서브셋에 없는 글자는 fallback 폰트로 표시된다.
export const pretendard = localFont({
  src: "./PretendardVariable-KSX1001.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 930",
  fallback: ["Apple SD Gothic Neo", "Malgun Gothic", "system-ui", "sans-serif"],
});

// 마루 부리 (네이버, OFL-1.1). 같은 서브셋, Light 140,404바이트 + Regular 138,488바이트.
// DESIGN.md 타입 스케일: display, title은 300, heading(카드 식당명)은 400이라 두 굵기가 모두 필요하다.
// - preload: false. swap이라 첫 페인트(=LCP 후보)는 대체 서체로 그려지고, 272KB를 미리 받으면 4G에서
//   Pretendard, JS와 대역폭을 다퉈 LCP가 늦어진다. 굵기별 파일은 그 굵기 글자가 화면에 있을 때만 요청된다.
// - adjustFontFallback: 라틴 metrics를 Times New Roman 기반 대체 @font-face(size-adjust 등)로 맞춰 교체 시 흔들림을 줄인다.
//   한글 글리프는 대체 스택(AppleMyungjo, Noto Serif KR, Batang)으로 떨어진다.
export const maruBuri = localFont({
  src: [
    { path: "./MaruBuri-Light-KSX1001.woff2", weight: "300", style: "normal" },
    {
      path: "./MaruBuri-Regular-KSX1001.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-maruburi",
  display: "swap",
  preload: false,
  adjustFontFallback: "Times New Roman",
  fallback: ["AppleMyungjo", "Noto Serif KR", "Batang", "serif"],
});
