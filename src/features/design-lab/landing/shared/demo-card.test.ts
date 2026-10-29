import { describe, expect, it } from "vitest";
import { MOCK_HOME_ALL_SETS } from "@/features/design-lab/mock";
import { reasonWithoutWalk } from "./demo-card";

describe("reasonWithoutWalk", () => {
  it("앞의 도보 분을 뗀다", () => {
    expect(reasonWithoutWalk("도보 약 4분, 지난주 👍한 국밥")).toBe(
      "지난주 👍한 국밥",
    );
    expect(reasonWithoutWalk("도보 약 12분, 회식 후기가 좋은 선술집")).toBe(
      "회식 후기가 좋은 선술집",
    );
  });

  it("도보 분이 없으면 그대로 둔다", () => {
    expect(reasonWithoutWalk("10분이면 끝나는 버거")).toBe(
      "10분이면 끝나는 버거",
    );
  });

  it("랜딩 B에 나오는 목업 이유에는 도보 분이 남지 않는다", () => {
    for (const set of MOCK_HOME_ALL_SETS) {
      for (const p of set) {
        expect(reasonWithoutWalk(p.reason)).not.toMatch(/도보 약/);
      }
    }
  });
});
