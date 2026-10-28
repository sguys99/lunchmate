import { describe, expect, it } from "vitest";
import { isTarget, isToneTarget } from "./targets";

describe("검사 대상", () => {
  it.each([
    ["src/app/page.tsx", true],
    ["src/copy/home.ts", true],
    ["src/copy/home.json", true],
    ["src/lib/time/kst.ts", true],
    ["src/lib/time/kst.test.ts", false],
    ["src/components/x.spec.tsx", false],
    ["src/types/env.d.ts", false],
    ["src/app/globals.css", false],
    ["src/app/manifest.json", true],
    ["src/app/manifest.webmanifest", true],
    ["src/app/opengraph-image.tsx", true],
    ["src/app/poll/[code]/opengraph-image.alt.txt", true],
    ["src/app/opengraph-image.png", false],
    ["src/app/favicon.ico", false],
    ["public/manifest.json", true],
    ["public/site.webmanifest", true],
    ["public/logo.svg", false],
    ["docs/prd.md", false],
    ["src/README.md", false],
    ["scripts/check-copy.ts", false],
    // T2.3 대상: OG 이미지 라우트, 메타 태그, 매니페스트
    ["src/app/api/og/route.tsx", true],
    ["src/app/api/poll/og/route.ts", true],
    ["src/app/(public)/poll/[code]/opengraph-image.tsx", true],
    ["src/app/twitter-image.tsx", true],
    ["src/app/layout.tsx", true],
    ["src/app/manifest.ts", true],
    ["src/copy/home.test.ts", false],
  ])("%s → %s", (p, expected) => {
    expect(isTarget(p)).toBe(expected);
  });
});

describe("문체 비율 대상", () => {
  it.each([
    ["src/copy/home.ts", true],
    ["src/copy/home.json", true],
    ["src/copy/design-lab.ts", false],
    ["src/copy/design-lab-quiet-stone.ts", false],
    ["src/copy/home.test.ts", false],
    ["src/copy/types.d.ts", false],
    ["src/app/page.tsx", false],
    ["src/features/rec/copy.ts", false],
  ])("%s → %s", (p, expected) => {
    expect(isToneTarget(p)).toBe(expected);
  });
});
