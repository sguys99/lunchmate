import { describe, expect, it } from "vitest";
import { MOCK_HOME_ALL_SETS } from "@/features/design-lab/mock";
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

  it("끝의 도보 분도 뺀다(T5.10 기여도 순서)", () => {
    expect(reasonWithoutWalk("새로 찾은 곳, 도보 약 5분")).toBe("새로 찾은 곳");
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

  it("홈과 랜딩 데모에 나오는 목업 세트에도 도보 분이 남지 않는다", () => {
    for (const set of MOCK_HOME_ALL_SETS) {
      for (const p of set) {
        expect(reasonWithoutWalk(p.reason)).not.toMatch(/도보 약/);
      }
    }
  });
});
