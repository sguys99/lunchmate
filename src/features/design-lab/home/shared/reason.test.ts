import { describe, expect, it } from "vitest";
import { MOCK_PLACES } from "@/features/design-lab/mock/places";
import { reasonWithoutWalk } from "./reason";

describe("reasonWithoutWalk", () => {
  it("앞의 도보 분을 뺀다", () => {
    expect(reasonWithoutWalk("도보 약 4분, 지난주 👍한 국밥")).toBe(
      "지난주 👍한 국밥",
    );
    expect(reasonWithoutWalk("도보 약 12분 , 회식 후기가 좋은 선술집")).toBe(
      "회식 후기가 좋은 선술집",
    );
  });

  it("도보 분이 없거나 그것뿐이면 그대로 둔다", () => {
    expect(reasonWithoutWalk("아직 안 가본 쌀국수집")).toBe(
      "아직 안 가본 쌀국수집",
    );
    expect(reasonWithoutWalk("도보 약 4분")).toBe("도보 약 4분");
  });

  it("목업 12곳 모두 도보 분이 빠진다", () => {
    for (const p of MOCK_PLACES) {
      expect(reasonWithoutWalk(p.reason)).not.toMatch(/도보/);
    }
  });
});
