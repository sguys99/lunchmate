// /location 위치정보 처리 안내 (T8.14, PRD APP-05, T0.18). 현위치를 기기 안에서만 쓰는 구조라 위치정보 이용약관 대신
// 처리 안내로 둔다. KISA 회신(T10.1)이 신고 필요로 오면 위치정보 이용약관, 개인위치정보처리방침, 동의 화면을 더한다.
// T10.3 최종본. /terms, /privacy와 같이 검색 색인 허용, 사이트맵 포함, flags.auth가 꺼진 환경에서는 404.
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
  path: "/location",
  title: legalCopy.location.metaTitle,
  description: legalMetaCopy.legal.location(legalCopy.effective),
  siteName: siteCopy.name,
  image: { ...OG_SIZE, alt: landingOgCopy.imageAlt },
});

export default function Page() {
  if (!isEnabled("auth")) notFound();
  return <LegalDocumentView doc={legalCopy.location} />;
}
