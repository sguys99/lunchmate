// /design-lab/auth/sheet (T4.13 실제 로그인 유도 시트 확인). 플래그 차단은 design-lab/layout.tsx.
import type { Metadata } from "next";
import { authLabCopy } from "@/copy/design-lab-auth";
import { SheetDemo } from "@/features/design-lab/auth/sheet-demo";

export const metadata: Metadata = { title: authLabCopy.index.names.sheet };

export default function Page() {
  return <SheetDemo />;
}
