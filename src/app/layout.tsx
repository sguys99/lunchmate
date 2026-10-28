import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "런치메이트",
  description: "오늘 뭐 먹지를 10초 안에 정해 드립니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
