// 웹 글꼴 "받음" 표시 (src/lib/fonts/web-fonts.ts). 첫 방문은 화면이 뜬 뒤에야 글꼴을 붙이므로
// 캡처, 시각 회귀, axe처럼 최종 서체로 봐야 하는 테스트는 재방문처럼 첫 페인트부터 웹 글꼴을 쓰게 한다.
import type { BrowserContext, Page } from "@playwright/test";
import {
  WEB_FONTS_STORAGE_KEY,
  WEB_FONTS_VERSION,
} from "../../src/lib/fonts/web-fonts";

export async function markWebFontsSeen(target: Page | BrowserContext) {
  await target.addInitScript(
    ([k, v]) => {
      try {
        window.localStorage.setItem(k, v);
      } catch {}
    },
    [WEB_FONTS_STORAGE_KEY, WEB_FONTS_VERSION] as const,
  );
}
