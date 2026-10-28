import { defineConfig, devices } from "@playwright/test";

// 기본은 3000 포트의 pnpm dev. 이미 떠 있는 dev 서버를 쓰려면 PLAYWRIGHT_BASE_URL로 넘긴다
// (예: PLAYWRIGHT_BASE_URL=http://localhost:3100 pnpm test:e2e:visual). Next dev는 한 폴더에서 하나만 뜬다.
// E2E는 dev 모드로 돌린다. 빌드 산출물(.next)을 쓰지 않으므로 번들 측정용 pnpm build와 부딪히지 않는다.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const port = new URL(baseURL).port || "3000";

const mobile = {
  ...devices["Desktop Chrome"],
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
};
const desktop = {
  ...devices["Desktop Chrome"],
  viewport: { width: 1280, height: 800 },
};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "on-first-retry" },
  // 시각 회귀 기준 이미지 경로 (T2.16). {platform}을 이름에 남긴다.
  // 글꼴 래스터화가 OS마다 달라 darwin 기준 이미지를 linux CI와 비교하면 항상 실패한다.
  // 지금 커밋된 기준은 darwin뿐이다. CI에 붙일 때는 같은 Playwright 버전의 linux 컨테이너에서
  // --update-snapshots로 linux 기준을 따로 만들어 함께 커밋한다(docs/e2e.md).
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{testFileName}/{projectName}/{arg}-{platform}{ext}",
  expect: {
    toHaveScreenshot: {
      // 안티앨리어싱 차이만 넘기고 레이아웃, 색 변화는 잡는 정도로 작게
      maxDiffPixelRatio: 0.002,
      threshold: 0.15,
      animations: "disabled",
      caret: "hide",
      scale: "css",
      // Next dev 인디케이터(N 버튼)와 개발 오버레이를 스냅샷에서만 숨긴다. 앱 설정은 그대로 둔다.
      stylePath: "e2e/visual/screenshot.css",
    },
  },
  projects: [
    // 기능 E2E와 axe 검사 (시각 회귀 제외)
    { name: "mobile", testIgnore: /visual\//, use: mobile },
    { name: "desktop", testIgnore: /visual\//, use: desktop },
    // 시각 회귀 (T2.16): pnpm test:e2e:visual로만 돈다. 테마는 스펙 안에서 colorScheme과 쿼리로 나눈다.
    { name: "visual-mobile", testMatch: /visual\/.*\.spec\.ts/, use: mobile },
    {
      name: "visual-desktop",
      testMatch: /visual\/.*\.spec\.ts/,
      use: desktop,
    },
  ],
  webServer: {
    command: `pnpm dev --port ${port}`,
    // 디자인 랩 플래그는 e2e 에서 명시적으로 제어한다(.env.local 값보다 우선). 기본 off.
    env: {
      NEXT_PUBLIC_DESIGN_LAB: process.env.NEXT_PUBLIC_DESIGN_LAB ?? "false",
    },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
