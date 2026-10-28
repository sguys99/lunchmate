import type { Metadata } from "next";
import "./globals.css";
import { maruBuri, pretendard } from "./fonts";
import { siteCopy } from "@/copy/common";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: siteCopy.name,
  description: siteCopy.description,
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
