// /privacy 자리 (T4.11, PRD AUTH-02). 최종 전문 전 초안이라 flags.auth가 꺼진 환경(프로덕션)에서는 404.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { legalCopy } from "@/copy/legal";
import { LegalDocumentView } from "@/features/auth/legal-document";
import { isEnabled } from "@/lib/flags";

export const metadata: Metadata = {
  title: legalCopy.privacy.metaTitle,
  robots: { index: false, follow: false },
};

export default function Page() {
  if (!isEnabled("auth")) notFound();
  return <LegalDocumentView doc={legalCopy.privacy} />;
}
