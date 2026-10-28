import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("충돌하는 Tailwind 클래스는 뒤의 값으로 병합한다", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("falsy 값은 무시한다", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});
