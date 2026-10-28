import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";

// Pretendard Variable (OFL-1.1). KS X 1001 한글 2,350자 + 라틴 + 기호 서브셋, 저장소 포함.
// 서브셋에 없는 글자는 fallback 폰트로 표시된다.
const pretendard = localFont({
  src: "./fonts/PretendardVariable-KSX1001.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 930",
  fallback: ["Apple SD Gothic Neo", "Malgun Gothic", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "런치메이트",
  description: "오늘 뭐 먹지를 10초 안에 정해 드립니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={cn("h-full antialiased", pretendard.variable)}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
