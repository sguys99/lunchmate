// /design-lab/system/tokens: G1 토큰 견본표 (T1.16 보조 자료). 상위 design-lab/layout.tsx가 플래그로 막는다.
// 테마는 시스템 설정(prefers-color-scheme)을 따른다. pnpm shots로 라이트/다크를 각각 캡처한다.
import type { Metadata } from "next";
import { designLabCopy } from "@/copy/design-lab";
import { TokenSheet } from "@/features/design-lab/system/token-sheet";

export const metadata: Metadata = { title: designLabCopy.tokens.metaTitle };

export default function DesignTokensPage() {
  return <TokenSheet />;
}
