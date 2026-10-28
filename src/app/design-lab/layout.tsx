import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isEnabled } from "@/lib/flags";
import { designLabCopy } from "@/copy/design-lab";
// 시안 토큰(생성물)은 이 레이아웃에서만 불러온다. 루트 레이아웃에 넣지 않는다.
// 서체는 루트 layout의 next/font 변수(--font-pretendard, --font-maruburi)를 시안 문서의 font.*.cssVar가 가리킨다(T1.19).
import "@/styles/design-candidates.css";

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
