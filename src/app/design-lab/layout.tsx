import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isEnabled } from "@/lib/flags";
import { designLabCopy } from "@/copy/design-lab";
import { maruBuri } from "@/features/design-lab/fonts";
// 시안 토큰(생성물)과 디자인 랩 보조 CSS는 이 레이아웃에서만 불러온다. 루트 레이아웃에 넣지 않는다.
import "@/styles/design-candidates.css";
import "./design-lab.css";

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
  // 시안 B 제목 세리프(--font-maruburi). preload: false라 실제로 쓰는 글자가 있을 때만 받는다.
  return (
    <div className={`${maruBuri.variable} flex flex-1 flex-col`}>
      {children}
    </div>
  );
}
