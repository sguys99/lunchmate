// /design-lab/system: 시안 스위처 (T1.14). 상위 design-lab/layout.tsx가 플래그로 막는다.
// 토큰은 서버에서 읽어 내려주고, 선택값(쿼리)은 클라이언트에서 읽는다(useSearchParams라 Suspense 필요).
import type { Metadata } from "next";
import { Suspense } from "react";
import { designLabCopy } from "@/copy/design-lab";
import { DesignSwitcher } from "@/features/design-lab/system/switcher";
import { getAllDesignTokens } from "@/features/design-lab/system/tokens.server";

export const metadata: Metadata = { title: designLabCopy.switcher.metaTitle };

export default function DesignSystemSwitcherPage() {
  const tokens = getAllDesignTokens();
  return (
    <Suspense>
      <DesignSwitcher tokens={tokens} />
    </Suspense>
  );
}
