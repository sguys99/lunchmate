import { describe, expect, it } from "vitest";
import { isTarget } from "./targets";

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
  ])("%s → %s", (p, expected) => {
    expect(isTarget(p)).toBe(expected);
  });
});
