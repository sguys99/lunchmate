import { describe, expect, it } from "vitest";

import {
  EASING_STEPS,
  RADIUS_COMPONENTS,
  SHADOW_STEPS,
  TYPE_STEPS,
} from "@/lib/design/schema";
import {
  cn,
  TOKEN_EASINGS,
  TOKEN_RADIUS_COMPONENTS,
  TOKEN_TEXT_STEPS,
} from "@/lib/utils";

describe("cn", () => {
  it("충돌하는 Tailwind 클래스는 뒤의 값으로 병합한다", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("falsy 값은 무시한다", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});

describe("cn 토큰 이름 (T1.19)", () => {
  it("타입 스케일 크기와 글자색을 서로 지우지 않는다", () => {
    expect(cn("text-label text-primary-foreground")).toBe(
      "text-label text-primary-foreground",
    );
    expect(cn("text-body text-title")).toBe("text-title");
  });

  it("타입 스케일 묶음 type-*은 뒤의 값으로 병합한다(DrawerTitle 기본값 덮어쓰기)", () => {
    expect(cn("type-title break-keep", "type-heading")).toBe(
      "break-keep type-heading",
    );
    expect(cn("type-body-sm", "type-caption text-muted-foreground")).toBe(
      "type-caption text-muted-foreground",
    );
    expect(cn("type-label text-foreground")).toBe("type-label text-foreground");
  });

  it("컴포넌트 라운드와 그림자, 이징을 같은 그룹으로 병합한다", () => {
    expect(cn("rounded-md", "rounded-button")).toBe("rounded-button");
    expect(cn("shadow-md", "shadow-sheet")).toBe("shadow-sheet");
    expect(cn("ease-in", "ease-standard")).toBe("ease-standard");
  });

  it("목록이 DESIGN 스키마 상수와 같다", () => {
    expect([...TOKEN_TEXT_STEPS]).toEqual([...TYPE_STEPS]);
    expect([...TOKEN_RADIUS_COMPONENTS]).toEqual([...RADIUS_COMPONENTS]);
    expect([...TOKEN_EASINGS]).toEqual([...EASING_STEPS]);
    expect(SHADOW_STEPS.filter((s) => !["sm", "md", "lg"].includes(s))).toEqual(
      ["sheet"],
    );
  });
});
