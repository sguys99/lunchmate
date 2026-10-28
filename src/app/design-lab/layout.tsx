import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isEnabled } from "@/lib/flags";
import { designLabCopy } from "@/copy/design-lab";

// 검색 엔진에 노출하지 않는다.
export const metadata: Metadata = {
  title: designLabCopy.metaTitle,
  robots: { index: false, follow: false },
};

// 1차 차단: 플래그가 꺼져 있으면 404. (2차 차단은 flags.ts 의 productionOff)
export default function DesignLabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isEnabled("designLab")) notFound();
  return <>{children}</>;
}
