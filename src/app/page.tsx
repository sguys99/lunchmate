// 랜딩 / (T4.28, PRD APP-04, G3 선택안 B, D-06). 비로그인 공개 페이지라 정적으로 그린다(요청 값을 읽지 않음).
// - 로그인 사용자는 proxy가 /today로 보낸다(features/auth/routes.ts decideProxy, 세션 쿠키가 있을 때만 판정).
// - 플래그는 서버에서 판정해 넘긴다. 프로덕션은 appShell, auth가 꺼져 있어 체험과 로그인 대신 "출시 준비" 안내가 보인다.
// - 메타: 제목과 설명, canonical, Open Graph, Twitter. og:image는 아직 두지 않는다.
//   OG 이미지는 시안 대상(tasks S11, T7.4 OG 시안, T8.1 아이콘)이라 시안 선택 뒤 app/opengraph-image로 붙인다.
//   TODO(T7.4): 랜딩 OG 이미지 시안 선택 후 og:image, twitter summary_large_image로 바꾼다.
import type { Metadata } from "next";
import { landingCopy } from "@/copy/landing";
import { siteCopy } from "@/copy/common";
import { Landing } from "@/features/landing/landing";
import { isEnabled } from "@/lib/flags";

export const metadata: Metadata = {
  title: { absolute: siteCopy.name },
  description: landingCopy.meta.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: siteCopy.name,
    title: landingCopy.meta.ogTitle,
    description: landingCopy.meta.description,
  },
  twitter: {
    card: "summary",
    title: landingCopy.meta.ogTitle,
    description: landingCopy.meta.description,
  },
};

export default function Page() {
  return (
    <Landing
      appEnabled={isEnabled("appShell")}
      authEnabled={isEnabled("auth")}
    />
  );
}
