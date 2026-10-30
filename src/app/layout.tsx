import type { Metadata, Viewport } from "next";
import "./globals.css";
import { maruBuri, pretendard } from "./fonts";
import { siteCopy } from "@/copy/common";
import { themeColor } from "@/lib/design/theme-color.generated";
import { siteUrl } from "@/lib/env/site";
import { UI_PREFS_INIT_SCRIPT } from "@/lib/ui-prefs/init-script";
import { cn } from "@/lib/utils";

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
    <html
      lang="ko"
      suppressHydrationWarning
      className={cn(
        "h-full antialiased",
        pretendard.variable,
        maruBuri.variable,
      )}
    >
      <head>
        {/* 화면 설정(SET-04)을 첫 페인트 전에 적용해 다크 깜빡임을 막는다. 사용자 입력 없는 고정 문자열 */}
        <script dangerouslySetInnerHTML={{ __html: UI_PREFS_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
