// /design-lab/home/compare: 홈 시안 비교 스위처 (T3.1). 상위 design-lab/layout.tsx가 플래그로 막는다.
// 선택값(쿼리)은 클라이언트에서 읽는다(useSearchParams라 Suspense 필요).
import type { Metadata } from "next";
import { Suspense } from "react";
import { designLabHomeCopy } from "@/copy/design-lab-home";
import { HomeSwitcher } from "@/features/design-lab/home/switcher";

export const metadata: Metadata = {
  title: designLabHomeCopy.switcher.metaTitle,
};

export default function HomeComparePage() {
  return (
    <Suspense>
      <HomeSwitcher />
    </Suspense>
  );
}
