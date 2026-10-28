import type { Metadata } from "next";
import "./globals.css";
import { maruBuri, pretendard } from "./fonts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "런치메이트",
  description: "오늘 뭐 먹지를 10초 안에 정해 드립니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={cn(
        "h-full antialiased",
        pretendard.variable,
        maruBuri.variable,
      )}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
