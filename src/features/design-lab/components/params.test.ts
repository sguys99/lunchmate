import { describe, expect, it } from "vitest";
import {
  DEFAULT_GALLERY_OPTIONS,
  effectiveMotion,
  parseGalleryOptions,
  serializeGalleryOptions,
} from "./params";

describe("gallery params", () => {
  it("빈 쿼리와 모르는 값은 기본값", () => {
    expect(parseGalleryOptions(new URLSearchParams())).toEqual(
      DEFAULT_GALLERY_OPTIONS,
    );
    expect(
      parseGalleryOptions(
        new URLSearchParams("theme=neon&motion=fast&static=yes"),
      ),
    ).toEqual(DEFAULT_GALLERY_OPTIONS);
    expect(parseGalleryOptions(undefined)).toEqual(DEFAULT_GALLERY_OPTIONS);
  });

  it("쿼리를 해석하고 다시 같은 쿼리로 만든다", () => {
    const qs = "theme=dark&motion=reduce&static=1";
    const options = parseGalleryOptions(new URLSearchParams(qs));
    expect(options).toEqual({ theme: "dark", motion: "reduce", still: true });
    expect(serializeGalleryOptions(options)).toBe(qs);
    expect(serializeGalleryOptions(DEFAULT_GALLERY_OPTIONS)).toBe("");
  });

  it("Next searchParams 객체도 받는다", () => {
    expect(
      parseGalleryOptions({ theme: ["LIGHT", "dark"], static: "true" }),
    ).toEqual({ theme: "light", motion: "system", still: true });
  });

  it("static이면 motion 값과 무관하게 정지", () => {
    expect(effectiveMotion({ ...DEFAULT_GALLERY_OPTIONS, still: true })).toBe(
      "static",
    );
    expect(
      effectiveMotion({ ...DEFAULT_GALLERY_OPTIONS, motion: "reduce" }),
    ).toBe("reduce");
    expect(effectiveMotion(DEFAULT_GALLERY_OPTIONS)).toBe("system");
  });
});
