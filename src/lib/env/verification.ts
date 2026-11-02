// 검색 등록 소유 확인 값(T10.11, docs/launch-ops.md 4장). 서버 환경변수 GOOGLE_SITE_VERIFICATION, NAVER_SITE_VERIFICATION.
// 값 자체는 HTML 메타에 공개되지만 사이트 소유자만 정하는 값이라 NEXT_PUBLIC_으로 두지 않는다(브라우저 번들에 들어갈 이유가 없음).
// 루트 레이아웃 metadata가 빌드 때 읽으므로 Vercel에서 값을 바꾸면 다시 배포해야 반영된다. 비어 있으면 메타를 넣지 않는다.
import "server-only";
import type { Metadata } from "next";
import { siteVerification } from "@/features/landing/seo";

export function siteVerificationMeta(): Metadata["verification"] {
  return siteVerification({
    GOOGLE_SITE_VERIFICATION: process.env.GOOGLE_SITE_VERIFICATION,
    NAVER_SITE_VERIFICATION: process.env.NAVER_SITE_VERIFICATION,
  });
}
