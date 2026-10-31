import { describe, expect, it } from "vitest";
import { recCopy } from "@/copy/rec";
import { recommend } from "@/lib/reco/recommend";
import { seededRng } from "@/lib/reco/pick-one";
import { makeCandidate, makeInput, NOW } from "@/lib/reco/test-fixtures";
import { hasBatchim, whyLines, withObject } from "./why";

function onlyPick(over: Parameters<typeof makeCandidate>[1] = {}) {
  const r = recommend(
    makeInput({ candidates: [makeCandidate("a", over)] }),
    seededRng(1),
  );
  const p = r.picks[0];
  if (!p) throw new Error("no pick");
  return p;
}

describe("왜 추천했나요? (REC-07)", () => {
  it("콜드 스타트: 거리, 새로 찾은 곳, 중립 안내, 광고 미반영 순", () => {
    const lines = whyLines(onlyPick({ distanceM: 150 }), NOW);
    expect(lines[0]).toBe(recCopy.why.distance(3));
    expect(lines).toContain(recCopy.why.newPlace);
    expect(lines.at(-2)).toBe(recCopy.why.coldStart);
    expect(lines.at(-1)).toBe(recCopy.why.noAds);
  });

  it("후기 3건 이상이면 👍 비율 문장을 쓰고 중립 안내는 없다", () => {
    const lines = whyLines(
      onlyPick({ thumbs: { up: 9, down: 1 }, distanceM: 600 }),
      NOW,
    );
    expect(lines).toContain(recCopy.why.reputation(90));
    expect(lines).not.toContain(recCopy.why.coldStart);
  });

  it("할인 정보는 문장에 나오지 않는다(AC-DEAL-2)", () => {
    const lines = whyLines(onlyPick({ deal: { active: true } }), NOW);
    expect(lines.join(" ")).not.toMatch(/할인 정보|쿠폰/);
    expect(lines.at(-1)).toBe(recCopy.why.noAds);
  });

  it("문장에 중간점과 대시가 없다", () => {
    const lines = whyLines(onlyPick(), NOW);
    for (const l of lines) expect(l).not.toMatch(/[·—–―]/);
  });
});

describe("조사", () => {
  it.each([
    ["국밥", true, "국밥을"],
    ["고기", false, "고기를"],
    ["한식", true, "한식을"],
    ["카페", false, "카페를"],
    ["ABC", false, "ABC를"],
  ])("%s", (word, batchim, obj) => {
    expect(hasBatchim(word)).toBe(batchim);
    expect(withObject(word)).toBe(obj);
  });
});
