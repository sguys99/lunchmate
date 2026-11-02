import { describe, expect, it } from "vitest";
import { landingOgCopy } from "@/copy/landing-og";
import { isOgDrawable } from "@/features/poll/share/ks-x-1001";
import { LANDING_OG_TEXTS, OG_SIZE, OG_TITLE_LINES } from "./og-art";

describe("랜딩 OG 이미지 (T10.11, D-29 B 큰 그릇)", () => {
  it("1200 x 600(카카오 2:1)", () => {
    expect(OG_SIZE).toEqual({ width: 1200, height: 600 });
  });

  it("제목은 세 줄로 나눈다", () => {
    expect(OG_TITLE_LINES).toEqual(["오늘 뭐 먹지,", "10초 안에", "정합니다"]);
  });

  it("세 줄을 이으면 원래 제목이고, alt는 브랜드와 제목을 담는다", () => {
    expect(OG_TITLE_LINES.join(" ")).toBe(landingOgCopy.headline);
    expect(landingOgCopy.imageAlt).toBe(
      `런치메이트, ${landingOgCopy.headline}`,
    );
  });

  it("이미지 안 모든 글자를 서버 OG 글꼴(KS X 1001)로 그릴 수 있다", () => {
    for (const t of LANDING_OG_TEXTS) expect(isOgDrawable(t)).toBe(true);
  });
});
