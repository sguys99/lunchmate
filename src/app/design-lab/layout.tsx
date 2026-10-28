import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isEnabled } from "@/lib/flags";
import { designLabCopy } from "@/copy/design-lab";
// 토큰은 루트 layout의 globals.css가 불러오는 tokens.css(확정 DESIGN.md 생성물)를 그대로 쓴다(T1.20).
// G1 확정 후 시안별 CSS(design-candidates.css)는 만들지 않는다.

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
  return <div className="flex flex-1 flex-col">{children}</div>;
}
