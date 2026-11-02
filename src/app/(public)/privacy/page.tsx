// /privacy 개인정보 처리방침 (T4.11, PRD AUTH-02, T10.3 최종본). 검색 색인 허용, 사이트맵에 포함(features/landing/seo.ts).
// 로그인 묶음과 함께 flags.auth가 꺼진 환경에서는 404.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { siteCopy } from "@/copy/common";
import { landingOgCopy } from "@/copy/landing-og";
import { legalCopy } from "@/copy/legal";
import { legalMetaCopy } from "@/copy/legal-meta";
import { LegalDocumentView } from "@/features/auth/legal-document";
import { OG_SIZE } from "@/features/landing/og-art";
import { legalPageMetadata } from "@/features/landing/seo";
import { isEnabled } from "@/lib/flags";

// 색인 대상(사이트맵, T10.3). canonical, 설명, Open Graph는 공통 함수로(T10.11)
export const metadata: Metadata = legalPageMetadata({
  path: "/privacy",
  title: legalCopy.privacy.metaTitle,
  description: legalMetaCopy.legal.privacy(legalCopy.effective),
  siteName: siteCopy.name,
  image: { ...OG_SIZE, alt: landingOgCopy.imageAlt },
});

export default function Page() {
  if (!isEnabled("auth")) notFound();
  return <LegalDocumentView doc={legalCopy.privacy} />;
}
