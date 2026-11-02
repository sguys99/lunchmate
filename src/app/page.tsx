// 랜딩 / (T4.28, PRD APP-04, G3 선택안 B, D-06). 비로그인 공개 페이지라 정적으로 그린다(요청 값을 읽지 않음).
// - 로그인 사용자는 proxy가 /today로 보낸다(features/auth/routes.ts decideProxy, 세션 쿠키가 있을 때만 판정).
// - 플래그는 서버에서 판정해 넘긴다. 프로덕션은 appShell이 켜지고(2026-10-31) auth가 꺼져 있어 체험(→ /today)만 보이고 로그인은 없다.
//   둘 다 꺼진 환경에서만 "출시 준비" 안내가 보인다.
// - 메타: 제목과 설명, canonical, Open Graph, Twitter(T10.11). og:title과 twitter:title은 사이트 이름만 쓴다(D-29):
//   이미지 안 제목("오늘 뭐 먹지, 10초 안에 정합니다")과 말풍선 카드 제목이 같은 문장으로 겹치지 않게.
//   og:image는 app/opengraph-image.tsx(D-29 B 큰 그릇)를
//   Next가 붙인다(파일 규칙이 이 객체보다 우선, 크기와 alt 포함). 그래서 여기에는 images를 쓰지 않는다.
// - 구조화 데이터: JSON-LD WebApplication 하나(features/landing/seo.ts landingJsonLd). 가격, 무료 표기, 평점은 넣지 않는다.
import type { Metadata } from "next";
import { landingCopy } from "@/copy/landing";
import { siteCopy } from "@/copy/common";
import { Landing } from "@/features/landing/landing";
import { landingJsonLd, serializeJsonLd } from "@/features/landing/seo";
import { siteUrl } from "@/lib/env/site";
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
    title: siteCopy.name,
    description: landingCopy.meta.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteCopy.name,
    description: landingCopy.meta.description,
  },
};

export default function Page() {
  const jsonLd = landingJsonLd({
    base: siteUrl(),
    name: siteCopy.name,
    description: landingCopy.meta.description,
  });
  return (
    <>
      <script
        type="application/ld+json"
        // 서버에서 만든 고정 값. `<`는 serializeJsonLd가 이스케이프한다(Next.js guides/json-ld)
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <Landing
        appEnabled={isEnabled("appShell")}
        authEnabled={isEnabled("auth")}
      />
    </>
  );
}
