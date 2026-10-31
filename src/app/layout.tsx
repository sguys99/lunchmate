import type { Metadata, Viewport } from "next";
import "./globals.css";
// 서체: --font-pretendard, --font-maruburi 변수와 크기 보정 대체 글꼴만(T5.41). 웹 글꼴 @font-face 목록은
// public/fonts/v1/faces.css이고 WEB_FONTS_INIT_SCRIPT가 붙인다(첫 방문은 화면이 뜬 뒤, 재방문은 첫 페인트 전, docs/design/g5-qa.md 2.6절)
import "./fonts/fonts.css";
import { siteCopy } from "@/copy/common";
import { themeColor } from "@/lib/design/theme-color.generated";
import { siteUrl } from "@/lib/env/site";
import { WEB_FONTS_INIT_SCRIPT } from "@/lib/fonts/web-fonts";
import { UI_PREFS_INIT_SCRIPT } from "@/lib/ui-prefs/init-script";

// metadataBase: canonical, og:url 같은 상대 주소를 NEXT_PUBLIC_SITE_URL 기준 절대 주소로 만든다(도메인 하드코딩 금지, CLAUDE.md 12장).
// 하위 페이지 제목은 "로그인 | 런치메이트" 꼴(copy-guide 4.14). 랜딩은 title.absolute로 이름만 쓴다(T4.28).
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: siteCopy.name, template: siteCopy.titleTemplate },
  description: siteCopy.description,
  applicationName: siteCopy.name,
};

// 주소 표시줄 색을 화면 바탕(DESIGN.md background)과 잇는다. 값은 pnpm tokens 생성물(T4.28).
// 앱 안 화면 설정(SET-04)으로 OS와 다른 테마를 고른 경우까지는 따라가지 않는다(메타는 미디어 쿼리만 안다).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: themeColor.light },
    { media: "(prefers-color-scheme: dark)", color: themeColor.dark },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: 첫 페인트 스크립트가 <html>에 .light/.dark, data-motion을 먼저 단다(T4.25).
    // 이 요소의 속성만 비교에서 빠지고 자식은 그대로 검사한다.
    <html lang="ko" suppressHydrationWarning className="h-full antialiased">
      <head>
        {/* 화면 설정(SET-04)을 첫 페인트 전에 적용해 다크 깜빡임을 막는다. 사용자 입력 없는 고정 문자열 */}
        <script dangerouslySetInnerHTML={{ __html: UI_PREFS_INIT_SCRIPT }} />
        {/* 웹 글꼴 목록 링크: 재방문은 지금 붙이고, 첫 방문은 화면이 뜬 뒤 붙인다. 사용자 입력 없는 고정 문자열 */}
        <script dangerouslySetInnerHTML={{ __html: WEB_FONTS_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
