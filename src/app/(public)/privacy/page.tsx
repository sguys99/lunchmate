// /privacy 개인정보 처리방침 (T4.11, PRD AUTH-02, T10.3 최종본). 검색 색인 허용, 사이트맵에 포함(features/landing/seo.ts).
// 로그인 묶음과 함께 flags.auth가 꺼진 환경에서는 404.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { legalCopy } from "@/copy/legal";
import { LegalDocumentView } from "@/features/auth/legal-document";
import { isEnabled } from "@/lib/flags";

export const metadata: Metadata = {
  title: legalCopy.privacy.metaTitle,
};

export default function Page() {
  if (!isEnabled("auth")) notFound();
  return <LegalDocumentView doc={legalCopy.privacy} />;
}
