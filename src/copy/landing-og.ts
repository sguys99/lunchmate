// 랜딩 링크 미리보기 이미지 문구 (T10.11, PRD APP-04, D-29 B 큰 그릇). copy-guide 4.13 "랜딩 OG 이미지 제목".
// 서버(opengraph-image, 약관 메타)에서만 읽는다. 랜딩 화면 문구(landing.ts)와 나눠 클라이언트 번들에 실리지 않게 한다.
// 이미지 안 글은 KS X 1001 서버 OG 글꼴로 그릴 수 있어야 한다(features/landing/og-art.test.ts에서 검사).

export const landingOgCopy = {
  /**
   * 이미지 안 제목. og:title과 twitter:title은 사이트 이름(siteCopy.name)이라
   * 말풍선에서 이미지 제목과 카드 제목이 같은 문장으로 겹치지 않는다(D-29)
   */
  headline: "오늘 뭐 먹지, 10초 안에 정합니다",
  /** 이미지 alt. 이미지 안 글(브랜드 + 제목)과 같은 뜻, 그릇 그림은 장식이라 넣지 않는다 */
  imageAlt: "런치메이트, 오늘 뭐 먹지, 10초 안에 정합니다",
} as const;
