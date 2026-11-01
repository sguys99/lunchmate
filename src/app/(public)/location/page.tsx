// /location 위치정보 처리 안내 (T8.14, PRD APP-05, T0.18). 현위치를 기기 안에서만 쓰는 구조라 위치정보 이용약관 대신
// 처리 안내로 둔다. KISA 회신(T10.1)이 신고 필요로 오면 위치정보 이용약관, 개인위치정보처리방침, 동의 화면을 더한다.
// /terms, /privacy와 같이 확정 전 초안이라 flags.auth가 꺼진 환경(프로덕션)에서는 404.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { legalCopy } from "@/copy/legal";
import { LegalDocumentView } from "@/features/auth/legal-document";
import { isEnabled } from "@/lib/flags";

export const metadata: Metadata = {
  title: legalCopy.location.metaTitle,
  robots: { index: false, follow: false },
};

export default function Page() {
  if (!isEnabled("auth")) notFound();
  return <LegalDocumentView doc={legalCopy.location} />;
}
