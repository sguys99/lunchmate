// 웹 앱 매니페스트 /manifest.webmanifest (T8.2, PRD APP-01, design-decisions D-18).
// Next.js 16 파일 규칙(node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md).
// Request-time API를 쓰지 않아 빌드 때 한 번 만들어 캐시된다. Next가 모든 페이지 <head>에 <link rel="manifest">를 붙인다.
//
// - 이름: name, short_name 모두 "런치메이트"(안건 12).
// - start_url: 앱 화면이 켜져 있으면 /today(비로그인 둘러보기 가능, proxy가 막지 않음), 꺼져 있으면 /. 오프라인 화면과 같은 판정.
// - orientation은 두지 않는다(태블릿 가로와 데스크톱 2단을 막지 않게).
// - id: start_url이 바뀌어도 설치한 앱이 같은 앱으로 남도록 고정("/").
// - 색: background_color(안드로이드 스플래시 바탕)와 theme_color 모두 라이트 샌드(안건 7, 9). 매니페스트 값은 하나라 다크는 따로 없다.
//   16진 값은 `pnpm tokens` 생성 상수(pwa-colors.generated.ts)다.
// - 아이콘: any 192, 512 + maskable 192, 512(같은 그림, 안건 3) + monochrome(안건 10). 생성은 `pnpm pwa:assets`.
import type { MetadataRoute } from "next";
import { siteCopy } from "@/copy/common";
import { PWA_ICONS } from "@/features/pwa/assets";
import { pwaColors } from "@/lib/design/pwa-colors.generated";
import { isEnabled } from "@/lib/flags";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: siteCopy.name,
    short_name: siteCopy.name,
    description: siteCopy.description,
    lang: "ko",
    dir: "ltr",
    start_url: isEnabled("appShell") ? "/today" : "/",
    scope: "/",
    display: "standalone",
    background_color: pwaColors.light,
    theme_color: pwaColors.light,
    categories: ["food", "lifestyle"],
    icons: [
      {
        src: PWA_ICONS.any192,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: PWA_ICONS.any512,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: PWA_ICONS.maskable192,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: PWA_ICONS.maskable512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: PWA_ICONS.monochrome512,
        sizes: "512x512",
        type: "image/png",
        purpose: "monochrome",
      },
    ],
  };
}
