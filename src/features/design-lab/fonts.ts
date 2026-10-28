// design-lab 전용 서체 (T1.5 시안 B "Quiet Stone").
// 루트 layout에서 import하지 않는다. 시안 B 페이지가 이 모듈을 import할 때만 폰트 파일이 번들에 들어간다.
//
// 마루 부리(MaruBuri, 네이버, SIL OFL 1.1) Light 300 + Regular 400.
// Basic Latin + KS X 1001 한글 2,350자 서브셋 woff2, 각각 약 137KB / 135KB.
// 비교와 측정 근거: docs/design/candidates/b.DESIGN.md 3절.
import localFont from "next/font/local";

export const maruBuri = localFont({
  src: [
    {
      path: "../../app/fonts/MaruBuri-Light-KSX1001.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../app/fonts/MaruBuri-Regular-KSX1001.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-maruburi",
  display: "swap",
  // 제목 전용이라 첫 화면 다운로드를 막지 않는다. 쓰는 페이지에서만 요청된다.
  preload: false,
  fallback: ["AppleMyungjo", "Noto Serif KR", "Batang", "serif"],
});
